import { Chat, Model } from '@/types/chat';

const CACHE_KEY = 'teatree_recent_chats';
const MODELS_CACHE_KEY = 'teatree_models_cache';
const MAX_CACHED_CHATS = 10;

interface CachedChat extends Chat {
  lastAccessed: number;
  messages?: any[]; // Cache messages for quick loading
}

interface ChatCache {
  chats: CachedChat[];
  lastUpdated: number;
}

interface ModelsCache {
  models: Model[];
  lastUpdated: number;
}

class ChatCacheManager {
  private cache: ChatCache = {
    chats: [],
    lastUpdated: 0
  };

  private modelsCache: ModelsCache = {
    models: [],
    lastUpdated: 0
  };

  constructor() {
    this.loadFromStorage();
    this.loadModelsFromStorage();
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
    // Deduplicate chats by ID first
    const uniqueChats = chats.filter((chat, index, array) => 
      array.findIndex(c => c.id === chat.id) === index
    );
    
    // Sort by most recent and take top cached chats
    const sortedChats = [...uniqueChats]
      .sort((a, b) => {
        const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : new Date(a.created_at).getTime();
        const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : new Date(b.created_at).getTime();
        return dateB - dateA;
      })
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
    // Check if chat already exists
    const existingIndex = this.cache.chats.findIndex(c => c.id === chat.id);
    if (existingIndex !== -1) {
      // Update existing chat and move to front
      this.cache.chats[existingIndex] = {
        ...chat,
        lastAccessed: Date.now(),
        messages: this.cache.chats[existingIndex].messages // Preserve messages
      };
      // Move to front
      const updatedChat = this.cache.chats.splice(existingIndex, 1)[0];
      this.cache.chats.unshift(updatedChat);
    } else {
      // Add new chat to the beginning
      const cachedChat: CachedChat = {
        ...chat,
        lastAccessed: Date.now()
      };
      this.cache.chats.unshift(cachedChat);
    }
    
    // Keep only top cached chats
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

  public getAllCacheInfo(): { 
    chats: { count: number; lastUpdated: Date | null };
    models: { count: number; lastUpdated: Date | null };
  } {
    return {
      chats: this.getCacheInfo(),
      models: this.getModelsCacheInfo()
    };
  }

  public isChatCached(chatId: number): boolean {
    return this.cache.chats.some(chat => chat.id === chatId && chat.messages);
  }

  public isChatCacheFresh(chatId: number, maxAgeMinutes: number = 5): boolean {
    const chat = this.cache.chats.find(c => c.id === chatId);
    if (!chat || !chat.messages) return false;
    
    const ageInMinutes = (Date.now() - chat.lastAccessed) / (1000 * 60);
    return ageInMinutes < maxAgeMinutes;
  }

  public shouldRefreshChat(chatId: number): boolean {
    return !this.isChatCached(chatId) || !this.isChatCacheFresh(chatId);
  }

  // Models cache methods
  private loadModelsFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(MODELS_CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only load if cache is less than 24 hours old (models don't change often)
        if (Date.now() - parsed.lastUpdated < 86400000) {
          this.modelsCache = parsed;
        }
      }
    } catch (error) {
      console.error('Failed to load models cache:', error);
      this.clearModelsCache();
    }
  }

  private saveModelsToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(MODELS_CACHE_KEY, JSON.stringify(this.modelsCache));
    } catch (error) {
      console.error('Failed to save models cache:', error);
    }
  }

  public getCachedModels(): Model[] | null {
    // Return cached models if they're less than 24 hours old
    if (this.modelsCache.models.length > 0 && 
        (Date.now() - this.modelsCache.lastUpdated < 86400000)) {
      console.log('Using cached models');
      return this.modelsCache.models;
    }
    return null;
  }

  public cacheModels(models: Model[]): void {
    console.log(`Caching ${models.length} models`);
    this.modelsCache = {
      models,
      lastUpdated: Date.now()
    };
    this.saveModelsToStorage();
  }

  public hasValidModelsCache(): boolean {
    return this.modelsCache.models.length > 0 && 
           (Date.now() - this.modelsCache.lastUpdated < 86400000);
  }

  public clearModelsCache(): void {
    this.modelsCache = {
      models: [],
      lastUpdated: 0
    };
    if (typeof window !== 'undefined') {
      localStorage.removeItem(MODELS_CACHE_KEY);
    }
  }

  public getModelsCacheInfo(): { count: number; lastUpdated: Date | null } {
    return {
      count: this.modelsCache.models.length,
      lastUpdated: this.modelsCache.lastUpdated ? new Date(this.modelsCache.lastUpdated) : null
    };
  }

  // Clear all cache data - useful for logout and account deletion
  public clearAllCache(): void {
    this.clearCache();
    this.clearModelsCache();
    console.log('All cache cleared');
  }
}

// Export singleton instance
export const chatCache = new ChatCacheManager();
export default chatCache; 