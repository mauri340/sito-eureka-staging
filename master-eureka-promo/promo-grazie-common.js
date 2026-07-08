/**
 * Dati form, bonus e countdown — grazie / opzione-2 / opzione-3
 */
(function (w) {
  var CFG = w.MASTER_EUREKA_PROMO || {};
  var BOOKING_KEY = (CFG.storageKeys && CFG.storageKeys.booking) || 'masterEurekaPromoBooking';
  var SPOT_KEY = (CFG.storageKeys && CFG.storageKeys.spotTaken) || 'masterEurekaSpotTaken';

  var BONUS_BY_DAY = {
    1: { emoji: '🎟️', tag: 'Bonus di oggi', title: 'Un posto al corso dal vivo, in regalo per chi vuoi tu', desc: 'Blocchi oggi e porti con te una persona al corso dal vivo di 4 giorni.', val: 1497 },
    2: { emoji: '🏨', tag: 'Bonus di oggi · solo i primi 7 iscritti', title: 'Vieni al Life senza pensare a hotel e viaggio', desc: 'Vitto e alloggio Life Emotion coperti da noi. Riservato anche ai primi 7 iscritti di oggi con acconto.', val: 400 },
    3: { emoji: '🎓', tag: 'Bonus di oggi', title: '5 ore di coaching sulla TUA materia', desc: 'Il metodo applicato al tuo materiale — concorso, esame o manuale.', val: 500 },
    4: { emoji: '⏳', tag: 'Ultimo giorno', title: 'Oggi alle 19:00 il prezzo torna a 4.997€', desc: 'Ultimo giorno promo: blocchi oggi a 2.497€.', val: 0 },
  };

  var REWARDS = [
    { emoji: '🎟️', label: 'Un posto al corso dal vivo (4 giorni), in regalo per chi vuoi', val: 1497, exclusive: 'Solo se versi l\'acconto adesso' },
    { emoji: '🎓', label: '5 ore di coaching sulla tua materia', val: 500, exclusive: 'Solo se versi l\'acconto adesso' },
    { emoji: '🏨', label: 'Vitto e alloggio al Life Emotion', val: 400, exclusive: 'Solo primi 7 di oggi · acconto adesso' },
  ];

  function param(k) { return new URLSearchParams(w.location.search).get(k); }

  function loadBookingData() {
    var params = new URLSearchParams(w.location.search);
    var stored = null;
    try { stored = JSON.parse(localStorage.getItem(BOOKING_KEY) || 'null'); } catch (e) {}
    var g = function (k) { return params.get(k) || (stored && stored[k]) || ''; };
    var nome = g('nome'), cognome = g('cognome');
    return { nome: nome, cognome: cognome, email: g('email'), telefono: g('telefono'), materia: g('materia'), fullName: (nome + ' ' + cognome).trim() };
  }

  function promoDayIndex() {
    var d = param('day');
    var idx = d !== null ? parseInt(d, 10) : new Date().getDay();
    return BONUS_BY_DAY[idx] ? idx : 1;
  }

  function currentBonus() {
    return BONUS_BY_DAY[promoDayIndex()];
  }

  /** Lun: tutti e 3 · Mar: 2 (senza biglietto) · Mer: 1 (solo coaching) · Gio: 0 */
  function rewardsForDay() {
    var idx = promoDayIndex();
    if (idx >= 4) return [];
    if (idx === 3) return [REWARDS[1]];
    if (idx === 2) return REWARDS.slice(1);
    return REWARDS.slice();
  }

  function fmt(n) { return n.toLocaleString('it-IT'); }

  function renderBonusDay(ids) {
    var b = currentBonus();
    if (ids.emoji) document.getElementById(ids.emoji).textContent = b.emoji;
    if (ids.tag) document.getElementById(ids.tag).textContent = b.tag;
    if (ids.title) document.getElementById(ids.title).textContent = b.title;
    if (ids.desc) document.getElementById(ids.desc).textContent = b.desc + (b.val ? (' (valore ' + fmt(b.val) + '€)') : '');
  }

  function renderRewardList(containerId, opts) {
    opts = opts || {};
    var rl = document.getElementById(containerId);
    if (!rl) return;
    var idx = promoDayIndex();
    var items = rewardsForDay();
    var section = document.getElementById('reward-section');
    var btn = document.getElementById('stripe-btn');

    if (idx >= 4) {
      if (section) section.style.display = 'none';
      if (btn) btn.textContent = 'Conferma l\'iscrizione a 2.497€ — acconto 500€ →';
      rl.innerHTML = '';
      return;
    }

    if (section) section.style.display = '';
    if (btn) btn.textContent = 'Blocca i bonus e versa l\'acconto da 500€ →';

    var h = '', tot = 0;
    items.forEach(function (it) {
      tot += it.val;
      h += '<li class="reward-item">' +
        '<div class="reward-item-main"><strong>' + it.emoji + ' ' + it.label + '</strong>' +
        ' <span class="reward-val">valore ' + fmt(it.val) + '€</span></div>' +
        (it.exclusive ? '<span class="reward-exclusive">' + it.exclusive + '</span>' : '') +
        '</li>';
    });
    h += '<li class="reward-total-bar"><strong>' + fmt(tot) + '€ di extra</strong> — inclusi nel prezzo promo, zero costi aggiuntivi</li>';
    if (opts.contrast) {
      h += '<li class="reward-contrast">' + opts.contrast + '</li>';
    }
    rl.innerHTML = h;
    var totEl = document.getElementById('reward-total-num');
    if (totEl) totEl.textContent = fmt(tot);

    var lead = document.getElementById('reward-lead');
    if (lead) {
      if (items.length === 3) {
        lead.innerHTML = 'Hai visto le condizioni, il pulsante è qui sotto. Chi conferma <strong>oggi</strong> ottiene extra per un valore fino a <strong><span id="reward-total-num">' + fmt(tot) + '</span>€</strong> che restano riservati a te.';
      } else if (items.length === 2) {
        lead.innerHTML = 'Il bonus biglietto di lunedì non c\'è più. Se versi l\'acconto <strong>oggi</strong> restano <strong><span id="reward-total-num">' + fmt(tot) + '</span>€</strong> di extra.';
      } else {
        lead.innerHTML = 'Oggi resta un solo bonus extra (<strong><span id="reward-total-num">' + fmt(tot) + '</span>€</strong>): le 5 ore di coaching sulla tua materia — solo con l\'acconto adesso.';
      }
    }
  }

  function renderRewardPersonal(data) {
    var el = document.getElementById('reward-title');
    if (!el) return;
    if (promoDayIndex() >= 4) return;
    var base = 'solo se versi l\'acconto adesso — plus che chi aspetta non ha';
    var nome = (data && data.nome) ? data.nome.trim() : '';
    if (nome) {
      el.textContent = '';
      var strong = document.createElement('strong');
      strong.textContent = nome;
      el.appendChild(strong);
      el.appendChild(document.createTextNode(', ' + base));
    }
  }

  function fillLeadSummary(data) {
    if (!data.fullName) return;
    var ln = document.getElementById('lead-name');
    if (data.nome && ln) ln.textContent = ', ' + data.nome;
    ['fullName', 'email', 'telefono', 'materia'].forEach(function (id) {
      var node = document.getElementById(id);
      if (node) node.textContent = data[id === 'fullName' ? 'fullName' : id] || '—';
    });
  }

  function startCountdown(opts) {
    opts = opts || {};
    var spotWindowMin = opts.minutes || 60;
    var taken;
    try { taken = parseInt(localStorage.getItem(SPOT_KEY), 10); } catch (e) {}
    if (param('reset') !== null || !taken || isNaN(taken)) {
      taken = Date.now();
      try { localStorage.setItem(SPOT_KEY, String(taken)); } catch (e) {}
    }
    var deadline = taken + spotWindowMin * 60 * 1000;
    var wrapEl = document.getElementById(opts.wrapId || 'count-wrap');
    var clockEl = document.getElementById(opts.clockId || 'count-clock');
    var subEl = document.getElementById(opts.subId || 'count-sub');
    var bonusBox = document.getElementById(opts.boxId || 'pay-box');
    if (!clockEl) return;

    function tick() {
      var ms = deadline - Date.now();
      if (ms <= 0) {
        if (wrapEl) wrapEl.classList.add('count-expired');
        clockEl.textContent = 'Finestra scaduta';
        var lbl = document.querySelector('.count-label');
        if (lbl) lbl.textContent = 'Bonus riservati non più garantiti';
        if (subEl) subEl.textContent = 'I bonus riservati non sono più garantiti, ma il prezzo promo a 2.497 euro resta fino a giovedì alle 19. Puoi comunque iscriverti con l\'acconto o il deposito LIVE.';
        if (bonusBox) bonusBox.classList.add('dim');
        return;
      }
      var m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
      clockEl.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
      setTimeout(tick, 1000);
    }
    tick();
  }

  w.PROMO_THANKYOU = {
    loadBookingData: loadBookingData,
    promoDayIndex: promoDayIndex,
    rewardsForDay: rewardsForDay,
    renderBonusDay: renderBonusDay,
    renderRewardList: renderRewardList,
    renderRewardPersonal: renderRewardPersonal,
    fillLeadSummary: fillLeadSummary,
    startCountdown: startCountdown,
  };
})(window);
