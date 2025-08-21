"use client";

import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { AdminOnly } from '../../components/RoleGuard';
import AgentsSidebar from './components/AgentsSidebar';
import ChatInterface from './components/ChatInterface';
import AgentConfiguration from './components/AgentConfiguration';
import Prism from './components/Prism';
import { useAgents, Agent, Process, Conversation } from '../../hooks/use-agents';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
}

export default function AgentsPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { getAgents, startProcess, getProcess, addConversation, executeStep, isLoading: apiLoading } = useAgents();
  
  // Real agents data from API
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [currentProcess, setCurrentProcess] = useState<Process | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [currentView, setCurrentView] = useState<'chat' | 'config'>('chat');

  // Load agents on component mount
  useEffect(() => {
    const loadAgents = async () => {
      const agentsData = await getAgents();
      if (agentsData) {
        setAgents(agentsData.agents);
      }
    };
    
    if (isLoaded && isSignedIn) {
      loadAgents();
    }
  }, [isLoaded, isSignedIn, getAgents]);

  // Check if user is admin
  const isAdmin = user?.publicMetadata?.role === 'admin';

  // Handle agent selection
  const handleSelectAgent = async (agentId: string) => {
    if (!user?.id) return;
    
    setSelectedAgentId(agentId);
    setCurrentView('chat');
    setIsConfiguring(false);
    setIsLoading(true);
    
    try {
      // Start a new process with the selected agent
      const process = await startProcess(agentId, {
        user_id: user.id,
        process_type: 'general',
        total_steps: 5,
        context: { step: 'introduction' }
      });
      
      if (process) {
        setCurrentProcess(process);
        
        // Get the selected agent info
        const selectedAgent = agents.find(agent => agent.id === agentId);
        if (selectedAgent) {
          // Show thinking indicator first
          const thinkingMessage: Message = {
            id: Date.now().toString() + '_thinking',
            content: '', // Empty content for thinking state
            sender: 'agent',
            timestamp: new Date()
          };
          setMessages([thinkingMessage]);
          
          // Execute the introduction step to get AI-generated greeting
          try {
            const introProcess = await executeStep(process.id, 'introduction', {
              user_context: 'agent_selection',
              agent_name: selectedAgent.name,
              agent_description: selectedAgent.description
            });
            
            if (introProcess && introProcess.context?.step_introduction?.output) {
              // Replace thinking message with AI-generated greeting
              const aiGreeting = introProcess.context.step_introduction.output;
              const greetingMessage: Message = {
                id: Date.now().toString() + '_greeting',
                content: aiGreeting,
                sender: 'agent',
                timestamp: new Date()
              };
              setMessages([greetingMessage]);
            } else {
              // Fallback to default greeting if AI doesn't respond
              const fallbackMessage: Message = {
                id: Date.now().toString() + '_fallback',
                content: `Hallo! Ik ben ${selectedAgent.name}. Ik ben ${selectedAgent.description.toLowerCase()}. Hoe kan ik u vandaag helpen?`,
                sender: 'agent',
                timestamp: new Date()
              };
              setMessages([fallbackMessage]);
            }
          } catch (error) {
            console.error('Error getting AI greeting:', error);
            // Fallback to default greeting
            const fallbackMessage: Message = {
              id: Date.now().toString() + '_fallback',
              content: `Hallo! Ik ben ${selectedAgent.name}. Ik ben ${selectedAgent.description.toLowerCase()}. Hoe kan ik u vandaag helpen?`,
              sender: 'agent',
              timestamp: new Date()
            };
            setMessages([fallbackMessage]);
          }
        }
      }
    } catch (error) {
      console.error('Error starting process:', error);
      // Fallback to mock message
      const selectedAgent = agents.find(agent => agent.id === agentId);
      if (selectedAgent) {
        const introMessage: Message = {
          id: Date.now().toString(),
          content: `Hallo! Ik ben ${selectedAgent.name}. Ik ben ${selectedAgent.description.toLowerCase()}. Hoe kan ik u vandaag helpen?`,
          sender: 'agent',
          timestamp: new Date()
        };
        setMessages([introMessage]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle agent configuration
  const handleConfigureAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
    setCurrentView('config');
    setIsConfiguring(true);
  };

  // Handle sending messages
  const handleSendMessage = async (messageContent: string) => {
    if (!selectedAgentId || !currentProcess) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageContent,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Add conversation to backend
      const conversation = await addConversation(currentProcess.id, {
        content: messageContent,
        message_metadata: { step: 'user_input' }
      });

      if (conversation) {
        // Execute the next step in the process
        const updatedProcess = await executeStep(currentProcess.id, 'user_feedback', {
          user_message: messageContent,
          context: currentProcess.context
        });

        if (updatedProcess) {
          setCurrentProcess(updatedProcess);
          
          // Debug: Log the entire updated process to see what we're getting
          console.log('Updated process from backend:', updatedProcess);
          console.log('Process context:', updatedProcess.context);
          console.log('Process context keys:', Object.keys(updatedProcess.context || {}));
          
          // Check if the context has the step result
          if (updatedProcess.context && updatedProcess.context.step_user_feedback) {
            // Great! We have the AI response
            const stepResult = updatedProcess.context.step_user_feedback;
            console.log('Step result from backend:', stepResult);
            
            // Extract the AI response
            let aiResponse = 'Ik heb uw vraag verwerkt, maar kon geen antwoord ophalen.';
            
            if (stepResult) {
              if (typeof stepResult === 'string') {
                aiResponse = stepResult;
              } else if (stepResult.output) {
                aiResponse = stepResult.output;
              } else if (stepResult.content) {
                aiResponse = stepResult.content;
              } else {
                console.log('Step result structure:', JSON.stringify(stepResult, null, 2));
                aiResponse = 'AI response received but format unclear.';
              }
            }
            
            console.log('Final extracted AI response:', aiResponse);
            
            // Show the real AI response with enhanced interface
            const agentMessage: Message = {
              id: (Date.now() + 1).toString() + '_typing',
              content: aiResponse,
              sender: 'agent',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, agentMessage]);
          } else {
            // Context doesn't have the step result yet - this suggests a timing issue
            console.log('⚠️ Step result not found in context - this suggests a backend timing issue');
            console.log('Context received:', updatedProcess.context);
            
            // Show a message that we're waiting for the AI response
            const waitingMessage: Message = {
              id: Date.now().toString() + '_waiting',
              content: '🤔 De AI is nog bezig met het verwerken van uw vraag...',
              sender: 'agent',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, waitingMessage]);
            
            // Try to fetch the updated process again after a short delay
            setTimeout(async () => {
              try {
                console.log('🔄 Retrying to fetch updated process...');
                const retryProcess = await getProcess(currentProcess.id);
                if (retryProcess && retryProcess.context?.step_user_feedback) {
                  console.log('✅ Got updated process with AI response!');
                  
                  // Remove waiting message
                  setMessages(prev => prev.filter(msg => msg.id !== waitingMessage.id));
                  
                  // Show the real AI response with enhanced interface
                  const stepResult = retryProcess.context.step_user_feedback;
                  const aiResponse = stepResult.output || 'AI response received';
                  
                  const agentMessage: Message = {
                    id: (Date.now() + 1).toString() + '_typing',
                    content: aiResponse,
                    sender: 'agent',
                    timestamp: new Date()
                  };
                  setMessages(prev => [...prev, agentMessage]);
                }
              } catch (error) {
                console.error('Error retrying process fetch:', error);
              }
            }, 2000); // Wait 2 seconds then retry
          }
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Fallback response
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Ik begrijp uw vraag over "${messageContent}". Er is een technische fout opgetreden, maar ik werk eraan om u te helpen.`,
        sender: 'agent',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, agentMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle configuration save
  const handleSaveConfiguration = (config: any) => {
    console.log('Saving configuration:', config);
    // TODO: Implement API call to save configuration
    setCurrentView('chat');
    setIsConfiguring(false);
  };

  // Handle back from configuration
  const handleBackFromConfig = () => {
    setCurrentView('chat');
    setIsConfiguring(false);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-white/10 backdrop-blur-md rounded-lg p-8 border border-white/20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <div className="text-white/80">Loading authentication...</div>
        </div>
      </div>
    );
  }

  if (isSignedIn && agents.length === 0 && apiLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-white/10 backdrop-blur-md rounded-lg p-8 border border-white/20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <div className="text-white/80">Loading agents...</div>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return null; // Will redirect
  }

  return (
    <AdminOnly
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-md rounded-lg p-8 border border-white/20">
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-white/70">You need admin privileges to access this page.</p>
          </div>
        </div>
      }
    >
      <div className="min-h-screen flex">
        {/* Agents Sidebar */}
        <AgentsSidebar
          agents={agents}
          selectedAgentId={selectedAgentId}
          isAdmin={isAdmin}
          onSelectAgent={handleSelectAgent}
          onConfigureAgent={handleConfigureAgent}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative">
          {/* Prism Background */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <Prism
              animationType="rotate"
              timeScale={0.5}
              height={3.5}
              baseWidth={5.5}
              scale={3.6}
              hueShift={0}
              colorFrequency={1}
              noise={0.5}
              glow={1}
            />
          </div>
          
          {/* Content Area */}
          <div className="flex-1 p-2 pb-0 relative z-10">
            {!selectedAgentId ? (
              // No agent selected
              <div className="h-full flex items-center justify-center">
                <div className="text-center bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
                  <div className="text-6xl mb-4">🤖</div>
                  <h2 className="text-2xl font-semibold text-black mb-2">Selecteer een Ontwikkelaar</h2>
                  <p className="text-white/70">
                    Kies één van de ontwikkelaars om een project te starten.
                  </p>
                </div>
              </div>
            ) : currentView === 'config' ? (
              // Agent configuration view
              <AgentConfiguration
                agentId={selectedAgentId}
                agentName={agents.find(a => a.id === selectedAgentId)?.name || ''}
                onBack={handleBackFromConfig}
                onSave={handleSaveConfiguration}
              />
            ) : (
              // Chat interface view
              <ChatInterface
                agentName={agents.find(a => a.id === selectedAgentId)?.name || ''}
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      </div>
    </AdminOnly>
  );
} 