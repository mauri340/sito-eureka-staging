// /js/audio/audio-player.js
let currentAudio = null;

export function stopCurrentAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
}

export async function playAudioBlob(blob) {
  stopCurrentAudio();
  const url = URL.createObjectURL(blob);
  currentAudio = new Audio(url);
  return new Promise(resolve => {
    currentAudio.onended = () => {
      URL.revokeObjectURL(url);
      currentAudio = null;
      resolve();
    };
    currentAudio.onerror = () => {
      URL.revokeObjectURL(url);
      currentAudio = null;
      resolve();
    };
    currentAudio.play();
  });
}

// Se vuoi gestire una coda di audio (es: più risposte concatenate):
export async function playAudioFromQueue(audioBlobs) {
  for (const blob of audioBlobs) {
    await playAudioBlob(blob);
  }
}
