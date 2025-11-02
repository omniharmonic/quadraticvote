import { test, expect } from '@playwright/test';

test.describe('Basic User Flow - Step by Step', () => {
  test('should complete basic homepage to event creation flow', async ({ page }) => {
    // Step 1: Load homepage
    console.log('Testing: Homepage load');
    await page.goto('/');

    // Take screenshot for debugging
    await page.screenshot({ path: 'debug-homepage.png' });

    // Check what's actually on the page
    const pageContent = await page.content();
    console.log('Page title:', await page.title());
    console.log('Page contains Create Event:', pageContent.includes('Create Event'));

    // Step 2: Look for Create Event button
    console.log('Testing: Create Event button existence');
    const createButton = page.locator('text=Create Event').first();
    await expect(createButton).toBeVisible();

    // Step 3: Click Create Event
    console.log('Testing: Navigate to event creation');
    await createButton.click();

    // Step 4: Check if we're on the right page
    await expect(page).toHaveURL('/events/create');

    // Step 5: Take screenshot of event creation page
    await page.screenshot({ path: 'debug-create-event.png' });

    // Step 6: Check what's actually on the event creation page
    const createPageContent = await page.content();
    console.log('Create page content preview:', createPageContent.substring(0, 500));

    // Step 7: Look for basic form elements
    console.log('Testing: Event creation form elements');

    // Check for title input
    const titleInput = page.locator('input[name="title"], input[placeholder*="title"], input[placeholder*="Title"]').first();
    await expect(titleInput).toBeVisible();

    // Step 8: Try to fill the title
    console.log('Testing: Fill event title');
    await titleInput.fill('Test Event');

    // Verify the title was filled
    await expect(titleInput).toHaveValue('Test Event');

    console.log('✅ Basic flow completed successfully!');
  });

  test('should identify what elements are actually present', async ({ page }) => {
    await page.goto('/');

    // Log all clickable elements
    const clickableElements = await page.locator('button, a, [role="button"]').all();
    console.log('Found clickable elements:');
    for (const element of clickableElements) {
      const text = await element.textContent();
      const tag = await element.evaluate(el => el.tagName);
      console.log(`- ${tag}: "${text}"`);
    }

    // Go to create event page
    await page.goto('/events/create');
    await page.screenshot({ path: 'debug-create-page-full.png' });

    // Log all form elements
    const formElements = await page.locator('input, textarea, select, button').all();
    console.log('Found form elements on create page:');
    for (const element of formElements) {
      const tag = await element.evaluate(el => el.tagName);
      const type = await element.evaluate(el => el.type || el.tagName);
      const name = await element.evaluate(el => el.name || el.id || '');
      const placeholder = await element.evaluate(el => el.placeholder || '');
      console.log(`- ${tag}[${type}] name="${name}" placeholder="${placeholder}"`);
    }
  });
});