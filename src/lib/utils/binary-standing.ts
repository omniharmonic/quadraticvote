import type { BinaryDecisionConfig } from '@/lib/types';

/** Only the fields the standing calculation actually depends on. */
export type BinaryThresholdConfig = Pick<
  BinaryDecisionConfig,
  'threshold_mode' | 'top_n_count' | 'percentage_threshold' | 'absolute_vote_threshold'
>;

export interface OptionVotes {
  option_id: string;
  votes: number;
}

export interface OptionStanding {
  option_id: string;
  votes: number;
  rank: number;
  selected: boolean;
  /** True when an option is within `bubbleSize` of the selection cutoff. */
  onBubble: boolean;
}

/**
 * Compute the live standing (rank, selected, on-the-bubble) for a binary
 * selection event from current vote totals. This mirrors the server-side
 * selection logic in ResultService.calculateBinaryResults so the voting
 * UI's "currently selected" preview matches the eventual outcome.
 *
 * Pure and dependency-free so it can be reused on the client and unit tested.
 */
export function computeBinaryStanding(
  votes: OptionVotes[],
  config: BinaryThresholdConfig,
  bubbleSize = 1
): OptionStanding[] {
  const sorted = [...votes].sort((a, b) => b.votes - a.votes);
  const selected = new Set<string>();

  switch (config.threshold_mode) {
    case 'top_n': {
      const n = config.top_n_count ?? 0;
      sorted.slice(0, n).forEach((o) => selected.add(o.option_id));
      break;
    }
    case 'percentage': {
      const max = sorted[0]?.votes ?? 0;
      const threshold = max * ((config.percentage_threshold ?? 0) / 100);
      sorted.filter((o) => o.votes >= threshold && o.votes > 0).forEach((o) => selected.add(o.option_id));
      break;
    }
    case 'absolute_votes': {
      const threshold = config.absolute_vote_threshold ?? 0;
      sorted.filter((o) => o.votes >= threshold).forEach((o) => selected.add(o.option_id));
      break;
    }
    case 'above_average': {
      const avg = sorted.length
        ? sorted.reduce((s, o) => s + o.votes, 0) / sorted.length
        : 0;
      sorted.filter((o) => o.votes >= avg && o.votes > 0).forEach((o) => selected.add(o.option_id));
      break;
    }
  }

  // The cutoff is the lowest vote total among selected options; anything
  // un-selected within `bubbleSize` of it is "on the bubble".
  const selectedVotes = sorted.filter((o) => selected.has(o.option_id)).map((o) => o.votes);
  const cutoff = selectedVotes.length ? Math.min(...selectedVotes) : Infinity;

  return sorted.map((o, i) => {
    const isSelected = selected.has(o.option_id);
    return {
      option_id: o.option_id,
      votes: o.votes,
      rank: i + 1,
      selected: isSelected,
      onBubble:
        !isSelected &&
        cutoff !== Infinity &&
        o.votes > 0 &&
        cutoff - o.votes <= bubbleSize,
    };
  });
}
