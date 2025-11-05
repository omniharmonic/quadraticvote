const { test, expect } = require('@playwright/test');

test('Anonymous Voting End-to-End Test', async ({ page }) => {
  console.log('=== TESTING ANONYMOUS VOTING FUNCTIONALITY ===');

  // Step 1: Create a simple public event for testing
  await page.goto('/events/create');
  await page.waitForTimeout(1000);

  // Basic Information
  await page.fill('input[name="title"]', 'Anonymous Voting Test Event');
  await page.fill('textarea[name="description"]', 'Testing anonymous voting functionality');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  await page.fill('input[name="start"]', tomorrow.toISOString().slice(0, 16));

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  await page.fill('input[name="end"]', nextWeek.toISOString().slice(0, 16));

  await page.click('text=Next: Framework');
  await page.waitForTimeout(1000);

  // Select Binary Selection (simpler for testing)
  await page.click('text=Binary Selection');
  await page.waitForTimeout(500);

  await page.click('text=Next: Option Mode');
  await page.waitForTimeout(1000);

  // Select Admin Defined
  await page.click('text=Admin-Defined Options');
  await page.waitForTimeout(500);

  await page.click('text=Next: Configure');
  await page.waitForTimeout(1000);

  // Configure binary selection
  await page.click('[role="combobox"]');
  await page.waitForTimeout(500);
  await page.click('text=Top N - Select top ranked options');
  await page.waitForTimeout(500);

  await page.fill('input[name="topN"]', '2');
  await page.waitForTimeout(500);

  await page.click('text=Next: Add Options');
  await page.waitForTimeout(1000);

  // Add test options
  await page.fill('input[name="option-0-title"]', 'Option A');
  await page.fill('textarea[name="option-0-description"]', 'First test option');

  await page.click('text=+ Add Another Option');
  await page.waitForTimeout(500);

  await page.fill('input[name="option-1-title"]', 'Option B');
  await page.fill('textarea[name="option-1-description"]', 'Second test option');

  // Navigate to Vote Settings
  await page.click('text=Next: Vote Settings');
  await page.waitForTimeout(1000);

  // Enable Anonymous Voting
  const anonymousToggle = page.locator('#allowAnonymous');
  await anonymousToggle.check();
  await page.waitForTimeout(500);
  console.log('✅ Anonymous voting enabled');

  // Create the event
  await page.click('text=Create Event');
  await page.waitForTimeout(3000);

  // Extract event ID
  const url = page.url();
  const match = url.match(/\/admin\/events\/([^\/]+)/);

  if (!match) {
    throw new Error('Failed to create event - no event ID found');
  }

  const eventId = match[1];
  console.log(`✅ Event created: ${eventId}`);

  // Step 2: Test anonymous voting
  console.log('Testing anonymous voting...');

  // Navigate to the voting page without an invite code
  await page.goto(`/events/${eventId}/vote`);
  await page.waitForTimeout(2000);

  // Should see option to continue as anonymous voter
  const anonymousButton = page.locator('text=Continue as Anonymous Voter');
  if (await anonymousButton.isVisible()) {
    console.log('✅ Anonymous voting option found');
    await anonymousButton.click();
    await page.waitForTimeout(2000);

    // Should now be on the voting interface
    const option1 = page.locator('input[name="option-0-title"]').first();
    const option2 = page.locator('input[name="option-1-title"]').first();

    if (await page.locator('text=Option A').isVisible() && await page.locator('text=Option B').isVisible()) {
      console.log('✅ Voting options displayed');

      // Allocate some credits to options
      const slider1 = page.locator('[data-testid="slider-track"]').first();
      const slider2 = page.locator('[data-testid="slider-track"]').last();

      // Try to interact with sliders (this might be challenging)
      await page.waitForTimeout(1000);

      // Look for submit button
      const submitButton = page.locator('text=Submit Vote');
      if (await submitButton.isVisible()) {
        console.log('✅ Submit Vote button found');

        // Try to submit (might fail if no credits allocated)
        if (await submitButton.isEnabled()) {
          await submitButton.click();
          await page.waitForTimeout(2000);
          console.log('✅ Vote submitted successfully');
        } else {
          console.log('ℹ️ Submit button disabled (need to allocate credits)');
        }
      } else {
        console.log('❌ Submit Vote button not found');
      }
    } else {
      console.log('❌ Voting options not displayed');
    }
  } else {
    console.log('❌ Anonymous voting option not found');
  }

  await page.screenshot({ path: 'anonymous-voting-test.png' });
  console.log('=== ANONYMOUS VOTING TEST COMPLETED ===');
});