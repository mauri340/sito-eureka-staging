// /js/network/ws-client.js

let ws = null;
let listeners = [];

export function connectWebSocket(url = 'ws://localhost:3002') {
  ws = new WebSocket(url);
  ws.onmessage = (event) => {
    listeners.forEach(fn => fn(event.data));
  };
  ws.onopen = () => console.log('WebSocket connesso');
  ws.onerror = (e) => console.error('WebSocket errore', e);
  ws.onclose = () => console.log('WebSocket chiuso');
}

export function sendMessage(msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(msg);
  }
}

export function addMessageListener(fn) {
  listeners.push(fn);
}