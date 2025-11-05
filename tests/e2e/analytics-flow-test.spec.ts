import { test, expect } from '@playwright/test';

test.describe('Analytics Flow Test', () => {
  let eventId: string;
  let adminCode: string;

  test('Complete analytics flow', async ({ page }) => {
    // 1. Create event
    await page.goto('http://localhost:3002/events/create');
    await page.waitForLoadState('networkidle');

    // Fill basic details
    await page.fill('input[name="title"]', 'Analytics Flow Test');
    await page.fill('textarea[name="description"]', 'Testing analytics with real data');

    // Set dates
    const now = new Date();
    const startTime = new Date(now.getTime() - 60000);
    const endTime = new Date(now.getTime() + 86400000);

    await page.fill('input[name="startTime"]', startTime.toISOString().slice(0, 16));
    await page.fill('input[name="endTime"]', endTime.toISOString().slice(0, 16));

    // Configure as public community proposals
    await page.click('input[value="public"]');
    await page.click('input[value="community_proposals"]');

    // Set decision framework
    await page.click('input[value="binary_selection"]');
    await page.selectOption('select[name="thresholdMode"]', 'top_n');
    await page.fill('input[name="topNCount"]', '2');

    // Enable proposals
    await page.check('input[name="proposalsEnabled"]');
    await page.selectOption('select[name="moderationMode"]', 'none');
    await page.click('input[value="open"]');

    // Set credits
    await page.fill('input[name="creditsPerVoter"]', '100');

    // Submit
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin?code=*');

    // Extract event ID and admin code
    const url = page.url();
    eventId = url.split('/').slice(-2, -1)[0];
    const codeMatch = url.match(/code=([^&]+)/);
    adminCode = codeMatch ? codeMatch[1] : '';

    console.log(`Created event: ${eventId} with admin code: ${adminCode}`);

    // 2. Submit proposals
    await page.goto(`http://localhost:3001/events/${eventId}/propose`);
    await page.waitForLoadState('networkidle');

    // Proposal 1
    await page.fill('input[name="title"]', 'Green Energy Initiative');
    await page.fill('textarea[name="description"]', 'Invest in renewable energy for the community');
    await page.fill('input[name="submitterEmail"]', 'green@energy.com');
    await page.fill('input[name="submitterWallet"]', 'green-energy.eth');
    await page.fill('input[name="payoutWallet"]', 'green-payout.eth');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(1000);

    // Proposal 2
    await page.goto(`http://localhost:3001/events/${eventId}/propose`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="title"]', 'Community Center');
    await page.fill('textarea[name="description"]', 'Build a new community center for local activities');
    await page.fill('input[name="submitterEmail"]', 'center@community.org');
    await page.fill('input[name="submitterWallet"]', 'community-center.eth');
    await page.fill('input[name="payoutWallet"]', 'center-payout.eth');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);

    // 3. Cast votes
    await page.goto(`http://localhost:3001/events/${eventId}/vote`);
    await page.waitForLoadState('networkidle');

    // Wait for proposals to appear as options
    await page.waitForSelector('input[type="range"]', { timeout: 10000 });

    const sliders = await page.locator('input[type="range"]').all();

    if (sliders.length >= 1) {
      await sliders[0].fill('70');
    }
    if (sliders.length >= 2) {
      await sliders[1].fill('30');
    }

    await page.click('button:has-text("Submit Vote")');
    await page.waitForLoadState('networkidle');

    // 4. Test analytics dashboard
    await page.goto(`http://localhost:3001/events/${eventId}/results`);
    await page.waitForLoadState('networkidle');

    // Wait for analytics to load
    await page.waitForTimeout(3000);

    // Check analytics page loads
    await expect(page.locator('text=Advanced Analytics Dashboard')).toBeVisible();

    // Check overview stats
    await expect(page.locator('text=Unique Voters')).toBeVisible();

    // Verify we have real data
    const voterCountElement = page.locator('text=Unique Voters').locator('..').locator('.text-3xl');
    const voterCount = await voterCountElement.textContent();

    console.log(`Found ${voterCount} unique voters`);
    expect(parseInt(voterCount || '0')).toBeGreaterThan(0);

    // Test network graph
    await page.click('text=Network Graph');
    await page.waitForTimeout(2000);

    const networkSvg = page.locator('svg');
    await expect(networkSvg).toBeVisible();

    // Check for nodes and edges
    const nodes = await page.locator('svg circle').count();
    const edges = await page.locator('svg line').count();

    console.log(`Network graph: ${nodes} nodes, ${edges} edges`);
    expect(nodes).toBeGreaterThan(0);

    // Test charts
    await page.click('text=Charts');
    await page.waitForTimeout(2000);

    await expect(page.locator('text=Results Comparison')).toBeVisible();
    await expect(page.locator('text=Vote Distribution')).toBeVisible();

    // Test results
    await page.click('text=Results');
    await page.waitForTimeout(2000);

    await expect(page.locator('text=Final Results')).toBeVisible();

    // Check for ranking
    const rankings = await page.locator('text=#1, text=#2').count();
    expect(rankings).toBeGreaterThan(0);

    console.log('✅ Analytics flow test completed successfully');
  });
});