import { test, expect } from '@playwright/test';

test.describe('Quick Frontend Verification', () => {
  test('should load voting interface elements', async ({ page }) => {
    // Navigate to voting page
    await page.goto('/events/fa818a89-1ff0-43ef-a111-80badb38f9dd/vote?code=demo-code-123');

    // Wait for page to load completely
    await page.waitForTimeout(3000);

    // Take a screenshot for manual inspection
    await page.screenshot({ path: 'test-results/voting-page-screenshot.png', fullPage: true });

    // Check if we're still on loading screen
    const loadingElement = page.locator('text=Loading voting interface');
    const isStillLoading = await loadingElement.count() > 0;
    console.log('Is still loading:', isStillLoading);

    // Check for any error messages
    const errorElements = page.locator('.error, [role="alert"]');
    const errorCount = await errorElements.count();
    console.log('Error elements found:', errorCount);

    // Check for basic voting elements
    const eventTitle = page.locator('h1').first();
    const titleText = await eventTitle.textContent();
    console.log('Event title:', titleText);

    // Check for credit/voting elements
    const creditElements = page.getByText('credit', { matchCase: false });
    const creditCount = await creditElements.count();
    console.log('Credit-related elements found:', creditCount);

    // Check for sliders (core voting mechanism)
    const sliders = page.locator('[role="slider"], input[type="range"], .slider');
    const sliderCount = await sliders.count();
    console.log('Slider elements found:', sliderCount);

    // Check for cards (option containers)
    const cards = page.locator('[class*="card"], .card');
    const cardCount = await cards.count();
    console.log('Card elements found:', cardCount);

    // Check for buttons
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    console.log('Button elements found:', buttonCount);

    // Log page content for debugging
    const bodyText = await page.locator('body').textContent();
    console.log('Page contains "Community Project Selection":', bodyText?.includes('Community Project Selection'));
    console.log('Page contains "credit":', bodyText?.includes('credit'));
    console.log('Page contains "vote":', bodyText?.includes('vote'));
  });

  test('should load event creation page elements', async ({ page }) => {
    await page.goto('/events/create');
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: 'test-results/create-page-screenshot.png', fullPage: true });

    // Check for form elements
    const inputs = page.locator('input, textarea, select');
    const inputCount = await inputs.count();
    console.log('Form input elements found:', inputCount);

    // Check for step indicator
    const stepElements = page.getByText(/step/i);
    const stepCount = await stepElements.count();
    console.log('Step indicator elements found:', stepCount);

    // Check for framework selection
    const binaryElements = page.getByText('Binary', { matchCase: false });
    const proportionalElements = page.getByText('Proportional', { matchCase: false });
    const frameworkCount = await binaryElements.count() + await proportionalElements.count();
    console.log('Framework selection elements found:', frameworkCount);
  });

  test('should load results page elements', async ({ page }) => {
    await page.goto('/events/fa818a89-1ff0-43ef-a111-80badb38f9dd/results');
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: 'test-results/results-page-screenshot.png', fullPage: true });

    // Check for results-specific elements
    const resultElements = page.getByText(/result/i);
    const resultCount = await resultElements.count();
    console.log('Result elements found:', resultCount);

    // Check for vote counts or statistics
    const voteElements = page.getByText(/vote/i);
    const participantElements = page.getByText(/participant/i);
    const statsCount = await voteElements.count() + await participantElements.count();
    console.log('Statistics elements found:', statsCount);
  });
});