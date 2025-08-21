# Agents Page Implementation

This directory contains the frontend implementation for the AI Agents page, designed to work with a LangChain backend.

## Components

### `AgentCard.tsx`
Displays individual agent information with:
- Round profile picture (generated from initials)
- Agent name and description
- Selection state
- Admin configuration gear icon (when applicable)

### `AgentsSidebar.tsx`
Left sidebar containing:
- List of available agents
- Collapsible functionality
- Agent selection
- Admin configuration access

### `ChatInterface.tsx`
Right-side chat interface with:
- Message history display
- User input field
- Loading states
- Auto-scroll to latest messages

### `AgentConfiguration.tsx`
Admin configuration panel for:
- Agent workflow management
- Settings configuration
- Workflow activation/deactivation

### `Avatar.tsx`
Generates colored circular avatars from agent initials with consistent color mapping.

## Features

### User Experience
- **Agent Selection**: Users can select from available agents in the sidebar
- **Auto-Introduction**: Selected agents automatically send introductory messages
- **Chat Interface**: Full-featured chat with message history and typing indicators
- **Responsive Design**: Sidebar can be collapsed for mobile/tablet use

### Admin Features
- **Agent Configuration**: Gear icon on agent cards for admin access
- **Workflow Management**: Add, edit, and configure agent workflows
- **Settings Control**: Toggle various agent behaviors and features

## Backend Integration Points

### API Endpoints Needed
1. **GET /api/agents** - Fetch available agents
2. **POST /api/agents/{id}/chat** - Send message to agent
3. **GET /api/agents/{id}/config** - Get agent configuration
4. **PUT /api/agents/{id}/config** - Update agent configuration
5. **POST /api/agents/{id}/workflows** - Manage agent workflows

### Data Models
```typescript
interface Agent {
  id: string;
  name: string;
  description: string;
  workflows: Workflow[];
  settings: AgentSettings;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  config: any;
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  metadata?: any;
}
```

## LangChain Integration

The frontend is designed to work with LangChain agents that can:
- Process natural language input
- Execute workflows based on user requests
- Maintain conversation context
- Access document databases and external APIs

### Suggested Backend Structure
```
backend/
├── agents/
│   ├── base_agent.py
│   ├── cristine_mardrecht.py
│   ├── paulo_rommes.py
│   └── ronald_boerdrecht.py
├── workflows/
│   ├── document_validation.py
│   ├── content_analysis.py
│   └── quality_assessment.py
└── services/
    ├── chat_service.py
    ├── workflow_service.py
    └── agent_factory.py
```

## Usage

1. **User Flow**: Select agent → Receive intro → Chat with agent
2. **Admin Flow**: Click gear icon → Configure workflows → Save settings
3. **Responsive**: Sidebar collapses on smaller screens

## Styling

Uses Tailwind CSS with a consistent design system:
- Blue primary colors for selection and actions
- Gray scale for backgrounds and borders
- Responsive breakpoints for mobile/desktop
- Smooth transitions and hover effects

## Future Enhancements

- Real-time chat updates via WebSocket
- File upload and document sharing
- Agent performance metrics
- Multi-language support
- Advanced workflow builder interface
