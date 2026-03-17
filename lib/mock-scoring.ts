import { RelevanceScore, Signal } from './types';

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function scoreSignals(signals: Signal[]): RelevanceScore[] {
  return signals
    .map((signal) => {
      let relevance = clamp(
        signal.strategicAlignmentScore * 0.25 +
          signal.operationalImpactScore * 0.2 +
          signal.timingScore * 0.2 +
          signal.actionabilityScore * 0.15 +
          signal.noveltyScore * 0.1 +
          signal.credibilityScore * 0.1
      );

      let suppression = clamp(
        signal.emotionalIntensityScore * 0.45 +
          signal.hypeScore * 0.35 +
          (1 - signal.strategicAlignmentScore) * 0.2
      );

      if (signal.normalized?.kind === 'calendar') {
        const longestOpenBlock = Math.max(
          ...signal.normalized.openBlocks.map((block) => block.durationMinutes),
          0
        );
        const pressureMinutes = signal.normalized.busyMinutes;
        const openBoost = Math.min(longestOpenBlock / 180, 1) * 0.08;
        const pressureBoost = Math.min(pressureMinutes / 300, 1) * 0.05;
        const availabilityPenalty = signal.normalized.status === 'unavailable' ? 0.18 : 0;

        relevance = clamp(relevance + openBoost + pressureBoost - availabilityPenalty);
        suppression = clamp(suppression + availabilityPenalty * 0.5);
      }

      const finalScore = Math.round(clamp(relevance - suppression * 0.65) * 100);
      const suppressed = suppression > 0.65 || finalScore < 35;
      const calendarContext =
        signal.normalized?.kind === 'calendar'
          ? ` openBlocks=${signal.normalized.openBlocks.length} pressureBlocks=${signal.normalized.pressureBlocks.length} status=${signal.normalized.status}`
          : '';

      return {
        signalId: signal.id,
        relevance: Number(relevance.toFixed(3)),
        suppression: Number(suppression.toFixed(3)),
        finalScore,
        suppressed,
        rationale: `relevance=${relevance.toFixed(2)} suppression=${suppression.toFixed(2)} final=${finalScore}${calendarContext}`
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore);
}
