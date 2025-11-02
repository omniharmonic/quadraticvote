import { test, expect } from '@playwright/test';

test.describe('Event Creation - Comprehensive Test', () => {
  test('should complete full event creation flow', async ({ page }) => {
    console.log('Step 1: Navigate to homepage');
    await page.goto('/');

    console.log('Step 2: Click Create Event');
    await page.click('text=Create Event');
    await expect(page).toHaveURL('/events/create');

    console.log('Step 3: Fill out event form');

    // Fill title
    await page.fill('input[name="title"]', 'Test Event 2024');
    console.log('✅ Filled title');

    // Fill description
    await page.fill('textarea[name="description"]', 'This is a comprehensive test event to verify the system works');
    console.log('✅ Filled description');

    // Set start date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startDateTime = tomorrow.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
    await page.fill('input[name="start"]', startDateTime);
    console.log('✅ Set start date');

    // Set end date (day after tomorrow)
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    const endDateTime = dayAfter.toISOString().slice(0, 16);
    await page.fill('input[name="end"]', endDateTime);
    console.log('✅ Set end date');

    console.log('Step 4: Submit form');

    // Take screenshot before submitting
    await page.screenshot({ path: 'before-submit.png' });

    // Look for submit button and click it
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    await submitButton.click();
    console.log('✅ Clicked submit');

    console.log('Step 5: Check what happens after submit');

    // Wait a moment for navigation/response
    await page.waitForTimeout(2000);

    // Take screenshot after submit
    await page.screenshot({ path: 'after-submit.png' });

    // Check current URL and page content
    const currentUrl = page.url();
    console.log('Current URL after submit:', currentUrl);

    // Check if we're redirected somewhere
    const pageContent = await page.textContent('body');
    console.log('Page content contains "success":', pageContent?.includes('success'));
    console.log('Page content contains "error":', pageContent?.includes('error'));
    console.log('Page content contains "Event":', pageContent?.includes('Event'));

    // Log any error messages that might be visible
    const errorMessages = await page.locator('[role="alert"], .error, .text-red-500, .text-destructive').all();
    if (errorMessages.length > 0) {
      console.log('Found error messages:');
      for (const error of errorMessages) {
        const text = await error.textContent();
        console.log('- Error:', text);
      }
    }

    console.log('✅ Event creation flow completed');
  });

  test('should identify the actual form structure', async ({ page }) => {
    await page.goto('/events/create');

    console.log('=== FORM STRUCTURE ANALYSIS ===');

    // Get all form elements with their attributes
    const formElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('input, textarea, select, button'));
      return elements.map(el => ({
        tag: el.tagName,
        type: el.type || 'N/A',
        name: el.name || 'N/A',
        id: el.id || 'N/A',
        placeholder: el.placeholder || 'N/A',
        required: el.required,
        text: el.textContent?.trim() || 'N/A'
      }));
    });

    console.log('Form elements found:');
    formElements.forEach((el, i) => {
      console.log(`${i + 1}. ${el.tag}[${el.type}] name="${el.name}" id="${el.id}" placeholder="${el.placeholder}" required=${el.required} text="${el.text}"`);
    });

    // Check if there are any fieldsets or form sections
    const sections = await page.evaluate(() => {
      const fieldsets = Array.from(document.querySelectorAll('fieldset'));
      const divSections = Array.from(document.querySelectorAll('div[class*="step"], div[class*="section"], div[class*="form"]'));

      return {
        fieldsets: fieldsets.map(fs => fs.querySelector('legend')?.textContent || 'No legend'),
        sections: divSections.map(div => ({
          className: div.className,
          text: div.textContent?.substring(0, 100) || ''
        }))
      };
    });

    console.log('Form sections:', sections);

    // Check if there are any framework selection options
    const frameworkOptions = await page.locator('input[type="radio"], button[data-framework], [data-testid*="framework"]').all();
    console.log('Framework selection options found:', frameworkOptions.length);

    for (const option of frameworkOptions) {
      const text = await option.textContent();
      const value = await option.getAttribute('value');
      console.log(`- Framework option: "${text}" value="${value}"`);
    }

    // Check for any hidden inputs or data
    const hiddenInputs = await page.locator('input[type="hidden"]').all();
    console.log('Hidden inputs found:', hiddenInputs.length);

    for (const hidden of hiddenInputs) {
      const name = await hidden.getAttribute('name');
      const value = await hidden.getAttribute('value');
      console.log(`- Hidden: name="${name}" value="${value}"`);
    }
  });

  test('should test what happens when form is submitted', async ({ page }) => {
    await page.goto('/events/create');

    // Fill minimum required fields
    await page.fill('input[name="title"]', 'Submit Test Event');
    await page.fill('textarea[name="description"]', 'Testing form submission');

    // Set dates
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.fill('input[name="start"]', tomorrow.toISOString().slice(0, 16));

    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    await page.fill('input[name="end"]', dayAfter.toISOString().slice(0, 16));

    // Listen for network requests
    const requests = [];
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        postData: request.postData()
      });
    });

    // Listen for console messages
    page.on('console', msg => {
      console.log('Browser console:', msg.text());
    });

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for any network activity
    await page.waitForTimeout(3000);

    console.log('Network requests made:');
    requests.forEach(req => {
      console.log(`- ${req.method} ${req.url}`);
      if (req.postData) {
        console.log(`  Data: ${req.postData.substring(0, 200)}`);
      }
    });

    // Check final page state
    console.log('Final URL:', page.url());
    await page.screenshot({ path: 'final-state.png' });
  });
});