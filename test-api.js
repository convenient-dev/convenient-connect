#!/usr/bin/env node

/**
 * Test script to verify the business services API endpoint
 * Usage: node test-api.js [Bearer_Token]
 */

const LARAVEL_API_URL = 'https://uatservices-backend.theconvenientapp.store/api/v1';
const token = process.argv[2];

if (!token) {
  console.error('Usage: node test-api.js [Bearer_Token]');
  console.error('Example: node test-api.js "1234|abc..."');
  process.exit(1);
}

async function testEndpoint(url, description) {
  console.log(`\n🧪 Testing: ${description}`);
  console.log(`📍 URL: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ Failed: ${data.message || 'Unknown error'}`);
      return;
    }

    const categories = data.data || [];
    console.log(`✅ Success: Received ${categories.length} categories`);

    if (categories.length > 0) {
      console.log(`\n📋 Categories:`);
      categories.forEach((cat, idx) => {
        const subCount = cat.sub_category_list?.length || 0;
        console.log(`  ${idx + 1}. ${cat.category_name} (${subCount} subcategories)`);
      });
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 Testing Business Services API\n');
  console.log('=' .repeat(60));

  // Test 1: No parameters (should return 2)
  await testEndpoint(
    `${LARAVEL_API_URL}/service-provider/business/services`,
    'No parameters (default behavior - expects 2 categories)'
  );

  // Test 2: Empty search
  await testEndpoint(
    `${LARAVEL_API_URL}/service-provider/business/services?search=`,
    'Empty search parameter (expects all categories)'
  );

  // Test 3: With cache buster
  await testEndpoint(
    `${LARAVEL_API_URL}/service-provider/business/services?search=&_t=${Date.now()}`,
    'Empty search + cache buster (expects all categories)'
  );

  console.log('\n' + '='.repeat(60));
  console.log('\n✨ Test complete!\n');
}

main();
