// quiz-utils.js
export function calcolaRisultati({ wordCount, readingTimeSec, comprehensionScore }) {
  const safeTime = Math.max(readingTimeSec, 3);
  const pam = wordCount / (safeTime / 60);
  const weightedPam = (pam * comprehensionScore) / 100;
  const minutes = Math.floor(safeTime / 60);
  const seconds = Math.round(safeTime % 60);
  return {
    pam: Math.round(pam),
    weightedPam: Math.round(weightedPam),
    readingTimeFormatted: `${minutes} min e ${seconds} sec`,
    comprehensionScore
  };
}