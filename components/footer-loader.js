(function() {
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