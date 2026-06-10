import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

/**
 * Hermetic end-to-end suite. Runs against the Next.js app backed by the
 * in-memory Supabase mock (see playwright.config.ts webServer). Covers the
 * critical product paths for both decision frameworks plus the security
 * regressions fixed in the hardening pass.
 */

const MOCK = 'http://127.0.0.1:54321';

/* ───────────────────────── helpers ───────────────────────── */

let userSeq = 0;

async function signup(request: APIRequestContext): Promise<string> {
  const email = `e2e-${Date.now()}-${userSeq++}@test.co`;
  const res = await request.post(`${MOCK}/auth/v1/signup`, {
    data: { email, password: 'password123' },
  });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).access_token as string;
}

interface CreateEventOpts {
  framework?: 'binary' | 'proportional';
  title?: string;
  visibility?: 'public' | 'private' | 'unlisted';
  optionTitles?: string[];
  showResultsDuringVoting?: boolean;
  optionMode?: 'admin_defined' | 'community_proposals';
}

async function createEvent(
  request: APIRequestContext,
  token: string,
  opts: CreateEventOpts = {}
): Promise<{ id: string; optionIds: string[] }> {
  const {
    framework = 'binary',
    title = `E2E Event ${Date.now()}-${userSeq}`,
    visibility = 'public',
    optionTitles = ['Park', 'Library', 'Center'],
    showResultsDuringVoting = true,
    optionMode = 'admin_defined',
  } = opts;

  const now = new Date(Date.now() - 3_600_000).toISOString();
  const end = new Date(Date.now() + 86_400_000).toISOString();

  const decisionFramework =
    framework === 'binary'
      ? {
          framework_type: 'binary_selection',
          config: { threshold_mode: 'top_n', top_n_count: 2, tiebreaker: 'timestamp' },
        }
      : {
          framework_type: 'proportional_distribution',
          config: {
            resource_name: 'USD Budget',
            resource_symbol: '$',
            total_pool_amount: 100_000,
            decimal_places: 2,
          },
        };

  const res = await request.post('/api/events', {
    headers: { authorization: `Bearer ${token}` },
    data: {
      title,
      visibility,
      startTime: now,
      endTime: end,
      timezone: 'UTC',
      decisionFramework,
      optionMode,
      creditsPerVoter: 100,
      showResultsDuringVoting,
      showResultsAfterClose: true,
      ...(optionMode === 'admin_defined'
        ? { initialOptions: optionTitles.map((t) => ({ title: t })) }
        : {
            proposalConfig: {
              enabled: true,
              moderation_mode: 'none',
              access_control: 'open',
              submission_start: now,
              submission_end: end,
              max_proposals_per_user: 5,
            },
          }),
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  const eventId = (await res.json()).event.id as string;

  const ev = await (await request.get(`/api/events/${eventId}`)).json();
  const optionIds = ((ev.event ?? ev).options ?? []).map((o: any) => o.id as string);
  return { id: eventId, optionIds };
}

async function castVote(
  request: APIRequestContext,
  eventId: string,
  allocations: Record<string, number>,
  userAgent: string
) {
  const res = await request.post(`/api/events/${eventId}/votes`, {
    headers: { 'user-agent': userAgent },
    data: { inviteCode: 'anonymous', allocations },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
}

/* ───────────────────────── specs ───────────────────────── */

test.describe('home & hardening', () => {
  test('homepage renders the hero and event slate', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/decide together/i);
    await expect(page.getByText(/open for voting now/i)).toBeVisible();
  });

  test('security headers are set', async ({ request }) => {
    const res = await request.get('/');
    expect(res.headers()['x-frame-options']).toBe('DENY');
    expect(res.headers()['x-content-type-options']).toBe('nosniff');
    expect(res.headers()['content-security-policy']).toContain("default-src 'self'");
  });
});

test.describe('binary selection lifecycle', () => {
  test('create → vote → correct results, CSV and JSON exports', async ({ request }) => {
    const token = await signup(request);
    const { id, optionIds } = await createEvent(request, token);
    const [park, library, center] = optionIds;

    // √81=9, √16=4 / √49=7,√49=7 / √25=5,√64=8 → park 14, library 11, center 15
    await castVote(request, id, { [park]: 81, [library]: 16 }, 'voter-1');
    await castVote(request, id, { [library]: 49, [center]: 49 }, 'voter-2');
    await castVote(request, id, { [park]: 25, [center]: 64 }, 'voter-3');

    const results = (await (await request.get(`/api/events/${id}/results`)).json()).results;
    expect(results.framework_type).toBe('binary_selection');
    const fr = results.results;
    expect(fr.selected_options.map((o: any) => o.title)).toEqual(['Center', 'Park']);
    expect(fr.not_selected_options[0].title).toBe('Library');
    expect(fr.selection_margin).toBeCloseTo(3);
    expect(results.participation.total_voters).toBe(3);
    expect(results.participation.total_credits_allocated).toBe(284);

    // CSV export carries real credits + percentages, ordered by rank.
    const csv = await (await request.get(`/api/events/${id}/export?format=standard`)).text();
    const lines = csv.trim().split('\n');
    expect(lines[0]).toBe('rank,option,votes,credits,percentage,status');
    expect(lines[1]).toMatch(/^1,Center,15\.00,113,37\.50%,selected$/);
    expect(lines[3]).toMatch(/^3,Library,11\.00,65,27\.50%,not_selected$/);

    // JSON export has the framework-specific structure.
    const json = await (await request.get(`/api/events/${id}/export?format=json`)).json();
    expect(json.results.framework_type).toBe('binary_selection');
    expect(json.results.selected_count).toBe(2);
    expect(json.event.decision_framework.config.top_n_count).toBe(2);
  });

  test('voter sees live standings and framework copy, submits via UI', async ({
    page,
    request,
  }) => {
    const token = await signup(request);
    const { id, optionIds } = await createEvent(request, token, {
      title: `UI Vote ${Date.now()}`,
    });
    // Seed another voter so live standings exist.
    await castVote(request, id, { [optionIds[0]]: 81 }, 'seed-voter');

    await page.goto(`/events/${id}/vote`);

    // Framework-adapted hero (binary = competitive copy).
    await expect(page.getByRole('heading', { name: /choose winners/i })).toBeVisible();
    // Live standing chips are rendered (top-2 of 3 options selected).
    await expect(page.getByText('✓ Selected').first()).toBeVisible();

    // Allocate 49 credits to the second option via keyboard.
    const slider = page.locator('[role="slider"]').nth(1);
    await slider.focus();
    for (let i = 0; i < 49; i++) await page.keyboard.press('ArrowRight');
    await expect(page.getByText('7.0').first()).toBeVisible(); // √49

    await page.getByRole('button', { name: /submit ballot/i }).click();
    await expect(page.getByText(/confirm your picks/i)).toBeVisible();
    await page.getByRole('button', { name: /^submit ballot$/i }).click();

    // Lands on results after submission.
    await page.waitForURL(`**/events/${id}/results`);
    await expect(page.getByText(/live results|final results/i)).toBeVisible();
  });
});

test.describe('proportional distribution lifecycle', () => {
  test('pool is fully allocated proportionally to quadratic votes', async ({ request }) => {
    const token = await signup(request);
    const { id, optionIds } = await createEvent(request, token, {
      framework: 'proportional',
      optionTitles: ['Infra', 'Education'],
    });

    await castVote(request, id, { [optionIds[0]]: 100 }, 'p-voter-1'); // 10 votes
    await castVote(request, id, { [optionIds[1]]: 100 }, 'p-voter-2'); // 10 votes

    const results = (await (await request.get(`/api/events/${id}/results`)).json()).results;
    const fr = results.results;
    expect(fr.framework_type).toBe('proportional_distribution');
    expect(fr.total_allocated).toBeCloseTo(100_000);
    expect(fr.distributions[0].allocation_amount).toBeCloseTo(50_000);
    expect(fr.gini_coefficient).toBeCloseTo(0, 5);
  });

  test('vote page shows the pool and projected share', async ({ page, request }) => {
    const token = await signup(request);
    const { id } = await createEvent(request, token, {
      framework: 'proportional',
      title: `UI Budget ${Date.now()}`,
      optionTitles: ['Infra', 'Education'],
    });

    await page.goto(`/events/${id}/vote`);
    await expect(page.getByRole('heading', { name: /allocate credits to divide/i })).toBeVisible();
    await expect(page.getByText(/\$100,000/)).toBeVisible();

    const slider = page.locator('[role="slider"]').first();
    await slider.focus();
    for (let i = 0; i < 25; i++) await page.keyboard.press('ArrowRight');
    await expect(page.getByText(/projected share if voting closed now/i)).toBeVisible();
  });
});

test.describe('access control & privacy regressions', () => {
  test('private events are invisible to anonymous users on every surface', async ({
    request,
  }) => {
    const token = await signup(request);
    const { id } = await createEvent(request, token, { visibility: 'private' });

    // 404 everywhere — existence must not leak, and neither results, exports,
    // nor analytics may bypass visibility.
    expect((await request.get(`/api/events/${id}`)).status()).toBe(404);
    expect((await request.get(`/api/events/${id}/results`)).status()).toBe(404);
    expect((await request.get(`/api/events/${id}/export?format=standard`)).status()).toBe(404);
    expect((await request.get(`/api/events/${id}/export?format=json`)).status()).toBe(404);
    expect((await request.get(`/api/events/${id}/analytics`)).status()).toBe(404);

    // The admin still sees all of them.
    const auth = { authorization: `Bearer ${token}` };
    expect((await request.get(`/api/events/${id}`, { headers: auth })).status()).toBe(200);
    expect((await request.get(`/api/events/${id}/results`, { headers: auth })).status()).toBe(200);
    expect(
      (await request.get(`/api/events/${id}/export?format=json`, { headers: auth })).status()
    ).toBe(200);
  });

  test('exports respect the results-visibility toggles', async ({ request }) => {
    const token = await signup(request);
    // Public event, results hidden during voting (the default).
    const { id } = await createEvent(request, token, {
      showResultsDuringVoting: false,
    });

    // Anonymous callers can't pull results through the export side door.
    expect((await request.get(`/api/events/${id}/export?format=standard`)).status()).toBe(403);
    // Admins can.
    expect(
      (
        await request.get(`/api/events/${id}/export?format=standard`, {
          headers: { authorization: `Bearer ${token}` },
        })
      ).status()
    ).toBe(200);
  });

  test('proposal PII is admin-only', async ({ request }) => {
    const token = await signup(request);
    const { id } = await createEvent(request, token, {
      optionMode: 'community_proposals',
      optionTitles: [],
    });

    const submit = await request.post('/api/proposals', {
      data: {
        eventId: id,
        title: 'My proposal',
        description: 'd',
        submitterEmail: 'secret@private.com',
        submitterWallet: '0x1111111111111111111111111111111111111111',
        payoutWallet: '0x2222222222222222222222222222222222222222',
      },
    });
    expect(submit.status(), await submit.text()).toBe(201);

    // Unauthenticated listing is rejected outright.
    expect((await request.get(`/api/proposals?eventId=${id}`)).status()).toBe(403);

    // The event admin gets the PII.
    const adminList = await request.get(`/api/proposals?eventId=${id}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(adminList.status()).toBe(200);
    const proposals = (await adminList.json()).proposals;
    expect(proposals[0].submitterEmail).toBe('secret@private.com');

    // A different signed-in user's cross-event listing excludes this event.
    const strangerToken = await signup(request);
    const strangerList = await request.get('/api/proposals', {
      headers: { authorization: `Bearer ${strangerToken}` },
    });
    expect((await strangerList.json()).proposals).toHaveLength(0);
  });

  test('vote rejects over-budget and unknown-option ballots', async ({ request }) => {
    const token = await signup(request);
    const { id, optionIds } = await createEvent(request, token);

    const over = await request.post(`/api/events/${id}/votes`, {
      headers: { 'user-agent': 'cheater' },
      data: { inviteCode: 'anonymous', allocations: { [optionIds[0]]: 101 } },
    });
    expect(over.ok()).toBeFalsy();

    const bogus = await request.post(`/api/events/${id}/votes`, {
      headers: { 'user-agent': 'cheater' },
      data: {
        inviteCode: 'anonymous',
        allocations: { '00000000-0000-4000-8000-000000000000': 10 },
      },
    });
    expect(bogus.ok()).toBeFalsy();
  });
});

test.describe('result snapshots', () => {
  test('closed events freeze their tally and serve it verbatim', async ({ request }) => {
    const token = await signup(request);
    const { id, optionIds } = await createEvent(request, token);
    await castVote(request, id, { [optionIds[0]]: 81 }, 'snap-voter');

    // Close the event by editing end_time directly in the mock.
    const past = new Date(Date.now() - 60_000).toISOString();
    await request.patch(`${MOCK}/rest/v1/events?id=eq.${id}`, {
      data: { end_time: past },
    });

    const first = (await (await request.get(`/api/events/${id}/results`)).json()).results;
    await new Promise((r) => setTimeout(r, 1100));
    const second = (await (await request.get(`/api/events/${id}/results`)).json()).results;

    expect(first.participation.is_final).toBe(true);
    expect(second.calculated_at).toBe(first.calculated_at); // identical = snapshot served
  });
});
