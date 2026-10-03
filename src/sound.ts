let chime: HTMLAudioElement | null = null;
let ding: HTMLAudioElement | null = null;

/** Plays the original approval chime. Fails silently where audio is unavailable. */
export function playApprovalChime(): void {
  try {
    if (!chime) chime = new Audio("sfx/approval-chime.wav");
    chime.currentTime = 0;
    void chime.play().catch(() => { /* autoplay refused; the card is still on screen */ });
  } catch {
    /* no Audio in this window */
  }
}

/** Plays the original notification ding that pairs with a system notice. */
export function playNotificationDing(): void {
  try {
    if (!ding) ding = new Audio("sfx/notification.wav");
    ding.currentTime = 0;
    void ding.play().catch(() => { /* autoplay refused; the notice is still posted */ });
  } catch {
    /* no Audio in this window */
  }
}
