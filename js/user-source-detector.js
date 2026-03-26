// Intelligent User Source Detection and Routing
// Detects if user comes from test results or website pages

class UserSourceDetector {
  constructor() {
    this.userSource = null;
    this.testData = null;
    this.pageContext = null;
    this.init();
  }

  init() {
    this.detectUserSource();
    this.extractTestData();
    this.extractPageContext();
    console.log('User source detection completed:', this.getUserSourceInfo());
  }

  detectUserSource() {
    const urlParams = new URLSearchParams(window.location.search);
    const referrer = document.referrer;
    const pathname = window.location.pathname;
    
    // Check for test completion parameters
    const hasTestData = urlParams.has('pam') || urlParams.has('punteggio') || urlParams.has('quiz_status');
    const hasUserData = urlParams.has('nome') || urlParams.has('email') || urlParams.has('userId');
    
    // Check for specific test types
    const isFromReadingTest = urlParams.get('test_type') === 'lettura' || urlParams.has('pam');
    const isFromMemoryTest = urlParams.get('test_type') === 'memoria' || urlParams.has('memory_score');
    const isFromIgnoranceTest = urlParams.get('test_type') === 'costo_ignoranza' || urlParams.has('ignorance_score');
    
    // Check for referrer patterns
    const isFromTestPlatform = referrer.includes('quiz') || referrer.includes('test') || referrer.includes('backend-quiz-ai');
    
    if (hasTestData || (hasUserData && isFromTestPlatform)) {
      if (isFromReadingTest) {
        this.userSource = 'reading_test';
      } else if (isFromMemoryTest) {
        this.userSource = 'memory_test';
      } else if (isFromIgnoranceTest) {
        this.userSource = 'ignorance_test';
      } else {
        this.userSource = 'test_completion';
      }
    } else if (pathname.includes('/chat') && hasUserData) {
      this.userSource = 'direct_chat';
    } else {
      this.userSource = 'website_page';
    }
  }

  extractTestData() {
    if (this.userSource.includes('test')) {
      const urlParams = new URLSearchParams(window.location.search);
      
      this.testData = {
        userId: urlParams.get('userId'),
        email: urlParams.get('email'),
        nome: urlParams.get('nome'),
        cognome: urlParams.get('cognome'),
        telefono: urlParams.get('telefono'),
        
        // Reading test data
        pam: urlParams.get('pam'),
        punteggio: urlParams.get('punteggio'),
        quiz_status: urlParams.get('quiz_status'),
        
        // Memory test data
        memory_score: urlParams.get('memory_score'),
        memory_level: urlParams.get('memory_level'),
        
        // Ignorance cost test data
        ignorance_score: urlParams.get('ignorance_score'),
        ignorance_category: urlParams.get('ignorance_category'),
        
        // General test data
        test_type: urlParams.get('test_type'),
        completion_time: urlParams.get('completion_time'),
        test_date: urlParams.get('test_date') || new Date().toISOString()
      };
      
      // Clean up null values
      Object.keys(this.testData).forEach(key => {
        if (this.testData[key] === null || this.testData[key] === 'null') {
          delete this.testData[key];
        }
      });
    }
  }

  extractPageContext() {
    this.pageContext = {
      url: window.location.href,
      pathname: window.location.pathname,
      title: document.title,
      description: this.getMetaDescription(),
      section: this.getPageSection(),
      referrer: document.referrer,
      timestamp: new Date().toISOString()
    };

    // Extract page-specific content for context
    if (this.userSource === 'website_page') {
      this.pageContext.content = this.extractPageContent();
      this.pageContext.keywords = this.extractKeywords();
      this.pageContext.category = this.categorizeContent();
    }
  }

  getMetaDescription() {
    const metaDesc = document.querySelector('meta[name="description"]');
    return metaDesc ? metaDesc.getAttribute('content') : '';
  }

  getPageSection() {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    return pathParts.length > 0 ? pathParts[0] : 'home';
  }

  extractPageContent() {
    const content = {
      headings: [],
      mainText: '',
      links: [],
      images: []
    };

    // Extract headings
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    content.headings = Array.from(headings).map(h => ({
      level: h.tagName.toLowerCase(),
      text: h.textContent.trim()
    })).slice(0, 10);

    // Extract main text content
    const mainContent = document.querySelector('main, .main-content, .content, article');
    if (mainContent) {
      content.mainText = mainContent.textContent.replace(/\s+/g, ' ').trim().substring(0, 1000);
    } else {
      // Fallback to body text
      const bodyText = document.body.textContent.replace(/\s+/g, ' ').trim();
      content.mainText = bodyText.substring(0, 1000);
    }

    // Extract important links
    const links = document.querySelectorAll('a[href*="corso"], a[href*="webinar"], a[href*="consulenza"]');
    content.links = Array.from(links).map(a => ({
      text: a.textContent.trim(),
      href: a.href
    })).slice(0, 5);

    return content;
  }

  extractKeywords() {
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    const keywordsFromMeta = metaKeywords ? metaKeywords.getAttribute('content').split(',').map(k => k.trim()) : [];
    
    // Extract keywords from page title and headings
    const titleWords = document.title.toLowerCase().split(/\s+/);
    const headingText = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent.toLowerCase()).join(' ');
    const headingWords = headingText.split(/\s+/);
    
    const commonWords = ['il', 'la', 'di', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 'a', 'e', 'o', 'ma', 'se', 'che', 'come', 'quando', 'dove', 'perché'];
    const relevantWords = [...titleWords, ...headingWords]
      .filter(word => word.length > 3 && !commonWords.includes(word))
      .slice(0, 10);

    return [...new Set([...keywordsFromMeta, ...relevantWords])];
  }

  categorizeContent() {
    const url = window.location.pathname.toLowerCase();
    const title = document.title.toLowerCase();
    const content = document.body.textContent.toLowerCase();

    if (url.includes('corso') || title.includes('corso') || content.includes('corso')) {
      return 'corsi';
    } else if (url.includes('webinar') || title.includes('webinar')) {
      return 'webinar';
    } else if (url.includes('consulenza') || title.includes('consulenza')) {
      return 'consulenza';
    } else if (url.includes('blog') || title.includes('blog')) {
      return 'blog';
    } else if (url.includes('about') || url.includes('chi-siamo')) {
      return 'about';
    } else if (url.includes('contact') || url.includes('contatti')) {
      return 'contatti';
    } else {
      return 'generale';
    }
  }

  // Get chat initialization context based on user source
  getChatInitContext() {
    const baseContext = {
      userSource: this.userSource,
      timestamp: new Date().toISOString()
    };

    if (this.userSource.includes('test') && this.testData) {
      // Test completion context - focus on results and conversion
      return {
        ...baseContext,
        mode: 'test_results',
        testData: this.testData,
        intent: 'discuss_results_and_convert',
        priority: 'high', // Test completers are hot leads
        followUp: this.getTestFollowUpStrategy()
      };
    } else if (this.userSource === 'website_page' && this.pageContext) {
      // Website context - focus on page content and needs
      return {
        ...baseContext,
        mode: 'content_aware',
        pageContext: this.pageContext,
        intent: 'help_with_page_content',
        priority: 'medium',
        followUp: this.getContentFollowUpStrategy()
      };
    } else {
      // Default context
      return {
        ...baseContext,
        mode: 'general',
        intent: 'general_assistance',
        priority: 'low'
      };
    }
  }

  getTestFollowUpStrategy() {
    switch (this.userSource) {
      case 'reading_test':
        return {
          primary: 'explain_reading_results',
          secondary: 'offer_speed_reading_course',
          conversion: 'speed_reading_webinar'
        };
      case 'memory_test':
        return {
          primary: 'explain_memory_results',
          secondary: 'offer_memory_course',
          conversion: 'memory_techniques_webinar'
        };
      case 'ignorance_test':
        return {
          primary: 'explain_ignorance_cost',
          secondary: 'offer_learning_strategy',
          conversion: 'personal_consultation'
        };
      default:
        return {
          primary: 'explain_test_results',
          secondary: 'offer_relevant_course',
          conversion: 'free_consultation'
        };
    }
  }

  getContentFollowUpStrategy() {
    const category = this.pageContext?.category;
    
    switch (category) {
      case 'corsi':
        return {
          primary: 'discuss_course_interest',
          secondary: 'explain_course_benefits',
          conversion: 'course_enrollment'
        };
      case 'webinar':
        return {
          primary: 'discuss_webinar_topic',
          secondary: 'explain_webinar_value',
          conversion: 'webinar_registration'
        };
      case 'consulenza':
        return {
          primary: 'understand_consultation_need',
          secondary: 'explain_consultation_process',
          conversion: 'book_consultation'
        };
      default:
        return {
          primary: 'understand_visitor_need',
          secondary: 'suggest_relevant_content',
          conversion: 'lead_qualification'
        };
    }
  }

  // Get personalized greeting based on source
  getPersonalizedGreeting() {
    if (this.userSource.includes('test') && this.testData) {
      const name = this.testData.nome || 'Utente';
      
      switch (this.userSource) {
        case 'reading_test':
          return `Ciao ${name}! Ho visto i risultati del tuo test di lettura. Hai raggiunto ${this.testData.pam || 'N/A'} PAM! Vuoi che analizziamo insieme questi dati e vediamo come migliorare ulteriormente?`;
        case 'memory_test':
          return `Benvenuto ${name}! I risultati del tuo test di memoria sono interessanti. Posso spiegarti cosa significano e come sviluppare al meglio le tue capacità mnemoniche.`;
        case 'ignorance_test':
          return `Ciao ${name}! Il test sul costo dell'ignoranza ha rivelato aspetti importanti. Parliamo di come trasformare questa consapevolezza in un vantaggio concreto per il tuo futuro.`;
        default:
          return `Benvenuto ${name}! Ho i risultati del tuo test. Vuoi che li analizziamo insieme per capire il tuo potenziale di apprendimento?`;
      }
    } else if (this.pageContext && this.pageContext.category !== 'generale') {
      const category = this.pageContext.category;
      const section = this.pageContext.section;
      
      return `Ciao! Vedo che stai guardando la sezione ${section}. Come posso aiutarti con ${category === 'corsi' ? 'i nostri corsi' : category === 'webinar' ? 'i webinar' : category === 'consulenza' ? 'le consulenze' : 'questa pagina'}?`;
    } else {
      return 'Ciao! Sono Mentor Eureka, il tuo assistente per il metodo di apprendimento rapido. Come posso aiutarti oggi?';
    }
  }

  getUserSourceInfo() {
    return {
      source: this.userSource,
      hasTestData: !!this.testData,
      hasPageContext: !!this.pageContext,
      testData: this.testData,
      pageContext: this.pageContext ? {
        title: this.pageContext.title,
        section: this.pageContext.section,
        category: this.pageContext.category
      } : null
    };
  }

  // Check if user needs data collection
  needsDataCollection() {
    if (this.userSource.includes('test')) {
      // Check if we have minimum required data
      return !this.testData || !this.testData.email || !this.testData.nome;
    }
    return false; // Website users don't need forced data collection
  }

  // Get data collection fields needed
  getRequiredDataFields() {
    if (this.needsDataCollection()) {
      const missing = [];
      if (!this.testData?.email) missing.push({ name: 'email', label: 'Email', type: 'email', required: true });
      if (!this.testData?.nome) missing.push({ name: 'nome', label: 'Nome', type: 'text', required: true });
      if (!this.testData?.telefono) missing.push({ name: 'telefono', label: 'Telefono', type: 'tel', required: false });
      return missing;
    }
    return [];
  }
}

// Export for use in chat widget
window.UserSourceDetector = UserSourceDetector;