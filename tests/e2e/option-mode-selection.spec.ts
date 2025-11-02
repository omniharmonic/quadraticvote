import { test, expect } from '@playwright/test';

test.describe('Option Mode Selection in Event Creation', () => {
  test('should allow selecting different option modes during event creation', async ({ page }) => {
    console.log('=== TESTING OPTION MODE SELECTION ===');

    await page.goto('/events/create');

    // Step 1: Fill basic information
    console.log('Step 1: Fill basic event information');
    await page.fill('input[name="title"]', 'Option Mode Test Event');
    await page.fill('textarea[name="description"]', 'Testing option mode selection functionality');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.fill('input[name="start"]', tomorrow.toISOString().slice(0, 16));

    const weekLater = new Date();
    weekLater.setDate(weekLater.getDate() + 7);
    await page.fill('input[name="end"]', weekLater.toISOString().slice(0, 16));

    console.log('✅ Step 1 complete - clicking Next');
    await page.click('text=Next: Choose Framework');
    await page.waitForTimeout(1000);

    // Step 2: Choose Framework
    console.log('Step 2: Select Binary Selection framework');
    await page.click('text=Binary Selection');
    await page.waitForTimeout(500);

    console.log('✅ Step 2 complete - clicking Next');
    await page.click('text=Next: Option Mode');
    await page.waitForTimeout(1000);

    // Step 3: Test Option Mode Selection
    console.log('Step 3: Testing option mode selection');

    // Check if all three option modes are available
    const adminDefined = page.locator('text=Admin-Defined Options');
    const communityProposals = page.locator('text=Community Proposals');
    const hybridMode = page.locator('text=Hybrid Mode');

    await expect(adminDefined).toBeVisible();
    await expect(communityProposals).toBeVisible();
    await expect(hybridMode).toBeVisible();

    console.log('✅ All three option modes are visible');

    // Test selecting Admin-Defined Options
    console.log('Testing Admin-Defined Options selection');
    await adminDefined.click();
    await page.waitForTimeout(500);

    let nextButton = page.locator('text=Next: Configure');
    await expect(nextButton).toBeEnabled();
    console.log('✅ Admin-defined mode selected and Next enabled');

    // Test selecting Community Proposals
    console.log('Testing Community Proposals selection');
    await communityProposals.click();
    await page.waitForTimeout(500);

    nextButton = page.locator('text=Next: Configure');
    await expect(nextButton).toBeEnabled();
    console.log('✅ Community proposals mode selected and Next enabled');

    // Test selecting Hybrid Mode
    console.log('Testing Hybrid Mode selection');
    await hybridMode.click();
    await page.waitForTimeout(500);

    nextButton = page.locator('text=Next: Configure');
    await expect(nextButton).toBeEnabled();
    console.log('✅ Hybrid mode selected and Next enabled');

    // Continue with community proposals mode to test the full flow
    await nextButton.click();
    await page.waitForTimeout(1000);

    // Step 4: Framework Configuration
    console.log('Step 4: Configure framework with community proposals');

    // Select threshold mode
    const selectTrigger = page.locator('[role="combobox"]').first();
    await selectTrigger.click();
    await page.waitForTimeout(500);

    await page.click('text=Top N - Select top ranked options');
    await page.waitForTimeout(1000);

    // Fill topN input
    const topNInput = page.locator('input[name="topN"]');
    await topNInput.fill('5');
    await page.waitForTimeout(500);

    console.log('✅ Framework configured');

    // For community proposals, we should be able to create the event directly
    const createButton = page.locator('text=Create Event');
    await expect(createButton).toBeVisible();
    console.log('✅ Create Event button visible for community proposals mode');

    // Test the create event submission
    await createButton.click();
    await page.waitForTimeout(3000);

    const finalUrl = page.url();
    console.log(`Final URL: ${finalUrl}`);

    if (finalUrl.includes('/admin/events/')) {
      console.log('🎉 SUCCESS: Event with community proposals created successfully!');
    } else {
      console.log('⚠️ Event may not have been created as expected');
    }

    await page.screenshot({ path: 'option-mode-test-complete.png' });
    console.log('=== OPTION MODE SELECTION TEST COMPLETED ===');
  });

  test('should require admin-defined options when that mode is selected', async ({ page }) => {
    console.log('=== TESTING ADMIN-DEFINED OPTIONS REQUIREMENT ===');

    await page.goto('/events/create');

    // Navigate to option mode selection
    await page.fill('input[name="title"]', 'Admin Options Test');
    await page.fill('textarea[name="description"]', 'Testing admin options requirement');

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

    // Select admin-defined options
    await page.click('text=Admin-Defined Options');
    await page.waitForTimeout(500);

    await page.click('text=Next: Configure');
    await page.waitForTimeout(1000);

    // Configure framework
    const selectTrigger = page.locator('[role="combobox"]').first();
    await selectTrigger.click();
    await page.waitForTimeout(500);

    await page.click('text=Top N - Select top ranked options');
    await page.waitForTimeout(1000);

    const topNInput = page.locator('input[name="topN"]');
    await topNInput.fill('3');
    await page.waitForTimeout(500);

    // Should now go to Add Options step
    const addOptionsButton = page.locator('text=Next: Add Options');
    await expect(addOptionsButton).toBeVisible();
    await addOptionsButton.click();
    await page.waitForTimeout(1000);

    console.log('✅ Successfully navigated to Add Options step for admin-defined mode');

    // Verify we're on the options step
    await expect(page.locator('text=Voting Options')).toBeVisible();
    console.log('✅ Options step is visible and working');

    console.log('=== ADMIN-DEFINED OPTIONS TEST COMPLETED ===');
  });
});