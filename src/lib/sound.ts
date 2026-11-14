// src/lib/sound.ts
// Industrial SCADA Audible Alarm Siren Manager for HydroNode.
// Plays /alert.mp3 on active leak conditions and handles browser autoplay policies reliably.

let audioInstance: HTMLAudioElement | null = null;
let isMutedState = false;
let isAlarmActiveState = false;
let pendingAlarmPlayback = false;

// Initialize mute state from localStorage
if (typeof window !== "undefined") {
  try {
    isMutedState = localStorage.getItem("hydronode_audio_muted") === "true";
  } catch (e) {
    console.error("Failed to read audio settings from localStorage", e);
  }
}

function getAudio(): HTMLAudioElement {
  if (!audioInstance && typeof window !== "undefined") {
    audioInstance = new Audio("/alert.mp3");
    audioInstance.preload = "auto";
    audioInstance.loop = true; // Continuous alarm siren until leak resolved or muted
    audioInstance.volume = 0.9;

    audioInstance.onerror = () => {
      if (audioInstance && audioInstance.src.endsWith("/alert.mp3")) {
        audioInstance.src = "/ALERT.mp3";
      }
    };
  }
  return audioInstance!;
}

// Global user gesture listener: if an alarm was blocked by browser autoplay,
// start it the very instant the operator clicks anywhere on the document.
if (typeof window !== "undefined") {
  const handleUserGesture = () => {
    if (pendingAlarmPlayback && isAlarmActiveState && !isMutedState) {
      pendingAlarmPlayback = false;
      const audio = getAudio();
      audio.currentTime = 0;
      audio.play().catch((err) => {
        console.warn("User gesture play failed:", err);
      });
    }
  };

  window.addEventListener("pointerdown", handleUserGesture, { passive: true });
  window.addEventListener("click", handleUserGesture, { passive: true });
  window.addEventListener("keydown", handleUserGesture, { passive: true });
}

/**
 * Activate or deactivate the SCADA leak alarm siren.
 * When active=true, /alert.mp3 will play (and loop) until active=false or muted.
 * If blocked by browser autoplay, it will immediately sound upon the first click anywhere.
 */
export function setAlarmActive(active: boolean) {
  if (typeof window === "undefined") return;
  isAlarmActiveState = active;

  if (active) {
    if (isMutedState) return;
    try {
      const audio = getAudio();
      audio.currentTime = 0;
      audio.loop = true;
      audio.volume = 0.9;
      const p = audio.play();
      if (p !== undefined) {
        p.then(() => {
          pendingAlarmPlayback = false;
        }).catch((err) => {
          // Autoplay policy prevented playback until user gesture
          pendingAlarmPlayback = true;
          console.warn("Alarm siren armed — waiting for operator click to sound:", err.message);
        });
      }
    } catch (e) {
      pendingAlarmPlayback = true;
    }
  } else {
    pendingAlarmPlayback = false;
    stopAlertSound();
  }
}

/**
 * Returns true if an audible alarm is currently flagged active.
 */
export function isAlarmActive(): boolean {
  return isAlarmActiveState;
}

/**
 * Check if the audible alarm is muted.
 */
export function isAlertSoundMuted(): boolean {
  if (typeof window === "undefined") return false;
  return isMutedState;
}

/**
 * Toggle the audible alarm mute state.
 */
export function toggleAlertSoundMuted(): boolean {
  isMutedState = !isMutedState;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("hydronode_audio_muted", isMutedState ? "true" : "false");
      window.dispatchEvent(
        new CustomEvent("hydronode_audio_muted_change", { detail: isMutedState })
      );
    } catch (e) {
      console.error(e);
    }
  }

  if (isMutedState) {
    stopAlertSound();
  } else if (isAlarmActiveState) {
    setAlarmActive(true);
  }

  return isMutedState;
}

/**
 * Immediately stop and rewind the audible alarm.
 */
export function stopAlertSound() {
  if (audioInstance) {
    audioInstance.pause();
    audioInstance.currentTime = 0;
  }
}

/**
 * Pre-unlock audio context on user interaction.
 */
export function unlockAudio() {
  if (typeof window === "undefined") return;
  const audio = getAudio();
  if (isAlarmActiveState && !isMutedState) {
    setAlarmActive(true);
  }
}

/**
 * Play a one-shot burst of /alert.mp3 (e.g. for "Test Sound" button).
 */
export function playAlertSound(options?: { force?: boolean }): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!options?.force && isMutedState) return Promise.resolve();

  try {
    const audio = getAudio();
    audio.currentTime = 0;
    audio.loop = false; // single test playback
    audio.volume = 0.9;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      return playPromise.catch((err) => {
        console.warn("Audio playback delayed by browser policy:", err);
      });
    }
  } catch (err) {
    console.error("Audio playback error:", err);
  }

  return Promise.resolve();
}
