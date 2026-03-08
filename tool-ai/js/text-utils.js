// /js/utils/text-utils.js

export function inferSpaces(s, wordDict) {
  // Algoritmo di splitting parole fuse (usane uno semplice, es: ricorsivo/DP)
  // Qui solo esempio banale, migliora secondo dizionario reale!
  // ...
  return s; // TODO: implementa logic
}

export function getSpokenPhone(numberString) {
  return numberString.replace(/\D/g, '')
    .split('')
    .map(n => ['zero','uno','due','tre','quattro','cinque','sei','sette','otto','nove'][Number(n)])
    .join(', ');
}

export function getSpokenEmail(email) {
  return email
    ? email.replace('@', ' chiocciola ').replace(/\./g, ' punto ')
    : '';
}
