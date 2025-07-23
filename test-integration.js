/**
 * Simple test script to verify API integration
 * Run this in the browser console on the edit page
 */

// Test API connection
async function testApiConnection() {
  console.log('🧪 Testing API Integration...');
  
  try {
    // Test basic connectivity
    const response = await fetch('http://localhost:8000/api/v1/test');
    const data = await response.json();
    console.log('✅ Basic connectivity:', data);
    
    // Test catalog endpoint (will fail due to auth, but we can see the structure)
    try {
      const catalogResponse = await fetch('http://localhost:8000/api/catalog/products');
      console.log('📦 Catalog endpoint status:', catalogResponse.status);
    } catch (error) {
      console.log('📦 Catalog endpoint (expected auth failure):', error.message);
    }
    
    console.log('🎯 API integration test completed!');
    console.log('📋 Next steps:');
    console.log('1. Start the backend server (uvicorn src.main:app --reload)');
    console.log('2. Set up Clerk authentication');
    console.log('3. Test the edit page with real data');
    
  } catch (error) {
    console.error('❌ API test failed:', error);
    console.log('💡 Make sure the backend server is running on localhost:8000');
  }
}

// Debug PATCH request issue
async function debugPatchRequest() {
  console.log('🔍 Debugging PATCH request issue...');
  
  // Check if there are any network requests being made
  console.log('📡 Checking for network requests...');
  
  // Test the specific endpoint that's causing the 405 error
  try {
    const response = await fetch('http://localhost:8000/api/catalog/products/d75d2d14-2de3-4c8f-99db-413b193dc364', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test: 'data' })
    });
    console.log('🔍 PATCH request status:', response.status);
    console.log('🔍 PATCH request response:', await response.text());
  } catch (error) {
    console.log('🔍 PATCH request error:', error.message);
  }
  
  // Check what methods are allowed
  try {
    const response = await fetch('http://localhost:8000/api/catalog/products/d75d2d14-2de3-4c8f-99db-413b193dc364', {
      method: 'OPTIONS'
    });
    console.log('🔍 Allowed methods:', response.headers.get('Allow'));
  } catch (error) {
    console.log('🔍 OPTIONS request error:', error.message);
  }
}

// Run the tests
testApiConnection();
debugPatchRequest(); 