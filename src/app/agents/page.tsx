"use client";

import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { AdminOnly } from '../../components/RoleGuard';
import AgentsSidebar from './components/AgentsSidebar';
import ChatInterface from './components/ChatInterface';
import AgentConfiguration from './components/AgentConfiguration';

interface Agent {
  id: string;
  name: string;
  description: string;
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
}

export default function AgentsPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  
  // Mock agents data - replace with real data from backend
  const [agents] = useState<Agent[]>([
    {
      id: '1',
      name: 'Cristine Mardrecht',
      description: 'Specialist in het valideren van examenproducten'
    },
    {
      id: '2',
      name: 'Paulo Rommes',
      description: 'Expert in document analyse en kwaliteitscontrole'
    },
    {
      id: '3',
      name: 'Ronald Boerdrecht',
      description: 'Specialist in workflow optimalisatie en validatie'
    }
  ]);

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [currentView, setCurrentView] = useState<'chat' | 'config'>('chat');

  // Check if user is admin
  const isAdmin = user?.publicMetadata?.role === 'admin';

  // Handle agent selection
  const handleSelectAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
    setCurrentView('chat');
    setIsConfiguring(false);
    
    // Send introductory message from the agent
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
  };

  // Handle agent configuration
  const handleConfigureAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
    setCurrentView('config');
    setIsConfiguring(true);
  };

  // Handle sending messages
  const handleSendMessage = async (messageContent: string) => {
    if (!selectedAgentId) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageContent,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Simulate agent response (replace with real API call)
    setTimeout(() => {
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Ik begrijp uw vraag over "${messageContent}". Laat me dit voor u onderzoeken en een passend antwoord geven.`,
        sender: 'agent',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, agentMessage]);
      setIsLoading(false);
    }, 1500);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Loading authentication...</div>
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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600">You need admin privileges to access this page.</p>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-gray-50 flex">
        {/* Agents Sidebar */}
        <AgentsSidebar
          agents={agents}
          selectedAgentId={selectedAgentId}
          isAdmin={isAdmin}
          onSelectAgent={handleSelectAgent}
          onConfigureAgent={handleConfigureAgent}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Content Area */}
          <div className="flex-1 p-6">
            {!selectedAgentId ? (
              // No agent selected
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">🤖</div>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-2">Select an Agent</h2>
                  <p className="text-gray-600">
                    Choose an AI agent from the sidebar to start a conversation
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