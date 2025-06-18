export type Role = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt?: Date;
  regeneration_id?: string;
  model?: string;
}

export interface ChatRequest {
  messages: Message[];
  model: string;
  stream: boolean;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  choices: {
    index: number;
    message: {
      role: Role;
      content: string;
    };
    finish_reason: string;
  }[];
}

export interface StreamingChunk {
  id: string;
  model: string;
  object: string;
  created: number;
  choices: {
    index: number;
    delta: {
      content?: string;
      role?: Role;
    };
    finish_reason: string | null;
  }[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Model {
  id: string;
  name: string;
  description: string;
}

export interface Chat {
  id: number;
  title: string;
  created_at: string;
  message_count: number;
  last_message: string | null;
} 