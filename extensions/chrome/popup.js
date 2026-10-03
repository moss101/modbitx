document.getElementById("save").onclick = () => {
  chrome.runtime.sendMessage({ type: "save-code", code: document.getElementById("code").value.trim() });
};
let allowedOrigin = "";
const allowButton = document.getElementById("allow");
allowButton.disabled = true;
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  try {
    const url = new URL((tabs[0] && tabs[0].url) || "");
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      document.getElementById("status").textContent = "This page cannot be allowed.";
      return;
    }
    allowedOrigin = url.origin + "/*";
    allowButton.disabled = false;
  } catch (error) {
    document.getElementById("status").textContent = "This page cannot be allowed.";
  }
});
allowButton.onclick = () => {
  const status = document.getElementById("status");
  if (!allowedOrigin) {
    status.textContent = "This page cannot be allowed.";
    return;
  }
  chrome.permissions.request({ origins: [allowedOrigin] }, (granted) => {
    status.textContent = granted ? "This site can be read." : "This site was not allowed.";
  });
};
document.getElementById("send").onclick = () => {
  chrome.runtime.sendMessage({ type: "send-page" });
};
