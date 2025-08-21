/**
 * Custom hook for agent API calls
 */
import { useApi } from './use-api';
import { useCallback, useState } from 'react';

export interface Agent {
  id: string;
  name: string;
  description: string;
  agent_type: string;
  system_prompt: string;
  configuration: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentList {
  agents: Agent[];
  total: number;
  page: number;
  size: number;
}

export interface Process {
  id: string;
  agent_id: string;
  user_id: string;
  process_type: string;
  current_step: string;
  status: string;
  progress: number;
  total_steps: number;
  completed_steps: number;
  context: Record<string, any>;
  process_metadata: Record<string, any>;
  started_at: string;
  completed_at?: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  process_id: string;
  message_type: string;
  content: string;
  message_metadata: Record<string, any>;
  tool_name?: string;
  tool_input?: Record<string, any>;
  tool_output?: Record<string, any>;
  step_name?: string;
  parent_message_id?: string;
  timestamp: string;
}

export interface ConversationList {
  conversations: Conversation[];
  total: number;
  page: number;
  size: number;
}

export interface MessageCreate {
  content: string;
  message_metadata?: Record<string, any>;
}

export function useAgents() {
  const { makeAuthenticatedRequest } = useApi();
  const [isLoading, setIsLoading] = useState(false);

  // Get all agents
  const getAgents = useCallback(async (): Promise<AgentList | null> => {
    try {
      setIsLoading(true);
      const response = await makeAuthenticatedRequest<AgentList>('/api/v1/agents/');
      
      if (response.error) {
        console.error('Error fetching agents:', response.error);
        return null;
      }
      
      return response.data || null;
    } catch (error) {
      console.error('Error fetching agents:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  // Get a specific agent
  const getAgent = useCallback(async (agentId: string): Promise<Agent | null> => {
    try {
      setIsLoading(true);
      const response = await makeAuthenticatedRequest<Agent>(`/api/v1/agents/${agentId}`);
      
      if (response.error) {
        console.error('Error fetching agent:', response.error);
        return null;
      }
      
      return response.data || null;
    } catch (error) {
      console.error('Error fetching agent:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  // Start a process with an agent
  const startProcess = useCallback(async (
    agentId: string,
    processData: {
      user_id: string;
      process_type: string;
      total_steps: number;
      context?: Record<string, any>;
    }
  ): Promise<Process | null> => {
    try {
      setIsLoading(true);
      const response = await makeAuthenticatedRequest<Process>(
        `/api/v1/agents/${agentId}/start-process`,
        {
          method: 'POST',
          body: JSON.stringify({
            ...processData,
            agent_id: agentId, // Add agent_id to the request body as required by backend
          }),
        }
      );
      
      if (response.error) {
        console.error('Error starting process:', response.error);
        return null;
      }
      
      return response.data || null;
    } catch (error) {
      console.error('Error starting process:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  // Get a specific process
  const getProcess = useCallback(async (processId: string): Promise<Process | null> => {
    try {
      setIsLoading(true);
      const response = await makeAuthenticatedRequest<Process>(
        `/api/v1/agents/processes/${processId}`
      );
      
      if (response.error) {
        console.error('Error fetching process:', response.error);
        return null;
      }
      
      return response.data || null;
    } catch (error) {
      console.error('Error fetching process:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  // Get conversations for a process
  const getConversations = useCallback(async (
    processId: string,
    skip = 0,
    limit = 100
  ): Promise<ConversationList | null> => {
    try {
      setIsLoading(true);
      const response = await makeAuthenticatedRequest<ConversationList>(
        `/api/v1/agents/processes/${processId}/conversations?skip=${skip}&limit=${limit}`
      );
      
      if (response.error) {
        console.error('Error fetching conversations:', response.error);
        return null;
      }
      
      return response.data || null;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  // Add a conversation message
  const addConversation = useCallback(async (
    processId: string,
    messageData: MessageCreate
  ): Promise<Conversation | null> => {
    try {
      setIsLoading(true);
      const response = await makeAuthenticatedRequest<Conversation>(
        `/api/v1/agents/processes/${processId}/conversations`,
        {
          method: 'POST',
          body: JSON.stringify(messageData),
        }
      );
      
      if (response.error) {
        console.error('Error adding conversation:', response.error);
        return null;
      }
      
      return response.data || null;
    } catch (error) {
      console.error('Error adding conversation:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  // Execute a process step
  const executeStep = useCallback(async (
    processId: string,
    stepName: string,
    stepData?: Record<string, any>
  ): Promise<Process | null> => {
    try {
      setIsLoading(true);
      const response = await makeAuthenticatedRequest<Process>(
        `/api/v1/agents/processes/${processId}/execute-step`,
        {
          method: 'POST',
          body: JSON.stringify({
            step_name: stepName,
            step_data: stepData || {},
          }),
        }
      );
      
      if (response.error) {
        console.error('Error executing step:', response.error);
        return null;
      }
      
      return response.data || null;
    } catch (error) {
      console.error('Error executing step:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  return {
    isLoading,
    getAgents,
    getAgent,
    startProcess,
    getProcess,
    getConversations,
    addConversation,
    executeStep,
  };
}
