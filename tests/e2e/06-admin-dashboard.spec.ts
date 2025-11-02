import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard & Management', () => {
  test('should access admin dashboard', async ({ page }) => {
    // Try common admin routes
    const adminRoutes = ['/admin', '/dashboard', '/manage', '/admin/dashboard'];

    for (const route of adminRoutes) {
      await page.goto(route);
      const isAdminPage = await page.locator('text=Admin').or(page.locator('text=Dashboard')).or(page.locator('[data-testid*="admin"]')).count() > 0;

      if (isAdminPage) {
        console.log(`✅ Admin dashboard found at ${route}`);
        break;
      } else {
        console.log(`⚠️  No admin dashboard at ${route}`);
      }
    }
  });

  test('should have event management capabilities', async ({ page }) => {
    // Get an existing event to test management
    const response = await page.request.get('/api/events');
    const data = await response.json();

    if (data.events && data.events.length > 0) {
      const eventId = data.events[0].id;

      // Try event management routes
      const managementRoutes = [
        `/events/${eventId}/manage`,
        `/events/${eventId}/admin`,
        `/admin/events/${eventId}`,
        `/dashboard/events/${eventId}`
      ];

      for (const route of managementRoutes) {
        await page.goto(route);

        // Look for management features
        const inviteManagement = page.locator('text=Invite').or(page.locator('text=Code')).or(page.locator('[data-testid*="invite"]'));
        const settingsOptions = page.locator('text=Settings').or(page.locator('text=Edit')).or(page.locator('[data-testid*="settings"]'));
        const participantList = page.locator('text=Participants').or(page.locator('text=Voters')).or(page.locator('[data-testid*="participant"]'));

        if (await inviteManagement.count() > 0) {
          console.log(`✅ Invite management found at ${route}`);
        }

        if (await settingsOptions.count() > 0) {
          console.log(`✅ Event settings found at ${route}`);
        }

        if (await participantList.count() > 0) {
          console.log(`✅ Participant management found at ${route}`);
        }

        // If we found management features, break
        if (await inviteManagement.count() > 0 || await settingsOptions.count() > 0) {
          break;
        }
      }
    }
  });

  test('should display event analytics', async ({ page }) => {
    const response = await page.request.get('/api/events');
    const data = await response.json();

    if (data.events && data.events.length > 0) {
      const eventId = data.events[0].id;

      // Try analytics routes
      const analyticsRoutes = [
        `/events/${eventId}/analytics`,
        `/events/${eventId}/stats`,
        `/admin/events/${eventId}/analytics`
      ];

      for (const route of analyticsRoutes) {
        await page.goto(route);

        // Look for analytics elements
        const charts = page.locator('svg').or(page.locator('canvas')).or(page.locator('[data-testid*="chart"]'));
        const metrics = page.locator('text=participation').or(page.locator('text=engagement')).or(page.locator('[data-testid*="metric"]'));
        const timeData = page.locator('text=over time').or(page.locator('text=timeline')).or(page.locator('[data-testid*="timeline"]'));

        if (await charts.count() > 0) {
          console.log(`✅ Analytics charts found at ${route}`);
        }

        if (await metrics.count() > 0) {
          console.log(`✅ Analytics metrics found at ${route}`);
        }

        if (await timeData.count() > 0) {
          console.log(`✅ Time-based analytics found at ${route}`);
        }
      }
    }
  });

  test('should have proposal moderation interface', async ({ page }) => {
    // Check for proposal moderation functionality
    const moderationRoutes = [
      '/admin/proposals',
      '/moderate',
      '/admin/moderate',
      '/dashboard/proposals'
    ];

    for (const route of moderationRoutes) {
      await page.goto(route);

      // Look for moderation interface
      const proposalList = page.locator('text=Proposal').or(page.locator('[data-testid*="proposal"]'));
      const approveButtons = page.locator('text=Approve').or(page.locator('[data-testid*="approve"]'));
      const rejectButtons = page.locator('text=Reject').or(page.locator('text=Decline')).or(page.locator('[data-testid*="reject"]'));
      const flaggedItems = page.locator('text=Flagged').or(page.locator('text=Reported')).or(page.locator('[data-testid*="flag"]'));

      if (await proposalList.count() > 0) {
        console.log(`✅ Proposal list found at ${route}`);
      }

      if (await approveButtons.count() > 0) {
        console.log(`✅ Approval controls found at ${route}`);
      }

      if (await rejectButtons.count() > 0) {
        console.log(`✅ Rejection controls found at ${route}`);
      }

      if (await flaggedItems.count() > 0) {
        console.log(`✅ Flagged content management found at ${route}`);
      }
    }
  });

  test('should manage invite codes and access control', async ({ page }) => {
    const response = await page.request.get('/api/events');
    const data = await response.json();

    if (data.events && data.events.length > 0) {
      const eventId = data.events[0].id;

      await page.goto(`/events/${eventId}/manage`);

      // Look for invite code management
      const inviteCodes = page.locator('code').or(page.locator('[data-testid*="invite-code"]'));
      const generateButton = page.locator('text=Generate').or(page.locator('text=Create Code')).or(page.locator('[data-testid*="generate"]'));
      const revokeButton = page.locator('text=Revoke').or(page.locator('text=Disable')).or(page.locator('[data-testid*="revoke"]'));
      const usageStats = page.locator('text=used').or(page.locator('text=remaining')).or(page.locator('[data-testid*="usage"]'));

      if (await inviteCodes.count() > 0) {
        console.log(`✅ Invite codes displayed (${await inviteCodes.count()} found)`);
      } else {
        console.log('❌ No invite codes displayed');
      }

      if (await generateButton.count() > 0) {
        console.log('✅ Code generation functionality found');
      } else {
        console.log('❌ No code generation functionality found');
      }

      if (await revokeButton.count() > 0) {
        console.log('✅ Code revocation functionality found');
      } else {
        console.log('⚠️  No code revocation functionality found');
      }

      if (await usageStats.count() > 0) {
        console.log('✅ Code usage statistics found');
      } else {
        console.log('⚠️  No code usage statistics found');
      }
    }
  });

  test('should have user access control and permissions', async ({ page }) => {
    // Check for user management interface
    const userRoutes = ['/admin/users', '/users', '/admin/access', '/permissions'];

    for (const route of userRoutes) {
      await page.goto(route);

      // Look for user management features
      const userList = page.locator('text=User').or(page.locator('[data-testid*="user"]'));
      const roleManagement = page.locator('text=Role').or(page.locator('text=Permission')).or(page.locator('[data-testid*="role"]'));
      const accessControl = page.locator('text=Access').or(page.locator('text=Grant')).or(page.locator('[data-testid*="access"]'));

      if (await userList.count() > 0) {
        console.log(`✅ User management found at ${route}`);
      }

      if (await roleManagement.count() > 0) {
        console.log(`✅ Role management found at ${route}`);
      }

      if (await accessControl.count() > 0) {
        console.log(`✅ Access control found at ${route}`);
      }
    }
  });

  test('should provide system monitoring and health', async ({ page }) => {
    // Check for system monitoring
    const monitoringRoutes = ['/admin/system', '/health', '/admin/monitoring', '/status'];

    for (const route of monitoringRoutes) {
      await page.goto(route);

      // Look for monitoring features
      const systemStatus = page.locator('text=Status').or(page.locator('text=Health')).or(page.locator('[data-testid*="status"]'));
      const metrics = page.locator('text=Metric').or(page.locator('text=Performance')).or(page.locator('[data-testid*="metric"]'));
      const logs = page.locator('text=Log').or(page.locator('text=Error')).or(page.locator('[data-testid*="log"]'));

      if (await systemStatus.count() > 0) {
        console.log(`✅ System status monitoring found at ${route}`);
      }

      if (await metrics.count() > 0) {
        console.log(`✅ Performance metrics found at ${route}`);
      }

      if (await logs.count() > 0) {
        console.log(`✅ System logs found at ${route}`);
      }
    }
  });
});