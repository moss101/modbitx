// The per-task VM: a disposable Alpine Linux machine under QEMU with HVF.
// Boot files come from the Alpine CDN on first prepare; each boot serves a
// generated apkovl (root SSH key + openssh) over loopback HTTP and accepts
// execs on a forwarded SSH port. Stopping the VM discards everything — no
// disk image is kept, so every task starts from the same clean state.
const { spawn, execFile } = require("child_process");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const CDN = "https://dl-cdn.alpinelinux.org/alpine/v3.20/releases/aarch64/netboot-3.20.10";
const BOOT_FILES = ["vmlinuz-virt", "initramfs-virt", "modloop-virt"];
const SSH_PORT_HOST = 2222;

const state = { proc: null, port: 0, seedServer: null, keyPath: "", pubKey: "" };

function vmDir(userData) {
  return path.join(userData, "vm");
}

function sh(args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(args[0], args.slice(1), { timeout: opts.timeout || 30000, ...opts }, (err, stdout, stderr) => {
      if (err) reject(new Error(String(stderr || err.message).slice(0, 300)));
      else resolve(String(stdout));
    });
  });
}

async function status(userData) {
  const dir = vmDir(userData);
  const files = BOOT_FILES.map((name) => ({ name, present: fs.existsSync(path.join(dir, name)) }));
  const key = fs.existsSync(path.join(dir, "id_ed25519"));
  return {
    supported: fs.existsSync("/opt/homebrew/bin/qemu-system-aarch64") || fs.existsSync("/usr/bin/qemu-system-aarch64"),
    running: Boolean(state.proc),
    port: state.port,
    prepared: files.every((file) => file.present) && key,
    files
  };
}

async function prepare(userData) {
  const dir = vmDir(userData);
  fs.mkdirSync(dir, { recursive: true });
  for (const name of BOOT_FILES) {
    const target = path.join(dir, name);
    if (fs.existsSync(target) && fs.statSync(target).size > 1000) continue;
    const result = await new Promise((resolve) => {
      execFile("curl", ["-sf", "--retry", "2", "-o", target, `${CDN}/${name}`], { timeout: 600000 }, (err) => {
        resolve({ err: err ? String(err.message || err).slice(0, 200) : "" });
      });
    });
    if (result.err || !fs.existsSync(target) || fs.statSync(target).size < 1000) {
      throw new Error(`The ${name} download failed: ${result.err || "empty file"}. Check the network and try Prepare again.`);
    }
  }
  const keyPath = path.join(dir, "id_ed25519");
  if (!fs.existsSync(keyPath)) {
    await sh(["ssh-keygen", "-t", "ed25519", "-f", keyPath, "-N", "", "-q"]);
  }
  const pubKey = fs.readFileSync(`${keyPath}.pub`, "utf8").trim();
  return { prepared: true, pubKey };
}

function buildApkovl(dir, pubKey) {
  const root = path.join(dir, "apkovl");
  fs.rmSync(root, { recursive: true, force: true });
  for (const sub of ["etc/apk", "etc/network", "etc/ssh", "etc/runlevels/default", "etc/local.d", "root/.ssh"]) {
    fs.mkdirSync(path.join(root, sub), { recursive: true });
  }
  fs.writeFileSync(path.join(root, "etc/apk/repositories"), "https://dl-cdn.alpinelinux.org/alpine/v3.20/main\n");
  fs.writeFileSync(path.join(root, "etc/apk/world"), "alpine-base\nopenssh\n");
  fs.writeFileSync(path.join(root, "etc/network/interfaces"), "auto lo\niface lo inet loopback\n\nauto eth0\niface eth0 inet dhcp\n");
  fs.writeFileSync(path.join(root, "etc/ssh/sshd_config"), "PermitRootLogin prohibit-password\nPubkeyAuthentication yes\nPasswordAuthentication no\n");
  fs.writeFileSync(path.join(root, "root/.ssh/authorized_keys"), `${pubKey}\n`);
  fs.writeFileSync(path.join(root, "etc/local.d/guard.start"), "#!/bin/sh\nchown -R root:root /root/.ssh 2>/dev/null\nfind /root/.ssh -name '._*' -delete 2>/dev/null\n");
  fs.chmodSync(path.join(root, "etc/local.d/guard.start"), 0o755);
  fs.symlinkSync("/etc/init.d/sshd", path.join(root, "etc/runlevels/default/sshd"));
  fs.symlinkSync("/etc/init.d/local", path.join(root, "etc/runlevels/default/local"));
  // macOS tar writes AppleDouble files and preserves the caller's uid; both
  // break sshd's authorized_keys checks inside the VM.
  const tarFile = path.join(dir, "localhost.apkovl.tar.gz");
  execFileSyncCompat("tar", ["czf", tarFile, "--uid", "0", "--gid", "0", "-C", root, "etc", "root"], { env: { ...process.env, COPYFILE_DISABLE: "1" } });
  return tarFile;
}

function execFileSyncCompat(cmd, args, opts) {
  const { execFileSync } = require("child_process");
  execFileSync(cmd, args, { timeout: 30000, ...opts });
}

function startSeedServer(dir) {
  if (state.seedServer) return state.seedServer.port;
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const name = String(req.url || "/").replace("/", "");
      const file = path.join(dir, name);
      if (!fs.existsSync(file) || !/(\.tar\.gz|-virt)$/.test(name)) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { "Content-Type": "application/octet-stream" });
      fs.createReadStream(file).pipe(res);
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      state.seedServer = server;
      resolve(server.address().port);
    });
  });
}

function portOpen(port) {
  const net = require("net");
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1", timeout: 3000 });
    socket.on("connect", () => { socket.destroy(); resolve(true); });
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => { socket.destroy(); resolve(false); });
  });
}

async function boot(userData) {
  if (state.proc) return { ok: true, port: state.port, note: "The VM is already running." };
  const prepared = await status(userData);
  if (!prepared.supported) throw new Error("QEMU is not installed. Install it with brew install qemu, then try again.");
  if (!prepared.prepared) throw new Error("The VM boot files are missing. Run Prepare first.");
  const dir = vmDir(userData);
  const pubKey = fs.readFileSync(path.join(dir, 'id_ed25519.pub'), 'utf8').trim();
  buildApkovl(dir, pubKey);
  const seedPort = await startSeedServer(dir);
  const host = `http://10.0.2.2:${seedPort}`;
  let port = SSH_PORT_HOST;
  for (let attempt = 0; attempt < 20 && await portOpen(port); attempt += 1) port += 1;
  const qemu = "/opt/homebrew/bin/qemu-system-aarch64";
  state.port = port;
  state.proc = spawn(qemu, [
    "-machine", "virt",
    "-accel", "hvf",
    "-m", "1024",
    "-smp", "2",
    "-kernel", path.join(dir, "vmlinuz-virt"),
    "-initrd", path.join(dir, "initramfs-virt"),
    "-append", `console=ttyAMA0 ip=dhcp modloop=${host}/modloop-virt apkovl=${host}/localhost.apkovl.tar.gz alpine_repo=https://dl-cdn.alpinelinux.org/alpine/v3.20/main`,
    "-netdev", `user,id=n0,hostfwd=tcp:127.0.0.1:${port}-:22`,
    "-device", "virtio-net-device,netdev=n0",
    "-device", "virtio-rng-pci",
    "-display", "none",
    "-serial", "file:" + path.join(dir, "console.log")
  ], { stdio: "ignore", detached: false });
  state.proc.on("exit", () => {
    state.proc = null;
    if (state.seedServer) { state.seedServer.close(); state.seedServer = null; }
  });
  // Wait for the guest's sshd: the boot installs openssh from the repo first.
  const deadline = Date.now() + 120000;
  let probe = null;
  const keyPath = path.join(dir, "id_ed25519");
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    if (!state.proc) return { ok: false, error: "The VM exited during boot. Its console log is in the vm folder." };
    try {
      probe = await sh(["ssh", "-p", String(port), "-i", keyPath, "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null", "-o", "ConnectTimeout=5", "-o", "BatchMode=yes", "root@127.0.0.1", "echo ready"], { timeout: 15000 });
      if (probe.includes("ready")) return { ok: true, port };
    } catch { /* not up yet */ }
  }
  throw new Error("The VM booted but SSH never came up within two minutes.");
}

async function exec(userData, command) {
  if (!state.proc) throw new Error("The VM is not running. Boot it first.");
  const clean = String(command || "").replace(/[\r\n]/g, " ").slice(0, 2000);
  if (!clean) throw new Error("Give a command to run.");
  return sh([
    "ssh", "-p", String(state.port),
    "-i", path.join(vmDir(userData), "id_ed25519"),
    "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null", "-o", "ConnectTimeout=8",
    "root@127.0.0.1", clean
  ], { timeout: 60000 });
}

function stop() {
  if (state.proc) {
    state.proc.kill();
    state.proc = null;
    if (state.seedServer) { state.seedServer.close(); state.seedServer = null; }
    return { ok: true, note: "The VM stopped. Nothing was kept — the next boot starts clean." };
  }
  return { ok: true, note: "No VM was running." };
}

module.exports = { vmDir, status, prepare, boot, exec, stop };
