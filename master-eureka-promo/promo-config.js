/**
 * Master Eureka — Campagna Estate · config condivisa (landing, grazie, post-pagamento).
 *
 * Stripe acconto 500€:
 *   TEST: https://buy.stripe.com/test_6oUbJ1eqo4GG51QbwLbwk02
 *   LIVE: https://buy.stripe.com/14AfZh964ehg51Q1Wbbwk05
 *   Success URL: …/iscrizione-completata.html
 *
 * Stripe caparra 50€ (LIVE Zoom):
 *   TEST: https://buy.stripe.com/test_8x2aEXbec4GG79Y44jbwk03
 *   LIVE: (da impostare quando pronto)
 *   Success URL: …/caparra-completata.html
 */
(function (w) {
  var STRIPE_ACCONTO_TEST = 'https://buy.stripe.com/test_6oUbJ1eqo4GG51QbwLbwk02';
  var STRIPE_ACCONTO_LIVE = 'https://buy.stripe.com/14AfZh964ehg51Q1Wbbwk05';
  var STRIPE_CAPARRA_TEST = 'https://buy.stripe.com/test_8x2aEXbec4GG79Y44jbwk03';
  var STRIPE_CAPARRA_LIVE = '';

  var host = (w.location && w.location.hostname) || '';
  var isProduction =
    host === 'apprendimentorapido.it' || host === 'www.apprendimentorapido.it';
  var stagingBase = 'https://staging.apprendimentorapido.it/master-eureka-promo/';
  var prodBase = 'https://apprendimentorapido.it/master-eureka-promo/';
  var base = isProduction ? prodBase : stagingBase;

  w.MASTER_EUREKA_PROMO = {
    apiEndpoint: 'https://api.apprendimentorapido.it/api/webhook/contact',
    listaName: 'promozione master eureka estiva',
    landingId: 'master-eureka-promo-estiva',
    isProduction: isProduction,
    redirects: {
      grazie: '/master-eureka-promo/grazie.html',
      opzione2: '/master-eureka-promo/opzione-2.html',
      opzione3: '/master-eureka-promo/opzione-3.html',
      iscrizioneCompletata: '/master-eureka-promo/iscrizione-completata.html',
      caparraCompletata: '/master-eureka-promo/caparra-completata.html',
    },
    live: {
      label: 'Mercoledì 8 luglio 2026 · ore 21:00',
      zoomMeetingId: '81357612138',
      zoomUrl: '',
    },
    stripe: {
      accontoUrl: isProduction ? STRIPE_ACCONTO_LIVE : STRIPE_ACCONTO_TEST,
      accontoUrlTest: STRIPE_ACCONTO_TEST,
      accontoUrlLive: STRIPE_ACCONTO_LIVE,
      accontoSuccessUrl: base + 'iscrizione-completata.html',
      caparraUrl: isProduction && STRIPE_CAPARRA_LIVE ? STRIPE_CAPARRA_LIVE : STRIPE_CAPARRA_TEST,
      caparraUrlTest: STRIPE_CAPARRA_TEST,
      caparraUrlLive: STRIPE_CAPARRA_LIVE,
      caparraSuccessUrl: base + 'caparra-completata.html',
      successUrl: base + 'iscrizione-completata.html',
    },
    storageKeys: {
      booking: 'masterEurekaPromoBooking',
      spotTaken: 'masterEurekaSpotTaken',
      accontoBeacon: 'masterEurekaAccontoBeaconSent',
      caparraBeacon: 'masterEurekaCaparraBeaconSent',
    },
  };
})(window);
