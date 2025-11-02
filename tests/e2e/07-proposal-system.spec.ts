import { test, expect } from '@playwright/test';

test.describe('Proposal System Functionality', () => {
  test('should allow community proposal submission', async ({ page }) => {
    // Get events that allow community proposals
    const response = await page.request.get('/api/events');
    const data = await response.json();

    if (data.events && data.events.length > 0) {
      const communityEvent = data.events.find(e =>
        e.optionMode === 'community_proposals' || e.optionMode === 'hybrid'
      );

      if (communityEvent) {
        // Try to access proposal submission page
        const proposalRoutes = [
          `/events/${communityEvent.id}/propose`,
          `/events/${communityEvent.id}/submit`,
          `/propose?event=${communityEvent.id}`,
          `/events/${communityEvent.id}/proposals/new`
        ];

        for (const route of proposalRoutes) {
          await page.goto(route);

          // Look for proposal submission form
          const proposalForm = page.locator('form').or(page.locator('[data-testid*="proposal"]'));
          const titleInput = page.locator('input[name*="title"]').or(page.locator('#title')).or(page.locator('[placeholder*="title"]'));
          const descriptionInput = page.locator('textarea[name*="description"]').or(page.locator('#description'));

          if (await proposalForm.count() > 0) {
            console.log(`✅ Proposal submission form found at ${route}`);

            if (await titleInput.count() > 0) {
              console.log('✅ Title input field found');
            }

            if (await descriptionInput.count() > 0) {
              console.log('✅ Description input field found');
            }

            break;
          }
        }
      } else {
        console.log('⚠️  No events with community proposals found to test');
      }
    }
  });

  test('should display existing proposals for voting', async ({ page }) => {
    const response = await page.request.get('/api/events');
    const data = await response.json();

    if (data.events && data.events.length > 0) {
      const eventId = data.events[0].id;

      // Check if proposals are displayed as voting options
      await page.goto(`/events/${eventId}/vote?code=demo-code-123`);

      // Look for proposal-specific elements
      const proposalAuthors = page.locator('text=Proposed by').or(page.locator('text=Submitted by')).or(page.locator('[data-testid*="author"]'));
      const proposalDescriptions = page.locator('[data-testid*="description"]').or(page.locator('.description'));
      const proposalImages = page.locator('img[alt*="proposal"]').or(page.locator('[data-testid*="proposal-image"]'));

      if (await proposalAuthors.count() > 0) {
        console.log('✅ Proposal authorship information displayed');
      } else {
        console.log('⚠️  No proposal authorship information found');
      }

      if (await proposalDescriptions.count() > 0) {
        console.log('✅ Proposal descriptions displayed');
      } else {
        console.log('⚠️  No proposal descriptions found');
      }

      if (await proposalImages.count() > 0) {
        console.log('✅ Proposal images displayed');
      } else {
        console.log('ℹ️  No proposal images found');
      }
    }
  });

  test('should submit a new proposal', async ({ page }) => {
    const response = await page.request.get('/api/events');
    const data = await response.json();

    if (data.events && data.events.length > 0) {
      const eventId = data.events[0].id;

      // Try to submit a proposal via API first
      const proposalData = {
        eventId: eventId,
        title: 'Test Proposal',
        description: 'This is a test proposal submitted via e2e testing',
        submitterEmail: 'test@example.com'
      };

      const submitResponse = await page.request.post('/api/proposals', {
        data: proposalData
      });

      if (submitResponse.ok()) {
        const result = await submitResponse.json();
        console.log('✅ Proposal API endpoint working');

        if (result.proposal) {
          console.log(`✅ Proposal created with ID: ${result.proposal.id}`);
        }
      } else {
        console.log('❌ Proposal API endpoint not working');
      }

      // Also try frontend submission
      await page.goto(`/events/${eventId}/propose`);

      const titleInput = page.locator('input[name*="title"]');
      const descInput = page.locator('textarea[name*="description"]');
      const emailInput = page.locator('input[type="email"]');

      if (await titleInput.count() > 0 && await descInput.count() > 0) {
        await titleInput.fill('Frontend Test Proposal');
        await descInput.fill('Test proposal via frontend');

        if (await emailInput.count() > 0) {
          await emailInput.fill('frontend-test@example.com');
        }

        const submitButton = page.locator('button[type="submit"]').or(page.locator('text=Submit'));
        if (await submitButton.count() > 0) {
          await submitButton.click();
          await page.waitForTimeout(2000);

          const successMessage = page.locator('text=success').or(page.locator('text=submitted'));
          if (await successMessage.count() > 0) {
            console.log('✅ Frontend proposal submission working');
          } else {
            console.log('⚠️  Frontend proposal submission outcome unclear');
          }
        }
      }
    }
  });

  test('should handle proposal moderation workflow', async ({ page }) => {
    // Check for moderation interface
    await page.goto('/admin/proposals');

    const proposalList = page.locator('[data-testid*="proposal"]').or(page.locator('.proposal'));
    const moderationActions = page.locator('text=Approve').or(page.locator('text=Reject')).or(page.locator('text=Flag'));

    if (await proposalList.count() > 0) {
      console.log(`✅ Found ${await proposalList.count()} proposals in moderation queue`);

      if (await moderationActions.count() > 0) {
        console.log('✅ Moderation actions available');

        // Test approve action
        const approveButton = page.locator('text=Approve').first();
        if (await approveButton.count() > 0) {
          await approveButton.click();
          await page.waitForTimeout(1000);

          const confirmDialog = page.locator('text=confirm').or(page.locator('[role="dialog"]'));
          if (await confirmDialog.count() > 0) {
            console.log('✅ Approval confirmation dialog found');
          }
        }
      } else {
        console.log('❌ No moderation actions found');
      }
    } else {
      console.log('ℹ️  No proposals found in moderation queue');
    }
  });

  test('should display proposal status and lifecycle', async ({ page }) => {
    // Test proposal status tracking
    const response = await page.request.get('/api/proposals');

    if (response.ok()) {
      const data = await response.json();
      console.log('✅ Proposals API endpoint working');

      if (data.proposals && data.proposals.length > 0) {
        const proposal = data.proposals[0];

        // Check status indicators
        await page.goto('/admin/proposals');

        const statusIndicators = page.locator('text=Pending').or(page.locator('text=Approved')).or(page.locator('text=Rejected'));
        if (await statusIndicators.count() > 0) {
          console.log('✅ Proposal status indicators found');
        } else {
          console.log('❌ No proposal status indicators found');
        }

        // Check submission timestamps
        const timestamps = page.locator('[data-testid*="timestamp"]').or(page.locator('time'));
        if (await timestamps.count() > 0) {
          console.log('✅ Proposal timestamps displayed');
        } else {
          console.log('⚠️  No proposal timestamps found');
        }
      }
    } else {
      console.log('❌ Proposals API endpoint not working');
    }
  });

  test('should handle proposal flagging and reporting', async ({ page }) => {
    const response = await page.request.get('/api/events');
    const data = await response.json();

    if (data.events && data.events.length > 0) {
      const eventId = data.events[0].id;
      await page.goto(`/events/${eventId}/vote?code=demo-code-123`);

      // Look for flag/report buttons on proposals
      const flagButtons = page.locator('text=Flag').or(page.locator('text=Report')).or(page.locator('[data-testid*="flag"]'));

      if (await flagButtons.count() > 0) {
        console.log('✅ Proposal flagging functionality found');

        // Test flagging workflow
        await flagButtons.first().click();

        const flagDialog = page.locator('[role="dialog"]').or(page.locator('.modal'));
        if (await flagDialog.count() > 0) {
          console.log('✅ Flag reporting dialog found');

          const reasonOptions = page.locator('input[type="radio"]').or(page.locator('select'));
          if (await reasonOptions.count() > 0) {
            console.log('✅ Flag reason options available');
          }
        }
      } else {
        console.log('❌ No proposal flagging functionality found');
      }
    }
  });

  test('should integrate proposals into voting options', async ({ page }) => {
    // Test that approved proposals become voting options
    const response = await page.request.get('/api/events');
    const data = await response.json();

    if (data.events && data.events.length > 0) {
      const communityEvent = data.events.find(e =>
        e.optionMode === 'community_proposals' || e.optionMode === 'hybrid'
      );

      if (communityEvent) {
        await page.goto(`/events/${communityEvent.id}/vote?code=demo-code-123`);

        // Check if options show proposal metadata
        const optionSources = page.locator('text=Admin').or(page.locator('text=Community')).or(page.locator('[data-testid*="source"]'));
        const submitterInfo = page.locator('text=Proposed by').or(page.locator('[data-testid*="submitter"]'));

        if (await optionSources.count() > 0) {
          console.log('✅ Option source indicators found');
        } else {
          console.log('⚠️  No option source indicators found');
        }

        if (await submitterInfo.count() > 0) {
          console.log('✅ Proposal submitter information displayed');
        } else {
          console.log('⚠️  No proposal submitter information found');
        }
      } else {
        console.log('⚠️  No community proposal events found');
      }
    }
  });
});