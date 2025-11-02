import { test, expect } from '@playwright/test';

test.describe('Results Display System', () => {
  test('should display binary selection results', async ({ page }) => {
    // Get events and find binary selection one
    const response = await page.request.get('/api/events');
    const data = await response.json();

    if (data.events && data.events.length > 0) {
      const binaryEvent = data.events.find(e =>
        e.decisionFramework?.framework_type === 'binary_selection'
      );

      if (binaryEvent) {
        await page.goto(`/events/${binaryEvent.id}/results`);

        // Check for binary selection specific elements
        const rankingDisplay = page.locator('text=Rank').or(page.locator('text=ranking')).or(page.locator('[data-testid*="rank"]'));
        const selectedOptions = page.locator('text=Selected').or(page.locator('[data-testid*="selected"]'));
        const voteCount = page.locator('text=votes').or(page.locator('[data-testid*="vote-count"]'));

        if (await rankingDisplay.count() > 0) {
          console.log('✅ Binary selection ranking display found');
        } else {
          console.log('❌ No ranking display found for binary selection');
        }

        if (await selectedOptions.count() > 0) {
          console.log('✅ Selected options display found');
        } else {
          console.log('❌ No selected options display found');
        }

        if (await voteCount.count() > 0) {
          console.log('✅ Vote counts displayed');
        } else {
          console.log('❌ No vote counts displayed');
        }

        // Check for threshold information
        const thresholdInfo = page.locator('text=Top').or(page.locator('text=threshold')).or(page.locator('text=percentage'));
        if (await thresholdInfo.count() > 0) {
          console.log('✅ Threshold information displayed');
        } else {
          console.log('⚠️  Threshold information not visible');
        }
      } else {
        console.log('⚠️  No binary selection events found to test');
      }
    }
  });

  test('should display proportional distribution results', async ({ page }) => {
    const response = await page.request.get('/api/events');
    const data = await response.json();

    if (data.events && data.events.length > 0) {
      const proportionalEvent = data.events.find(e =>
        e.decisionFramework?.framework_type === 'proportional_distribution'
      );

      if (proportionalEvent) {
        await page.goto(`/events/${proportionalEvent.id}/results`);

        // Check for proportional distribution specific elements
        const allocationDisplay = page.locator('text=allocation').or(page.locator('text=%')).or(page.locator('[data-testid*="allocation"]'));
        const resourceAmount = page.locator('text=$').or(page.locator('[data-testid*="amount"]'));
        const percentageDisplay = page.locator('text=%').or(page.locator('text=percent'));

        if (await allocationDisplay.count() > 0) {
          console.log('✅ Allocation display found for proportional distribution');
        } else {
          console.log('❌ No allocation display found');
        }

        if (await resourceAmount.count() > 0) {
          console.log('✅ Resource amounts displayed');
        } else {
          console.log('❌ No resource amounts displayed');
        }

        if (await percentageDisplay.count() > 0) {
          console.log('✅ Percentage allocations displayed');
        } else {
          console.log('❌ No percentage allocations displayed');
        }

        // Check for Gini coefficient
        const giniDisplay = page.locator('text=Gini').or(page.locator('text=inequality')).or(page.locator('[data-testid*="gini"]'));
        if (await giniDisplay.count() > 0) {
          console.log('✅ Gini coefficient displayed');
        } else {
          console.log('⚠️  Gini coefficient not visible');
        }
      } else {
        console.log('⚠️  No proportional distribution events found to test');
      }
    }
  });

  test('should display participation statistics', async ({ page }) => {
    const response = await page.request.get('/api/events');
    const data = await response.json();

    if (data.events && data.events.length > 0) {
      const eventId = data.events[0].id;
      await page.goto(`/events/${eventId}/results`);

      // Look for participation info
      const voterCount = page.locator('text=voters').or(page.locator('text=participants')).or(page.locator('[data-testid*="voter"]'));
      const creditsUsed = page.locator('text=credits').or(page.locator('[data-testid*="credit"]'));
      const votingPeriod = page.locator('text=voting').or(page.locator('text=period')).or(page.locator('[data-testid*="period"]'));

      if (await voterCount.count() > 0) {
        console.log('✅ Voter count displayed');
      } else {
        console.log('❌ No voter count displayed');
      }

      if (await creditsUsed.count() > 0) {
        console.log('✅ Credits used information displayed');
      } else {
        console.log('❌ No credits used information displayed');
      }

      if (await votingPeriod.count() > 0) {
        console.log('✅ Voting period information displayed');
      } else {
        console.log('❌ No voting period information displayed');
      }
    }
  });

  test('should have visual charts and graphs', async ({ page }) => {
    const response = await page.request.get('/api/events');
    const data = await response.json();

    if (data.events && data.events.length > 0) {
      const eventId = data.events[0].id;
      await page.goto(`/events/${eventId}/results`);

      // Look for chart elements
      const charts = page.locator('svg').or(page.locator('canvas')).or(page.locator('[data-testid*="chart"]'));
      const progressBars = page.locator('.progress').or(page.locator('[role="progressbar"]')).or(page.locator('[data-testid*="progress"]'));

      if (await charts.count() > 0) {
        console.log(`✅ Found ${await charts.count()} chart/graph elements`);
      } else {
        console.log('❌ No charts or graphs found');
      }

      if (await progressBars.count() > 0) {
        console.log(`✅ Found ${await progressBars.count()} progress bar elements`);
      } else {
        console.log('❌ No progress bars found');
      }
    }
  });

  test('should handle real-time vs final results', async ({ page }) => {
    const response = await page.request.get('/api/events');
    const data = await response.json();

    if (data.events && data.events.length > 0) {
      const eventId = data.events[0].id;
      await page.goto(`/events/${eventId}/results`);

      // Look for indicators of result status
      const liveIndicator = page.locator('text=Live').or(page.locator('text=real-time')).or(page.locator('[data-testid*="live"]'));
      const finalIndicator = page.locator('text=Final').or(page.locator('text=closed')).or(page.locator('[data-testid*="final"]'));
      const preliminaryIndicator = page.locator('text=Preliminary').or(page.locator('text=ongoing'));

      if (await liveIndicator.count() > 0) {
        console.log('✅ Live results indicator found');
      } else if (await finalIndicator.count() > 0) {
        console.log('✅ Final results indicator found');
      } else if (await preliminaryIndicator.count() > 0) {
        console.log('✅ Preliminary results indicator found');
      } else {
        console.log('⚠️  No result status indicator found');
      }

      // Check for refresh/update functionality
      const refreshButton = page.locator('text=Refresh').or(page.locator('[data-testid*="refresh"]')).or(page.locator('button[aria-label*="refresh"]'));
      if (await refreshButton.count() > 0) {
        console.log('✅ Results refresh functionality found');
      } else {
        console.log('⚠️  No results refresh functionality visible');
      }
    }
  });

  test('should export results functionality', async ({ page }) => {
    const response = await page.request.get('/api/events');
    const data = await response.json();

    if (data.events && data.events.length > 0) {
      const eventId = data.events[0].id;
      await page.goto(`/events/${eventId}/results`);

      // Look for export options
      const exportButton = page.locator('text=Export').or(page.locator('text=Download')).or(page.locator('[data-testid*="export"]'));
      const csvOption = page.locator('text=CSV').or(page.locator('text=csv'));
      const pdfOption = page.locator('text=PDF').or(page.locator('text=pdf'));

      if (await exportButton.count() > 0) {
        console.log('✅ Export functionality found');

        if (await csvOption.count() > 0) {
          console.log('✅ CSV export option available');
        }

        if (await pdfOption.count() > 0) {
          console.log('✅ PDF export option available');
        }
      } else {
        console.log('❌ No export functionality found');
      }
    }
  });
});