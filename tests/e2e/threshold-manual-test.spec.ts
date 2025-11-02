import { test, expect } from '@playwright/test';

test.describe('Manual Threshold Test', () => {
  test('should manually test threshold configuration step by step', async ({ page }) => {
    console.log('=== MANUAL THRESHOLD TEST ===');

    await page.goto('/events/create');

    // Fill Step 1 - Basic Information
    console.log('Step 1: Fill basic information');
    await page.fill('input[name="title"]', 'Manual Threshold Test');
    await page.fill('textarea[name="description"]', 'Testing threshold step by step');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.fill('input[name="start"]', tomorrow.toISOString().slice(0, 16));

    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    await page.fill('input[name="end"]', dayAfter.toISOString().slice(0, 16));

    console.log('✅ Step 1 complete - clicking Next');
    await page.click('text=Next: Choose Framework');
    await page.waitForTimeout(1000);

    // Step 2 - Choose Framework
    console.log('Step 2: Select Binary Selection framework');
    await page.click('text=Binary Selection');
    await page.waitForTimeout(500);

    console.log('✅ Step 2 complete - clicking Next');
    await page.click('text=Next: Configure');
    await page.waitForTimeout(1000);

    // Step 3 - Detailed threshold testing
    console.log('Step 3: Testing threshold configuration...');

    // First, check if the Select component is working
    console.log('3a: Testing threshold mode selection');
    const selectTrigger = page.locator('[role="combobox"]').first();
    await selectTrigger.click();
    await page.waitForTimeout(500);

    // Select Top N option
    console.log('3b: Selecting Top N option');
    await page.click('text=Top N - Select top ranked options');
    await page.waitForTimeout(1000);

    // Now check if the topN input appears
    console.log('3c: Looking for topN input field');
    const topNInput = page.locator('input[name="topN"]');
    const isVisible = await topNInput.isVisible();
    console.log(`TopN input visible: ${isVisible}`);

    if (isVisible) {
      console.log('3d: Filling topN input with value 5');
      await topNInput.fill('5');
      await page.waitForTimeout(500);

      // Verify the value was set
      const inputValue = await topNInput.inputValue();
      console.log(`TopN input value after fill: "${inputValue}"`);

      // Check Next button state
      const nextButton = page.locator('text=Next: Add Options');
      const isEnabled = await nextButton.isEnabled();
      console.log(`Next button enabled after filling topN: ${isEnabled}`);

      if (isEnabled) {
        console.log('✅ SUCCESS: Next button is now enabled!');
        await nextButton.click();
        console.log('✅ Successfully proceeded to Step 4');
      } else {
        console.log('❌ Next button still disabled');

        // Debug: Check all form state
        console.log('Debugging form state...');
        const allInputs = await page.locator('input').all();
        for (const input of allInputs) {
          const name = await input.getAttribute('name');
          const value = await input.inputValue();
          const type = await input.getAttribute('type');
          console.log(`Input: name="${name}" type="${type}" value="${value}"`);
        }
      }
    } else {
      console.log('❌ TopN input not visible after selecting Top N option');
    }

    await page.screenshot({ path: 'manual-threshold-test-final.png' });
    console.log('=== MANUAL TEST COMPLETED ===');
  });
});