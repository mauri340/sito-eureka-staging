/**
 * Master Eureka — Campagna Estate · config condivisa (landing, grazie, post-pagamento).
 *
 * Stripe acconto 500€:
 *   TEST (staging / locale): https://buy.stripe.com/test_6oUbJ1eqo4GG51QbwLbwk02
 *   LIVE (produzione):       https://buy.stripe.com/14AfZh964ehg51Q1Wbbwk05
 *
 * Success URL nel dashboard Stripe (Payment Link test):
 *   https://staging.apprendimentorapido.it/master-eureka-promo/iscrizione-completata.html
 */
(function (w) {
  var STRIPE_ACCONTO_TEST = 'https://buy.stripe.com/test_6oUbJ1eqo4GG51QbwLbwk02';
  var STRIPE_ACCONTO_LIVE = 'https://buy.stripe.com/14AfZh964ehg51Q1Wbbwk05';

  var host = (w.location && w.location.hostname) || '';
  var isProduction =
    host === 'apprendimentorapido.it' || host === 'www.apprendimentorapido.it';

  w.MASTER_EUREKA_PROMO = {
    apiEndpoint: 'https://api.apprendimentorapido.it/api/webhook/contact',
    listaName: 'promozione master eureka estiva',
    landingId: 'master-eureka-promo-estiva',
    isProduction: isProduction,
    redirects: {
      grazie: '/master-eureka-promo/grazie.html',
      iscrizioneCompletata: '/master-eureka-promo/iscrizione-completata.html',
    },
    stripe: {
      accontoUrl: isProduction ? STRIPE_ACCONTO_LIVE : STRIPE_ACCONTO_TEST,
      accontoUrlTest: STRIPE_ACCONTO_TEST,
      accontoUrlLive: STRIPE_ACCONTO_LIVE,
      successUrl: isProduction
        ? 'https://apprendimentorapido.it/master-eureka-promo/iscrizione-completata.html'
        : 'https://staging.apprendimentorapido.it/master-eureka-promo/iscrizione-completata.html',
    },
    storageKeys: {
      booking: 'masterEurekaPromoBooking',
      spotTaken: 'masterEurekaSpotTaken',
      accontoBeacon: 'masterEurekaAccontoBeaconSent',
    },
  };
})(window);
