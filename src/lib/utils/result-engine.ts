// Pure result-calculation engine for both decision frameworks.
//
// Extracted from ResultService so the riskiest logic in the product — the
// code that turns ballots into outcomes — is dependency-free and unit
// tested (see tests/unit/result-engine.test.ts). ResultService delegates
// here after loading rows from the database.

import type {
  BinaryResults,
  ProportionalResults,
  Option,
  BinaryDecisionConfig,
  ProportionalDistributionConfig,
  OptionWithVotes,
  BinaryOptionResult,
  Distribution,
} from '@/lib/types';

/**
 * Sum raw credits allocated to each option across all ballots.
 * (Quadratic votes are √credits; this keeps the pre-root credits for
 * reporting/exports.)
 */
export function aggregateCredits(
  ballots: Array<{ allocations: Record<string, number> }>
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const ballot of ballots) {
    for (const [optionId, credits] of Object.entries(ballot.allocations || {})) {
      totals[optionId] = (totals[optionId] || 0) + (Number(credits) || 0);
    }
  }
  return totals;
}

/**
 * Gini coefficient of a set of allocations.
 * 0 = perfectly equal, approaching 1 = fully concentrated.
 */
export function calculateGiniCoefficient(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = values.slice().sort((a, b) => a - b);
  const n = sorted.length;
  const total = sorted.reduce((sum, val) => sum + val, 0);

  if (total === 0) return 0;

  let numerator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i + 1) * sorted[i];
  }

  return (2 * numerator) / (n * total) - (n + 1) / n;
}

/**
 * Binary selection: rank options, apply the configured threshold mode, and
 * report selected/not-selected with rank, vote share, and selection margin.
 */
export function calculateBinaryResults(
  config: BinaryDecisionConfig,
  voteTotals: Record<string, number>,
  eventOptions: Option[],
  creditTotals: Record<string, number> = {}
): BinaryResults {
  // Capture position so ties can fall back to creation order for the
  // 'timestamp' tiebreaker.
  const optionsWithVotes: Array<OptionWithVotes & { position: number }> = eventOptions.map(
    (opt, idx) => ({
      option_id: opt.id,
      title: opt.title,
      votes: voteTotals[opt.id] || 0,
      total_credits: creditTotals[opt.id] || 0,
      position: (opt as any).position ?? idx,
    })
  );

  // Sort by votes descending, breaking exact ties per the configured rule:
  // 'alphabetical' by title, otherwise ('timestamp') by creation order.
  const tiebreaker = config.tiebreaker ?? 'timestamp';
  const sorted = optionsWithVotes.sort((a, b) => {
    if (b.votes !== a.votes) return b.votes - a.votes;
    if (tiebreaker === 'alphabetical') return a.title.localeCompare(b.title);
    return a.position - b.position;
  });
  const grandTotalVotes = sorted.reduce((sum, o) => sum + o.votes, 0);

  // Determine selected options based on threshold mode
  let selectedOptionIds: Set<string>;
  let selectionMargin: number | undefined;

  switch (config.threshold_mode) {
    case 'top_n':
      selectedOptionIds = new Set(
        sorted.slice(0, config.top_n_count).map(o => o.option_id)
      );
      // Margin between last selected and first not selected
      if (sorted.length > config.top_n_count!) {
        selectionMargin =
          sorted[config.top_n_count! - 1].votes - sorted[config.top_n_count!].votes;
      }
      break;

    case 'percentage': {
      const maxVotes = sorted[0]?.votes || 0;
      const threshold = maxVotes * (config.percentage_threshold! / 100);
      selectedOptionIds = new Set(
        sorted.filter(o => o.votes >= threshold).map(o => o.option_id)
      );
      break;
    }

    case 'absolute_votes':
      selectedOptionIds = new Set(
        sorted.filter(o => o.votes >= config.absolute_vote_threshold!).map(o => o.option_id)
      );
      break;

    case 'above_average': {
      const avgVotes = sorted.reduce((sum, o) => sum + o.votes, 0) / sorted.length;
      selectedOptionIds = new Set(
        sorted.filter(o => o.votes >= avgVotes).map(o => o.option_id)
      );
      break;
    }

    default:
      throw new Error('Unknown threshold mode');
  }

  // Add selection status, rank, and vote share to each option
  const results: BinaryOptionResult[] = sorted.map((opt, index) => ({
    ...opt,
    rank: index + 1,
    selected: selectedOptionIds.has(opt.option_id),
    percentage: grandTotalVotes > 0 ? (opt.votes / grandTotalVotes) * 100 : 0,
  }));

  const selectedOptions = results.filter(r => r.selected);
  const notSelectedOptions = results.filter(r => !r.selected);

  return {
    framework_type: 'binary_selection',
    threshold_mode: config.threshold_mode,
    selected_options: selectedOptions,
    not_selected_options: notSelectedOptions,
    selected_count: selectedOptions.length,
    selection_margin: selectionMargin,
  };
}

/**
 * Proportional distribution: split the pool by quadratic-vote share, apply
 * the optional minimum-allocation floor (normalizing if the floors
 * over-allocate), and report the distribution with a Gini coefficient.
 */
export function calculateProportionalResults(
  config: ProportionalDistributionConfig,
  voteTotals: Record<string, number>,
  eventOptions: Option[]
): ProportionalResults {
  const totalVotes = Object.values(voteTotals).reduce((sum, v) => sum + v, 0);

  if (totalVotes === 0) {
    // No votes yet. With 'distribute_equally', split the pool evenly so it's
    // fully allocated; otherwise ('exclude', default) everyone gets zero.
    const equalSplit =
      config.zero_vote_handling === 'distribute_equally' && eventOptions.length > 0;
    const each = equalSplit ? config.total_pool_amount / eventOptions.length : 0;
    return {
      framework_type: 'proportional_distribution',
      resource_name: config.resource_name,
      resource_symbol: config.resource_symbol,
      total_pool: config.total_pool_amount,
      distributions: eventOptions.map(opt => ({
        option_id: opt.id,
        title: opt.title,
        votes: 0,
        allocation_amount: each,
        allocation_percentage: equalSplit ? 100 / eventOptions.length : 0,
      })),
      total_allocated: equalSplit ? config.total_pool_amount : 0,
      gini_coefficient: 0,
    };
  }

  // Initial proportional distributions
  let distributions: Distribution[] = eventOptions.map(opt => {
    const voteCount = voteTotals[opt.id] || 0;
    const percentage = voteCount / totalVotes;
    const allocation = percentage * config.total_pool_amount;

    return {
      option_id: opt.id,
      title: opt.title,
      votes: voteCount,
      allocation_amount: allocation,
      allocation_percentage: percentage * 100,
    };
  });

  // Apply minimum allocation floor if enabled
  if (config.minimum_allocation_enabled && config.minimum_allocation_percentage) {
    const minAllocation =
      (config.minimum_allocation_percentage / 100) * config.total_pool_amount;

    for (const dist of distributions) {
      if (dist.votes > 0 && dist.allocation_amount < minAllocation) {
        dist.allocation_amount = minAllocation;
      }
    }
  }

  // Normalize if over-allocated due to minimums
  const totalAllocated = distributions.reduce((sum, d) => sum + d.allocation_amount, 0);

  if (totalAllocated > config.total_pool_amount) {
    const normalizationFactor = config.total_pool_amount / totalAllocated;
    distributions = distributions.map(d => ({
      ...d,
      allocation_amount: d.allocation_amount * normalizationFactor,
      allocation_percentage:
        (d.allocation_amount * normalizationFactor / config.total_pool_amount) * 100,
    }));
  }

  // Sort by allocation descending
  distributions.sort((a, b) => b.allocation_amount - a.allocation_amount);

  const gini = calculateGiniCoefficient(distributions.map(d => d.allocation_amount));

  return {
    framework_type: 'proportional_distribution',
    resource_name: config.resource_name,
    resource_symbol: config.resource_symbol,
    total_pool: config.total_pool_amount,
    distributions: distributions,
    total_allocated: distributions.reduce((sum, d) => sum + d.allocation_amount, 0),
    gini_coefficient: gini,
  };
}
