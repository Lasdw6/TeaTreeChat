import React, { useState, useEffect } from 'react';
import { Model } from '@/types/chat';
import { getModels } from '@/lib/api';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  disabled = false,
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
    <div className="p-4 border-b border-gray-700 bg-gray-800">
      <div className="flex items-center">
        <label htmlFor="model-selector" className="mr-2 text-sm font-medium text-gray-300">
          Model:
        </label>
        <select
          id="model-selector"
          value={selectedModel}
          onChange={handleModelChange}
          disabled={disabled || showLoading}
          className="input py-1 px-2 text-sm bg-gray-700 border-gray-600 text-white"
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
      </div>
    </div>
  );
};

export default ModelSelector; 