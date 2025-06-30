export function extractReviewScore(output: string): number | null {
  const reviewMatch = output.match(/<REVIEW>(\d+(?:\.\d+)?)<\/REVIEW>/);
  if (reviewMatch && reviewMatch[1]) {
    return parseFloat(reviewMatch[1]);
  }
  return null;
}
