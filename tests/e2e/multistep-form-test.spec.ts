import { test, expect } from '@playwright/test';

test.describe('Multi-Step Form Test', () => {
  test('should test the multi-step event creation flow', async ({ page }) => {
    console.log('Step 1: Navigate to create event page');
    await page.goto('/events/create');

    console.log('Step 2: Fill out Step 1 form');

    await page.fill('input[name="title"]', 'Multi-Step Test Event');
    await page.fill('textarea[name="description"]', 'Testing the multi-step event creation flow');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.fill('input[name="start"]', tomorrow.toISOString().slice(0, 16));

    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    await page.fill('input[name="end"]', dayAfter.toISOString().slice(0, 16));

    console.log('✅ Filled Step 1 form');

    console.log('Step 3: Click Next to go to Step 2');

    // Click the "Next: Choose Framework" button
    await page.click('text=Next: Choose Framework');
    console.log('✅ Clicked Next button');

    console.log('Step 4: Wait and see what Step 2 looks like');

    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'step-2-framework.png' });

    // Check what's on Step 2
    const currentUrl = page.url();
    console.log('Current URL after Next:', currentUrl);

    // Look for framework selection options
    const frameworkOptions = await page.locator('[data-testid*="framework"], button[data-framework], input[type="radio"]').all();
    console.log(`Found ${frameworkOptions.length} framework selection options`);

    if (frameworkOptions.length > 0) {
      console.log('Framework options:');
      for (let i = 0; i < frameworkOptions.length; i++) {
        const text = await frameworkOptions[i].textContent();
        const value = await frameworkOptions[i].getAttribute('value') || await frameworkOptions[i].getAttribute('data-framework');
        console.log(`- Option ${i+1}: "${text}" value="${value}"`);
      }
    }

    // Look for any buttons on Step 2
    const buttons = await page.locator('button').all();
    console.log('Buttons found on Step 2:');
    for (const button of buttons) {
      const text = await button.textContent();
      const type = await button.getAttribute('type');
      console.log(`- Button: "${text}" type="${type}"`);
    }

    // Check for step indicators
    const stepIndicators = await page.locator('[class*="step"], .progress, .stepper').all();
    console.log(`Found ${stepIndicators.length} step indicators`);

    if (stepIndicators.length > 0) {
      for (const indicator of stepIndicators) {
        const text = await indicator.textContent();
        console.log(`- Step indicator: "${text?.substring(0, 50)}"`);
      }
    }

    console.log('Step 5: Test if we can select a framework');

    // Try to find and click Binary Selection if it exists
    const binaryOption = page.locator('text=Binary Selection').first();
    if (await binaryOption.isVisible({ timeout: 1000 }).catch(() => false)) {
      await binaryOption.click();
      console.log('✅ Selected Binary Selection framework');

      // Wait to see if anything changes
      await page.waitForTimeout(1000);

      // Look for Next button on Step 2
      const nextButton = page.locator('text=Next').first();
      if (await nextButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await nextButton.click();
        console.log('✅ Clicked Next from Step 2');

        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'step-3-after-framework.png' });

        console.log('Current URL after Step 2:', page.url());
      }
    } else {
      console.log('❌ Could not find Binary Selection option');
    }

    console.log('✅ Multi-step form test completed');
  });

  test('should analyze what happens when form is submitted without frameworks', async ({ page }) => {
    await page.goto('/events/create');

    // Fill minimal form
    await page.fill('input[name="title"]', 'Basic Test');
    await page.fill('textarea[name="description"]', 'Basic test description');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.fill('input[name="start"]', tomorrow.toISOString().slice(0, 16));

    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    await page.fill('input[name="end"]', dayAfter.toISOString().slice(0, 16));

    // Monitor network requests
    const requests = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        requests.push({
          url: request.url(),
          method: request.method()
        });
      }
    });

    // Try clicking Next
    await page.click('text=Next: Choose Framework');
    await page.waitForTimeout(2000);

    console.log('Network requests during form progression:');
    requests.forEach(req => {
      console.log(`- ${req.method} ${req.url}`);
    });

    console.log('✅ Basic progression test completed');
  });
});