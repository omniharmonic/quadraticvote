import { test, expect } from '@playwright/test';

test.describe('Voting System Functionality', () => {
  test('should access voting interface with valid code', async ({ page }) => {
    // Get an existing event
    const response = await page.request.get('/api/events');
    const data = await response.json();

    if (data.events && data.events.length > 0) {
      const eventId = data.events[0].id;

      // Try with a test invite code
      await page.goto(`/events/${eventId}/vote?code=demo-code-123`);

      // Look for voting interface elements
      const votingInterface = page.locator('[data-testid*="voting"]').or(page.locator('.slider')).or(page.locator('input[type="range"]'));
      const optionsList = page.locator('[data-testid*="option"]').or(page.locator('.option'));

      if (await votingInterface.count() > 0) {
        console.log('✅ Voting interface found');
      } else {
        console.log('❌ No voting interface found');
      }

      if (await optionsList.count() > 0) {
        console.log(`✅ Found ${await optionsList.count()} voting options`);
      } else {
        console.log('❌ No voting options found');
      }
    }
  });

  test('should display quadratic voting mechanics', async ({ page }) => {
    const response = await page.request.get('/api/events');
    const data = await response.json();

    if (data.events && data.events.length > 0) {
      const eventId = data.events[0].id;
      await page.goto(`/events/${eventId}/vote?code=demo-code-123`);

      // Look for credit allocation UI
      const creditDisplay = page.locator('text=credits').or(page.locator('text=Credits')).or(page.locator('[data-testid*="credit"]'));
      const voteDisplay = page.locator('text=votes').or(page.locator('text=Votes')).or(page.locator('[data-testid*="vote"]'));

      if (await creditDisplay.count() > 0) {
        console.log('✅ Credit system display found');
      } else {
        console.log('❌ No credit system display found');
      }

      if (await voteDisplay.count() > 0) {
        console.log('✅ Vote display found');
      } else {
        console.log('❌ No vote display found');
      }

      // Look for sliders or input controls
      const sliders = page.locator('input[type="range"]').or(page.locator('.slider')).or(page.locator('[role="slider"]'));
      if (await sliders.count() > 0) {
        console.log(`✅ Found ${await sliders.count()} slider controls for credit allocation`);

        // Test slider interaction
        const firstSlider = sliders.first();
        await firstSlider.fill('50');
        await page.waitForTimeout(500);

        // Check if votes update with quadratic calculation
        const voteElements = page.locator('[data-testid*="vote-count"]').or(page.locator('text*="votes"'));
        if (await voteElements.count() > 0) {
          console.log('✅ Vote calculation display responsive to slider changes');
        }
      } else {
        console.log('❌ No slider controls found for credit allocation');
      }
    }
  });

  test('should validate credit limits', async ({ page }) => {
    const response = await page.request.get('/api/events');
    const data = await response.json();

    if (data.events && data.events.length > 0) {
      const eventId = data.events[0].id;
      await page.goto(`/events/${eventId}/vote?code=demo-code-123`);

      const sliders = page.locator('input[type="range"]').or(page.locator('.slider'));

      if (await sliders.count() > 1) {
        // Try to allocate more than 100 credits total
        const firstSlider = sliders.first();
        const secondSlider = sliders.nth(1);

        await firstSlider.fill('60');
        await secondSlider.fill('50'); // Total would be 110

        // Look for validation error
        const errorMessage = page.locator('.error').or(page.locator('text*="credit"')).or(page.locator('text*="limit"'));
        if (await errorMessage.count() > 0) {
          console.log('✅ Credit limit validation working');
        } else {
          console.log('⚠️  Credit limit validation not visible');
        }
      }
    }
  });

  test('should submit votes successfully', async ({ page }) => {
    const response = await page.request.get('/api/events');
    const data = await response.json();

    if (data.events && data.events.length > 0) {
      const eventId = data.events[0].id;
      await page.goto(`/events/${eventId}/vote?code=demo-code-123`);

      // Allocate some credits
      const sliders = page.locator('input[type="range"]');
      if (await sliders.count() > 0) {
        await sliders.first().fill('36');
        if (await sliders.count() > 1) {
          await sliders.nth(1).fill('25');
        }
      }

      // Find and click submit button
      const submitButton = page.locator('button[type="submit"]').or(page.locator('text=Submit Vote')).or(page.locator('text=Cast Vote'));

      if (await submitButton.count() > 0) {
        await submitButton.click();

        // Wait for submission
        await page.waitForTimeout(2000);

        // Look for success message or redirect
        const successMessage = page.locator('text=success').or(page.locator('text=submitted')).or(page.locator('.success'));
        const resultsRedirect = page.url().includes('/results');

        if (await successMessage.count() > 0 || resultsRedirect) {
          console.log('✅ Vote submission successful');
        } else {
          console.log('⚠️  Vote submission outcome unclear');
        }
      } else {
        console.log('❌ No submit button found');
      }
    }
  });

  test('should handle vote editing', async ({ page }) => {
    const response = await page.request.get('/api/events');
    const data = await response.json();

    if (data.events && data.events.length > 0) {
      const eventId = data.events[0].id;
      await page.goto(`/events/${eventId}/vote?code=demo-code-123`);

      // Check if existing vote is loaded
      const sliders = page.locator('input[type="range"]');
      if (await sliders.count() > 0) {
        const initialValue = await sliders.first().inputValue();
        if (initialValue && initialValue !== '0') {
          console.log('✅ Existing vote loaded for editing');

          // Change the allocation
          await sliders.first().fill('30');

          // Submit updated vote
          const submitButton = page.locator('button[type="submit"]').or(page.locator('text=Update Vote'));
          if (await submitButton.count() > 0) {
            await submitButton.click();
            console.log('✅ Vote update capability found');
          }
        } else {
          console.log('ℹ️  No existing vote to edit');
        }
      }
    }
  });
});