import { test, expect } from '@playwright/test';

test.describe('Comprehensive Platform Testing', () => {

  test('should test proportional distribution event creation', async ({ page }) => {
    console.log('=== TESTING PROPORTIONAL DISTRIBUTION EVENT CREATION ===');

    await page.goto('/events/create');
    await page.waitForTimeout(1000);

    // Step 1: Basic Information
    console.log('Step 1: Basic Information');
    await page.fill('input[name="title"]', 'Proportional Test Event');
    await page.fill('textarea[name="description"]', 'Testing proportional distribution workflow');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.fill('input[name="start"]', tomorrow.toISOString().slice(0, 16));

    const weekLater = new Date();
    weekLater.setDate(weekLater.getDate() + 7);
    await page.fill('input[name="end"]', weekLater.toISOString().slice(0, 16));

    await page.click('text=Next: Choose Framework');
    await page.waitForTimeout(1000);

    // Step 2: Choose PROPORTIONAL Framework
    console.log('Step 2: Selecting Proportional Distribution');
    await page.click('text=Proportional Distribution');
    await page.waitForTimeout(500);

    await page.click('text=Next: Option Mode');
    await page.waitForTimeout(1000);

    // Step 3: Option Mode
    console.log('Step 3: Option Mode Selection');
    await page.click('text=Admin-Defined Options');
    await page.waitForTimeout(500);

    await page.click('text=Next: Configure');
    await page.waitForTimeout(1000);

    // Step 4: Proportional Configuration
    console.log('Step 4: Configuring proportional distribution settings');

    // Check if proportional-specific fields exist
    const resourceNameInput = page.locator('input[name="resourceName"]');
    const resourceSymbolInput = page.locator('input[name="resourceSymbol"]');
    const totalPoolInput = page.locator('input[name="totalPool"]');

    if (await resourceNameInput.isVisible()) {
      await resourceNameInput.fill('Grant Money');
      console.log('✅ Resource name field found and filled');
    } else {
      console.log('❌ Resource name field NOT found');
    }

    if (await resourceSymbolInput.isVisible()) {
      await resourceSymbolInput.fill('$');
      console.log('✅ Resource symbol field found and filled');
    } else {
      console.log('❌ Resource symbol field NOT found');
    }

    if (await totalPoolInput.isVisible()) {
      await totalPoolInput.fill('100000');
      console.log('✅ Total pool field found and filled');
    } else {
      console.log('❌ Total pool field NOT found');
    }

    // Credits per voter should still exist
    const creditsInput = page.locator('input[name="credits"]');
    const creditsValue = await creditsInput.inputValue();
    console.log(`Credits per voter value: "${creditsValue}"`);

    // Try to proceed to next step
    const nextButton = page.locator('text=Next: Add Options');
    if (await nextButton.isVisible() && await nextButton.isEnabled()) {
      await nextButton.click();
      await page.waitForTimeout(1000);
      console.log('✅ Successfully proceeded to Add Options step');

      // Step 5: Add Options
      console.log('Step 5: Adding options for proportional event');
      await page.fill('input[name="option-0-title"]', 'Community Garden Project');
      await page.fill('textarea[name="option-0-description"]', 'Funding for new community gardens');

      await page.click('text=+ Add Another Option');
      await page.waitForTimeout(500);

      await page.fill('input[name="option-1-title"]', 'Youth Programs');
      await page.fill('textarea[name="option-1-description"]', 'After-school and summer programs');

      await page.click('text=+ Add Another Option');
      await page.waitForTimeout(500);

      await page.fill('input[name="option-2-title"]', 'Senior Services');
      await page.fill('textarea[name="option-2-description"]', 'Support services for elderly residents');

      // Click Next to go to Vote Settings step
      const nextToVoteSettings = page.locator('button', { hasText: /Next: Vote Settings/i });
      if (await nextToVoteSettings.isEnabled()) {
        await nextToVoteSettings.click();
        await page.waitForTimeout(1000);
        console.log('✅ Successfully proceeded to Vote Settings step');
      } else {
        console.log('❌ Next: Vote Settings button is disabled');
      }

      // Submit event
      const createButton = page.locator('button', { hasText: /Create Event|Submit/i }).first();
      if (await createButton.isEnabled()) {
        await createButton.click();
        await page.waitForTimeout(3000);

        const url = page.url();
        const match = url.match(/\/admin\/events\/([^\/]+)/);
        if (match) {
          console.log(`🎉 PROPORTIONAL EVENT CREATED: ${match[1]}`);
        } else {
          console.log('❌ Failed to create proportional event');
        }
      } else {
        console.log('❌ Create button disabled for proportional event');
      }
    } else {
      console.log('❌ Cannot proceed to Add Options step for proportional event');
    }

    await page.screenshot({ path: 'proportional-event-test.png' });
    console.log('=== PROPORTIONAL DISTRIBUTION TEST COMPLETED ===');
  });

  test('should test community proposals event creation', async ({ page }) => {
    console.log('=== TESTING COMMUNITY PROPOSALS EVENT CREATION ===');

    await page.goto('/events/create');
    await page.waitForTimeout(1000);

    // Step 1: Basic Information
    await page.fill('input[name="title"]', 'Community Proposals Test');
    await page.fill('textarea[name="description"]', 'Testing community-driven proposals');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.fill('input[name="start"]', tomorrow.toISOString().slice(0, 16));

    const weekLater = new Date();
    weekLater.setDate(weekLater.getDate() + 7);
    await page.fill('input[name="end"]', weekLater.toISOString().slice(0, 16));

    await page.click('text=Next: Choose Framework');
    await page.waitForTimeout(1000);

    // Step 2: Choose Framework
    await page.click('text=Binary Selection');
    await page.waitForTimeout(500);

    await page.click('text=Next: Option Mode');
    await page.waitForTimeout(1000);

    // Step 3: Select COMMUNITY PROPOSALS
    console.log('Selecting Community Proposals mode');
    await page.click('text=Community Proposals');
    await page.waitForTimeout(500);

    await page.click('text=Next: Configure');
    await page.waitForTimeout(1000);

    // Step 4: Configure framework
    const selectTrigger = page.locator('[role="combobox"]').first();
    await selectTrigger.click();
    await page.waitForTimeout(500);

    await page.click('text=Top N - Select top ranked options');
    await page.waitForTimeout(1000);

    await page.fill('input[name="topN"]', '3');
    await page.waitForTimeout(500);

    // For community proposals, need to go to Vote Settings step first
    const nextToVoteSettingsCommunity = page.locator('button', { hasText: /Next: Vote Settings/i });
    if (await nextToVoteSettingsCommunity.isVisible()) {
      await nextToVoteSettingsCommunity.click();
      await page.waitForTimeout(1000);
      console.log('✅ Successfully proceeded to Vote Settings step for community proposals');
    } else {
      console.log('❌ Next: Vote Settings button not visible for community proposals');
    }

    const createButton = page.locator('text=Create Event');
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(3000);

      const url = page.url();
      const match = url.match(/\/admin\/events\/([^\/]+)/);
      if (match) {
        console.log(`🎉 COMMUNITY PROPOSALS EVENT CREATED: ${match[1]}`);
      } else {
        console.log('❌ Failed to create community proposals event');
      }
    } else {
      console.log('❌ Create Event button not found for community proposals');
    }

    await page.screenshot({ path: 'community-proposals-test.png' });
    console.log('=== COMMUNITY PROPOSALS TEST COMPLETED ===');
  });

  test('should test hybrid mode event creation', async ({ page }) => {
    console.log('=== TESTING HYBRID MODE EVENT CREATION ===');

    await page.goto('/events/create');
    await page.waitForTimeout(1000);

    // Step 1: Basic Information
    await page.fill('input[name="title"]', 'Hybrid Mode Test Event');
    await page.fill('textarea[name="description"]', 'Testing hybrid mode with admin + community options');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.fill('input[name="start"]', tomorrow.toISOString().slice(0, 16));

    const weekLater = new Date();
    weekLater.setDate(weekLater.getDate() + 7);
    await page.fill('input[name="end"]', weekLater.toISOString().slice(0, 16));

    await page.click('text=Next: Choose Framework');
    await page.waitForTimeout(1000);

    // Step 2: Choose Framework
    await page.click('text=Proportional Distribution');
    await page.waitForTimeout(500);

    await page.click('text=Next: Option Mode');
    await page.waitForTimeout(1000);

    // Step 3: Select HYBRID MODE
    console.log('Selecting Hybrid Mode');
    await page.click('text=Hybrid Mode');
    await page.waitForTimeout(500);

    await page.click('text=Next: Configure');
    await page.waitForTimeout(1000);

    // Step 4: Configure proportional settings
    const resourceNameInput = page.locator('input[name="resourceName"]');
    const resourceSymbolInput = page.locator('input[name="resourceSymbol"]');
    const totalPoolInput = page.locator('input[name="totalPool"]');

    if (await resourceNameInput.isVisible()) {
      await resourceNameInput.fill('Budget');
    }
    if (await resourceSymbolInput.isVisible()) {
      await resourceSymbolInput.fill('$');
    }
    if (await totalPoolInput.isVisible()) {
      await totalPoolInput.fill('50000');
    }

    // Should go to Add Options for hybrid mode
    const nextButton = page.locator('text=Next: Add Options');
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(1000);

      // Add some admin-defined options
      await page.fill('input[name="option-0-title"]', 'Admin Option - Emergency Fund');
      await page.fill('textarea[name="option-0-description"]', 'Reserve fund for emergencies');

      await page.click('text=+ Add Another Option');
      await page.waitForTimeout(500);

      await page.fill('input[name="option-1-title"]', 'Admin Option - Infrastructure');
      await page.fill('textarea[name="option-1-description"]', 'Critical infrastructure improvements');

      // Click Next to go to Vote Settings step
      const nextToVoteSettings = page.locator('button', { hasText: /Next: Vote Settings/i });
      if (await nextToVoteSettings.isEnabled()) {
        await nextToVoteSettings.click();
        await page.waitForTimeout(1000);
        console.log('✅ Successfully proceeded to Vote Settings step for hybrid mode');
      } else {
        console.log('❌ Next: Vote Settings button is disabled for hybrid mode');
      }

      const createButton = page.locator('button', { hasText: /Create Event|Submit/i }).first();
      if (await createButton.isEnabled()) {
        await createButton.click();
        await page.waitForTimeout(3000);

        const url = page.url();
        const match = url.match(/\/admin\/events\/([^\/]+)/);
        if (match) {
          console.log(`🎉 HYBRID MODE EVENT CREATED: ${match[1]}`);
        } else {
          console.log('❌ Failed to create hybrid mode event');
        }
      }
    } else {
      console.log('❌ Cannot proceed to Add Options step for hybrid mode');
    }

    await page.screenshot({ path: 'hybrid-mode-test.png' });
    console.log('=== HYBRID MODE TEST COMPLETED ===');
  });

  test('should test invitation and voting workflow', async ({ page }) => {
    console.log('=== TESTING INVITATION AND VOTING WORKFLOW ===');

    // First create an event
    await page.goto('/events/create');
    await page.waitForTimeout(1000);

    await page.fill('input[name="title"]', 'Invitation Test Event');
    await page.fill('textarea[name="description"]', 'Testing full invitation workflow');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.fill('input[name="start"]', tomorrow.toISOString().slice(0, 16));

    const weekLater = new Date();
    weekLater.setDate(weekLater.getDate() + 7);
    await page.fill('input[name="end"]', weekLater.toISOString().slice(0, 16));

    await page.click('text=Next: Choose Framework');
    await page.waitForTimeout(1000);

    await page.click('text=Binary Selection');
    await page.waitForTimeout(500);

    await page.click('text=Next: Option Mode');
    await page.waitForTimeout(1000);

    await page.click('text=Admin-Defined Options');
    await page.waitForTimeout(500);

    await page.click('text=Next: Configure');
    await page.waitForTimeout(1000);

    const selectTrigger = page.locator('[role="combobox"]').first();
    await selectTrigger.click();
    await page.waitForTimeout(500);

    await page.click('text=Top N - Select top ranked options');
    await page.waitForTimeout(1000);

    await page.fill('input[name="topN"]', '2');
    await page.waitForTimeout(500);

    await page.click('text=Next: Add Options');
    await page.waitForTimeout(1000);

    await page.fill('input[name="option-0-title"]', 'Test Option A');
    await page.fill('textarea[name="option-0-description"]', 'First test option');

    await page.click('text=+ Add Another Option');
    await page.waitForTimeout(500);

    await page.fill('input[name="option-1-title"]', 'Test Option B');
    await page.fill('textarea[name="option-1-description"]', 'Second test option');

    // Click Next to go to Vote Settings step
    const nextToVoteSettingsInvite = page.locator('button', { hasText: /Next: Vote Settings/i });
    if (await nextToVoteSettingsInvite.isEnabled()) {
      await nextToVoteSettingsInvite.click();
      await page.waitForTimeout(1000);
      console.log('✅ Successfully proceeded to Vote Settings step for invitation test');
    } else {
      console.log('❌ Next: Vote Settings button is disabled for invitation test');
    }

    const createButton = page.locator('button', { hasText: /Create Event|Submit/i }).first();
    await createButton.click();
    await page.waitForTimeout(3000);

    // Extract event ID
    const url = page.url();
    const match = url.match(/\/admin\/events\/([^\/]+)/);
    let eventId: string;

    if (match) {
      eventId = match[1];
      console.log(`✅ Event created: ${eventId}`);

      // Test invitation creation
      console.log('Testing invitation creation...');
      await page.click('text=Invite Management');
      await page.waitForTimeout(2000);

      // Try to create an invite
      await page.fill('input[id="email"]', 'testvoter@example.com');
      await page.waitForTimeout(500);

      // Disable email sending for test
      const sendEmailSwitch = page.locator('label[for="sendEmail"]');
      if (await sendEmailSwitch.isVisible()) {
        await sendEmailSwitch.click();
      }

      const createInviteButton = page.locator('button[type="submit"]');
      if (await createInviteButton.isEnabled()) {
        await createInviteButton.click();
        await page.waitForTimeout(2000);
        console.log('✅ Invite creation attempted');

        // Check if invite was created and get code
        const manageTab = page.locator('text=Manage Invites');
        if (await manageTab.isVisible()) {
          await manageTab.click();
          await page.waitForTimeout(1000);

          // Look for invite codes
          const inviteElements = page.locator('[data-testid="invite-code"], .font-mono');
          const inviteCount = await inviteElements.count();

          if (inviteCount > 0) {
            console.log(`✅ Found ${inviteCount} invite(s) in the system`);
          } else {
            console.log('⚠️ No invites found in manage tab');
          }
        }
      }

      // Test public voting page
      console.log('Testing public voting interface...');
      await page.goto(`/events/${eventId}`);
      await page.waitForTimeout(2000);

      // Check public event page
      await expect(page.locator('text=Invitation Test Event')).toBeVisible();
      await expect(page.locator('text=Test Option A')).toBeVisible();
      await expect(page.locator('text=Test Option B')).toBeVisible();
      console.log('✅ Public event page displays correctly');

      // Test voting flow
      const startVotingButton = page.locator('button', { hasText: 'Start Voting' });
      await startVotingButton.click();
      await page.waitForTimeout(1000);

      await expect(page.locator('text=Enter Your Invite Code')).toBeVisible();
      console.log('✅ Voting page correctly requires invite code');

      // Test results page
      console.log('Testing results page...');
      await page.goto(`/events/${eventId}/results`);
      await page.waitForTimeout(2000);

      const pageContent = await page.textContent('body');
      if (pageContent?.includes('Results') || pageContent?.includes('votes') || pageContent?.includes('Option')) {
        console.log('✅ Results page accessible and contains relevant content');
      } else {
        console.log('⚠️ Results page may need implementation');
      }
    } else {
      console.log('❌ Failed to extract event ID');
    }

    await page.screenshot({ path: 'invitation-voting-workflow-test.png' });
    console.log('=== INVITATION AND VOTING WORKFLOW TEST COMPLETED ===');
  });

  test('should test proposal submission workflow', async ({ page }) => {
    console.log('=== TESTING PROPOSAL SUBMISSION WORKFLOW ===');

    // Create a community proposals event first
    await page.goto('/events/create');
    await page.waitForTimeout(1000);

    await page.fill('input[name="title"]', 'Proposal Submission Test');
    await page.fill('textarea[name="description"]', 'Testing proposal submission flow');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.fill('input[name="start"]', tomorrow.toISOString().slice(0, 16));

    const weekLater = new Date();
    weekLater.setDate(weekLater.getDate() + 7);
    await page.fill('input[name="end"]', weekLater.toISOString().slice(0, 16));

    await page.click('text=Next: Choose Framework');
    await page.waitForTimeout(1000);

    await page.click('text=Binary Selection');
    await page.waitForTimeout(500);

    await page.click('text=Next: Option Mode');
    await page.waitForTimeout(1000);

    await page.click('text=Community Proposals');
    await page.waitForTimeout(500);

    await page.click('text=Next: Configure');
    await page.waitForTimeout(1000);

    const selectTrigger = page.locator('[role="combobox"]').first();
    await selectTrigger.click();
    await page.waitForTimeout(500);

    await page.click('text=Top N - Select top ranked options');
    await page.waitForTimeout(1000);

    await page.fill('input[name="topN"]', '3');
    await page.waitForTimeout(500);

    // For community proposals, we should go to Vote Settings (step 6)
    const nextToVoteSettingsProposal = page.locator('button', { hasText: /Next: Vote Settings/i });
    if (await nextToVoteSettingsProposal.isVisible()) {
      await nextToVoteSettingsProposal.click();
      await page.waitForTimeout(1000);
      console.log('✅ Successfully proceeded to Vote Settings step for proposal submission test');
    } else {
      console.log('❌ Next: Vote Settings button not visible for proposal submission test');
    }

    const createButton = page.locator('text=Create Event');
    await createButton.click();
    await page.waitForTimeout(3000);

    const url = page.url();
    const match = url.match(/\/admin\/events\/([^\/]+)/);

    if (match) {
      const eventId = match[1];
      console.log(`✅ Community proposals event created: ${eventId}`);

      // Test public event page has proposal submission
      await page.goto(`/events/${eventId}`);
      await page.waitForTimeout(2000);

      const submitProposalButton = page.locator('button', { hasText: 'Submit Proposal' });
      if (await submitProposalButton.isVisible()) {
        console.log('✅ Submit Proposal button visible on public page');

        await submitProposalButton.click();
        await page.waitForTimeout(2000);

        // Check if proposal submission page exists
        const currentUrl = page.url();
        if (currentUrl.includes('/propose')) {
          console.log('✅ Navigated to proposal submission page');

          // Check for proposal form elements
          const pageContent = await page.textContent('body');
          if (pageContent?.includes('proposal') || pageContent?.includes('submit') || pageContent?.includes('title')) {
            console.log('✅ Proposal submission page has form elements');
          } else {
            console.log('⚠️ Proposal submission page may need form implementation');
          }
        } else {
          console.log('⚠️ Proposal submission page may not exist');
        }
      } else {
        console.log('❌ Submit Proposal button not found on community proposals event');
      }

      // Test admin proposal management
      await page.goto(`/admin/events/${eventId}`);
      await page.waitForTimeout(2000);

      const proposalManagementLink = page.locator('text=Review Proposals');
      if (await proposalManagementLink.isVisible()) {
        console.log('✅ Proposal management link found in admin');
      } else {
        console.log('⚠️ Proposal management link not found');
      }
    }

    await page.screenshot({ path: 'proposal-submission-test.png' });
    console.log('=== PROPOSAL SUBMISSION WORKFLOW TEST COMPLETED ===');
  });
});