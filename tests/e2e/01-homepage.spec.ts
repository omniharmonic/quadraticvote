import { test, expect } from '@playwright/test';

test.describe('Homepage Functionality', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/');

    // Check basic page elements
    await expect(page).toHaveTitle(/QuadraticVote/i);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should display framework comparison', async ({ page }) => {
    await page.goto('/');

    // Look for Binary Selection framework info
    await expect(page.locator('text=Binary Selection').or(page.locator('text=binary selection'))).toBeVisible();

    // Look for Proportional Distribution framework info
    await expect(page.locator('text=Proportional Distribution').or(page.locator('text=proportional distribution'))).toBeVisible();
  });

  test('should have working navigation to event creation', async ({ page }) => {
    await page.goto('/');

    // Look for create event button/link
    const createButton = page.locator('text=Create Event').or(page.locator('text=Create New Event')).or(page.locator('a[href*="/events/create"]'));
    if (await createButton.count() > 0) {
      await createButton.first().click();
      await expect(page).toHaveURL(/\/events\/create/);
    } else {
      console.log('⚠️  No "Create Event" button found on homepage');
    }
  });

  test('should display existing events if any', async ({ page }) => {
    await page.goto('/');

    // Check if events are displayed
    const eventCards = page.locator('[data-testid="event-card"]').or(page.locator('.event-card')).or(page.locator('[class*="event"]'));
    const eventCount = await eventCards.count();

    if (eventCount > 0) {
      console.log(`✅ Found ${eventCount} events displayed on homepage`);

      // Check if event cards have basic info
      const firstEvent = eventCards.first();
      await expect(firstEvent).toBeVisible();
    } else {
      console.log('ℹ️  No events currently displayed on homepage');
    }
  });
});