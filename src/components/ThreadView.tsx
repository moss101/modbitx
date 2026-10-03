import { useEffect, useMemo, useRef, useState } from "react";
import { applySkillFocus, approvedPlanForTurn, assistantReply, autoTitle, canonicalSlash, contextEstimate, decideReview, enterPlanThisTurn, exportTranscript, parseCopyRequest, parseRename, permissionAfterApproval, resumeList, resumeMatch, rewindPoints, rewindTo, safeExportName, sessionFileWriteAllowed, stripWorktreeFlag, type SessionRow, type SlashCommand } from "../agent";
import mermaidUrl from "mermaid/dist/mermaid.min.js?url";
import { isDeckLanguage, mermaidPreviewDocument, slidesPreviewDocument } from "../decks";
import { askInsideArtifact, completeTurn, summarizeHistory } from "../api";
import { artifactParts, artifactsFromMessages, compareVersions, diffSummary, restoreArtifact } from "../artifacts";
import { branchName } from "../branch";
import { activeDesign, applyDesignPick, DEFAULT_DESIGN, designsForRole, interpretDesign, previewDocument, type DesignSystem } from "../design";
import { runProjectHooks } from "../hooks";
import { applyMemoryVerb, memoryPromptLines } from "../memory";
import { projectPrompt } from "../local-jobs";
import { startBgTask } from "../bgtasks";
import { runResearch, researchMessage, type ResearchStep } from "../research";
import { addRule, ruleFromAction } from "../approvals";
import { markHighRisk } from "../harness";
import { listMentionPaths, loadFolderPack } from "../rules";
import { applySessionStatus } from "../session-status";
import { localSteps, parseTools, runTool, type ApprovalRequest, type DesktopEnv } from "../tools";
import type { Question } from "../questions";
import { BrowserPane } from "./BrowserPane";
import { BgTasksPanel } from "./BgTasksPanel";
import { CodeDock } from "./CodeDock";
import { SimulatorPane } from "./SimulatorPane";
import { applyRoute } from "../route";
import { playApprovalChime, playNotificationDing } from "../sound";
import { useStore } from "../store";
import { EFFORTS } from "../catalog";
import { hasProviderKey, providerModels } from "../providers";
import type { Attachment, Message, Mode, PermissionMode, Step } from "../types";
import { Composer } from "./Composer";
import { Markdown } from "./Markdown";


export function ThreadView() {
  const { state, dispatch, activeThread, newId } = useStore();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [browserUrl, setBrowserUrl] = useState<string | null>(null);
  const [browserNote, setBrowserNote] = useState("");
  const [browserLog, setBrowserLog] = useState<string[]>([]);
  const [simView, setSimView] = useState<{ name: string; image?: string; note: string; udid?: string } | null>(null);
  const [preview, setPreview] = useState("");
  const [shot, setShot] = useState("");
  const [treeDir, setTreeDir] = useState("");
  const [diffTick, setDiffTick] = useState(0);
  const [stepShots, setStepShots] = useState<Record<string, string[]>>({});
  const [routeLine, setRouteLine] = useState("");
  const [files, setFiles] = useState<{ name: string; kind: string }[]>([]);
  const [approval, setApproval] = useState<ApprovalRequest | null>(null);
  const [question, setQuestion] = useState<{ prompt: string; options: string[]; question?: Question; resolve: (value: string) => void } | null>(null);
  const [otherAnswer, setOtherAnswer] = useState("");
  const [multiPicks, setMultiPicks] = useState<string[]>([]);
  const [scaleValue, setScaleValue] = useState(0);
  const [stopAsked, setStopAsked] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findCount, setFindCount] = useState<{ active: number; matches: number } | null>(null);
  const [research, setResearch] = useState<ResearchStep[] | null>(null);
  const stopRef = useRef(false);
  const [commands, setCommands] = useState<SlashCommand[]>([]);
  const [picker, setPicker] = useState<{ kind: "resume" | "rewind"; query: string } | null>(null);
  const [mentions, setMentions] = useState<string[]>([]);
  const packRef = useRef({ rules: "", names: [] as string[] });
  const classifiedRef = useRef(new Set<string>());
  const highRiskRef = useRef(state.settings.highRiskHosts || []);
  useEffect(() => {
    highRiskRef.current = state.settings.highRiskHosts || [];
  }, [state.settings.highRiskHosts]);
  useEffect(() => {
    const thread = activeThread;
    if (!thread || thread.mode !== "code" || thread.messages.length === 0 || thread.sessionStatus) return;
    if (classifiedRef.current.has(thread.id)) return;
    classifiedRef.current.add(thread.id);
    void window.modbitx?.jevSession?.({
      title: thread.title,
      permission: thread.permissionMode || state.settings.permissionMode,
      planStatus: thread.planStatus || "",
      plan: thread.plan || "",
      messages: thread.messages.map((message) => ({ role: message.role, text: message.content, steps: message.steps }))
    }).then((judged) => {
      if (!judged?.ok) return;
      dispatch({
        type: "patch-thread",
        id: thread.id,
        patch: {
          sessionStatus: applySessionStatus(true, judged.status),
          sessionConfidence: judged.status?.confidence
        }
      });
    });
  }, [activeThread, dispatch, state.settings.permissionMode]);
  const allowRef = useState<{ hosts: Set<string>; computer: { allowed: boolean }; sim: { allowed: boolean }; subagents: { allowed: boolean }; wait: ((value: "once" | "task" | "always" | "no") => void) | null }>({
    hosts: new Set(),
    computer: { allowed: false },
    sim: { allowed: false },
    subagents: { allowed: false },
    wait: null
  })[0];
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  useEffect(() => {
    const onPrefill = (event: Event) => {
      const text = (event as CustomEvent<string>).detail;
      if (typeof text === "string") setDraft(text);
    };
    window.addEventListener("modbitx-prefill", onPrefill);
    return () => window.removeEventListener("modbitx-prefill", onPrefill);
  }, []);

  // Esc stops a running turn after the current step; ⌘F (or the Find menu item) opens the find bar.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && busy) {
        stopRef.current = true;
        setStopAsked(true);
      }
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setFindOpen(true);
      }
    };
    const onFind = () => setFindOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("modbitx-find", onFind);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("modbitx-find", onFind);
    };
  }, [busy]);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    if (!activeThread?.folder || activeThread.mode !== "code" || !window.modbitx) { setFiles([]); return; }
    const dir = treeDir ? `${activeThread.folder}/${treeDir}` : activeThread.folder;
    void window.modbitx.listDir(dir).then(setFiles);
  }, [activeThread?.folder, activeThread?.mode, activeThread?.updatedAt, treeDir]);

  useEffect(() => {
    void window.modbitx?.setDownloadDir(activeThread?.folder || "");
  }, [activeThread?.folder]);

  useEffect(() => {
    if (!activeThread?.folder) {
      packRef.current = { rules: "", names: [] };
      setCommands([]);
      setMentions([]);
      return;
    }
    const folder = activeThread.folder;
    void loadFolderPack(folder).then((pack) => {
      packRef.current = { rules: pack.rules, names: pack.names };
      setCommands(pack.commands);
    });
    void listMentionPaths(folder).then(setMentions);
  }, [activeThread?.folder]);
  useEffect(() => { setPicker(null); }, [activeThread?.id]);

  function ask(request: ApprovalRequest) {
    if (request.kind === "browser" && !request.highRisk && (allowRef.hosts.has(request.detail) || state.settings.allowedHosts.includes(request.detail))) {
      allowRef.hosts.add(request.detail);
      return Promise.resolve("task" as const);
    }
    if (!request.fresh && request.kind === "computer" && allowRef.computer.allowed) return Promise.resolve("task" as const);
    if (request.kind === "simulator" && allowRef.sim.allowed) return Promise.resolve("task" as const);
    return new Promise<"once" | "task" | "always" | "no">((resolve) => {
      allowRef.wait = resolve;
      setApproval(request);
      if (state.settings.approvalChime) playApprovalChime();
      if (state.settings.dockAttention) void window.modbitx?.bounceDock();
    });
  }

  function answer(value: "once" | "task" | "always" | "no") {
    const rememberHost = approval?.kind === "browser" && !approval.highRisk;
    if ((value === "task" || value === "always") && rememberHost && approval) allowRef.hosts.add(approval.detail);
    if (value === "always" && rememberHost && approval && !state.settings.allowedHosts.includes(approval.detail)) {
      dispatch({ type: "settings", patch: { allowedHosts: [...state.settings.allowedHosts, approval.detail] } });
    }
    if (value !== "no" && approval?.kind === "computer" && !approval.fresh) allowRef.computer.allowed = true;
    if (value !== "no" && approval?.kind === "simulator") allowRef.sim.allowed = true;
    allowRef.wait?.(value);
    allowRef.wait = null;
    setApproval(null);
  }

  function runFind(query: string, forward: boolean) {
    const text = query.trim();
    if (!text || !window.modbitx?.findInPage) { setFindCount(null); return; }
    // findNext stays true so a changed term restarts the session and a DevTools
    // attach never swallows the first result.
    void window.modbitx.findInPage(text, { forward, findNext: true });
  }

  function closeFind() {
    setFindOpen(false);
    setFindCount(null);
    void window.modbitx?.stopFindInPage("clear");
  }

  useEffect(() => {
    if (!findOpen) return;
    const off = window.modbitx?.onFindResult?.((result) => setFindCount({ active: result.active, matches: result.matches }));
    return () => off?.();
  }, [findOpen]);

  const artifacts = useMemo(() => activeThread ? artifactsFromMessages(activeThread.messages) : [], [activeThread]);
  const openArtifact = artifacts.find((item) => item.id === state.activeArtifactId) ?? artifacts[artifacts.length - 1];

  if (!activeThread) {
    return <main className="main empty"><p>Start a chat from the sidebar.</p></main>;
  }

  async function run(messages: Message[], replaceFrom?: string, override?: { permissionMode?: PermissionMode; usePlan?: boolean }) {
    setBusy(true);
    setError("");
    stopRef.current = false;
    setStopAsked(false);
    const threadId = activeThread!.id;
    dispatch({ type: "running", id: threadId, on: true });
    try {
      await runInner();
    } finally {
      dispatch({ type: "running", id: threadId, on: false });
      setBusy(false);
    }

  async function runInner() {
    // Auto-compaction, mirroring the parent: past a rough context size the
    // older messages fold into a summary so the turn fits without asking.
    if (state.settings.autoCompact !== false && messages.length >= 8) {
      const chars = messages.reduce((sum, message) => sum + message.content.length, 0);
      if (chars > 96_000) {
        try {
          const summary = await summarizeHistory({ ...state.settings, model: activeThread!.model, effort: activeThread!.effort }, messages.slice(0, -4));
          messages = [
            { id: newId(), role: "user", content: `Earlier conversation, compacted:\n${summary}`, createdAt: Date.now() },
            ...messages.slice(-4)
          ];
          dispatch({ type: "patch-thread", id: activeThread!.id, patch: { messages } });
          setRouteLine("Compacted the older conversation automatically to fit the turn.");
        } catch { /* a failed compaction must not stop the turn */ }
      }
    }
    const assistantId = newId();
    if (replaceFrom) {
      const index = messages.findIndex((message) => message.id === replaceFrom);
      messages = messages.slice(0, index);
      dispatch({ type: "patch-thread", id: activeThread!.id, patch: { messages } });
    }
    dispatch({
      type: "add-message",
      threadId: activeThread!.id,
      message: { id: assistantId, role: "assistant", content: "", createdAt: Date.now() }
    });
    let folderListing = "";
    if (activeThread!.folder && window.modbitx) {
      const entries = await window.modbitx.listDir(activeThread!.folder);
      folderListing = entries.map((entry) => `${entry.kind === "dir" ? "dir" : "file"} ${entry.name}`).join("\n");
    }
    const steps: Step[] = [];
    const keepShot = (index: number, image?: string) => {
      if (!image) return;
      setStepShots((current) => {
        const list = [...(current[assistantId] || [])];
        list[index] = image;
        return { ...current, [assistantId]: list };
      });
    };
    let spoken = "";
    const publish = (content: string) => {
      spoken = content;
      dispatch({ type: "update-message", threadId: activeThread!.id, messageId: assistantId, content, steps: [...steps] });
    };
    let mode: Mode = activeThread!.mode;
    let routeNote = "";
    if (state.settings.jevRouting !== false && window.modbitx?.jevRoute) {
      const lastUser = [...messages].reverse().find((message) => message.role === "user");
      const routed = await window.modbitx.jevRoute(lastUser?.content ?? "", mode);
      if (routed?.ok) {
        const decision = applyRoute(mode, routed);
        mode = decision.mode;
        routeNote = [
          decision.note,
          decision.computerHint ? "Computer use is likely. The task still asks before the first screenshot or click." : "",
          decision.simulatorHint ? "A simulator is likely. The task asks before the first boot, tap, or screenshot." : "",
          decision.folderHint && !activeThread!.folder ? "A folder is likely. Choose one if the task needs files." : ""
        ].filter(Boolean).join(" ");
        setRouteLine(routeNote);
        if (mode !== activeThread!.mode) {
          dispatch({ type: "patch-thread", id: activeThread!.id, patch: { mode } });
          dispatch({ type: "mode", mode });
        }
      } else if (routed?.reason) {
        setRouteLine(routed.reason);
      }
    }
    let designId = activeThread!.designSystemId;
    const library = designsForRole(state.settings.designSystems || [], state.settings.orgRole);
    if (!activeThread!.designLocked && library.length > 1 && window.modbitx?.jevDesignSystem) {
      const lastUser = [...messages].reverse().find((message) => message.role === "user");
      const picked = await window.modbitx.jevDesignSystem({
        message: lastUser?.content ?? "",
        systems: library.map((system) => ({
          id: system.id,
          name: system.name,
          ink: system.ink,
          paper: system.paper,
          accent: system.accent,
          font: system.font,
          components: system.components
        }))
      });
      const decision = applyDesignPick({
        systems: library,
        locked: false,
        currentId: designId,
        judgment: picked || { ok: false, reason: "Design choice is unavailable." }
      });
      if (decision.note) {
        routeNote = [routeNote, decision.note].filter(Boolean).join(" ");
        setRouteLine(routeNote);
      }
      if (decision.apply && decision.id) {
        designId = decision.id;
        dispatch({ type: "patch-thread", id: activeThread!.id, patch: { designSystemId: decision.id, designLocked: false } });
      }
    }
    const design = activeDesign(state.settings, { designSystemId: designId }, state.settings.orgRole);
    let permissionMode = override?.permissionMode || activeThread!.permissionMode || state.settings.permissionMode;
    let focusSkill = undefined as ReturnType<typeof applySkillFocus>["skill"];
    const enabledSkills = state.skills.filter((skill) => skill.enabled);
    if (window.modbitx?.jevPrepare && (mode === "code" || enabledSkills.length >= 2)) {
      const lastUser = [...messages].reverse().find((message) => message.role === "user");
      const prepared = await window.modbitx.jevPrepare({
        message: lastUser?.content ?? "",
        mode,
        skills: enabledSkills.map((skill) => ({ id: skill.id, name: skill.name, blurb: skill.blurb }))
      });
      if (!prepared?.ok && prepared?.reason && !/not set|unavailable/i.test(prepared.reason)) {
        routeNote = [routeNote, prepared.reason].filter(Boolean).join(" ");
      }
      const planGate = enterPlanThisTurn(permissionMode, mode, prepared || { ok: false }, override?.usePlan);
      if (planGate.enter) {
        dispatch({ type: "patch-thread", id: activeThread!.id, patch: { permissionMode: "plan", planReturn: permissionMode } });
        permissionMode = "plan";
        routeNote = [routeNote, planGate.note].filter(Boolean).join(" ");
      }
      const focused = applySkillFocus(state.skills, prepared || { ok: false });
      focusSkill = focused.skill;
      if (focused.note) routeNote = [routeNote, focused.note].filter(Boolean).join(" ");
      if (routeNote) setRouteLine(routeNote);
    }
    if (activeThread!.folder) {
      const pack = await loadFolderPack(activeThread!.folder);
      packRef.current = { rules: pack.rules, names: pack.names };
      setCommands(pack.commands);
    }
    try {
      const desktop = mode !== "chat";
      // Memory verbs apply against a local copy so two verbs in one turn compose.
      let memoryNow = state.memories;
      let scratchpadNow = activeThread!.scratchpad || "";
      if (desktop && activeThread!.folder && window.modbitx?.hookExec) {
        const started = await runProjectHooks(activeThread!.folder, "SessionStart", { source: "prompt" });
        if (started.decision === "deny") throw new Error(started.reason || "A project hook stopped this turn.");
        if (started.context) packRef.current = { ...packRef.current, rules: `${packRef.current.rules}\n\n${started.context}`.trim() };
      }
      const threadId = activeThread!.id;
      const env: DesktopEnv = {
        folder: activeThread!.folder,
        computerEnabled: state.settings.computerUse,
        computerMode: state.settings.computerMode,
        permissionMode,
        sshTarget: activeThread!.sshTarget || state.settings.sshTarget,
        computerSession: allowRef.computer,
        simSession: allowRef.sim,
        allowedHosts: allowRef.hosts,
        blockedHosts: new Set(state.settings.blockedHosts || []),
        highRiskHosts: new Set(state.settings.highRiskHosts || []),
        persistedHosts: new Set(state.settings.allowedHosts || []),
        site: { host: "" },
        harnessOn: state.settings.browserHarness !== false,
        design,
        browserTools: state.settings.browserTools !== false,
        simIos: state.settings.simIos !== false,
        messagesOn: state.connectors.some((connector) => connector.id === "messages" && connector.enabled),
        computerGuard: state.settings.computerGuard !== false,
        taskVm: state.settings.taskVm !== false,
        commandRules: state.settings.commandRules || [],
        dynamicWorkflows: state.settings.dynamicWorkflows !== false,
        subagentsAllowed: allowRef.subagents,
        onSubagents: (goals) => goals.map((goal) => {
          const id = `bg-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
          const task = { id, prompt: goal, status: "running" as const, answer: "", createdAt: Date.now(), origin: "subagent" as const };
          dispatch({ type: "bg-start", task });
          void startBgTask(task, {
            settings: state.settings,
            skills: state.skills.filter((skill) => skill.enabled),
            connectors: state.connectors,
            memories: memoryPromptLines(state.memories)
          }, dispatch);
          return id;
        }),
        readSubagents: () => (state.bgTasks || []).filter((task) => task.origin === "subagent").map((task) => ({ id: task.id, prompt: task.prompt, status: task.status, answer: task.answer })),
        guardCheck: () => window.modbitx?.guardCheck?.() ?? Promise.resolve({ secureInput: false, sinceKey: 999, sinceMouse: 999 }),
        slackOn: state.connectors.some((connector) => connector.id === "slack" && connector.enabled),
        slackToken: state.settings.slackToken || "",
        linearOn: state.connectors.some((connector) => connector.id === "linear" && connector.enabled),
        linearKey: state.settings.linearKey || "",
        jiraOn: state.connectors.some((connector) => connector.id === "jira" && connector.enabled),
        jiraDomain: state.settings.jiraDomain || "",
        jiraEmail: state.settings.jiraEmail || "",
        jiraToken: state.settings.jiraToken || "",
        notionOn: state.connectors.some((connector) => connector.id === "notion" && connector.enabled),
        notionToken: state.settings.notionToken || "",
        figmaOn: state.connectors.some((connector) => connector.id === "figma" && connector.enabled),
        figmaToken: state.settings.figmaToken || "",
        sentryOn: state.connectors.some((connector) => connector.id === "sentry" && connector.enabled),
        sentryToken: state.settings.sentryToken || "",
        sentryOrg: state.settings.sentryOrg || "",
        stripeOn: state.connectors.some((connector) => connector.id === "stripe" && connector.enabled),
        stripeKey: state.settings.stripeKey || "",
        simAndroid: state.settings.simAndroid !== false,
        allowBypass: state.settings.allowBypass !== false,
        fileTools: state.settings.fileTools !== false,
        deniedApps: state.settings.deniedApps || [],
        branchPrefix: state.settings.branchPrefix || "",
        worktreeLocation: state.settings.worktreeLocation || "",
        approve: ask,
        onBrowse: (url) => setBrowserUrl(url),
        onScreenshot: (dataUrl) => setShot(dataUrl),
        onNote: (note) => {
          setBrowserNote(note);
          setBrowserLog((log) => [...log, note].slice(-8));
        },
        judgeSite: async (host, url) => (await window.modbitx?.jevSite(host, url))?.risk ?? 0,
        judgeAction: async (detail) => {
          const judged = await window.modbitx?.jevReview({ action: detail, folder: activeThread!.folder || "" });
          return decideReview(judged);
        },
        askUser: (prompt, options, question) => new Promise((resolve) => {
          setOtherAnswer("");
          setMultiPicks([]);
          setScaleValue(0);
          setQuestion({ prompt, options, question, resolve });
        }),
        onMemory: async (verb, name, content) => {
          if (state.settings.memoryOn === false) return "Memory is off. Turn it on in Settings → Privacy to keep notes.";
          const applied = applyMemoryVerb(memoryNow, verb, name, content, newId, Date.now());
          memoryNow = applied.notes;
          dispatch({ type: "replace-memories", notes: applied.notes });
          return applied.output;
        },
        onScratchpad: (action, content) => {
          if (action === "read") return scratchpadNow;
          scratchpadNow = content.trim().slice(0, 12_000);
          dispatch({ type: "patch-thread", id: threadId, patch: { scratchpad: scratchpadNow } });
          return scratchpadNow;
        },
        onPlan: (text) => dispatch({ type: "patch-thread", id: threadId, patch: { plan: text, planStatus: "draft" } }),
        onPlanStatus: (planStatus) => dispatch({ type: "patch-thread", id: threadId, patch: { planStatus } }),
        onTodos: (todos) => dispatch({ type: "patch-thread", id: threadId, patch: { todos } }),
        runHook: (call) => activeThread!.folder
          ? runProjectHooks(activeThread!.folder, "PreToolUse", {
            tool: call.tool,
            path: call.path || "",
            command: call.command || "",
            text: (call.text || "").slice(0, 500)
          })
          : Promise.resolve({ decision: "none" as const, reason: "", context: "" }),
        onHighRisk: (host) => {
          if (highRiskRef.current.includes(host)) return;
          highRiskRef.current = [...highRiskRef.current, host];
          dispatch({ type: "settings", patch: { highRiskHosts: highRiskRef.current } });
        },
        onSimulator: (view) => setSimView(view)
      };
      if (desktop && !hasProviderKey(state.settings)) {
        const ran = await localSteps(messages.at(-1)?.content ?? "", env);
        ran.forEach((step, index) => {
          steps.push({ tool: step.call.tool, ok: step.ok, output: step.output.slice(0, 700) });
          keepShot(index, step.image);
        });
        publish(ran.length ? "Ran these steps on your Mac. No model provider key is set, so nothing chose the next move. Add one in Settings → Model providers." : "Nothing to run yet. Grant a folder, paste a URL, or prefix a shell command with `run `.");
      } else {
        let content = "";
        const turn = {
          settings: { ...state.settings, model: activeThread!.model, effort: activeThread!.effort, design },
          skills: state.skills,
          connectors: state.connectors,
          memories: [
            ...memoryPromptLines(memoryNow),
            ...(scratchpadNow ? [`Session scratchpad (yours to update with scratchpad_update):\n${scratchpadNow}`] : [])
          ],
          projectInstructions: projectPrompt(state.projects, activeThread!.projectId) || undefined,
          projectRules: packRef.current.rules,
          focusSkill,
          planMode: permissionMode === "plan",
          approvedPlan: approvedPlanForTurn(permissionMode, activeThread!.plan, activeThread!.planStatus, override?.usePlan),
          folderListing,
          mode,
          routeNote,
          messages
        };
        const result = await completeTurn(turn, (chunk) => {
          content += chunk;
          publish(content);
        }, desktop ? async (call) => {
          steps.push({ tool: call.tool, ok: true, output: "Running…" });
          publish(content);
          const step = await runTool(call, env);
          steps[steps.length - 1] = { tool: call.tool, ok: step.ok, output: step.output.slice(0, 1200) };
          keepShot(steps.length - 1, step.image);
          if (["write_file", "run", "git", "apply_patch", "doc_write"].includes(call.tool)) setDiffTick((tick) => tick + 1);
          publish(content);
          return step;
        } : undefined, () => stopRef.current);
        content = result.content || content;
        if (stopRef.current) {
          setRouteLine("Stopped after this step. The reply above is what ran.");
        }
        if (desktop && !result.nativeTools) {
          for (const call of parseTools(content)) {
            const step = await runTool(call, env);
            steps.push({ tool: call.tool, ok: step.ok, output: step.output.slice(0, 700) });
            keepShot(steps.length - 1, step.image);
          }
          publish(content);
        }
        const produced = artifactsFromMessages([{ id: assistantId, role: "assistant", content, createdAt: Date.now() }]);
        const savedAt = Date.now();
        for (const artifact of produced) {
          dispatch({ type: "remember-artifact", id: artifact.id, title: artifact.title, language: artifact.language, content: artifact.content, at: savedAt });
        }
        if (produced[0] && state.settings.artifactsOn) {
          dispatch({ type: "artifact", open: true, id: produced[0].id });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setError(message);
      dispatch({ type: "update-message", threadId: activeThread!.id, messageId: assistantId, content: `Couldn’t complete this turn. ${message}` });
    } finally {
      setBusy(false);
      void window.modbitx?.armComputer(false);
      if (state.settings.keepBrowserCookies === false) void window.modbitx?.clearBrowserStorage();
      if (state.settings.notifyOnDone && !document.hasFocus()) {
        if (state.settings.notifySound) playNotificationDing();
        void window.modbitx?.notify("Modbitx", "A reply is ready.");
      }
      if (mode === "code" && window.modbitx?.jevSession) {
        const judged = await window.modbitx.jevSession({
          title: activeThread!.title,
          permission: permissionMode,
          planStatus: activeThread!.planStatus || "",
          plan: activeThread!.plan || "",
          messages: [
            ...messages.map((message) => ({ role: message.role, text: message.content, steps: message.steps })),
            ...(spoken ? [{ role: "assistant", text: spoken, steps }] : [])
          ]
        });
        if (judged?.ok) {
          dispatch({
            type: "patch-thread",
            id: activeThread!.id,
            patch: {
              sessionStatus: applySessionStatus(true, judged.status),
              sessionConfidence: judged.status?.confidence
            }
          });
        }
      }
    }
  }
  }

  async function send(text: string, files: Attachment[], override?: { permissionMode?: PermissionMode; usePlan?: boolean }) {
    const user: Message = { id: newId(), role: "user", content: text, createdAt: Date.now(), attachments: files };
    dispatch({ type: "add-message", threadId: activeThread!.id, message: user });
    dispatch({ type: "settings", patch: { usageTokens: state.settings.usageTokens + Math.ceil((text.length + 400) / 4) } });
    await run([...activeThread!.messages, user], undefined, override);
  }

  function setPermission(permissionMode: PermissionMode) {
    const current = activeThread!.permissionMode || state.settings.permissionMode;
    dispatch({
      type: "patch-thread",
      id: activeThread!.id,
      patch: {
        permissionMode,
        ...(permissionMode === "plan" && current !== "plan" ? { planReturn: current } : {})
      }
    });
  }

  async function compact() {
    const messages = activeThread!.messages;
    if (messages.length < 6) {
      setRouteLine("Nothing to compact yet. A conversation compacts after six messages.");
      return;
    }
    const summary = await summarizeHistory(
      { ...state.settings, model: activeThread!.model, effort: activeThread!.effort },
      messages.slice(0, -4)
    );
    dispatch({
      type: "patch-thread",
      id: activeThread!.id,
      patch: {
        messages: [
          { id: newId(), role: "user", content: `Earlier conversation, compacted:\n${summary}`, createdAt: Date.now() },
          ...messages.slice(-4)
        ]
      }
    });
    setRouteLine("Compacted older messages. The last four remain.");
  }

  function sessionRows(): SessionRow[] {
    return state.threads
      .filter((thread) => thread.mode === activeThread!.mode)
      .map((thread) => ({ id: thread.id, title: thread.title, updatedAt: thread.updatedAt, archived: thread.archived }));
  }

  async function saveSessionFile(name: string, text: string): Promise<boolean> {
    const file = safeExportName(name);
    if (!file) {
      setRouteLine("Use a file name in the granted folder, such as reply.md.");
      return false;
    }
    const permission = activeThread!.permissionMode || state.settings.permissionMode;
    if (activeThread!.folder && !sessionFileWriteAllowed(permission)) {
      setRouteLine("Plan mode only reads. Copy without a file name, or leave plan mode first.");
      return false;
    }
    if (activeThread!.folder && window.modbitx) {
      try {
        await window.modbitx.writeFile(activeThread!.folder, file, text);
        setRouteLine(`Saved ${file}.`);
        return true;
      } catch (error) {
        setRouteLine(error instanceof Error ? error.message : "Could not save that file.");
        return false;
      }
    }
    const saved = await window.modbitx?.saveText(file, text);
    if (!window.modbitx) {
      setRouteLine("Choose a folder before saving into it.");
      return false;
    }
    setRouteLine(saved ? `Saved ${saved.split("/").pop()}.` : "Export canceled.");
    return Boolean(saved);
  }

  async function copyReply(rest: string) {
    const parsed = parseCopyRequest(rest);
    if ("error" in parsed) {
      setRouteLine(parsed.error);
      return;
    }
    const text = assistantReply(activeThread!.messages, parsed.nth);
    if (text == null) {
      setRouteLine(parsed.nth === 1 ? "No reply to copy yet." : `There is no reply ${parsed.nth} back.`);
      return;
    }
    if (parsed.file) {
      await saveSessionFile(parsed.file, text);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setRouteLine(parsed.nth === 1 ? "Copied the latest reply." : `Copied reply ${parsed.nth} back.`);
    } catch {
      setRouteLine("Could not reach the clipboard.");
    }
  }

  async function exportChat(rest: string) {
    const body = exportTranscript(activeThread!.title, activeThread!.messages);
    if (!rest.trim()) {
      try {
        await navigator.clipboard.writeText(body);
        setRouteLine("Copied this conversation.");
      } catch {
        setRouteLine("Could not reach the clipboard.");
      }
      return;
    }
    await saveSessionFile(rest, body);
  }

  function applyRewind(messageId: string) {
    const next = rewindTo(activeThread!.messages, messageId);
    if (!next) {
      setRouteLine("That prompt is not in this chat.");
      return;
    }
    if (next.length === activeThread!.messages.length) {
      setRouteLine("Nothing after that prompt. Files already written stay on disk.");
      setPicker(null);
      return;
    }
    dispatch({ type: "patch-thread", id: activeThread!.id, patch: { messages: next } });
    setPicker(null);
    setRouteLine("Rewound the conversation. Files already written stay on disk.");
  }

  function onSlash(rawName: string, rest: string, files: Attachment[] = []) {
    const name = canonicalSlash(rawName);
    if (name === "new") {
      dispatch({
        type: "new-thread",
        mode: activeThread!.mode,
        incognito: activeThread!.incognito,
        projectId: activeThread!.projectId,
        folder: activeThread!.mode === "chat" ? undefined : activeThread!.folder
      });
      setDraft("");
      setRouteLine(activeThread!.mode === "code" ? "Started a new session." : activeThread!.mode === "cowork" ? "Started a new task." : "Started a new chat.");
      return;
    }
    if (name === "resume") {
      const rows = sessionRows();
      const match = resumeMatch(rows, rest, activeThread!.id);
      if ("id" in match) {
        const title = rows.find((row) => row.id === match.id)?.title || "chat";
        dispatch({ type: "select", id: match.id });
        setRouteLine(`Resumed ${title}.`);
        return;
      }
      if (match.status === "current") {
        setRouteLine("This chat is already open.");
        return;
      }
      if (match.status === "none") {
        setRouteLine("No chat matches that.");
        return;
      }
      setPicker({ kind: "resume", query: rest });
      return;
    }
    if (name === "fork") {
      const flags = stripWorktreeFlag(rest);
      const sourceId = activeThread!.id;
      const sourceFolder = activeThread!.folder;
      const sourceTitle = activeThread!.title;
      void (async () => {
        let folder = sourceFolder;
        if (flags.worktree) {
          const location = state.settings.worktreeLocation;
          if (!sourceFolder || !location) {
            setRouteLine(!sourceFolder ? "Open a repository before creating a worktree." : "Choose a worktree folder in Settings → Code.");
            return;
          }
          const branch = branchName(state.settings.branchPrefix || "", flags.rest || sourceTitle);
          if (!branch) {
            setRouteLine("Name a branch for the worktree.");
            return;
          }
          const result = await window.modbitx?.git(sourceFolder, "worktree", branch, location);
          if (!result || result.code !== 0) {
            setRouteLine(`${result?.stderr || result?.stdout || "Could not create the worktree."}`.trim());
            return;
          }
          folder = result.stdout.split("\n")[0]?.trim() || folder;
        }
        dispatch({ type: "fork", threadId: sourceId, folder: flags.worktree ? folder : undefined });
        if (flags.rest) setDraft(flags.rest);
        const ready = flags.rest ? " The next message is ready to send." : "";
        setRouteLine(flags.worktree ? `Forked this chat into ${folder}.${ready}` : `Forked this chat.${ready}`);
      })();
      return;
    }
    if (name === "rewind") {
      if (busy) {
        setRouteLine("Wait for this reply to finish before rewinding.");
        return;
      }
      const points = rewindPoints(activeThread!.messages);
      if (points.length === 0) {
        setRouteLine("Nothing to rewind yet.");
        return;
      }
      setPicker({ kind: "rewind", query: "" });
      return;
    }
    if (name === "copy") {
      void copyReply(rest);
      return;
    }
    if (name === "export") {
      void exportChat(rest);
      return;
    }
    if (name === "rename") {
      const parsed = parseRename(rest);
      if ("error" in parsed) {
        setRouteLine(parsed.error);
        return;
      }
      const title = "auto" in parsed ? autoTitle(activeThread!.mode, activeThread!.messages) : parsed.title;
      dispatch({ type: "patch-thread", id: activeThread!.id, patch: { title } });
      setRouteLine(`Title is ${title}.`);
      return;
    }
    if (name === "compact") {
      void compact();
      return;
    }
    if (name === "context") {
      setRouteLine(contextEstimate(activeThread!.messages, packRef.current.rules));
      return;
    }
    if (name === "record") {
      const action = rest.trim().toLowerCase();
      if (action === "start") {
        if (!window.modbitx?.recordStart) {
          setRouteLine("Recording needs the desktop app.");
          return;
        }
        void window.modbitx.recordStart().then((started) => {
          setRouteLine(started.note + " Stop with /record stop. Frames stay in temp and are replaced by the next recording.");
        }).catch((error: unknown) => {
          setRouteLine(error instanceof Error ? error.message : "Recording could not start.");
        });
        return;
      }
      if (action === "stop") {
        void window.modbitx?.recordStop().then((stopped) => {
          setRouteLine(`Stopped. ${stopped.frames.length} frames recorded. Ask about them, or the model can call computer_history.`);
        });
        return;
      }
      setRouteLine("Use /record start or /record stop. Recording frames the screen every 5 seconds with the frontmost app named.");
      return;
    }
    if (name === "scratchpad") {
      const notes = activeThread!.scratchpad?.trim();
      setRouteLine(notes ? `Scratchpad: ${notes.replace(/\s+/g, " ").slice(0, 300)}` : "The scratchpad is empty. The model fills it with scratchpad_update while it works.");
      return;
    }
    if (name === "view-plan") {
      setRouteLine(activeThread!.plan ? "The plan is above the composer." : "No plan yet. Use /plan, then describe the task.");
      return;
    }
    if (name === "model") {
      const available = providerModels(state.settings);
      const found = available.find((item) => item.id === rest || item.name.toLowerCase() === rest.toLowerCase());
      if (!found) {
        setRouteLine(`Models: ${available.map((item) => item.id).join(", ")}.`);
        return;
      }
      dispatch({ type: "patch-thread", id: activeThread!.id, patch: { model: found.id } });
      setRouteLine(`Model is ${found.name}.`);
      return;
    }
    if (name === "effort") {
      const found = EFFORTS.find((item) => item.id === rest);
      if (!found) {
        setRouteLine("Effort is low, medium, high, xhigh, or max.");
        return;
      }
      dispatch({ type: "patch-thread", id: activeThread!.id, patch: { effort: found.id } });
      setRouteLine(`Effort is ${found.label}.`);
      return;
    }
    if (name === "research") {
      if (busy) {
        setRouteLine("Wait for the current reply to finish before starting research.");
        return;
      }
      const topic = rest.trim();
      if (!topic) {
        setRouteLine("Name a topic: /research local-first note apps");
        return;
      }
      if (!hasProviderKey(state.settings)) {
        setRouteLine("Research needs a model provider key. Add one in Settings → Model providers.");
        return;
      }
      setDraft("");
      stopRef.current = false;
      setStopAsked(false);
      setBusy(true);
      setError("");
      const threadId = activeThread!.id;
      dispatch({ type: "running", id: threadId, on: true });
      const assistantId = newId();
      dispatch({ type: "add-message", threadId, message: { id: assistantId, role: "assistant", content: "", createdAt: Date.now() } });
      let stepCount = 0;
      let published = false;
      // Research pages go through the same host gate the browser tools use.
      const researchFetch = async (url: string): Promise<{ url: string; title: string; text: string } | null> => {
        if (!window.modbitx?.fetchPage) return null;
        let host = "";
        try { host = new URL(url).hostname; } catch { return null; }
        const highRisk = (state.settings.highRiskHosts || []).includes(host)
          || markHighRisk((await window.modbitx.jevSite(host, url))?.risk ?? 0.5);
        if (highRisk && !(state.settings.highRiskHosts || []).includes(host)) {
          dispatch({ type: "settings", patch: { highRiskHosts: [...(state.settings.highRiskHosts || []), host] } });
        }
        const answer = await ask({ kind: "browser", detail: host, highRisk });
        if (answer === "no") return null;
        try { return await window.modbitx.fetchPage(url); } catch { return null; }
      };
      void runResearch(topic, state.settings, {
        onSteps: (steps) => {
          stepCount = steps.length;
          setResearch(steps);
        },
        onReport: () => {
          published = true;
        },
        shouldStop: () => stopRef.current,
        fetchPage: researchFetch
      }).then(async (result) => {
        if (result.ok && result.report) {
          published = true;
          const sources = result.ledger?.length ?? 0;
          dispatch({ type: "update-message", threadId, messageId: assistantId, content: researchMessage(result.report, stepCount, sources) });
          // The Codex contract makes the document the deliverable: write the
          // DOCX beside the chat when a folder is granted, else point at Export.
          const stem = `research-${topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "report"}.docx`;
          if (activeThread!.folder && window.modbitx?.writeDocument) {
            try {
              const written = await window.modbitx.writeDocument("docx", `${activeThread!.folder}/${stem}`, result.report);
              setRouteLine(`Research report written to ${written || stem}.`);
              return;
            } catch { /* fall through to the export note */ }
          }
          setRouteLine("Research report is in the artifact. Export it as Word from its Export menu.");
        } else {
          const note = result.reason || "Research stopped.";
          if (!published) {
            dispatch({ type: "update-message", threadId, messageId: assistantId, content: note });
          }
          setRouteLine(note);
        }
      }).finally(() => {
        setResearch(null);
        dispatch({ type: "running", id: threadId, on: false });
        setBusy(false);
      });
      return;
    }
    const modes: Record<string, PermissionMode> = { plan: "plan", auto: "auto", ask: "ask", accept: "accept-edits", bypass: "bypass" };
    const next = modes[name];
    if (!next) return;
    if (next === "bypass" && state.settings.allowBypass === false) {
      setRouteLine("Bypass is off. Turn it on in Settings → Code.");
      return;
    }
    setPermission(next);
    const label = next === "accept-edits" ? "Accept edits" : next === "plan" ? "Plan" : next === "auto" ? "Auto" : next === "bypass" ? "Bypass" : "Ask";
    if (!rest) {
      setRouteLine(next === "plan"
        ? "Plan mode is on. The next message can read the repo and write a plan. Files stay unchanged until you approve it."
        : next === "auto"
          ? "Auto is on. Jev 1.13 allows a safe local edit and asks before the rest."
          : `${label} is on.`);
      return;
    }
    void send(rest, files, { permissionMode: next });
  }

  function approvePlan() {
    const back = permissionAfterApproval(activeThread!.planReturn);
    dispatch({ type: "patch-thread", id: activeThread!.id, patch: { permissionMode: back, planStatus: "approved" } });
    void send("The plan is approved. Implement it now. Do not rewrite the plan unless a file you read contradicts it.", [], { permissionMode: back, usePlan: true });
  }

  return (
    <main className="main">
      <header className="topbar">
        <div>
          <div className="kicker">{activeThread.mode}{activeThread.incognito ? " · incognito" : ""}{activeThread.projectId ? " · project" : ""}</div>
          <h1>{activeThread.title}</h1>
        </div>
        <div className="top-actions">
          {activeThread.mode === "code" && (
            <>
              {activeThread.folder && (
                <button className="ghost" title="Write a commit message in this repo's style" onClick={() => { setDraft("Write a commit message for the current diff in this repo's style, show it to me, then commit it."); setRouteLine("Commit message is drafted in the composer."); }}>Commit</button>
              )}
              <button className="ghost" title="Review this session's changes" onClick={() => { setDraft("Review the changes made in this session. List bugs, security issues, and notes, each with a file path and a concrete fix."); setRouteLine("Review prompt is drafted in the composer."); }}>Review</button>
              <button className="ghost" title="Run the repo checks and fix failures" onClick={() => { setDraft("Run this repository's checks, read the failures, and fix them. Show the failing output before each fix."); setRouteLine("Fix-checks prompt is drafted in the composer."); }}>Fix checks</button>
            </>
          )}
          <button className="ghost" onClick={() => dispatch({ type: "patch-thread", id: activeThread.id, patch: { starred: !activeThread.starred } })}>{activeThread.starred ? "Starred" : "Star"}</button>
          <button className="ghost" onClick={() => dispatch({ type: "patch-thread", id: activeThread.id, patch: { pinned: !activeThread.pinned } })}>{activeThread.pinned ? "Unpin" : "Pin"}</button>
          <button className="ghost" onClick={() => dispatch({ type: "patch-thread", id: activeThread.id, patch: { archived: true } })}>Archive</button>
          <button className="ghost" title="Open this session in its own window" onClick={() => void window.modbitx?.popoutThread(activeThread.id)}>Pop out</button>
          <button className="ghost" onClick={() => dispatch({ type: "bg-open", open: !state.bgOpen })}>Agents {(state.bgTasks || []).length ? `(${state.bgTasks.length})` : ""}</button>
          <button className="ghost" onClick={() => dispatch({ type: "artifact", open: !state.artifactOpen })}>Artifacts {artifacts.length ? `(${artifacts.length})` : ""}</button>
        </div>
      </header>
      {routeLine && <div className="banner">{routeLine}</div>}
      {busy && activeThread.mode !== "chat" && (
        <div className={state.settings.computerMode === "takeover" ? "working takeover" : "working"}>
          {state.settings.computerMode === "takeover" ? "Modbitx has the screen. The browser opens when a site is allowed." : "Modbitx is working. The browser opens on the right when a site is allowed."}
          {stopAsked ? " Stopping after this step…" : ""}
        </div>
      )}
      {findOpen && (
        <form
          className="find-bar"
          role="search"
          aria-label="Find in page"
          onSubmit={(event) => { event.preventDefault(); runFind(findQuery, true); }}
        >
          <input
            autoFocus
            aria-label="Find in page"
            data-find-input
            value={findQuery}
            placeholder="Find in this conversation"
            onChange={(event) => { setFindQuery(event.target.value); setFindCount(null); }}
            onKeyDown={(event) => {
              if (event.key === "Enter") { event.preventDefault(); runFind(findQuery, !event.shiftKey); }
              if (event.key === "Escape") { event.preventDefault(); closeFind(); }
            }}
          />
          <span className="muted tiny" data-find-count>{findCount ? `${findCount.active} of ${findCount.matches}` : (window.modbitx?.findInPage ? "Type and press Enter" : "Find needs the desktop app")}</span>
          <button className="ghost" type="button" aria-label="Previous match" onClick={() => runFind(findQuery, false)}>↑</button>
          <button className="ghost" type="button" aria-label="Next match" onClick={() => runFind(findQuery, true)}>↓</button>
          <button className="ghost" type="button" aria-label="Close find" onClick={closeFind}>×</button>
        </form>
      )}
      <div className="split">
        {activeThread.mode === "code" && (
          <div className="filetree">
            <button className="ghost" onClick={async () => {
              const folder = await window.modbitx?.chooseFolder();
              if (folder) { setTreeDir(""); dispatch({ type: "patch-thread", id: activeThread.id, patch: { folder } }); }
            }}>{activeThread.folder ? activeThread.folder.split("/").pop() : "Open a repository"}</button>
            {treeDir && <button className="file-row" onClick={() => setTreeDir(treeDir.split("/").slice(0, -1).join("/"))}>▸ ..</button>}
            {files.map((entry) => (
              <button key={entry.name} className="file-row" onClick={() => {
                if (!activeThread.folder || !window.modbitx) return;
                const rel = treeDir ? `${treeDir}/${entry.name}` : entry.name;
                if (entry.kind === "dir") { setTreeDir(rel); return; }
                void window.modbitx.readDocument(`${activeThread.folder}/${rel}`).then((text) => setPreview(text.slice(0, 4000) || "(empty or binary)"));
              }}>{entry.kind === "dir" ? "▸" : "·"} {entry.name}</button>
            ))}
          </div>
        )}
        <section className="transcript">
          {activeThread.messages.every((message) => message.role !== "user") && (
            <div className="hero">
              <h2>{activeThread.mode === "cowork" ? "Hand off a task" : activeThread.mode === "code" ? "What should we change?" : `How can I help, ${state.settings.displayName.split(" ")[0]}?`}</h2>
            </div>
          )}
          {preview && <pre className="file-preview">{preview}</pre>}
          {shot && <img className="shot" src={shot} alt="Latest screenshot" />}
          {activeThread.messages.map((message) => (
            <article key={message.id} className={`msg ${message.role}`}>
              <div className="msg-meta">{message.role === "user" ? "You" : "Modbitx"}</div>
              {editing === message.id ? (
                <div>
                  <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={4} />
                  <button className="send" onClick={() => {
                    const updated = activeThread.messages.map((item) => item.id === message.id ? { ...item, content: editText } : item);
                    dispatch({ type: "patch-thread", id: activeThread.id, patch: { messages: updated.filter((item) => item.createdAt <= message.createdAt) } });
                    setEditing(null);
                    const sliced = updated.filter((item) => item.createdAt < message.createdAt || item.id === message.id).map((item) => item.id === message.id ? { ...item, content: editText } : item);
                    void run(sliced);
                  }}>Save and resend</button>
                </div>
              ) : (
                <>
                  {state.settings.showThinking !== false && message.steps && message.steps.length > 0 && <StepList steps={message.steps} shots={stepShots[message.id]} />}
                  {message.content ? (
                    <Markdown text={message.content} />
                  ) : busy && (state.settings.showThinking === false || !message.steps?.length) ? (
                    <div className="stream-indicator" role="status" aria-label="Modbitx is replying"><span className="stream-dot" aria-hidden />Modbitx is replying</div>
                  ) : null}
                </>
              )}
              {message.attachments && message.attachments.length > 0 && (
                <div className="chips">{message.attachments.map((file) => <span key={file.id} className="chip">{file.name}</span>)}</div>
              )}
              <div className="msg-actions">
                <button onClick={() => navigator.clipboard.writeText(message.content)}>Copy</button>
                <button onClick={() => {
                  const quote = message.content.replace(/\s+/g, " ").trim().slice(0, 220);
                  setDraft((current) => (current ? `${current}\n\n` : "") + `> ${quote}\n\n`);
                  setRouteLine("The quote is in the composer.");
                }}>Quote</button>
                {message.role === "assistant" && <button onClick={() => void window.modbitx?.speak(message.content.slice(0, 2000), { voice: state.settings.speakVoice, rate: state.settings.speakRate })}>Speak</button>}
                {message.role === "user" && <button onClick={() => { setEditing(message.id); setEditText(message.content); }}>Edit</button>}
                {message.role === "assistant" && <button disabled={busy} onClick={() => void run(activeThread.messages, message.id)}>Regenerate</button>}
                <button onClick={() => dispatch({ type: "branch", threadId: activeThread.id, messageId: message.id })}>Branch</button>
              </div>
            </article>
          ))}
          {error && <div className="banner warn">{error}</div>}
          {approval && (
            <div className="approval">
              <strong>
                {approval.kind === "browser"
                  ? <>Allow Modbitx to use the browser on {approval.detail}?</>
                  : approval.kind === "simulator"
                    ? <>Allow Modbitx to control this simulator?</>
                    : approval.kind === "commit"
                      ? <>Allow this page action?</>
                      : approval.detail === "use your computer"
                        ? <>Allow Modbitx to use your computer?</>
                        : <>Allow this action: {approval.detail}?</>}
              </strong>
              <p className="muted">
                {approval.kind === "browser"
                  ? approval.highRisk
                    ? "This site is high-risk, so Modbitx asks before each visit. It can then read the page, click, and fill fields. Sign-ins stay in this app."
                    : "Modbitx opens the site in the built-in browser, then it can read the page, click, and fill fields. Sign-ins stay in this app."
                  : approval.kind === "simulator"
                    ? "Modbitx will boot or drive the iOS Simulator or Android emulator and take screenshots of that screen. It does not touch a physical phone."
                    : approval.kind === "commit"
                      ? approval.detail
                      : approval.detail === "use your computer"
                        ? "Screenshots, app focus, clicks, and typing. Background mode does not steal the front window. Take over activates the app. macOS asks for Screen Recording and Accessibility the first time."
                        : "The coding agent is asking before it changes the repo, runs a command, or uses SSH."}
              </p>
              <div className="top-actions">
                <button className="send" onClick={() => answer("task")}>{approval.kind === "browser" ? "Allow for this task" : "Allow"}</button>
                {approval.kind === "browser" && !approval.highRisk && <button className="ghost" onClick={() => answer("always")}>Always</button>}
                {approval.kind !== "browser" && ruleFromAction(approval.detail) && (
                  <button
                    className="ghost"
                    title="Save an allow rule for commands starting with the same word"
                    onClick={() => {
                      const rule = ruleFromAction(approval.detail);
                      if (rule) dispatch({ type: "settings", patch: { commandRules: addRule(state.settings.commandRules || [], rule) } });
                      answer("task");
                    }}
                  >Always allow this</button>
                )}
                {approval.kind === "browser" && <button className="ghost" onClick={() => answer("once")}>Just once</button>}
                <button className="ghost" onClick={() => answer("no")}>Deny</button>
              </div>
            </div>
          )}
          {activeThread.mode !== "chat" && !activeThread.folder && (
            <div className="folder-cue">
              <span className="cue-caption">
                {activeThread.mode === "code" ? "Open a repository to work in" : "Grant a folder for this task"}
              </span>
              <div className="cue-chips">
                {state.settings.trustedFolders.map((folder) => (
                  <button key={folder} className="chip-button" onClick={() => dispatch({ type: "patch-thread", id: activeThread.id, patch: { folder } })}>{folder.split("/").pop()}</button>
                ))}
                <button className="chip-button" onClick={async () => {
                  const folder = await window.modbitx?.chooseFolder();
                  if (folder) dispatch({ type: "patch-thread", id: activeThread.id, patch: { folder } });
                }}>Choose a folder</button>
                <span className="muted cue-hint">Files never leave this Mac.</span>
              </div>
            </div>
          )}
          {activeThread.folder && !state.settings.trustedFolders.includes(activeThread.folder) && (
            <button className="ghost folder-cue" onClick={() => dispatch({ type: "settings", patch: { trustedFolders: [...state.settings.trustedFolders, activeThread.folder!] } })}>Remember {activeThread.folder.split("/").pop()} for later tasks</button>
          )}
          {(activeThread.todos || []).length > 0 && (
            <ol className="todos">
              {activeThread.todos!.map((todo) => (
                <li key={todo.id} className={todo.status}>{todo.status === "done" ? "Done" : todo.status === "doing" ? "Doing" : "Pending"} · {todo.title}</li>
              ))}
            </ol>
          )}
          {(activeThread.plan || activeThread.planStatus === "review") && (
            <div className="approval plan-card">
              <strong>{activeThread.planStatus === "approved" ? "Approved plan" : activeThread.planStatus === "review" ? "Plan ready" : "Plan draft"}</strong>
              <pre>{activeThread.plan || "No plan written yet. Ask for a revision, or approve to let this session edit anyway."}</pre>
              {activeThread.planStatus === "review" && (
                <div className="top-actions">
                  <button className="send" onClick={approvePlan}>Approve and build</button>
                  <button className="ghost" onClick={() => setDraft("Revise the plan: ")}>Request changes</button>
                </div>
              )}
            </div>
          )}
          {question && (
            <form
              className="question-card"
              data-question={question.question?.kind || "text"}
              onSubmit={(event) => {
                event.preventDefault();
                const kind = question.question?.kind || "text";
                if (kind === "multi") {
                  if (!multiPicks.length) return;
                  question.resolve(multiPicks.join(", "));
                } else if (kind === "scale") {
                  const scale = question.question!;
                  question.resolve(String(scaleValue || Math.round((scale.min + scale.max) / 2)));
                } else {
                  const answer = otherAnswer.trim();
                  if (!answer) return;
                  question.resolve(answer);
                }
                setQuestion(null);
                setOtherAnswer("");
              }}>
              <strong>{question.prompt}</strong>
              {question.question?.kind === "multi" ? (
                <div className="top-actions" aria-label="Options">
                  {question.options.map((option) => (
                    <label key={option} className="pick-row">
                      <input
                        type="checkbox"
                        checked={multiPicks.includes(option)}
                        onChange={(event) => setMultiPicks((current) => event.target.checked ? [...current, option] : current.filter((item) => item !== option))}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              ) : question.question?.kind === "scale" ? (
                (() => {
                  const scale = question.question!;
                  const values: number[] = [];
                  for (let value = scale.min; value <= scale.max; value += scale.step) values.push(value);
                  return (
                    <div className="composer-bar">
                      <select aria-label={`${question.prompt}: ${scale.min} to ${scale.max}`} value={scaleValue || Math.round((scale.min + scale.max) / 2)} onChange={(event) => setScaleValue(Number(event.target.value))}>
                        {values.map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                      <span className="muted tiny">{scale.min}–{scale.max}</span>
                    </div>
                  );
                })()
              ) : (
                <div className="top-actions">
                  {question.options.map((option) => (
                    <button key={option} type="button" className="question-option" data-ask-option={option} onClick={() => { question.resolve(option); setQuestion(null); }}>{option}</button>
                  ))}
                </div>
              )}
              <div className="composer-bar">
                {question.question?.kind === "multi" || question.question?.kind === "scale" ? (
                  <button className="send" type="submit">{question.question.kind === "multi" ? (multiPicks.length ? `Send ${multiPicks.length}` : "Pick at least one") : "Send answer"}</button>
                ) : (
                  <>
                    <input aria-label="Other answer" value={otherAnswer} placeholder={question.options.length ? "Other" : "Your answer"} onChange={(event) => setOtherAnswer(event.target.value)} />
                    <button className="ghost" type="submit">Send answer</button>
                  </>
                )}
              </div>
            </form>
          )}
          {picker && (
            <div className="approval" role="dialog" aria-label={picker.kind === "resume" ? "Resume a chat" : "Rewind"}>
              <strong>{picker.kind === "resume" ? "Resume a chat" : "Rewind to a prompt"}</strong>
              <p className="muted">{picker.kind === "resume" ? "Recent chats in this mode." : "Messages after the prompt are dropped. Files already written stay on disk."}</p>
              {picker.kind === "resume" && (
                <input aria-label="Filter chats" value={picker.query} placeholder="Filter by title" onChange={(event) => setPicker({ kind: "resume", query: event.target.value })} />
              )}
              <div className="session-list">
                {picker.kind === "resume" && resumeList(sessionRows(), picker.query, activeThread.id).map((row) => (
                  <button key={row.id} type="button" onClick={() => { setPicker(null); dispatch({ type: "select", id: row.id }); setRouteLine(`Resumed ${row.title}.`); }}>{row.title}</button>
                ))}
                {picker.kind === "resume" && resumeList(sessionRows(), picker.query, activeThread.id).length === 0 && <p className="muted">No other chats in this mode.</p>}
                {picker.kind === "rewind" && rewindPoints(activeThread.messages).map((point) => (
                  <button key={point.messageId} type="button" onClick={() => applyRewind(point.messageId)}>{point.label}</button>
                ))}
              </div>
              <div className="top-actions">
                <button className="ghost" type="button" onClick={() => setPicker(null)}>Close</button>
              </div>
            </div>
          )}
          {activeThread.scratchpad?.trim() && (
            <details className="plan-card">
              <summary className="steps-caption">Scratchpad — this session's working notes</summary>
              <pre>{activeThread.scratchpad}</pre>
            </details>
          )}
          {research && (
            <div className="research-card" role="status" aria-label="Research progress">
              <div className="rc-head">
                <span className="stream-dot" aria-hidden />
                Researching — {research.filter((step) => step.status === "done").length} of {research.length} steps
                {research.some((step) => step.sources.length) ? ` · ${research.reduce((sum, step) => sum + step.sources.length, 0)} sources` : ""}
              </div>
              <ol>
                {research.map((step) => (
                  <li key={step.question} className={step.status === "done" ? "done" : step.status === "doing" ? "doing" : ""}>
                    {step.question}{step.sources.length ? ` · ${step.sources.length} source${step.sources.length === 1 ? "" : "s"}` : ""}
                  </li>
                ))}
              </ol>
            </div>
          )}
          <Composer draft={draft} setDraft={setDraft} busy={busy} commands={commands} mentions={mentions} onSend={(text, files) => void send(text, files)} onSlash={onSlash} onStop={() => { stopRef.current = true; setStopAsked(true); }} />
        </section>
        {browserUrl && <BrowserPane url={browserUrl} busy={busy} note={browserNote} log={browserLog} onClose={() => { setBrowserUrl(null); setBrowserNote(""); setBrowserLog([]); void window.modbitx?.browserHide(); }} />}
        {simView && <SimulatorPane name={simView.name} note={simView.note} image={simView.image} udid={simView.udid} onClose={() => setSimView(null)} />}
        {state.bgOpen && (
          <BgTasksPanel onInsert={(text) => {
            setDraft((current) => current ? `${current}\n\n${text}` : text);
          }} />
        )}
        {state.artifactOpen && (
          <ArtifactPane
            threadId={activeThread.id}
            title={openArtifact?.title ?? "Artifacts"}
            language={openArtifact?.language ?? ""}
            content={openArtifact?.content ?? "No artifact in this thread yet. Ask for an HTML preview."}
            choices={artifacts}
            activeId={openArtifact?.id}
            onPick={(id) => dispatch({ type: "artifact", open: true, id })}
            onClose={() => dispatch({ type: "artifact", open: false })}
          />
        )}
      </div>
      {activeThread.mode === "code" && (
        <CodeDock
          folder={activeThread.folder}
          permission={activeThread.permissionMode || state.settings.permissionMode}
          sshTarget={activeThread.sshTarget || state.settings.sshTarget}
          revision={diffTick}
          branchPrefix={state.settings.branchPrefix || ""}
          allowBypass={state.settings.allowBypass !== false}
          worktreeLocation={state.settings.worktreeLocation || ""}
          githubToken={state.settings.githubToken}
          sessionStatus={activeThread.sessionStatus}
          onPermission={(permissionMode) => setPermission(permissionMode)}
          onSsh={(sshTarget) => dispatch({ type: "patch-thread", id: activeThread.id, patch: { sshTarget } })}
          onFeedback={(comment) => {
            setDraft((current) => current ? `${current}\n\nReview comment on the working tree: ${comment}` : `Address this review comment on the working tree: ${comment}`);
            setRouteLine("The comment is in the composer with the diff context.");
          }}
        />
      )}
    </main>
  );
}

function StepList({ steps, shots }: { steps: Step[]; shots?: string[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const failed = steps.filter((step) => step.output !== "Running…" && !step.ok).length;
  return (
    <div className="steps-wrap">
      <div className="steps-caption">
        <span>{steps.length} {steps.length === 1 ? "step" : "steps"}</span>
        {failed > 0 && <span className="steps-failed">{failed} failed</span>}
      </div>
      <ol className="steps">
        {steps.map((step, index) => {
          const running = step.output === "Running…";
          const title = step.tool.replaceAll("_", " ");
          return (
            <li key={`${step.tool}-${index}`} className={running ? "run" : step.ok ? "ok" : "bad"}>
              <button onClick={() => setOpen(open === index ? null : index)} aria-expanded={open === index}>
                <span className="step-dot" aria-hidden="true" />
                <strong>{title}</strong>
                <span className="step-state">{running ? "running" : step.ok ? "done" : "failed"}</span>
                <span className="step-chevron" aria-hidden="true">{open === index ? "⌄" : "›"}</span>
              </button>
              {shots?.[index] && <img className="shot" src={shots[index]} alt="" />}
              {open === index && <pre>{step.output}</pre>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function ArtifactPane({
  threadId, title, language, content, choices, activeId, onPick, onClose
}: {
  threadId?: string;
  title: string;
  language: string;
  content: string;
  choices: { id: string; title: string }[];
  activeId?: string;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const { state, dispatch } = useStore();
  const thread = threadId ? state.threads.find((item) => item.id === threadId) : undefined;
  const design = activeDesign(state.settings, thread, state.settings.orgRole);
  const library = state.settings.designSystems || [];
  const systems = designsForRole(library, state.settings.orgRole);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const asks = useRef(0);
  const inflight = useRef(false);
  const [frame, setFrame] = useState(390);
  const [brief, setBrief] = useState("");
  const [review, setReview] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const saved = activeId ? state.settings.published.find((item) => item.id === activeId)?.versions || [] : [];
  const [compareWith, setCompareWith] = useState<number | null>(null);
  const viewed = picked != null ? saved[picked] : undefined;
  const shown = viewed?.content ?? content;
  const shownLanguage = viewed?.language ?? language;
  const preview = shownLanguage === "html" || shownLanguage === "svg" || isDeckLanguage(shownLanguage);
  const deckDoc = shownLanguage === "slides"
    ? slidesPreviewDocument(shown, design)
    : shownLanguage === "mermaid"
      ? mermaidPreviewDocument(shown, mermaidUrl, design)
      : "";
  const html = shownLanguage === "html" ? previewDocument(shown, design) : deckDoc || shown;
  const compareRows = compareWith === null || !saved[compareWith]
    ? []
    : compareVersions(saved[compareWith].content, html);
  const running = threadId ? (state.runningThreadIds || []).includes(threadId) : false;
  useEffect(() => { setPicked(null); }, [activeId, content]);
  useEffect(() => {
    if (running || !activeId || !content.trim()) return;
    dispatch({ type: "remember-artifact", id: activeId, title, language, content, at: Date.now() });
  }, [running, activeId, title, language, content, dispatch]);
  useEffect(() => { asks.current = 0; }, [activeId]);
  useEffect(() => {
    if (shownLanguage !== "html") return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; id?: string; prompt?: string } | null;
      if (!data || data.type !== "modbitx-ask") return;
      if (event.source !== frameRef.current?.contentWindow) return;
      const reply = (text: string) => {
        frameRef.current?.contentWindow?.postMessage({ type: "modbitx-answer", id: data.id, text: String(text || "").slice(0, 2000) }, "*");
      };
      if (asks.current >= 8) {
        reply("This preview has used its questions.");
        return;
      }
      if (inflight.current) {
        reply("A question is already in progress.");
        return;
      }
      inflight.current = true;
      asks.current += 1;
      void askInsideArtifact(state.settings, String(data.prompt || "")).then(reply).catch(() => reply("The preview could not get an answer.")).finally(() => { inflight.current = false; });
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [shownLanguage, state.settings]);
  const writeDesign = (partial: Partial<DesignSystem>) => {
    const target = thread?.designSystemId && library.some((item) => item.id === thread.designSystemId)
      ? thread.designSystemId
      : state.settings.defaultDesignId;
    if (!library.length) {
      dispatch({ type: "settings", patch: { design: { ...design, ...partial } } });
      return;
    }
    dispatch({
      type: "settings",
      patch: { designSystems: library.map((item) => item.id === target ? { ...item, ...partial } : item) }
    });
  };
  const publishLocal = async () => {
    const id = String(activeId || "preview").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
    if (!id) {
      setReview("This preview cannot be opened as a page.");
      return;
    }
    try {
      const published = await window.modbitx?.publishArtifact(id, html);
      if (published?.url) await window.modbitx?.openLocalPage(published.url);
    } catch (error) {
      setReview(error instanceof Error ? error.message : "Could not open the local page.");
    }
  };
  const exportArtifact = async (kind: string) => {
    const stem = String(title || "artifact").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "artifact";
    // Decks and diagrams export their source: the pptx writer splits on `## `,
    // and a diagram has no other honest form than its mermaid text.
    const payload = isDeckLanguage(shownLanguage) ? shown : html;
    try {
      const written = await window.modbitx?.exportArtifact(kind, `${stem}.${kind}`, payload);
      setReview(written?.file ? `Exported ${written.kind} to ${written.file}` : "");
    } catch (error) {
      setReview(error instanceof Error ? error.message : "That export did not work.");
    }
  };
  const shareArtifact = async () => {
    const id = String(activeId || "preview").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
    if (!id) {
      setReview("This preview cannot be shared.");
      return;
    }
    try {
      const shared = await window.modbitx?.shareArtifact(id, html);
      if (!shared?.url) return;
      const links = state.settings.shares.filter((item) => item.id !== shared.id);
      dispatch({ type: "settings", patch: { shares: [{ id: shared.id, threadId: threadId || "", artifactId: activeId, title, createdAt: Date.now() }, ...links] } });
      try {
        await navigator.clipboard.writeText(shared.url);
        setReview(`Link copied: ${shared.url}`);
      } catch {
        setReview(`Link ready: ${shared.url}`);
      }
    } catch (error) {
      setReview(error instanceof Error ? error.message : "Could not create the link.");
    }
  };
  const revokeShare = async (link: { id: string }) => {
    await window.modbitx?.unshareArtifact(link.id);
    dispatch({ type: "settings", patch: { shares: state.settings.shares.filter((item) => item.id !== link.id) } });
    setReview("That link was revoked.");
  };
  const myShares = state.settings.shares.filter((link) => (activeId ? link.artifactId === activeId : link.threadId === threadId));
  const swatch = (key: "ink" | "paper" | "accent", label: string) => (
    <input aria-label={label} type="color" value={/^#[0-9a-fA-F]{6}$/.test(design[key]) ? design[key] : DEFAULT_DESIGN[key]} onChange={(event) => writeDesign({ [key]: event.target.value })} />
  );
  return (
    <aside className="artifact">
      <header>
        <strong>{title}</strong>
        {shownLanguage === "html" && <button className="ghost" onClick={() => void publishLocal()}>Open local page</button>}
        {shownLanguage === "html" && <button className="ghost" onClick={() => void shareArtifact()}>Share</button>}
        <label className="inline">Export
          <select aria-label="Export as" value="" onChange={(event) => { if (event.target.value) void exportArtifact(event.target.value); }}>
            <option value="">Export as…</option>
            <option value="docx">Word (.docx)</option>
            <option value="xlsx">Excel (.xlsx)</option>
            <option value="pptx">PowerPoint (.pptx)</option>
            <option value="pdf">PDF (.pdf)</option>
            <option value="md">Markdown (.md)</option>
            <option value="html">HTML (.html)</option>
            <option value="csv">CSV (.csv)</option>
            <option value="txt">Text (.txt)</option>
          </select>
        </label>
        {saved.length > 0 && (
          <label className="inline">Compare
            <select aria-label="Compare with a version" value={compareWith ?? ""} onChange={(event) => setCompareWith(event.target.value === "" ? null : Number(event.target.value))}>
              <option value="">Compare with…</option>
              {saved.map((version, index) => (
                <option key={version.at} value={index}>{new Date(version.at).toLocaleTimeString()} · {version.content.length} chars</option>
              ))}
            </select>
          </label>
        )}
        <button className="ghost" onClick={onClose}>Close</button>
      </header>
      {compareRows.length > 0 && (
        <div className="compare">
          <span className="dock-caption">{diffSummary(compareRows)}</span>
          <div className="compare-grid">
            {compareRows.map((row, index) => (
              <div key={index} className={`compare-row ${row.kind}`}>
                <code>{row.left || " "}</code>
                <code>{row.right || " "}</code>
              </div>
            ))}
          </div>
          <button className="ghost" onClick={() => setCompareWith(null)}>Close compare</button>
        </div>
      )}
      {myShares.length > 0 && (
        <div className="share-links">
          <span className="dock-caption">Shared links</span>
          {myShares.map((link) => (
            <div key={link.id} className="share-link">
              <code>{`/share/${link.id}`}</code>
              <button className="ghost" onClick={() => void navigator.clipboard.writeText(`http://127.0.0.1:4737/share/${link.id}`)}>Copy</button>
              <button className="ghost" onClick={() => void revokeShare(link)}>Revoke</button>
            </div>
          ))}
        </div>
      )}
      {choices.length > 1 && (
        <div className="chips">
          {choices.map((item) => (
            <button key={item.id} className={item.id === activeId ? "chip on" : "chip"} onClick={() => onPick(item.id)}>{item.title}</button>
          ))}
        </div>
      )}
      {activeId && saved.length > 0 && (
        <div className="chips">
          <select aria-label="Artifact version" value={picked == null ? "current" : String(picked)} onChange={(event) => setPicked(event.target.value === "current" ? null : Number(event.target.value))}>
            <option value="current">Current</option>
            {[...saved].map((version, index) => ({ version, index })).reverse().map(({ version, index }) => (
              <option key={`${version.at}-${index}`} value={index}>{new Date(version.at).toLocaleString()}</option>
            ))}
          </select>
          <button className="ghost" type="button" disabled={!viewed || viewed.content === content} onClick={() => {
            if (!thread || !activeId || !viewed) return;
            const parts = artifactParts(activeId);
            const message = parts ? thread.messages.find((item) => item.id === parts.messageId) : undefined;
            if (!message) return;
            const next = restoreArtifact(message.content, activeId, viewed.content);
            if (!next) return;
            dispatch({ type: "update-message", threadId: thread.id, messageId: message.id, content: next });
            setPicked(null);
          }}>Restore this version</button>
          <span className="muted">Versions stay on this Mac.</span>
        </div>
      )}
      {shownLanguage === "html" && (
        <div className="design-bar">
          <button className={frame === 390 ? "chip on" : "chip"} onClick={() => setFrame(390)}>Phone</button>
          <button className={frame === 768 ? "chip on" : "chip"} onClick={() => setFrame(768)}>Tablet</button>
          <button className={frame === 1100 ? "chip on" : "chip"} onClick={() => setFrame(1100)}>Desk</button>
          {thread && (
            <select aria-label="Design system" value={thread.designSystemId || ""} onChange={(event) => {
              const id = event.target.value;
              dispatch({ type: "patch-thread", id: thread.id, patch: { designSystemId: id || undefined, designLocked: true } });
            }}>
              <option value="">Default · {systems.find((item) => item.id === state.settings.defaultDesignId)?.name || design.name || "Paper"}</option>
              {systems.map((system) => <option key={system.id} value={system.id}>{system.name || "Untitled"}</option>)}
            </select>
          )}
          {thread?.designLocked && (
            <button className="ghost" onClick={() => dispatch({ type: "patch-thread", id: thread.id, patch: { designSystemId: undefined, designLocked: false } })}>Let Jev choose</button>
          )}
          {swatch("ink", "Ink")}
          {swatch("paper", "Paper")}
          {swatch("accent", "Accent")}
          <select aria-label="Type" value={design.font} onChange={(event) => writeDesign({ font: event.target.value as DesignSystem["font"] })}>
            <option value="sans">Sans</option>
            <option value="serif">Serif</option>
            <option value="mono">Mono</option>
          </select>
          <input aria-label="Design note" placeholder="Note" value={brief} onChange={(event) => setBrief(event.target.value)} />
          <button className="ghost" disabled={reviewing} onClick={() => {
            const request = window.modbitx?.jevDesign({ brief: brief || title, html: shown.slice(0, 6000), tokens: design });
            if (!request) {
              setReview("Open the Modbitx app to review a design.");
              return;
            }
            setReviewing(true);
            void request.then((judged) => {
              setReview(interpretDesign(judged).lines.join("\n"));
            }).catch((error: unknown) => {
              setReview(error instanceof Error ? error.message : "Review failed.");
            }).finally(() => setReviewing(false));
          }}>{reviewing ? "Reviewing…" : "Review"}</button>
        </div>
      )}
      {review && <pre className="design-note">{review}</pre>}
      {preview ? (
        <div className="artifact-stage">
          <iframe ref={frameRef} title={title} sandbox="allow-scripts" style={{ width: isDeckLanguage(shownLanguage) ? Math.max(frame, 900) : frame }} srcDoc={html} />
        </div>
      ) : (
        <pre>{shown}</pre>
      )}
    </aside>
  );
}
