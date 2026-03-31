// analytics.js
// ANALYTICS & TRACKING CENTRALIZZATO

// File: src/utils/analytics.js
// Questo file ora carica TUTTI gli script di tracciamento.

/* 1. GOOGLE ANALYTICS 4 (CARICAMENTO DINAMICO) */
(function loadGA() {
  // Non caricare se lo script è già presente per qualche motivo
  if (window.gtag) return;

  // L'ID corretto che abbiamo scoperto funzionare
  const GA_ID = 'G-2X3V7JZPBJ';

  // Crea e inietta lo script principale di Google (gtag.js)
  const gtagScript = document.createElement('script');
  gtagScript.async = true;
  gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(gtagScript);
  
  // Inietta lo script di configurazione che definisce dataLayer e gtag
  const gtagConfigScript = document.createElement('script');
  gtagConfigScript.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag; // Rende gtag disponibile globalmente
    gtag('js', new Date());
    gtag('config', '${GA_ID}');
  `;
  document.head.appendChild(gtagConfigScript);
  
  console.log('Google Analytics caricato dinamicamente da analytics.js');
})();


/* 2. FACEBOOK PIXEL */
(function loadFBPixel() {
    if (window.fbq) return;
    !function(f,b,e,v,n,t,s) {
        if(f.fbq)return; n=f.fbq=function(){ n.callMethod ?
        n.callMethod.apply(n,arguments):n.queue.push(arguments) };
        if(!f._fbq)f._fbq=n; n.push=n; n.loaded=!0; n.version='2.0';
        n.queue=[]; t=b.createElement(e); t.async=!0;
        t.src=v; s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)
    }(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '1113993426083027');
    fbq('track', 'PageView');
})();


/* 3. LINKEDIN INSIGHT TAG */
(function loadLinkedinInsight() {
    window._linkedin_partner_id = "6008396";
    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
    window._linkedin_data_partner_ids.push("6008396");
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
    document.head.appendChild(script);
})();


/* 4. FUNZIONI DI TRACKING PERSONALIZZATE */
export function trackEvent({type, params = {}}) {
    if (window.gtag) {
        window.gtag('event', type, params);
    }
    if (window.fbq) {
        window.fbq('trackCustom', type, params);
    }
}

export function trackLead() {
  if (typeof window.fbq === 'function') {
    window.fbq('track', 'Lead');
  }
  if (typeof window.lintrk === 'function') {
    window.lintrk('track', { conversion_id: 6819532 });
  }
}

// Riga di test da rimuovere una volta che tutto funziona
window.testAnalytics = { trackEvent, trackLead };