/**
 * Pass Metodo €497 — config condivisa (landing + thank you).
 * Aggiorna listaId dopo: python seed_pass_metodo_list.py --apply
 */
(function (global) {
  var host = (global.location && global.location.hostname) || "";
  var isStaging =
    host.indexOf("staging.") === 0 ||
    (global.location && global.location.search.indexOf("staging=1") > -1);

  global.PASS_METODO = {
    apiEndpoint: "https://api.apprendimentorapido.it/api/webhook/contact",
    condizioniPath: "/pass-metodo/condizioni-vendita.html",
    listaName: "Corso Metodo Online — €497",
    /** Impostato da seed_pass_metodo_list.py — fallback: nome lista */
    listaId: "c1730b6c-b1ce-40dc-b320-7f4584508fd1",
    sourceGrazie: "pass-metodo-grazie",
    sourceStripeBeacon: "pass-metodo-stripe-success",
    storageKeys: {
      purchaseBeacon: "passMetodoStripeBeaconSent",
      activationDone: "passMetodoActivationSubmitted",
    },
    isStaging: isStaging,
  };
})(typeof window !== "undefined" ? window : globalThis);
