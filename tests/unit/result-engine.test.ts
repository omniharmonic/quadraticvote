import { describe, it, expect } from 'vitest';
import {
  aggregateCredits,
  calculateGiniCoefficient,
  calculateBinaryResults,
  calculateProportionalResults,
} from '@/lib/utils/result-engine';
import type { Option, BinaryDecisionConfig, ProportionalDistributionConfig } from '@/lib/types';

const opt = (id: string, title: string, position = 0): Option =>
  ({ id, title, position } as unknown as Option);

const options = [opt('a', 'Alpha', 0), opt('b', 'Beta', 1), opt('c', 'Gamma', 2)];

describe('aggregateCredits', () => {
  it('sums raw credits per option across ballots', () => {
    const totals = aggregateCredits([
      { allocations: { a: 25, b: 16 } },
      { allocations: { a: 9 } },
      { allocations: {} },
    ]);
    expect(totals).toEqual({ a: 34, b: 16 });
  });

  it('ignores malformed values', () => {
    const totals = aggregateCredits([{ allocations: { a: NaN as any, b: 4 } }]);
    expect(totals.b).toBe(4);
    expect(totals.a).toBe(0);
  });
});

describe('calculateGiniCoefficient', () => {
  it('is 0 for perfect equality', () => {
    expect(calculateGiniCoefficient([100, 100, 100])).toBeCloseTo(0, 10);
  });

  it('approaches 1 for total concentration', () => {
    // n=4, all in one: gini = (n-1)/n = 0.75
    expect(calculateGiniCoefficient([0, 0, 0, 100])).toBeCloseTo(0.75, 10);
  });

  it('handles empty and all-zero inputs', () => {
    expect(calculateGiniCoefficient([])).toBe(0);
    expect(calculateGiniCoefficient([0, 0])).toBe(0);
  });
});

describe('calculateBinaryResults', () => {
  const topN: BinaryDecisionConfig = {
    threshold_mode: 'top_n',
    top_n_count: 2,
    tiebreaker: 'timestamp',
  };

  it('selects top N, ranks, and computes margin + vote share', () => {
    const r = calculateBinaryResults(topN, { a: 15, b: 14, c: 11 }, options, {
      a: 225, b: 196, c: 121,
    });
    expect(r.selected_options.map((o) => o.option_id)).toEqual(['a', 'b']);
    expect(r.not_selected_options.map((o) => o.option_id)).toEqual(['c']);
    expect(r.selection_margin).toBeCloseTo(3);
    expect(r.selected_options[0].rank).toBe(1);
    expect(r.selected_options[0].total_credits).toBe(225);
    // a: 15/40 = 37.5%
    expect(r.selected_options[0].percentage).toBeCloseTo(37.5);
  });

  it('breaks exact ties alphabetically when configured', () => {
    const cfg: BinaryDecisionConfig = {
      threshold_mode: 'top_n',
      top_n_count: 1,
      tiebreaker: 'alphabetical',
    };
    const shuffled = [opt('z', 'Zebra', 0), opt('m', 'Mango', 1), opt('ap', 'Apple', 2)];
    const r = calculateBinaryResults(cfg, { z: 9, m: 9, ap: 9 }, shuffled);
    expect(r.selected_options[0].title).toBe('Apple');
    expect([...r.selected_options, ...r.not_selected_options].map((o) => o.title)).toEqual([
      'Apple', 'Mango', 'Zebra',
    ]);
  });

  it('breaks exact ties by creation order for timestamp mode', () => {
    const r = calculateBinaryResults(topN, { a: 5, b: 5, c: 5 }, options);
    expect([...r.selected_options, ...r.not_selected_options].map((o) => o.option_id)).toEqual([
      'a', 'b', 'c',
    ]);
  });

  it('percentage mode selects relative to the max', () => {
    const cfg: BinaryDecisionConfig = {
      threshold_mode: 'percentage',
      percentage_threshold: 80,
      tiebreaker: 'timestamp',
    };
    // max 15 → threshold 12 → a, b
    const r = calculateBinaryResults(cfg, { a: 15, b: 14, c: 11 }, options);
    expect(r.selected_count).toBe(2);
  });

  it('absolute mode selects above the raw threshold', () => {
    const cfg: BinaryDecisionConfig = {
      threshold_mode: 'absolute_votes',
      absolute_vote_threshold: 12,
      tiebreaker: 'timestamp',
    };
    const r = calculateBinaryResults(cfg, { a: 15, b: 14, c: 11 }, options);
    expect(r.selected_options.map((o) => o.option_id).sort()).toEqual(['a', 'b']);
  });

  it('above_average selects options at or above the mean', () => {
    const cfg: BinaryDecisionConfig = {
      threshold_mode: 'above_average',
      tiebreaker: 'timestamp',
    };
    // mean of (15,14,1) = 10 → a, b
    const r = calculateBinaryResults(cfg, { a: 15, b: 14, c: 1 }, options);
    expect(r.selected_options.map((o) => o.option_id).sort()).toEqual(['a', 'b']);
  });

  it('throws on an unknown threshold mode', () => {
    expect(() =>
      calculateBinaryResults({ threshold_mode: 'bogus' } as any, {}, options)
    ).toThrow('Unknown threshold mode');
  });
});

describe('calculateProportionalResults', () => {
  const base: ProportionalDistributionConfig = {
    resource_name: 'USD',
    resource_symbol: '$',
    total_pool_amount: 100000,
  };

  it('splits the pool proportionally to quadratic votes', () => {
    const r = calculateProportionalResults(base, { a: 10, b: 10 }, options.slice(0, 2));
    expect(r.total_allocated).toBeCloseTo(100000);
    expect(r.distributions[0].allocation_amount).toBeCloseTo(50000);
    expect(r.gini_coefficient).toBeCloseTo(0, 6);
  });

  it('applies the minimum-allocation floor and normalizes back to the pool', () => {
    const cfg = {
      ...base,
      minimum_allocation_enabled: true,
      minimum_allocation_percentage: 30,
    };
    // raw shares: a = 10/11 (~90.9k), b = 1/11 (~9.1k) → b floored to 30k,
    // then both scaled so the total is exactly the pool.
    const r = calculateProportionalResults(cfg, { a: 10, b: 1 }, options.slice(0, 2));
    expect(r.total_allocated).toBeCloseTo(100000, 6);
    const small = r.distributions.find((d) => d.option_id === 'b')!;
    expect(small.allocation_amount).toBeGreaterThan(20000); // lifted well above 9.1k
    expect(small.allocation_amount).toBeLessThan(30000); // then normalized down
  });

  it('never floors zero-vote options', () => {
    const cfg = {
      ...base,
      minimum_allocation_enabled: true,
      minimum_allocation_percentage: 30,
    };
    const r = calculateProportionalResults(cfg, { a: 10, b: 0 }, options.slice(0, 2));
    expect(r.distributions.find((d) => d.option_id === 'b')!.allocation_amount).toBe(0);
  });

  it('zero votes + exclude → nothing allocated', () => {
    const r = calculateProportionalResults(base, {}, options);
    expect(r.total_allocated).toBe(0);
    expect(r.distributions.every((d) => d.allocation_amount === 0)).toBe(true);
  });

  it('zero votes + distribute_equally → pool split evenly', () => {
    const cfg = { ...base, zero_vote_handling: 'distribute_equally' as const };
    const r = calculateProportionalResults(cfg, {}, options);
    expect(r.total_allocated).toBeCloseTo(100000);
    expect(r.distributions[0].allocation_amount).toBeCloseTo(100000 / 3);
  });

  it('sorts distributions by allocation descending', () => {
    const r = calculateProportionalResults(base, { a: 1, b: 5, c: 3 }, options);
    expect(r.distributions.map((d) => d.option_id)).toEqual(['b', 'c', 'a']);
  });
});
