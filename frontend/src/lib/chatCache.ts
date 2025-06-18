import { Chat } from '@/types/chat';

const CACHE_KEY = 'teatree_recent_chats';
const MAX_CACHED_CHATS = 5;

interface CachedChat extends Chat {
  lastAccessed: number;
  messages?: any[]; // Cache messages for quick loading
}

interface ChatCache {
  chats: CachedChat[];
  lastUpdated: number;
}

class ChatCacheManager {
  private cache: ChatCache = {
    chats: [],
    lastUpdated: 0
  };

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only load if cache is less than 1 hour old
        if (Date.now() - parsed.lastUpdated < 3600000) {
          this.cache = parsed;
        }
      }
    } catch (error) {
      console.error('Failed to load chat cache:', error);
      this.clearCache();
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(this.cache));
    } catch (error) {
      console.error('Failed to save chat cache:', error);
    }
  }

  public updateChats(chats: Chat[]): void {
    // Sort by most recent and take top 5
    const sortedChats = [...chats]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, MAX_CACHED_CHATS);

    // Update cache with new data, preserving messages if they exist
    this.cache.chats = sortedChats.map(chat => {
      const existing = this.cache.chats.find(c => c.id === chat.id);
      return {
        ...chat,
        lastAccessed: existing?.lastAccessed || Date.now(),
        messages: existing?.messages || undefined
      };
    });

    this.cache.lastUpdated = Date.now();
    this.saveToStorage();
  }

  public getCachedChats(): Chat[] {
    return this.cache.chats.map(({ lastAccessed, messages, ...chat }) => chat);
  }

  public getCachedChatWithMessages(chatId: number): CachedChat | null {
    return this.cache.chats.find(chat => chat.id === chatId) || null;
  }

  public cacheMessages(chatId: number, messages: any[]): void {
    const chatIndex = this.cache.chats.findIndex(chat => chat.id === chatId);
    if (chatIndex !== -1) {
      this.cache.chats[chatIndex].messages = messages;
      this.cache.chats[chatIndex].lastAccessed = Date.now();
      this.saveToStorage();
    }
  }

  public markAsAccessed(chatId: number): void {
    const chat = this.cache.chats.find(c => c.id === chatId);
    if (chat) {
      chat.lastAccessed = Date.now();
      this.saveToStorage();
    }
  }

  public addNewChat(chat: Chat): void {
    // Add new chat to the beginning
    const cachedChat: CachedChat = {
      ...chat,
      lastAccessed: Date.now()
    };

    this.cache.chats.unshift(cachedChat);
    
    // Keep only top 5
    if (this.cache.chats.length > MAX_CACHED_CHATS) {
      this.cache.chats = this.cache.chats.slice(0, MAX_CACHED_CHATS);
    }

    this.cache.lastUpdated = Date.now();
    this.saveToStorage();
  }

  public removeChat(chatId: number): void {
    this.cache.chats = this.cache.chats.filter(chat => chat.id !== chatId);
    this.cache.lastUpdated = Date.now();
    this.saveToStorage();
  }

  public updateChatTitle(chatId: number, newTitle: string): void {
    const chat = this.cache.chats.find(c => c.id === chatId);
    if (chat) {
      chat.title = newTitle;
      chat.lastAccessed = Date.now();
      this.cache.lastUpdated = Date.now();
      this.saveToStorage();
    }
  }

  public hasCachedData(): boolean {
    return this.cache.chats.length > 0 && (Date.now() - this.cache.lastUpdated < 3600000);
  }

  public clearCache(): void {
    this.cache = {
      chats: [],
      lastUpdated: 0
    };
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CACHE_KEY);
    }
  }

  public getCacheInfo(): { count: number; lastUpdated: Date | null } {
    return {
      count: this.cache.chats.length,
      lastUpdated: this.cache.lastUpdated ? new Date(this.cache.lastUpdated) : null
    };
  }
}

// Export singleton instance
export const chatCache = new ChatCacheManager();
export default chatCache; 