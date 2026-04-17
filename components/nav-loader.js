(function() {
  var placeholder = document.getElementById('nav-placeholder');
  if (!placeholder) return;

  var base = (document.querySelector('meta[name="base-path"]') || {}).content || '';

  fetch(base + '/components/nav.html')
    .then(function(r) { return r.text(); })
    .then(function(html) {
      placeholder.outerHTML = html;

      var hamburger = document.getElementById('navHamburger');
      var mobileMenu = document.getElementById('navMobileMenu');
      if (hamburger && mobileMenu) {
        hamburger.addEventListener('click', function() {
          mobileMenu.classList.toggle('open');
        });
        var links = mobileMenu.querySelectorAll('a');
        for (var i = 0; i < links.length; i++) {
          links[i].addEventListener('click', function() {
            mobileMenu.classList.remove('open');
          });
        }
      }
    })
    .catch(function() {
      console.warn('Nav component non caricato');
    });
})();
