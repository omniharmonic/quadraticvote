import { test, expect } from '@playwright/test';

test.describe('Complete Event Creation Flow', () => {
  test('should create a complete event end-to-end', async ({ page }) => {
    console.log('=== STARTING COMPLETE EVENT CREATION TEST ===');

    // Monitor all network requests
    const requests = [];
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        timestamp: new Date().toISOString()
      });
    });

    const responses = [];
    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        timestamp: new Date().toISOString()
      });
    });

    console.log('Step 1: Fill out basic event information');
    await page.goto('/events/create');

    await page.fill('input[name="title"]', 'Complete Test Event 2024');
    await page.fill('textarea[name="description"]', 'A comprehensive test to verify the entire event creation pipeline works correctly');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.fill('input[name="start"]', tomorrow.toISOString().slice(0, 16));

    const weekLater = new Date();
    weekLater.setDate(weekLater.getDate() + 7);
    await page.fill('input[name="end"]', weekLater.toISOString().slice(0, 16));

    console.log('✅ Step 1: Basic info filled');

    console.log('Step 2: Choose framework');
    await page.click('text=Next: Choose Framework');
    await page.waitForTimeout(1000);

    // Select Binary Selection
    await page.click('text=Binary Selection');
    await page.waitForTimeout(500);

    await page.click('text=Next: Configure');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'step-3-configure.png' });

    console.log('✅ Step 2: Framework selected');

    console.log('Step 3: Analyze configuration step');

    // Look for configuration options
    const configElements = await page.locator('input, select, textarea, button').all();
    console.log('Configuration elements found:');
    for (const element of configElements) {
      const tag = await element.evaluate(el => el.tagName);
      const type = await element.evaluate(el => el.type || el.tagName);
      const name = await element.evaluate(el => el.name || el.id || '');
      const text = await element.textContent() || '';
      console.log(`- ${tag}[${type}] name="${name}" text="${text.substring(0, 50)}"`);
    }

    // Look for threshold configuration
    const thresholdElements = await page.locator('text=threshold, text=Top, text=Percentage, input[type="number"]').all();
    console.log(`Found ${thresholdElements.length} threshold-related elements`);

    // Look for credits configuration
    const creditElements = await page.locator('text=credits, text=Credits, input[name*="credit"]').all();
    console.log(`Found ${creditElements.length} credit-related elements`);

    // Try to fill any configuration that's required
    const numberInputs = await page.locator('input[type="number"]').all();
    if (numberInputs.length > 0) {
      console.log('Filling number inputs...');
      for (let i = 0; i < numberInputs.length; i++) {
        const name = await numberInputs[i].getAttribute('name');
        const placeholder = await numberInputs[i].getAttribute('placeholder');
        console.log(`- Found number input: name="${name}" placeholder="${placeholder}"`);

        // Try to fill with reasonable defaults
        if (name?.includes('credit') || placeholder?.includes('credit')) {
          await numberInputs[i].fill('100');
          console.log('  → Set to 100 (credits)');
        } else if (name?.includes('threshold') || placeholder?.includes('threshold')) {
          await numberInputs[i].fill('3');
          console.log('  → Set to 3 (threshold)');
        }
      }
    }

    // Look for dropdown selects
    const selects = await page.locator('select').all();
    if (selects.length > 0) {
      console.log('Found select dropdowns...');
      for (const select of selects) {
        const name = await select.getAttribute('name');
        console.log(`- Select: name="${name}"`);

        // Try to select the first option
        const options = await select.locator('option').all();
        if (options.length > 1) {
          const firstValue = await options[1].getAttribute('value'); // Skip first empty option
          if (firstValue) {
            await select.selectOption(firstValue);
            console.log(`  → Selected: ${firstValue}`);
          }
        }
      }
    }

    console.log('✅ Step 3: Configuration attempted');

    console.log('Step 4: Try to proceed to next step');

    // Look for Next button
    const nextButton = page.locator('button').filter({ hasText: /Next/i }).first();
    if (await nextButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nextButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'step-4-after-config.png' });
      console.log('✅ Step 4: Proceeded to next step');
    } else {
      console.log('❌ No Next button found');
    }

    console.log('Step 5: Look for final submission');

    // Check for Create/Submit buttons
    const submitButtons = await page.locator('button').filter({ hasText: /Create|Submit|Finish/i }).all();
    console.log(`Found ${submitButtons.length} potential submit buttons`);

    for (const button of submitButtons) {
      const text = await button.textContent();
      const type = await button.getAttribute('type');
      const disabled = await button.isDisabled();
      console.log(`- Submit button: "${text}" type="${type}" disabled=${disabled}`);
    }

    if (submitButtons.length > 0) {
      const mainSubmit = submitButtons[0];
      const isDisabled = await mainSubmit.isDisabled();

      if (!isDisabled) {
        console.log('Step 6: Attempting final submission');
        await mainSubmit.click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'after-final-submit.png' });

        const finalUrl = page.url();
        console.log('Final URL after submission:', finalUrl);

        // Check if we were redirected somewhere
        if (finalUrl !== 'http://localhost:3000/events/create') {
          console.log('✅ REDIRECTED - Event creation may have succeeded!');

          // Look for success indicators
          const successElements = await page.locator('text=success, text=created, text=Success, .success').all();
          if (successElements.length > 0) {
            console.log('✅ SUCCESS MESSAGES FOUND');
            for (const elem of successElements) {
              const text = await elem.textContent();
              console.log(`- Success: ${text}`);
            }
          }
        } else {
          console.log('❌ Still on create page - submission may have failed');
        }
      } else {
        console.log('❌ Submit button is disabled');
      }
    }

    console.log('=== NETWORK ACTIVITY SUMMARY ===');
    const postRequests = requests.filter(r => r.method === 'POST');
    console.log(`POST requests made: ${postRequests.length}`);
    postRequests.forEach(req => {
      console.log(`- POST ${req.url} at ${req.timestamp}`);
    });

    const errorResponses = responses.filter(r => r.status >= 400);
    if (errorResponses.length > 0) {
      console.log('❌ Error responses:');
      errorResponses.forEach(resp => {
        console.log(`- ${resp.status} ${resp.statusText} - ${resp.url}`);
      });
    } else {
      console.log('✅ No error responses');
    }

    console.log('=== TEST COMPLETED ===');
  });

  test('should test threshold configuration specifically', async ({ page }) => {
    console.log('=== TESTING THRESHOLD CONFIGURATION ===');

    await page.goto('/events/create');

    // Fill basic info
    await page.fill('input[name="title"]', 'Threshold Test Event');
    await page.fill('textarea[name="description"]', 'Testing threshold configuration');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.fill('input[name="start"]', tomorrow.toISOString().slice(0, 16));

    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    await page.fill('input[name="end"]', dayAfter.toISOString().slice(0, 16));

    // Go to framework selection
    await page.click('text=Next: Choose Framework');
    await page.click('text=Binary Selection');
    await page.click('text=Next: Configure');

    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'threshold-config-page.png' });

    // Look specifically for threshold controls
    console.log('Looking for threshold configuration...');

    const thresholdModeSelect = page.locator('select', { hasText: /threshold|mode/i }).first();
    if (await thresholdModeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('✅ Found threshold mode selector');

      // Try different threshold modes
      const options = await thresholdModeSelect.locator('option').all();
      for (const option of options) {
        const value = await option.getAttribute('value');
        const text = await option.textContent();
        console.log(`- Threshold option: "${text}" value="${value}"`);
      }
    } else {
      console.log('❌ No threshold mode selector found');
    }

    // Look for threshold input fields
    const thresholdInputs = await page.locator('input[name*="threshold"], input[name*="topN"], input[name*="count"]').all();
    console.log(`Found ${thresholdInputs.length} threshold input fields`);

    for (const input of thresholdInputs) {
      const name = await input.getAttribute('name');
      const placeholder = await input.getAttribute('placeholder');
      console.log(`- Threshold input: name="${name}" placeholder="${placeholder}"`);
    }

    console.log('✅ Threshold configuration analysis complete');
  });
});