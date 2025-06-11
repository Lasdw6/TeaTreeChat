import React, { useState, useEffect } from 'react';
import { Model } from '@/types/chat';
import { getModels } from '@/lib/api';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
  className?: string;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  disabled = false,
  className = '',
}) => {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  
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
        
        // If no model is selected, select the first one
        if (!selectedModel && modelsList.length > 0) {
          onModelChange(modelsList[0].id);
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
  
  const handleModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onModelChange(event.target.value);
  };
  
  // Don't show loading state during SSR to prevent hydration mismatch
  const showLoading = isMounted && loading;
  
  return (
    <select
      id="model-selector"
      value={selectedModel}
      onChange={handleModelChange}
      disabled={disabled || showLoading}
      className={`py-1 px-2 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${className}`}
    >
      {showLoading ? (
        <option>Loading models...</option>
      ) : error ? (
        <option>Error loading models</option>
      ) : models.length === 0 ? (
        <option value={selectedModel}>{selectedModel.split('/').pop()}</option>
      ) : (
        models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))
      )}
    </select>
  );
};

export default ModelSelector; 