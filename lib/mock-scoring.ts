import { RelevanceScore, Signal } from './types';

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function scoreSignals(signals: Signal[]): RelevanceScore[] {
  return signals
    .map((signal) => {
      const relevance = clamp(
        signal.strategicAlignmentScore * 0.25 +
          signal.operationalImpactScore * 0.2 +
          signal.timingScore * 0.2 +
          signal.actionabilityScore * 0.15 +
          signal.noveltyScore * 0.1 +
          signal.credibilityScore * 0.1
      );

      const suppression = clamp(
        signal.emotionalIntensityScore * 0.45 +
          signal.hypeScore * 0.35 +
          (1 - signal.strategicAlignmentScore) * 0.2
      );

      const finalScore = Math.round(clamp(relevance - suppression * 0.65) * 100);
      const suppressed = suppression > 0.65 || finalScore < 35;

      return {
        signalId: signal.id,
        relevance: Number(relevance.toFixed(3)),
        suppression: Number(suppression.toFixed(3)),
        finalScore,
        suppressed,
        rationale: `relevance=${relevance.toFixed(2)} suppression=${suppression.toFixed(2)} final=${finalScore}`
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore);
}
