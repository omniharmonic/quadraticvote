import { describe, it, expect } from 'vitest';

// Simple quadratic vote calculation tests
describe('Quadratic Voting Calculations', () => {
  // Test the core quadratic math: cost = votes^2
  const calculateCreditsForVotes = (votes: number) => votes * votes;
  const calculateVotesFromCredits = (credits: number) => Math.sqrt(credits);

  it('should calculate credits correctly for votes', () => {
    expect(calculateCreditsForVotes(1)).toBe(1);
    expect(calculateCreditsForVotes(2)).toBe(4);
    expect(calculateCreditsForVotes(3)).toBe(9);
    expect(calculateCreditsForVotes(10)).toBe(100);
  });

  it('should calculate votes correctly from credits', () => {
    expect(calculateVotesFromCredits(1)).toBe(1);
    expect(calculateVotesFromCredits(4)).toBe(2);
    expect(calculateVotesFromCredits(9)).toBe(3);
    expect(calculateVotesFromCredits(100)).toBe(10);
  });

  it('should handle zero credits', () => {
    expect(calculateVotesFromCredits(0)).toBe(0);
  });

  it('should demonstrate quadratic voting principle', () => {
    // With 100 credits, different allocation strategies
    const allIn = calculateVotesFromCredits(100); // 10 votes on one option
    const split2 = calculateVotesFromCredits(50) * 2; // ~14.14 votes across 2
    const split4 = calculateVotesFromCredits(25) * 4; // 20 votes across 4
    
    // Splitting gives more total votes but less concentrated power
    expect(allIn).toBe(10);
    expect(split2).toBeCloseTo(14.14, 1);
    expect(split4).toBe(20);
  });
});
