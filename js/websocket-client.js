// Enhanced WebSocket Client for Chat Widget
// Advanced streaming with auto-reconnect, chunking, and queue management

class WebSocketClient {
  constructor(url, options = {}) {
    this.url = url;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 8; // Increased for mobile
    this.reconnectInterval = options.reconnectInterval || 1000;
    this.maxReconnectInterval = options.maxReconnectInterval || 45000; // Longer max interval
    this.reconnectBackoffFactor = options.reconnectBackoffFactor || 1.5; // Gentler backoff
    this.messageQueue = [];
    this.isConnecting = false;
    this.connectionId = null;
    this.listeners = {
      open: [],
      message: [],
      close: [],
      error: [],
      reconnect: [],
      streaming: [] // New event for streaming messages
    };
    
    // Message processing
    this.messageBuffer = new Map(); // Use Map for better performance
    this.isProcessingQueue = false;
    this.lastHeartbeat = Date.now();
    this.heartbeatInterval = null;
    this.connectionTimeout = null;
    
    // Mobile-specific optimizations
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.networkState = this.getNetworkState();
    
    this.initNetworkMonitoring();
    this.connect();
  }

  connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    this.connectionId = 'conn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    
    // Connection timeout for mobile networks
    this.connectionTimeout = setTimeout(() => {
      if (this.isConnecting) {
        console.warn('WebSocket connection timeout');
        this.handleConnectionError();
      }
    }, this.isMobile ? 15000 : 10000);
    
    try {
      // Add connection parameters for better server handling
      const wsUrl = new URL(this.url);
      wsUrl.searchParams.set('connection_id', this.connectionId);
      wsUrl.searchParams.set('client_type', this.isMobile ? 'mobile' : 'desktop');
      wsUrl.searchParams.set('network_type', this.networkState.type);
      
      this.ws = new WebSocket(wsUrl.toString());
      this.setupEventListeners();
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.handleConnectionError();
    }
  }

  setupEventListeners() {
    this.ws.onopen = (event) => {
      console.log('WebSocket connected successfully, connection ID:', this.connectionId);
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.reconnectInterval = 1000;
      
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      
      this.startHeartbeat();
      this.processMessageQueue();
      this.emit('open', { ...event, connectionId: this.connectionId });
    };

    this.ws.onmessage = (event) => {
      this.lastHeartbeat = Date.now();
      this.handleMessage(event);
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason, 'Connection ID:', this.connectionId);
      this.isConnecting = false;
      this.stopHeartbeat();
      
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      
      this.emit('close', event);
      
      // More intelligent reconnection logic
      if (!event.wasClean && this.shouldReconnect(event)) {
        this.scheduleReconnect(event);
      }
    };

    this.ws.onerror = (event) => {
      console.error('WebSocket error:', event, 'Connection ID:', this.connectionId);
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
    
    if (!this.messageBuffer.has(chunkId)) {
      this.messageBuffer.set(chunkId, {
        chunks: new Array(data.total_chunks || 0),
        total: data.total_chunks || 0,
        received: 0,
        timestamp: Date.now()
      });
    }

    const buffer = this.messageBuffer.get(chunkId);
    buffer.chunks[data.chunk_index] = data.chunk;
    buffer.received++;
    
    // Emit streaming event for real-time display
    this.emit('streaming', {
      chunk_id: chunkId,
      chunk: data.chunk,
      chunk_index: data.chunk_index,
      progress: buffer.received / buffer.total
    });

    // If we have all chunks, reconstruct the message
    if (buffer.received === buffer.total) {
      const completeMessage = buffer.chunks.join('');
      this.messageBuffer.delete(chunkId);
      
      try {
        const parsedMessage = JSON.parse(completeMessage);
        parsedMessage._chunk_info = {
          chunk_id: chunkId,
          total_chunks: buffer.total,
          reassembly_time: Date.now() - buffer.timestamp
        };
        this.emit('message', parsedMessage);
      } catch (error) {
        console.error('Error parsing complete chunked message:', error);
        // Still emit partial data for debugging
        this.emit('message', { 
          type: 'error', 
          error: 'chunk_parsing_failed', 
          raw_data: completeMessage.substring(0, 500) 
        });
      }
    }
    
    // Clean up old buffers to prevent memory leaks
    this.cleanupOldBuffers();
  }
  
  cleanupOldBuffers() {
    const now = Date.now();
    const maxAge = 30000; // 30 seconds
    
    for (const [chunkId, buffer] of this.messageBuffer.entries()) {
      if (now - buffer.timestamp > maxAge) {
        console.warn('Cleaning up stale message buffer:', chunkId);
        this.messageBuffer.delete(chunkId);
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

  shouldReconnect(closeEvent) {
    // Don't reconnect if explicitly closed by client
    if (closeEvent && closeEvent.code === 1000) {
      return false;
    }
    
    // Don't reconnect if max attempts reached
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return false;
    }
    
    // Don't reconnect if page is hidden (mobile battery optimization)
    if (document.hidden && this.isMobile) {
      console.log('Page hidden, skipping reconnect');
      return false;
    }
    
    // Check network connectivity
    if (!navigator.onLine) {
      console.log('No network connectivity, delaying reconnect');
      // Listen for online event
      const reconnectWhenOnline = () => {
        window.removeEventListener('online', reconnectWhenOnline);
        setTimeout(() => this.connect(), 1000);
      };
      window.addEventListener('online', reconnectWhenOnline);
      return false;
    }
    
    return true;
  }

  scheduleReconnect(closeEvent) {
    if (!this.shouldReconnect(closeEvent)) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.emit('error', { type: 'max_reconnects_reached', attempts: this.reconnectAttempts });
      }
      return;
    }

    // Adaptive delay based on network conditions
    let baseDelay = this.reconnectInterval * Math.pow(this.reconnectBackoffFactor, this.reconnectAttempts);
    
    // Longer delays for mobile or poor network conditions
    if (this.isMobile) {
      baseDelay *= 1.5;
    }
    
    if (this.networkState.effectiveType === 'slow-2g' || this.networkState.effectiveType === '2g') {
      baseDelay *= 2;
    }
    
    const delay = Math.min(baseDelay, this.maxReconnectInterval);

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`, 
                'Network:', this.networkState.effectiveType);
    
    setTimeout(() => {
      // Double-check conditions before reconnecting
      if (document.hidden && this.isMobile) {
        console.log('Page still hidden, postponing reconnect');
        this.scheduleReconnect(closeEvent);
        return;
      }
      
      this.reconnectAttempts++;
      this.emit('reconnect', { 
        attempt: this.reconnectAttempts, 
        delay: delay,
        networkState: this.networkState
      });
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

  initNetworkMonitoring() {
    // Monitor network changes for mobile
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', () => {
        const newState = this.getNetworkState();
        console.log('Network state changed:', this.networkState, '->', newState);
        this.networkState = newState;
        
        // Reconnect if network improved
        if (newState.effectiveType !== this.networkState.effectiveType && 
            this.getConnectionState() === 'disconnected') {
          setTimeout(() => this.connect(), 1000);
        }
      });
    }
    
    // Monitor page visibility for mobile background handling
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('Page hidden, reducing WebSocket activity');
      } else {
        console.log('Page visible, resuming WebSocket activity');
        if (this.getConnectionState() === 'disconnected') {
          setTimeout(() => this.connect(), 500);
        }
      }
    });
  }
  
  getNetworkState() {
    if ('connection' in navigator) {
      const conn = navigator.connection;
      return {
        type: conn.type || 'unknown',
        effectiveType: conn.effectiveType || 'unknown',
        downlink: conn.downlink || 0,
        rtt: conn.rtt || 0
      };
    }
    return { type: 'unknown', effectiveType: 'unknown', downlink: 0, rtt: 0 };
  }

  close() {
    this.stopHeartbeat();
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
    }
    this.messageQueue = [];
    this.messageBuffer.clear();
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