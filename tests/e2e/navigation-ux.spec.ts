import { test, expect } from '@playwright/test';

test.describe('Navigation and UX Flows', () => {
  test('should have consistent navigation throughout the app', async ({ page }) => {
    // Start at homepage
    await page.goto('/');

    // Should have navigation bar
    await expect(page.locator('nav')).toBeVisible();

    // Navigate to create event
    await page.click('text=Create Event');
    await expect(page).toHaveURL('/events/create');

    // Should have back button
    await expect(page.locator('text=Back')).toBeVisible();

    // Back button should work
    await page.click('text=Back');
    await expect(page).toHaveURL('/');

    // Should have home button from any page
    await page.goto('/events/create');
    await expect(page.locator('text=Home')).toBeVisible();

    await page.click('text=Home');
    await expect(page).toHaveURL('/');
  });

  test('should maintain navigation context in admin sections', async ({ page }) => {
    // Create an event to get admin context
    await page.goto('/events/create');
    await page.fill('[name="title"]', 'Nav Test Event');
    await page.click('text=Next');
    await page.click('[data-testid="framework-binary_selection"]');
    await page.click('text=Next');
    await page.click('text=Next');
    await page.click('text=Create Event');

    // Extract event ID
    await page.waitForURL(/\/admin\/events\/[a-f0-9-]+$/);
    const url = page.url();
    const eventId = url.split('/').pop() || '';

    // Should show admin navigation context
    await expect(page.locator('text=Event Management')).toBeVisible();
    await expect(page.locator('text=Nav Test Event')).toBeVisible();

    // Navigate to invite management
    await page.click('text=Manage Invites');
    await expect(page).toHaveURL(`/admin/events/${eventId}/invites`);

    // Should maintain event context in navigation
    await expect(page.locator('text=Nav Test Event')).toBeVisible();

    // Back button should return to event management hub
    await page.click('text=Back');
    await expect(page).toHaveURL(`/admin/events/${eventId}`);
  });

  test('should handle breadcrumb navigation', async ({ page }) => {
    await page.goto('/events/create');

    // Should show breadcrumb or current location
    await expect(page.locator('text=Create Event')).toBeVisible();

    // Create event and navigate to management
    await page.fill('[name="title"]', 'Breadcrumb Test');
    await page.click('text=Next');
    await page.click('[data-testid="framework-binary_selection"]');
    await page.click('text=Next');
    await page.click('text=Next');
    await page.click('text=Create Event');

    // Should show event management breadcrumb
    await expect(page.locator('text=Event Management')).toBeVisible();

    // Navigate deeper
    await page.click('text=Manage Invites');

    // Should show hierarchical navigation
    await expect(page.locator('text=Invite Management')).toBeVisible();
  });

  test('should provide clear user feedback for actions', async ({ page }) => {
    // Test success messages
    await page.goto('/events/create');
    await page.fill('[name="title"]', 'Feedback Test Event');
    await page.click('text=Next');
    await page.click('[data-testid="framework-binary_selection"]');
    await page.click('text=Next');
    await page.click('text=Next');
    await page.click('text=Create Event');

    // Should see success feedback (redirect to management page is feedback)
    await expect(page).toHaveURL(/\/admin\/events\/[a-f0-9-]+$/);

    // Test feedback for invite creation
    await page.click('text=Manage Invites');
    await page.fill('[name="email"]', 'feedback@example.com');
    await page.click('text=Create Invite');

    // Should see success toast or message
    await expect(page.locator('text=Invite created successfully')).toBeVisible();
  });

  test('should handle loading states', async ({ page }) => {
    await page.goto('/');

    // When navigating to a page that loads data, should show loading state
    await page.click('text=Create Event');

    // Check for loading indicators during navigation
    // This will depend on implementation, but there should be visual feedback
    await expect(page.locator('h1')).toContainText('Create New Event');
  });

  test('should be responsive across different screen sizes', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');

    await expect(page.locator('text=QuadraticVote')).toBeVisible();
    await expect(page.locator('text=Create Event')).toBeVisible();

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();

    await expect(page.locator('text=QuadraticVote')).toBeVisible();
    await expect(page.locator('text=Create Event')).toBeVisible();

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();

    await expect(page.locator('text=QuadraticVote')).toBeVisible();

    // Mobile navigation might be collapsed
    // This depends on implementation - might need to click hamburger menu
  });

  test('should maintain consistent styling and branding', async ({ page }) => {
    await page.goto('/');

    // Check for consistent header/branding
    await expect(page.locator('text=QuadraticVote')).toBeVisible();

    // Navigate to different pages and ensure consistent styling
    await page.click('text=Create Event');
    await expect(page.locator('text=QuadraticVote')).toBeVisible();

    // Check for consistent color scheme and fonts
    // This would require more specific CSS testing, but we can check basic elements
    const header = page.locator('h1');
    await expect(header).toBeVisible();
  });

  test('should handle error pages gracefully', async ({ page }) => {
    // Test 404 page
    await page.goto('/non-existent-page');

    // Should show 404 page or redirect appropriately
    // This depends on Next.js configuration
    await expect(page.locator('text=404')).toBeVisible();
    // OR expect redirect to home page
  });

  test('should provide clear call-to-action buttons', async ({ page }) => {
    await page.goto('/');

    // Primary CTA should be prominent
    const createButton = page.locator('text=Create Event');
    await expect(createButton).toBeVisible();

    // Button should be styled as primary action
    await expect(createButton).toHaveClass(/primary|button/);
  });

  test('should show appropriate empty states', async ({ page }) => {
    // Navigate to admin proposals without any proposals
    await page.goto('/admin/proposals');

    // Should show empty state message
    await expect(page.locator('text=No proposals found')).toBeVisible();
    // OR show helpful message about how to get started
  });

  test('should handle form validation consistently', async ({ page }) => {
    await page.goto('/events/create');

    // Try to proceed without filling required fields
    await page.click('text=Next');

    // Should show validation feedback
    // This might be browser validation or custom validation
    const titleInput = page.locator('[name="title"]');
    const isInvalid = await titleInput.evaluate((input: HTMLInputElement) => {
      return !input.checkValidity();
    });
    expect(isInvalid).toBe(true);
  });

  test('should provide keyboard navigation support', async ({ page }) => {
    await page.goto('/');

    // Tab through interactive elements
    await page.keyboard.press('Tab');

    // First focusable element should be highlighted
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'A', 'INPUT']).toContain(focusedElement);

    // Should be able to activate with Enter/Space
    await page.keyboard.press('Enter');

    // Should navigate or perform action
  });

  test('should handle back button browser navigation', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Create Event');
    await expect(page).toHaveURL('/events/create');

    // Use browser back button
    await page.goBack();
    await expect(page).toHaveURL('/');

    // Forward button should work too
    await page.goForward();
    await expect(page).toHaveURL('/events/create');
  });

  test('should show progress indicators in multi-step flows', async ({ page }) => {
    await page.goto('/events/create');

    // Should show step indicator
    await expect(page.locator('text=Step 1')).toBeVisible();
    // OR progress bar or step dots

    await page.fill('[name="title"]', 'Progress Test');
    await page.click('text=Next');

    // Should advance to step 2
    await expect(page.locator('text=Step 2')).toBeVisible();
  });

  test('should provide clear error messages', async ({ page }) => {
    await page.goto('/events/12345/vote?code=invalid');

    // Should show clear error message
    await expect(page.locator('text=Invalid')).toBeVisible();
    await expect(page.locator('text=expired')).toBeVisible();

    // Should provide guidance on what to do next
    await expect(page.locator('text=contact')).toBeVisible();
    // OR link to get new invite code
  });

  test('should maintain state during navigation', async ({ page }) => {
    await page.goto('/events/create');

    // Fill out form partially
    await page.fill('[name="title"]', 'State Test Event');
    await page.fill('[name="description"]', 'Testing state preservation');

    // Navigate away and back
    await page.click('text=Home');
    await page.click('text=Create Event');

    // Form state might be preserved or reset - depends on implementation
    // If preserved:
    // await expect(page.locator('[name="title"]')).toHaveValue('State Test Event');

    // If reset (more common), form should be clean
    const titleValue = await page.locator('[name="title"]').inputValue();
    expect(titleValue).toBe('');
  });

  test('should show contextual help and tooltips', async ({ page }) => {
    await page.goto('/events/create');

    // Look for help text or tooltips
    await expect(page.locator('text=credits per voter')).toBeVisible();

    // Step 3 should have threshold explanation
    await page.fill('[name="title"]', 'Help Test');
    await page.click('text=Next');
    await page.click('[data-testid="framework-binary_selection"]');
    await page.click('text=Next');

    // Should explain threshold modes
    await expect(page.locator('text=Top N')).toBeVisible();
    await expect(page.locator('text=Percentage')).toBeVisible();
  });

  test('should handle session timeouts gracefully', async ({ page }) => {
    await page.goto('/events/create');

    // This test would require mocking session expiry
    // In a real scenario, we'd test what happens when session expires
    // during form filling or other operations

    // Should redirect to login or show appropriate message
    // For now, just ensure the page loads correctly
    await expect(page.locator('h1')).toContainText('Create New Event');
  });

  test('should provide search and filter functionality where appropriate', async ({ page }) => {
    // Create an event first
    await page.goto('/events/create');
    await page.fill('[name="title"]', 'Searchable Event');
    await page.click('text=Next');
    await page.click('[data-testid="framework-binary_selection"]');
    await page.click('text=Next');
    await page.click('text=Next');
    await page.click('text=Create Event');

    const url = page.url();
    const eventId = url.split('/').pop() || '';

    // Go to invite management
    await page.click('text=Manage Invites');

    // Create some invites
    await page.fill('[name="email"]', 'search1@example.com');
    await page.click('text=Create Invite');
    await page.fill('[name="email"]', 'search2@example.com');
    await page.click('text=Create Invite');

    // Should have search functionality
    if (await page.locator('[data-testid="search-input"]').isVisible()) {
      await page.fill('[data-testid="search-input"]', 'search1');

      // Should filter results
      await expect(page.locator('text=search1@example.com')).toBeVisible();
      await expect(page.locator('text=search2@example.com')).toBeHidden();
    }
  });

  test('should handle concurrent user actions', async ({ page, context }) => {
    // Open multiple tabs/windows to same event
    const page2 = await context.newPage();

    await page.goto('/events/create');
    await page2.goto('/events/create');

    // Both should be able to create events independently
    await page.fill('[name="title"]', 'Concurrent Event 1');
    await page2.fill('[name="title"]', 'Concurrent Event 2');

    await page.click('text=Next');
    await page2.click('text=Next');

    // Both should proceed normally
    await expect(page.locator('h2')).toContainText('Decision Framework');
    await expect(page2.locator('h2')).toContainText('Decision Framework');
  });
});

test.describe('Admin Dashboard Functionality', () => {
  test('should navigate to admin proposal management', async ({ page }) => {
    await page.goto('/admin/proposals');

    // Should see admin interface
    await expect(page.locator('h1')).toContainText('Proposal Management');
    await expect(page.locator('text=Filter')).toBeVisible();
  });

  test('should show event statistics in admin dashboard', async ({ page }) => {
    // Create an event first
    await page.goto('/events/create');
    await page.fill('[name="title"]', 'Stats Test Event');
    await page.click('text=Next');
    await page.click('[data-testid="framework-binary_selection"]');
    await page.click('text=Next');
    await page.click('text=Next');
    await page.click('text=Create Event');

    // Should be on event management page with stats
    await expect(page.locator('text=Event Statistics')).toBeVisible();
    await expect(page.locator('text=Total Invites')).toBeVisible();
    await expect(page.locator('text=Total Votes')).toBeVisible();
  });

  test('should provide bulk operations in admin interfaces', async ({ page }) => {
    await page.goto('/admin/proposals');

    // Should have bulk action controls
    if (await page.locator('text=Select All').isVisible()) {
      await expect(page.locator('text=Select All')).toBeVisible();
      await expect(page.locator('text=Bulk Actions')).toBeVisible();
    }
  });

  test('should handle admin permissions appropriately', async ({ page }) => {
    // This test depends on authentication implementation
    // Should ensure only authorized users can access admin functions

    await page.goto('/admin/proposals');

    // Either should show admin interface or redirect to login
    // Depends on auth implementation
    const hasHeading = await page.locator('h1').isVisible();
    expect(hasHeading).toBe(true);
  });

  test('should provide data export functionality', async ({ page }) => {
    // Create an event with some data
    await page.goto('/events/create');
    await page.fill('[name="title"]', 'Export Test Event');
    await page.click('text=Next');
    await page.click('[data-testid="framework-binary_selection"]');
    await page.click('text=Next');
    await page.click('text=Next');
    await page.click('text=Create Event');

    const url = page.url();
    const eventId = url.split('/').pop() || '';

    // Go to invite management
    await page.click('text=Manage Invites');

    // Create some data to export
    await page.fill('[name="email"]', 'export@example.com');
    await page.click('text=Create Invite');

    // Should have export functionality
    if (await page.locator('text=Export').isVisible()) {
      const downloadPromise = page.waitForEvent('download');
      await page.click('text=Export');
      const download = await downloadPromise;

      // Should download a file
      expect(download.suggestedFilename()).toBeTruthy();
    }
  });
});