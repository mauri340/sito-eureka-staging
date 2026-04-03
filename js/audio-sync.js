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
          // Mobile-specific audio unlock strategies
          this.setupMobileAudioUnlock();
        }
      }
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
      this.audioContext = null;
    }
  }

  setupMobileAudioUnlock() {
    const unlockAudio = async () => {
      try {
        await this.audioContext.resume();
        console.log('AudioContext unlocked on user interaction');
        
        // Play silent audio to fully unlock on iOS
        if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          await this.playSilentAudio();
        }
        
        // Remove event listeners after successful unlock
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
        
      } catch (error) {
        console.error('Failed to unlock AudioContext:', error);
      }
    };

    // Multiple event listeners for better mobile compatibility
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });
    document.addEventListener('touchend', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });
    
    // For chat widget specifically
    const chatToggle = document.getElementById('ew-chat-toggle');
    const micButton = document.getElementById('ew-mic');
    const sendButton = document.getElementById('ew-send');
    
    if (chatToggle) chatToggle.addEventListener('click', unlockAudio, { once: true });
    if (micButton) micButton.addEventListener('click', unlockAudio, { once: true });
    if (sendButton) sendButton.addEventListener('click', unlockAudio, { once: true });
  }

  async playSilentAudio() {
    if (!this.audioContext) return;
    
    try {
      // Create a silent 100ms buffer
      const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.1, this.audioContext.sampleRate);
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start();
      
      console.log('Silent audio played for iOS unlock');
    } catch (error) {
      console.warn('Failed to play silent audio:', error);
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
        // Ensure AudioContext is ready
        if (!this.audioContext) {
          await this.initAudioContext();
        }
        
        if (this.audioContext && this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }

        // Fallback to HTML5 Audio for mobile compatibility
        if (!this.audioContext || this.shouldUseFallbackAudio()) {
          return this.playAudioBlobFallback(blob, isFirstChunk, resolve);
        }

        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        
        // Apply mobile-specific audio settings
        if (this.isMobile()) {
          const gainNode = this.audioContext.createGain();
          gainNode.gain.value = 0.8; // Slightly lower volume for mobile
          source.connect(gainNode);
          gainNode.connect(this.audioContext.destination);
        } else {
          source.connect(this.audioContext.destination);
        }
        
        // Start typing animation with first audio chunk
        if (isFirstChunk && this.textQueue.length > 0) {
          setTimeout(() => {
            this.processTextQueue();
          }, 150); // Slightly longer delay for mobile
        }

        source.onended = () => {
          resolve();
        };

        source.start(this.audioContext.currentTime + 0.01);
        this.currentSource = source;
        
        console.log('Playing audio chunk (WebAudio), duration:', audioBuffer.duration);
        
      } catch (error) {
        console.error('WebAudio playback failed, using fallback:', error);
        this.playAudioBlobFallback(blob, isFirstChunk, resolve);
      }
    });
  }

  playAudioBlobFallback(blob, isFirstChunk, resolve) {
    try {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      // Mobile-specific audio settings
      if (this.isMobile()) {
        audio.preload = 'auto';
        audio.volume = 0.8;
        // Force audio to play inline on iOS
        audio.setAttribute('playsinline', 'true');
        audio.setAttribute('webkit-playsinline', 'true');
      }
      
      audio.onloadeddata = () => {
        if (isFirstChunk && this.textQueue.length > 0) {
          setTimeout(() => {
            this.processTextQueue();
          }, 100);
        }
      };
      
      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        console.error('HTML5 Audio fallback failed');
        resolve();
      };
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Audio play failed:', error);
          URL.revokeObjectURL(url);
          resolve();
        });
      }
      
      console.log('Playing audio chunk (HTML5 Audio fallback)');
      
    } catch (error) {
      console.error('Fallback audio playback failed:', error);
      resolve();
    }
  }

  shouldUseFallbackAudio() {
    // Use fallback on problematic browsers or mobile with suspended context
    return this.isMobile() && this.audioContext && this.audioContext.state !== 'running';
  }

  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
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
    
    // Adaptive typing speed based on device and text length
    const adaptiveSpeed = this.calculateTypingSpeed(text.length);

    const typeNextChar = () => {
      if (currentIndex < text.length) {
        // Handle word boundaries for more natural typing
        const char = text[currentIndex];
        bubble.textContent = text.slice(0, currentIndex + 1);
        currentIndex++;
        this.scrollToBottom();
        
        // Variable delay for punctuation and word boundaries
        let delay = adaptiveSpeed;
        if (char === '.' || char === '!' || char === '?') {
          delay = adaptiveSpeed * 3; // Pause at sentence end
        } else if (char === ',' || char === ';') {
          delay = adaptiveSpeed * 2; // Pause at clause end
        } else if (char === ' ') {
          delay = adaptiveSpeed * 0.5; // Faster word spacing
        }
        
        setTimeout(typeNextChar, delay);
      } else {
        this.isTyping = false;
        // Continue with next message after small delay
        if (this.textQueue.length > 0) {
          setTimeout(() => this.processTextQueue(), 300);
        }
      }
    };

    typeNextChar();
  }
  
  calculateTypingSpeed(textLength) {
    // Adaptive typing speed: faster for short messages, slower for long ones
    const baseSpeed = this.isMobile() ? 25 : 18; // Slightly slower on mobile
    
    if (textLength < 50) return baseSpeed * 0.8; // Fast for short messages
    if (textLength < 150) return baseSpeed; // Normal speed
    if (textLength < 300) return baseSpeed * 1.2; // Slightly slower for medium
    return baseSpeed * 1.5; // Slower for long messages
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