import { test, expect } from '@playwright/test';

test.describe('Simple Analytics Dashboard Test', () => {
  test('Analytics dashboard displays data correctly', async ({ page }) => {
    // Go directly to the analytics dashboard for the event with data
    await page.goto('http://localhost:3002/events/e5b7735a-2ba1-4316-8df7-69aca38a6974/results');
    await page.waitForLoadState('networkidle');

    // Wait for analytics to load
    await page.waitForTimeout(3000);

    // Check that the analytics dashboard title appears
    await expect(page.locator('text=Advanced Analytics Dashboard')).toBeVisible();

    // Check that overview stats are visible and have data
    await expect(page.locator('text=Unique Voters')).toBeVisible();
    await expect(page.locator('text=Avg Credits Used')).toBeVisible();

    // Verify we have real data (not zeros)
    const voterCountElement = await page.locator('div:has-text("Unique Voters")').locator('..').locator('.text-3xl').textContent();
    console.log(`Found voter count: ${voterCountElement}`);
    expect(parseInt(voterCountElement || '0')).toBeGreaterThan(0);

    // Test Network Graph tab
    await page.click('text=Network Graph');
    await page.waitForTimeout(2000);

    // Check for SVG network visualization
    const networkSvg = page.locator('svg');
    await expect(networkSvg).toBeVisible();

    // Check for nodes and edges
    const nodes = await page.locator('svg circle').count();
    const edges = await page.locator('svg line').count();

    console.log(`Network graph: ${nodes} nodes, ${edges} edges`);
    expect(nodes).toBeGreaterThan(0);
    expect(edges).toBeGreaterThan(0);

    // Test Cluster Analysis tab
    await page.click('text=Cluster Analysis');
    await page.waitForTimeout(2000);

    await expect(page.locator('text=Total Clusters')).toBeVisible();
    await expect(page.locator('text=Largest Cluster')).toBeVisible();

    // Test Charts tab
    await page.click('text=Charts');
    await page.waitForTimeout(2000);

    await expect(page.locator('text=Results Comparison')).toBeVisible();
    await expect(page.locator('text=Vote Distribution')).toBeVisible();

    // Test Timeline tab
    await page.click('text=Timeline');
    await page.waitForTimeout(2000);

    await expect(page.locator('text=Real-time Voting Timeline')).toBeVisible();

    // Test Results tab
    await page.click('text=Results');
    await page.waitForTimeout(2000);

    await expect(page.locator('text=Final Results')).toBeVisible();

    console.log('✅ Analytics dashboard test completed successfully');
  });
});