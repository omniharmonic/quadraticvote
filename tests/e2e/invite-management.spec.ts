import { test, expect } from '@playwright/test';

test.describe('Invite Management System', () => {
  let eventId: string;

  test.beforeEach(async ({ page }) => {
    // Create a test event first
    await page.goto('/events/create');
    await page.fill('[name="title"]', 'Invite Test Event');
    await page.fill('[name="description"]', 'Event for testing invite management');
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
  });

  test('should navigate to invite management page', async ({ page }) => {
    // Should be on event management hub
    await expect(page.locator('h1')).toContainText('Event Management');

    // Click Manage Invites
    await page.click('text=Manage Invites');

    // Should be on invite management page
    await expect(page).toHaveURL(`/admin/events/${eventId}/invites`);
    await expect(page.locator('h1')).toContainText('Invite Management');
  });

  test('should create single invite', async ({ page }) => {
    await page.goto(`/admin/events/${eventId}/invites`);

    // Fill single invite form
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="label"]', 'Test User');

    // Create invite
    await page.click('text=Create Invite');

    // Should see success message
    await expect(page.locator('text=Invite created successfully')).toBeVisible();

    // Should see the invite in the list
    await expect(page.locator('text=test@example.com')).toBeVisible();
    await expect(page.locator('text=Test User')).toBeVisible();
  });

  test('should send email invitation', async ({ page }) => {
    await page.goto(`/admin/events/${eventId}/invites`);

    // Create invite
    await page.fill('[name="email"]', 'email-test@example.com');
    await page.fill('[name="label"]', 'Email Test User');
    await page.check('[name="sendEmail"]'); // Check send email option
    await page.click('text=Create Invite');

    // Should see success message including email sent
    await expect(page.locator('text=Invite created and email sent')).toBeVisible();
  });

  test('should generate invite link with embedded code', async ({ page }) => {
    await page.goto(`/admin/events/${eventId}/invites`);

    // Create invite
    await page.fill('[name="email"]', 'link-test@example.com');
    await page.click('text=Create Invite');

    // Find the invite row and click copy link
    const inviteRow = page.locator('tr').filter({ hasText: 'link-test@example.com' });
    await inviteRow.locator('text=Copy Link').click();

    // Should see copy success message
    await expect(page.locator('text=Link copied to clipboard')).toBeVisible();

    // Check that the link contains the invite code (we can't test clipboard directly in E2E)
    // The link should be in format: /events/{eventId}/vote?code={inviteCode}
  });

  test('should navigate to batch invite creation', async ({ page }) => {
    await page.goto(`/admin/events/${eventId}/invites`);

    // Click Create Batch Invites
    await page.click('text=Create Batch Invites');

    // Should navigate to batch invite page
    await expect(page).toHaveURL(`/admin/events/${eventId}/invites/batch`);
    await expect(page.locator('h1')).toContainText('Create Batch Invites');
  });

  test('should create batch invites from CSV', async ({ page }) => {
    await page.goto(`/admin/events/${eventId}/invites/batch`);

    // Fill batch invite form
    const csvData = `email,label
batch1@example.com,Batch User 1
batch2@example.com,Batch User 2
batch3@example.com,Batch User 3`;

    await page.fill('[data-testid="csv-input"]', csvData);

    // Process batch
    await page.click('text=Process Invites');

    // Should see processing status
    await expect(page.locator('text=Processing invites...')).toBeVisible();

    // Should eventually see success
    await expect(page.locator('text=Batch processing complete')).toBeVisible();

    // Should see summary
    await expect(page.locator('text=3 invites created successfully')).toBeVisible();
  });

  test('should validate CSV format', async ({ page }) => {
    await page.goto(`/admin/events/${eventId}/invites/batch`);

    // Test invalid CSV format
    const invalidCsv = `invalid,format,too,many,columns
test@example.com,User Name,extra,data,here`;

    await page.fill('[data-testid="csv-input"]', invalidCsv);
    await page.click('text=Process Invites');

    // Should show validation error
    await expect(page.locator('text=Invalid CSV format')).toBeVisible();
  });

  test('should handle duplicate emails in batch', async ({ page }) => {
    await page.goto(`/admin/events/${eventId}/invites/batch`);

    // Create duplicate emails
    const csvWithDuplicates = `email,label
duplicate@example.com,User 1
duplicate@example.com,User 2
unique@example.com,User 3`;

    await page.fill('[data-testid="csv-input"]', csvWithDuplicates);
    await page.click('text=Process Invites');

    // Should handle duplicates gracefully
    await expect(page.locator('text=Batch processing complete')).toBeVisible();
    await expect(page.locator('text=1 duplicate email skipped')).toBeVisible();
  });

  test('should export invites to CSV', async ({ page }) => {
    await page.goto(`/admin/events/${eventId}/invites`);

    // Create a few invites first
    await page.fill('[name="email"]', 'export1@example.com');
    await page.click('text=Create Invite');
    await page.fill('[name="email"]', 'export2@example.com');
    await page.click('text=Create Invite');

    // Click export
    const downloadPromise = page.waitForEvent('download');
    await page.click('text=Export CSV');
    const download = await downloadPromise;

    // Should download a CSV file
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should filter and search invites', async ({ page }) => {
    await page.goto(`/admin/events/${eventId}/invites`);

    // Create several invites with different statuses
    await page.fill('[name="email"]', 'unused@example.com');
    await page.click('text=Create Invite');

    await page.fill('[name="email"]', 'pending@example.com');
    await page.click('text=Create Invite');

    // Search for specific invite
    await page.fill('[data-testid="search-input"]', 'unused@example.com');

    // Should show only matching results
    await expect(page.locator('text=unused@example.com')).toBeVisible();
    await expect(page.locator('text=pending@example.com')).toBeHidden();

    // Clear search
    await page.fill('[data-testid="search-input"]', '');

    // Should show all invites again
    await expect(page.locator('text=unused@example.com')).toBeVisible();
    await expect(page.locator('text=pending@example.com')).toBeVisible();
  });

  test('should show invite statistics', async ({ page }) => {
    await page.goto(`/admin/events/${eventId}/invites`);

    // Create invites
    await page.fill('[name="email"]', 'stats1@example.com');
    await page.click('text=Create Invite');
    await page.fill('[name="email"]', 'stats2@example.com');
    await page.click('text=Create Invite');

    // Should show invite statistics
    await expect(page.locator('text=Total Invites: 2')).toBeVisible();
    await expect(page.locator('text=Unused: 2')).toBeVisible();
    await expect(page.locator('text=Used: 0')).toBeVisible();
  });

  test('should revoke invite', async ({ page }) => {
    await page.goto(`/admin/events/${eventId}/invites`);

    // Create invite
    await page.fill('[name="email"]', 'revoke@example.com');
    await page.click('text=Create Invite');

    // Find invite row and revoke
    const inviteRow = page.locator('tr').filter({ hasText: 'revoke@example.com' });
    await inviteRow.locator('text=Revoke').click();

    // Confirm revocation
    await page.click('text=Yes, Revoke');

    // Should see success message
    await expect(page.locator('text=Invite revoked successfully')).toBeVisible();

    // Invite should show as revoked
    await expect(inviteRow.locator('text=Revoked')).toBeVisible();
  });

  test('should handle navigation back to event management', async ({ page }) => {
    await page.goto(`/admin/events/${eventId}/invites`);

    // Should have back button
    await page.click('text=Back');

    // Should return to event management hub
    await expect(page).toHaveURL(`/admin/events/${eventId}`);
    await expect(page.locator('h1')).toContainText('Event Management');
  });

  test('should validate email format in single invite', async ({ page }) => {
    await page.goto(`/admin/events/${eventId}/invites`);

    // Try invalid email
    await page.fill('[name="email"]', 'invalid-email');
    await page.click('text=Create Invite');

    // Should show validation error
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
  });

  test('should prevent duplicate single invites', async ({ page }) => {
    await page.goto(`/admin/events/${eventId}/invites`);

    // Create first invite
    await page.fill('[name="email"]', 'duplicate@example.com');
    await page.click('text=Create Invite');
    await expect(page.locator('text=Invite created successfully')).toBeVisible();

    // Try to create duplicate
    await page.fill('[name="email"]', 'duplicate@example.com');
    await page.click('text=Create Invite');

    // Should show error
    await expect(page.locator('text=Invite already exists for this email')).toBeVisible();
  });
});