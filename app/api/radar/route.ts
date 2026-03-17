import { NextResponse } from 'next/server';
import { ingestMockSignals } from '@/lib/mock-ingestion';
import { scoreSignals } from '@/lib/mock-scoring';
import { synthesizeDailyBrief } from '@/lib/mock-synthesis';

export async function GET() {
  const signals = await ingestMockSignals();
  const scores = scoreSignals(signals);
  const brief = synthesizeDailyBrief(signals, scores);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    signals,
    scores,
    brief
  });
}
