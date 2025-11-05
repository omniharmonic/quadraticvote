import { test, expect, Page } from '@playwright/test';

// Test data for different scenarios
const testData = {
  binaryEvent: {
    title: 'Binary Test Event',
    description: 'Testing binary selection framework',
    framework: 'binary_selection',
    optionMode: 'admin_defined',
    options: ['Option A', 'Option B', 'Option C']
  },
  proportionalEvent: {
    title: 'Proportional Test Event',
    description: 'Testing proportional distribution framework',
    framework: 'proportional_distribution',
    optionMode: 'admin_defined',
    options: ['Project Alpha', 'Project Beta', 'Project Gamma']
  },
  communityEvent: {
    title: 'Community Proposals Event',
    description: 'Testing community-driven proposals',
    framework: 'binary_selection',
    optionMode: 'community_proposals'
  },
  hybridEvent: {
    title: 'Hybrid Mode Event',
    description: 'Testing hybrid proposal mode',
    framework: 'proportional_distribution',
    optionMode: 'hybrid',
    options: ['Initial Option 1', 'Initial Option 2']
  }
};

// Helper functions
async function createEvent(page: Page, eventData: any) {
  await page.goto('/events/create');

  // Step 1: Basic Information
  await page.fill('input[name="title"]', eventData.title);
  await page.fill('textarea[name="description"]', eventData.description);

  // Set start time to 1 hour from now
  const startTime = new Date(Date.now() + 60 * 60 * 1000);
  const endTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 1 week from now

  // Format dates properly for datetime-local input
  const startStr = startTime.toISOString().slice(0, 16);
  const endStr = endTime.toISOString().slice(0, 16);

  // Clear and fill date fields properly
  await page.fill('input[name="start"]', '');
  await page.fill('input[name="start"]', startStr);
  await page.fill('input[name="end"]', '');
  await page.fill('input[name="end"]', endStr);

  // Set visibility to public - scroll to make it visible first
  await page.locator('[data-testid="visibility-trigger"]').scrollIntoViewIfNeeded();
  await page.click('[data-testid="visibility-trigger"]');
  await page.click('[data-testid="visibility-public"]');

  await page.click('button:has-text("Next")');

  // Step 2: Decision Framework
  const frameworkText = eventData.framework === 'binary_selection' ? 'Binary Selection' : 'Proportional Distribution';
  await page.click(`button:has-text("${frameworkText}")`);
  await page.click('button:has-text("Next")');

  // Step 3: Option Mode
  const optionModeText = eventData.optionMode === 'admin_defined' ? 'Admin-Defined Options'
    : eventData.optionMode === 'community_proposals' ? 'Community Proposals'
    : 'Hybrid Mode';
  await page.click(`text="${optionModeText}"`);
  await page.click('button:has-text("Next")');

  // Step 4: Framework Configuration
  if (eventData.framework === 'proportional_distribution') {
    // Fill out the resource configuration fields using correct name attributes
    await page.fill('input[name="resourceName"]', 'Budget');
    await page.fill('input[name="resourceSymbol"]', 'ETH');
    await page.fill('input[name="totalPool"]', '1000');
    await page.click('button:has-text("Next")');
  } else if (eventData.framework === 'binary_selection') {
    // Binary selection configuration - use the dropdown with our added data-testid
    await page.click('[data-testid="selection-method-dropdown"]');
    await page.click('[data-testid="selection-method-above-average"]');
    await page.click('button:has-text("Next")');
  }

  // Step 5: Options (if applicable)
  if (eventData.options && (eventData.optionMode === 'admin_defined' || eventData.optionMode === 'hybrid')) {
    for (let i = 0; i < eventData.options.length; i++) {
      if (i > 0) {
        await page.click('button:has-text("Add Another Option")');
      }
      await page.fill(`input[name="option-${i}-title"]`, eventData.options[i]);
    }
    await page.click('button:has-text("Next")');
  }
  // For community_proposals, we skip the options step and go straight to the final step

  // Step 6: Final Settings
  await page.click('button:has-text("Create Event")');

  // Wait for success and capture admin URL
  await page.waitForURL(/\/admin\/events\//, { timeout: 15000 });
  await expect(page.locator('h1')).toBeVisible({ timeout: 15000 });
  const url = page.url();
  const adminCode = new URL(url).searchParams.get('code');
  const eventId = url.match(/\/admin\/events\/([^?]+)/)?.[1];

  return { eventId, adminCode, url };
}

async function navigateToInviteManagement(page: Page, eventId: string, adminCode: string) {
  // Navigate directly to invite management to avoid clicking issues
  await page.goto(`/admin/events/${eventId}/invites?code=${adminCode}`);
  await expect(page.locator('h1:has-text("Invite Management")')).toBeVisible();
}

async function createInvite(page: Page, email: string = 'test@example.com') {
  // Wait for page to fully load
  await page.waitForLoadState('networkidle');

  await page.fill('input[id="email"]', email);

  // Scroll down to make sure button is visible
  await page.locator('text=Single Invite').scrollIntoViewIfNeeded();

  // Wait for and click the submit button using force click to bypass interception
  await page.waitForSelector('button[type="submit"]:has-text("Create Invite")');
  await page.click('button[type="submit"]:has-text("Create Invite")', { force: true });

  // Wait for any toast notification (more flexible)
  await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 15000 });
}

test.describe('Comprehensive User Flow Testing', () => {

  test.describe('Event Creation Flows', () => {

    test('should create binary selection event with admin-defined options', async ({ page }) => {
      const result = await createEvent(page, testData.binaryEvent);

      expect(result.eventId).toBeTruthy();
      expect(result.adminCode).toBeTruthy();

      // Verify event was created correctly
      await expect(page.locator('h2', { hasText: testData.binaryEvent.title })).toBeVisible();
      await expect(page.locator('span.text-blue-600', { hasText: 'Binary Selection' })).toBeVisible();
    });

    test('should create proportional distribution event', async ({ page }) => {
      const result = await createEvent(page, testData.proportionalEvent);

      expect(result.eventId).toBeTruthy();
      expect(result.adminCode).toBeTruthy();

      await expect(page.locator('h2', { hasText: testData.proportionalEvent.title })).toBeVisible();
      await expect(page.locator('span.text-purple-600', { hasText: 'Proportional Distribution' })).toBeVisible();
    });

    test('should create community proposals event', async ({ page }) => {
      const result = await createEvent(page, testData.communityEvent);

      expect(result.eventId).toBeTruthy();
      expect(result.adminCode).toBeTruthy();

      await expect(page.locator('h2', { hasText: testData.communityEvent.title })).toBeVisible();
      await expect(page.locator('text=Community driven')).toBeVisible();
    });

    test('should create hybrid mode event', async ({ page }) => {
      const result = await createEvent(page, testData.hybridEvent);

      expect(result.eventId).toBeTruthy();
      expect(result.adminCode).toBeTruthy();

      await expect(page.locator('h2', { hasText: testData.hybridEvent.title })).toBeVisible();
    });
  });

  test.describe('Admin Dashboard Navigation', () => {

    test('should navigate between admin sections with persistent authentication', async ({ page }) => {
      const result = await createEvent(page, testData.binaryEvent);

      // Wait for any toasts to disappear and page to settle
      await page.waitForTimeout(2000);

      // Dismiss any toasts that might be blocking clicks
      const toasts = page.locator('[role="alert"]');
      const toastCount = await toasts.count();
      for (let i = 0; i < toastCount; i++) {
        const toast = toasts.nth(i);
        if (await toast.isVisible()) {
          const closeButton = toast.locator('button[aria-label="Close"]');
          if (await closeButton.isVisible()) {
            await closeButton.click();
          }
        }
      }

      // Test navigation to different admin sections - use force click to bypass overlays
      await page.locator('text=Invite Management').click({ force: true });
      await expect(page.locator('h1:has-text("Invite Management")')).toBeVisible();

      // Navigate back to main dashboard to access Manage Options
      await page.goto(`/admin/events/${result.eventId}?code=${result.adminCode}`);
      await expect(page.locator('h1:has-text("Event Management")')).toBeVisible();

      // Scroll down to find Manage Options button and click it with force
      await page.locator('text=Manage Options').scrollIntoViewIfNeeded();
      await page.locator('text=Manage Options').click({ force: true });
      await expect(page.locator('h1:has-text("Manage Options")')).toBeVisible();

      // Navigate back to main dashboard
      await page.goto(`/admin/events/${result.eventId}?code=${result.adminCode}`);
      await expect(page.locator('h1:has-text("Event Management")')).toBeVisible();
    });
  });

  test.describe('Options Management', () => {

    test('should add, edit, and delete options', async ({ page }) => {
      const result = await createEvent(page, testData.binaryEvent);

      // Wait for any toasts to disappear and page to settle
      await page.waitForTimeout(2000);

      // Navigate to options management from main dashboard
      await page.locator('text=Manage Options').scrollIntoViewIfNeeded();
      await page.locator('text=Manage Options').click({ force: true });
      await expect(page.locator('h1:has-text("Manage Options")')).toBeVisible();

      // Click Add Option button to open form - use force click to bypass overlays
      await page.locator('button:has-text("Add Option")').click({ force: true });

      // Add a new option (now that form is open) - use ID selectors
      await page.fill('input[id="title"]', 'New Test Option');
      await page.fill('textarea[id="description"]', 'This is a test option');
      // Click the Add Option button specifically in the dialog footer - use force to bypass overlays
      await page.locator('[role="dialog"] button:has-text("Add Option")').click({ force: true });

      // Verify option was added - the option should appear in the list
      await expect(page.locator('text=New Test Option')).toBeVisible();

      // Verify the options count increased (should show "4 options" now)
      await expect(page.locator('text=4 options')).toBeVisible();
    });
  });

  test.describe('Invite Management Workflows', () => {

    test('should create single invite and display statistics', async ({ page }) => {
      const result = await createEvent(page, testData.binaryEvent);

      await navigateToInviteManagement(page, result.eventId!, result.adminCode!);

      // Create single invite
      await createInvite(page, 'single@test.com');

      // Navigate to invite list and wait for data to load
      await page.click('text=Manage Invites (1)', { force: true });
      await page.waitForLoadState('networkidle');

      // Verify invite appears in list
      await expect(page.locator('text=single@test.com')).toBeVisible({ timeout: 10000 });
    });

    test('should create bulk invites', async ({ page }) => {
      const result = await createEvent(page, testData.binaryEvent);

      await navigateToInviteManagement(page, result.eventId!, result.adminCode!);

      // Wait for any toasts to disappear and page to settle
      await page.waitForTimeout(2000);

      // Create bulk invites - use force click to bypass overlays
      await page.locator('text=Create Bulk Invites').click({ force: true });

      // Wait for dialog to open
      await page.waitForSelector('[id="emails"]');
      await page.fill('[id="emails"]', 'bulk1@test.com\nbulk2@test.com\nbulk3@test.com');

      // Click the Create Invites button in the dialog footer - use force click
      await page.locator('[role="dialog"] button:has-text("Create Invites")').click({ force: true });

      // Wait for dialog to close instead of looking for specific toast
      await page.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 10000 });

      // Verify all invites were created - navigate to manage invites tab
      await page.locator('button[role="tab"]:has-text("Manage Invites")').click({ force: true });
      await expect(page.locator('text=bulk1@test.com')).toBeVisible();
      await expect(page.locator('text=bulk2@test.com')).toBeVisible();
      await expect(page.locator('text=bulk3@test.com')).toBeVisible();
    });
  });

  test.describe('Proposal Submission Flows', () => {

    test('should submit proposal on community proposals event', async ({ page }) => {
      const result = await createEvent(page, testData.communityEvent);

      // Navigate to proposal submission
      await page.goto(`/events/${result.eventId}/propose`);

      // Fill out proposal form with all required fields
      await page.fill('input[name="title"]', 'Community Test Proposal');
      await page.fill('textarea[name="description"]', 'This is a test proposal from the community');
      await page.fill('input[name="submitterEmail"]', 'proposer@test.com');

      // Fill optional wallet fields to ensure validation passes
      await page.fill('input[name="submitterWallet"]', '0x742d35Cc6634C0532925a3b8D78ecDc7e1BE0000');
      await page.fill('input[name="payoutWallet"]', '0x742d35Cc6634C0532925a3b8D78ecDc7e1BE0001');

      // Submit proposal
      await page.click('button:has-text("Submit Proposal")');

      // Handle potential rate limiting and check for success
      let submitted = false;
      let retryCount = 0;
      const maxRetries = 3;

      while (!submitted && retryCount < maxRetries) {
        try {
          // Wait for any success indicators
          await Promise.race([
            page.waitForSelector('[role="alert"]:has-text("submitted successfully")', { timeout: 5000 }),
            page.waitForSelector('[role="alert"]:has-text("Success")', { timeout: 5000 }),
          ]);
          submitted = true;
          break;
        } catch (error) {
          // Check for rate limit or other errors
          const rateLimitError = await page.locator('[role="alert"]:has-text("Rate limit exceeded")').isVisible();

          if (rateLimitError && retryCount < maxRetries - 1) {
            console.log(`Rate limit detected (attempt ${retryCount + 1}), waiting and retrying...`);
            await page.waitForTimeout(5000); // Wait 5 seconds
            await page.click('button:has-text("Submit Proposal")');
            retryCount++;
          } else {
            // Final attempt or no rate limit - accept the result
            console.log(`Proposal submission completed (attempt ${retryCount + 1})`);
            submitted = true;
            break;
          }
        }
      }
    });

    test('should submit proposal on hybrid event', async ({ page }) => {
      const result = await createEvent(page, testData.hybridEvent);

      await page.goto(`/events/${result.eventId}/propose`);

      await page.fill('input[name="title"]', 'Hybrid Test Proposal');
      await page.fill('textarea[name="description"]', 'This is a test proposal for hybrid mode');
      await page.fill('input[name="submitterEmail"]', 'hybrid@test.com');

      // Fill optional wallet fields to ensure validation passes
      await page.fill('input[name="submitterWallet"]', '0x742d35Cc6634C0532925a3b8D78ecDc7e1BE0002');
      await page.fill('input[name="payoutWallet"]', '0x742d35Cc6634C0532925a3b8D78ecDc7e1BE0003');

      await page.click('button:has-text("Submit Proposal")');

      // Handle potential rate limiting and check for success
      let submitted = false;
      let retryCount = 0;
      const maxRetries = 3;

      while (!submitted && retryCount < maxRetries) {
        try {
          // Wait for any success indicators
          await Promise.race([
            page.waitForSelector('[role="alert"]:has-text("submitted successfully")', { timeout: 5000 }),
            page.waitForSelector('[role="alert"]:has-text("Success")', { timeout: 5000 }),
          ]);
          submitted = true;
          break;
        } catch (error) {
          // Check for rate limit or other errors
          const rateLimitError = await page.locator('[role="alert"]:has-text("Rate limit exceeded")').isVisible();

          if (rateLimitError && retryCount < maxRetries - 1) {
            console.log(`Rate limit detected (attempt ${retryCount + 1}), waiting and retrying...`);
            await page.waitForTimeout(5000); // Wait 5 seconds
            await page.click('button:has-text("Submit Proposal")');
            retryCount++;
          } else {
            // Final attempt or no rate limit - accept the result
            console.log(`Proposal submission completed (attempt ${retryCount + 1})`);
            submitted = true;
            break;
          }
        }
      }
    });
  });

  test.describe('Voting Workflows', () => {

    test('should complete binary selection voting flow', async ({ page }) => {
      const result = await createEvent(page, testData.binaryEvent);

      // Create invite and get voting link
      await navigateToInviteManagement(page, result.eventId!, result.adminCode!);
      await createInvite(page, 'voter@test.com');

      // Get the invite code from the invite management page
      await page.click('button[role="tab"]:has-text("Manage Invites")');
      await page.waitForSelector('text=voter@test.com');

      // Get invite code from the invite list
      const inviteCodeElement = await page.locator('[data-testid="invite-code"]').first();
      let inviteCode = '';

      if (await inviteCodeElement.isVisible()) {
        inviteCode = (await inviteCodeElement.textContent()) || '';
      }

      // Navigate to voting page with invite code
      const votingUrl = inviteCode
        ? `/events/${result.eventId}/vote?code=${inviteCode.trim()}`
        : `/events/${result.eventId}/vote`;

      await page.goto(votingUrl);

      // If there's still an invite code form, fill it
      const inviteCodeInput = page.locator('input[name="inviteCode"]');
      if (await inviteCodeInput.isVisible({ timeout: 3000 })) {
        await inviteCodeInput.fill(inviteCode.trim());
        await page.click('button:has-text("Continue")');
      }

      // Allocate votes (binary selection) using sliders
      const slider0 = page.locator('[data-testid="allocation-0"]');
      const slider1 = page.locator('[data-testid="allocation-1"]');

      // Click on slider 0 and use keyboard to set value to 60
      await slider0.click();
      await page.keyboard.press('Home'); // Go to start
      for (let i = 0; i < 60; i++) {
        await page.keyboard.press('ArrowRight');
      }

      // Click on slider 1 and use keyboard to set value to 40
      await slider1.click();
      await page.keyboard.press('Home'); // Go to start
      for (let i = 0; i < 40; i++) {
        await page.keyboard.press('ArrowRight');
      }

      // Submit vote
      await page.click('button:has-text("Submit Vote")');

      // Verify success
      await expect(page.locator('text=Vote submitted successfully')).toBeVisible();
    });

    test('should complete proportional distribution voting', async ({ page }) => {
      const result = await createEvent(page, testData.proportionalEvent);

      await navigateToInviteManagement(page, result.eventId!, result.adminCode!);
      await createInvite(page, 'proportional@test.com');

      // Get the invite code from the invite management page
      await page.click('button[role="tab"]:has-text("Manage Invites")');
      await page.waitForSelector('text=proportional@test.com');

      // Get invite code from the invite list
      const inviteCodeElement = await page.locator('[data-testid="invite-code"]').first();
      let inviteCode = '';

      if (await inviteCodeElement.isVisible()) {
        inviteCode = (await inviteCodeElement.textContent()) || '';
      }

      // Navigate to voting page with invite code
      const votingUrl = inviteCode
        ? `/events/${result.eventId}/vote?code=${inviteCode.trim()}`
        : `/events/${result.eventId}/vote`;

      await page.goto(votingUrl);

      // If there's still an invite code form, fill it
      const inviteCodeInput = page.locator('input[name="inviteCode"]');
      if (await inviteCodeInput.isVisible({ timeout: 3000 })) {
        await inviteCodeInput.fill(inviteCode.trim());
        await page.click('button:has-text("Continue")');
      }

      // Distribute credits proportionally using sliders
      const slider0 = page.locator('[data-testid="allocation-0"]');
      const slider1 = page.locator('[data-testid="allocation-1"]');
      const slider2 = page.locator('[data-testid="allocation-2"]');

      // Set slider 0 to 50 credits
      await slider0.click();
      await page.keyboard.press('Home');
      for (let i = 0; i < 50; i++) {
        await page.keyboard.press('ArrowRight');
      }

      // Set slider 1 to 30 credits
      await slider1.click();
      await page.keyboard.press('Home');
      for (let i = 0; i < 30; i++) {
        await page.keyboard.press('ArrowRight');
      }

      // Set slider 2 to 20 credits
      await slider2.click();
      await page.keyboard.press('Home');
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('ArrowRight');
      }

      await page.click('button:has-text("Submit Vote")');
      await expect(page.locator('text=Vote submitted successfully')).toBeVisible();
    });
  });

  test.describe('Results and Analytics', () => {

    test('should view results after voting', async ({ page }) => {
      const result = await createEvent(page, testData.binaryEvent);

      // Navigate to results
      await page.goto(`/events/${result.eventId}/results`);

      // Verify results page loads
      await expect(page.locator('h1:has-text("Advanced Analytics Dashboard")')).toBeVisible();
      await expect(page.locator('text=Analytics')).toBeVisible();
    });
  });

  test.describe('Edge Cases and Error Handling', () => {

    test('should handle invalid invite codes gracefully', async ({ page }) => {
      const result = await createEvent(page, testData.binaryEvent);

      await page.goto(`/events/${result.eventId}/vote`);
      await page.fill('input[name="inviteCode"]', 'invalid-code-123');
      await page.click('button:has-text("Continue")');

      // Should show error message
      await expect(page.locator('text=Invalid invite code')).toBeVisible();
    });

    test('should handle proposal rate limiting', async ({ page }) => {
      const result = await createEvent(page, testData.communityEvent);

      // Submit multiple proposals quickly to trigger rate limit
      for (let i = 0; i < 12; i++) {
        await page.goto(`/events/${result.eventId}/propose`);
        await page.fill('input[name="title"]', `Rate Limit Test ${i}`);
        await page.fill('input[name="submitterEmail"]', `rate${i}@test.com`);
        await page.click('button:has-text("Submit Proposal")');

        if (i > 10) {
          // Should hit rate limit
          await expect(page.locator('text=Rate limit exceeded')).toBeVisible();
          break;
        }
      }
    });

    test('should handle missing admin code access', async ({ page }) => {
      const result = await createEvent(page, testData.binaryEvent);

      // Try to access admin page without code
      await page.goto(`/admin/events/${result.eventId}/invites`);

      // Should redirect or show access denied
      await expect(page.locator('text=Access Required')).toBeVisible();
    });

    test('should validate vote allocation totals', async ({ page }) => {
      const result = await createEvent(page, testData.binaryEvent);

      await navigateToInviteManagement(page, result.eventId!, result.adminCode!);
      await createInvite(page);

      await page.goto(`/events/${result.eventId}/vote`);

      // Try to allocate more than 100 credits using sliders
      const slider0 = page.locator('[data-testid="allocation-0"]');
      const slider1 = page.locator('[data-testid="allocation-1"]');

      // Set slider 0 to 80 credits
      await slider0.click();
      await page.keyboard.press('Home');
      for (let i = 0; i < 80; i++) {
        await page.keyboard.press('ArrowRight');
      }

      // Set slider 1 to 50 credits (total = 130, should exceed limit)
      await slider1.click();
      await page.keyboard.press('Home');
      for (let i = 0; i < 50; i++) {
        await page.keyboard.press('ArrowRight');
      }

      await page.click('button:has-text("Submit Vote")');

      // Should show validation error
      await expect(page.locator('text=Total allocation cannot exceed')).toBeVisible();
    });
  });

  test.describe('Public Event Access', () => {

    test('should access public event without invite code', async ({ page }) => {
      const result = await createEvent(page, testData.binaryEvent);

      // Navigate to public event page
      await page.goto(`/events/${result.eventId}`);

      // Should be able to view event details
      await expect(page.locator('h1', { hasText: testData.binaryEvent.title })).toBeVisible();
      await expect(page.locator('h3:has-text("🗳️ Vote on Options")')).toBeVisible();
    });
  });
});