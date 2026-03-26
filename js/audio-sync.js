// Advanced Audio Synchronization System
// TTS with chunking, typing animation sync, and queue management

class AudioSyncManager {
  constructor() {
    this.audioQueue = [];
    this.textQueue = [];
    this.currentAudio = null;
    this.audioContext = null;
    this.isPlaying = false;
    this.isTyping = false;
    this.typingSpeed = 18; // milliseconds per character
    this.processedMessages = new Set();
    
    // Audio processing
    this.audioStartTime = null;
    this.totalAudioDuration = 0;
    this.currentSource = null;
    
    this.initAudioContext();
  }

  async initAudioContext() {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('AudioContext initialized, state:', this.audioContext.state);
        
        if (this.audioContext.state === 'suspended') {
          // Wait for user interaction to resume
          document.addEventListener('click', this.resumeAudioContext.bind(this), { once: true });
          document.addEventListener('touchstart', this.resumeAudioContext.bind(this), { once: true });
        }
      }
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
    }
  }

  async resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('AudioContext resumed successfully');
      } catch (error) {
        console.error('Failed to resume AudioContext:', error);
      }
    }
  }

  // Queue text message for typing animation
  queueText(messageId, text, isHTML = false) {
    this.textQueue.push({
      id: messageId,
      text: text,
      isHTML: isHTML,
      timestamp: Date.now()
    });
    
    console.log('Text queued:', messageId, text.substring(0, 50) + '...');
    
    // If no audio is playing, start typing immediately
    if (!this.isPlaying && !this.isTyping) {
      this.processTextQueue();
    }
  }

  // Queue audio for synchronized playback
  queueAudio(audioBase64, messageId = null) {
    try {
      const blob = this.base64ToBlob(audioBase64);
      if (blob) {
        this.audioQueue.push({
          blob: blob,
          messageId: messageId,
          timestamp: Date.now()
        });
        
        console.log('Audio queued, queue length:', this.audioQueue.length);
        
        if (!this.isPlaying) {
          this.processAudioQueue();
        }
      }
    } catch (error) {
      console.error('Failed to queue audio:', error);
    }
  }

  base64ToBlob(base64, contentType = 'audio/mpeg') {
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new Blob([bytes], { type: contentType });
    } catch (error) {
      console.error('Base64 to blob conversion failed:', error);
      return null;
    }
  }

  async processAudioQueue() {
    if (this.isPlaying || this.audioQueue.length === 0) {
      return;
    }

    await this.initAudioContext();
    if (!this.audioContext) {
      console.error('AudioContext not available');
      return;
    }

    this.isPlaying = true;
    let isFirstChunk = true;

    while (this.audioQueue.length > 0) {
      const audioItem = this.audioQueue.shift();
      
      try {
        await this.playAudioBlob(audioItem.blob, isFirstChunk);
        isFirstChunk = false;
      } catch (error) {
        console.error('Failed to play audio chunk:', error);
        break;
      }
    }

    this.isPlaying = false;
    this.currentSource = null;
    
    // Process any remaining text after audio completes
    if (!this.isTyping && this.textQueue.length > 0) {
      this.processTextQueue();
    }
  }

  async playAudioBlob(blob, isFirstChunk = false) {
    return new Promise(async (resolve) => {
      try {
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }

        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext.destination);
        
        // Start typing animation with first audio chunk
        if (isFirstChunk && this.textQueue.length > 0) {
          setTimeout(() => {
            this.processTextQueue();
          }, 100); // Small delay to sync with audio start
        }

        source.onended = () => {
          resolve();
        };

        source.start(this.audioContext.currentTime + 0.01);
        this.currentSource = source;
        
        console.log('Playing audio chunk, duration:', audioBuffer.duration);
        
      } catch (error) {
        console.error('Audio playback error:', error);
        resolve();
      }
    });
  }

  processTextQueue() {
    if (this.isTyping || this.textQueue.length === 0) {
      return;
    }

    const textItem = this.textQueue.shift();
    
    if (this.processedMessages.has(textItem.id)) {
      console.log('Message already processed, skipping:', textItem.id);
      return;
    }

    this.isTyping = true;
    this.processedMessages.add(textItem.id);

    if (textItem.isHTML) {
      this.renderHTMLMessage(textItem.id, textItem.text);
    } else {
      this.typeMessage(textItem.id, textItem.text);
    }
  }

  renderHTMLMessage(messageId, htmlContent) {
    const messageElement = document.getElementById(messageId);
    if (messageElement && messageElement.querySelector('.ew-bubble')) {
      const bubble = messageElement.querySelector('.ew-bubble');
      bubble.innerHTML = htmlContent;
      this.scrollToBottom();
    }
    
    this.isTyping = false;
    
    // Continue with next message
    if (this.textQueue.length > 0) {
      setTimeout(() => this.processTextQueue(), 100);
    }
  }

  typeMessage(messageId, text) {
    const messageElement = document.getElementById(messageId);
    if (!messageElement || !messageElement.querySelector('.ew-bubble')) {
      this.isTyping = false;
      return;
    }

    const bubble = messageElement.querySelector('.ew-bubble');
    let currentIndex = 0;

    const typeNextChar = () => {
      if (currentIndex < text.length) {
        bubble.textContent = text.slice(0, currentIndex + 1);
        currentIndex++;
        this.scrollToBottom();
        setTimeout(typeNextChar, this.typingSpeed);
      } else {
        this.isTyping = false;
        // Continue with next message after small delay
        if (this.textQueue.length > 0) {
          setTimeout(() => this.processTextQueue(), 200);
        }
      }
    };

    typeNextChar();
  }

  // Legacy audio playback for existing base64 system
  playBase64Audio(base64) {
    try {
      this.stopCurrentAudio();
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      
      this.currentAudio = new Audio(url);
      this.currentAudio.onended = () => {
        URL.revokeObjectURL(url);
        this.currentAudio = null;
      };
      this.currentAudio.onerror = () => {
        URL.revokeObjectURL(url);
        this.currentAudio = null;
      };
      
      this.currentAudio.play().catch(console.warn);
    } catch (error) {
      console.warn('Legacy audio playback error:', error);
    }
  }

  stopCurrentAudio() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = '';
      this.currentAudio = null;
    }
    
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }
  }

  clearQueues() {
    this.audioQueue = [];
    this.textQueue = [];
    this.processedMessages.clear();
    this.isTyping = false;
    this.isPlaying = false;
  }

  scrollToBottom() {
    const messagesContainer = document.getElementById('ew-messages');
    if (messagesContainer) {
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 50);
    }
  }

  // Get current status for debugging
  getStatus() {
    return {
      isPlaying: this.isPlaying,
      isTyping: this.isTyping,
      audioQueueLength: this.audioQueue.length,
      textQueueLength: this.textQueue.length,
      processedMessagesCount: this.processedMessages.size,
      audioContextState: this.audioContext ? this.audioContext.state : 'not initialized'
    };
  }
}

// Export for use in chat widget
window.AudioSyncManager = AudioSyncManager;