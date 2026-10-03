const STATUS = {
  type: "choice",
  instructions: {
    question: "Which label fits this Code session right now?",
    focus: "Use the latest messages, tool results, and plan status in the state. Do not assume work that is not written there."
  },
  criteria: {
    blocked: {
      what: "The session cannot continue until the person answers, approves, or fixes a failed tool.",
      not_for: "A finished task, or work that is still proceeding without a question.",
      examples: [
        "A tool failed and the reply asks what to do",
        "The plan is waiting for approval",
        "The assistant asked a question and stopped"
      ]
    },
    ready: {
      what: "The requested change is in place and waiting for the person to review it.",
      not_for: "Work that is still incomplete, or a session that already confirmed it was finished.",
      examples: [
        "The plan status is review",
        "A diff was written and the reply says it is ready to look at"
      ]
    },
    done: {
      what: "The session finished the request and nothing is left for the person to approve.",
      not_for: "A draft plan, a failed tool, or an open question.",
      examples: ["The last reply says the task is complete and the last tools succeeded"]
    },
    working: {
      what: "The session is still in progress, or the transcript does not support blocked, ready, or done.",
      not_for: "A clear stop for review, approval, or completion."
    }
  }
};

function clipStep(step) {
  return {
    tool: String(step?.tool || "").slice(0, 40),
    ok: step?.ok === true,
    output: String(step?.output || "").slice(0, 180)
  };
}

function prepareSession(payload) {
  const messages = Array.isArray(payload?.messages) ? payload.messages.slice(-6).map((message) => ({
    role: String(message?.role || "").slice(0, 16),
    text: String(message?.text || message?.content || "").slice(0, 500),
    steps: Array.isArray(message?.steps) ? message.steps.slice(-6).map(clipStep) : []
  })) : [];
  return {
    state: {
      title: String(payload?.title || "").slice(0, 80),
      permission: String(payload?.permission || "ask").slice(0, 20),
      planStatus: String(payload?.planStatus || "").slice(0, 20),
      plan: String(payload?.plan || "").slice(0, 800),
      messages
    },
    questions: { status: STATUS }
  };
}

module.exports = { STATUS, prepareSession };
