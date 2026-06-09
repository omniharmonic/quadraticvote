import { describe, it, expect } from 'vitest';
import { computeBinaryStanding, type BinaryThresholdConfig } from '@/lib/utils/binary-standing';

const votes = [
  { option_id: 'a', votes: 15 },
  { option_id: 'b', votes: 14 },
  { option_id: 'c', votes: 11 },
  { option_id: 'd', votes: 2 },
];

describe('computeBinaryStanding', () => {
  it('ranks by votes descending and selects top_n', () => {
    const cfg: BinaryThresholdConfig = { threshold_mode: 'top_n', top_n_count: 2 };
    const s = computeBinaryStanding(votes, cfg);
    expect(s.map((x) => x.option_id)).toEqual(['a', 'b', 'c', 'd']);
    expect(s.find((x) => x.option_id === 'a')!.selected).toBe(true);
    expect(s.find((x) => x.option_id === 'b')!.selected).toBe(true);
    expect(s.find((x) => x.option_id === 'c')!.selected).toBe(false);
    expect(s.find((x) => x.option_id === 'a')!.rank).toBe(1);
  });

  it('flags the option just below the cutoff as on the bubble', () => {
    // cutoff = lowest selected = 14 (b). c has 11 → gap 3, not bubble at size 1.
    const cfg: BinaryThresholdConfig = { threshold_mode: 'top_n', top_n_count: 2 };
    const close = [
      { option_id: 'a', votes: 15 },
      { option_id: 'b', votes: 14 },
      { option_id: 'c', votes: 13.5 }, // gap 0.5 from cutoff → on the bubble
    ];
    const s = computeBinaryStanding(close, cfg);
    expect(s.find((x) => x.option_id === 'c')!.onBubble).toBe(true);
    expect(s.find((x) => x.option_id === 'c')!.selected).toBe(false);
  });

  it('selects by percentage of the max', () => {
    const cfg: BinaryThresholdConfig = { threshold_mode: 'percentage', percentage_threshold: 80 };
    // max=15, threshold=12 → a(15),b(14) selected, c(11),d(2) not
    const s = computeBinaryStanding(votes, cfg);
    expect(s.filter((x) => x.selected).map((x) => x.option_id).sort()).toEqual(['a', 'b']);
  });

  it('selects by absolute vote threshold', () => {
    const cfg: BinaryThresholdConfig = { threshold_mode: 'absolute_votes', absolute_vote_threshold: 11 };
    const s = computeBinaryStanding(votes, cfg);
    expect(s.filter((x) => x.selected).map((x) => x.option_id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('selects options at or above the average', () => {
    const cfg: BinaryThresholdConfig = { threshold_mode: 'above_average' };
    // avg = (15+14+11+2)/4 = 10.5 → a,b,c selected
    const s = computeBinaryStanding(votes, cfg);
    expect(s.filter((x) => x.selected).map((x) => x.option_id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('never selects zero-vote options', () => {
    const cfg: BinaryThresholdConfig = { threshold_mode: 'above_average' };
    const allZero = [
      { option_id: 'a', votes: 0 },
      { option_id: 'b', votes: 0 },
    ];
    const s = computeBinaryStanding(allZero, cfg);
    expect(s.every((x) => !x.selected)).toBe(true);
  });
});
