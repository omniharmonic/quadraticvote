import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase';
import { withEventAdmin } from '@/lib/utils/auth-middleware';

export const dynamic = 'force-dynamic';

const payoutConfigSchema = z
  .object({
    enabled: z.boolean(),
    token_type: z.enum(['native', 'erc20']).optional(),
    token_address: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a 0x-prefixed 20-byte address')
      .optional(),
    chain_id: z.number().int().positive().optional(),
  })
  .refine(
    v => !v.enabled || !!v.token_type,
    { message: 'token_type is required when enabled', path: ['token_type'] }
  )
  .refine(
    v => !v.enabled || v.token_type !== 'erc20' || !!v.token_address,
    { message: 'token_address is required for erc20', path: ['token_address'] }
  );

/**
 * PATCH /api/events/[id]/payout-config
 *
 * Admin-only. Merges Gnosis Safe payout fields into the event's
 * `decision_framework.config`. Only valid for proportional_distribution
 * events — binary events return 400.
 */
export const PATCH = withEventAdmin(async (request: NextRequest, { params }) => {
  try {
    const body = await request.json();
    const parsed = payoutConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payout config', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const input = parsed.data;

    const supabase = createServiceRoleClient();
    const { data: event, error: fetchError } = await supabase
      .from('events')
      .select('decision_framework')
      .eq('id', params.id)
      .single();

    if (fetchError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const framework = event.decision_framework as any;
    if (framework?.framework_type !== 'proportional_distribution') {
      return NextResponse.json(
        { error: 'Payout config only applies to proportional_distribution events' },
        { status: 400 }
      );
    }

    // Strip existing payout fields, then add new ones if enabled.
    const {
      payout_token_type: _t,
      payout_token_address: _a,
      payout_chain_id: _c,
      ...restConfig
    } = framework.config ?? {};

    const nextConfig = input.enabled
      ? {
          ...restConfig,
          payout_token_type: input.token_type,
          ...(input.token_type === 'erc20' && input.token_address
            ? { payout_token_address: input.token_address }
            : {}),
          ...(input.chain_id ? { payout_chain_id: input.chain_id } : {}),
        }
      : restConfig;

    const { error: updateError } = await supabase
      .from('events')
      .update({
        decision_framework: { ...framework, config: nextConfig },
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Payout config update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update payout config' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, config: nextConfig });
  } catch (err) {
    console.error('Payout config error:', err);
    return NextResponse.json(
      { error: 'Failed to update payout config' },
      { status: 500 }
    );
  }
});
