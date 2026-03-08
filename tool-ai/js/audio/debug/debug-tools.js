// /js/debug/debug-tools.js

export function downloadBlob(blob, filename = 'audio.mp3') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function showDebugInfo(info) {
  alert(JSON.stringify(info, null, 2));
}
