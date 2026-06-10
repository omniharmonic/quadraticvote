import { describe, it, expect } from 'vitest';
import { computeVoterClusters } from '@/lib/utils/voter-clusters';

const optionIds = ['a', 'b', 'c'];

const ballot = (id: string, allocations: Record<string, number>) => ({
  id,
  allocations,
  totalCredits: Object.values(allocations).reduce((s, c) => s + c, 0),
});

describe('computeVoterClusters', () => {
  it('returns empty for no ballots or no options', () => {
    expect(computeVoterClusters([], optionIds)).toEqual([]);
    expect(computeVoterClusters([ballot('v1', { a: 10 })], [])).toEqual([]);
  });

  it('drops empty ballots', () => {
    const pts = computeVoterClusters(
      [ballot('v1', { a: 10 }), ballot('v2', {}), ballot('v3', { a: 0, b: 0 })],
      optionIds
    );
    expect(pts.map((p) => p.id)).toEqual(['v1']);
  });

  it('places identical ballots at the same coordinates', () => {
    const pts = computeVoterClusters(
      [ballot('v1', { a: 50, b: 50 }), ballot('v2', { a: 50, b: 50 }), ballot('v3', { a: 25, b: 25 })],
      optionIds
    );
    // v3 has the same *shape* (normalized) as v1/v2, so all three coincide.
    expect(pts[0].x).toBeCloseTo(pts[1].x, 6);
    expect(pts[0].y).toBeCloseTo(pts[1].y, 6);
    expect(pts[0].x).toBeCloseTo(pts[2].x, 6);
  });

  it('separates opposing voting blocs into different clusters', () => {
    const blocA = [
      ballot('a1', { a: 100 }),
      ballot('a2', { a: 81, b: 4 }),
      ballot('a3', { a: 90 }),
    ];
    const blocC = [
      ballot('c1', { c: 100 }),
      ballot('c2', { c: 81, b: 4 }),
      ballot('c3', { c: 90 }),
    ];
    const pts = computeVoterClusters([...blocA, ...blocC], optionIds);
    const clusterOf = (id: string) => pts.find((p) => p.id === id)!.cluster;

    // Same bloc → same cluster; different blocs → different clusters.
    expect(clusterOf('a1')).toBe(clusterOf('a2'));
    expect(clusterOf('a2')).toBe(clusterOf('a3'));
    expect(clusterOf('c1')).toBe(clusterOf('c2'));
    expect(clusterOf('a1')).not.toBe(clusterOf('c1'));
  });

  it('is deterministic across runs', () => {
    const ballots = [
      ballot('v1', { a: 100 }),
      ballot('v2', { b: 100 }),
      ballot('v3', { c: 100 }),
      ballot('v4', { a: 50, b: 50 }),
      ballot('v5', { a: 30, b: 30, c: 30 }),
      ballot('v6', { c: 81, b: 16 }),
    ];
    const run1 = computeVoterClusters(ballots, optionIds);
    const run2 = computeVoterClusters(ballots, optionIds);
    expect(run1).toEqual(run2);
  });

  it('carries total credits through for dot sizing', () => {
    const pts = computeVoterClusters([ballot('v1', { a: 36, b: 13 })], optionIds);
    expect(pts[0].total_credits).toBe(49);
  });
});
