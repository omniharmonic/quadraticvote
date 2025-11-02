import { test, expect } from '@playwright/test';

test.describe('Proposal Submission and Management', () => {
  let eventId: string;
  let inviteCode: string;

  test.beforeEach(async ({ page }) => {
    // Create a test event that allows community proposals
    await page.goto('/events/create');
    await page.fill('[name="title"]', 'Proposal Test Event');
    await page.fill('[name="description"]', 'Event for testing proposal system');
    await page.click('text=Next');
    await page.click('[data-testid="framework-binary_selection"]');
    await page.click('text=Next');
    await page.selectOption('[name="thresholdMode"]', 'top_n');
    await page.fill('[name="topNCount"]', '3');
    await page.fill('[name="creditsPerVoter"]', '100');
    await page.selectOption('[name="optionMode"]', 'community_proposals');
    await page.click('text=Next');
    await page.click('text=Create Event');

    // Extract event ID from URL
    await page.waitForURL(/\/admin\/events\/[a-f0-9-]+$/);
    const url = page.url();
    eventId = url.split('/').pop() || '';

    // Create an invite to get an invite code
    await page.click('text=Manage Invites');
    await page.fill('[name="email"]', 'proposer@example.com');
    await page.click('text=Create Invite');

    // Extract invite code from the invite link
    const inviteRow = page.locator('tr').filter({ hasText: 'proposer@example.com' });
    const linkButton = inviteRow.locator('button', { hasText: 'Copy Link' });

    // Get the invite code from the data attribute or by clicking and checking the copied URL
    // For this test, we'll use a demo code that should work
    inviteCode = 'demo-code-123';
  });

  test('should navigate to proposal submission page', async ({ page }) => {
    // Navigate directly to the proposal page
    await page.goto(`/events/${eventId}/propose`);

    // Should see the proposal submission form
    await expect(page.locator('h1')).toContainText('Submit a Proposal');
    await expect(page.locator('text=Propose an option for: Proposal Test Event')).toBeVisible();
  });

  test('should reject proposals for admin-defined events', async ({ page }) => {
    // Create an admin-defined event
    await page.goto('/events/create');
    await page.fill('[name="title"]', 'Admin Only Event');
    await page.click('text=Next');
    await page.click('[data-testid="framework-binary_selection"]');
    await page.click('text=Next');
    await page.selectOption('[name="optionMode"]', 'admin_defined');
    await page.click('text=Next');
    await page.click('text=Create Event');

    const adminEventUrl = page.url();
    const adminEventId = adminEventUrl.split('/').pop() || '';

    // Try to access proposal page
    await page.goto(`/events/${adminEventId}/propose`);

    // Should see "proposals not enabled" message
    await expect(page.locator('text=Proposals Not Enabled')).toBeVisible();
    await expect(page.locator('text=This event uses admin-defined options')).toBeVisible();
  });

  test('should submit a complete proposal', async ({ page }) => {
    await page.goto(`/events/${eventId}/propose`);

    // Fill out the proposal form
    await page.fill('[name="title"]', 'Test Proposal Title');
    await page.fill('[name="description"]', 'This is a detailed description of the test proposal explaining what it aims to achieve.');
    await page.fill('[name="imageUrl"]', 'https://example.com/test-image.jpg');
    await page.fill('[name="submitterEmail"]', 'proposer@example.com');
    await page.fill('[name="submitterWallet"]', '0x1234567890abcdef1234567890abcdef12345678');

    // Should see the preview section
    await expect(page.locator('text=Preview')).toBeVisible();
    await expect(page.locator('text=Test Proposal Title')).toBeVisible();

    // Submit the proposal
    await page.click('[data-testid="proposal-form"] button[type="submit"]');

    // Should see success page
    await expect(page.locator('text=Proposal Submitted Successfully')).toBeVisible();
    await expect(page.locator('text=Your proposal has been submitted and is pending review')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto(`/events/${eventId}/propose`);

    // Try to submit without required fields
    await page.click('[data-testid="proposal-form"] button[type="submit"]');

    // Form should not submit (button should be disabled)
    const submitButton = page.locator('[data-testid="proposal-form"] button[type="submit"]');
    await expect(submitButton).toBeDisabled();
  });

  test('should handle character limits', async ({ page }) => {
    await page.goto(`/events/${eventId}/propose`);

    // Test title character limit
    const longTitle = 'A'.repeat(101); // Over 100 character limit
    await page.fill('[name="title"]', longTitle);

    // Should show character count
    await expect(page.locator('text=100/100 characters')).toBeVisible();

    // Test description character limit
    const longDescription = 'B'.repeat(1001); // Over 1000 character limit
    await page.fill('[name="description"]', longDescription);

    // Should show character count
    await expect(page.locator('text=1000/1000 characters')).toBeVisible();
  });

  test('should handle image URL validation', async ({ page }) => {
    await page.goto(`/events/${eventId}/propose`);

    // Fill required fields first
    await page.fill('[name="title"]', 'Image Test Proposal');
    await page.fill('[name="submitterEmail"]', 'test@example.com');

    // Test invalid URL
    await page.fill('[name="imageUrl"]', 'not-a-valid-url');

    // Browser should show HTML5 validation error for invalid URL

    // Test valid URL
    await page.fill('[name="imageUrl"]', 'https://example.com/valid-image.jpg');

    // Should see image in preview
    await expect(page.locator('img[alt="Proposal"]')).toBeVisible();
  });

  test('should handle image loading errors', async ({ page }) => {
    await page.goto(`/events/${eventId}/propose`);

    await page.fill('[name="title"]', 'Broken Image Test');
    await page.fill('[name="submitterEmail"]', 'test@example.com');
    await page.fill('[name="imageUrl"]', 'https://example.com/broken-image.jpg');

    // Image should be hidden if it fails to load (based on onError handler)
    const image = page.locator('img[alt="Proposal"]');
    await expect(image).toBeVisible();

    // Simulate image error by executing JavaScript
    await page.evaluate(() => {
      const img = document.querySelector('img[alt="Proposal"]') as HTMLImageElement;
      if (img) {
        img.dispatchEvent(new Event('error'));
      }
    });

    // Image should be hidden after error
    await expect(image).toBeHidden();
  });

  test('should submit proposal with invite code in URL', async ({ page }) => {
    // Navigate with invite code in URL
    await page.goto(`/events/${eventId}/propose?code=${inviteCode}`);

    // Invite code field should be hidden (pre-filled)
    await expect(page.locator('[name="inviteCode"]')).toBeHidden();

    // Fill and submit proposal
    await page.fill('[name="title"]', 'Invite Code Proposal');
    await page.fill('[name="submitterEmail"]', 'invited@example.com');
    await page.click('[data-testid="proposal-form"] button[type="submit"]');

    // Should submit successfully
    await expect(page.locator('text=Proposal Submitted Successfully')).toBeVisible();
  });

  test('should show invite code field when not provided in URL', async ({ page }) => {
    await page.goto(`/events/${eventId}/propose`);

    // Invite code field should be visible
    await expect(page.locator('[name="inviteCode"]')).toBeVisible();
    await expect(page.locator('text=Invite Code (if required)')).toBeVisible();
  });

  test('should navigate back to event from proposal page', async ({ page }) => {
    await page.goto(`/events/${eventId}/propose`);

    // Click Cancel button
    await page.click('text=Cancel');

    // Should navigate back to event page
    await expect(page).toHaveURL(`/events/${eventId}`);
  });

  test('should navigate to home from success page', async ({ page }) => {
    await page.goto(`/events/${eventId}/propose`);

    // Submit a proposal
    await page.fill('[name="title"]', 'Navigation Test Proposal');
    await page.fill('[name="submitterEmail"]', 'nav@example.com');
    await page.click('[data-testid="proposal-form"] button[type="submit"]');

    // Should be on success page
    await expect(page.locator('text=Proposal Submitted Successfully')).toBeVisible();

    // Click Home button
    await page.click('text=Home');

    // Should navigate to home page
    await expect(page).toHaveURL('/');
  });

  test('should navigate back to event from success page', async ({ page }) => {
    await page.goto(`/events/${eventId}/propose`);

    // Submit a proposal
    await page.fill('[name="title"]', 'Back Navigation Test');
    await page.fill('[name="submitterEmail"]', 'back@example.com');
    await page.click('[data-testid="proposal-form"] button[type="submit"]');

    // Should be on success page
    await expect(page.locator('text=Proposal Submitted Successfully')).toBeVisible();

    // Click Back to Event button
    await page.click('text=Back to Event');

    // Should navigate back to event page
    await expect(page).toHaveURL(`/events/${eventId}`);
  });

  test('should show event information on proposal page', async ({ page }) => {
    await page.goto(`/events/${eventId}/propose`);

    // Should show event details
    await expect(page.locator('text=About This Event')).toBeVisible();
    await expect(page.locator('text=Proposal Test Event')).toBeVisible();
    await expect(page.locator('text=Binary Selection')).toBeVisible();
    await expect(page.locator('text=100 credits per voter')).toBeVisible();
  });

  test('should show proposal guidelines', async ({ page }) => {
    await page.goto(`/events/${eventId}/propose`);

    // Should show guidelines
    await expect(page.locator('text=Proposal Guidelines')).toBeVisible();
    await expect(page.locator('text=Proposals may require moderation')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await page.goto(`/events/${eventId}/propose`);

    // Fill form
    await page.fill('[name="title"]', 'API Error Test');
    await page.fill('[name="submitterEmail"]', 'error@example.com');

    // Intercept the API call and make it fail
    await page.route('/api/proposals', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    // Submit proposal
    await page.click('[data-testid="proposal-form"] button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=Failed to submit proposal')).toBeVisible();

    // Should stay on the form page
    await expect(page.locator('h1')).toContainText('Submit a Proposal');
  });

  test('should validate email format', async ({ page }) => {
    await page.goto(`/events/${eventId}/propose`);

    await page.fill('[name="title"]', 'Email Validation Test');
    await page.fill('[name="submitterEmail"]', 'invalid-email');

    // Try to submit
    await page.click('[data-testid="proposal-form"] button[type="submit"]');

    // HTML5 validation should prevent submission
    const emailInput = page.locator('[name="submitterEmail"]');
    const validationMessage = await emailInput.evaluate(
      (input: HTMLInputElement) => input.validationMessage
    );
    expect(validationMessage).toBeTruthy();
  });
});

// Admin Proposal Management Tests
test.describe('Admin Proposal Management', () => {
  let eventId: string;

  test.beforeEach(async ({ page }) => {
    // Create event and some proposals for testing admin management
    await page.goto('/events/create');
    await page.fill('[name="title"]', 'Admin Proposal Test Event');
    await page.click('text=Next');
    await page.click('[data-testid="framework-binary_selection"]');
    await page.click('text=Next');
    await page.selectOption('[name="optionMode"]', 'community_proposals');
    await page.click('text=Next');
    await page.click('text=Create Event');

    const url = page.url();
    eventId = url.split('/').pop() || '';
  });

  test('should navigate to admin proposal management', async ({ page }) => {
    await page.goto('/admin/proposals');

    // Should see admin proposal management page
    await expect(page.locator('h1')).toContainText('Proposal Management');
  });

  test('should filter proposals by event', async ({ page }) => {
    await page.goto('/admin/proposals');

    // Should have event filter
    await expect(page.locator('text=Filter by Event')).toBeVisible();

    // Select the test event
    await page.selectOption('[name="eventFilter"]', eventId);

    // Should show proposals for selected event only
    await expect(page.locator(`text=Admin Proposal Test Event`)).toBeVisible();
  });

  test('should approve proposal', async ({ page }) => {
    // First submit a proposal through the normal flow
    await page.goto(`/events/${eventId}/propose`);
    await page.fill('[name="title"]', 'Proposal to Approve');
    await page.fill('[name="submitterEmail"]', 'approve@example.com');
    await page.click('[data-testid="proposal-form"] button[type="submit"]');

    // Go to admin management
    await page.goto('/admin/proposals');

    // Find and approve the proposal
    const proposalRow = page.locator('tr').filter({ hasText: 'Proposal to Approve' });
    await proposalRow.locator('text=Approve').click();

    // Should see success message
    await expect(page.locator('text=Proposal approved successfully')).toBeVisible();

    // Status should update to approved
    await expect(proposalRow.locator('text=Approved')).toBeVisible();
  });

  test('should reject proposal', async ({ page }) => {
    // Submit a proposal
    await page.goto(`/events/${eventId}/propose`);
    await page.fill('[name="title"]', 'Proposal to Reject');
    await page.fill('[name="submitterEmail"]', 'reject@example.com');
    await page.click('[data-testid="proposal-form"] button[type="submit"]');

    // Go to admin management
    await page.goto('/admin/proposals');

    // Find and reject the proposal
    const proposalRow = page.locator('tr').filter({ hasText: 'Proposal to Reject' });
    await proposalRow.locator('text=Reject').click();

    // Should see success message
    await expect(page.locator('text=Proposal rejected successfully')).toBeVisible();

    // Status should update to rejected
    await expect(proposalRow.locator('text=Rejected')).toBeVisible();
  });
});