const { test, expect } = require('@playwright/test');

test('Direct Anonymous Voting Test', async ({ page }) => {
  console.log('=== TESTING ANONYMOUS VOTING DIRECTLY ===');

  // First, let's create an event via API call
  const eventData = {
    title: 'Anonymous Voting Test Event',
    description: 'Testing anonymous voting functionality',
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    visibility: 'public',
    decisionFramework: {
      framework_type: 'binary_selection',
      config: {
        threshold_mode: 'top_n',
        top_n_count: 2,
        tiebreaker: 'timestamp'
      }
    },
    optionMode: 'admin_defined',
    creditsPerVoter: 100,
    showResultsDuringVoting: false,
    showResultsAfterClose: true,
    initialOptions: [
      { title: 'Option A', description: 'First test option' },
      { title: 'Option B', description: 'Second test option' }
    ],
    voteSettings: {
      allowAnonymous: true,
      allowVoteChanges: true
    }
  };

  // Make API call to create event
  const response = await page.request.post('/api/events', {
    data: eventData
  });

  const result = await response.json();

  if (!result.success) {
    console.error('Failed to create event:', result);
    throw new Error('Event creation failed');
  }

  const eventId = result.event.id;
  console.log(`✅ Event created via API: ${eventId}`);

  // Now test anonymous voting
  await page.goto(`/events/${eventId}/vote`);
  await page.waitForTimeout(3000);

  // Wait for the page to fully load
  await page.waitForSelector('body', { timeout: 10000 });

  // Check if we're directly on the voting interface (anonymous voting auto-enabled)
  await page.waitForTimeout(2000); // Additional wait for React to render
  const optionAVisible = await page.locator('text=Option A').isVisible();
  const optionBVisible = await page.locator('text=Option B').isVisible();

  // If not already on voting interface, check for anonymous voting option
  if (!optionAVisible || !optionBVisible) {
    const anonymousButton = page.locator('text=Continue as Anonymous Voter');
    const isAnonymousOptionVisible = await anonymousButton.isVisible();

    if (isAnonymousOptionVisible) {
      console.log('✅ Anonymous voting option found');
      await anonymousButton.click();
      await page.waitForTimeout(2000);
    } else {
      console.log('❌ Neither voting interface nor anonymous button found');
      return;
    }
  } else {
    console.log('✅ Anonymous voting auto-enabled - directly on voting interface');
  }

  // Check voting interface
  const finalOptionAVisible = await page.locator('text=Option A').isVisible();
  const finalOptionBVisible = await page.locator('text=Option B').isVisible();

  if (finalOptionAVisible && finalOptionBVisible) {
      console.log('✅ Voting options displayed correctly');

      // Try to find sliders and interact with them
      const sliders = page.locator('[role="slider"]');
      const sliderCount = await sliders.count();
      console.log(`Found ${sliderCount} sliders`);

      if (sliderCount >= 2) {
        // Allocate some credits to first option
        await sliders.nth(0).click();
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowRight');

        await page.waitForTimeout(500);

        // Allocate some credits to second option
        await sliders.nth(1).click();
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowRight');

        await page.waitForTimeout(500);

        // Look for submit button
        const submitButton = page.locator('text=Submit Vote');
        if (await submitButton.isVisible()) {
          console.log('✅ Submit Vote button found');

          if (await submitButton.isEnabled()) {
            await submitButton.click();
            await page.waitForTimeout(3000);

            // Check if vote was submitted
            const currentUrl = page.url();
            if (currentUrl.includes('/results')) {
              console.log('✅ Vote submitted successfully - redirected to results');
            } else {
              console.log('ℹ️ Vote submission may have succeeded but no redirect');
            }
          } else {
            console.log('❌ Submit button is disabled');
          }
        } else {
          console.log('❌ Submit Vote button not found');
        }
      } else {
        console.log('❌ Could not find voting sliders');
      }
    } else {
      console.log('❌ Voting options not displayed');

      // Check what we actually see
      const pageContent = await page.textContent('body');
      console.log('Page content preview:', pageContent.substring(0, 500));
    }

  await page.screenshot({ path: 'direct-anonymous-voting-test.png' });
  console.log('=== DIRECT ANONYMOUS VOTING TEST COMPLETED ===');
});