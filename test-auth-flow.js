// Test script to verify authentication flow
// Run with: node test-auth-flow.js

const baseURL = 'http://localhost:3005';

async function testAPI(endpoint, method = 'GET', body = null, headers = {}) {
  try {
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseURL}${endpoint}`, config);
    const data = await response.json();

    console.log(`\n${method} ${endpoint}:`);
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));

    return { response, data };
  } catch (error) {
    console.error(`Error testing ${endpoint}:`, error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Testing Authentication Flow\n');

  // 1. Test basic API endpoint (should work without auth)
  console.log('=== 1. Testing Public API ===');
  await testAPI('/api/events');

  // 2. Test protected endpoints without auth (should fail)
  console.log('\n=== 2. Testing Protected Endpoints (Should Fail) ===');
  await testAPI('/api/events', 'POST', {
    title: 'Test Event',
    description: 'Test Description',
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 86400000).toISOString(),
    timezone: 'UTC',
    decisionFramework: {
      framework_type: 'binary_selection',
      config: { threshold_mode: 'majority' }
    },
    optionMode: 'admin_defined',
    creditsPerVoter: 100
  });

  await testAPI('/api/proposals/123/approve', 'POST');
  await testAPI('/api/events/123/options', 'POST', { title: 'Test Option' });

  // 3. Test admin invite system
  console.log('\n=== 3. Testing Admin Invite System (Should Fail Without Auth) ===');
  await testAPI('/api/admin/accept-invite', 'POST', { inviteCode: 'test123' });
  await testAPI('/api/events/123/admin-invite', 'POST', { email: 'test@example.com' });

  console.log('\n✅ Authentication tests completed!');
  console.log('\n📝 Expected Results:');
  console.log('- Public API (GET /api/events): ✅ Should work');
  console.log('- Protected APIs without auth: ❌ Should return 401/403');
  console.log('- Admin endpoints without auth: ❌ Should return 401/403');
  console.log('\nNext steps:');
  console.log('1. Sign up a new user at http://localhost:3005/auth/signup');
  console.log('2. Create an event to automatically become admin');
  console.log('3. Test inviting other admins');
  console.log('4. Test admin permissions on events');
}

// Add basic fetch polyfill for Node.js if needed
if (typeof fetch === 'undefined') {
  console.log('Please install node-fetch to run this test:');
  console.log('npm install node-fetch');
  process.exit(1);
}

runTests().catch(console.error);