// Enhanced WebSocket Client for Chat Widget
// Advanced streaming with auto-reconnect, chunking, and queue management

class WebSocketClient {
  constructor(url, options = {}) {
    this.url = url;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectInterval = options.reconnectInterval || 1000;
    this.maxReconnectInterval = options.maxReconnectInterval || 30000;
    this.reconnectBackoffFactor = options.reconnectBackoffFactor || 2;
    this.messageQueue = [];
    this.isConnecting = false;
    this.listeners = {
      open: [],
      message: [],
      close: [],
      error: [],
      reconnect: []
    };
    
    // Message processing
    this.messageBuffer = [];
    this.isProcessingQueue = false;
    this.lastHeartbeat = Date.now();
    this.heartbeatInterval = null;
    
    this.connect();
  }

  connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    
    try {
      this.ws = new WebSocket(this.url);
      this.setupEventListeners();
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.handleConnectionError();
    }
  }

  setupEventListeners() {
    this.ws.onopen = (event) => {
      console.log('WebSocket connected successfully');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.reconnectInterval = 1000;
      this.startHeartbeat();
      this.processMessageQueue();
      this.emit('open', event);
    };

    this.ws.onmessage = (event) => {
      this.lastHeartbeat = Date.now();
      this.handleMessage(event);
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      this.isConnecting = false;
      this.stopHeartbeat();
      this.emit('close', event);
      
      if (!event.wasClean && this.shouldReconnect()) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      this.emit('error', event);
      this.handleConnectionError();
    };
  }

  handleMessage(event) {
    try {
      // Handle both text and chunked messages
      let data;
      if (typeof event.data === 'string') {
        data = JSON.parse(event.data);
      } else {
        // Handle binary data if needed
        data = event.data;
      }

      // Check for chunked message
      if (data.chunk && data.chunk_id) {
        this.handleChunkedMessage(data);
      } else {
        this.emit('message', data);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      this.emit('message', { type: 'error', error: 'Message parsing failed' });
    }
  }

  handleChunkedMessage(data) {
    const chunkId = data.chunk_id;
    
    if (!this.messageBuffer[chunkId]) {
      this.messageBuffer[chunkId] = {
        chunks: [],
        total: data.total_chunks || 0,
        received: 0
      };
    }

    const buffer = this.messageBuffer[chunkId];
    buffer.chunks[data.chunk_index] = data.chunk;
    buffer.received++;

    // If we have all chunks, reconstruct the message
    if (buffer.received === buffer.total) {
      const completeMessage = buffer.chunks.join('');
      delete this.messageBuffer[chunkId];
      
      try {
        const parsedMessage = JSON.parse(completeMessage);
        this.emit('message', parsedMessage);
      } catch (error) {
        console.error('Error parsing complete chunked message:', error);
      }
    }
  }

  send(message) {
    if (this.isConnected()) {
      try {
        const messageString = typeof message === 'string' ? message : JSON.stringify(message);
        this.ws.send(messageString);
        return true;
      } catch (error) {
        console.error('Error sending message:', error);
        this.queueMessage(message);
        return false;
      }
    } else {
      this.queueMessage(message);
      return false;
    }
  }

  queueMessage(message) {
    this.messageQueue.push(message);
    if (!this.isConnected() && !this.isConnecting) {
      this.connect();
    }
  }

  processMessageQueue() {
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;
    
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
    
    this.isProcessingQueue = false;
  }

  shouldReconnect() {
    return this.reconnectAttempts < this.maxReconnectAttempts;
  }

  scheduleReconnect() {
    if (!this.shouldReconnect()) {
      console.error('Max reconnection attempts reached');
      this.emit('error', { type: 'max_reconnects_reached' });
      return;
    }

    const delay = Math.min(
      this.reconnectInterval * Math.pow(this.reconnectBackoffFactor, this.reconnectAttempts),
      this.maxReconnectInterval
    );

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.reconnectAttempts++;
      this.emit('reconnect', { attempt: this.reconnectAttempts });
      this.connect();
    }, delay);
  }

  handleConnectionError() {
    if (this.ws) {
      this.ws.close();
    }
    this.isConnecting = false;
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (Date.now() - this.lastHeartbeat > 30000) { // 30 seconds timeout
        console.warn('WebSocket heartbeat timeout, reconnecting...');
        this.ws.close();
      } else if (this.isConnected()) {
        this.send({ type: 'ping' });
      }
    }, 10000); // Check every 10 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  on(event, listener) {
    if (this.listeners[event]) {
      this.listeners[event].push(listener);
    }
  }

  off(event, listener) {
    if (this.listeners[event]) {
      const index = this.listeners[event].indexOf(listener);
      if (index !== -1) {
        this.listeners[event].splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  close() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
    }
    this.messageQueue = [];
    this.messageBuffer = [];
  }

  getConnectionState() {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'disconnected';
      default: return 'unknown';
    }
  }
}

// Export for use in chat widget
window.WebSocketClient = WebSocketClient;