import { test, expect } from '@playwright/test';

test.describe('Fix Threshold Configuration', () => {
  test('should test and fix the threshold selection dropdown', async ({ page }) => {
    console.log('=== FIXING THRESHOLD CONFIGURATION ===');

    await page.goto('/events/create');

    // Fill basic info
    await page.fill('input[name="title"]', 'Threshold Fix Test');
    await page.fill('textarea[name="description"]', 'Testing threshold configuration fix');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.fill('input[name="start"]', tomorrow.toISOString().slice(0, 16));

    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    await page.fill('input[name="end"]', dayAfter.toISOString().slice(0, 16));

    // Go through steps
    await page.click('text=Next: Choose Framework');
    await page.click('text=Binary Selection');
    await page.click('text=Next: Configure');

    await page.waitForTimeout(1000);

    console.log('Step 1: Test the "Choose selection method" dropdown');

    const selectionMethodButton = page.locator('text=Choose selection method');
    if (await selectionMethodButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('✅ Found "Choose selection method" button');

      // Click it to open dropdown
      await selectionMethodButton.click();
      await page.waitForTimeout(500);

      console.log('Step 2: Check what threshold options appear');

      // Take screenshot after clicking
      await page.screenshot({ path: 'threshold-dropdown-open.png' });

      // Look for threshold options
      const thresholdOptions = await page.locator('text=Top, text=Percentage, text=Absolute, text=Above').all();
      console.log(`Found ${thresholdOptions.length} threshold options after clicking`);

      for (const option of thresholdOptions) {
        const text = await option.textContent();
        console.log(`- Threshold option: "${text}"`);
      }

      // Try to select "Top N" option
      const topNOption = page.locator('text=Top N').first();
      if (await topNOption.isVisible({ timeout: 1000 }).catch(() => false)) {
        await topNOption.click();
        console.log('✅ Selected Top N option');
        await page.waitForTimeout(500);

        // Check if threshold input appears
        const thresholdInput = page.locator('input[type="number"]').last();
        if (await thresholdInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          await thresholdInput.fill('3');
          console.log('✅ Filled threshold value: 3');
        }
      }

      // Try other threshold options
      const percentageOption = page.locator('text=Percentage').first();
      if (await percentageOption.isVisible({ timeout: 1000 }).catch(() => false)) {
        await percentageOption.click();
        console.log('✅ Selected Percentage option');
        await page.waitForTimeout(500);

        // Look for percentage input
        const percentageInput = page.locator('input[placeholder*="%"], input[placeholder*="percentage"]').first();
        if (await percentageInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          await percentageInput.fill('25');
          console.log('✅ Filled percentage: 25%');
        }
      }

    } else {
      console.log('❌ Could not find "Choose selection method" button');

      // Look for alternative selectors
      const dropdownButtons = await page.locator('button', { hasText: /choose|select|method/i }).all();
      console.log(`Found ${dropdownButtons.length} potential dropdown buttons`);

      for (const button of dropdownButtons) {
        const text = await button.textContent();
        console.log(`- Dropdown candidate: "${text}"`);
      }
    }

    console.log('Step 3: Fill credits per voter');

    const creditsInput = page.locator('input[name="credits"]');
    if (await creditsInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await creditsInput.fill('100');
      console.log('✅ Set credits per voter: 100');
    }

    console.log('Step 4: Check if Next button is now enabled');

    await page.waitForTimeout(1000);
    const nextButton = page.locator('text=Next: Add Options');

    const isEnabled = await nextButton.isEnabled().catch(() => false);
    console.log(`Next button enabled: ${isEnabled}`);

    if (isEnabled) {
      await nextButton.click();
      console.log('✅ Successfully clicked Next button!');

      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'step-4-options.png' });

      console.log('Current URL after Next:', page.url());

      // Check what's on the options step
      const optionElements = await page.locator('input, textarea, button').all();
      console.log('Elements on options step:');
      for (const el of optionElements) {
        const tag = await el.evaluate(e => e.tagName);
        const text = await el.textContent() || '';
        const name = await el.getAttribute('name') || '';
        console.log(`- ${tag} name="${name}" text="${text.substring(0, 30)}"`);
      }

    } else {
      console.log('❌ Next button still disabled');

      // Debug: check what might be missing
      const allInputs = await page.locator('input, select, textarea').all();
      console.log('All form inputs on this step:');
      for (const input of allInputs) {
        const tag = await input.evaluate(e => e.tagName);
        const name = await input.getAttribute('name') || '';
        const value = await input.inputValue().catch(() => '');
        const required = await input.getAttribute('required') !== null;
        console.log(`- ${tag} name="${name}" value="${value}" required=${required}`);
      }
    }

    console.log('=== THRESHOLD FIX TEST COMPLETED ===');
  });
});