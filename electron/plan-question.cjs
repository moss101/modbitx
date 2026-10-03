const NEEDS_PLAN = {
  type: "noul",
  instructions: "Does `message` need a written implementation plan before any file changes? Answer yes when there is more than one reasonable approach, the work likely spans several files, or the requested change is not already specified.",
  criteria: {
    true: "A new feature, a redesign, an unclear bug, or a change whose shape is still a choice.",
    false: "A typo, a one-line fix, a question, or instructions that already name the file and the exact change."
  }
};

function prepareQuestions(payload) {
  const mode = String(payload?.mode || "chat");
  const skills = [];
  const criteria = {
    none: "No listed skill is a better fit than a general reply."
  };
  for (const skill of Array.isArray(payload?.skills) ? payload.skills.slice(0, 12) : []) {
    const id = String(skill?.id || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 32);
    if (!id || id === "none" || criteria[id]) continue;
    criteria[id] = `${String(skill?.name || id).slice(0, 40)}. ${String(skill?.blurb || "").slice(0, 160)}`.trim();
    skills.push({ id, name: String(skill?.name || id).slice(0, 40) });
  }
  const questions = {};
  if (mode === "code") questions.needs_plan = NEEDS_PLAN;
  if (skills.length >= 2) {
    questions.skill = {
      type: "choice",
      instructions: "Which one enabled skill should lead the reply to `message`? Choose none when the message does not need a listed skill.",
      criteria
    };
  }
  return {
    questions,
    state: { message: String(payload?.message || "").slice(0, 4000), surface: mode, skills }
  };
}

module.exports = { NEEDS_PLAN, prepareQuestions };
