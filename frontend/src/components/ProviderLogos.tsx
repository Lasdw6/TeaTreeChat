import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export const OpenAILogo: React.FC<LogoProps> = ({ size = 24, className = '' }) => (
  <img 
    src="/OpenAI.svg" 
    width={size * 1.2} 
    height={size * 1.2} 
    className={className}
    alt="OpenAI"
  />
);

export const AnthropicLogo: React.FC<LogoProps> = ({ size = 24, className = '' }) => (
  <img 
    src="/Anthropic.svg" 
    width={size} 
    height={size} 
    className={className}
    alt="Anthropic"
  />
);

export const GoogleLogo: React.FC<LogoProps> = ({ size = 24, className = '' }) => (
  <img 
    src="/Google.svg" 
    width={size} 
    height={size} 
    className={className}
    alt="Google"
  />
);

export const MetaLogo: React.FC<LogoProps> = ({ size = 24, className = '' }) => (
  <img 
    src="/Meta.svg" 
    width={size} 
    height={size} 
    className={className}
    alt="Meta"
  />
);

export const DeepSeekLogo: React.FC<LogoProps> = ({ size = 24, className = '' }) => (
  <img 
    src="/Deepseek.svg" 
    width={size} 
    height={size} 
    className={className}
    alt="DeepSeek"
    style={{ filter: 'brightness(0) saturate(100%) invert(30%) sepia(93%) saturate(2463%) hue-rotate(222deg) brightness(96%) contrast(101%)' }}
  />
);

export const MistralLogo: React.FC<LogoProps> = ({ size = 24, className = '' }) => (
  <img 
    src="/Mistral.svg" 
    width={size} 
    height={size} 
    className={className}
    alt="Mistral"
  />
);

export const DefaultProviderLogo: React.FC<LogoProps> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path
      fill="currentColor"
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
    />
  </svg>
);

export const CohereLogo: React.FC<LogoProps> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path
      fill="currentColor"
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
    />
  </svg>
);

export const PerplexityLogo: React.FC<LogoProps> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path
      fill="currentColor"
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
    />
  </svg>
);

export const XAILogo: React.FC<LogoProps> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path
      fill="currentColor"
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
    />
  </svg>
);

export const QwenLogo: React.FC<LogoProps> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path
      fill="currentColor"
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
    />
  </svg>
);

// Helper function to get the appropriate logo component
export const getProviderLogo = (provider: string): React.FC<LogoProps> => {
  const providerName = provider.toLowerCase();
  
  if (providerName.includes('openai') || providerName.includes('gpt')) return OpenAILogo;
  if (providerName.includes('anthropic') || providerName.includes('claude')) return AnthropicLogo;
  if (providerName.includes('google') || providerName.includes('gemini')) return GoogleLogo;
  if (providerName.includes('meta') || providerName.includes('llama')) return MetaLogo;
  if (providerName.includes('deepseek')) return DeepSeekLogo;
  if (providerName.includes('mistral')) return MistralLogo;
  if (providerName.includes('cohere')) return CohereLogo;
  if (providerName.includes('perplexity')) return PerplexityLogo;
  if (providerName.includes('x-ai') || providerName.includes('grok')) return XAILogo;
  if (providerName.includes('qwen') || providerName.includes('alibaba')) return QwenLogo;
  
  return DefaultProviderLogo;
}; 