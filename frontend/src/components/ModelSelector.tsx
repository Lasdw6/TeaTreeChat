import React, { useState, useEffect, useRef } from 'react';
import { Model } from '@/types/chat';
import { getModels, DEFAULT_MODEL } from '@/lib/api';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
  className?: string;
  forceUpward?: boolean;
  compact?: boolean;
}

interface GroupedModels {
  [provider: string]: Model[];
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  disabled = false,
  className = '',
  forceUpward = false,
  compact = false,
}) => {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isDetailedView, setIsDetailedView] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'up' | 'down'>('up');
  const [maxDropdownHeight, setMaxDropdownHeight] = useState<number>(600);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Mark when component is mounted on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Only fetch models on the client side to prevent hydration issues
    if (!isMounted) return;
    
    const fetchModels = async () => {
      try {
        setLoading(true);
        const modelsList = await getModels();
        setModels(modelsList);
        
        // If no model is selected, select the default Llama 3.3 70B free model
        if (!selectedModel && modelsList.length > 0) {
          const defaultModel = modelsList.find(model => model.id === DEFAULT_MODEL);
          if (defaultModel) {
            console.log('Setting default model to Llama 3.3 70B free');
            onModelChange(defaultModel.id);
          } else {
            // Fallback to first model if default not found
            console.log('Default model not found, using first available model');
            onModelChange(modelsList[0].id);
          }
        }
      } catch (err) {
        setError('Failed to load models');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, [selectedModel, onModelChange, isMounted]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Group models by provider
  const groupedModels: GroupedModels = models.reduce((groups, model) => {
    let provider = 'Other';
    
    if (model.id.includes('meta-llama')) {
      provider = 'Meta (Llama)';
    } else if (model.id.includes('anthropic')) {
      provider = 'Anthropic (Claude)';
    } else if (model.id.includes('openai')) {
      provider = 'OpenAI (GPT)';
    } else if (model.id.includes('google')) {
      provider = 'Google (Gemini)';
    } else if (model.id.includes('mistralai')) {
      provider = 'Mistral AI';
    } else if (model.id.includes('cohere')) {
      provider = 'Cohere';
    } else if (model.id.includes('deepseek')) {
      provider = 'DeepSeek';
    } else if (model.id.includes('qwen')) {
      provider = 'Alibaba (Qwen)';
    } else if (model.id.includes('microsoft')) {
      provider = 'Microsoft';
    } else if (model.id.includes('perplexity')) {
      provider = 'Perplexity';
    } else if (model.id.includes('x-ai')) {
      provider = 'xAI (Grok)';
    } else if (model.id.includes('liquid')) {
      provider = 'Liquid';
    } else if (model.id.includes('minimax')) {
      provider = 'MiniMax';
    } else if (model.id.includes('nousresearch')) {
      provider = 'Nous Research';
    } else if (model.id.includes('tngtech')) {
      provider = 'TNG Technology';
    } else if (model.id.includes('gryphe') || model.id.includes('thedrummer')) {
      provider = 'Community';
    }
    
    if (!groups[provider]) {
      groups[provider] = [];
    }
    groups[provider].push(model);
    return groups;
  }, {} as GroupedModels);
  
  // Preserve the order from backend by maintaining the order models appear in the original array
  const providerOrder: string[] = [];
  models.forEach(model => {
    let provider = 'Other';
    
    if (model.id.includes('meta-llama')) {
      provider = 'Meta (Llama)';
    } else if (model.id.includes('anthropic')) {
      provider = 'Anthropic (Claude)';
    } else if (model.id.includes('openai')) {
      provider = 'OpenAI (GPT)';
    } else if (model.id.includes('google')) {
      provider = 'Google (Gemini)';
    } else if (model.id.includes('mistralai')) {
      provider = 'Mistral AI';
    } else if (model.id.includes('cohere')) {
      provider = 'Cohere';
    } else if (model.id.includes('deepseek')) {
      provider = 'DeepSeek';
    } else if (model.id.includes('qwen')) {
      provider = 'Alibaba (Qwen)';
    } else if (model.id.includes('microsoft')) {
      provider = 'Microsoft';
    } else if (model.id.includes('perplexity')) {
      provider = 'Perplexity';
    } else if (model.id.includes('x-ai')) {
      provider = 'xAI (Grok)';
    } else if (model.id.includes('liquid')) {
      provider = 'Liquid';
    } else if (model.id.includes('minimax')) {
      provider = 'MiniMax';
    } else if (model.id.includes('nousresearch')) {
      provider = 'Nous Research';
    } else if (model.id.includes('tngtech')) {
      provider = 'TNG Technology';
    } else if (model.id.includes('gryphe') || model.id.includes('thedrummer')) {
      provider = 'Community';
    }
    
    if (!providerOrder.includes(provider)) {
      providerOrder.push(provider);
    }
  });
  
  const sortedProviders = providerOrder;

  const selectedModelData = models.find(model => model.id === selectedModel);
  const showLoading = isMounted && loading;

  const calculateDropdownPosition = () => {
    if (!buttonRef.current) return;
    
    // If forceUpward is true, always position upward
    if (forceUpward) {
      setDropdownPosition('up');
      setMaxDropdownHeight(600);
      return;
    }
    
    const buttonRect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    const spaceBelow = viewportHeight - buttonRect.bottom - 10; // 10px margin
    const spaceAbove = buttonRect.top - 10; // 10px margin
    
    const maxHeightBelow = Math.min(600, spaceBelow);
    const maxHeightAbove = Math.min(600, spaceAbove);
    
    if (spaceBelow >= 400) {
      setDropdownPosition('down');
      setMaxDropdownHeight(Math.min(maxHeightBelow, viewportHeight * 0.85));
    } else if (spaceAbove >= 400) {
      setDropdownPosition('up');
      setMaxDropdownHeight(Math.min(maxHeightAbove, viewportHeight * 0.85));
    } else {
      // If neither space is sufficient, choose the one with more space
      if (spaceBelow > spaceAbove) {
        setDropdownPosition('down');
        setMaxDropdownHeight(Math.min(maxHeightBelow, viewportHeight * 0.85));
      } else {
        setDropdownPosition('up');
        setMaxDropdownHeight(Math.min(maxHeightAbove, viewportHeight * 0.85));
      }
    }
  };

  const handleModelSelect = (modelId: string) => {
    onModelChange(modelId);
    setIsOpen(false);
  };

  const handleToggleDropdown = () => {
    if (!disabled && !showLoading) {
      if (!isOpen) {
        calculateDropdownPosition();
      }
      setIsOpen(!isOpen);
    }
  };

  const getModelBadge = (model: Model) => {
    if (model.id.includes(':free')) {
      return <span className="px-2 py-0.5 text-xs bg-[#5B6F56] text-white rounded-full shadow-sm">FREE</span>;
    }
    
    // Advanced reasoning models
    if (model.id.includes('o3') || model.id.includes('o4') || model.id.includes('deepseek-r1') || model.id.includes('qwq') || model.id.includes(':thinking')) {
      return <span className="px-2 py-0.5 text-xs bg-orange-600 text-white rounded-full shadow-sm">REASONING</span>;
    }
    
    // Premium flagship models
    if (model.id.includes('gpt-4') || model.id.includes('claude-3.5') || model.id.includes('claude-3.7') || model.id.includes('claude-4') || model.id.includes('claude-opus') || model.id.includes('gemini-pro') || model.id.includes('grok-3') || model.id.includes('llama-4') || model.id.includes('hermes-3-405b')) {
      return <span className="px-2 py-0.5 text-xs bg-purple-600 text-white rounded-full shadow-sm">PREMIUM</span>;
    }
    
    // Standard models (no badge for cleaner look)
    return null;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Selected Model Button */}
      <button
        ref={buttonRef}
        onClick={handleToggleDropdown}
        disabled={disabled || showLoading}
        className="w-full h-12 px-4 py-2 bg-[#4E342E]/80 border border-[#D6BFA3]/30 rounded-xl text-[#D6BFA3] focus:outline-none focus:ring-2 focus:ring-[#5B6F56] focus:border-[#5B6F56] transition-all backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between hover:bg-[#4E342E] hover:border-[#5B6F56]/50 hover:shadow-lg hover:shadow-[#5B6F56]/10"
      >
        <div className="flex items-center space-x-2 flex-1 min-w-0">
        {showLoading ? (
            <span className="text-[#D6BFA3]/60">Loading models...</span>
        ) : error ? (
            <span className="text-red-400">Error loading models</span>
          ) : selectedModelData ? (
            <span className="truncate">{selectedModelData.name}</span>
        ) : (
            <span className="text-[#D6BFA3]/60">Select a model</span>
        )}
        </div>
        <svg
          className={`w-4 h-4 text-[#5B6F56] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && !showLoading && !error && (
        <div 
          className={`absolute ${dropdownPosition === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 bg-[#4E342E] border border-[#5B6F56]/30 rounded-xl shadow-2xl shadow-[#5B6F56]/20 z-50 overflow-hidden flex flex-col`}
          style={{
            width: compact 
              ? (isDetailedView ? 'min(500px, 90vw)' : 'min(350px, 90vw)')
              : (isDetailedView ? 'min(1000px, 95vw)' : 'min(600px, 95vw)'),
            maxHeight: `${maxDropdownHeight}px`,
            right: 0
          }}
        >
          {/* Header with model count */}
          <div className="p-4 pb-3 border-b border-[#5B6F56]/20 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#D6BFA3] flex items-center space-x-2">
                  <span>Select AI Model</span>
                  <div className="w-2 h-2 bg-[#5B6F56] rounded-full animate-pulse"></div>
                </h3>
                <p className="text-sm text-[#D6BFA3]/70 mt-1">
                  <span className="text-[#5B6F56] font-medium">{models.length}</span> models available across <span className="text-[#5B6F56] font-medium">{sortedProviders.length}</span> providers
                </p>
              </div>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div 
            className="flex-1 overflow-y-auto p-4 custom-scrollbar" 
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#D6BFA3 #4E342E'
            }}>
            {isDetailedView ? (
              // Detailed View - Original layout with descriptions
              <>
                {sortedProviders.map((provider) => (
                  <div key={provider} className="mb-6 last:mb-0">
                    {/* Provider Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#D6BFA3]/10 to-[#5B6F56]/10 rounded-lg mb-3 border border-[#5B6F56]/20">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#5B6F56] to-[#D6BFA3] rounded-lg flex items-center justify-center shadow-md">
                          <span className="text-white text-sm font-bold">
                            {provider.split('(')[0].trim().charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-base font-semibold text-[#D6BFA3]">{provider}</h4>
                          <p className="text-xs text-[#5B6F56]/80">{groupedModels[provider].length} models</p>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        {groupedModels[provider].some(m => m.id.includes(':free')) && (
                          <span className="px-2 py-1 text-xs bg-[#5B6F56]/20 text-[#5B6F56] rounded-full border border-[#5B6F56]/30 font-medium">
                            Free Available
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Models in this provider - Detailed cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                      {groupedModels[provider].map((model) => (
                        <button
                          key={model.id}
                          onClick={() => handleModelSelect(model.id)}
                          className={`w-full px-4 py-4 text-left rounded-xl transition-all duration-200 border ${
                            selectedModel === model.id 
                              ? 'bg-gradient-to-br from-[#5B6F56] to-[#5B6F56]/90 text-white border-[#5B6F56] shadow-lg shadow-[#5B6F56]/25' 
                              : 'text-[#D6BFA3] border-[#D6BFA3]/30 hover:bg-[#5B6F56]/10 hover:border-[#5B6F56]/50 hover:shadow-md hover:shadow-[#5B6F56]/10'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="font-semibold text-sm leading-tight">{model.name}</span>
                                {getModelBadge(model)}
                              </div>
                              <p className={`text-xs leading-relaxed line-clamp-2 ${
                                selectedModel === model.id ? 'text-white/90' : 'text-[#D6BFA3]/70'
                              }`}>
                                {model.description}
                              </p>
                              <div className="mt-2 flex items-center">
                                <span className={`text-xs px-2 py-1 rounded-full truncate max-w-full ${
                                  selectedModel === model.id 
                                    ? 'bg-white/20 text-white/90' 
                                    : 'bg-[#5B6F56]/20 text-[#5B6F56]/90'
                                }`}>
                                  {model.id}
                                </span>
                              </div>
                            </div>
                            <div className="flex-shrink-0 flex items-center">
                              {selectedModel === model.id && (
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-medium text-white">Selected</span>
                                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              // Summary View - Compact list with just names and providers
              <div className="space-y-3">
                {sortedProviders.map((provider) => (
                  <div key={provider} className="border border-[#5B6F56]/20 rounded-lg overflow-hidden">
                    {/* Provider Header - Compact */}
                    <div className="px-3 py-2 bg-gradient-to-r from-[#D6BFA3]/5 to-[#5B6F56]/5 border-b border-[#5B6F56]/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 bg-gradient-to-br from-[#5B6F56] to-[#D6BFA3] rounded flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {provider.split('(')[0].trim().charAt(0)}
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-[#D6BFA3]">{provider}</h4>
                          <span className="text-xs text-[#5B6F56]/60">({groupedModels[provider].length})</span>
                        </div>
                        {groupedModels[provider].some(m => m.id.includes(':free')) && (
                          <span className="px-2 py-0.5 text-xs bg-[#5B6F56]/20 text-[#5B6F56] rounded-full border border-[#5B6F56]/30">
                            Free
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Models in this provider - Compact list */}
                    <div className="divide-y divide-[#5B6F56]/10">
                      {groupedModels[provider].map((model) => (
                        <button
                          key={model.id}
                          onClick={() => handleModelSelect(model.id)}
                          className={`w-full px-3 py-2 text-left transition-all duration-200 flex items-center justify-between ${
                            selectedModel === model.id 
                              ? 'bg-[#5B6F56] text-white' 
                              : 'text-[#D6BFA3] hover:bg-[#5B6F56]/10'
                          }`}
                        >
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <span className="font-medium text-sm truncate">{model.name}</span>
                            {getModelBadge(model)}
                          </div>
                          {selectedModel === model.id && (
                            <svg className="w-4 h-4 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sticky View Toggle Button - Always visible at bottom */}
          <div className="flex-shrink-0 p-4 pt-3 border-t border-[#5B6F56]/20 bg-[#4E342E] flex justify-center">
            <button
              onClick={() => setIsDetailedView(!isDetailedView)}
              className="flex items-center space-x-2 px-4 py-2 bg-[#D6BFA3]/20 hover:bg-[#D6BFA3]/30 border border-[#D6BFA3]/30 rounded-lg text-[#D6BFA3] text-sm font-medium transition-all hover:shadow-md hover:shadow-[#D6BFA3]/10"
            >
              {isDetailedView ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  <span>Summary View</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>View All Details</span>
                </>
              )}
            </button>
          </div>
      </div>
      )}
    </div>
  );
};

export default ModelSelector; 