import { test, expect } from '@playwright/test';

test.describe('Event Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to event creation page', async ({ page }) => {
    // Click "Create Event" button from homepage
    await page.click('text=Create Event');

    // Should be on the event creation page
    await expect(page).toHaveURL('/events/create');

    // Should see the create event form
    await expect(page.locator('h1')).toContainText('Create New Event');
  });

  test('should complete event creation flow with binary selection', async ({ page }) => {
    await page.goto('/events/create');

    // Step 1: Basic Information
    await expect(page.locator('h2')).toContainText('Basic Information');

    await page.fill('[name="title"]', 'Test Binary Event');
    await page.fill('[name="description"]', 'A test event for binary selection voting');

    // Click Next
    await page.click('text=Next');

    // Step 2: Decision Framework
    await expect(page.locator('h2')).toContainText('Decision Framework');

    // Select Binary Selection
    await page.click('[data-testid="framework-binary_selection"]');

    // Click Next
    await page.click('text=Next');

    // Step 3: Selection Parameters
    await expect(page.locator('h2')).toContainText('Selection Parameters');

    // Should see threshold mode selector
    await expect(page.locator('text=Threshold Mode')).toBeVisible();

    // Test Top N threshold
    await page.selectOption('[name="thresholdMode"]', 'top_n');
    await page.fill('[name="topNCount"]', '3');

    // Set credits per voter
    await page.fill('[name="creditsPerVoter"]', '100');

    // Set option mode
    await page.selectOption('[name="optionMode"]', 'community_proposals');

    // Click Next
    await page.click('text=Next');

    // Step 4: Review and Create
    await expect(page.locator('h2')).toContainText('Review & Create');

    // Should see review information
    await expect(page.locator('text=Test Binary Event')).toBeVisible();
    await expect(page.locator('text=Binary Selection')).toBeVisible();
    await expect(page.locator('text=Top 3')).toBeVisible();

    // Create the event
    await page.click('text=Create Event');

    // Should redirect to event management hub
    await expect(page).toHaveURL(/\/admin\/events\/[a-f0-9-]+$/);
    await expect(page.locator('h1')).toContainText('Event Management');
  });

  test('should complete event creation flow with proportional distribution', async ({ page }) => {
    await page.goto('/events/create');

    // Step 1: Basic Information
    await page.fill('[name="title"]', 'Test Proportional Event');
    await page.fill('[name="description"]', 'A test event for proportional distribution voting');
    await page.click('text=Next');

    // Step 2: Decision Framework - Select Proportional Distribution
    await page.click('[data-testid="framework-proportional_distribution"]');
    await page.click('text=Next');

    // Step 3: Selection Parameters
    // Test Percentage threshold
    await page.selectOption('[name="thresholdMode"]', 'percentage');
    await page.fill('[name="percentageThreshold"]', '25');

    await page.fill('[name="creditsPerVoter"]', '200');
    await page.selectOption('[name="optionMode"]', 'admin_defined');

    await page.click('text=Next');

    // Step 4: Review and Create
    await expect(page.locator('text=Test Proportional Event')).toBeVisible();
    await expect(page.locator('text=Proportional Distribution')).toBeVisible();
    await expect(page.locator('text=25% threshold')).toBeVisible();

    await page.click('text=Create Event');

    // Should redirect to event management hub
    await expect(page).toHaveURL(/\/admin\/events\/[a-f0-9-]+$/);
  });

  test('should test all threshold modes', async ({ page }) => {
    await page.goto('/events/create');

    // Navigate to Step 3
    await page.fill('[name="title"]', 'Threshold Test Event');
    await page.click('text=Next');
    await page.click('[data-testid="framework-binary_selection"]');
    await page.click('text=Next');

    // Test Absolute Votes threshold
    await page.selectOption('[name="thresholdMode"]', 'absolute_votes');
    await expect(page.locator('[name="absoluteVotesThreshold"]')).toBeVisible();
    await page.fill('[name="absoluteVotesThreshold"]', '50');

    // Test Above Average threshold
    await page.selectOption('[name="thresholdMode"]', 'above_average');
    // Should not show additional input for above average
    await expect(page.locator('[name="absoluteVotesThreshold"]')).toBeHidden();
    await expect(page.locator('[name="percentageThreshold"]')).toBeHidden();
    await expect(page.locator('[name="topNCount"]')).toBeHidden();

    // Test Percentage threshold
    await page.selectOption('[name="thresholdMode"]', 'percentage');
    await expect(page.locator('[name="percentageThreshold"]')).toBeVisible();
    await page.fill('[name="percentageThreshold"]', '30');
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/events/create');

    // Try to proceed without filling required fields
    await page.click('text=Next');

    // Should remain on Step 1 due to validation
    await expect(page.locator('h2')).toContainText('Basic Information');

    // Fill minimum required fields
    await page.fill('[name="title"]', 'Required Fields Test');
    await page.click('text=Next');

    // Should now proceed to Step 2
    await expect(page.locator('h2')).toContainText('Decision Framework');

    // Try to proceed without selecting framework
    await page.click('text=Next');

    // Should remain on Step 2
    await expect(page.locator('h2')).toContainText('Decision Framework');
  });

  test('should handle navigation between steps', async ({ page }) => {
    await page.goto('/events/create');

    // Fill Step 1
    await page.fill('[name="title"]', 'Navigation Test Event');
    await page.click('text=Next');

    // Fill Step 2
    await page.click('[data-testid="framework-binary_selection"]');
    await page.click('text=Next');

    // Should be on Step 3
    await expect(page.locator('h2')).toContainText('Selection Parameters');

    // Click Back to Step 2
    await page.click('text=Back');
    await expect(page.locator('h2')).toContainText('Decision Framework');

    // Click Back to Step 1
    await page.click('text=Back');
    await expect(page.locator('h2')).toContainText('Basic Information');

    // Should preserve the title
    await expect(page.locator('[name="title"]')).toHaveValue('Navigation Test Event');
  });

  test('should show proper error handling', async ({ page }) => {
    await page.goto('/events/create');

    // Fill form with invalid data
    await page.fill('[name="title"]', 'A'); // Too short
    await page.fill('[name="creditsPerVoter"]', '0'); // Invalid

    // Should show validation errors when trying to submit
    await page.click('text=Next');

    // Check for error states (this will depend on your validation implementation)
    // This test may need adjustment based on how validation errors are displayed
  });
});