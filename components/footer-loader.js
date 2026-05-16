(function() {
  // ====================================================================
  // LinkedIn Insight Tag — pixel 2922380 (account ufficiale)
  // Caricato qui in modo centralizzato: tutte le pagine che includono
  // footer-loader.js ricevono il pixel. Le future pagine pure.
  // Nota: anche se il footer è nascosto via CSS (es. chat.html), questo
  // script viene comunque eseguito → il pixel parte sempre.
  // ====================================================================
  if (!window._linkedin_partner_id_loaded) {
    window._linkedin_partner_id_loaded = true;
    window._linkedin_partner_id = "2922380";
    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
    window._linkedin_data_partner_ids.push("2922380");
    (function(l){
      if (!l) {
        window.lintrk = function(a,b) { window.lintrk.q.push([a,b]); };
        window.lintrk.q = [];
      }
      var s = document.getElementsByTagName("script")[0];
      var b = document.createElement("script");
      b.type = "text/javascript";
      b.async = true;
      b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
      s.parentNode.insertBefore(b, s);
    })(window.lintrk);
  }

  // ====================================================================
  // Footer loader (logica originale)
  // ====================================================================
  const placeholder = document.getElementById('footer-placeholder');
  if (!placeholder) return;

  const base = document.querySelector('meta[name="base-path"]')
    ?.getAttribute('content') || '';

  fetch(base + '/components/footer.html')
    .then(r => r.text())
    .then(html => {
      placeholder.outerHTML = html;
    })
    .catch(() => {
      console.warn('Footer component non caricato');
    });
})();
