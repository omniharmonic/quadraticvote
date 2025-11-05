import { test, expect } from '@playwright/test';

test.describe('Comprehensive Platform Testing', () => {
  let eventIds: string[] = [];

  test.beforeAll(async () => {
    console.log('🚀 Starting comprehensive platform testing...');
  });

  test.afterAll(async () => {
    console.log('✅ Comprehensive testing completed');
    console.log(`Created events: ${eventIds.join(', ')}`);
  });

  test('1. Create Admin-Defined Binary Event', async ({ page }) => {
    console.log('=== TEST 1: Admin-Defined Binary Event ===');

    await page.goto('/events/create');
    await page.waitForTimeout(1000);

    // Step 1: Basic Info
    await page.fill('input[name="title"]', 'Admin Binary Test Event');
    await page.fill('textarea[name="description"]', 'Testing admin-defined binary selection');

    // Set dates 1 hour from now to 1 week from now
    const startTime = new Date();
    startTime.setHours(startTime.getHours() + 1);
    const endTime = new Date();
    endTime.setDate(endTime.getDate() + 7);

    await page.fill('input[name="start"]', startTime.toISOString().slice(0, 16));
    await page.fill('input[name="end"]', endTime.toISOString().slice(0, 16));

    await page.click('text=Next: Choose Framework');
    await page.waitForTimeout(1000);

    // Step 2: Choose Binary Selection
    await page.click('text=Binary Selection');
    await page.waitForTimeout(500);

    await page.click('text=Next: Option Mode');
    await page.waitForTimeout(1000);

    // Step 3: Choose Admin-Defined
    await page.click('text=Admin-Defined Options');
    await page.waitForTimeout(500);

    await page.click('text=Next: Configure');
    await page.waitForTimeout(1000);

    // Step 4: Configure - Top N
    const selectTrigger = page.locator('[role="combobox"]').first();
    await selectTrigger.click();
    await page.waitForTimeout(500);

    await page.click('text=Top N - Select top ranked options');
    await page.waitForTimeout(1000);

    await page.fill('input[name="topN"]', '2');

    await page.click('text=Next: Add Options');
    await page.waitForTimeout(1000);

    // Step 5: Add Options
    await page.fill('input[name="option-0-title"]', 'Option Alpha');
    await page.fill('textarea[name="option-0-description"]', 'First test option');

    await page.click('text=+ Add Another Option');
    await page.waitForTimeout(500);

    await page.fill('input[name="option-1-title"]', 'Option Beta');
    await page.fill('textarea[name="option-1-description"]', 'Second test option');

    await page.click('text=+ Add Another Option');
    await page.waitForTimeout(500);

    await page.fill('input[name="option-2-title"]', 'Option Gamma');
    await page.fill('textarea[name="option-2-description"]', 'Third test option');

    await page.click('text=Next: Vote Settings');
    await page.waitForTimeout(1000);

    // Step 6: Vote Settings - Enable anonymous participation
    const anonymousSwitch = page.locator('#allowAnonymous');
    await expect(anonymousSwitch).toBeVisible();
    await anonymousSwitch.click(); // Enable anonymous voting

    // Create event
    const createButton = page.locator('button', { hasText: /Create Event|Submit/i }).first();
    await createButton.click();
    await page.waitForTimeout(3000);

    // Extract event ID from URL
    const url = page.url();
    const eventIdMatch = url.match(/\/admin\/events\/([^\/]+)/);

    if (eventIdMatch) {
      const eventId = eventIdMatch[1];
      eventIds.push(eventId);
      console.log(`✅ Created admin binary event: ${eventId}`);

      // Test navigation to event
      await page.goto(`/events/${eventId}`);
      await page.waitForTimeout(2000);

      const pageContent = await page.textContent('body');
      expect(pageContent).toContain('Admin Binary Test Event');
      console.log('✅ Event page loads correctly');

      // Test voting page access
      await page.goto(`/events/${eventId}/vote`);
      await page.waitForTimeout(2000);

      // Should show anonymous voting option for public events
      const anonymousButton = page.locator('text=Continue as Anonymous Voter');
      if (await anonymousButton.isVisible()) {
        console.log('✅ Anonymous voting option is available');
        await anonymousButton.click();
        await page.waitForTimeout(2000);

        // Check if voting interface loads
        const alphaOption = page.locator('text=Option Alpha');
        await expect(alphaOption).toBeVisible();
        console.log('✅ Voting interface loads with options');

        // Test vote submission
        const creditInputs = page.locator('input[type="number"]');
        if (await creditInputs.count() >= 3) {
          await creditInputs.nth(0).fill('50');
          await creditInputs.nth(1).fill('30');
          await creditInputs.nth(2).fill('20');

          const submitButton = page.locator('button[type="submit"]');
          if (await submitButton.isVisible()) {
            await submitButton.click();
            await page.waitForTimeout(3000);

            const resultContent = await page.textContent('body');
            if (resultContent?.includes('successfully') || resultContent?.includes('submitted')) {
              console.log('✅ Anonymous vote submission successful');
            } else {
              console.log('⚠️ Vote submission may have issues');
            }
          }
        }
      } else {
        console.log('⚠️ Anonymous voting not available - checking for invite code requirement');
      }
    } else {
      throw new Error('Failed to create admin binary event');
    }
  });

  test('2. Create Community Proposals Event', async ({ page }) => {
    console.log('=== TEST 2: Community Proposals Event ===');

    await page.goto('/events/create');
    await page.waitForTimeout(1000);

    // Step 1: Basic Info
    await page.fill('input[name="title"]', 'Community Proposals Test Event');
    await page.fill('textarea[name="description"]', 'Testing community proposal functionality');

    const startTime = new Date();
    startTime.setHours(startTime.getHours() + 1);
    const endTime = new Date();
    endTime.setDate(endTime.getDate() + 7);

    await page.fill('input[name="start"]', startTime.toISOString().slice(0, 16));
    await page.fill('input[name="end"]', endTime.toISOString().slice(0, 16));

    await page.click('text=Next: Choose Framework');
    await page.waitForTimeout(1000);

    // Step 2: Choose Proportional Distribution
    await page.click('text=Proportional Distribution');
    await page.waitForTimeout(500);

    await page.click('text=Next: Option Mode');
    await page.waitForTimeout(1000);

    // Step 3: Choose Community Proposals
    await page.click('text=Community Proposals');
    await page.waitForTimeout(500);

    await page.click('text=Next: Configure');
    await page.waitForTimeout(1000);

    // Step 4: Configure distribution
    await page.fill('input[name="resourceName"]', 'funding');
    await page.fill('input[name="resourceSymbol"]', '$');
    await page.fill('input[name="totalPool"]', '10000');

    await page.click('text=Next: Vote Settings');
    await page.waitForTimeout(1000);

    // Step 5: Vote Settings
    // Disable moderation for easier testing
    const moderationSwitch = page.locator('#requireModeration');
    if (await moderationSwitch.isVisible()) {
      const isChecked = await moderationSwitch.isChecked();
      if (isChecked) {
        await moderationSwitch.click(); // Disable moderation
      }
    }

    // Enable anonymous participation
    const anonymousSwitch = page.locator('#allowAnonymous');
    if (await anonymousSwitch.isVisible()) {
      const isChecked = await anonymousSwitch.isChecked();
      if (!isChecked) {
        await anonymousSwitch.click(); // Enable anonymous voting
      }
    }

    // Create event
    const createButton = page.locator('button', { hasText: /Create Event|Submit/i }).first();
    await createButton.click();
    await page.waitForTimeout(3000);

    // Extract event ID
    const url = page.url();
    const eventIdMatch = url.match(/\/admin\/events\/([^\/]+)/);

    if (eventIdMatch) {
      const eventId = eventIdMatch[1];
      eventIds.push(eventId);
      console.log(`✅ Created community proposals event: ${eventId}`);

      // Test proposal submission
      await page.goto(`/events/${eventId}/propose`);
      await page.waitForTimeout(2000);

      // Fill proposal form
      await page.fill('input[name="title"]', 'Test Community Proposal');
      await page.fill('textarea[name="description"]', 'This is a test proposal for the community');
      await page.fill('input[name="submitterEmail"]', 'test@example.com');

      // Submit proposal
      const submitProposalButton = page.locator('button[type="submit"]');
      await submitProposalButton.click();
      await page.waitForTimeout(3000);

      const resultContent = await page.textContent('body');
      if (resultContent?.includes('success') || resultContent?.includes('submitted')) {
        console.log('✅ Proposal submission successful');

        // Test admin interface for proposal approval
        await page.goto('/admin/proposals');
        await page.waitForTimeout(2000);

        // Look for the proposal in admin interface
        const proposalElement = page.locator('text=Test Community Proposal').first();
        if (await proposalElement.isVisible()) {
          console.log('✅ Proposal visible in admin interface');

          // Try to approve the proposal
          const approveButton = page.locator('button', { hasText: /approve/i }).first();
          if (await approveButton.isVisible()) {
            await approveButton.click();
            await page.waitForTimeout(2000);
            console.log('✅ Proposal approval attempted');
          }
        }
      } else {
        console.log('⚠️ Proposal submission may have failed');
        console.log('Response content:', resultContent?.slice(0, 200));
      }
    } else {
      throw new Error('Failed to create community proposals event');
    }
  });

  test('3. Test Analytics Dashboard', async ({ page }) => {
    console.log('=== TEST 3: Analytics Dashboard ===');

    if (eventIds.length === 0) {
      console.log('⚠️ No events created yet, skipping analytics test');
      return;
    }

    const eventId = eventIds[0];
    await page.goto(`/admin/events/${eventId}/analytics`);
    await page.waitForTimeout(3000);

    const pageContent = await page.textContent('body');

    if (pageContent?.includes('Analytics') || pageContent?.includes('Total')) {
      console.log('✅ Analytics dashboard loads');

      // Check for key metrics
      const hasVotingStats = pageContent.includes('Voting') || pageContent.includes('votes');
      const hasProposalStats = pageContent.includes('Proposals') || pageContent.includes('proposal');

      if (hasVotingStats) console.log('✅ Voting statistics present');
      if (hasProposalStats) console.log('✅ Proposal statistics present');
    } else {
      console.log('⚠️ Analytics dashboard may have issues');
      console.log('Page content preview:', pageContent?.slice(0, 200));
    }
  });

  test('4. Test All Event Types End-to-End', async ({ page }) => {
    console.log('=== TEST 4: Event Type Variations ===');

    const eventTypes = [
      {
        name: 'Hybrid Binary Event',
        optionMode: 'hybrid',
        framework: 'binary_selection',
        threshold: 'percentage'
      },
      {
        name: 'Admin Proportional Event',
        optionMode: 'admin_defined',
        framework: 'proportional_distribution'
      }
    ];

    for (const eventType of eventTypes) {
      console.log(`Testing: ${eventType.name}`);

      await page.goto('/events/create');
      await page.waitForTimeout(1000);

      // Basic info
      await page.fill('input[name="title"]', eventType.name);
      await page.fill('textarea[name="description"]', `Testing ${eventType.name} functionality`);

      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 1);
      const endTime = new Date();
      endTime.setDate(endTime.getDate() + 7);

      await page.fill('input[name="start"]', startTime.toISOString().slice(0, 16));
      await page.fill('input[name="end"]', endTime.toISOString().slice(0, 16));

      await page.click('text=Next: Choose Framework');
      await page.waitForTimeout(1000);

      // Framework selection
      if (eventType.framework === 'binary_selection') {
        await page.click('text=Binary Selection');
      } else {
        await page.click('text=Proportional Distribution');
      }
      await page.waitForTimeout(500);

      await page.click('text=Next: Option Mode');
      await page.waitForTimeout(1000);

      // Option mode selection
      if (eventType.optionMode === 'admin_defined') {
        await page.click('text=Admin-Defined Options');
      } else if (eventType.optionMode === 'hybrid') {
        await page.click('text=Hybrid Mode');
      }
      await page.waitForTimeout(500);

      await page.click('text=Next: Configure');
      await page.waitForTimeout(1000);

      // Configuration
      if (eventType.framework === 'binary_selection') {
        const selectTrigger = page.locator('[role="combobox"]').first();
        await selectTrigger.click();
        await page.waitForTimeout(500);

        if (eventType.threshold === 'percentage') {
          await page.click('text=Percentage - Select by percentage threshold');
          await page.waitForTimeout(500);
          await page.fill('input[name="percentage"]', '60');
        } else {
          await page.click('text=Top N - Select top ranked options');
          await page.waitForTimeout(500);
          await page.fill('input[name="topN"]', '3');
        }
      } else {
        await page.fill('input[name="resourceName"]', 'grants');
        await page.fill('input[name="resourceSymbol"]', '$');
        await page.fill('input[name="totalPool"]', '25000');
      }

      // Continue through remaining steps
      if (eventType.optionMode === 'admin_defined' || eventType.optionMode === 'hybrid') {
        await page.click('text=Next: Add Options');
        await page.waitForTimeout(1000);

        // Add required options
        await page.fill('input[name="option-0-title"]', 'Test Option 1');
        await page.fill('textarea[name="option-0-description"]', 'First option');

        await page.click('text=+ Add Another Option');
        await page.waitForTimeout(500);

        await page.fill('input[name="option-1-title"]', 'Test Option 2');
        await page.fill('textarea[name="option-1-description"]', 'Second option');
      }

      await page.click('text=Next: Vote Settings');
      await page.waitForTimeout(1000);

      // Create event
      const createButton = page.locator('button', { hasText: /Create Event|Submit/i }).first();
      await createButton.click();
      await page.waitForTimeout(3000);

      const url = page.url();
      const eventIdMatch = url.match(/\/admin\/events\/([^\/]+)/);

      if (eventIdMatch) {
        const eventId = eventIdMatch[1];
        eventIds.push(eventId);
        console.log(`✅ Created ${eventType.name}: ${eventId}`);
      } else {
        console.log(`⚠️ Failed to create ${eventType.name}`);
      }
    }
  });

  test('5. Test Admin Interface Functionality', async ({ page }) => {
    console.log('=== TEST 5: Admin Interface ===');

    // Test main admin dashboard
    await page.goto('/admin');
    await page.waitForTimeout(2000);

    let pageContent = await page.textContent('body');
    if (pageContent?.includes('Admin') || pageContent?.includes('Events')) {
      console.log('✅ Admin dashboard accessible');
    }

    // Test proposals management
    await page.goto('/admin/proposals');
    await page.waitForTimeout(2000);

    pageContent = await page.textContent('body');
    if (pageContent?.includes('Proposals')) {
      console.log('✅ Proposals admin page accessible');

      // Test proposal actions if proposals exist
      const approveButtons = page.locator('button', { hasText: /approve/i });
      const buttonCount = await approveButtons.count();

      if (buttonCount > 0) {
        console.log(`✅ Found ${buttonCount} proposals to manage`);

        // Test approval
        await approveButtons.first().click();
        await page.waitForTimeout(2000);
        console.log('✅ Proposal approval action tested');
      }
    }

    // Test event management for each created event
    for (const eventId of eventIds) {
      await page.goto(`/admin/events/${eventId}`);
      await page.waitForTimeout(2000);

      pageContent = await page.textContent('body');
      if (pageContent?.includes('Event') || pageContent?.includes(eventId)) {
        console.log(`✅ Event ${eventId} admin page accessible`);
      }
    }
  });

  test('6. Test Error Handling and Edge Cases', async ({ page }) => {
    console.log('=== TEST 6: Error Handling ===');

    // Test invalid event ID
    await page.goto('/events/invalid-uuid/vote');
    await page.waitForTimeout(2000);

    let pageContent = await page.textContent('body');
    console.log('Invalid UUID handling:', pageContent?.includes('404') || pageContent?.includes('not found') ? '✅' : '⚠️');

    // Test event creation with missing required fields
    await page.goto('/events/create');
    await page.waitForTimeout(1000);

    // Try to proceed without filling required fields
    const nextButton = page.locator('text=Next: Choose Framework');
    await nextButton.click();
    await page.waitForTimeout(1000);

    // Should still be on first step or show validation errors
    const currentUrl = page.url();
    const staysOnCreate = currentUrl.includes('/events/create');
    console.log('Required field validation:', staysOnCreate ? '✅' : '⚠️');

    // Test proposal submission with invalid data
    if (eventIds.length > 0) {
      const eventId = eventIds.find(id => id); // Get first valid event ID
      if (eventId) {
        await page.goto(`/events/${eventId}/propose`);
        await page.waitForTimeout(2000);

        // Submit empty proposal
        const submitButton = page.locator('button[type="submit"]');
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await page.waitForTimeout(2000);

          pageContent = await page.textContent('body');
          const hasValidation = pageContent?.includes('required') || pageContent?.includes('error');
          console.log('Proposal validation:', hasValidation ? '✅' : '⚠️');
        }
      }
    }
  });
});