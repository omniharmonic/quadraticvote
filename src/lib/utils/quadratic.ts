/**
 * Calculate quadratic votes from credit allocations
 * Formula: votes = √credits
 */
export function calculateQuadraticVotes(
  allocations: Record<string, number>
): Record<string, number> {
  const quadraticVotes: Record<string, number> = {};
  
  for (const [optionId, credits] of Object.entries(allocations)) {
    quadraticVotes[optionId] = Math.sqrt(credits);
  }
  
  return quadraticVotes;
}

/**
 * Aggregate votes across all voters
 */
export function aggregateVotes(
  allVotes: Array<{ allocations: Record<string, number> }>
): Record<string, number> {
  const totals: Record<string, number> = {};
  
  for (const vote of allVotes) {
    const quadraticVotes = calculateQuadraticVotes(vote.allocations);
    
    for (const [optionId, votes] of Object.entries(quadraticVotes)) {
      totals[optionId] = (totals[optionId] || 0) + votes;
    }
  }
  
  return totals;
}

/**
 * Calculate total credits from allocations
 */
export function getTotalCredits(allocations: Record<string, number>): number {
  return Object.values(allocations).reduce((sum, credits) => sum + credits, 0);
}

/**
 * Validate credit allocation against limit
 */
export function validateCreditLimit(
  allocations: Record<string, number>,
  maxCredits: number
): { valid: boolean; used: number; remaining: number } {
  const used = getTotalCredits(allocations);
  return {
    valid: used <= maxCredits,
    used,
    remaining: maxCredits - used,
  };
}

