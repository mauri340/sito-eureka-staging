// Multi-Platform Analytics Integration
// GA4, Facebook Pixel, LinkedIn Insight Tag with dynamic loading

class AnalyticsIntegration {
  constructor() {
    this.isGA4Loaded = false;
    this.isFacebookPixelLoaded = false;
    this.isLinkedInLoaded = false;
    this.eventQueue = [];
    this.init();
  }

  init() {
    this.loadGA4();
    this.loadFacebookPixel();
    this.loadLinkedInInsight();
    console.log('Analytics integration initialized');
  }

  // Google Analytics 4 Dynamic Loading
  loadGA4() {
    if (window.gtag || this.isGA4Loaded) {
      console.log('GA4 already loaded');
      return;
    }

    const GA_ID = 'G-2X3V7JZPBJ'; // Your GA4 ID

    // Create and inject gtag script
    const gtagScript = document.createElement('script');
    gtagScript.async = true;
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    gtagScript.onload = () => {
      this.isGA4Loaded = true;
      console.log('GA4 script loaded successfully');
      this.processQueuedEvents();
    };
    document.head.appendChild(gtagScript);

    // Create and inject gtag configuration
    const gtagConfigScript = document.createElement('script');
    gtagConfigScript.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      window.gtag = gtag;
      gtag('js', new Date());
      gtag('config', '${GA_ID}', {
        page_title: document.title,
        page_location: window.location.href,
        custom_map: {
          'custom_parameter_1': 'chat_source',
          'custom_parameter_2': 'user_type'
        }
      });
    `;
    document.head.appendChild(gtagConfigScript);
  }

  // Facebook Pixel Dynamic Loading
  loadFacebookPixel() {
    if (window.fbq || this.isFacebookPixelLoaded) {
      console.log('Facebook Pixel already loaded');
      return;
    }

    // Facebook Pixel Code
    !function(f,b,e,v,n,t,s) {
      if(f.fbq)return; n=f.fbq=function(){ 
        n.callMethod ? n.callMethod.apply(n,arguments) : n.queue.push(arguments) 
      };
      if(!f._fbq)f._fbq=n; n.push=n; n.loaded=!0; n.version='2.0';
      n.queue=[]; t=b.createElement(e); t.async=!0;
      t.src=v; s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s);
      
      t.onload = () => {
        this.isFacebookPixelLoaded = true;
        console.log('Facebook Pixel loaded successfully');
        this.processQueuedEvents();
      };
    }(window, document,'script', 'https://connect.facebook.net/en_US/fbevents.js');

    fbq('init', '1113993426083027'); // Your Facebook Pixel ID
    fbq('track', 'PageView');
  }

  // LinkedIn Insight Tag Dynamic Loading
  loadLinkedInInsight() {
    if (window.lintrk || this.isLinkedInLoaded) {
      console.log('LinkedIn Insight already loaded');
      return;
    }

    window._linkedin_partner_id = "6008396";
    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
    window._linkedin_data_partner_ids.push("6008396");

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
    script.onload = () => {
      this.isLinkedInLoaded = true;
      console.log('LinkedIn Insight loaded successfully');
      this.processQueuedEvents();
    };
    document.head.appendChild(script);
  }

  // Process any events that were queued before scripts loaded
  processQueuedEvents() {
    if (this.eventQueue.length > 0) {
      console.log('Processing queued analytics events:', this.eventQueue.length);
      this.eventQueue.forEach(event => {
        this.trackEvent(event.type, event.params, event.source);
      });
      this.eventQueue = [];
    }
  }

  // Universal event tracking
  trackEvent(eventType, params = {}, source = 'chat') {
    const eventData = {
      ...params,
      source: source,
      timestamp: new Date().toISOString(),
      page: window.location.pathname,
      user_agent: navigator.userAgent
    };

    // If scripts not loaded yet, queue the event
    if (!this.isGA4Loaded || !this.isFacebookPixelLoaded || !this.isLinkedInLoaded) {
      this.eventQueue.push({ type: eventType, params: eventData, source: source });
      return;
    }

    // Google Analytics 4
    if (window.gtag) {
      try {
        window.gtag('event', eventType, {
          ...eventData,
          event_category: 'chat_widget',
          event_label: source
        });
        console.log('GA4 event tracked:', eventType, eventData);
      } catch (error) {
        console.warn('GA4 tracking error:', error);
      }
    }

    // Facebook Pixel
    if (window.fbq) {
      try {
        window.fbq('trackCustom', eventType, eventData);
        console.log('Facebook event tracked:', eventType, eventData);
      } catch (error) {
        console.warn('Facebook Pixel tracking error:', error);
      }
    }

    // LinkedIn (for specific conversion events)
    if (window.lintrk && this.isLinkedInConversionEvent(eventType)) {
      try {
        window.lintrk('track', { conversion_id: 6819532 });
        console.log('LinkedIn conversion tracked:', eventType);
      } catch (error) {
        console.warn('LinkedIn tracking error:', error);
      }
    }
  }

  // Chat-specific event tracking methods
  trackChatOpened(userSource = 'unknown') {
    this.trackEvent('chat_opened', {
      user_source: userSource,
      chat_type: this.determineChatType(userSource)
    });
  }

  trackMessageSent(messageType = 'text', userSource = 'unknown') {
    this.trackEvent('chat_message_sent', {
      message_type: messageType,
      user_source: userSource,
      session_id: this.getSessionId()
    });
  }

  trackFormSubmitted(formType, formData = {}) {
    const sanitizedData = this.sanitizeFormData(formData);
    this.trackEvent('form_submitted', {
      form_type: formType,
      ...sanitizedData
    });

    // Special handling for lead forms
    if (['contact_form', 'call_request', 'consultation_request'].includes(formType)) {
      this.trackLead(formType);
    }
  }

  trackLead(leadType = 'chat_lead') {
    // Facebook Pixel Lead event
    if (window.fbq) {
      try {
        window.fbq('track', 'Lead', { 
          content_name: leadType,
          content_category: 'chat_widget'
        });
        console.log('Facebook lead tracked:', leadType);
      } catch (error) {
        console.warn('Facebook lead tracking error:', error);
      }
    }

    // LinkedIn conversion
    if (window.lintrk) {
      try {
        window.lintrk('track', { conversion_id: 6819532 });
        console.log('LinkedIn lead conversion tracked');
      } catch (error) {
        console.warn('LinkedIn lead tracking error:', error);
      }
    }

    // GA4 conversion
    if (window.gtag) {
      try {
        window.gtag('event', 'generate_lead', {
          event_category: 'chat_widget',
          event_label: leadType,
          value: 1
        });
        console.log('GA4 lead tracked:', leadType);
      } catch (error) {
        console.warn('GA4 lead tracking error:', error);
      }
    }
  }

  trackTestCompletion(testType, testData = {}) {
    const sanitizedData = this.sanitizeTestData(testData);
    this.trackEvent('test_completed', {
      test_type: testType,
      ...sanitizedData
    });

    // High-value event for test completers
    this.trackEvent('qualified_lead', {
      qualification_type: 'test_completion',
      test_type: testType
    });
  }

  trackWebinarInterest(webinarType) {
    this.trackEvent('webinar_interest', {
      webinar_type: webinarType,
      interest_source: 'chat_widget'
    });
  }

  trackCourseInterest(courseType) {
    this.trackEvent('course_interest', {
      course_type: courseType,
      interest_source: 'chat_widget'
    });
  }

  trackConsultationRequest() {
    this.trackEvent('consultation_requested', {
      request_source: 'chat_widget'
    });
    this.trackLead('consultation_request');
  }

  // Utility methods
  determineChatType(userSource) {
    if (userSource.includes('test')) return 'test_results';
    if (userSource === 'website_page') return 'content_support';
    return 'general_inquiry';
  }

  isLinkedInConversionEvent(eventType) {
    const conversionEvents = [
      'form_submitted', 'generate_lead', 'consultation_requested', 
      'webinar_registered', 'course_enrolled', 'test_completed'
    ];
    return conversionEvents.includes(eventType);
  }

  sanitizeFormData(formData) {
    // Remove sensitive data from tracking
    const sanitized = { ...formData };
    delete sanitized.email;
    delete sanitized.telefono;
    delete sanitized.phone;
    
    return {
      has_email: !!formData.email,
      has_phone: !!formData.telefono || !!formData.phone,
      form_fields_count: Object.keys(formData).length
    };
  }

  sanitizeTestData(testData) {
    // Remove sensitive data but keep test metrics
    const sanitized = { ...testData };
    delete sanitized.email;
    delete sanitized.telefono;
    delete sanitized.nome;
    delete sanitized.cognome;
    
    return {
      has_user_data: !!(testData.email && testData.nome),
      test_score: testData.punteggio || testData.memory_score || testData.ignorance_score,
      test_performance: this.categorizeTestPerformance(testData)
    };
  }

  categorizeTestPerformance(testData) {
    // Categorize test performance for analytics
    if (testData.pam) {
      const pam = parseInt(testData.pam);
      if (pam < 200) return 'low';
      if (pam < 400) return 'medium';
      return 'high';
    }
    
    if (testData.punteggio) {
      const score = parseInt(testData.punteggio);
      if (score < 50) return 'low';
      if (score < 75) return 'medium';
      return 'high';
    }
    
    return 'unknown';
  }

  getSessionId() {
    // Generate or retrieve session ID
    let sessionId = sessionStorage.getItem('chat_session_id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('chat_session_id', sessionId);
    }
    return sessionId;
  }

  // Page view tracking with enhanced data
  trackPageView(additionalData = {}) {
    const pageData = {
      page_title: document.title,
      page_location: window.location.href,
      page_path: window.location.pathname,
      referrer: document.referrer,
      ...additionalData
    };

    if (window.gtag) {
      window.gtag('config', 'G-2X3V7JZPBJ', pageData);
    }
  }

  // Get analytics status for debugging
  getStatus() {
    return {
      ga4Loaded: this.isGA4Loaded,
      facebookPixelLoaded: this.isFacebookPixelLoaded,
      linkedInLoaded: this.isLinkedInLoaded,
      queuedEvents: this.eventQueue.length,
      sessionId: this.getSessionId()
    };
  }
}

// Export for use in chat widget
window.AnalyticsIntegration = AnalyticsIntegration;