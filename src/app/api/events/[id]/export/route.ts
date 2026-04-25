import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { resultService } from '@/lib/services/result.service';
import { withAuth } from '@/lib/utils/auth-middleware';

// Force this route to be dynamic (not pre-rendered during build)
export const dynamic = 'force-dynamic';

/**
 * GET /api/events/[id]/export
 * Export event results as CSV for Gnosis Safe batch transactions
 */
export const GET = withAuth(async (
  request: NextRequest,
  { params }: { params: { id: string } },
  user
) => {
  try {
    const eventId = params.id;
    const format = request.nextUrl.searchParams.get('format') || 'gnosis';

    // Get event details
    const supabase = createServiceRoleClient();
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Get results
    const results = await resultService.getResults(eventId);

    // Get proposals with payout addresses if community proposals
    let payoutData: any[] = [];
    if (event.option_mode === 'community_proposals') {
      const { data: proposals } = await supabase
        .from('proposals')
        .select('id, title, payout_wallet, submitter_wallet')
        .eq('event_id', eventId)
        .eq('status', 'approved');

      if (proposals) {
        payoutData = proposals;
      }
    }

    // Format based on decision framework
    const framework = event.decision_framework?.framework_type;

    if (format === 'gnosis') {
      // Gnosis Safe CSV format: recipient,amount,token_address
      const csv = formatGnosisCSV(results, payoutData, event);

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="gnosis-batch-${eventId}.csv"`,
        },
      });
    } else if (format === 'standard') {
      // Standard results CSV
      const csv = formatStandardCSV(results, event);

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="results-${eventId}.csv"`,
        },
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid format. Use ?format=gnosis or ?format=standard' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export results' },
      { status: 500 }
    );
  }
});

function formatGnosisCSV(results: any, payoutData: any[], event: any): string {
  const lines: string[] = [];

  // Header for Gnosis Safe CSV Airdrop format
  lines.push('token_type,token_address,receiver,amount');

  const framework = event.decision_framework?.framework_type;
  const frameworkResults = results.results;

  if (framework === 'proportional_distribution' && frameworkResults?.distributions) {
    // For proportional distribution, calculate amounts based on vote share
    const totalPool = frameworkResults.total_pool || 0;

    // Map distributions to payouts
    frameworkResults.distributions.forEach((distribution: any) => {
      // Find matching proposal for payout address
      const proposal = payoutData.find(p =>
        p.title === distribution.title || p.title === distribution.option_title || p.id === distribution.option_id
      );

      if (proposal && proposal.payout_wallet) {
        const amount = distribution.allocation_amount || distribution.amount || 0;
        if (amount > 0) {
          // Format: erc20,token_address,receiver,amount
          // Using placeholder token address - should be configured per event
          lines.push(`erc20,0x0000000000000000000000000000000000000000,${proposal.payout_wallet},${amount.toFixed(2)}`);
        }
      }
    });
  } else if (framework === 'binary_selection' && frameworkResults?.selected_options) {
    // For binary selection, only selected options get payout
    const selectedOptions = frameworkResults.selected_options || [];
    const amountPerWinner = event.decision_framework?.config?.amount_per_winner || 1000; // Default amount if not specified

    selectedOptions.forEach((option: any) => {
      const proposal = payoutData.find(p =>
        p.title === option.title || p.id === option.option_id
      );

      if (proposal && proposal.payout_wallet) {
        lines.push(`erc20,0x0000000000000000000000000000000000000000,${proposal.payout_wallet},${amountPerWinner}`);
      }
    });
  }

  return lines.join('\n');
}

function formatStandardCSV(results: any, event: any): string {
  const lines: string[] = [];
  const frameworkResults = results.results;
  const framework = results.framework_type;

  // Header
  lines.push('rank,option,votes,credits,percentage,status');

  // Handle different framework types
  if (framework === 'binary_selection' && frameworkResults?.selected_options) {
    // Combine selected and not_selected options
    const allOptions = [
      ...frameworkResults.selected_options.map((o: any) => ({ ...o, selected: true })),
      ...frameworkResults.not_selected_options.map((o: any) => ({ ...o, selected: false }))
    ];

    // Sort by credits
    allOptions.sort((a, b) => b.total_credits - a.total_credits);

    allOptions.forEach((option: any, index: number) => {
      lines.push([
        index + 1,
        `"${option.title}"`,
        option.total_votes,
        option.total_credits,
        `${option.percentage.toFixed(2)}%`,
        option.selected ? 'selected' : 'not_selected'
      ].join(','));
    });
  } else if (framework === 'proportional_distribution' && frameworkResults?.distributions) {
    frameworkResults.distributions.forEach((dist: any, index: number) => {
      lines.push([
        index + 1,
        `"${dist.option_title}"`,
        dist.total_votes,
        dist.total_credits,
        `${dist.percentage.toFixed(2)}%`,
        `${dist.amount.toFixed(2)} ${frameworkResults.resource_symbol}`
      ].join(','));
    });
  }

  // Add summary
  lines.push('');
  lines.push('Summary');
  lines.push(`Total Voters,${results.participation?.total_voters || 0}`);
  lines.push(`Total Credits Allocated,${results.participation?.total_credits_allocated || 0}`);
  lines.push(`Framework Type,${framework}`);
  lines.push(`Event Status,${results.participation?.is_final ? 'Final' : 'Ongoing'}`);

  return lines.join('\n');
}