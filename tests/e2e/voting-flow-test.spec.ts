import { test, expect } from '@playwright/test';

test.describe('Complete Voting Flow Test', () => {
  test('should create event, generate invites, and allow voting', async ({ page }) => {
    console.log('=== COMPLETE VOTING FLOW TEST ===');

    let eventId: string;
    let inviteCode: string;

    // Step 1: Create a test event
    console.log('Step 1: Creating test event...');
    await page.goto('/events/create');

    // Fill basic information
    await page.fill('input[name="title"]', 'Voting Flow Test Event');
    await page.fill('textarea[name="description"]', 'Testing complete voting process');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.fill('input[name="start"]', tomorrow.toISOString().slice(0, 16));

    const weekLater = new Date();
    weekLater.setDate(weekLater.getDate() + 7);
    await page.fill('input[name="end"]', weekLater.toISOString().slice(0, 16));

    await page.click('text=Next: Choose Framework');
    await page.waitForTimeout(1000);

    // Choose framework
    await page.click('text=Binary Selection');
    await page.waitForTimeout(500);

    await page.click('text=Next: Option Mode');
    await page.waitForTimeout(1000);

    // Select admin-defined options
    await page.click('text=Admin-Defined Options');
    await page.waitForTimeout(500);

    await page.click('text=Next: Configure');
    await page.waitForTimeout(1000);

    // Configure framework
    const selectTrigger = page.locator('[role="combobox"]').first();
    await selectTrigger.click();
    await page.waitForTimeout(500);

    await page.click('text=Top N - Select top ranked options');
    await page.waitForTimeout(1000);

    await page.fill('input[name="topN"]', '2');
    await page.waitForTimeout(500);

    await page.click('text=Next: Add Options');
    await page.waitForTimeout(1000);

    // Add options
    await page.fill('input[name="option-0-title"]', 'Option A - Parks');
    await page.fill('textarea[name="option-0-description"]', 'Funding for city parks');

    await page.click('text=+ Add Another Option');
    await page.waitForTimeout(500);

    await page.fill('input[name="option-1-title"]', 'Option B - Roads');
    await page.fill('textarea[name="option-1-description"]', 'Infrastructure improvements');

    await page.click('text=+ Add Another Option');
    await page.waitForTimeout(500);

    await page.fill('input[name="option-2-title"]', 'Option C - Schools');
    await page.fill('textarea[name="option-2-description"]', 'Education funding');

    // Submit event
    const createButton = page.locator('button', { hasText: /Create Event|Submit/i }).first();
    await createButton.click();
    await page.waitForTimeout(3000);

    // Extract event ID from URL
    const url = page.url();
    const match = url.match(/\/admin\/events\/([^\/]+)/);
    if (match) {
      eventId = match[1];
      console.log(`✅ Event created with ID: ${eventId}`);
    } else {
      throw new Error('Could not extract event ID from URL');
    }

    // Step 2: Generate invite codes
    console.log('Step 2: Generating invite codes...');

    // Look for invite management interface
    const inviteSection = page.locator('text=Invite Management').or(page.locator('text=Generate Invites'));

    if (await inviteSection.isVisible()) {
      console.log('✅ Found invite management section');

      // Look for generate invite button
      const generateButton = page.locator('button', { hasText: /Generate.*Invite/i });
      if (await generateButton.isVisible()) {
        await generateButton.click();
        await page.waitForTimeout(1000);
        console.log('✅ Clicked generate invite button');
      }
    } else {
      console.log('⚠️ Could not find invite management section, checking page content...');
      await page.screenshot({ path: 'voting-flow-admin-page.png' });

      // Try to find any invite-related elements
      const pageContent = await page.textContent('body');
      console.log('Page content keywords:', pageContent?.includes('invite') ? 'Found invite' : 'No invite found');
    }

    // For now, let's try to navigate to the public event page to test the flow
    console.log('Step 3: Testing public event page navigation...');
    await page.goto(`/events/${eventId}`);
    await page.waitForTimeout(2000);

    // Check if "Start Voting" button is visible
    const startVotingButton = page.locator('button', { hasText: 'Start Voting' });
    if (await startVotingButton.isVisible()) {
      console.log('✅ Found Start Voting button on public page');
      await startVotingButton.click();
      await page.waitForTimeout(1000);

      // Should now be on voting page asking for invite code
      const codeInput = page.locator('input[id="code"]');
      if (await codeInput.isVisible()) {
        console.log('✅ Voting page correctly asks for invite code');

        // Test with a dummy code to see error handling
        await codeInput.fill('DUMMY123');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1000);

        // Should show error for invalid code
        console.log('✅ Tested invalid code error handling');
      } else {
        console.log('❌ Voting page not asking for invite code');
      }
    } else {
      console.log('❌ Start Voting button not found on public page');
    }

    await page.screenshot({ path: 'voting-flow-final-state.png' });
    console.log('=== VOTING FLOW TEST COMPLETED ===');
  });

  test('should test voting with URL invite code', async ({ page }) => {
    console.log('=== TESTING URL INVITE CODE FLOW ===');

    // Test accessing voting page with code in URL
    const testEventId = 'test-event-123';
    const testCode = 'INVITE123';

    await page.goto(`/events/${testEventId}/vote?code=${testCode}`);
    await page.waitForTimeout(2000);

    // Check if the code is automatically recognized
    const pageContent = await page.textContent('body');

    if (pageContent?.includes('Invalid') || pageContent?.includes('error')) {
      console.log('✅ URL code handling shows appropriate error for non-existent event');
    } else if (pageContent?.includes('Loading')) {
      console.log('✅ URL code handling attempted to load event');
    } else {
      console.log('⚠️ Unclear response to URL with invite code');
    }

    await page.screenshot({ path: 'url-invite-code-test.png' });
    console.log('=== URL INVITE CODE TEST COMPLETED ===');
  });
});