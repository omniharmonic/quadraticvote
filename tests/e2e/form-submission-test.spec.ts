import { test, expect } from '@playwright/test';

test.describe('Form Submission Test', () => {
  test('should test complete form submission flow', async ({ page }) => {
    console.log('Step 1: Navigate to create event page');
    await page.goto('/events/create');

    console.log('Step 2: Fill out the form with corrected selectors');

    // Fill title using name attribute
    await page.fill('input[name="title"]', 'Test Event Form Submission');
    console.log('✅ Filled title');

    // Fill description using name attribute
    await page.fill('textarea[name="description"]', 'Testing if the form actually submits properly now');
    console.log('✅ Filled description');

    // Set start date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startDateTime = tomorrow.toISOString().slice(0, 16);
    await page.fill('input[name="start"]', startDateTime);
    console.log('✅ Set start date');

    // Set end date (day after tomorrow)
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    const endDateTime = dayAfter.toISOString().slice(0, 16);
    await page.fill('input[name="end"]', endDateTime);
    console.log('✅ Set end date');

    console.log('Step 3: Monitor network requests during submission');

    // Listen for network requests
    const requests = [];
    page.on('request', request => {
      if (request.url().includes('/api/') || request.method() === 'POST') {
        requests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData()
        });
      }
    });

    // Listen for responses
    const responses = [];
    page.on('response', response => {
      if (response.url().includes('/api/') || response.status() >= 400) {
        responses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });

    // Listen for console messages and errors
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });

    console.log('Step 4: Submit the form');

    // Take screenshot before submit
    await page.screenshot({ path: 'before-form-submit.png' });

    // Click submit button
    await page.click('button[type="submit"]');
    console.log('✅ Clicked submit button');

    console.log('Step 5: Wait and analyze what happens');

    // Wait for any network activity or page changes
    await page.waitForTimeout(3000);

    // Take screenshot after submit
    await page.screenshot({ path: 'after-form-submit.png' });

    console.log('Step 6: Report results');

    console.log('=== NETWORK REQUESTS ===');
    if (requests.length === 0) {
      console.log('❌ No API requests made - form may not be submitting');
    } else {
      requests.forEach(req => {
        console.log(`✅ ${req.method} ${req.url}`);
        if (req.postData) {
          console.log(`   Data: ${req.postData.substring(0, 200)}`);
        }
      });
    }

    console.log('=== RESPONSES ===');
    if (responses.length === 0) {
      console.log('No API responses received');
    } else {
      responses.forEach(resp => {
        console.log(`Response: ${resp.status} ${resp.statusText} - ${resp.url}`);
      });
    }

    console.log('=== CONSOLE MESSAGES ===');
    if (consoleMessages.length === 0) {
      console.log('No console messages');
    } else {
      consoleMessages.forEach(msg => {
        console.log(`Console: ${msg}`);
      });
    }

    console.log('=== FINAL STATE ===');
    console.log('Final URL:', page.url());

    // Check if we're still on the same page or navigated
    const isStillOnCreatePage = page.url().includes('/events/create');
    console.log('Still on create page:', isStillOnCreatePage);

    // Look for any visible error messages
    const errorElements = await page.locator('[role="alert"], .error, .text-red-500, .text-destructive').all();
    if (errorElements.length > 0) {
      console.log('❌ Error messages found:');
      for (const error of errorElements) {
        const text = await error.textContent();
        console.log(`   Error: ${text}`);
      }
    } else {
      console.log('✅ No error messages visible');
    }

    // Check if any success messages appeared
    const successElements = await page.locator('.text-green-500, .success, [role="status"]').all();
    if (successElements.length > 0) {
      console.log('✅ Success messages found:');
      for (const success of successElements) {
        const text = await success.textContent();
        console.log(`   Success: ${text}`);
      }
    }

    console.log('✅ Form submission test completed');
  });
});