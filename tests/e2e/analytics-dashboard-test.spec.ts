import { test, expect } from '@playwright/test';

test.describe('Analytics Dashboard Improvements', () => {

  test('should display correct analytics data after voting', async ({ page }) => {
    // Navigate to event creation
    await page.goto('http://localhost:3004/events/create');

    // Fill basic information first
    await page.fill('input[name="title"]', 'Analytics Test Event');
    await page.fill('textarea[name="description"]', 'Testing analytics functionality');

    // Set start and end times
    const startTime = new Date();
    startTime.setMinutes(startTime.getMinutes() - 30); // Started 30 minutes ago
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + 2); // Ends in 2 hours

    await page.fill('input[name="start"]', '');
    await page.fill('input[name="start"]', startTime.toISOString().slice(0, 16));
    await page.fill('input[name="end"]', '');
    await page.fill('input[name="end"]', endTime.toISOString().slice(0, 16));

    // Click Next to go to framework selection
    await page.click('button:has-text("Next")');

    // Now select binary selection framework by clicking the button
    await page.click('button:has-text("Binary Selection")');
    await page.click('button:has-text("Next")');

    // Set options
    await page.fill('input[data-testid="option-0-title"]', 'Option A');
    await page.fill('input[data-testid="option-1-title"]', 'Option B');
    await page.click('button:has-text("Next")');

    // Set framework details
    await page.fill('input[name="creditsPerVoter"]', '100');
    await page.click('button:has-text("Next")');

    // Create event
    await page.click('button:has-text("Next")');

    // Create event
    await page.click('button:has-text("Create Event")');

    // Wait for redirect and get admin code
    await page.waitForURL(/\/admin\/events\//, { timeout: 15000 });
    const url = page.url();
    const adminCode = new URL(url).searchParams.get('code');
    const eventId = new URL(url).pathname.split('/')[3];

    // Navigate to invite management and create some invites
    await page.click('text=Manage Invites');

    // Create multiple invites
    const voters = ['voter1@test.com', 'voter2@test.com', 'voter3@test.com'];
    for (const email of voters) {
      await page.fill('input[name="email"]', email);
      await page.click('button:has-text("Create Invite")');
      await expect(page.locator('text=Invites created successfully')).toBeVisible();
    }

    // Get invite codes
    await page.click('button[role="tab"]:has-text("Manage Invites")');
    await page.waitForSelector('[data-testid="invite-code"]');

    const inviteCodes = await page.locator('[data-testid="invite-code"]').allTextContents();

    // Now simulate voting with each invite code
    for (let i = 0; i < inviteCodes.length; i++) {
      const inviteCode = inviteCodes[i].trim();

      // Navigate to voting page
      await page.goto(`http://localhost:3003/events/${eventId}/vote?code=${inviteCode}`);

      // Wait for voting interface to load
      await page.waitForSelector('[data-testid="allocation-0"]');

      // Simulate different voting patterns
      const slider0 = page.locator('[data-testid="allocation-0"]');
      const slider1 = page.locator('[data-testid="allocation-1"]');

      // Voter 1: 70-30 split, Voter 2: 40-60 split, Voter 3: 50-50 split
      const allocations = [
        [70, 30],
        [40, 60],
        [50, 50]
      ];

      const [credits0, credits1] = allocations[i];

      // Set slider values using keyboard navigation
      await slider0.click();
      await page.keyboard.press('Home');
      for (let j = 0; j < credits0; j++) {
        await page.keyboard.press('ArrowRight');
      }

      await slider1.click();
      await page.keyboard.press('Home');
      for (let j = 0; j < credits1; j++) {
        await page.keyboard.press('ArrowRight');
      }

      // Submit vote
      await page.click('button:has-text("Submit Vote")');
      await expect(page.locator('text=Vote submitted successfully')).toBeVisible();
    }

    // Now navigate to analytics dashboard
    await page.goto(`http://localhost:3003/events/${eventId}/results`);

    // Verify analytics dashboard loads
    await expect(page.locator('h1:has-text("Advanced Analytics Dashboard")')).toBeVisible();

    // Check that option performance data is not zero
    await expect(page.locator('text=Option A')).toBeVisible();
    await expect(page.locator('text=Option B')).toBeVisible();

    // Check that vote counts are displayed and not zero
    const optionCards = page.locator('.border.rounded-lg:has-text("Option")');
    const firstOption = optionCards.first();

    // Check that credits and vote counts are > 0
    const creditsText = await firstOption.locator('text=/Total Credits:.*\\d+/').textContent();
    const voteCountText = await firstOption.locator('text=/Vote Count:.*\\d+/').textContent();

    expect(creditsText).toMatch(/\d+/);
    expect(voteCountText).toMatch(/\d+/);

    // Verify that charts are displayed
    await expect(page.locator('canvas, svg')).toHaveCount({ min: 1 });

    // Check network graph tab
    await page.click('button[role="tab"]:has-text("Network Analysis")');
    await expect(page.locator('svg')).toBeVisible();

    // Check cluster analysis tab
    await page.click('button[role="tab"]:has-text("Cluster Analysis")');
    await expect(page.locator('text=Total Clusters')).toBeVisible();

    // Check timeline tab
    await page.click('button[role="tab"]:has-text("Timeline")');
    await expect(page.locator('text=Real-time Voting Timeline')).toBeVisible();

    console.log('✅ Analytics dashboard test completed successfully');
  });

});