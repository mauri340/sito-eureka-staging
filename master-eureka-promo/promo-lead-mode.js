/**
 * UI post-promo: lead capture senza prezzi né countdown.
 * Disattiva con MASTER_EUREKA_PROMO.leadOnlyMode = false
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
      consent.innerHTML = consent.innerHTML.replace('Vai al passo numero due', 'Invia la richiesta');
    }
    var wa = d.querySelector('.form-whatsapp-help a');
    if (wa) {
      wa.href =
        'https://wa.me/390240702168?text=' +
        encodeURIComponent('Ciao, vorrei informazioni sul Master Eureka (ho visto la pagina post-promo).');
    }
  }

  function lockStickyLead() {
    var headline = d.getElementById('sticky-headline');
    var stickyPrice = d.getElementById('sticky-price');
    var stickyText = d.querySelector('.sticky-cta-text');
    var stickyBtn = d.getElementById('sticky-btn');
    if (headline) {
      headline.hidden = false;
      headline.textContent = 'Interessato al Master Eureka?';
    }
    if (stickyPrice) stickyPrice.hidden = true;
    if (stickyText) stickyText.textContent = 'Lascia i dati — ti ricontattiamo noi';
    if (stickyBtn) {
      stickyBtn.textContent = 'Richiedi informazioni';
      stickyBtn.setAttribute('href', '#form');
    }
  }

  function updateStickyAndFooter() {
    lockStickyLead();
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

  function replaceObiezioniForLead() {
    var wrap = d.getElementById('obiezioni');
    if (!wrap) return;
    wrap.innerHTML =
      '<h3 style="font-family:\'Playfair Display\',serif;font-size:clamp(1.35rem,2.5vw,1.65rem);color:#fff;text-align:center;margin:0 0 14px;">Prima di inviare la richiesta</h3>' +
      '<p style="text-align:center;font-size:15px;color:rgba(255,255,255,.7);margin-bottom:24px;line-height:1.7;">' +
      'Niente prezzi in pagina: lascia i dati e <strong style="color:#fff;">ti ricontattiamo noi</strong>. ' +
      'Ecco cosa succede dopo e le domande più frequenti in questo momento.</p>' +
      '<div class="accordion-item">' +
      '  <div class="accordion-header">Cosa succede dopo il form? <span class="accordion-arrow">▼</span></div>' +
      '  <div class="accordion-body">' +
      '    <p><strong>Nessun addebito.</strong> Compili nome, email e telefono — 30 secondi.</p>' +
      '    <p>Vedi una pagina di conferma con un riepilogo del percorso. Poi <strong>ti richiamiamo noi</strong> ' +
      'per capire se il Master fa per te e, se ha senso, illustrarti le <strong>condizioni di accesso</strong>.</p>' +
      '    <p><strong>Nessun obbligo di acquisto.</strong> Se non è il momento giusto, ti fermi lì.</p>' +
      '  </div>' +
      '</div>' +
      '<div class="accordion-item">' +
      '  <div class="accordion-header">Perché non vedo il prezzo? <span class="accordion-arrow">▼</span></div>' +
      '  <div class="accordion-body">' +
      '    <p>La <strong>Campagna Estate è conclusa</strong>: online non mostriamo più prezzi automatici.</p>' +
      '    <p>Prima valutiamo insieme se il percorso è adatto a te; solo dopo parliamo di investimento e modalità, ' +
      'in base alla tua situazione.</p>' +
      '  </div>' +
      '</div>' +
      '<div class="accordion-item">' +
      '  <div class="accordion-header">«Non ho tempo» — e se fosse proprio il motivo per cui mi serve? <span class="accordion-arrow">▼</span></div>' +
      '  <div class="accordion-body">' +
      '    <p>La maggior parte dei nostri allievi lavora, ha famiglia e mille impegni. Il Master non serve a studiare di più, ' +
      'ma a ottenere di più nel tempo che hai già.</p>' +
      '    <p>Le ore che dedichi oggi al metodo possono restituirti centinaia di ore negli anni a venire — ' +
      'in lettura, memoria e organizzazione dello studio.</p>' +
      '  </div>' +
      '</div>';
  }

  function updateFaqSectionLead() {
    var sub = d.querySelector('#faq .section-sub');
    if (sub) {
      sub.innerHTML =
        'Dettagli sul percorso. Per <strong>tempi, costi e pagamento</strong> ne parliamo ' +
        'quando ti ricontattiamo — non in questa pagina.';
    }
    d.querySelectorAll('a[href="#obiezioni"]').forEach(function (a) {
      a.textContent = 'domande frequenti';
    });
  }

  function updatePromoCtas() {
    d.querySelectorAll('a.btn-gold, a.btn.btn-gold').forEach(function (a) {
      var t = (a.textContent || '').toLowerCase();
      if (t.indexOf('promo') !== -1 || t.indexOf('2.497') !== -1 || t.indexOf('offerta') !== -1) {
        a.textContent = 'Richiedi informazioni →';
        a.setAttribute('href', '#form');
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
    replaceObiezioniForLead();
    updateFaqSectionLead();
    updatePromoCtas();
    updateMeta();
    /* Ripristina sticky lead se lo script promo la sovrascrive */
    setTimeout(lockStickyLead, 0);
    setTimeout(lockStickyLead, 500);
  }

  if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})(window, document);
