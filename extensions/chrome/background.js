async function code() {
  const stored = await chrome.storage.local.get("code");
  return stored.code || "";
}

async function poll() {
  const pairing = await code();
  if (!pairing) return;
  const response = await fetch(`http://127.0.0.1:4737/v1/chrome/next?code=${encodeURIComponent(pairing)}`);
  if (!response.ok) return;
  const job = await response.json();
  if (!job) return;
  let page = { error: "No open tab." };
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      page = { error: "No open tab." };
    } else {
      const [injected] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (action) => {
          if (action.type === "read") return { url: location.href, title: document.title, text: document.body.innerText.slice(0, 8000) };
          const el = document.querySelector(action.selector || "input, textarea");
          if (!el) return { error: "No element" };
          if (action.type === "fill") {
            el.focus();
            el.value = action.text || "";
            el.dispatchEvent(new Event("input", { bubbles: true }));
          } else el.click();
          return { ok: true, text: (el.innerText || el.value || "").slice(0, 300) };
        },
        args: [job]
      });
      page = injected?.result || { error: "Chrome did not return a page." };
    }
  } catch (error) {
    page = { error: error instanceof Error ? error.message : "Chrome could not read this page. Allow this site from the Modbitx extension." };
  }
  await fetch("http://127.0.0.1:4737/v1/handoff?code=" + encodeURIComponent(pairing), {
    method: "POST",
    body: JSON.stringify({ source: "chrome", page })
  });
}

if (chrome.alarms) {
  chrome.runtime.onInstalled.addListener(() => chrome.alarms.create("modbitx", { periodInMinutes: 1 }));
  chrome.alarms.onAlarm.addListener(() => { poll().catch(() => {}); });
}
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "save-code") chrome.storage.local.set({ code: message.code });
  if (message.type === "send-page") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) return;
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => ({ url: location.href, title: document.title, text: document.body.innerText.slice(0, 8000) })
      });
      const pairing = await code();
      await fetch(`http://127.0.0.1:4737/v1/handoff?code=${encodeURIComponent(pairing)}`, {
        method: "POST",
        body: JSON.stringify({ text: `Page from Chrome: ${result.result.title}\n${result.result.url}\n\n${result.result.text}` })
      });
      sendResponse({ ok: true });
    });
    return true;
  }
  return false;
});
