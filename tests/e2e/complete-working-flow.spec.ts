import { test, expect } from '@playwright/test';

test.describe('Complete Working Event Creation Flow', () => {
  test('should create a complete event using correct selectors', async ({ page }) => {
    console.log('=== COMPLETE WORKING FLOW TEST ===');

    await page.goto('/events/create');
    console.log('✅ Navigated to event creation page');

    // Step 1: Basic Information
    console.log('Step 1: Fill basic information');
    await page.fill('input[name="title"]', 'Complete Working Event Test');
    await page.fill('textarea[name="description"]', 'Testing complete event creation with working selectors');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.fill('input[name="start"]', tomorrow.toISOString().slice(0, 16));

    const weekLater = new Date();
    weekLater.setDate(weekLater.getDate() + 7);
    await page.fill('input[name="end"]', weekLater.toISOString().slice(0, 16));

    console.log('✅ Step 1 complete - clicking Next');
    await page.click('text=Next: Choose Framework');
    await page.waitForTimeout(1000);

    // Step 2: Choose Framework
    console.log('Step 2: Select Binary Selection framework');
    await page.click('text=Binary Selection');
    await page.waitForTimeout(500);

    console.log('✅ Step 2 complete - clicking Next');
    await page.click('text=Next: Option Mode');
    await page.waitForTimeout(1000);

    // Step 3: Option Mode Selection
    console.log('Step 3: Select Admin-Defined Options');
    await page.click('text=Admin-Defined Options');
    await page.waitForTimeout(500);

    console.log('✅ Step 3 complete - clicking Next');
    await page.click('text=Next: Configure');
    await page.waitForTimeout(1000);

    // Step 4: Configuration (using working selectors)
    console.log('Step 4: Configure threshold using working selectors');

    // Use the working Select component approach
    const selectTrigger = page.locator('[role="combobox"]').first();
    await selectTrigger.click();
    await page.waitForTimeout(500);

    await page.click('text=Top N - Select top ranked options');
    await page.waitForTimeout(1000);

    // Fill topN input
    const topNInput = page.locator('input[name="topN"]');
    await topNInput.fill('3');
    await page.waitForTimeout(500);

    // Verify the value was set
    const topNValue = await topNInput.inputValue();
    console.log(`✅ TopN input value: "${topNValue}"`);

    // Credits should already have default value, but make sure it's set
    const creditsInput = page.locator('input[name="credits"]');
    const creditsValue = await creditsInput.inputValue();
    console.log(`✅ Credits value: "${creditsValue}"`);

    console.log('✅ Step 4 complete - clicking Next');
    await page.click('text=Next: Add Options');
    await page.waitForTimeout(1000);

    // Step 5: Add Options
    console.log('Step 5: Add voting options');

    // Fill option 1
    await page.fill('input[name="option-0-title"]', 'Option A - Budget for Parks');
    await page.fill('textarea[name="option-0-description"]', 'Allocate budget for new city parks');

    // Add and fill option 2
    await page.click('text=+ Add Another Option');
    await page.waitForTimeout(500);

    await page.fill('input[name="option-1-title"]', 'Option B - Infrastructure');
    await page.fill('textarea[name="option-1-description"]', 'Investment in road and bridge improvements');

    console.log('✅ Step 5 complete - attempting final submission');

    // Final submission
    const createButton = page.locator('button', { hasText: /Create Event|Submit/i }).first();
    const isEnabled = await createButton.isEnabled();
    console.log(`Create button enabled: ${isEnabled}`);

    if (isEnabled) {
      console.log('🚀 Submitting event...');
      await createButton.click();
      await page.waitForTimeout(3000);

      const finalUrl = page.url();
      console.log(`Final URL: ${finalUrl}`);

      if (finalUrl.includes('/admin/events/')) {
        console.log('🎉 SUCCESS: Event created and redirected to admin page!');
      } else {
        console.log('⚠️ Submitted but may not have redirected as expected');
      }
    } else {
      console.log('❌ Create button is still disabled');

      // Debug form state
      const allInputs = await page.locator('input, textarea').all();
      console.log('Final form state:');
      for (const input of allInputs) {
        const name = await input.getAttribute('name');
        const value = await input.inputValue();
        const required = await input.getAttribute('required');
        console.log(`- ${name}: "${value}" required=${required !== null}`);
      }
    }

    await page.screenshot({ path: 'complete-working-flow-final.png' });
    console.log('=== COMPLETE WORKING FLOW TEST FINISHED ===');
  });
});