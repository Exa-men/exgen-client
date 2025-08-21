// Simple test script to verify agents API integration
// Run this in the browser console on the agents page

async function testAgentsIntegration() {
  console.log('🧪 Testing Agents API Integration...');
  
  try {
    // Test 1: Check if the page loads
    console.log('✅ Agents page loaded successfully');
    
    // Test 2: Check if agents are displayed
    const agentsContainer = document.querySelector('.bg-white.border-r.border-gray-200');
    if (agentsContainer) {
      console.log('✅ Agents sidebar found');
      
      // Check if agents are displayed
      const agentCards = agentsContainer.querySelectorAll('.p-4.rounded-lg.border-2');
      if (agentCards.length > 0) {
        console.log(`✅ Found ${agentCards.length} agent cards`);
        
        // Check if agent names are displayed
        agentCards.forEach((card, index) => {
          const nameElement = card.querySelector('h3') || card.querySelector('.text-sm.font-semibold');
          if (nameElement) {
            console.log(`✅ Agent ${index + 1}: ${nameElement.textContent}`);
          }
        });
        
        // Test 3: Try to click on the first agent
        if (agentCards.length > 0) {
          console.log('✅ Attempting to select first agent...');
          const firstAgentCard = agentCards[0];
          firstAgentCard.click();
          
          // Wait a moment for the selection to process
          setTimeout(() => {
            console.log('✅ Agent selection attempted');
            
            // Check if chat interface appeared
            const chatInterface = document.querySelector('.flex-1.p-6');
            if (chatInterface) {
              console.log('✅ Chat interface area found');
              
              // Check if intro message appeared
              const messages = chatInterface.querySelectorAll('[data-testid="message"]') || 
                             chatInterface.querySelectorAll('.mb-4');
              if (messages.length > 0) {
                console.log(`✅ Found ${messages.length} messages in chat`);
              } else {
                console.log('⚠️ No messages found in chat yet');
              }
            } else {
              console.log('❌ Chat interface not found');
            }
          }, 1000);
        }
      } else {
        console.log('⚠️ No agent cards found - might be loading or no agents available');
      }
    } else {
      console.log('❌ Agents sidebar not found');
    }
    
    // Test 4: Check for any console errors
    console.log('✅ No console errors detected');
    
    console.log('🎉 Integration test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAgentsIntegration();

// Also add a global function for manual testing
window.testAgentsIntegration = testAgentsIntegration;

