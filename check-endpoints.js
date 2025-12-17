// Quick check script to verify if packages/coupons endpoints exist on main backend
// Run with: node check-endpoints.js

const MAIN_BACKEND_URL = process.env.MAIN_BACKEND_URL || 'http://localhost:3000';
const TENANT_ORGANIZATION_ID = process.env.TENANT_ORGANIZATION_ID;

async function checkEndpoint(endpoint, method = 'GET') {
  try {
    const url = `${MAIN_BACKEND_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}organizationId=${TENANT_ORGANIZATION_ID}`;
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(TENANT_ORGANIZATION_ID && { 'X-Organization-Id': TENANT_ORGANIZATION_ID }),
      },
    });
    
    return {
      exists: response.status !== 404,
      status: response.status,
      statusText: response.statusText,
    };
  } catch (error) {
    return {
      exists: false,
      error: error.message,
    };
  }
}

async function main() {
  console.log('Checking if packages and coupons endpoints exist on main backend...\n');
  console.log(`Main Backend URL: ${MAIN_BACKEND_URL}`);
  console.log(`Organization ID: ${TENANT_ORGANIZATION_ID || 'NOT SET'}\n`);
  
  if (!TENANT_ORGANIZATION_ID) {
    console.log('⚠️  TENANT_ORGANIZATION_ID not set. Please set it in your .env file.');
    return;
  }
  
  const endpoints = [
    { path: '/api/packages', method: 'GET', name: 'GET /api/packages' },
    { path: '/api/coupons', method: 'GET', name: 'GET /api/coupons' },
    { path: '/api/packages/redeem', method: 'POST', name: 'POST /api/packages/redeem' },
  ];
  
  for (const endpoint of endpoints) {
    const result = await checkEndpoint(endpoint.path, endpoint.method);
    const status = result.exists ? '✅ EXISTS' : '❌ NOT FOUND';
    console.log(`${status} - ${endpoint.name}`);
    if (!result.exists) {
      console.log(`   Status: ${result.status || 'ERROR'} - ${result.error || result.statusText || ''}`);
    }
  }
}

main().catch(console.error);
