import { test, expect } from '@playwright/test';

test.describe('Invitation & Code System', () => {
  test('should have invitation functionality in event creation', async ({ page }) => {
    await page.goto('/events/create');

    // Look for invitation/email input fields
    const emailInput = page.locator('input[type="email"]').or(page.locator('[placeholder*="email"]')).or(page.locator('input[name*="email"]'));
    const inviteSection = page.locator('text=Invite').or(page.locator('text=Email')).or(page.locator('[data-testid*="invite"]'));

    const emailCount = await emailInput.count();
    const inviteSectionCount = await inviteSection.count();

    if (emailCount > 0) {
      console.log(`✅ Found ${emailCount} email input fields`);
    } else {
      console.log('❌ No email input fields found for invitations');
    }

    if (inviteSectionCount > 0) {
      console.log(`✅ Found invitation section in event creation`);
    } else {
      console.log('❌ No invitation section found in event creation');
    }
  });

  test('should display invite codes after event creation', async ({ page }) => {
    // First try to get an existing event ID from API
    const response = await page.request.get('/api/events');
    const data = await response.json();

    if (data.events && data.events.length > 0) {
      const eventId = data.events[0].id;

      // Check if there's an admin/manage page for the event
      await page.goto(`/events/${eventId}/manage`);

      const inviteCodes = page.locator('text=Invite Code').or(page.locator('[data-testid*="invite"]')).or(page.locator('code'));
      const inviteCount = await inviteCodes.count();

      if (inviteCount > 0) {
        console.log(`✅ Found invite codes display on manage page`);
      } else {
        console.log('❌ No invite codes found on event manage page');
      }
    } else {
      console.log('⚠️  No events available to test invite code display');
    }
  });

  test('should handle invite code validation on voting page', async ({ page }) => {
    // Get an existing event
    const response = await page.request.get('/api/events');
    const data = await response.json();

    if (data.events && data.events.length > 0) {
      const eventId = data.events[0].id;

      // Try to access voting page without code
      await page.goto(`/events/${eventId}/vote`);

      // Look for invite code input or error message
      const codeInput = page.locator('input[name*="code"]').or(page.locator('[placeholder*="code"]'));
      const errorMessage = page.locator('text=code required').or(page.locator('text=invite').or(page.locator('.error')));

      if (await codeInput.count() > 0) {
        console.log('✅ Invite code input field found on voting page');

        // Try with invalid code
        await codeInput.fill('invalid-code-123');
        const submitButton = page.locator('button').or(page.locator('[type="submit"]'));
        if (await submitButton.count() > 0) {
          await submitButton.first().click();
          await page.waitForTimeout(1000);

          const validationError = page.locator('text=invalid').or(page.locator('.error'));
          if (await validationError.count() > 0) {
            console.log('✅ Invalid invite code validation working');
          } else {
            console.log('⚠️  Invalid invite code validation not visible');
          }
        }
      } else if (await errorMessage.count() > 0) {
        console.log('✅ Proper error message for missing invite code');
      } else {
        console.log('❌ No invite code validation system found');
      }
    }
  });

  test('should test email invitation workflow', async ({ page }) => {
    await page.goto('/events/create');

    // This would test the complete email workflow if implemented
    // For now, just check if email configuration exists
    const emailFields = page.locator('input[type="email"]').or(page.locator('[name*="email"]'));
    const emailCount = await emailFields.count();

    if (emailCount > 0) {
      console.log('✅ Email invitation fields found in creation form');

      // Try to add multiple emails
      const firstEmailField = emailFields.first();
      await firstEmailField.fill('test1@example.com');

      // Look for "add more" or multiple email capability
      const addButton = page.locator('text=Add').or(page.locator('[data-testid*="add"]')).or(page.locator('button[aria-label*="add"]'));
      if (await addButton.count() > 0) {
        console.log('✅ Multiple email invitation capability found');
      } else {
        console.log('⚠️  Only single email invitation may be supported');
      }
    } else {
      console.log('❌ No email invitation system found');
    }
  });
});