// src/lib/sound.ts
// Centralized SCADA Audible Alarm Manager for HydroNode.
// Plays /alert.mp3 on leak detection and simulation events.

let audioInstance: HTMLAudioElement | null = null;
let isMutedState = false;
let isAudioUnlocked = false;

// Initialize mute state from localStorage if available
if (typeof window !== "undefined") {
  try {
    isMutedState = localStorage.getItem("hydronode_audio_muted") === "true";
  } catch (e) {
    console.error("Failed to read audio settings from localStorage", e);
  }
}

function getAudio(): HTMLAudioElement {
  if (!audioInstance) {
    audioInstance = new Audio("/alert.mp3");
    audioInstance.preload = "auto";
    // Fallback if case sensitivity varies on some servers
    audioInstance.onerror = () => {
      if (audioInstance && audioInstance.src.endsWith("/alert.mp3")) {
        audioInstance.src = "/ALERT.mp3";
      }
    };
  }
  return audioInstance;
}

/**
 * Pre-unlocks audio context upon the first user interaction (click, keypress, tap).
 * Prevents browser "play() failed because the user didn't interact with the document first".
 */
export function unlockAudio() {
  if (isAudioUnlocked || typeof window === "undefined") return;
  const audio = getAudio();
  audio.volume = 0.01;
  const p = audio.play();
  if (p !== undefined) {
    p.then(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 0.9;
      isAudioUnlocked = true;
    }).catch(() => {
      // Ignored until real interaction occurs
    });
  }
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
      window.dispatchEvent(new CustomEvent("hydronode_audio_muted_change", { detail: isMutedState }));
    } catch (e) {
      console.error(e);
    }
  }
  if (isMutedState) {
    stopAlertSound();
  }
  return isMutedState;
}

/**
 * Immediately stop the audible alarm if playing.
 */
export function stopAlertSound() {
  if (audioInstance) {
    audioInstance.pause();
    audioInstance.currentTime = 0;
  }
}

/**
 * Play the /alert.mp3 audible alarm.
 * @param force If true, plays even if muted (e.g. for "Test Sound" button)
 */
export function playAlertSound(options?: { force?: boolean }): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  if (!options?.force && isMutedState) {
    return Promise.resolve();
  }

  try {
    const audio = getAudio();
    audio.currentTime = 0;
    audio.volume = 0.9;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      return playPromise.catch((err) => {
        console.warn("Audio playback delayed by browser policy until operator interacts with dashboard:", err);
      });
    }
  } catch (err) {
    console.error("Audio playback error:", err);
  }

  return Promise.resolve();
}
