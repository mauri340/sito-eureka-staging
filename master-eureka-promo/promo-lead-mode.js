/**
 * UI post-promo: lead capture senza prezzi né countdown.
 */
(function (w, d) {
  var CFG = w.MASTER_EUREKA_PROMO || {};
  if (!CFG.leadOnlyMode) return;

  d.documentElement.classList.add('lead-only-mode');

  function hideLiveBlocks() {
    d.querySelectorAll('.live-cta-box').forEach(function (el) {
      el.style.display = 'none';
    });
    d.querySelectorAll('[data-lead-hide]').forEach(function (el) {
      el.style.display = 'none';
    });
    var liveSection = d.getElementById('live-riservata-block');
    if (liveSection) liveSection.style.display = 'none';
  }

  function replacePromoBar() {
    var bar = d.querySelector('.promo-bar');
    if (!bar) return;
    bar.className = 'lead-info-bar';
    bar.innerHTML =
      '<strong>Master Eureka</strong> — la promo Campagna Estate è conclusa. ' +
      'Puoi ancora lasciare i tuoi dati: ti ricontattiamo per valutare insieme il percorso e le condizioni.';
  }

  function updateOfferHead() {
    var head = d.querySelector('.promo-card-head');
    if (head) {
      head.innerHTML = 'Richiedi informazioni · <em>Master Eureka</em>';
    }
    var intro = d.querySelector('.form-intro');
    if (intro) {
      intro.innerHTML =
        '<p>Il <strong style="color:var(--navy);">Master Eureka</strong> è il percorso più completo del Metodo Eureka: ' +
        'formazione, affiancamento e supporto per trasformare il tuo modo di apprendere.</p>' +
        '<p>Compila il form: <strong>nessun impegno</strong> e nessun prezzo qui. ' +
        'Ti ricontattiamo per capire se fa per te e, se sì, illustrarti le condizioni di accesso.</p>';
    }
  }

  function simplifySteps() {
    var steps = d.querySelector('.promo-steps');
    if (!steps) return;
    steps.setAttribute('data-step', '1');
    var heading = steps.querySelector('.promo-steps-heading');
    if (heading) heading.textContent = 'Come funziona — in due passi';
    var items = steps.querySelectorAll('.promo-steps-item');
    if (items.length >= 3) {
      items[2].style.display = 'none';
    }
    if (items.length >= 2) {
      var t2 = items[1].querySelector('.promo-steps-title');
      var d2 = items[1].querySelector('.promo-steps-desc');
      if (t2) t2.textContent = 'Ti ricontattiamo';
      if (d2) d2.innerHTML = 'Parliamo del percorso e delle <strong>condizioni</strong> adatte a te';
    }
    if (items.length >= 3) {
      var t3 = items[2].querySelector('.promo-steps-desc');
      if (t3) t3.textContent = '';
    }
    var hint = steps.querySelector('.promo-steps-hint');
    if (hint) hint.textContent = 'Compila qui sotto — richiesta informazioni';
    var note = steps.querySelector('.promo-steps-note');
    if (note) {
      note.innerHTML =
        'Compilare il form <strong>non comporta alcun addebito</strong> e ' +
        '<strong>non ti obbliga ad alcun acquisto</strong>. ' +
        'Serve solo a farti ricontattare dal team per valutare insieme il Master Eureka.';
    }
  }

  function replaceFormPs() {
    var ps = d.querySelector('.form-ps');
    if (!ps) return;
    ps.classList.add('lead-ps');
    ps.innerHTML =
      '<p><strong>P.S.</strong> Se la promo ti è sfuggita per poco, non è un problema: ' +
      'lascia i dati e ti richiamiamo noi. Le condizioni economiche le vediamo insieme, ' +
      'quando capiamo che il percorso ha senso per la tua situazione.</p>';
  }

  function updateFormUi() {
    d.querySelectorAll('.promo-form .btn-submit').forEach(function (btn) {
      btn.textContent = 'Invia la richiesta →';
    });
    var consent = d.querySelector('.form-checkbox span');
    if (consent) {
      consent.innerHTML =
        consent.innerHTML.replace('Vai al passo numero due', 'Invia la richiesta');
    }
    var wa = d.querySelector('.form-whatsapp-help a');
    if (wa) {
      wa.href =
        'https://wa.me/390240702168?text=' +
        encodeURIComponent('Ciao, vorrei informazioni sul Master Eureka (ho visto la pagina post-promo).');
    }
  }

  function updateStickyAndFooter() {
    var headline = d.getElementById('sticky-headline');
    if (headline) headline.textContent = 'Interessato al Master Eureka?';
    var stickyText = d.querySelector('.sticky-cta-text');
    if (stickyText) stickyText.textContent = 'Lascia i dati — ti ricontattiamo noi';
    var stickyBtn = d.getElementById('sticky-btn');
    if (stickyBtn) {
      stickyBtn.textContent = 'Richiedi informazioni';
      stickyBtn.setAttribute('href', '#form');
    }
    var footerLead = d.querySelector('.footer-promo-lead');
    if (footerLead) footerLead.textContent = 'Domande sul Master Eureka?';
    var footerCta = d.querySelector('.footer-promo-cta');
    if (footerCta) {
      footerCta.textContent = 'Richiedi informazioni';
      footerCta.setAttribute('href', '#form');
    }
    d.querySelectorAll('.footer-promo-contacts a[href*="wa.me"]').forEach(function (a) {
      a.href =
        'https://wa.me/390240702168?text=' +
        encodeURIComponent('Ciao, vorrei informazioni sul Master Eureka.');
    });
  }

  function patchFaqPrices() {
    d.querySelectorAll('.accordion-body').forEach(function (body) {
      body.innerHTML = body.innerHTML
        .replace(/2\.497\s*€/g, 'il percorso')
        .replace(/4\.997\s*€/g, 'il listino')
        .replace(/Vale 2\.497 €\?/g, 'Vale l\'investimento?');
    });
    var obiezioniIntro = d.querySelector('#obiezioni + p, #obiezioni ~ p');
    var obWrap = d.getElementById('obiezioni');
    if (obWrap && obWrap.previousElementSibling) {
      /* intro is inside obiezioni-wrap */
    }
    var obIntro = d.querySelector('.obiezioni-wrap > p');
    if (obIntro) {
      obIntro.textContent =
        'Hai visto il programma e il form sopra — è normale avere ancora qualche domanda. ' +
        'Le tre più frequenti, con la risposta netta.';
    }
    var faqAfterForm = d.querySelector('.accordion-header');
    /* FAQ "Cosa succede dopo il form" */
    d.querySelectorAll('.accordion-item').forEach(function (item) {
      var h = item.querySelector('.accordion-header');
      if (!h || h.textContent.indexOf('Cosa succede dopo il form') === -1) return;
      var body = item.querySelector('.accordion-body');
      if (body) {
        body.innerHTML =
          '<p><strong>No.</strong> Compilare il form non addebita nulla.</p>' +
          '<p>Inserisci nome, email e telefono — 30 secondi. Nella pagina di conferma trovi un riepilogo del percorso. ' +
          'Poi <strong>ti ricontattiamo noi</strong> per capire se il Master fa per te e illustrarti le condizioni di accesso. ' +
          '<strong>Nessun obbligo di acquisto.</strong></p>';
      }
    });
  }

  function updateMeta() {
    d.title = 'Master Eureka — Richiedi informazioni';
    var desc = d.querySelector('meta[name="description"]');
    if (desc) {
      desc.setAttribute(
        'content',
        'Master Eureka: percorso completo Metodo Eureka. Lascia i tuoi dati per essere ricontattato — nessun prezzo online, valutiamo insieme il percorso.'
      );
    }
    var ogTitle = d.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', 'Master Eureka — Richiedi informazioni');
    var ogDesc = d.querySelector('meta[property="og:description"]');
    if (ogDesc) {
      ogDesc.setAttribute(
        'content',
        'Interessato al Master Eureka? Compila il form: ti ricontattiamo per parlare del percorso e delle condizioni.'
      );
    }
  }

  function run() {
    hideLiveBlocks();
    replacePromoBar();
    updateOfferHead();
    simplifySteps();
    replaceFormPs();
    updateFormUi();
    updateStickyAndFooter();
    patchFaqPrices();
    updateMeta();
  }

  if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})(window, document);
