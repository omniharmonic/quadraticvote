import 'server-only';
import { lazyServiceRoleClient } from '@/lib/supabase';

const supabase = lazyServiceRoleClient();
import { aggregateVotes } from '@/lib/utils/quadratic';
import {
  aggregateCredits,
  calculateBinaryResults,
  calculateProportionalResults,
} from '@/lib/utils/result-engine';
import type {
  EventResults,
  BinaryResults,
  ProportionalResults,
  Option,
} from '@/lib/types';

export class ResultService {
  /**
   * Get results for an event.
   *
   * While voting is open, results are recomputed from ballots on every read.
   * Once the event closes, the FIRST read freezes the tally into the
   * result_snapshots table and every subsequent read serves that snapshot —
   * so the outcome people cite is immutable and reproducible. A late ballot
   * (events with allowLateSubmissions) invalidates the snapshot via
   * invalidateSnapshot(), and the next read re-freezes.
   */
  async getResults(eventId: string): Promise<EventResults> {
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) throw new Error('Event not found');

    const closed = this.isEventClosed(event);

    if (closed) {
      const { data: snapshot } = await supabase
        .from('result_snapshots')
        .select('results')
        .eq('event_id', eventId)
        .maybeSingle();

      if (snapshot?.results) {
        return snapshot.results as EventResults;
      }
    }

    const results = await this.calculateResults(eventId, event);

    if (closed) {
      // Freeze the final tally. Upsert (not insert) so two concurrent first
      // reads can't fail on the unique constraint.
      const { error: snapError } = await supabase
        .from('result_snapshots')
        .upsert(
          {
            event_id: eventId,
            results: results as any,
            finalized_at: new Date().toISOString(),
          },
          { onConflict: 'event_id' }
        );
      if (snapError) {
        // Snapshot failure should never block serving results.
        console.error('Failed to store result snapshot:', snapError.message);
      }
    }

    return results;
  }

  /**
   * Drop the frozen snapshot for an event. Called when a ballot is accepted
   * after close (allowLateSubmissions) so the next read re-freezes.
   */
  async invalidateSnapshot(eventId: string): Promise<void> {
    const { error } = await supabase
      .from('result_snapshots')
      .delete()
      .eq('event_id', eventId);
    if (error) {
      console.error('Failed to invalidate result snapshot:', error.message);
    }
  }

  /**
   * Calculate results from scratch (pure math lives in result-engine).
   */
  private async calculateResults(eventId: string, event: any): Promise<EventResults> {
    const { data: eventOptions } = await supabase
      .from('options')
      .select('*')
      .eq('event_id', eventId);

    const { data: allVotes } = await supabase
      .from('votes')
      .select('*')
      .eq('event_id', eventId);

    const ballots = (allVotes || []).map(v => ({ allocations: v.allocations as Record<string, number> }));
    const voteTotals = aggregateVotes(ballots);
    const creditTotals = aggregateCredits(ballots);

    const framework = (event.decision_framework as any)?.framework_type;
    const config = (event.decision_framework as any)?.config;

    let frameworkResults: BinaryResults | ProportionalResults;

    if (framework === 'binary_selection') {
      frameworkResults = calculateBinaryResults(
        config,
        voteTotals,
        eventOptions as Option[],
        creditTotals
      );
    } else if (framework === 'proportional_distribution') {
      frameworkResults = calculateProportionalResults(
        config,
        voteTotals,
        eventOptions as Option[]
      );
    } else {
      throw new Error('Unknown framework type');
    }

    return {
      event_id: eventId,
      framework_type: framework,
      results: frameworkResults,
      participation: {
        total_voters: (allVotes || []).length,
        total_credits_allocated: (allVotes || []).reduce((sum, v) => sum + v.total_credits_used, 0),
        voting_start: event.start_time,
        voting_end: event.end_time,
        is_final: this.isEventClosed(event),
      },
      calculated_at: new Date(),
    };
  }

  /**
   * Check if event is closed
   */
  private isEventClosed(event: any): boolean {
    return new Date() > new Date(event.end_time);
  }
}

export const resultService = new ResultService();
