import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { resultService } from '@/lib/services/result.service';
import { requireEventAdmin } from '@/lib/utils/auth-middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/events/[id]/export
 *
 * ?format=standard  — public CSV of results (rank, option, votes, share)
 * ?format=gnosis    — admin-only CSV in Safe Airdrop format
 *                     (`token_type,token_address,receiver,amount,id`)
 *                     See https://github.com/bh2smith/safe-airdrop
 *
 * Optional `?token=native` or `?token=0x…` overrides the event-configured
 * payout token. Useful when an admin wants to export the same proportional
 * result against a different chain/asset.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    const format = request.nextUrl.searchParams.get('format') || 'standard';

    const supabase = createServiceRoleClient();
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const results = await resultService.getResults(eventId);

    if (format === 'standard') {
      const csv = formatStandardCSV(results, event);
      return csvResponse(csv, `results-${eventId}.csv`);
    }

    if (format === 'gnosis') {
      // Gnosis CSV exposes payout wallets — admin-only.
      const auth = await requireEventAdmin(request, eventId);
      if (!auth.success) {
        return NextResponse.json(
          { error: auth.error || 'Admin access required' },
          { status: 403 }
        );
      }

      // Resolve payout wallets via options.created_by_proposal_id, which
      // works for admin_defined, community_proposals, and hybrid modes.
      const { data: options } = await supabase
        .from('options')
        .select('id, title, created_by_proposal_id')
        .eq('event_id', eventId);

      const proposalIds = (options ?? [])
        .map(o => o.created_by_proposal_id)
        .filter((id): id is string => !!id);

      const payoutByOptionId = new Map<string, string>();
      if (proposalIds.length > 0) {
        const { data: proposals } = await supabase
          .from('proposals')
          .select('id, payout_wallet')
          .in('id', proposalIds);

        const walletByProposalId = new Map<string, string>();
        for (const p of proposals ?? []) {
          if (p.payout_wallet) walletByProposalId.set(p.id, p.payout_wallet);
        }
        for (const o of options ?? []) {
          const wallet = o.created_by_proposal_id
            ? walletByProposalId.get(o.created_by_proposal_id)
            : undefined;
          if (wallet) payoutByOptionId.set(o.id, wallet);
        }
      }

      const tokenOverride = parseTokenOverride(
        request.nextUrl.searchParams.get('token')
      );

      const { csv, missing } = formatGnosisCSV(
        results,
        event,
        payoutByOptionId,
        tokenOverride
      );

      const filename = `safe-airdrop-${eventId}.csv`;
      const headers: Record<string, string> = {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      };
      // Surface a warning header so the client can show a toast if some
      // options have no payout wallet attached.
      if (missing.length > 0) {
        headers['X-Export-Missing-Wallets'] = String(missing.length);
      }
      return new NextResponse(csv, { headers });
    }

    return NextResponse.json(
      { error: 'Invalid format. Use ?format=standard or ?format=gnosis' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export results' },
      { status: 500 }
    );
  }
}

/* ──────────────────────────── helpers ──────────────────────────── */

type TokenOverride =
  | { type: 'native' }
  | { type: 'erc20'; address: string }
  | null;

function parseTokenOverride(raw: string | null): TokenOverride {
  if (!raw) return null;
  if (raw === 'native') return { type: 'native' };
  if (/^0x[a-fA-F0-9]{40}$/.test(raw)) return { type: 'erc20', address: raw };
  return null;
}

function csvResponse(csv: string, filename: string) {
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

function formatGnosisCSV(
  results: any,
  event: any,
  payoutByOptionId: Map<string, string>,
  tokenOverride: TokenOverride
): { csv: string; missing: string[] } {
  const framework = event.decision_framework?.framework_type;
  const config = event.decision_framework?.config ?? {};

  // Resolve token (override > event config). Native is the chain's gas token.
  const tokenType: 'native' | 'erc20' =
    tokenOverride?.type ?? (config.payout_token_type === 'erc20' ? 'erc20' : 'native');
  const tokenAddress: string =
    tokenOverride?.type === 'erc20'
      ? tokenOverride.address
      : tokenType === 'erc20'
        ? config.payout_token_address ?? ''
        : '';

  // Safe Airdrop App canonical header. The five columns are required even
  // when `id` is empty for fungibles.
  const lines: string[] = ['token_type,token_address,receiver,amount,id'];
  const missing: string[] = [];

  const decimals = clamp(
    Number.isFinite(config.decimal_places) ? config.decimal_places : 6,
    0,
    18
  );

  if (framework === 'proportional_distribution' && results.results?.distributions) {
    for (const d of results.results.distributions) {
      const amount = Number(d.allocation_amount ?? 0);
      if (!(amount > 0)) continue;

      const wallet = payoutByOptionId.get(d.option_id);
      if (!wallet) {
        missing.push(d.title ?? d.option_id);
        continue;
      }

      lines.push(formatRow(tokenType, tokenAddress, wallet, amount, decimals));
    }
  }

  return { csv: lines.join('\n') + '\n', missing };
}

function formatRow(
  tokenType: 'native' | 'erc20',
  tokenAddress: string,
  receiver: string,
  amount: number,
  decimals: number
): string {
  const formatted = trimTrailingZeros(amount.toFixed(decimals));
  // For `native`, token_address is intentionally empty per Safe Airdrop spec.
  const addr = tokenType === 'native' ? '' : tokenAddress;
  return `${tokenType},${addr},${csvCell(receiver)},${formatted},`;
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function trimTrailingZeros(s: string): string {
  if (!s.includes('.')) return s;
  return s.replace(/0+$/, '').replace(/\.$/, '');
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function formatStandardCSV(results: any, event: any): string {
  const lines: string[] = [];
  const fr = results.results;
  const framework = results.framework_type;

  lines.push('rank,option,votes,credits,percentage,status');

  if (framework === 'binary_selection' && fr?.selected_options) {
    const all = [
      ...fr.selected_options.map((o: any) => ({ ...o, selected: true })),
      ...fr.not_selected_options.map((o: any) => ({ ...o, selected: false })),
    ];
    all.sort((a, b) => (b.total_credits ?? 0) - (a.total_credits ?? 0));
    all.forEach((opt: any, i: number) => {
      lines.push([
        i + 1,
        csvCell(opt.title ?? ''),
        opt.votes ?? 0,
        opt.total_credits ?? 0,
        `${(opt.percentage ?? 0).toFixed(2)}%`,
        opt.selected ? 'selected' : 'not_selected',
      ].join(','));
    });
  } else if (framework === 'proportional_distribution' && fr?.distributions) {
    fr.distributions.forEach((d: any, i: number) => {
      lines.push([
        i + 1,
        csvCell(d.title ?? ''),
        (d.votes ?? 0).toFixed(2),
        '',
        `${(d.allocation_percentage ?? 0).toFixed(2)}%`,
        `${(d.allocation_amount ?? 0).toFixed(2)} ${fr.resource_symbol ?? ''}`.trim(),
      ].join(','));
    });
  }

  lines.push('');
  lines.push('Summary');
  lines.push(`Total voters,${results.participation?.total_voters ?? 0}`);
  lines.push(`Total credits allocated,${results.participation?.total_credits_allocated ?? 0}`);
  lines.push(`Framework,${framework}`);
  lines.push(`Status,${results.participation?.is_final ? 'final' : 'ongoing'}`);
  lines.push(`Event,${csvCell(event.title ?? '')}`);

  return lines.join('\n') + '\n';
}
