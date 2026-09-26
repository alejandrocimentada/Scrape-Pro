// AI providers. format 'anthropic' = Messages API; 'openai' = Chat Completions (used by most providers).
// Shared by background.js (importScripts) and options.html (<script>).
const PROVIDERS = {
  zenmux: {
    label: 'ZenMux (Anthropic-compatible)', format: 'anthropic',
    url: 'https://zenmux.ai/api/anthropic/v1/messages', model: 'anthropic/claude-sonnet-4.5', keyHint: 'sk-ai-v1-…',
    note: 'Copy model IDs from zenmux.ai/models (filter: Anthropic API Compatible).',
  },
  anthropic: {
    label: 'Anthropic (Claude)', format: 'anthropic',
    url: 'https://api.anthropic.com/v1/messages', model: 'claude-sonnet-5', keyHint: 'sk-ant-…',
    note: 'Create a key at console.anthropic.com.',
  },
  openai: {
    label: 'OpenAI', format: 'openai',
    url: 'https://api.openai.com/v1/chat/completions', keyHint: 'sk-…',
    note: 'Create a key at platform.openai.com and copy a model ID from their model list.',
  },
  gemini: {
    label: 'Google Gemini', format: 'openai',
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', keyHint: 'AIza…',
    note: 'Create a key in Google AI Studio.',
  },
  openrouter: {
    label: 'OpenRouter (many models, one key)', format: 'openai',
    url: 'https://openrouter.ai/api/v1/chat/completions', keyHint: 'sk-or-…',
    note: 'Model IDs look like provider/model. See openrouter.ai/models.',
  },
  groq: { label: 'Groq', format: 'openai', url: 'https://api.groq.com/openai/v1/chat/completions', keyHint: 'gsk_…' },
  mistral: { label: 'Mistral', format: 'openai', url: 'https://api.mistral.ai/v1/chat/completions' },
  deepseek: { label: 'DeepSeek', format: 'openai', url: 'https://api.deepseek.com/chat/completions' },
  xai: { label: 'xAI (Grok)', format: 'openai', url: 'https://api.x.ai/v1/chat/completions', keyHint: 'xai-…' },
  ollama: {
    label: 'Ollama (local, free)', format: 'openai', url: 'http://localhost:11434/v1/chat/completions', noKey: true,
    note: 'Runs models on your own computer. Use a model you have pulled. If you get a 403 error, set OLLAMA_ORIGINS=chrome-extension://* and restart Ollama.',
  },
  custom: {
    label: 'Custom (OpenAI-compatible)', format: 'openai',
    note: 'Any server that implements the OpenAI Chat Completions API.',
  },
};
