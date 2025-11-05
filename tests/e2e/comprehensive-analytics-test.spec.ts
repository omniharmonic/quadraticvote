import { test, expect } from '@playwright/test';

test.describe('Comprehensive Analytics Dashboard E2E Test', () => {
  let eventId: string;
  let adminCode: string;

  test.beforeAll(async ({ page }) => {
    // Start with a clean slate
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
  });

  test('1. Create a new public event with community proposals', async ({ page }) => {
    await page.goto('http://localhost:3001/events/create');
    await page.waitForLoadState('networkidle');

    // Fill in basic event details
    await page.fill('[name="title"]', 'Analytics Test Event');
    await page.fill('[name="description"]', 'Testing comprehensive analytics dashboard functionality');

    // Set dates for immediate testing
    const now = new Date();
    const startTime = new Date(now.getTime() - 60000); // 1 minute ago
    const endTime = new Date(now.getTime() + 86400000); // 24 hours from now

    await page.fill('[name="startTime"]', startTime.toISOString().slice(0, 16));
    await page.fill('[name="endTime"]', endTime.toISOString().slice(0, 16));

    // Select public visibility
    await page.click('text=Public');

    // Configure for community proposals
    await page.click('text=Community Proposals');

    // Set decision framework to binary selection for clear results
    await page.click('text=Binary Selection');
    await page.selectOption('select[name="thresholdMode"]', 'top_n');
    await page.fill('input[name="topNCount"]', '2');

    // Enable proposals with open access
    await page.click('input[name="proposalsEnabled"]');
    await page.click('text=Open');
    await page.selectOption('select[name="moderationMode"]', 'none');

    // Set voting credits
    await page.fill('input[name="creditsPerVoter"]', '100');

    // Create the event
    await page.click('button[type="submit"]');

    // Wait for redirect and capture admin URL
    await page.waitForURL('**/admin?code=*');
    const url = page.url();
    const urlParts = url.split('/');
    eventId = urlParts[urlParts.length - 2];
    const codeMatch = url.match(/code=([^&]+)/);
    adminCode = codeMatch ? codeMatch[1] : '';

    console.log(`Created event ${eventId} with admin code ${adminCode}`);

    expect(eventId).toBeTruthy();
    expect(adminCode).toBeTruthy();
    await expect(page.locator('text=Admin Access')).toBeVisible();
  });

  test('2. Submit multiple diverse proposals to generate data', async ({ page }) => {
    // Go to proposal submission page
    await page.goto(`http://localhost:3001/events/${eventId}/propose`);
    await page.waitForLoadState('networkidle');

    // Submit first proposal
    await page.fill('input[name="title"]', 'Improve Community Gardens');
    await page.fill('textarea[name="description"]', 'Invest in sustainable community gardening infrastructure to improve food security and community engagement.');
    await page.fill('input[name="submitterEmail"]', 'garden@community.org');
    await page.fill('input[name="submitterWallet"]', 'gardens.eth');
    await page.fill('input[name="payoutWallet"]', 'community-gardens.eth');

    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // Navigate back and submit second proposal
    await page.goto(`http://localhost:3001/events/${eventId}/propose`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="title"]', 'Tech Education Program');
    await page.fill('textarea[name="description"]', 'Launch a comprehensive technology education program for underserved communities.');
    await page.fill('input[name="submitterEmail"]', 'tech@education.org');
    await page.fill('input[name="submitterWallet"]', 'techedu.eth');
    await page.fill('input[name="payoutWallet"]', 'tech-education.eth');

    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // Navigate back and submit third proposal
    await page.goto(`http://localhost:3001/events/${eventId}/propose`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="title"]', 'Youth Sports Complex');
    await page.fill('textarea[name="description"]', 'Build a modern sports complex to provide recreational opportunities for local youth.');
    await page.fill('input[name="submitterEmail"]', 'sports@youth.org');
    await page.fill('input[name="submitterWallet"]', 'youthsports.eth');
    await page.fill('input[name="payoutWallet"]', 'sports-complex.eth');

    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    console.log('Submitted 3 diverse proposals for testing');
  });

  test('3. Cast votes with different allocation patterns', async ({ page }) => {
    // Wait a moment for proposals to be processed
    await page.waitForTimeout(2000);

    // Go to voting page
    await page.goto(`http://localhost:3001/events/${eventId}/vote`);
    await page.waitForLoadState('networkidle');

    // Cast first vote - concentrated on gardens
    const sliders = await page.locator('input[type="range"]').all();

    if (sliders.length >= 1) {
      await sliders[0].fill('80'); // 80 credits to gardens
    }
    if (sliders.length >= 2) {
      await sliders[1].fill('20'); // 20 credits to tech
    }

    await page.click('button:has-text("Submit Vote")');
    await page.waitForLoadState('networkidle');

    // Cast second vote with different pattern using new browser context
    const context2 = await page.context().browser()?.newContext();
    if (context2) {
      const page2 = await context2.newPage();
      await page2.goto(`http://localhost:3001/events/${eventId}/vote`);
      await page2.waitForLoadState('networkidle');

      const sliders2 = await page2.locator('input[type="range"]').all();
      if (sliders2.length >= 1) {
        await sliders2[0].fill('30'); // 30 to gardens
      }
      if (sliders2.length >= 2) {
        await sliders2[1].fill('50'); // 50 to tech
      }
      if (sliders2.length >= 3) {
        await sliders2[2].fill('20'); // 20 to sports
      }

      await page2.click('button:has-text("Submit Vote")');
      await page2.waitForLoadState('networkidle');
      await context2.close();
    }

    // Cast third vote with another pattern
    const context3 = await page.context().browser()?.newContext();
    if (context3) {
      const page3 = await context3.newPage();
      await page3.goto(`http://localhost:3001/events/${eventId}/vote`);
      await page3.waitForLoadState('networkidle');

      const sliders3 = await page3.locator('input[type="range"]').all();
      if (sliders3.length >= 2) {
        await sliders3[1].fill('60'); // 60 to tech
      }
      if (sliders3.length >= 3) {
        await sliders3[2].fill('40'); // 40 to sports
      }

      await page3.click('button:has-text("Submit Vote")');
      await page3.waitForLoadState('networkidle');
      await context3.close();
    }

    console.log('Cast 3 votes with diverse allocation patterns');
  });

  test('4. Test analytics dashboard data visualization', async ({ page }) => {
    // Navigate to analytics/results page
    await page.goto(`http://localhost:3001/events/${eventId}/results`);
    await page.waitForLoadState('networkidle');

    // Wait for data to load
    await page.waitForTimeout(3000);

    // Test overview stats are displayed
    await expect(page.locator('text=Unique Voters')).toBeVisible();
    await expect(page.locator('text=Avg Credits Used')).toBeVisible();
    await expect(page.locator('text=Voter Clusters')).toBeVisible();
    await expect(page.locator('text=Network Edges')).toBeVisible();

    // Check that we have actual data (not zeros)
    const voterCount = await page.locator('div:has-text("Unique Voters") + div .text-3xl').textContent();
    expect(parseInt(voterCount || '0')).toBeGreaterThan(0);

    console.log(`Found ${voterCount} unique voters in analytics`);
  });

  test('5. Test network graph visualization', async ({ page }) => {
    await page.goto(`http://localhost:3001/events/${eventId}/results`);
    await page.waitForLoadState('networkidle');

    // Click on Network Graph tab
    await page.click('text=Network Graph');
    await page.waitForTimeout(2000);

    // Check if SVG network graph is rendered
    const networkSvg = page.locator('svg');
    await expect(networkSvg).toBeVisible();

    // Check for nodes (circles) and edges (lines)
    const nodes = page.locator('svg circle');
    const edges = page.locator('svg line');

    const nodeCount = await nodes.count();
    const edgeCount = await edges.count();

    expect(nodeCount).toBeGreaterThan(0);
    expect(edgeCount).toBeGreaterThan(0);

    console.log(`Network graph shows ${nodeCount} nodes and ${edgeCount} edges`);

    // Test node interaction
    if (nodeCount > 0) {
      await nodes.first().click();
      // Should show node details popup
      await expect(page.locator('text=Close')).toBeVisible();
      await page.click('text=Close');
    }
  });

  test('6. Test cluster analysis visualization', async ({ page }) => {
    await page.goto(`http://localhost:3001/events/${eventId}/results`);
    await page.waitForLoadState('networkidle');

    // Click on Cluster Analysis tab
    await page.click('text=Cluster Analysis');
    await page.waitForTimeout(2000);

    // Check cluster summary metrics
    await expect(page.locator('text=Total Clusters')).toBeVisible();
    await expect(page.locator('text=Largest Cluster')).toBeVisible();
    await expect(page.locator('text=Diversity Score')).toBeVisible();

    // Check for cluster visualizations
    const clusters = page.locator('div:has-text("Cluster") >> div.border');
    const clusterCount = await clusters.count();

    expect(clusterCount).toBeGreaterThan(0);
    console.log(`Found ${clusterCount} voting clusters`);
  });

  test('7. Test charts visualization', async ({ page }) => {
    await page.goto(`http://localhost:3001/events/${eventId}/results`);
    await page.waitForLoadState('networkidle');

    // Click on Charts tab
    await page.click('text=Charts');
    await page.waitForTimeout(2000);

    // Check for Recharts components
    await expect(page.locator('text=Results Comparison')).toBeVisible();
    await expect(page.locator('text=Vote Distribution')).toBeVisible();

    // Check that charts are rendered (look for SVG elements from Recharts)
    const chartSvgs = page.locator('.recharts-wrapper svg');
    const chartCount = await chartSvgs.count();

    expect(chartCount).toBeGreaterThanOrEqual(2); // Bar chart + Pie chart
    console.log(`Found ${chartCount} chart visualizations`);
  });

  test('8. Test timeline visualization', async ({ page }) => {
    await page.goto(`http://localhost:3001/events/${eventId}/results`);
    await page.waitForLoadState('networkidle');

    // Click on Timeline tab
    await page.click('text=Timeline');
    await page.waitForTimeout(2000);

    // Check timeline components
    await expect(page.locator('text=Real-time Voting Timeline')).toBeVisible();

    // Look for timeline chart (area chart)
    const timelineChart = page.locator('.recharts-wrapper');
    await expect(timelineChart).toBeVisible();

    console.log('Timeline visualization is rendering');
  });

  test('9. Test results page with final rankings', async ({ page }) => {
    await page.goto(`http://localhost:3001/events/${eventId}/results`);
    await page.waitForLoadState('networkidle');

    // Click on Results tab
    await page.click('text=Results');
    await page.waitForTimeout(2000);

    // Check for ranked results
    await expect(page.locator('text=Final Results')).toBeVisible();

    // Look for ranking badges and quadratic scores
    const rankings = page.locator('div:has-text("#1"), div:has-text("#2"), div:has-text("#3")');
    const rankingCount = await rankings.count();

    expect(rankingCount).toBeGreaterThan(0);
    console.log(`Found ${rankingCount} ranked results`);

    // Check for quadratic score displays
    await expect(page.locator('text=Quadratic Score:')).toBeVisible();
    await expect(page.locator('text=Total Credits:')).toBeVisible();
    await expect(page.locator('text=Vote Count:')).toBeVisible();
  });

  test('10. Test data export functionality', async ({ page }) => {
    await page.goto(`http://localhost:3001/events/${eventId}/results`);
    await page.waitForLoadState('networkidle');

    // Set up download handling
    const downloadPromise = page.waitForEvent('download');

    // Click export button
    await page.click('text=Export');

    // Wait for download to complete
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/.*analytics\.csv$/);

    console.log(`Successfully exported analytics data: ${download.suggestedFilename()}`);
  });

  test('11. Test real-time refresh functionality', async ({ page }) => {
    await page.goto(`http://localhost:3001/events/${eventId}/results`);
    await page.waitForLoadState('networkidle');

    // Check for refresh button and live indicators
    await expect(page.locator('text=Refresh')).toBeVisible();

    // Look for live event indicator if event is active
    const liveIndicator = page.locator('text=Live Event');
    if (await liveIndicator.count() > 0) {
      await expect(liveIndicator).toBeVisible();
      console.log('Live event indicator is showing');
    }

    // Test manual refresh
    await page.click('text=Refresh');
    await page.waitForLoadState('networkidle');

    // Check for refreshing indicator
    const refreshingText = page.locator('text=Refreshing');
    if (await refreshingText.count() > 0) {
      console.log('Refresh functionality is working');
    }
  });

  test('12. Test admin dashboard invite management', async ({ page }) => {
    // Go to admin dashboard
    await page.goto(`http://localhost:3001/events/${eventId}/admin?code=${adminCode}`);
    await page.waitForLoadState('networkidle');

    // Check admin dashboard elements
    await expect(page.locator('text=Admin Access')).toBeVisible();
    await expect(page.locator('text=Event Administration')).toBeVisible();

    // Test navigation links
    await expect(page.locator('text=View Event')).toBeVisible();
    await expect(page.locator('text=Vote Page')).toBeVisible();
    await expect(page.locator('text=Results')).toBeVisible();

    console.log('Admin dashboard is accessible and functional');
  });

  test('13. Verify all core functionality end-to-end', async ({ page }) => {
    // Final comprehensive check
    console.log('Running final verification...');

    // Check event page loads properly
    await page.goto(`http://localhost:3001/events/${eventId}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Analytics Test Event')).toBeVisible();

    // Check voting page works
    await page.goto(`http://localhost:3001/events/${eventId}/vote`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Cast Your Vote')).toBeVisible();

    // Check results/analytics page works
    await page.goto(`http://localhost:3001/events/${eventId}/results`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Advanced Analytics Dashboard')).toBeVisible();

    // Verify data is properly populated
    const uniqueVoters = await page.locator('div:has-text("Unique Voters") + div .text-3xl').textContent();
    const avgCredits = await page.locator('div:has-text("Avg Credits Used") + div .text-3xl').textContent();

    expect(parseInt(uniqueVoters || '0')).toBeGreaterThan(0);
    expect(parseFloat(avgCredits || '0')).toBeGreaterThan(0);

    console.log(`Final verification complete: ${uniqueVoters} voters, ${avgCredits} avg credits`);
    console.log('🎉 All E2E tests passed successfully!');
  });
});