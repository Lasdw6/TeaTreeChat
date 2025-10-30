import { ChatRequest, ChatResponse, Message, Model, StreamingChunk } from '@/types/chat';
import chatCache from './chatCache';

// Get API URL from environment or default to localhost for development
const getApiBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  
  // In production, ensure we have a valid URL (not localhost)
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    if (!envUrl || envUrl.includes('localhost')) {
      console.error('[API] ERROR: NEXT_PUBLIC_API_URL is not set or points to localhost in production!');
      console.error('[API] Please set NEXT_PUBLIC_API_URL in your Vercel environment variables to your Render backend URL (e.g., https://your-app.onrender.com/api)');
      // Return empty to prevent requests, but don't crash the app
      return '';
    }
  }
  
  return envUrl || 'http://localhost:8000/api';
};

const API_BASE_URL = getApiBaseUrl();

// Log API URL on module load for debugging
if (typeof window !== 'undefined') {
  console.log('[API] API_BASE_URL configured as:', API_BASE_URL);
  console.log('[API] NEXT_PUBLIC_API_URL env var:', process.env.NEXT_PUBLIC_API_URL || '(not set, using default)');
  console.log('[API] Current hostname:', window.location.hostname);
  
  // Warn if using localhost in production
  if (API_BASE_URL.includes('localhost') && window.location.hostname !== 'localhost') {
    console.warn('[API] WARNING: Using localhost API URL in production. This will cause ERR_NAME_NOT_RESOLVED errors.');
  }
}

// Function to ping the server and wake it up if sleeping
export async function pingServer(): Promise<boolean> {
  // Don't ping if API_BASE_URL is invalid (empty string from error above)
  if (!API_BASE_URL) {
    console.error('[API] Cannot ping server: API_BASE_URL is not configured correctly');
    return false;
  }
  
  try {
    const healthUrl = `${API_BASE_URL}/health`;
    console.log('[API] Pinging server at:', healthUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      console.log('Server is awake and responsive');
      return true;
    } else {
      console.warn('Server responded but with error status:', response.status);
      return false;
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[API] Server ping timed out - server may be sleeping');
    } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      const isDnsError = error.message.includes('ERR_NAME_NOT_RESOLVED') || error.message.includes('getaddrinfo ENOTFOUND');
      if (isDnsError) {
        console.error('[API] DNS resolution failed. This usually means:');
        console.error('[API] 1. NEXT_PUBLIC_API_URL is set to an incorrect/invalid URL');
        console.error('[API] 2. The backend hostname does not exist');
        console.error('[API] 3. In Vercel, ensure NEXT_PUBLIC_API_URL is set in Environment Variables');
        console.error('[API] Current API_BASE_URL:', API_BASE_URL);
      } else {
        console.error('[API] Failed to fetch from server. Check:', {
          url: `${API_BASE_URL}/health`,
          error: error.message,
          hint: 'Is the backend server running? Is NEXT_PUBLIC_API_URL correct?'
        });
      }
    } else {
      console.error('[API] Failed to ping server:', error);
    }
    return false;
  }
}

// Function to generate a unique ID for messages
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

// Helper to remove any duplicate content at boundaries of streamed chunks
const removeStreamingDuplicates = (previousContent: string, newContent: string): string => {
  // Skip for very short content
  if (previousContent.length < 5 || newContent.length < 5) return newContent;
  
  // Check for exact duplication
  if (previousContent.endsWith(newContent)) {
    console.log('Removing exact duplicate chunk');
    return '';
  }
  
  // Check for partial overlap at the boundary
  for (let overlapSize = Math.min(previousContent.length, newContent.length) - 1; overlapSize >= 5; overlapSize--) {
    const prevEnd = previousContent.slice(-overlapSize);
    const newStart = newContent.slice(0, overlapSize);
    
    if (prevEnd === newStart) {
      console.log(`Removing overlap of ${overlapSize} chars`);
      return newContent.slice(overlapSize);
    }
  }
  
  return newContent;
};

export async function getModels(forceRefresh = false): Promise<Model[]> {
  // If force refresh is requested, clear cache first
  if (forceRefresh) {
    console.log('Force refresh requested, clearing models cache');
    chatCache.clearModelsCache();
  }

  // First, try to get from cache
  const cachedModels = chatCache.getCachedModels();
  if (cachedModels && !forceRefresh) {
    console.log(`Using ${cachedModels.length} cached models, skipping API call`);
    return cachedModels;
  }

  // If no cache or cache is stale, fetch from API
  console.log(`Fetching models from ${API_BASE_URL}/models`);
  const response = await fetch(`${API_BASE_URL}/models`);
  
  if (!response.ok) {
    console.error(`API error: ${response.status}`);
    throw new Error(`API error: ${response.status}`);
  }
  
  const data = await response.json();
  console.log(`Received ${data.models.length} models from API`);
  
  // Cache the models for future use
  chatCache.cacheModels(data.models);
  
  return data.models;
}

export async function sendChatRequest(request: ChatRequest): Promise<Response> {
  console.log(`Sending chat request to ${API_BASE_URL}/chat with model: ${request.model}`);
  console.log(`Request payload:`, JSON.stringify(request, null, 2).substring(0, 500) + "...");
  
  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    console.log(`Received response with status: ${response.status}`);
    
    if (!response.ok) {
      let errorMessage = `API error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch (e) {
        console.error("Failed to parse error response", e);
      }
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    return response;
  } catch (error) {
    console.error("Network error in sendChatRequest:", error);
    throw error;
  }
}

export async function sendMessage(
  messages: Message[],
  model: string,
  onChunk?: (chunk: StreamingChunk) => void,
): Promise<string> {
  console.log(`Sending message with model: ${model}, streaming: ${!!onChunk}`);
  
  const request: ChatRequest = {
    messages,
    model,
    stream: !!onChunk,
  };
  
  try {
    const response = await sendChatRequest(request);
    
    if (onChunk) {
      // Handle streaming response
      console.log("Processing streaming response");
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let responseText = '';
      
      if (!reader) {
        console.error("Response body is not readable");
        throw new Error('Response body is not readable');
      }
      
      let buffer = '';
      let chunkCount = 0;
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log("Stream reading complete");
          break;
        }
        
        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              console.log("Received [DONE] marker");
              continue;
            }
            
            try {
              chunkCount++;
              const chunk = JSON.parse(data) as StreamingChunk;
              
              // Log first chunk and occasional others
              if (chunkCount <= 2 || chunkCount % 20 === 0) {
                console.log(`Received chunk ${chunkCount}:`, JSON.stringify(chunk).substring(0, 100) + "...");
              }
              
              // Check if chunk has valid structure before calling onChunk
              if (chunk && chunk.choices && Array.isArray(chunk.choices) && chunk.choices.length > 0) {
                // Extract content from chunk safely
                let content = chunk.choices[0]?.delta?.content || '';
                
                if (content) {
                  // Process content to remove duplicates
                  content = removeStreamingDuplicates(responseText, content);
                  
                  if (content) {
                    // Update the content in the chunk
                    if (chunk.choices[0].delta) {
                      chunk.choices[0].delta.content = content;
                    }
                    
                    // Call the callback with the processed chunk
                    onChunk(chunk);
                    
                    // Update response text
                    responseText += content;
                    if (responseText.length <= 100 || responseText.length % 500 === 0) {
                      console.log(`Current response text (${responseText.length} chars):`, 
                        responseText.substring(responseText.length - 50));
                    }
                  } else {
                    // Skip this chunk as it contains only duplicated content
                    console.log('Skipping duplicate chunk');
                  }
                } else {
                  // Call the callback for non-content chunks (like stop reasons)
                  onChunk(chunk);
                }
              } else {
                console.warn('Received malformed chunk:', chunk);
              }
            } catch (error) {
              console.error('Error parsing SSE chunk:', error, 'Raw data:', data);
            }
          }
        }
      }
      
      console.log(`Stream complete, total response length: ${responseText.length}`);
      return responseText;
    } else {
      // Handle regular JSON response
      console.log("Processing non-streaming response");
      const data = await response.json() as ChatResponse;
      const content = data.choices[0]?.message?.content || '';
      console.log(`Received response with ${content.length} characters`);
      return content;
    }
  } catch (error) {
    console.error("Error in sendMessage:", error);
    throw error;
  }
}

export async function registerUser(name: string, email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/user/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Registration failed');
  }
  return response.json();
}

export async function loginUser(email: string, password: string) {
  const params = new URLSearchParams();
  params.append('username', email);
  params.append('password', password);
  const response = await fetch(`${API_BASE_URL}/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Login failed');
  }
  return response.json();
}

export async function getCurrentUser(token: string) {
  const response = await fetch(`${API_BASE_URL}/user/me`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error('Not authenticated');
  }
  return response.json();
}

export async function updateApiKey(apiKey: string, token: string) {
  const response = await fetch(`${API_BASE_URL}/user/me/api_key`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ api_key: apiKey }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to update API key');
  }
  return response.json();
} 