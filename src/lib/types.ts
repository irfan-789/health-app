export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

export interface AgentState {
  symptoms: string[];
  phase: 'collecting' | 'analyzing' | 'complete';
  turnCount: number;
  retrievedConditions: string[];
}

export interface AgentResponse {
  response: string;
  conversationId: string;
  agentState: AgentState;
}

export type SeverityLevel = 'low' | 'medium' | 'high';
