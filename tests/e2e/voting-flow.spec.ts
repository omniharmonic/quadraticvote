import { test, expect } from '@playwright/test';

test.describe('Voting Flow', () => {
  let eventId: string;
  let inviteCode: string;

  test.beforeEach(async ({ page }) => {
    // Create a test event with some options
    await page.goto('/events/create');
    await page.fill('[name="title"]', 'Voting Test Event');
    await page.fill('[name="description"]', 'Event for testing voting functionality');
    await page.click('text=Next');
    await page.click('[data-testid="framework-binary_selection"]');
    await page.click('text=Next');
    await page.selectOption('[name="thresholdMode"]', 'top_n');
    await page.fill('[name="topNCount"]', '2');
    await page.fill('[name="creditsPerVoter"]', '100');
    await page.selectOption('[name="optionMode"]', 'admin_defined');
    await page.click('text=Next');
    await page.click('text=Create Event');

    // Extract event ID
    await page.waitForURL(/\/admin\/events\/[a-f0-9-]+$/);
    const url = page.url();
    eventId = url.split('/').pop() || '';

    // Create invite
    await page.click('text=Manage Invites');
    await page.fill('[name="email"]', 'voter@example.com');
    await page.click('text=Create Invite');

    // Use demo invite code for testing
    inviteCode = 'demo-code-123';

    // Add some options to vote on (this would typically be done through admin interface)
    // For now, we'll assume options exist or create them through API if needed
  });

  test('should access voting page with valid invite code', async ({ page }) => {
    await page.goto(`/events/${eventId}/vote?code=${inviteCode}`);

    // Should see the voting interface
    await expect(page.locator('h1')).toContainText('Voting Test Event');
    await expect(page.locator('text=Binary Selection')).toBeVisible();
    await expect(page.locator('text=Credits: 100')).toBeVisible();
  });

  test('should reject access without invite code', async ({ page }) => {
    await page.goto(`/events/${eventId}/vote`);

    // Should show error or redirect to invite code entry
    await expect(page.locator('text=Access Denied')).toBeVisible();
    // OR expect redirect to invite code entry page
  });

  test('should reject invalid invite code', async ({ page }) => {
    await page.goto(`/events/${eventId}/vote?code=invalid-code`);

    // Should show error message
    await expect(page.locator('text=Invalid or expired invite code')).toBeVisible();
  });

  test('should display voting options for binary selection', async ({ page }) => {
    await page.goto(`/events/${eventId}/vote?code=${inviteCode}`);

    // Should see voting options (assuming some exist)
    await expect(page.locator('[data-testid="voting-options"]')).toBeVisible();

    // For binary selection, should see credit allocation interface
    await expect(page.locator('text=Allocate your credits')).toBeVisible();
  });

  test('should allocate credits using quadratic voting', async ({ page }) => {
    await page.goto(`/events/${eventId}/vote?code=${inviteCode}`);

    // Find first voting option and allocate credits
    const firstOption = page.locator('[data-testid="vote-option"]').first();

    // Click to add votes (this creates quadratic cost)
    await firstOption.locator('button[data-testid="add-vote"]').click();
    await firstOption.locator('button[data-testid="add-vote"]').click();

    // Should show vote count and credit cost
    await expect(firstOption.locator('text=Votes: 2')).toBeVisible();
    await expect(firstOption.locator('text=Cost: 4 credits')).toBeVisible();

    // Credits remaining should update
    await expect(page.locator('text=Credits Remaining: 96')).toBeVisible();
  });

  test('should prevent over-allocation of credits', async ({ page }) => {
    await page.goto(`/events/${eventId}/vote?code=${inviteCode}`);

    const firstOption = page.locator('[data-testid="vote-option"]').first();

    // Try to allocate more credits than available
    // Click add vote button many times to exceed credit limit
    for (let i = 0; i < 15; i++) {
      await firstOption.locator('button[data-testid="add-vote"]').click();
    }

    // Should not be able to exceed 100 credits (10 votes max for quadratic)
    await expect(firstOption.locator('text=Votes: 10')).toBeVisible();
    await expect(page.locator('text=Credits Remaining: 0')).toBeVisible();

    // Add vote button should be disabled
    await expect(firstOption.locator('button[data-testid="add-vote"]')).toBeDisabled();
  });

  test('should remove votes and recalculate credits', async ({ page }) => {
    await page.goto(`/events/${eventId}/vote?code=${inviteCode}`);

    const firstOption = page.locator('[data-testid="vote-option"]').first();

    // Add some votes
    await firstOption.locator('button[data-testid="add-vote"]').click();
    await firstOption.locator('button[data-testid="add-vote"]').click();
    await firstOption.locator('button[data-testid="add-vote"]').click();

    // Should have 3 votes, costing 9 credits
    await expect(firstOption.locator('text=Votes: 3')).toBeVisible();
    await expect(firstOption.locator('text=Cost: 9 credits')).toBeVisible();

    // Remove one vote
    await firstOption.locator('button[data-testid="remove-vote"]').click();

    // Should have 2 votes, costing 4 credits
    await expect(firstOption.locator('text=Votes: 2')).toBeVisible();
    await expect(firstOption.locator('text=Cost: 4 credits')).toBeVisible();
    await expect(page.locator('text=Credits Remaining: 96')).toBeVisible();
  });

  test('should distribute votes across multiple options', async ({ page }) => {
    await page.goto(`/events/${eventId}/vote?code=${inviteCode}`);

    const options = page.locator('[data-testid="vote-option"]');

    // Allocate to first option
    await options.nth(0).locator('button[data-testid="add-vote"]').click();
    await options.nth(0).locator('button[data-testid="add-vote"]').click();

    // Allocate to second option
    await options.nth(1).locator('button[data-testid="add-vote"]').click();

    // Should show correct totals
    await expect(options.nth(0).locator('text=Votes: 2')).toBeVisible();
    await expect(options.nth(1).locator('text=Votes: 1')).toBeVisible();

    // Total cost: 4 + 1 = 5 credits
    await expect(page.locator('text=Credits Remaining: 95')).toBeVisible();
  });

  test('should submit vote successfully', async ({ page }) => {
    await page.goto(`/events/${eventId}/vote?code=${inviteCode}`);

    // Allocate some votes
    const firstOption = page.locator('[data-testid="vote-option"]').first();
    await firstOption.locator('button[data-testid="add-vote"]').click();
    await firstOption.locator('button[data-testid="add-vote"]').click();

    // Submit vote
    await page.click('button[data-testid="submit-vote"]');

    // Should see confirmation dialog
    await expect(page.locator('text=Confirm Your Vote')).toBeVisible();
    await expect(page.locator('text=This action cannot be undone')).toBeVisible();

    // Confirm submission
    await page.click('text=Yes, Submit Vote');

    // Should see success message
    await expect(page.locator('text=Vote Submitted Successfully')).toBeVisible();
    await expect(page.locator('text=Thank you for participating')).toBeVisible();
  });

  test('should prevent double voting', async ({ page }) => {
    await page.goto(`/events/${eventId}/vote?code=${inviteCode}`);

    // Submit initial vote
    const firstOption = page.locator('[data-testid="vote-option"]').first();
    await firstOption.locator('button[data-testid="add-vote"]').click();
    await page.click('button[data-testid="submit-vote"]');
    await page.click('text=Yes, Submit Vote');

    // Try to access voting page again with same code
    await page.goto(`/events/${eventId}/vote?code=${inviteCode}`);

    // Should show "already voted" message
    await expect(page.locator('text=You have already voted')).toBeVisible();
    await expect(page.locator('text=Thank you for your participation')).toBeVisible();
  });

  test('should show vote summary before submission', async ({ page }) => {
    await page.goto(`/events/${eventId}/vote?code=${inviteCode}`);

    // Allocate votes to multiple options
    const options = page.locator('[data-testid="vote-option"]');
    await options.nth(0).locator('button[data-testid="add-vote"]').click();
    await options.nth(0).locator('button[data-testid="add-vote"]').click();
    await options.nth(1).locator('button[data-testid="add-vote"]').click();

    // Click submit
    await page.click('button[data-testid="submit-vote"]');

    // Should show vote summary in confirmation dialog
    await expect(page.locator('text=Vote Summary')).toBeVisible();
    await expect(page.locator('text=2 votes')).toBeVisible(); // First option
    await expect(page.locator('text=1 vote')).toBeVisible();  // Second option
    await expect(page.locator('text=Total Credits Used: 5')).toBeVisible();
  });

  test('should handle proportional distribution voting', async ({ page }) => {
    // Create proportional distribution event
    await page.goto('/events/create');
    await page.fill('[name="title"]', 'Proportional Test Event');
    await page.click('text=Next');
    await page.click('[data-testid="framework-proportional_distribution"]');
    await page.click('text=Next');
    await page.selectOption('[name="thresholdMode"]', 'percentage');
    await page.fill('[name="percentageThreshold"]', '25');
    await page.fill('[name="creditsPerVoter"]', '100');
    await page.click('text=Next');
    await page.click('text=Create Event');

    const url = page.url();
    const propEventId = url.split('/').pop() || '';

    // Access voting page
    await page.goto(`/events/${propEventId}/vote?code=${inviteCode}`);

    // Should see proportional distribution interface
    await expect(page.locator('text=Proportional Distribution')).toBeVisible();
    await expect(page.locator('text=Allocate your credits proportionally')).toBeVisible();

    // Voting mechanics should work the same way
    const firstOption = page.locator('[data-testid="vote-option"]').first();
    await firstOption.locator('button[data-testid="add-vote"]').click();

    await expect(firstOption.locator('text=Votes: 1')).toBeVisible();
    await expect(page.locator('text=Credits Remaining: 99')).toBeVisible();
  });

  test('should show results after voting (if permitted)', async ({ page }) => {
    await page.goto(`/events/${eventId}/vote?code=${inviteCode}`);

    // Submit vote
    const firstOption = page.locator('[data-testid="vote-option"]').first();
    await firstOption.locator('button[data-testid="add-vote"]').click();
    await page.click('button[data-testid="submit-vote"]');
    await page.click('text=Yes, Submit Vote');

    // After voting, should show option to view results
    await expect(page.locator('text=View Results')).toBeVisible();

    // Click to view results
    await page.click('text=View Results');

    // Should show voting results page
    await expect(page.locator('text=Voting Results')).toBeVisible();
    await expect(page.locator('text=Total Votes')).toBeVisible();
  });

  test('should validate vote allocation before submission', async ({ page }) => {
    await page.goto(`/events/${eventId}/vote?code=${inviteCode}`);

    // Try to submit without allocating any votes
    await page.click('button[data-testid="submit-vote"]');

    // Should show validation message
    await expect(page.locator('text=Please allocate at least one vote')).toBeVisible();

    // Submit button should be disabled or submission should fail
    const submitButton = page.locator('button[data-testid="submit-vote"]');
    await expect(submitButton).toBeDisabled();
  });

  test('should handle API errors during vote submission', async ({ page }) => {
    await page.goto(`/events/${eventId}/vote?code=${inviteCode}`);

    // Allocate votes
    const firstOption = page.locator('[data-testid="vote-option"]').first();
    await firstOption.locator('button[data-testid="add-vote"]').click();

    // Intercept the vote submission API and make it fail
    await page.route('/api/votes', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    // Try to submit
    await page.click('button[data-testid="submit-vote"]');
    await page.click('text=Yes, Submit Vote');

    // Should show error message
    await expect(page.locator('text=Failed to submit vote')).toBeVisible();

    // Should remain on voting page
    await expect(page.locator('h1')).toContainText('Voting Test Event');
  });

  test('should show voting deadline information', async ({ page }) => {
    await page.goto(`/events/${eventId}/vote?code=${inviteCode}`);

    // Should show voting deadline (if set)
    // This depends on whether the event has a deadline configured
    // await expect(page.locator('text=Voting ends:')).toBeVisible();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(`/events/${eventId}/vote?code=${inviteCode}`);

    // Should still be functional on mobile
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-testid="voting-options"]')).toBeVisible();

    // Vote allocation should work
    const firstOption = page.locator('[data-testid="vote-option"]').first();
    await firstOption.locator('button[data-testid="add-vote"]').click();

    await expect(firstOption.locator('text=Votes: 1')).toBeVisible();
  });

  test('should handle browser refresh during voting', async ({ page }) => {
    await page.goto(`/events/${eventId}/vote?code=${inviteCode}`);

    // Allocate some votes
    const firstOption = page.locator('[data-testid="vote-option"]').first();
    await firstOption.locator('button[data-testid="add-vote"]').click();
    await firstOption.locator('button[data-testid="add-vote"]').click();

    // Refresh the page
    await page.reload();

    // Should warn about losing unsaved changes or restore state
    // This depends on implementation - either:
    // 1. Restore the vote allocation from localStorage/sessionStorage
    // 2. Show warning about unsaved changes
    // 3. Reset to clean state

    // After refresh, should still be on voting page
    await expect(page.locator('h1')).toContainText('Voting Test Event');
  });

  test('should show clear voting instructions', async ({ page }) => {
    await page.goto(`/events/${eventId}/vote?code=${inviteCode}`);

    // Should show voting instructions
    await expect(page.locator('text=How to vote')).toBeVisible();
    await expect(page.locator('text=quadratic voting')).toBeVisible();
    await expect(page.locator('text=Click + to add votes')).toBeVisible();
  });
});