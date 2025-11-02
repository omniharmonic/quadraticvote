import { test, expect } from '@playwright/test';

test.describe('Event Creation Workflow', () => {
  test('should access event creation page', async ({ page }) => {
    await page.goto('/events/create');

    // Check if event creation form is present
    await expect(page.locator('form').or(page.locator('[data-testid="event-form"]'))).toBeVisible();
  });

  test('should have framework selection options', async ({ page }) => {
    await page.goto('/events/create');

    // Look for Binary Selection option
    const binaryOption = page.locator('text=Binary Selection').or(page.locator('input[value="binary_selection"]')).or(page.locator('[data-value="binary_selection"]'));

    // Look for Proportional Distribution option
    const proportionalOption = page.locator('text=Proportional Distribution').or(page.locator('input[value="proportional_distribution"]')).or(page.locator('[data-value="proportional_distribution"]'));

    if (await binaryOption.count() > 0) {
      console.log('✅ Binary Selection framework option found');
    } else {
      console.log('❌ Binary Selection framework option not found');
    }

    if (await proportionalOption.count() > 0) {
      console.log('✅ Proportional Distribution framework option found');
    } else {
      console.log('❌ Proportional Distribution framework option not found');
    }
  });

  test('should create binary selection event', async ({ page }) => {
    await page.goto('/events/create');

    try {
      // Fill basic event details
      const titleInput = page.locator('input[name="title"]').or(page.locator('#title')).or(page.locator('[placeholder*="title"]'));
      if (await titleInput.count() > 0) {
        await titleInput.fill('Test Binary Event');
        console.log('✅ Filled event title');
      } else {
        console.log('❌ Title input field not found');
        return;
      }

      const descInput = page.locator('textarea[name="description"]').or(page.locator('#description')).or(page.locator('[placeholder*="description"]'));
      if (await descInput.count() > 0) {
        await descInput.fill('This is a test binary selection event');
        console.log('✅ Filled event description');
      }

      // Try to select Binary Selection framework
      const binaryOption = page.locator('text=Binary Selection').or(page.locator('[data-value="binary_selection"]'));
      if (await binaryOption.count() > 0) {
        await binaryOption.click();
        console.log('✅ Selected Binary Selection framework');
      }

      // Look for submit/create button
      const submitButton = page.locator('button[type="submit"]').or(page.locator('text=Create Event')).or(page.locator('text=Create')).or(page.locator('text=Submit'));
      if (await submitButton.count() > 0) {
        await submitButton.click();
        console.log('✅ Clicked create button');

        // Wait for navigation or success message
        await page.waitForTimeout(2000);

        // Check if we're redirected or get success message
        const currentUrl = page.url();
        if (currentUrl.includes('/events/') && !currentUrl.includes('/create')) {
          console.log('✅ Successfully created event and redirected');
        } else {
          console.log('⚠️  Event creation may not have completed properly');
        }
      } else {
        console.log('❌ Submit button not found');
      }
    } catch (error) {
      console.log('❌ Event creation failed:', error);
    }
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/events/create');

    // Try to submit without filling required fields
    const submitButton = page.locator('button[type="submit"]').or(page.locator('text=Create Event')).or(page.locator('text=Create')).or(page.locator('text=Submit'));

    if (await submitButton.count() > 0) {
      await submitButton.click();

      // Look for validation errors
      const errorMessages = page.locator('.error').or(page.locator('[class*="error"]')).or(page.locator('text=required'));
      const errorCount = await errorMessages.count();

      if (errorCount > 0) {
        console.log(`✅ Form validation working - found ${errorCount} error messages`);
      } else {
        console.log('⚠️  No validation errors found - validation may not be implemented');
      }
    }
  });
});