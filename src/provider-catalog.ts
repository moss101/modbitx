/**
 * Generated from the models.dev catalog that opencode uses, by scripts/build-provider-catalog.cjs.
 * Each entry speaks the OpenAI chat-completions API at `api`. Providers marked with a note
 * reach that surface through the vendor's OpenAI-compatible endpoint.
 */
export interface CatalogModel {
  id: string;
  name: string;
}

export interface CatalogProvider {
  id: string;
  name: string;
  /** Key variables this provider reads, the first one preferred. */
  env: string[];
  api: string;
  models: CatalogModel[];
  note: string;
  local: boolean;
}

export const PROVIDER_CATALOG: CatalogProvider[] = [
  {
    "id": "openai",
    "name": "OpenAI",
    "env": [
      "OPENAI_API_KEY"
    ],
    "api": "https://api.openai.com/v1",
    "models": [
      {
        "id": "gpt-6.1-sol",
        "name": "GPT-6.1 Sol"
      },
      {
        "id": "gpt-6-luna",
        "name": "GPT-6 Luna"
      },
      {
        "id": "gpt-6-sol",
        "name": "GPT-6 Sol"
      },
      {
        "id": "gpt-6-astra",
        "name": "GPT-6 Astra"
      },
      {
        "id": "gpt-daybreak-blue-latest",
        "name": "Daybreak Blue"
      },
      {
        "id": "gpt-daybreak-red-latest",
        "name": "Daybreak Red"
      },
      {
        "id": "gpt-5.6",
        "name": "GPT-5.6"
      },
      {
        "id": "gpt-5.6-luna",
        "name": "GPT-5.6 Luna"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "anthropic",
    "name": "Anthropic",
    "env": [
      "ANTHROPIC_API_KEY"
    ],
    "api": "https://api.anthropic.com/v1",
    "models": [
      {
        "id": "claude-sonnet-5-5",
        "name": "Claude Sonnet 5.5"
      },
      {
        "id": "claude-opus-5-5",
        "name": "Claude Opus 5.5"
      },
      {
        "id": "claude-fable-5-1",
        "name": "Claude Fable 5.1"
      },
      {
        "id": "claude-opus-5",
        "name": "Claude Opus 5"
      },
      {
        "id": "claude-sonnet-5",
        "name": "Claude Sonnet 5"
      },
      {
        "id": "claude-fable-5",
        "name": "Claude Fable 5"
      },
      {
        "id": "claude-opus-4-8",
        "name": "Claude Opus 4.8"
      },
      {
        "id": "claude-opus-4-7",
        "name": "Claude Opus 4.7"
      }
    ],
    "note": "OpenAI-compatible endpoint",
    "local": false
  },
  {
    "id": "google",
    "name": "Google Gemini",
    "env": [
      "GOOGLE_API_KEY",
      "GOOGLE_GENERATIVE_AI_API_KEY"
    ],
    "api": "https://generativelanguage.googleapis.com/v1beta/openai",
    "models": [
      {
        "id": "gemini-3.8-flash",
        "name": "Gemini 3.8 Flash"
      },
      {
        "id": "gemini-3.7-flash",
        "name": "Gemini 3.7 Flash"
      },
      {
        "id": "gemini-flash-latest",
        "name": "Gemini Flash Latest"
      },
      {
        "id": "gemini-3.5-flash-lite",
        "name": "Gemini 3.5 Flash Lite"
      },
      {
        "id": "gemini-3.6-flash",
        "name": "Gemini 3.6 Flash"
      },
      {
        "id": "gemini-flash-lite-latest",
        "name": "Gemini Flash-Lite Latest"
      },
      {
        "id": "gemini-3.5-flash",
        "name": "Gemini 3.5 Flash"
      },
      {
        "id": "gemini-3.1-flash-lite",
        "name": "Gemini 3.1 Flash Lite"
      }
    ],
    "note": "OpenAI-compatible endpoint",
    "local": false
  },
  {
    "id": "xai",
    "name": "xAI (Grok)",
    "env": [
      "XAI_API_KEY"
    ],
    "api": "https://api.x.ai/v1",
    "models": [
      {
        "id": "grok-4.7",
        "name": "Grok 4.7"
      },
      {
        "id": "grok-4.6",
        "name": "Grok 4.6"
      },
      {
        "id": "grok-4.5",
        "name": "Grok 4.5"
      },
      {
        "id": "grok-4.3",
        "name": "Grok 4.3"
      },
      {
        "id": "grok-build-0.1",
        "name": "Grok Build 0.1"
      },
      {
        "id": "grok-4.20-0309-reasoning",
        "name": "Grok 4.20 (Reasoning)"
      },
      {
        "id": "grok-4.20-0309-non-reasoning",
        "name": "Grok 4.20 (Non-Reasoning)"
      },
      {
        "id": "grok-4.20-multi-agent-0309",
        "name": "Grok 4.20 Multi-Agent"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "groq",
    "name": "Groq",
    "env": [
      "GROQ_API_KEY"
    ],
    "api": "https://api.groq.com/openai/v1",
    "models": [
      {
        "id": "qwen/qwen3.8-27b",
        "name": "Qwen3.8 27B"
      },
      {
        "id": "qwen/qwen3.6-27b",
        "name": "Qwen3.6 27B"
      },
      {
        "id": "openai/gpt-oss-120b",
        "name": "GPT OSS 120B"
      },
      {
        "id": "openai/gpt-oss-20b",
        "name": "GPT OSS 20B"
      },
      {
        "id": "llama-3.3-70b-versatile",
        "name": "Llama 3.3 70B"
      },
      {
        "id": "llama-3.1-8b-instant",
        "name": "Llama 3.1 8B"
      },
      {
        "id": "groq/compound",
        "name": "Compound"
      },
      {
        "id": "groq/compound-mini",
        "name": "Compound Mini"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "mistral",
    "name": "Mistral",
    "env": [
      "MISTRAL_API_KEY"
    ],
    "api": "https://api.mistral.ai/v1",
    "models": [
      {
        "id": "zai-glm-5-3",
        "name": "GLM-5.3"
      },
      {
        "id": "zai-glm-5-2",
        "name": "GLM-5.2"
      },
      {
        "id": "mistral-medium-2604",
        "name": "Mistral Medium 3.5"
      },
      {
        "id": "mistral-medium-latest",
        "name": "Mistral Medium (latest)"
      },
      {
        "id": "mistral-small-2603",
        "name": "Mistral Small 4"
      },
      {
        "id": "mistral-small-latest",
        "name": "Mistral Small (latest)"
      },
      {
        "id": "magistral-medium-latest",
        "name": "Magistral Medium (latest)"
      },
      {
        "id": "devstral-2512",
        "name": "Devstral 2"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "cerebras",
    "name": "Cerebras",
    "env": [
      "CEREBRAS_API_KEY"
    ],
    "api": "https://api.cerebras.ai/v1",
    "models": [
      {
        "id": "qwen-3.8-27b",
        "name": "Qwen3.8 27B"
      },
      {
        "id": "gpt-oss-120b",
        "name": "GPT OSS 120B"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "perplexity",
    "name": "Perplexity",
    "env": [
      "PERPLEXITY_API_KEY"
    ],
    "api": "https://api.perplexity.ai",
    "models": [
      {
        "id": "sonar-deep-research",
        "name": "Perplexity Sonar Deep Research"
      },
      {
        "id": "sonar-reasoning-pro",
        "name": "Sonar Reasoning Pro"
      },
      {
        "id": "sonar",
        "name": "Sonar"
      },
      {
        "id": "sonar-pro",
        "name": "Sonar Pro"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "together",
    "name": "Together AI",
    "env": [
      "TOGETHER_API_KEY"
    ],
    "api": "https://api.together.xyz/v1",
    "models": [],
    "note": "",
    "local": false
  },
  {
    "id": "openrouter",
    "name": "OpenRouter",
    "env": [
      "OPENROUTER_API_KEY"
    ],
    "api": "https://openrouter.ai/api/v1",
    "models": [
      {
        "id": "openai/gpt-6.1-sol",
        "name": "GPT-6.1 Sol"
      },
      {
        "id": "openai/gpt-6.1-sol-pro",
        "name": "GPT-6.1 Sol Pro"
      },
      {
        "id": "anthropic/claude-sonnet-5.5",
        "name": "Claude Sonnet 5.5"
      },
      {
        "id": "perceptron/perceptron-mk1.5",
        "name": "Perceptron Mk1.5"
      },
      {
        "id": "fireworks/ember-1",
        "name": "Ember-1"
      },
      {
        "id": "aion-labs/aion-3.5",
        "name": "Aion 3.5"
      },
      {
        "id": "aion-labs/aion-3.5-mini",
        "name": "Aion 3.5 Mini"
      },
      {
        "id": "qwen/qwen3.8-max-prime",
        "name": "Qwen 3.8 Max Prime"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "ollama",
    "name": "Ollama (local)",
    "env": [
      "OLLAMA_API_KEY"
    ],
    "api": "http://127.0.0.1:11434/v1",
    "models": [],
    "note": "",
    "local": true
  },
  {
    "id": "llamacpp",
    "name": "llama.cpp (local)",
    "env": [
      "LLAMACPP_API_KEY"
    ],
    "api": "http://127.0.0.1:8080/v1",
    "models": [],
    "note": "",
    "local": true
  },
  {
    "id": "302ai",
    "name": "302.AI",
    "env": [
      "302AI_API_KEY"
    ],
    "api": "https://api.302.ai/v1",
    "models": [
      {
        "id": "claude-sonnet-5-5",
        "name": "Claude Sonnet 5.5"
      },
      {
        "id": "claude-opus-5-5",
        "name": "Claude Opus 5.5"
      },
      {
        "id": "gpt-6-luna",
        "name": "GPT-6 Luna"
      },
      {
        "id": "gpt-6-sol",
        "name": "GPT-6 Sol"
      },
      {
        "id": "grok-4.7",
        "name": "Grok 4.7"
      },
      {
        "id": "deepseek-flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "gpt-6-astra",
        "name": "GPT-6 Astra"
      },
      {
        "id": "gemini-3.8-flash",
        "name": "Gemini 3.8 Flash"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "abacus",
    "name": "Abacus",
    "env": [
      "ABACUS_API_KEY"
    ],
    "api": "https://routellm.abacus.ai/v1",
    "models": [
      {
        "id": "gemini-3.7-flash",
        "name": "Gemini 3.7 Flash"
      },
      {
        "id": "grok-4.6",
        "name": "Grok 4.6"
      },
      {
        "id": "muse-spark-1.2",
        "name": "Muse Spark 1.2"
      },
      {
        "id": "qwen3.8-max",
        "name": "Qwen3.8 Max"
      },
      {
        "id": "claude-opus-5",
        "name": "Claude Opus 5"
      },
      {
        "id": "gemini-3.5-flash-lite",
        "name": "Gemini 3.5 Flash Lite"
      },
      {
        "id": "gemini-3.6-flash",
        "name": "Gemini 3.6 Flash"
      },
      {
        "id": "moonshotai/Kimi-K3",
        "name": "Kimi K3"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "abliteration-ai",
    "name": "abliteration.ai",
    "env": [
      "ABLIT_KEY"
    ],
    "api": "https://api.abliteration.ai/v1",
    "models": [
      {
        "id": "abliterated-model-large-v2",
        "name": "Abliterated Model Large V2"
      },
      {
        "id": "abliterated-model-large",
        "name": "Abliterated Model Large"
      },
      {
        "id": "abliterated-model",
        "name": "Abliterated Model"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "above",
    "name": "above.dev",
    "env": [
      "ABOVE_API_KEY"
    ],
    "api": "https://api.above.dev/v1",
    "models": [
      {
        "id": "mimo-v2.6-flash",
        "name": "MiMo V2.6 Flash"
      },
      {
        "id": "mimo-v2.6-pro",
        "name": "MiMo V2.6 Pro"
      },
      {
        "id": "mimo-v2.6-pro-ultraspeed",
        "name": "MiMo V2.6 Pro UltraSpeed"
      },
      {
        "id": "deepseek-v4-flash",
        "name": "DeepSeek V4 Flash"
      },
      {
        "id": "deepseek-v4.1-flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "glm-5.3-flash",
        "name": "GLM 5.3 Flash"
      },
      {
        "id": "deepseek-v4-pro",
        "name": "DeepSeek V4 Pro"
      },
      {
        "id": "qwen3.8-max",
        "name": "Qwen 3.8 Max"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "agentrouter",
    "name": "AgentRouter",
    "env": [
      "AGENTROUTER_API_KEY"
    ],
    "api": "https://agentrouter.org/v1",
    "models": [
      {
        "id": "glm-5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "claude-opus-5",
        "name": "Claude Opus 5"
      },
      {
        "id": "gpt-5.6-sol",
        "name": "GPT-5.6 Sol"
      },
      {
        "id": "claude-opus-4-8",
        "name": "Claude Opus 4.8"
      },
      {
        "id": "deepseek-v4-flash",
        "name": "DeepSeek V4 Flash"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "agnes",
    "name": "Agnes AI",
    "env": [
      "AGNES_API_KEY"
    ],
    "api": "https://apihub.agnes-ai.com/v1",
    "models": [
      {
        "id": "agnes-2.5-pro-alpha",
        "name": "Agnes 2.5 Pro Alpha"
      },
      {
        "id": "agnes-2.5-flash",
        "name": "Agnes 2.5 Flash"
      },
      {
        "id": "agnes-2.0-flash",
        "name": "Agnes 2.0 Flash"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "ai-router",
    "name": "AI-ROUTER",
    "env": [
      "AI_ROUTER_API_KEY"
    ],
    "api": "https://api.ai-router.dev/v1",
    "models": [
      {
        "id": "gpt-5.6-luna",
        "name": "GPT-5.6 Luna"
      },
      {
        "id": "gpt-5.6-sol",
        "name": "GPT-5.6 Sol"
      },
      {
        "id": "gpt-5.6-terra",
        "name": "GPT-5.6 Terra"
      },
      {
        "id": "gpt-5.5",
        "name": "GPT-5.5"
      },
      {
        "id": "gpt-5.4",
        "name": "GPT-5.4"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "aiand",
    "name": "ai&",
    "env": [
      "AIAND_API_KEY"
    ],
    "api": "https://api.aiand.com/v1",
    "models": [
      {
        "id": "qwen/qwen3.8-27b",
        "name": "Qwen3.8 27B"
      },
      {
        "id": "zai-org/glm-5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "motif-technologies/motif-3",
        "name": "Motif 3"
      },
      {
        "id": "moonshotai/kimi-k3",
        "name": "Kimi K3"
      },
      {
        "id": "zai-org/glm-5.2",
        "name": "GLM-5.2"
      },
      {
        "id": "moonshotai/kimi-k2.7-code",
        "name": "Kimi K2.7 Code"
      },
      {
        "id": "deepseek-ai/deepseek-v4-flash",
        "name": "DeepSeek V4 Flash"
      },
      {
        "id": "deepseek-ai/deepseek-v4-pro",
        "name": "DeepSeek V4 Pro"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "ai21",
    "name": "AI21 Labs",
    "env": [
      "AI21_API_KEY"
    ],
    "api": "https://api.ai21.com/studio/v1",
    "models": [
      {
        "id": "jamba-mini",
        "name": "Jamba Mini"
      },
      {
        "id": "jamba-large",
        "name": "Jamba Large"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "ainetcafe",
    "name": "ainetcafe",
    "env": [
      "AINETCAFE_API_KEY"
    ],
    "api": "https://microquickjs.com/v1",
    "models": [
      {
        "id": "Kimi-K3",
        "name": "Kimi K3"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "aixy",
    "name": "Aixy",
    "env": [
      "AIXY_API_KEY"
    ],
    "api": "https://api.aixy-gateway.com/v1",
    "models": [
      {
        "id": "openai/gpt-4.1-mini",
        "name": "GPT-4.1 mini"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "aki-io",
    "name": "AKI.IO",
    "env": [
      "AKI_IO_API_KEY"
    ],
    "api": "https://aki.io/v1",
    "models": [
      {
        "id": "glm5.3-754b",
        "name": "GLM-5.3"
      },
      {
        "id": "qwen3.8-27b",
        "name": "Qwen3.8 27B"
      },
      {
        "id": "deepseek-v4-flash-0731-284b",
        "name": "DeepSeek V4 Flash 0731"
      },
      {
        "id": "qwen3.6-35b",
        "name": "Qwen3.6 35B-A3B"
      },
      {
        "id": "gemma4-26b",
        "name": "Gemma 4 26B A4B IT"
      },
      {
        "id": "mistral4-119b",
        "name": "Mistral Small 4"
      },
      {
        "id": "gpt-oss-120b",
        "name": "GPT OSS 120B"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "alibaba",
    "name": "Alibaba",
    "env": [
      "DASHSCOPE_API_KEY"
    ],
    "api": "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    "models": [
      {
        "id": "qwen3.8-omni-flash",
        "name": "Qwen3.8 Omni Flash"
      },
      {
        "id": "qwen3.8-flash",
        "name": "Qwen3.8 Flash"
      },
      {
        "id": "qwen3.8-max",
        "name": "Qwen3.8 Max"
      },
      {
        "id": "deepseek-v4-flash-0731",
        "name": "DeepSeek V4 Flash 0731"
      },
      {
        "id": "kimi-k3",
        "name": "Kimi K3"
      },
      {
        "id": "qwen3.7-flash",
        "name": "Qwen3.7 Flash"
      },
      {
        "id": "glm-5.2",
        "name": "GLM-5.2"
      },
      {
        "id": "qwen3.7-plus",
        "name": "Qwen3.7 Plus"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "alibaba-cn",
    "name": "Alibaba (China)",
    "env": [
      "DASHSCOPE_API_KEY"
    ],
    "api": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "models": [
      {
        "id": "qwen3.8-omni-flash",
        "name": "Qwen3.8 Omni Flash"
      },
      {
        "id": "deepseek-v4.1-flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "qwen3.8-flash",
        "name": "Qwen3.8 Flash"
      },
      {
        "id": "glm-5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "qwen3.8-max",
        "name": "Qwen3.8 Max"
      },
      {
        "id": "kimi-k3",
        "name": "Kimi K3"
      },
      {
        "id": "qwen3.7-flash",
        "name": "Qwen3.7 Flash"
      },
      {
        "id": "glm-5.2",
        "name": "GLM-5.2"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "alibaba-coding-plan",
    "name": "Alibaba Coding Plan",
    "env": [
      "ALIBABA_CODING_PLAN_API_KEY"
    ],
    "api": "https://coding-intl.dashscope.aliyuncs.com/v1",
    "models": [
      {
        "id": "qwen3.7-plus",
        "name": "Qwen3.7 Plus"
      },
      {
        "id": "qwen3.6-plus",
        "name": "Qwen3.6 Plus"
      },
      {
        "id": "qwen3.5-plus",
        "name": "Qwen3.5 Plus"
      },
      {
        "id": "MiniMax-M2.5",
        "name": "MiniMax-M2.5"
      },
      {
        "id": "glm-5",
        "name": "GLM-5"
      },
      {
        "id": "kimi-k2.5",
        "name": "Kimi K2.5"
      },
      {
        "id": "glm-4.7",
        "name": "GLM-4.7"
      },
      {
        "id": "qwen3-coder-next",
        "name": "Qwen3 Coder Next"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "alibaba-coding-plan-cn",
    "name": "Alibaba Coding Plan (China)",
    "env": [
      "ALIBABA_CODING_PLAN_API_KEY"
    ],
    "api": "https://coding.dashscope.aliyuncs.com/v1",
    "models": [
      {
        "id": "qwen3.7-plus",
        "name": "Qwen3.7 Plus"
      },
      {
        "id": "qwen3.6-plus",
        "name": "Qwen3.6 Plus"
      },
      {
        "id": "qwen3.5-plus",
        "name": "Qwen3.5 Plus"
      },
      {
        "id": "MiniMax-M2.5",
        "name": "MiniMax-M2.5"
      },
      {
        "id": "glm-5",
        "name": "GLM-5"
      },
      {
        "id": "kimi-k2.5",
        "name": "Kimi K2.5"
      },
      {
        "id": "glm-4.7",
        "name": "GLM-4.7"
      },
      {
        "id": "qwen3-coder-next",
        "name": "Qwen3 Coder Next"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "alibaba-token-plan",
    "name": "Alibaba Token Plan",
    "env": [
      "ALIBABA_TOKEN_PLAN_API_KEY"
    ],
    "api": "https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
    "models": [
      {
        "id": "deepseek-v4.1-flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "qwen3.8-flash",
        "name": "Qwen3.8 Flash"
      },
      {
        "id": "glm-5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "deepseek-v4-pro-0813",
        "name": "DeepSeek V4 Pro 0813"
      },
      {
        "id": "qwen3.8-max",
        "name": "Qwen3.8 Max"
      },
      {
        "id": "deepseek-v4-flash-0731",
        "name": "DeepSeek V4 Flash 0731"
      },
      {
        "id": "qwen3.8-max-preview",
        "name": "Qwen3.8 Max Preview"
      },
      {
        "id": "glm-5.2",
        "name": "GLM-5.2"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "alibaba-token-plan-cn",
    "name": "Alibaba Token Plan (China)",
    "env": [
      "ALIBABA_TOKEN_PLAN_API_KEY"
    ],
    "api": "https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
    "models": [
      {
        "id": "deepseek-v4.1-flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "qwen3.8-flash",
        "name": "Qwen3.8 Flash"
      },
      {
        "id": "glm-5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "deepseek-v4-pro-0813",
        "name": "DeepSeek V4 Pro 0813"
      },
      {
        "id": "qwen3.8-max",
        "name": "Qwen3.8 Max"
      },
      {
        "id": "deepseek-v4-flash-0731",
        "name": "DeepSeek V4 Flash 0731"
      },
      {
        "id": "qwen3.8-max-preview",
        "name": "Qwen3.8 Max Preview"
      },
      {
        "id": "glm-5.2",
        "name": "GLM-5.2"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "ambient",
    "name": "Ambient",
    "env": [
      "AMBIENT_API_KEY"
    ],
    "api": "https://api.ambient.xyz/v1",
    "models": [
      {
        "id": "qwen/qwen3.8-27b",
        "name": "Qwen3.8 27B"
      },
      {
        "id": "deepseek/deepseek-v4-flash-0731",
        "name": "DeepSeek V4 Flash 0731"
      },
      {
        "id": "ambient/large",
        "name": "Ambient Large"
      },
      {
        "id": "z-ai/glm-5.2",
        "name": "GLM-5.2"
      },
      {
        "id": "zai-org/GLM-5.2-FP8",
        "name": "GLM-5.2"
      },
      {
        "id": "moonshotai/kimi-k2.7-code",
        "name": "Kimi K2.7 Code"
      },
      {
        "id": "stepfun/step-3.7-flash",
        "name": "Step 3.7 Flash"
      },
      {
        "id": "deepseek/deepseek-v4-flash",
        "name": "DeepSeek V4 Flash"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "amd",
    "name": "AMD",
    "env": [
      "AMD_API_KEY"
    ],
    "api": "https://developer.amd.com.cn/radeon/api/v1",
    "models": [
      {
        "id": "DeepSeek-V4.1-Flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "MiniCPM5-2B",
        "name": "MiniCPM5-2B"
      },
      {
        "id": "Qwen3.8-Flash-Next",
        "name": "Qwen3.8 Flash Next"
      },
      {
        "id": "DeepSeek-V4-Flash-Vision-Exp",
        "name": "DeepSeek V4 Flash Vision Exp"
      },
      {
        "id": "Qwen3.8-27B",
        "name": "Qwen3.8 27B"
      },
      {
        "id": "DeepSeek-V4-Flash",
        "name": "DeepSeek V4 Flash 0731"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "anyapi",
    "name": "AnyAPI",
    "env": [
      "ANYAPI_API_KEY"
    ],
    "api": "https://api.anyapi.ai/v1",
    "models": [
      {
        "id": "deepseek/deepseek-v4-flash",
        "name": "DeepSeek V4 Flash"
      },
      {
        "id": "deepseek/deepseek-v4-pro",
        "name": "DeepSeek V4 Pro"
      },
      {
        "id": "xai/grok-4.3",
        "name": "Grok 4.3"
      },
      {
        "id": "anthropic/claude-opus-4-7",
        "name": "Claude Opus 4.7"
      },
      {
        "id": "openai/gpt-5.4",
        "name": "GPT-5.4"
      },
      {
        "id": "anthropic/claude-sonnet-4-6",
        "name": "Claude Sonnet 4.6"
      },
      {
        "id": "anthropic/claude-opus-4-6",
        "name": "Claude Opus 4.6"
      },
      {
        "id": "google/gemini-3-flash-preview",
        "name": "Gemini 3 Flash Preview"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "arcee",
    "name": "Arcee",
    "env": [
      "ARCEE_API_KEY"
    ],
    "api": "https://api.arcee.ai/api/v1",
    "models": [
      {
        "id": "deepseek/deepseek-v4-pro-0813",
        "name": "DeepSeek V4 Pro 0813"
      },
      {
        "id": "deepseek/deepseek-v4-flash-latest",
        "name": "DeepSeek V4 Flash Latest"
      },
      {
        "id": "thinkingmachines/inkling-small",
        "name": "Inkling Small"
      },
      {
        "id": "moonshotai/kimi-k3",
        "name": "Kimi K3"
      },
      {
        "id": "zai-org/glm-5.2",
        "name": "GLM-5.2"
      },
      {
        "id": "deepseek/deepseek-v4-pro",
        "name": "DeepSeek V4 Pro"
      },
      {
        "id": "trinity-large-thinking",
        "name": "Trinity Large Thinking"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "atomic-chat",
    "name": "Atomic Chat",
    "env": [
      "ATOMIC_CHAT_API_KEY"
    ],
    "api": "http://127.0.0.1:1337/v1",
    "models": [
      {
        "id": "Qwen3_5-9B-MLX-4bit",
        "name": "Qwen 3.5 9B (MLX 4-bit)"
      },
      {
        "id": "Qwen3_5-9B-Q4_K_M",
        "name": "Qwen 3.5 9B (Q4_K_M)"
      },
      {
        "id": "Meta-Llama-3_1-8B-Instruct-GGUF",
        "name": "Meta Llama 3.1 8B Instruct (GGUF)"
      },
      {
        "id": "gemma-4-E4B-it-IQ4_XS",
        "name": "Gemma 4 E4B Instruct (IQ4_XS)"
      },
      {
        "id": "gemma-4-E4B-it-MLX-4bit",
        "name": "Gemma 4 E4B Instruct (MLX 4-bit)"
      }
    ],
    "note": "",
    "local": true
  },
  {
    "id": "auriko",
    "name": "Auriko",
    "env": [
      "AURIKO_API_KEY"
    ],
    "api": "https://api.auriko.ai/v1",
    "models": [
      {
        "id": "deepseek-v4-flash",
        "name": "DeepSeek V4 Flash"
      },
      {
        "id": "deepseek-v4-pro",
        "name": "DeepSeek V4 Pro"
      },
      {
        "id": "kimi-k2.6",
        "name": "Kimi K2.6"
      },
      {
        "id": "grok-4.3",
        "name": "Grok 4.3"
      },
      {
        "id": "claude-opus-4-7",
        "name": "Claude Opus 4.7"
      },
      {
        "id": "glm-5.1",
        "name": "GLM-5.1"
      },
      {
        "id": "qwen-3.6-plus",
        "name": "Qwen3.6 Plus"
      },
      {
        "id": "minimax-m2-7",
        "name": "MiniMax-M2.7"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "bailing",
    "name": "Bailing",
    "env": [
      "BAILING_API_TOKEN"
    ],
    "api": "https://api.tbox.cn/api/llm/v1",
    "models": [
      {
        "id": "Ling-1T",
        "name": "Ling-1T"
      },
      {
        "id": "Ring-1T",
        "name": "Ring-1T"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "baseten",
    "name": "Baseten",
    "env": [
      "BASETEN_API_KEY"
    ],
    "api": "https://inference.baseten.co/v1",
    "models": [
      {
        "id": "deepseek-ai/DeepSeek-V4.1-Flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "deepseek-ai/DeepSeek-V4.1-Flash-Fast",
        "name": "deepseek-ai/DeepSeek-V4.1-Flash-Fast"
      },
      {
        "id": "zai-org/GLM-5.3-Flash",
        "name": "GLM 5.3 Flash"
      },
      {
        "id": "zai-org/GLM-5.3",
        "name": "GLM 5.3"
      },
      {
        "id": "zai-org/GLM-5.3-Fast",
        "name": "GLM 5.3 Fast"
      },
      {
        "id": "deepseek-ai/DeepSeek-V4-Pro-0813",
        "name": "DeepSeek V4 Pro 0813"
      },
      {
        "id": "deepseek-ai/DeepSeek-V4-Flash-0731",
        "name": "DeepSeek V4 Flash 0731"
      },
      {
        "id": "thinkingmachines/inkling-small",
        "name": "Inkling Small"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "bee",
    "name": "Bee by HEOSSI",
    "env": [
      "BEE_API_KEY"
    ],
    "api": "https://api.bee.heossi.com/bee",
    "models": [
      {
        "id": "bee-brood",
        "name": "Bee Brood 1.0"
      },
      {
        "id": "bee-buzz",
        "name": "Bee Buzz 1.0"
      },
      {
        "id": "bee-comb",
        "name": "Bee Comb 2.0"
      },
      {
        "id": "bee-hive",
        "name": "Bee Hive 1.0"
      },
      {
        "id": "bee-cell",
        "name": "Bee Cell 1.0"
      },
      {
        "id": "bee-swarm",
        "name": "Bee Swarm 1.0"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "berget",
    "name": "Berget.AI",
    "env": [
      "BERGET_API_KEY"
    ],
    "api": "https://api.berget.ai/v1",
    "models": [
      {
        "id": "zai-org/GLM-5.3-Flash",
        "name": "GLM-5.3-Flash"
      },
      {
        "id": "Qwen/Qwen3.8-27B-FP8",
        "name": "Qwen3.8 27B"
      },
      {
        "id": "moonshotai/Kimi-K3",
        "name": "Kimi K3"
      },
      {
        "id": "zai-org/GLM-5.2",
        "name": "GLM-5.2"
      },
      {
        "id": "google/gemma-4-31B-it",
        "name": "Gemma 4 31B Instruct"
      },
      {
        "id": "mistralai/Mistral-Small-3.2-24B-Instruct-2506",
        "name": "Mistral Small 3.2 24B Instruct 2506"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "blueclaw",
    "name": "Blue Claw",
    "env": [
      "BLUECLAW_API_KEY"
    ],
    "api": "https://openai.blueclaw.network/v1",
    "models": [
      {
        "id": "Qwen3.6-27B",
        "name": "Qwen3.6 27B"
      },
      {
        "id": "Qwen/Qwen3.6-35B-A3B-FP8",
        "name": "Qwen3.6 35B A3B FP8"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "bothub",
    "name": "Bothub",
    "env": [
      "BOTHUB_API_KEY"
    ],
    "api": "https://openai.bothub.ru/v1",
    "models": [
      {
        "id": "muse-spark-1.3-contributor",
        "name": "Muse Spark 1.3 Contributor"
      },
      {
        "id": "glm-5.3-flash",
        "name": "GLM-5.3-Flash"
      },
      {
        "id": "glm-5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "deepseek-v4-pro-0813",
        "name": "DeepSeek V4 Pro 0813"
      },
      {
        "id": "deepseek-v4-flash-0731",
        "name": "DeepSeek V4 Flash 0731"
      },
      {
        "id": "gpt-5.6-luna",
        "name": "GPT-5.6 Luna"
      },
      {
        "id": "nemotron-3-ultra-550b-a55b:free",
        "name": "Nemotron 3 Ultra (free)"
      },
      {
        "id": "gemma-4-31b-it:free",
        "name": "Gemma 4 31B IT (free)"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "hyper",
    "name": "Charm Hyper",
    "env": [
      "HYPER_API_KEY"
    ],
    "api": "https://hyper.charm.land/v1",
    "models": [
      {
        "id": "deepseek-v4.1-flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "kimi-k2-thinking",
        "name": "Kimi K2 Thinking"
      },
      {
        "id": "glm-5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "glm-5.3-flash",
        "name": "GLM-5.3-Flash"
      },
      {
        "id": "qwen3.8-2.4t-a95b",
        "name": "Qwen3.8 2.4T A95B"
      },
      {
        "id": "qwen3.8-27b",
        "name": "Qwen3.8 27B"
      },
      {
        "id": "qwen3.8-flash",
        "name": "Qwen3.8 Flash"
      },
      {
        "id": "inkling",
        "name": "Inkling"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "chutes",
    "name": "Chutes",
    "env": [
      "CHUTES_API_KEY"
    ],
    "api": "https://llm.chutes.ai/v1",
    "models": [
      {
        "id": "Qwen/Qwen3.8-27B-TEE",
        "name": "Qwen3.8 27B TEE"
      },
      {
        "id": "deepseek-ai/DeepSeek-V4-Flash-0731-TEE",
        "name": "DeepSeek V4 Flash 0731 TEE"
      },
      {
        "id": "moonshotai/Kimi-K3-TEE",
        "name": "Kimi K3 TEE"
      },
      {
        "id": "zai-org/GLM-5.2-TEE",
        "name": "GLM 5.2 TEE"
      },
      {
        "id": "Qwen/Qwen3.6-27B-TEE",
        "name": "Qwen3.6 27B TEE"
      },
      {
        "id": "moonshotai/Kimi-K2.6-TEE",
        "name": "Kimi K2.6 TEE"
      },
      {
        "id": "zai-org/GLM-5.1-TEE",
        "name": "GLM 5.1 TEE"
      },
      {
        "id": "google/gemma-4-31B-turbo-TEE",
        "name": "gemma 4 31B turbo TEE"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "clarifai",
    "name": "Clarifai",
    "env": [
      "CLARIFAI_PAT"
    ],
    "api": "https://api.clarifai.com/v2/ext/openai/v1",
    "models": [
      {
        "id": "moonshotai/chat-completion/models/Kimi-K2_6",
        "name": "Kimi K2.6"
      },
      {
        "id": "minimaxai/chat-completion/models/MiniMax-M2_5-high-throughput",
        "name": "MiniMax-M2.5 High Throughput"
      },
      {
        "id": "arcee_ai/AFM/models/trinity-mini",
        "name": "Trinity Mini"
      },
      {
        "id": "mistralai/completion/models/Ministral-3-14B-Reasoning-2512",
        "name": "Ministral 3 14B Reasoning 2512"
      },
      {
        "id": "mistralai/completion/models/Ministral-3-3B-Reasoning-2512",
        "name": "Ministral 3 3B Reasoning 2512"
      },
      {
        "id": "openai/chat-completion/models/gpt-oss-120b-high-throughput",
        "name": "GPT OSS 120B High Throughput"
      },
      {
        "id": "openai/chat-completion/models/gpt-oss-20b",
        "name": "GPT OSS 20B"
      },
      {
        "id": "qwen/qwenLM/models/Qwen3-30B-A3B-Thinking-2507",
        "name": "Qwen3 30B A3B Thinking 2507"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "claudinio",
    "name": "Claudinio",
    "env": [
      "CLAUDINIO_API_KEY"
    ],
    "api": "https://api.claudin.io/v1",
    "models": [
      {
        "id": "claudinio",
        "name": "Claudinio"
      },
      {
        "id": "claudius",
        "name": "Claudius"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "cline-pass",
    "name": "ClinePass",
    "env": [
      "CLINE_API_KEY"
    ],
    "api": "https://api.cline.bot/api/v1",
    "models": [
      {
        "id": "cline-pass/mimo-v2.6-flash",
        "name": "MiMo-V2.6-Flash"
      },
      {
        "id": "cline-pass/mimo-v2.6-pro",
        "name": "MiMo-V2.6-Pro"
      },
      {
        "id": "cline-pass/deepseek-v4.1-flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "cline-pass/muse-spark-1.3-contributor",
        "name": "Muse Spark 1.3 Contributor"
      },
      {
        "id": "cline-pass/glm-5.3-flash",
        "name": "cline-pass/glm-5.3-flash"
      },
      {
        "id": "cline-pass/glm-5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "cline-pass/qwen3.8-max",
        "name": "Qwen3.8 Max"
      },
      {
        "id": "cline-pass/kimi-k3",
        "name": "Kimi K3"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "cloudferro-sherlock",
    "name": "CloudFerro Sherlock",
    "env": [
      "CLOUDFERRO_SHERLOCK_API_KEY"
    ],
    "api": "https://api-sherlock.cloudferro.com/openai/v1/",
    "models": [
      {
        "id": "MiniMaxAI/MiniMax-M2.5",
        "name": "MiniMax-M2.5"
      },
      {
        "id": "openai/gpt-oss-120b",
        "name": "OpenAI GPT OSS 120B"
      },
      {
        "id": "speakleash/Bielik-11B-v2.6-Instruct",
        "name": "Bielik 11B v2.6 Instruct"
      },
      {
        "id": "speakleash/Bielik-11B-v3.0-Instruct",
        "name": "Bielik 11B v3.0 Instruct"
      },
      {
        "id": "meta-llama/Llama-3.3-70B-Instruct",
        "name": "Llama 3.3 70B Instruct"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "cloudflare-workers-ai",
    "name": "Cloudflare Workers AI",
    "env": [
      "CLOUDFLARE_ACCOUNT_ID",
      "CLOUDFLARE_API_KEY"
    ],
    "api": "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/v1",
    "models": [
      {
        "id": "@cf/zai-org/glm-5.3-flash",
        "name": "Glm 5.3 Flash"
      },
      {
        "id": "@cf/qwen/qwen3.8-27b",
        "name": "Qwen3.8 27B"
      },
      {
        "id": "@cf/zai-org/glm-5.3",
        "name": "Glm 5.3"
      },
      {
        "id": "@cf/deepseek-ai/deepseek-v4-pro-0813",
        "name": "DeepSeek V4 Pro 0813"
      },
      {
        "id": "@cf/deepseek-ai/deepseek-v4-flash-0731",
        "name": "DeepSeek V4 Flash 0731"
      },
      {
        "id": "@cf/zai-org/glm-5.2",
        "name": "Glm 5.2"
      },
      {
        "id": "@cf/moonshotai/kimi-k2.7-code",
        "name": "Kimi K2.7 Code"
      },
      {
        "id": "@cf/moonshotai/kimi-k2.6",
        "name": "Kimi K2.6"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "coralbricks",
    "name": "CoralBricks",
    "env": [
      "CORAL_API_KEY"
    ],
    "api": "https://inference.coralbricks.ai/v1",
    "models": [
      {
        "id": "deepseek-v4.1-flash-fast-fp4",
        "name": "DeepSeek V4.1 Flash FP4"
      },
      {
        "id": "glm-5.3-flash-fp4",
        "name": "GLM 5.3 Flash FP4"
      },
      {
        "id": "glm-5.3-fp4",
        "name": "GLM 5.3 FP4"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "wandb",
    "name": "CoreWeave",
    "env": [
      "WANDB_API_KEY"
    ],
    "api": "https://api.inference.wandb.ai/v1",
    "models": [
      {
        "id": "deepseek-ai/DeepSeek-V4.1-Flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "zai-org/GLM-5.3-Flash",
        "name": "GLM 5.3 Flash"
      },
      {
        "id": "ibm-granite/granite-4.2-8b",
        "name": "Granite 4.2 8B"
      },
      {
        "id": "Qwen/Qwen3.8-27B",
        "name": "Qwen3.8 27B"
      },
      {
        "id": "deepseek-ai/DeepSeek-V4-Pro-0813",
        "name": "DeepSeek V4 Pro 0813"
      },
      {
        "id": "nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B",
        "name": "Nemotron 3.5 Lightning"
      },
      {
        "id": "deepseek-ai/DeepSeek-V4-Flash-0731",
        "name": "DeepSeek V4 Flash 0731"
      },
      {
        "id": "zai-org/GLM-5.2",
        "name": "GLM 5.2"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "cortecs",
    "name": "Cortecs",
    "env": [
      "CORTECS_API_KEY"
    ],
    "api": "https://api.cortecs.ai/v1",
    "models": [
      {
        "id": "gpt-6.1-sol",
        "name": "GPT-6.1 Sol"
      },
      {
        "id": "claude-opus-5.5",
        "name": "Claude Opus 5.5"
      },
      {
        "id": "gpt-6-luna",
        "name": "GPT-6 Luna"
      },
      {
        "id": "gpt-6-sol",
        "name": "GPT-6 Sol"
      },
      {
        "id": "deepseek-v4.1-flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "gemini-3.8-flash",
        "name": "Gemini 3.8 Flash"
      },
      {
        "id": "qwen3.8-flash-next",
        "name": "Qwen3.8 Flash Next"
      },
      {
        "id": "glm-5.3-flash",
        "name": "GLM-5.3-Flash"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "crof",
    "name": "CrofAI",
    "env": [
      "CROF_API_KEY"
    ],
    "api": "https://crof.ai/v1",
    "models": [
      {
        "id": "glm-5.3-flash",
        "name": "GLM 5.3-Flash"
      },
      {
        "id": "deepseek-v4-flash-vision-exp",
        "name": "DeepSeek V4 Flash Vision Exp"
      },
      {
        "id": "glm-5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "qwen3.8-27b",
        "name": "Qwen3.8 27B"
      },
      {
        "id": "deepseek-v4-pro-0813",
        "name": "DeepSeek V4 Pro (0813)"
      },
      {
        "id": "deepseek-v4-flash-0731",
        "name": "DeepSeek V4 Flash (New)"
      },
      {
        "id": "kimi-k3",
        "name": "Kimi K3"
      },
      {
        "id": "kimi-k3-eco",
        "name": "Kimi K3 Eco"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "crossmodel",
    "name": "CrossModel",
    "env": [
      "CROSSMODEL_API_KEY"
    ],
    "api": "https://api.crossmodel.ai/v1",
    "models": [
      {
        "id": "anthropic/claude-sonnet-5-5",
        "name": "Claude Sonnet 5.5"
      },
      {
        "id": "anthropic/claude-opus-5-5",
        "name": "Claude Opus 5.5"
      },
      {
        "id": "openai/gpt-6-luna",
        "name": "GPT-6 Luna"
      },
      {
        "id": "openai/gpt-6-sol",
        "name": "GPT-6 Sol"
      },
      {
        "id": "xiaomi/mimo-v2.6-flash",
        "name": "MiMo-V2.6-Flash"
      },
      {
        "id": "xiaomi/mimo-v2.6-pro",
        "name": "MiMo-V2.6-Pro"
      },
      {
        "id": "x-ai/grok-4.7",
        "name": "Grok 4.7"
      },
      {
        "id": "qwen/qwen3.8-omni-flash",
        "name": "Qwen3.8 Omni Flash"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "crusoe",
    "name": "Crusoe",
    "env": [
      "CRUSOE_API_KEY"
    ],
    "api": "https://api.inference.crusoecloud.com/v1",
    "models": [
      {
        "id": "zai/GLM-5.2",
        "name": "GLM-5.2"
      },
      {
        "id": "nvidia/Nemotron-3-Nano-Omni-Reasoning-30B-A3B",
        "name": "Nemotron 3 Nano Omni 30B A3B Reasoning"
      },
      {
        "id": "moonshotai/Kimi-K2.6",
        "name": "Kimi K2.6"
      },
      {
        "id": "zai/GLM-5.1",
        "name": "GLM-5.1"
      },
      {
        "id": "google/gemma-4-31b-it",
        "name": "Gemma 4 31B IT"
      },
      {
        "id": "nvidia/NVIDIA-Nemotron-3-Super-120B-A12B",
        "name": "Nemotron 3 Super 120B A12B"
      },
      {
        "id": "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
        "name": "Nemotron 3 Nano 30B A3B"
      },
      {
        "id": "openai/gpt-oss-120b",
        "name": "GPT OSS 120B"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "drun",
    "name": "D.Run (China)",
    "env": [
      "DRUN_API_KEY"
    ],
    "api": "https://chat.d.run/v1",
    "models": [
      {
        "id": "public/minimax-m25",
        "name": "MiniMax M2.5"
      },
      {
        "id": "public/deepseek-r1",
        "name": "DeepSeek R1"
      },
      {
        "id": "public/deepseek-v3",
        "name": "DeepSeek V3"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "daoxe",
    "name": "DaoXE",
    "env": [
      "DAOXE_API_KEY"
    ],
    "api": "https://daoxe.com/v1",
    "models": [
      {
        "id": "grok-4.5",
        "name": "Grok 4.5"
      },
      {
        "id": "claude-opus-4-8",
        "name": "Claude Opus 4.8"
      },
      {
        "id": "gpt-5.5",
        "name": "GPT-5.5"
      },
      {
        "id": "grok-4.3",
        "name": "Grok 4.3"
      },
      {
        "id": "gpt-5.4",
        "name": "GPT-5.4"
      },
      {
        "id": "gemini-3.1-pro-preview",
        "name": "Gemini 3.1 Pro Preview"
      },
      {
        "id": "claude-sonnet-4-6",
        "name": "Claude Sonnet 4.6"
      },
      {
        "id": "kimi-k2.5",
        "name": "Kimi K2.5"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "databricks",
    "name": "Databricks",
    "env": [
      "DATABRICKS_HOST",
      "DATABRICKS_TOKEN"
    ],
    "api": "https://${DATABRICKS_HOST}/ai-gateway/mlflow/v1",
    "models": [
      {
        "id": "databricks-gpt-5-6-luna",
        "name": "GPT-5.6 Luna"
      },
      {
        "id": "databricks-gpt-5-6-sol",
        "name": "GPT-5.6 Sol"
      },
      {
        "id": "databricks-gpt-5-6-terra",
        "name": "GPT-5.6 Terra"
      },
      {
        "id": "databricks-glm-5-2",
        "name": "GLM-5.2"
      },
      {
        "id": "databricks-kimi-k2-7-code",
        "name": "Kimi K2.7 Code"
      },
      {
        "id": "databricks-gpt-5-5",
        "name": "GPT-5.5"
      },
      {
        "id": "databricks-claude-opus-4-7",
        "name": "Claude Opus 4.7"
      },
      {
        "id": "databricks-gpt-5-4-mini",
        "name": "GPT-5.4 mini"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "deepseek",
    "name": "DeepSeek",
    "env": [
      "DEEPSEEK_API_KEY"
    ],
    "api": "https://api.deepseek.com",
    "models": [
      {
        "id": "deepseek-flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "deepseek-v4-flash",
        "name": "DeepSeek V4 Flash"
      },
      {
        "id": "deepseek-v4-flash-vision-exp",
        "name": "DeepSeek V4 Flash Vision Exp"
      },
      {
        "id": "deepseek-v4-pro",
        "name": "DeepSeek V4 Pro"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "llmgateway",
    "name": "DevPass (LLM Gateway)",
    "env": [
      "LLMGATEWAY_API_KEY"
    ],
    "api": "https://api.llmgateway.io/v1",
    "models": [
      {
        "id": "gpt-6.1-sol",
        "name": "GPT-6.1 Sol"
      },
      {
        "id": "claude-sonnet-5-5",
        "name": "Claude Sonnet 5.5"
      },
      {
        "id": "claude-opus-5-5",
        "name": "Claude Opus 5.5"
      },
      {
        "id": "gpt-6-luna",
        "name": "GPT-6 Luna"
      },
      {
        "id": "gpt-6-sol",
        "name": "GPT-6 Sol"
      },
      {
        "id": "mimo-v2.6-flash",
        "name": "MiMo-V2.6-Flash"
      },
      {
        "id": "mimo-v2.6-pro",
        "name": "MiMo-V2.6-Pro"
      },
      {
        "id": "grok-4-7",
        "name": "Grok 4.7"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "digitalocean",
    "name": "DigitalOcean",
    "env": [
      "DIGITALOCEAN_ACCESS_TOKEN"
    ],
    "api": "https://inference.do-ai.run/v1",
    "models": [
      {
        "id": "anthropic-claude-sonnet-5.5",
        "name": "Anthropic Claude Sonnet 5.5"
      },
      {
        "id": "anthropic-claude-opus-5.5",
        "name": "Anthropic Claude Opus 5.5"
      },
      {
        "id": "openai-gpt-6-luna",
        "name": "OpenAI GPT-6 Luna"
      },
      {
        "id": "openai-gpt-6-sol",
        "name": "OpenAI GPT-6 Sol"
      },
      {
        "id": "deepseek-v4.1-flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "openai-gpt-6-astra",
        "name": "OpenAI GPT-6 Astra"
      },
      {
        "id": "anthropic-claude-fable-5.1",
        "name": "Anthropic Claude Fable 5.1"
      },
      {
        "id": "glm-5.3-flash",
        "name": "GLM5.3 Flash"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "dinference",
    "name": "DInference",
    "env": [
      "DINFERENCE_API_KEY"
    ],
    "api": "https://api.dinference.com/v1",
    "models": [
      {
        "id": "glm-5.2",
        "name": "GLM-5.2"
      },
      {
        "id": "glm-5.1",
        "name": "GLM-5.1"
      },
      {
        "id": "glm-5",
        "name": "GLM-5"
      },
      {
        "id": "minimax-m2.5",
        "name": "MiniMax-M2.5"
      },
      {
        "id": "glm-4.7",
        "name": "GLM-4.7"
      },
      {
        "id": "gpt-oss-120b",
        "name": "GPT OSS 120B"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "ebcloud",
    "name": "EBCloud",
    "env": [
      "EBCLOUD_API_KEY"
    ],
    "api": "https://maas-api.ebcloud.com/v1",
    "models": [
      {
        "id": "DeepSeek-V4-Flash",
        "name": "DeepSeek V4 Flash"
      },
      {
        "id": "DeepSeek-V4-Pro",
        "name": "DeepSeek V4 Pro"
      },
      {
        "id": "Kimi-K2.6",
        "name": "Kimi K2.6"
      },
      {
        "id": "GLM-5.1",
        "name": "GLM-5.1"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "echo",
    "name": "Echo",
    "env": [
      "ECHO_API_KEY"
    ],
    "api": "https://echo.tracerml.ai/v1",
    "models": [
      {
        "id": "echo",
        "name": "Echo"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "edenai",
    "name": "Eden AI",
    "env": [
      "EDENAI_API_KEY"
    ],
    "api": "https://api.edenai.run/v3",
    "models": [
      {
        "id": "openai/gpt-6.1-sol",
        "name": "GPT-6.1 Sol"
      },
      {
        "id": "anthropic/claude-sonnet-5-5",
        "name": "Claude Sonnet 5.5"
      },
      {
        "id": "anthropic/claude-sonnet-latest",
        "name": "Claude Sonnet Latest (Claude Sonnet 5.5)"
      },
      {
        "id": "anthropic/claude-opus-5-5",
        "name": "Claude Opus 5.5"
      },
      {
        "id": "anthropic/claude-opus-latest",
        "name": "Claude Opus Latest (Claude Opus 5.5)"
      },
      {
        "id": "openai/gpt-6-luna",
        "name": "GPT-6 Luna"
      },
      {
        "id": "openai/gpt-6-sol",
        "name": "GPT-6 Sol"
      },
      {
        "id": "xai/grok-4.7",
        "name": "Grok 4.7"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "empiriolabs",
    "name": "EmpirioLabs AI",
    "env": [
      "EMPIRIOLABS_API_KEY"
    ],
    "api": "https://api.empiriolabs.ai/v1",
    "models": [
      {
        "id": "mimo-v2-6-flash",
        "name": "MiMo V2.6 Flash"
      },
      {
        "id": "mimo-v2-6-pro",
        "name": "MiMo V2.6 Pro"
      },
      {
        "id": "mimo-v2-6-pro-ultraspeed",
        "name": "MiMo V2.6 Pro UltraSpeed"
      },
      {
        "id": "qwen3-8-omni-flash",
        "name": "Qwen3.8 Omni Flash"
      },
      {
        "id": "step-5-preview",
        "name": "Step 5 Preview"
      },
      {
        "id": "deepseek-v4-1-flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "muse-spark-1-3",
        "name": "Muse Spark 1.3"
      },
      {
        "id": "glm-5-3-flash",
        "name": "GLM 5.3 Flash"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "evroc",
    "name": "evroc",
    "env": [
      "EVROC_API_KEY"
    ],
    "api": "https://models.think.evroc.com/v1",
    "models": [
      {
        "id": "Qwen/Qwen3.8-27B",
        "name": "Qwen3.8-27B"
      },
      {
        "id": "zai-org/GLM-5.2",
        "name": "GLM-5.2"
      },
      {
        "id": "evroc/roc",
        "name": "roc"
      },
      {
        "id": "mistralai/Mistral-Medium-3.5-128B",
        "name": "Mistral Medium 3.5"
      },
      {
        "id": "moonshotai/Kimi-K2.6",
        "name": "Kimi K2.6"
      },
      {
        "id": "Qwen/Qwen3.6-35B-A3B",
        "name": "Qwen3.6 35B-A3B"
      },
      {
        "id": "google/gemma-4-26B-A4B-it",
        "name": "Gemma 4 26B A4B IT"
      },
      {
        "id": "openai/gpt-oss-120b",
        "name": "GPT OSS 120B"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "fastrouter",
    "name": "FastRouter",
    "env": [
      "FASTROUTER_API_KEY"
    ],
    "api": "https://go.fastrouter.ai/api/v1",
    "models": [
      {
        "id": "anthropic/claude-opus-4.8",
        "name": "Claude Opus 4.8"
      },
      {
        "id": "google/gemini-3.5-flash",
        "name": "Gemini 3.5 Flash"
      },
      {
        "id": "deepseek/deepseek-v4-pro",
        "name": "DeepSeek V4 Pro"
      },
      {
        "id": "openai/gpt-5.5",
        "name": "GPT-5.5"
      },
      {
        "id": "openai/gpt-5.5-pro",
        "name": "GPT-5.5 Pro"
      },
      {
        "id": "moonshotai/kimi-k2.6",
        "name": "Kimi K2.6"
      },
      {
        "id": "x-ai/grok-4.3",
        "name": "Grok 4.3"
      },
      {
        "id": "x-ai/grok-build-0.1",
        "name": "Grok Build 0.1"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "fireworks-ai",
    "name": "Fireworks AI",
    "env": [
      "FIREWORKS_API_KEY"
    ],
    "api": "https://api.fireworks.ai/inference/v1/",
    "models": [
      {
        "id": "accounts/fireworks/models/ember-1",
        "name": "Ember-1"
      },
      {
        "id": "accounts/fireworks/models/deepseek-v4p1-flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "accounts/fireworks/routers/deepseek-flash-latest",
        "name": "DeepSeek Flash Latest"
      },
      {
        "id": "accounts/fireworks/routers/glm-5p3-fast",
        "name": "GLM 5.3 Fast"
      },
      {
        "id": "accounts/fireworks/routers/glm-fast-latest",
        "name": "GLM 5.3 Fast (Latest)"
      },
      {
        "id": "accounts/fireworks/models/glm-5p3-flash",
        "name": "GLM 5.3 Flash"
      },
      {
        "id": "accounts/fireworks/routers/glm-flash-latest",
        "name": "GLM Flash Latest (GLM 5.3 Flash)"
      },
      {
        "id": "accounts/fireworks/models/glm-5p3",
        "name": "GLM 5.3"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "friendli",
    "name": "Friendli",
    "env": [
      "FRIENDLI_TOKEN"
    ],
    "api": "https://api.friendli.ai/serverless/v1",
    "models": [
      {
        "id": "zai-org/GLM-5.3-Flash",
        "name": "GLM-5.3-Flash"
      },
      {
        "id": "zai-org/GLM-5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "zai-org/GLM-5.2",
        "name": "GLM-5.2"
      },
      {
        "id": "zai-org/GLM-5.1",
        "name": "GLM-5.1"
      },
      {
        "id": "google/gemma-4-31B-it",
        "name": "Gemma 4 31B IT"
      },
      {
        "id": "MiniMaxAI/MiniMax-M2.5",
        "name": "MiniMax-M2.5"
      },
      {
        "id": "deepseek-ai/DeepSeek-V3.2",
        "name": "DeepSeek V3.2"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "frogbot",
    "name": "FrogBot",
    "env": [
      "FROGBOT_API_KEY"
    ],
    "api": "https://app.frogbot.ai/api/v1",
    "models": [
      {
        "id": "grok-4-3",
        "name": "Grok 4.3"
      },
      {
        "id": "claude-opus-4-7",
        "name": "Claude Opus 4.7"
      },
      {
        "id": "qwen-3-6-plus",
        "name": "Qwen 3.6 Plus"
      },
      {
        "id": "gpt-5-4-mini",
        "name": "GPT-5.4 Mini"
      },
      {
        "id": "gpt-5-5",
        "name": "GPT-5.5"
      },
      {
        "id": "gemini-3-1-pro-preview",
        "name": "Gemini 3.1 Pro Preview"
      },
      {
        "id": "claude-sonnet-4-6",
        "name": "Claude Sonnet 4.6"
      },
      {
        "id": "gpt-5-3-codex",
        "name": "GPT-5.3 Codex"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "github-copilot",
    "name": "GitHub Copilot",
    "env": [
      "GITHUB_TOKEN"
    ],
    "api": "https://api.githubcopilot.com",
    "models": [
      {
        "id": "gpt-6.1-sol",
        "name": "GPT-6.1 Sol"
      },
      {
        "id": "claude-sonnet-5.5",
        "name": "Claude Sonnet 5.5"
      },
      {
        "id": "claude-opus-5.5",
        "name": "Claude Opus 5.5"
      },
      {
        "id": "gpt-6-luna",
        "name": "GPT-6 Luna"
      },
      {
        "id": "gpt-6-sol",
        "name": "GPT-6 Sol"
      },
      {
        "id": "grok-4.7",
        "name": "Grok 4.7"
      },
      {
        "id": "gpt-6-astra",
        "name": "GPT-6 Astra"
      },
      {
        "id": "gemini-3.8-flash",
        "name": "Gemini 3.8 Flash"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "gmicloud",
    "name": "GMI Cloud",
    "env": [
      "GMICLOUD_API_KEY"
    ],
    "api": "https://api.gmi-serving.com/v1",
    "models": [
      {
        "id": "zai-org/GLM-5.2-FP8",
        "name": "GLM-5.2"
      },
      {
        "id": "moonshotai/kimi-k2.7-code-highspeed",
        "name": "Kimi K2.7 Code Highspeed"
      },
      {
        "id": "MiniMaxAI/MiniMax-M3",
        "name": "MiniMax-M3"
      },
      {
        "id": "anthropic/claude-opus-4.8",
        "name": "Claude Opus 4.8"
      },
      {
        "id": "Qwen/Qwen3.7-Max",
        "name": "Qwen3.7 Max"
      },
      {
        "id": "deepseek-ai/DeepSeek-V4-Flash",
        "name": "DeepSeek V4 Flash"
      },
      {
        "id": "deepseek-ai/DeepSeek-V4-Pro",
        "name": "DeepSeek V4 Pro"
      },
      {
        "id": "openai/gpt-5.5",
        "name": "GPT-5.5"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "greenpt",
    "name": "GreenPT",
    "env": [
      "GREENPT_API_KEY"
    ],
    "api": "https://api.greenpt.ai/v1",
    "models": [
      {
        "id": "deepseek-v4.1-flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "glm-5.3-flash",
        "name": "GLM-5.3-Flash"
      },
      {
        "id": "glm-5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "deepseek-v4-flash-0731",
        "name": "DeepSeek V4 Flash 0731"
      },
      {
        "id": "kimi-k3",
        "name": "Kimi K3"
      },
      {
        "id": "glm-5.2",
        "name": "GLM-5.2"
      },
      {
        "id": "glm-5.2-caveman",
        "name": "GLM-5.2 Caveman"
      },
      {
        "id": "glm-5.2-caveman-lite",
        "name": "GLM-5.2 Caveman Lite"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "helicone",
    "name": "Helicone",
    "env": [
      "HELICONE_API_KEY"
    ],
    "api": "https://ai-gateway.helicone.ai/v1",
    "models": [
      {
        "id": "claude-4.5-opus",
        "name": "Anthropic: Claude Opus 4.5"
      },
      {
        "id": "gemini-3-pro-preview",
        "name": "Google Gemini 3 Pro Preview"
      },
      {
        "id": "grok-4-1-fast-reasoning",
        "name": "xAI Grok 4.1 Fast Reasoning"
      },
      {
        "id": "claude-4.5-sonnet",
        "name": "Anthropic: Claude Sonnet 4.5"
      },
      {
        "id": "claude-sonnet-4-5-20250929",
        "name": "Anthropic: Claude Sonnet 4.5 (20250929)"
      },
      {
        "id": "deepseek-v3.1-terminus",
        "name": "DeepSeek V3.1 Terminus"
      },
      {
        "id": "grok-4-fast-reasoning",
        "name": "xAI: Grok 4 Fast Reasoning"
      },
      {
        "id": "claude-opus-4-1",
        "name": "Anthropic: Claude Opus 4.1"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "hetzner",
    "name": "Hetzner",
    "env": [
      "HETZNER_API_KEY"
    ],
    "api": "https://inference.hetzner.com/api/v1",
    "models": [
      {
        "id": "Qwen3.8-27B",
        "name": "Qwen3.8-27B"
      },
      {
        "id": "Qwen/Qwen3.6-35B-A3B-FP8",
        "name": "Qwen3.6 35B A3B FP8"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "hpc-ai",
    "name": "HPC-AI",
    "env": [
      "HPC_AI_API_KEY"
    ],
    "api": "https://api.hpc-ai.com/inference/v1",
    "models": [
      {
        "id": "zai-org/glm-5.2",
        "name": "GLM-5.2"
      },
      {
        "id": "moonshotai/kimi-k2.7-code",
        "name": "Kimi K2.7 Code"
      },
      {
        "id": "deepseek/deepseek-v4-flash",
        "name": "DeepSeek V4 Flash"
      },
      {
        "id": "deepseek/deepseek-v4-pro",
        "name": "DeepSeek V4 Pro"
      },
      {
        "id": "openai/gpt-5.5",
        "name": "GPT-5.5"
      },
      {
        "id": "anthropic/claude-opus-4.7",
        "name": "Claude Opus 4.7"
      },
      {
        "id": "zai-org/glm-5.1",
        "name": "GLM 5.1"
      },
      {
        "id": "minimax/minimax-m2.5",
        "name": "MiniMax-M2.5"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "huggingface",
    "name": "Hugging Face",
    "env": [
      "HF_TOKEN"
    ],
    "api": "https://router.huggingface.co/v1",
    "models": [
      {
        "id": "deepseek-ai/DeepSeek-V4.1-Flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "tencent/Hy4-preview",
        "name": "Hy4 preview"
      },
      {
        "id": "zai-org/GLM-5.3-Flash",
        "name": "GLM-5.3-Flash"
      },
      {
        "id": "deepseek-ai/DeepSeek-V4-Flash-Vision-Exp",
        "name": "DeepSeek V4 Flash Vision Exp"
      },
      {
        "id": "Qwen/Qwen3.8-27B",
        "name": "Qwen3.8 27B"
      },
      {
        "id": "zai-org/GLM-5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "deepseek-ai/DeepSeek-V4-Pro-0813",
        "name": "DeepSeek V4 Pro 0813"
      },
      {
        "id": "Qwen/Qwen3.8-2.4T-A95B",
        "name": "Qwen3.8 2.4T A95B"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "iflowcn",
    "name": "iFlow",
    "env": [
      "IFLOW_API_KEY"
    ],
    "api": "https://apis.iflow.cn/v1",
    "models": [
      {
        "id": "qwen3-235b-a22b-thinking-2507",
        "name": "Qwen3-235B-A22B-Thinking"
      },
      {
        "id": "deepseek-r1",
        "name": "DeepSeek-R1"
      },
      {
        "id": "glm-4.6",
        "name": "GLM-4.6"
      },
      {
        "id": "qwen3-235b",
        "name": "Qwen3-235B-A22B"
      },
      {
        "id": "kimi-k2-0905",
        "name": "Kimi-K2-0905"
      },
      {
        "id": "qwen3-235b-a22b-instruct",
        "name": "Qwen3-235B-A22B-Instruct"
      },
      {
        "id": "qwen3-coder-plus",
        "name": "Qwen3-Coder-Plus"
      },
      {
        "id": "deepseek-v3.2",
        "name": "DeepSeek-V3.2-Exp"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "impossibl",
    "name": "Impossibl",
    "env": [
      "IMPOSSIBL_API_KEY"
    ],
    "api": "https://api.impossibl.com/v1",
    "models": [
      {
        "id": "google/gemini-3.5-flash-lite",
        "name": "Gemini 3.5 Flash Lite"
      },
      {
        "id": "google/gemini-3.6-flash",
        "name": "Gemini 3.6 Flash"
      },
      {
        "id": "qwen/qwen3.8-max-preview",
        "name": "Qwen3.8 Max Preview"
      },
      {
        "id": "moonshotai/kimi-k3",
        "name": "Kimi K3"
      },
      {
        "id": "thinkingmachines/inkling",
        "name": "Inkling"
      },
      {
        "id": "openai/gpt-5.6-luna",
        "name": "GPT-5.6 Luna"
      },
      {
        "id": "openai/gpt-5.6-sol",
        "name": "GPT-5.6 Sol"
      },
      {
        "id": "openai/gpt-5.6-terra",
        "name": "GPT-5.6 Terra"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "inception",
    "name": "Inception",
    "env": [
      "INCEPTION_API_KEY"
    ],
    "api": "https://api.inceptionlabs.ai/v1/",
    "models": [
      {
        "id": "mercury-2.5",
        "name": "Mercury 2.5"
      },
      {
        "id": "mercury-2",
        "name": "Mercury 2"
      },
      {
        "id": "mercury-edit-2",
        "name": "Mercury Edit 2"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "inceptron",
    "name": "Inceptron",
    "env": [
      "INCEPTRON_API_KEY"
    ],
    "api": "https://api.inceptron.io/v1",
    "models": [
      {
        "id": "deepseek-ai/DeepSeek-V4-Flash-0731",
        "name": "DeepSeek V4 Flash 0731"
      },
      {
        "id": "zai-org/GLM-5.2",
        "name": "GLM 5.2"
      },
      {
        "id": "moonshotai/Kimi-K2.7-Code",
        "name": "Kimi K2.7 Code"
      },
      {
        "id": "moonshotai/Kimi-K2.6",
        "name": "Kimi K2.6"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "inco",
    "name": "Inco",
    "env": [
      "INCO_API_KEY"
    ],
    "api": "https://api.inco.ai/v1",
    "models": [
      {
        "id": "deepseek-v4.1-flash:fast",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "glm-5.3-flash:fast",
        "name": "GLM-5.3-Flash"
      },
      {
        "id": "glm-5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "glm-5.3:fast",
        "name": "GLM-5.3 Fast"
      },
      {
        "id": "kimi-k3:fast",
        "name": "Kimi K3"
      },
      {
        "id": "minimax-m3",
        "name": "MiniMax-M3"
      },
      {
        "id": "minimax-m3:fast",
        "name": "MiniMax M3 Fast"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "infer",
    "name": "Infer by Flow7",
    "env": [
      "INFER_API_KEY"
    ],
    "api": "https://infer.flow7.org/v1",
    "models": [
      {
        "id": "infer/gpt-6-astra:official",
        "name": "GPT-6 Astra (Official API)"
      },
      {
        "id": "infer/gpt-5.6-sol:official",
        "name": "GPT-5.6 Sol (Official API)"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "inference",
    "name": "Inference",
    "env": [
      "INFERENCE_API_KEY"
    ],
    "api": "https://inference.net/v1",
    "models": [
      {
        "id": "google/gemma-3",
        "name": "Google Gemma 3"
      },
      {
        "id": "meta/llama-3.1-8b-instruct",
        "name": "Llama 3.1 8B Instruct"
      },
      {
        "id": "meta/llama-3.2-11b-vision-instruct",
        "name": "Llama 3.2 11B Vision Instruct"
      },
      {
        "id": "meta/llama-3.2-1b-instruct",
        "name": "Llama 3.2 1B Instruct"
      },
      {
        "id": "meta/llama-3.2-3b-instruct",
        "name": "Llama 3.2 3B Instruct"
      },
      {
        "id": "mistral/mistral-nemo-12b-instruct",
        "name": "Mistral Nemo 12B Instruct"
      },
      {
        "id": "osmosis/osmosis-structure-0.6b",
        "name": "Osmosis Structure 0.6B"
      },
      {
        "id": "qwen/qwen-2.5-7b-vision-instruct",
        "name": "Qwen 2.5 7B Vision Instruct"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "inferx",
    "name": "InferX",
    "env": [
      "INFERX_API_KEY"
    ],
    "api": "https://model.inferx.net/endpoints/v1",
    "models": [
      {
        "id": "Agents-A1",
        "name": "Agents-A1"
      },
      {
        "id": "Ornith-1.0-35B-FP8",
        "name": "Ornith-1.0-35B-FP8"
      },
      {
        "id": "deepseek-v4-flash",
        "name": "deepseek-v4-flash"
      },
      {
        "id": "mimo-v25",
        "name": "mimo-v25"
      },
      {
        "id": "Qwen3.6-27B-FP8",
        "name": "Qwen3.6 27B FP8"
      },
      {
        "id": "Qwen3.6-35B-A3B-FP8",
        "name": "Qwen3.6 35B A3B FP8"
      },
      {
        "id": "gemma-4-31B-it-fp8",
        "name": "Gemma 4 31B IT FP8"
      },
      {
        "id": "Qwen3.6-35B-A3B-fp8-no-thinking",
        "name": "Qwen3.6-35B-A3B-fp8-no-thinking"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "infomaniak",
    "name": "Infomaniak",
    "env": [
      "INFOMANIAK_API_KEY",
      "INFOMANIAK_PRODUCT_ID"
    ],
    "api": "https://api.infomaniak.com/2/ai/${INFOMANIAK_PRODUCT_ID}/openai/v1",
    "models": [
      {
        "id": "moonshotai/Kimi-K2.6",
        "name": "Kimi K2.6"
      },
      {
        "id": "google/gemma-4-31B-it",
        "name": "Gemma 4 31B IT"
      },
      {
        "id": "mistralai/Mistral-Small-4-119B-2603",
        "name": "Mistral Small 4"
      },
      {
        "id": "Qwen/Qwen3.5-122B-A10B-FP8",
        "name": "Qwen3.5 122B-A10B FP8"
      },
      {
        "id": "Qwen/Qwen3.5-397B-A17B-FP8",
        "name": "Qwen3.5 397B-A17B FP8"
      },
      {
        "id": "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-FP8",
        "name": "Nemotron 3 Nano 30B A3B FP8"
      },
      {
        "id": "swiss-ai/Apertus-v1.5-70B",
        "name": "Apertus v1.5 70B"
      },
      {
        "id": "mistralai/Ministral-3-14B-Instruct-2512",
        "name": "Ministral 3 14B Instruct"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "io-net",
    "name": "IO.NET",
    "env": [
      "IOINTELLIGENCE_API_KEY"
    ],
    "api": "https://api.intelligence.io.solutions/api/v1",
    "models": [
      {
        "id": "Qwen/Qwen3-235B-A22B-Thinking-2507",
        "name": "Qwen 3 235B Thinking"
      },
      {
        "id": "deepseek-ai/DeepSeek-R1-0528",
        "name": "DeepSeek R1"
      },
      {
        "id": "moonshotai/Kimi-K2-Thinking",
        "name": "Kimi K2 Thinking"
      },
      {
        "id": "mistralai/Magistral-Small-2506",
        "name": "Magistral Small 2506"
      },
      {
        "id": "mistralai/Devstral-Small-2505",
        "name": "Devstral Small 2505"
      },
      {
        "id": "Intel/Qwen3-Coder-480B-A35B-Instruct-int4-mixed-ar",
        "name": "Qwen 3 Coder 480B"
      },
      {
        "id": "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
        "name": "Llama 4 Maverick 17B 128E Instruct"
      },
      {
        "id": "Qwen/Qwen3-Next-80B-A3B-Instruct",
        "name": "Qwen 3 Next 80B Instruct"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "iteracompute",
    "name": "IteraCompute",
    "env": [
      "ITERACOMPUTE_API_KEY"
    ],
    "api": "https://api.iteracompute.com/v1",
    "models": [
      {
        "id": "z-ai/glm-5.3-flash",
        "name": "GLM-5.3-Flash"
      },
      {
        "id": "ornith-ai/ornith-1.5-35b-a3b",
        "name": "Ornith 1.5 35B A3B"
      },
      {
        "id": "qwen/qwen3.8-27b",
        "name": "Qwen3.8 27B"
      },
      {
        "id": "z-ai/glm-5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "deepseek/deepseek-v4-pro-0813",
        "name": "DeepSeek V4 Pro 0813"
      },
      {
        "id": "qwen/qwen3.8-2.4t-a95b",
        "name": "Qwen3.8 2.4T A95B"
      },
      {
        "id": "deepseek/deepseek-v4-flash-0731",
        "name": "DeepSeek V4 Flash 0731"
      },
      {
        "id": "moonshotai/kimi-k3",
        "name": "Kimi K3"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "jalapeno",
    "name": "Jalapeno Cloud",
    "env": [
      "JALAPENO_API_KEY"
    ],
    "api": "https://api.jalapeno-cloud.ai/v1",
    "models": [
      {
        "id": "Kimi-K3",
        "name": "Kimi K3"
      },
      {
        "id": "Hy3",
        "name": "Hy3"
      },
      {
        "id": "GLM-5.2",
        "name": "GLM-5.2"
      },
      {
        "id": "Kimi-K2.7-Code",
        "name": "Kimi K2.7 Code"
      },
      {
        "id": "MiniMax-M3",
        "name": "MiniMax-M3"
      },
      {
        "id": "DeepSeek-V4-Flash",
        "name": "DeepSeek V4 Flash"
      },
      {
        "id": "DeepSeek-V4-Pro",
        "name": "DeepSeek V4 Pro"
      },
      {
        "id": "GLM-5.1",
        "name": "GLM-5.1"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "jiekou",
    "name": "Jiekou.AI",
    "env": [
      "JIEKOU_API_KEY"
    ],
    "api": "https://api.jiekou.ai/openai",
    "models": [
      {
        "id": "claude-opus-4-6",
        "name": "claude-opus-4-6"
      },
      {
        "id": "gpt-5.1",
        "name": "gpt-5.1"
      },
      {
        "id": "baidu/ernie-4.5-vl-424b-a47b",
        "name": "ERNIE 4.5 VL 424B A47B"
      },
      {
        "id": "deepseek/deepseek-r1-0528",
        "name": "DeepSeek R1 0528"
      },
      {
        "id": "deepseek/deepseek-v3.1",
        "name": "DeepSeek V3.1"
      },
      {
        "id": "gemini-2.5-flash",
        "name": "gemini-2.5-flash"
      },
      {
        "id": "gemini-2.5-flash-lite",
        "name": "gemini-2.5-flash-lite"
      },
      {
        "id": "gemini-2.5-flash-lite-preview-06-17",
        "name": "gemini-2.5-flash-lite-preview-06-17"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "kenari",
    "name": "Kenari",
    "env": [
      "KENARI_API_KEY"
    ],
    "api": "https://kenari.id/v1",
    "models": [
      {
        "id": "deepseek-v4-1-flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "glm-5-3-flash",
        "name": "GLM-5.3-Flash"
      },
      {
        "id": "glm-5-3",
        "name": "GLM-5.3"
      },
      {
        "id": "gemini-3-7-flash",
        "name": "Gemini 3.7 Flash"
      },
      {
        "id": "grok-4-6",
        "name": "Grok 4.6"
      },
      {
        "id": "qwen3-8-max",
        "name": "Qwen3.8 Max"
      },
      {
        "id": "claude-opus-5",
        "name": "Claude Opus 5"
      },
      {
        "id": "gemini-3-6-flash",
        "name": "Gemini 3.6 Flash"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "kilo",
    "name": "Kilo Gateway",
    "env": [
      "KILO_API_KEY"
    ],
    "api": "https://api.kilo.ai/api/gateway",
    "models": [
      {
        "id": "openai/gpt-6.1-sol",
        "name": "GPT-6.1 Sol"
      },
      {
        "id": "openai/gpt-6.1-sol-pro",
        "name": "OpenAI: GPT-6.1 Sol Pro"
      },
      {
        "id": "anthropic/claude-sonnet-5.5",
        "name": "Claude Sonnet 5.5"
      },
      {
        "id": "perceptron/perceptron-mk1.5",
        "name": "Perceptron: Perceptron Mk1.5"
      },
      {
        "id": "fireworks/ember-1",
        "name": "Fireworks: Ember-1"
      },
      {
        "id": "aion-labs/aion-3.5",
        "name": "AionLabs: Aion 3.5"
      },
      {
        "id": "aion-labs/aion-3.5-mini",
        "name": "AionLabs: Aion 3.5 Mini"
      },
      {
        "id": "qwen/qwen3.8-max-prime",
        "name": "Qwen 3.8 Max Prime"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "kimi-code-plan-global",
    "name": "Kimi For Coding (kimi.ai)",
    "env": [
      "KIMI_API_KEY"
    ],
    "api": "https://api.kimi.ai/coding/v1",
    "models": [
      {
        "id": "kimi-for-coding",
        "name": "kimi-for-coding"
      },
      {
        "id": "k3",
        "name": "Kimi K3"
      },
      {
        "id": "k3-256k",
        "name": "Kimi K3-256K"
      },
      {
        "id": "kimi-for-coding-highspeed",
        "name": "Kimi For Coding HighSpeed"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "kimi-code-plan-cn",
    "name": "Kimi For Coding (kimi.com)",
    "env": [
      "KIMI_API_KEY"
    ],
    "api": "https://api.kimi.com/coding/v1",
    "models": [
      {
        "id": "kimi-for-coding",
        "name": "kimi-for-coding"
      },
      {
        "id": "k3",
        "name": "Kimi K3"
      },
      {
        "id": "k3-256k",
        "name": "Kimi K3-256K"
      },
      {
        "id": "kimi-for-coding-highspeed",
        "name": "Kimi For Coding HighSpeed"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "klokintegration",
    "name": "klokintegration.se",
    "env": [
      "KLOKINTEGRATION_API_KEY"
    ],
    "api": "https://api-gw.klok.ipaas.se/proxy/kloker-key/v1",
    "models": [
      {
        "id": "Kloker",
        "name": "Kloker"
      },
      {
        "id": "Kloker-Integration-Architect",
        "name": "Kloker Integration Architect"
      },
      {
        "id": "Kloker-Integration-Developer",
        "name": "Kloker Integration Developer"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "kosmik",
    "name": "Kosmik Compute",
    "env": [
      "KOSMIK_API_KEY"
    ],
    "api": "https://api.koscompute.com/v1",
    "models": [
      {
        "id": "qwen/qwen3.8-27b",
        "name": "Qwen3.8 27B"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "kuae-cloud-coding-plan",
    "name": "KUAE Cloud Coding Plan",
    "env": [
      "KUAE_API_KEY"
    ],
    "api": "https://coding-plan-endpoint.kuaecloud.net/v1",
    "models": [
      {
        "id": "GLM-4.7",
        "name": "GLM-4.7"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "lilac",
    "name": "Lilac",
    "env": [
      "LILAC_API_KEY"
    ],
    "api": "https://api.getlilac.com/v1",
    "models": [
      {
        "id": "zai-org/glm-5.2",
        "name": "GLM 5.2"
      },
      {
        "id": "minimaxai/minimax-m3",
        "name": "MiniMax M3"
      },
      {
        "id": "moonshotai/kimi-k2.6",
        "name": "Kimi K2.6"
      },
      {
        "id": "google/gemma-4-31b-it",
        "name": "Gemma 4 31B IT"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "llama",
    "name": "Llama",
    "env": [
      "LLAMA_API_KEY"
    ],
    "api": "https://api.llama.com/compat/v1/",
    "models": [
      {
        "id": "cerebras-llama-4-maverick-17b-128e-instruct",
        "name": "Cerebras-Llama-4-Maverick-17B-128E-Instruct"
      },
      {
        "id": "cerebras-llama-4-scout-17b-16e-instruct",
        "name": "Cerebras-Llama-4-Scout-17B-16E-Instruct"
      },
      {
        "id": "groq-llama-4-maverick-17b-128e-instruct",
        "name": "Groq-Llama-4-Maverick-17B-128E-Instruct"
      },
      {
        "id": "llama-4-maverick-17b-128e-instruct-fp8",
        "name": "Llama-4-Maverick-17B-128E-Instruct-FP8"
      },
      {
        "id": "llama-4-scout-17b-16e-instruct-fp8",
        "name": "Llama-4-Scout-17B-16E-Instruct-FP8"
      },
      {
        "id": "llama-3.3-70b-instruct",
        "name": "Llama-3.3-70B-Instruct"
      },
      {
        "id": "llama-3.3-8b-instruct",
        "name": "Llama-3.3-8B-Instruct"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "llmgateway-providers",
    "name": "LLM Gateway",
    "env": [
      "LLMGATEWAY_API_KEY"
    ],
    "api": "https://api.llmgateway.io/v1",
    "models": [
      {
        "id": "openai/gpt-6.1-sol",
        "name": "GPT-6.1 Sol (OpenAI)"
      },
      {
        "id": "anthropic/claude-sonnet-5-5",
        "name": "Claude Sonnet 5.5 (Anthropic)"
      },
      {
        "id": "anthropic/claude-opus-5-5",
        "name": "Claude Opus 5.5 (Anthropic)"
      },
      {
        "id": "azure/gpt-6-luna",
        "name": "GPT-6 Luna (Azure)"
      },
      {
        "id": "azure/gpt-6-sol",
        "name": "GPT-6 Sol (Azure)"
      },
      {
        "id": "deepinfra/mimo-v2.6-flash",
        "name": "MiMo V2.6 Flash (DeepInfra)"
      },
      {
        "id": "deepinfra/mimo-v2.6-pro",
        "name": "MiMo V2.6 Pro (DeepInfra)"
      },
      {
        "id": "openai/gpt-6-luna",
        "name": "GPT-6 Luna (OpenAI)"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "llmtech",
    "name": "LLM Tech",
    "env": [
      "LLMTECH_API_KEY"
    ],
    "api": "https://api.llmtech.eu/v1",
    "models": [
      {
        "id": "nvidia/Qwen3.8-27B-NVFP4",
        "name": "Qwen3.8 27B"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "llmtr",
    "name": "LLMTR",
    "env": [
      "LLMTR_API_KEY"
    ],
    "api": "https://llmtr.com/v1",
    "models": [
      {
        "id": "muse-glimmer-30b-tr",
        "name": "Muse Glimmer 30B (TR)"
      },
      {
        "id": "upstage/solar-pro4",
        "name": "Solar Pro 4"
      },
      {
        "id": "meta/muse-spark-1.2-contributor",
        "name": "Muse Spark 1.2 Contributor"
      },
      {
        "id": "thinkingmachines/inkling-small",
        "name": "Inkling Small"
      },
      {
        "id": "thinkingmachines/inkling",
        "name": "Inkling"
      },
      {
        "id": "poolside/laguna-xs-2.1",
        "name": "Laguna XS 2.1"
      },
      {
        "id": "sakana/fugu-ultra",
        "name": "Fugu Ultra"
      },
      {
        "id": "qwen/qwen3.7-plus",
        "name": "Qwen3.7 Plus"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "lmstudio",
    "name": "LMStudio",
    "env": [
      "LMSTUDIO_API_KEY"
    ],
    "api": "http://127.0.0.1:1234/v1",
    "models": [
      {
        "id": "openai/gpt-oss-20b",
        "name": "GPT OSS 20B"
      },
      {
        "id": "qwen/qwen3-30b-a3b-2507",
        "name": "Qwen3 30B A3B 2507"
      },
      {
        "id": "qwen/qwen3-coder-30b",
        "name": "Qwen3 Coder 30B"
      }
    ],
    "note": "",
    "local": true
  },
  {
    "id": "longcat",
    "name": "LongCat",
    "env": [
      "LONGCAT_API_KEY"
    ],
    "api": "https://api.longcat.chat/openai",
    "models": [
      {
        "id": "LongCat-2.0",
        "name": "LongCat-2.0"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "lucidquery",
    "name": "LucidQuery",
    "env": [
      "LUCIDQUERY_API_KEY"
    ],
    "api": "https://api.lucidquery.com/v1",
    "models": [
      {
        "id": "lucidquery-agi-01-frontier",
        "name": "AGI-01 Frontier"
      },
      {
        "id": "lucidquery-agi-01-swift",
        "name": "AGI-01 Swift"
      },
      {
        "id": "lucidquery-nexus-coder",
        "name": "LucidQuery Nexus Coder"
      },
      {
        "id": "lucidnova-rf1-100b",
        "name": "LucidNova RF1 100B"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "lynkr",
    "name": "Lynkr",
    "env": [
      "LYNKR_API_KEY"
    ],
    "api": "http://127.0.0.1:8081/v1",
    "models": [
      {
        "id": "lynkr-auto",
        "name": "Lynkr Auto (complexity routing)"
      }
    ],
    "note": "",
    "local": true
  },
  {
    "id": "meganova",
    "name": "Meganova",
    "env": [
      "MEGANOVA_API_KEY"
    ],
    "api": "https://api.meganova.ai/v1",
    "models": [
      {
        "id": "MiniMaxAI/MiniMax-M2.5",
        "name": "MiniMax M2.5"
      },
      {
        "id": "zai-org/GLM-5",
        "name": "GLM-5"
      },
      {
        "id": "Qwen/Qwen3.5-Plus",
        "name": "Qwen3.5 Plus"
      },
      {
        "id": "moonshotai/Kimi-K2.5",
        "name": "Kimi K2.5"
      },
      {
        "id": "MiniMaxAI/MiniMax-M2.1",
        "name": "MiniMax M2.1"
      },
      {
        "id": "zai-org/GLM-4.7",
        "name": "GLM-4.7"
      },
      {
        "id": "XiaomiMiMo/MiMo-V2-Flash",
        "name": "MiMo V2 Flash"
      },
      {
        "id": "moonshotai/Kimi-K2-Thinking",
        "name": "Kimi K2 Thinking"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "melious",
    "name": "Melious",
    "env": [
      "MELIOUS_API_KEY"
    ],
    "api": "https://api.melious.ai/v1",
    "models": [
      {
        "id": "deepseek-v4.1-flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "glm-5.3-flash",
        "name": "GLM-5.3-Flash"
      },
      {
        "id": "glm-5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "deepseek-v4-flash-0731",
        "name": "DeepSeek V4 Flash 0731"
      },
      {
        "id": "kimi-k3",
        "name": "Kimi K3"
      },
      {
        "id": "kimi-k2.7-code",
        "name": "Kimi K2.7 Code"
      },
      {
        "id": "kimi-k2.6",
        "name": "Kimi K2.6"
      },
      {
        "id": "glm-5.1",
        "name": "GLM-5.1"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "meta",
    "name": "Meta",
    "env": [
      "META_MODEL_API_KEY"
    ],
    "api": "https://api.meta.ai/v1",
    "models": [
      {
        "id": "muse-spark-1.3",
        "name": "Muse Spark 1.3"
      },
      {
        "id": "muse-spark-1.3-contributor",
        "name": "Muse Spark 1.3 Contributor"
      },
      {
        "id": "muse-spark-1.2",
        "name": "Muse Spark 1.2"
      },
      {
        "id": "muse-spark-1.2-contributor",
        "name": "Muse Spark 1.2 Contributor"
      },
      {
        "id": "muse-spark-1.1",
        "name": "Muse Spark 1.1"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "mixlayer",
    "name": "Mixlayer",
    "env": [
      "MIXLAYER_API_KEY"
    ],
    "api": "https://models.mixlayer.ai/v1",
    "models": [
      {
        "id": "qwen/qwen3.5-122b-a10b",
        "name": "Qwen3.5 122B A10B"
      },
      {
        "id": "qwen/qwen3.5-27b",
        "name": "Qwen3.5 27B"
      },
      {
        "id": "qwen/qwen3.5-35b-a3b",
        "name": "Qwen3.5 35B A3B"
      },
      {
        "id": "qwen/qwen3.5-397b-a17b",
        "name": "Qwen3.5 397B A17B"
      },
      {
        "id": "qwen/qwen3.5-9b",
        "name": "Qwen3.5 9B"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "moark",
    "name": "Moark",
    "env": [
      "MOARK_API_KEY"
    ],
    "api": "https://moark.com/v1",
    "models": [
      {
        "id": "MiniMax-M2.1",
        "name": "MiniMax-M2.1"
      },
      {
        "id": "GLM-4.7",
        "name": "GLM-4.7"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "modal",
    "name": "Modal",
    "env": [
      "MODAL_PROXY_TOKEN"
    ],
    "api": "https://inference.us-west.modal.direct/v1",
    "models": [
      {
        "id": "zai-org/GLM-5.3-Flash",
        "name": "GLM 5.3 Flash"
      },
      {
        "id": "Qwen/Qwen3.8-2.4T-A95B",
        "name": "Qwen3.8-Max"
      },
      {
        "id": "moonshotai/Kimi-K3",
        "name": "Kimi K3"
      },
      {
        "id": "thinkingmachines/Inkling-NVFP4",
        "name": "Inkling"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "model-oracle-ai",
    "name": "Model Oracle AI",
    "env": [
      "MODEL_ORACLE_API_KEY"
    ],
    "api": "https://api.modeloracle.com/api/v1",
    "models": [
      {
        "id": "claude-sonnet-5",
        "name": "Claude Sonnet 5"
      },
      {
        "id": "auto",
        "name": "Auto"
      },
      {
        "id": "glm-5.2",
        "name": "GLM-5.2"
      },
      {
        "id": "claude-fable-5",
        "name": "Claude Fable 5"
      },
      {
        "id": "claude-opus-4.8",
        "name": "Claude Opus 4.8"
      },
      {
        "id": "deepseek-v4-pro",
        "name": "DeepSeek V4 Pro"
      },
      {
        "id": "gpt-5.5",
        "name": "GPT-5.5"
      },
      {
        "id": "gpt-5.4-mini",
        "name": "GPT-5.4 mini"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "modelis",
    "name": "Modelis",
    "env": [
      "MODELIS_API_KEY"
    ],
    "api": "https://modelishub.com/v1",
    "models": [
      {
        "id": "claude-fable-5",
        "name": "Claude Fable 5"
      },
      {
        "id": "qwen/qwen3.7-plus",
        "name": "Qwen3.7 Plus"
      },
      {
        "id": "claude-opus-4-8",
        "name": "Claude Opus 4.8"
      },
      {
        "id": "qwen/qwen3.7-max",
        "name": "Qwen3.7 Max"
      },
      {
        "id": "deepseek-v4-flash",
        "name": "DeepSeek V4 Flash"
      },
      {
        "id": "deepseek-v4-pro",
        "name": "DeepSeek V4 Pro"
      },
      {
        "id": "claude-sonnet-4-6",
        "name": "Claude Sonnet 4.6"
      },
      {
        "id": "gemini-2.5-flash",
        "name": "Gemini 2.5 Flash"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "modelscope",
    "name": "ModelScope",
    "env": [
      "MODELSCOPE_API_KEY"
    ],
    "api": "https://api-inference.modelscope.cn/v1",
    "models": [
      {
        "id": "ZhipuAI/GLM-4.6",
        "name": "GLM-4.6"
      },
      {
        "id": "Qwen/Qwen3-30B-A3B-Thinking-2507",
        "name": "Qwen3 30B A3B Thinking 2507"
      },
      {
        "id": "ZhipuAI/GLM-4.5",
        "name": "GLM-4.5"
      },
      {
        "id": "Qwen/Qwen3-235B-A22B-Thinking-2507",
        "name": "Qwen3-235B-A22B-Thinking-2507"
      },
      {
        "id": "Qwen/Qwen3-Coder-30B-A3B-Instruct",
        "name": "Qwen3 Coder 30B A3B Instruct"
      },
      {
        "id": "Qwen/Qwen3-30B-A3B-Instruct-2507",
        "name": "Qwen3 30B A3B Instruct 2507"
      },
      {
        "id": "Qwen/Qwen3-235B-A22B-Instruct-2507",
        "name": "Qwen3 235B A22B Instruct 2507"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "moonshotai",
    "name": "Moonshot AI",
    "env": [
      "MOONSHOT_API_KEY"
    ],
    "api": "https://api.moonshot.ai/v1",
    "models": [
      {
        "id": "kimi-k3",
        "name": "Kimi K3"
      },
      {
        "id": "kimi-k2.7-code",
        "name": "Kimi K2.7 Code"
      },
      {
        "id": "kimi-k2.7-code-highspeed",
        "name": "Kimi K2.7 Code HighSpeed"
      },
      {
        "id": "kimi-k2.6",
        "name": "Kimi K2.6"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "moonshotai-cn",
    "name": "Moonshot AI (China)",
    "env": [
      "MOONSHOT_API_KEY"
    ],
    "api": "https://api.moonshot.cn/v1",
    "models": [
      {
        "id": "kimi-k3",
        "name": "Kimi K3"
      },
      {
        "id": "kimi-k2.7-code",
        "name": "Kimi K2.7 Code"
      },
      {
        "id": "kimi-k2.7-code-highspeed",
        "name": "Kimi K2.7 Code HighSpeed"
      },
      {
        "id": "kimi-k2.6",
        "name": "Kimi K2.6"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "morph",
    "name": "Morph",
    "env": [
      "MORPH_API_KEY"
    ],
    "api": "https://api.morphllm.com/v1",
    "models": [
      {
        "id": "morph-v3-fast",
        "name": "Morph v3 Fast"
      },
      {
        "id": "morph-v3-large",
        "name": "Morph v3 Large"
      },
      {
        "id": "auto",
        "name": "Auto"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "nan",
    "name": "NaN",
    "env": [
      "NAN_API_KEY"
    ],
    "api": "https://api.nan.builders/v1",
    "models": [
      {
        "id": "mimo-v2.6-flash",
        "name": "MiMo-V2.6-Flash"
      },
      {
        "id": "deepseek-v4-flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "glm5.3-flash",
        "name": "GLM-5.3-Flash"
      },
      {
        "id": "qwen3.8-flash",
        "name": "Qwen3.8 Flash"
      },
      {
        "id": "glm5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "qwen3.6",
        "name": "Qwen3.6 35B-A3B"
      },
      {
        "id": "gemma4",
        "name": "Gemma 4 26B A4B IT"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "nano-gpt",
    "name": "NanoGPT",
    "env": [
      "NANO_GPT_API_KEY"
    ],
    "api": "https://nano-gpt.com/api/v1",
    "models": [
      {
        "id": "inclusionai/ling-3.1-flash",
        "name": "Ling 3.1 Flash"
      },
      {
        "id": "openai/gpt-6.1-sol",
        "name": "GPT 6.1 Sol"
      },
      {
        "id": "openai/gpt-6.1-sol-pro",
        "name": "GPT 6.1 Sol Pro"
      },
      {
        "id": "anthropic/claude-sonnet-5.5",
        "name": "Claude Sonnet 5.5"
      },
      {
        "id": "anthropic/claude-sonnet-5.5:thinking",
        "name": "Claude Sonnet 5.5 Thinking"
      },
      {
        "id": "heabsy/cyberheabsy",
        "name": "CyberHeabsy"
      },
      {
        "id": "xiaomi/mimo-v2.6-flash-uncensored:thinking",
        "name": "MiMo V2.6 Flash Uncensored Thinking"
      },
      {
        "id": "z-ai/glm-5.3-uncensored",
        "name": "GLM 5.3 Uncensored"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "nearai",
    "name": "NEAR AI Cloud",
    "env": [
      "NEARAI_API_KEY"
    ],
    "api": "https://cloud-api.near.ai/v1",
    "models": [
      {
        "id": "google/gemini-3.5-flash",
        "name": "Gemini 3.5 Flash"
      },
      {
        "id": "google/gemini-3.1-flash-lite",
        "name": "Gemini 3.1 Flash Lite"
      },
      {
        "id": "openai/gpt-5.5",
        "name": "GPT-5.5"
      },
      {
        "id": "Qwen/Qwen3.6-35B-A3B-FP8",
        "name": "Qwen 3.6 35B A3B FP8"
      },
      {
        "id": "anthropic/claude-opus-4-7",
        "name": "Claude Opus 4.7"
      },
      {
        "id": "zai-org/GLM-5.1-FP8",
        "name": "GLM-5.1 FP8"
      },
      {
        "id": "openai/gpt-5.4-mini",
        "name": "GPT-5.4 mini"
      },
      {
        "id": "openai/gpt-5.4-nano",
        "name": "GPT-5.4 nano"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "nebius",
    "name": "Nebius Token Factory",
    "env": [
      "NEBIUS_API_KEY"
    ],
    "api": "https://api.tokenfactory.nebius.com/v1",
    "models": [
      {
        "id": "deepseek-ai/DeepSeek-V4.1-Flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "zai-org/GLM-5.3-Flash",
        "name": "GLM-5.3-Flash"
      },
      {
        "id": "Qwen/Qwen3.8-27B",
        "name": "Qwen3.8 27B"
      },
      {
        "id": "zai-org/GLM-5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "deepseek-ai/DeepSeek-V4-Pro-0813",
        "name": "DeepSeek V4 Pro 0813"
      },
      {
        "id": "nvidia/Nemotron-3_5-Lightning",
        "name": "Nemotron 3.5 Lightning 30B A3B"
      },
      {
        "id": "deepseek-ai/DeepSeek-V4-Flash-0731",
        "name": "DeepSeek V4 Flash 0731"
      },
      {
        "id": "moonshotai/Kimi-K3",
        "name": "Kimi K3"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "neon",
    "name": "Neon",
    "env": [
      "NEON_AI_GATEWAY_BASE_URL",
      "NEON_AI_GATEWAY_TOKEN"
    ],
    "api": "${NEON_AI_GATEWAY_BASE_URL}/v1",
    "models": [
      {
        "id": "gpt-6-astra",
        "name": "GPT-6 Astra"
      },
      {
        "id": "claude-fable-5-1",
        "name": "Claude Fable 5.1"
      },
      {
        "id": "glm-5-3-flash",
        "name": "GLM-5.3 Flash"
      },
      {
        "id": "grok-4-6",
        "name": "Grok 4.6"
      },
      {
        "id": "claude-opus-5",
        "name": "Claude Opus 5"
      },
      {
        "id": "gemini-3-5-flash-lite",
        "name": "Gemini 3.5 Flash Lite"
      },
      {
        "id": "gemini-3-6-flash",
        "name": "Gemini 3.6 Flash"
      },
      {
        "id": "kimi-k3",
        "name": "Kimi K3"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "neosmith",
    "name": "NeoSmith",
    "env": [
      "NEOSMITH_API_KEY"
    ],
    "api": "https://router.neosmith.ai/v1",
    "models": [
      {
        "id": "neosmith.intelligent-maestro",
        "name": "NeoSmith Maestro"
      },
      {
        "id": "neosmith.neolite",
        "name": "NeoSmith NeoLite"
      },
      {
        "id": "neosmith.intelligent-basic",
        "name": "NeoSmith Basic"
      },
      {
        "id": "neosmith.intelligent-pro",
        "name": "NeoSmith Pro"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "neuralwatt",
    "name": "Neuralwatt",
    "env": [
      "NEURALWATT_API_KEY"
    ],
    "api": "https://api.neuralwatt.com/v1",
    "models": [
      {
        "id": "deepseek-v4.1-flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "deepseek-v4.1-flash-flex",
        "name": "DeepSeek V4.1 Flash Flex"
      },
      {
        "id": "glm-5.3-flash",
        "name": "GLM-5.3 Flash"
      },
      {
        "id": "glm-5.3-flash-flex",
        "name": "GLM-5.3 Flash Flex"
      },
      {
        "id": "glm-5.3",
        "name": "GLM 5.3"
      },
      {
        "id": "glm-5.3-flex",
        "name": "GLM 5.3 Flex"
      },
      {
        "id": "qwen-3.8-27b",
        "name": "Qwen3.8 27B"
      },
      {
        "id": "qwen-3.8-27b-flex",
        "name": "Qwen3.8 27B Flex"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "nova",
    "name": "Nova",
    "env": [
      "NOVA_API_KEY"
    ],
    "api": "https://api.nova.amazon.com/v1",
    "models": [
      {
        "id": "nova-2-pro-v1",
        "name": "Nova 2 Pro"
      },
      {
        "id": "nova-2-lite-v1",
        "name": "Nova 2 Lite"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "novita-ai",
    "name": "NovitaAI",
    "env": [
      "NOVITA_API_KEY"
    ],
    "api": "https://api.novita.ai/openai",
    "models": [
      {
        "id": "moonshotai/kimi-k3",
        "name": "Kimi K3"
      },
      {
        "id": "zai-org/glm-5.2",
        "name": "GLM-5.2"
      },
      {
        "id": "moonshotai/kimi-k2.7-code",
        "name": "Kimi K2.7 Code"
      },
      {
        "id": "qwen/qwen3.7-max",
        "name": "Qwen3.7-Max"
      },
      {
        "id": "inclusionai/ring-2.6-1t",
        "name": "Ring-2.6-1T"
      },
      {
        "id": "deepseek/deepseek-v4-flash",
        "name": "DeepSeek V4 Flash"
      },
      {
        "id": "deepseek/deepseek-v4-pro",
        "name": "DeepSeek V4 Pro"
      },
      {
        "id": "xiaomimimo/mimo-v2.5-pro",
        "name": "MiMo-V2.5-Pro"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "nvidia",
    "name": "Nvidia",
    "env": [
      "NVIDIA_API_KEY"
    ],
    "api": "https://integrate.api.nvidia.com/v1",
    "models": [
      {
        "id": "z-ai/glm-5.3-flash",
        "name": "GLM-5.3-Flash"
      },
      {
        "id": "z-ai/glm-5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "deepseek-ai/deepseek-v4-pro-0813",
        "name": "DeepSeek V4 Pro 0813"
      },
      {
        "id": "nvidia/nemotron-3.5-lightning-30b-a3b",
        "name": "Nemotron 3.5 Lightning 30B A3B"
      },
      {
        "id": "meta/muse-glimmer-30b",
        "name": "Muse Glimmer 30B"
      },
      {
        "id": "deepseek-ai/deepseek-v4-flash-0731",
        "name": "DeepSeek V4 Flash 0731"
      },
      {
        "id": "moonshotai/kimi-k3",
        "name": "Kimi K3"
      },
      {
        "id": "thinkingmachines/inkling",
        "name": "Inkling"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "oci",
    "name": "OCI Generative AI",
    "env": [
      "OCI_GENAI_API_KEY"
    ],
    "api": "https://inference.generativeai.us-chicago-1.oci.oraclecloud.com/openai/v1",
    "models": [
      {
        "id": "xai.grok-4.6",
        "name": "Grok 4.6"
      },
      {
        "id": "xai.grok-4.3",
        "name": "Grok 4.3"
      },
      {
        "id": "xai.grok-4.20-reasoning",
        "name": "Grok 4.20 (Reasoning)"
      },
      {
        "id": "openai.gpt-oss-120b",
        "name": "GPT OSS 120B"
      },
      {
        "id": "openai.gpt-oss-20b",
        "name": "GPT OSS 20B"
      },
      {
        "id": "xai.grok-4.20-non-reasoning",
        "name": "Grok 4.20 (Non-Reasoning)"
      },
      {
        "id": "meta.llama-4-maverick-17b-128e-instruct-fp8",
        "name": "Llama 4 Maverick 17B Instruct"
      },
      {
        "id": "meta.llama-4-scout-17b-16e-instruct",
        "name": "Llama 4 Scout 17B Instruct"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "ofox",
    "name": "Ofox",
    "env": [
      "OFOX_API_KEY"
    ],
    "api": "https://api.ofox.ai/v1",
    "models": [
      {
        "id": "anthropic/claude-sonnet-5.5",
        "name": "Claude Sonnet 5.5"
      },
      {
        "id": "anthropic/claude-opus-5.5",
        "name": "Claude Opus 5.5"
      },
      {
        "id": "openai/gpt-6-luna",
        "name": "GPT-6 Luna"
      },
      {
        "id": "openai/gpt-6-sol",
        "name": "GPT-6 Sol"
      },
      {
        "id": "x-ai/grok-4.7",
        "name": "Grok 4.7"
      },
      {
        "id": "z-ai/glm-5.3-flashx",
        "name": "GLM-5.3-FlashX"
      },
      {
        "id": "deepseek/deepseek-v4.1-flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "openai/gpt-6-astra",
        "name": "GPT-6 Astra"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "ollama-cloud",
    "name": "Ollama Cloud",
    "env": [
      "OLLAMA_API_KEY"
    ],
    "api": "https://ollama.com/v1",
    "models": [
      {
        "id": "deepseek-v4.1-flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "glm-5.3-flash",
        "name": "GLM-5.3-Flash"
      },
      {
        "id": "glm-5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "deepseek-v4-pro:0813",
        "name": "DeepSeek V4 Pro 0813"
      },
      {
        "id": "deepseek-v4-flash:0731",
        "name": "DeepSeek V4 Flash 0731"
      },
      {
        "id": "kimi-k3",
        "name": "kimi-k3"
      },
      {
        "id": "glm-5.2",
        "name": "GLM-5.2"
      },
      {
        "id": "kimi-k2.7-code",
        "name": "kimi-k2.7-code"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "opencode-go",
    "name": "OpenCode Go",
    "env": [
      "OPENCODE_API_KEY"
    ],
    "api": "https://opencode.ai/zen/go/v1",
    "models": [
      {
        "id": "longcat-2.5-preview-free",
        "name": "LongCat 2.5 Preview Free"
      },
      {
        "id": "space-bunny-free",
        "name": "Space Bunny Free"
      },
      {
        "id": "gpt-6-luna",
        "name": "GPT-6 Luna"
      },
      {
        "id": "mimo-v2.6-flash",
        "name": "MiMo-V2.6-Flash"
      },
      {
        "id": "mimo-v2.6-pro",
        "name": "MiMo-V2.6-Pro"
      },
      {
        "id": "grok-4.7",
        "name": "Grok 4.7"
      },
      {
        "id": "deepseek-v4.1-flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "muse-spark-1.3-contributor",
        "name": "Muse Spark 1.3 Contributor"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "opencode",
    "name": "OpenCode Zen",
    "env": [
      "OPENCODE_API_KEY"
    ],
    "api": "https://opencode.ai/zen/v1",
    "models": [
      {
        "id": "gpt-6.1-sol",
        "name": "GPT-6.1 Sol"
      },
      {
        "id": "claude-sonnet-5-5",
        "name": "Claude Sonnet 5.5"
      },
      {
        "id": "longcat-2.5-preview-free",
        "name": "LongCat 2.5 Preview Free"
      },
      {
        "id": "space-bunny-free",
        "name": "Space Bunny Free"
      },
      {
        "id": "claude-opus-5-5",
        "name": "Claude Opus 5.5"
      },
      {
        "id": "gpt-6-luna",
        "name": "GPT-6 Luna"
      },
      {
        "id": "gpt-6-sol",
        "name": "GPT-6 Sol"
      },
      {
        "id": "mimo-v2.6-flash-free",
        "name": "MiMo-V2.6-Flash Free"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "openreason",
    "name": "OpenReason",
    "env": [
      "OPENREASON_API_KEY"
    ],
    "api": "https://api.openreason.app/v1",
    "models": [
      {
        "id": "deepseek-ai/deepseek-v4-flash-0731",
        "name": "DeepSeek V4 Flash 0731"
      },
      {
        "id": "moonshotai/kimi-k2.7-code",
        "name": "Kimi K2.7 Code"
      },
      {
        "id": "openai/gpt-oss-120b",
        "name": "GPT OSS 120B"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "opper",
    "name": "Opper",
    "env": [
      "OPPER_API_KEY"
    ],
    "api": "https://api.opper.ai/v3/compat",
    "models": [
      {
        "id": "gpt-6-astra",
        "name": "GPT-6 Astra"
      },
      {
        "id": "gemini-3.8-flash",
        "name": "Gemini 3.8 Flash"
      },
      {
        "id": "muse-spark-1.3",
        "name": "Muse Spark 1.3"
      },
      {
        "id": "claude-fable-5-1",
        "name": "Claude Fable 5.1"
      },
      {
        "id": "glm-5.3-flash",
        "name": "GLM-5.3-Flash"
      },
      {
        "id": "glm-5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "qwen3.8-27b",
        "name": "Qwen3.8 27B"
      },
      {
        "id": "gemini-3.7-flash",
        "name": "Gemini 3.7 Flash"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "orcarouter",
    "name": "OrcaRouter",
    "env": [
      "ORCAROUTER_API_KEY"
    ],
    "api": "https://api.orcarouter.ai/v1",
    "models": [
      {
        "id": "orcarouter/free",
        "name": "OrcaRouter Free"
      },
      {
        "id": "z-ai/glm-5.3-flash",
        "name": "GLM-5.3-Flash"
      },
      {
        "id": "z-ai/glm-5.3-flash-free",
        "name": "GLM-5.3-Flash (free)"
      },
      {
        "id": "deepseek/deepseek-v4-flash-vision-exp",
        "name": "DeepSeek V4 Flash Vision Exp"
      },
      {
        "id": "qwen/qwen3.8-27b",
        "name": "Qwen3.8 27B"
      },
      {
        "id": "z-ai/glm-5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "google/gemini-flash-latest",
        "name": "Gemini Flash Latest"
      },
      {
        "id": "deepseek/deepseek-v4-pro-0813",
        "name": "DeepSeek V4 Pro 0813"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "ovhcloud",
    "name": "OVHcloud AI Endpoints",
    "env": [
      "OVHCLOUD_API_KEY"
    ],
    "api": "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1",
    "models": [
      {
        "id": "qwen3.8-27b",
        "name": "Qwen3.8-27B"
      },
      {
        "id": "qwen3.6-27b",
        "name": "Qwen3.6-27B"
      },
      {
        "id": "qwen3.5-397b-a17b",
        "name": "Qwen3.5-397B-A17B"
      },
      {
        "id": "qwen3.5-9b",
        "name": "Qwen3.5-9B"
      },
      {
        "id": "gpt-oss-120b",
        "name": "gpt-oss-120b"
      },
      {
        "id": "gpt-oss-20b",
        "name": "gpt-oss-20b"
      },
      {
        "id": "qwen3-coder-30b-a3b-instruct",
        "name": "Qwen3-Coder-30B-A3B-Instruct"
      },
      {
        "id": "mistral-small-3.2-24b-instruct-2506",
        "name": "Mistral-Small-3.2-24B-Instruct-2506"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "pareto",
    "name": "Pareto Inference",
    "env": [
      "PARETO_API_KEY"
    ],
    "api": "https://api.paretoinference.com/v1",
    "models": [
      {
        "id": "z-ai/glm-5.3-flash",
        "name": "GLM-5.3-Flash"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "pendra",
    "name": "Pendra",
    "env": [
      "PENDRA_API_KEY"
    ],
    "api": "https://api.pendra.ai/api/v1",
    "models": [
      {
        "id": "deepseek-v4-flash",
        "name": "DeepSeek V4 Flash"
      },
      {
        "id": "qwen3.6:27b",
        "name": "Qwen3.6 27B"
      },
      {
        "id": "glm-4.7-flash",
        "name": "GLM-4.7-Flash"
      },
      {
        "id": "gpt-oss:120b",
        "name": "GPT OSS 120B"
      },
      {
        "id": "qwen3-coder:30b",
        "name": "Qwen3-Coder 30B-A3B Instruct"
      },
      {
        "id": "llama3.3:70b",
        "name": "Llama-3.3-70B-Instruct"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "perplexity-agent",
    "name": "Perplexity Agent",
    "env": [
      "PERPLEXITY_API_KEY"
    ],
    "api": "https://api.perplexity.ai/v1",
    "models": [
      {
        "id": "xai/grok-4.6",
        "name": "Grok 4.6"
      },
      {
        "id": "deepseek/deepseek-v4-flash-0731",
        "name": "DeepSeek V4 Flash 0731"
      },
      {
        "id": "moonshot-ai/kimi-k3",
        "name": "Kimi K3"
      },
      {
        "id": "moonshot-ai/kimi-k2.7-code",
        "name": "Kimi K2.7 Code"
      },
      {
        "id": "openai/gpt-5.5",
        "name": "GPT-5.5"
      },
      {
        "id": "anthropic/claude-opus-4-7",
        "name": "Claude Opus 4.7"
      },
      {
        "id": "nvidia/nemotron-3-super-120b-a12b",
        "name": "Nemotron 3 Super 120B"
      },
      {
        "id": "openai/gpt-5.4",
        "name": "GPT-5.4"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "pioneer",
    "name": "Pioneer",
    "env": [
      "PIONEER_API_KEY"
    ],
    "api": "https://api.fastino.ai/v1",
    "models": [
      {
        "id": "fastino/GLiNER-2.5-Decide",
        "name": "GLiNER-2.5-Decide"
      },
      {
        "id": "fastino/gliner2.5-base-v1",
        "name": "GLiNER 2.5 Base"
      },
      {
        "id": "fastino/gliner2.5-multi-v1",
        "name": "GLiNER 2.5 Multi"
      },
      {
        "id": "nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-BF16",
        "name": "Nemotron 3.5 Lightning 30B A3B"
      },
      {
        "id": "thinkingmachines/inkling-small",
        "name": "Inkling Small"
      },
      {
        "id": "claude-opus-5",
        "name": "Claude Opus 5"
      },
      {
        "id": "claude-opus-5-fast",
        "name": "Claude Opus 5"
      },
      {
        "id": "gemini-3.5-flash-lite",
        "name": "Gemini 3.5 Flash Lite"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "poe",
    "name": "Poe",
    "env": [
      "POE_API_KEY"
    ],
    "api": "https://api.poe.com/v1",
    "models": [
      {
        "id": "anthropic/claude-opus-4.8",
        "name": "Claude-Opus-4.8"
      },
      {
        "id": "google/gemini-3.5-flash",
        "name": "Gemini-3.5-Flash"
      },
      {
        "id": "empiriolabs/deepseek-v4-flash-el",
        "name": "DeepSeek-V4-Flash-EL"
      },
      {
        "id": "empiriolabs/deepseek-v4-pro-el",
        "name": "DeepSeek-V4-Pro-EL"
      },
      {
        "id": "novita/kimi-k2.6",
        "name": "Kimi-K2.6"
      },
      {
        "id": "anthropic/claude-opus-4.7",
        "name": "Claude-Opus-4.7"
      },
      {
        "id": "openai/gpt-5.5",
        "name": "GPT-5.5"
      },
      {
        "id": "openai/gpt-5.5-pro",
        "name": "GPT-5.5-Pro"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "poolside",
    "name": "Poolside",
    "env": [
      "POOLSIDE_API_KEY"
    ],
    "api": "https://inference.poolside.ai/v1",
    "models": [
      {
        "id": "poolside/laguna-s-2.1",
        "name": "Laguna S 2.1"
      },
      {
        "id": "poolside/laguna-xs-2.1",
        "name": "Laguna XS 2.1"
      },
      {
        "id": "poolside/laguna-m.1",
        "name": "Laguna M.1"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "privatemode-ai",
    "name": "Privatemode AI",
    "env": [
      "PRIVATEMODE_API_KEY",
      "PRIVATEMODE_ENDPOINT"
    ],
    "api": "http://localhost:8080/v1",
    "models": [
      {
        "id": "glm-5.3-flash",
        "name": "GLM-5.3-Flash"
      },
      {
        "id": "glm-flash-latest",
        "name": "GLM Flash (latest)"
      },
      {
        "id": "glm-5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "glm-latest",
        "name": "GLM (latest)"
      },
      {
        "id": "kimi-k2.6",
        "name": "Kimi K2.6"
      },
      {
        "id": "kimi-latest",
        "name": "Kimi (latest)"
      },
      {
        "id": "gpt-oss-120b",
        "name": "gpt-oss-120b"
      }
    ],
    "note": "",
    "local": true
  },
  {
    "id": "qihang-ai",
    "name": "QiHang",
    "env": [
      "QIHANG_API_KEY"
    ],
    "api": "https://api.qhaigc.net/v1",
    "models": [
      {
        "id": "gemini-2.5-flash",
        "name": "Gemini 2.5 Flash"
      },
      {
        "id": "gemini-3-flash-preview",
        "name": "Gemini 3 Flash Preview"
      },
      {
        "id": "gpt-5.2",
        "name": "GPT-5.2"
      },
      {
        "id": "gpt-5.2-codex",
        "name": "GPT-5.2 Codex"
      },
      {
        "id": "gemini-3-pro-preview",
        "name": "Gemini 3 Pro Preview"
      },
      {
        "id": "claude-opus-4-5-20251101",
        "name": "Claude Opus 4.5"
      },
      {
        "id": "claude-haiku-4-5-20251001",
        "name": "Claude Haiku 4.5"
      },
      {
        "id": "claude-sonnet-4-5-20250929",
        "name": "Claude Sonnet 4.5"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "qiniu-ai",
    "name": "Qiniu",
    "env": [
      "QINIU_API_KEY"
    ],
    "api": "https://api.qnaigc.com/v1",
    "models": [
      {
        "id": "qwen3.5-397b-a17b",
        "name": "Qwen3.5 397B A17B"
      },
      {
        "id": "doubao-seed-2.0-code",
        "name": "Doubao Seed 2.0 Code"
      },
      {
        "id": "doubao-seed-2.0-lite",
        "name": "Doubao Seed 2.0 Lite"
      },
      {
        "id": "doubao-seed-2.0-mini",
        "name": "Doubao Seed 2.0 Mini"
      },
      {
        "id": "doubao-seed-2.0-pro",
        "name": "Doubao Seed 2.0 Pro"
      },
      {
        "id": "minimax/minimax-m2.5-highspeed",
        "name": "Minimax/Minimax-M2.5 Highspeed"
      },
      {
        "id": "minimax/minimax-m2.5",
        "name": "Minimax/Minimax-M2.5"
      },
      {
        "id": "z-ai/glm-5",
        "name": "Z-Ai/GLM 5"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "regolo-ai",
    "name": "Regolo AI",
    "env": [
      "REGOLO_API_KEY"
    ],
    "api": "https://api.regolo.ai/v1",
    "models": [
      {
        "id": "qwen3.8-27b",
        "name": "Qwen3.8 27B"
      },
      {
        "id": "glm5.2",
        "name": "GLM-5.2"
      },
      {
        "id": "gemma4-31b",
        "name": "Gemma 4 31B IT"
      },
      {
        "id": "mistral-small-4-119b",
        "name": "Mistral Small 4 119B"
      },
      {
        "id": "gpt-oss-20b",
        "name": "GPT-OSS-20B"
      },
      {
        "id": "qwen3-coder-next",
        "name": "Qwen3-Coder-Next"
      },
      {
        "id": "qwen3.5-122b",
        "name": "Qwen3.5-122B"
      },
      {
        "id": "qwen3.5-9b",
        "name": "Qwen3.5-9B"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "requesty",
    "name": "Requesty",
    "env": [
      "REQUESTY_API_KEY"
    ],
    "api": "https://router.requesty.ai/v1",
    "models": [
      {
        "id": "gpt-6.1-sol",
        "name": "GPT-6.1 Sol"
      },
      {
        "id": "gpt-6.1-sol@eu",
        "name": "GPT-6.1 Sol (EU)"
      },
      {
        "id": "claude-sonnet-5-5",
        "name": "Claude Sonnet 5.5"
      },
      {
        "id": "claude-sonnet-5-5@eu",
        "name": "Claude Sonnet 5.5 (EU)"
      },
      {
        "id": "claude-opus-5-5",
        "name": "Claude Opus 5.5"
      },
      {
        "id": "claude-opus-5-5@eu",
        "name": "Claude Opus 5.5 (EU)"
      },
      {
        "id": "gpt-6-luna",
        "name": "GPT-6 Luna"
      },
      {
        "id": "gpt-6-luna@eu",
        "name": "GPT-6 Luna (EU)"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "routing-run",
    "name": "routing.run",
    "env": [
      "ROUTING_RUN_API_KEY"
    ],
    "api": "https://api.routing.run/v1",
    "models": [
      {
        "id": "gpt-5.6-luna",
        "name": "GPT-5.6 Luna"
      },
      {
        "id": "gpt-5.6-sol",
        "name": "GPT-5.6 Sol"
      },
      {
        "id": "gpt-5.6-terra",
        "name": "GPT-5.6 Terra"
      },
      {
        "id": "glm-5.2",
        "name": "GLM-5.2"
      },
      {
        "id": "glm-5.2-nitro",
        "name": "GLM 5.2 Nitro"
      },
      {
        "id": "kimi-k2.7-code",
        "name": "Kimi K2.7 Code"
      },
      {
        "id": "kimi-k2.7-code-nitro",
        "name": "Kimi K2.7 Code Nitro"
      },
      {
        "id": "nemotron-3-ultra",
        "name": "Nemotron 3 Ultra 550B A55B"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "runinfra",
    "name": "RunInfra",
    "env": [
      "RUNINFRA_GATEWAY_KEY"
    ],
    "api": "https://api.runinfra.ai/v1",
    "models": [
      {
        "id": "zai-org/GLM-5.3-Flash",
        "name": "GLM-5.3-Flash"
      },
      {
        "id": "ornith-ai/Ornith-1.5-35B-A3B",
        "name": "Ornith 1.5 35B A3B"
      },
      {
        "id": "Qwen/Qwen3.8-27B",
        "name": "Qwen3.8 27B"
      },
      {
        "id": "deepseek-ai/DeepSeek-V4-Pro-0813",
        "name": "DeepSeek V4 Pro 0813"
      },
      {
        "id": "Inferact/Qwen3.8-2.4T-A95B-NVFP4",
        "name": "Qwen3.8 2.4T A95B (NVFP4)"
      },
      {
        "id": "nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-BF16",
        "name": "Nemotron 3.5 Lightning 30B A3B"
      },
      {
        "id": "deepseek-ai/DeepSeek-V4-Flash-0731",
        "name": "DeepSeek V4 Flash 0731"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "sakana",
    "name": "Sakana AI",
    "env": [
      "SAKANA_API_KEY"
    ],
    "api": "https://api.sakana.ai/v1",
    "models": [
      {
        "id": "sakana-namazu",
        "name": "Sakana Namazu"
      },
      {
        "id": "fugu",
        "name": "Fugu"
      },
      {
        "id": "fugu-ultra",
        "name": "Fugu Ultra"
      },
      {
        "id": "fugu-ultra-20260615",
        "name": "Fugu Ultra"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "sarvam",
    "name": "Sarvam AI",
    "env": [
      "SARVAM_API_KEY"
    ],
    "api": "https://api.sarvam.ai/v1",
    "models": [
      {
        "id": "sarvam-105b",
        "name": "Sarvam-105B"
      },
      {
        "id": "sarvam-30b",
        "name": "Sarvam-30B"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "scaleway",
    "name": "Scaleway",
    "env": [
      "SCALEWAY_API_KEY"
    ],
    "api": "https://api.scaleway.ai/v1",
    "models": [
      {
        "id": "qwen3.8-27b",
        "name": "Qwen3.8 27B"
      },
      {
        "id": "deepseek-v4-flash-0731",
        "name": "DeepSeek V4 Flash 0731"
      },
      {
        "id": "glm-5.2",
        "name": "GLM-5.2"
      },
      {
        "id": "qwen3.6-35b-a3b",
        "name": "Qwen3.6 35B A3B"
      },
      {
        "id": "mistral-medium-3.5-128b",
        "name": "Mistral Medium 3.5 128B"
      },
      {
        "id": "gemma-4-26b-a4b-it",
        "name": "Gemma 4 26B A4B IT"
      },
      {
        "id": "qwen3.5-397b-a17b",
        "name": "Qwen3.5 397B A17B"
      },
      {
        "id": "qwen3-235b-a22b-instruct-2507",
        "name": "Qwen3 235B A22B Instruct 2507"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "scnet-token-plan",
    "name": "SCNet Token Plan",
    "env": [
      "SCNET_API_KEY"
    ],
    "api": "https://api.scnet.cn/api/llm/v1",
    "models": [
      {
        "id": "DeepSeek-V4.1-Flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "GLM-5.3-Flash",
        "name": "GLM-5.3-Flash"
      },
      {
        "id": "Qwen3.8-Flash",
        "name": "Qwen3.8 Flash"
      },
      {
        "id": "GLM-5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "DeepSeek-V4-Pro-0813",
        "name": "DeepSeek V4 Pro 0813"
      },
      {
        "id": "Qwen3.8-Max",
        "name": "Qwen3.8 Max"
      },
      {
        "id": "DeepSeek-V4-Flash-0731",
        "name": "DeepSeek V4 Flash 0731"
      },
      {
        "id": "Kimi-K3",
        "name": "Kimi K3"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "scx-ai",
    "name": "SCX.ai",
    "env": [
      "SCX_API_KEY"
    ],
    "api": "https://api.scx.ai/v1",
    "models": [
      {
        "id": "Qwen3.8-Max",
        "name": "Qwen3.8 Max"
      },
      {
        "id": "GLM-5.2",
        "name": "GLM-5.2"
      },
      {
        "id": "MiniMax-M2.7",
        "name": "MiniMax-M2.7"
      },
      {
        "id": "gpt-oss-120b",
        "name": "GPT OSS 120B"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "sensenova",
    "name": "SenseNova (China)",
    "env": [
      "SENSENOVA_API_KEY"
    ],
    "api": "https://token.sensenova.cn/v1",
    "models": [
      {
        "id": "deepseek-v4-pro",
        "name": "DeepSeek V4 Pro"
      },
      {
        "id": "sensenova-6.8-flash-lite",
        "name": "SenseNova 6.8 Flash Lite"
      },
      {
        "id": "kimi-k3",
        "name": "Kimi K3"
      },
      {
        "id": "glm-5.2",
        "name": "GLM-5.2"
      },
      {
        "id": "deepseek-v4-flash",
        "name": "DeepSeek V4 Flash"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "siliconflow",
    "name": "SiliconFlow",
    "env": [
      "SILICONFLOW_API_KEY"
    ],
    "api": "https://api.siliconflow.com/v1",
    "models": [
      {
        "id": "zai-org/GLM-5.3-Flash",
        "name": "GLM-5.3-Flash"
      },
      {
        "id": "deepseek-ai/DeepSeek-V4-Flash-Vision-Exp",
        "name": "DeepSeek V4 Flash Vision Exp"
      },
      {
        "id": "zai-org/GLM-5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "deepseek-ai/DeepSeek-V4-Pro-0813",
        "name": "DeepSeek V4 Pro 0813"
      },
      {
        "id": "Qwen/Qwen3.8-2.4T-A95B",
        "name": "Qwen3.8 2.4T A95B"
      },
      {
        "id": "deepseek-ai/DeepSeek-V4-Flash-0731",
        "name": "DeepSeek V4 Flash 0731"
      },
      {
        "id": "moonshotai/Kimi-K3",
        "name": "Kimi K3"
      },
      {
        "id": "tencent/Hy3",
        "name": "Hy3"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "siliconflow-cn",
    "name": "SiliconFlow (China)",
    "env": [
      "SILICONFLOW_CN_API_KEY"
    ],
    "api": "https://api.siliconflow.cn/v1",
    "models": [
      {
        "id": "zai-org/GLM-5.2",
        "name": "GLM-5.2"
      },
      {
        "id": "deepseek-ai/DeepSeek-V4-Flash",
        "name": "DeepSeek V4 Flash"
      },
      {
        "id": "deepseek-ai/DeepSeek-V4-Pro",
        "name": "deepseek-ai/DeepSeek-V4-Pro"
      },
      {
        "id": "Pro/moonshotai/Kimi-K2.6",
        "name": "Pro/moonshotai/Kimi-K2.6"
      },
      {
        "id": "Pro/zai-org/GLM-5.1",
        "name": "Pro/zai-org/GLM-5.1"
      },
      {
        "id": "Qwen/Qwen3.5-4B",
        "name": "Qwen/Qwen3.5-4B"
      },
      {
        "id": "Qwen/Qwen3.5-9B",
        "name": "Qwen/Qwen3.5-9B"
      },
      {
        "id": "Qwen/Qwen3.5-122B-A10B",
        "name": "Qwen/Qwen3.5-122B-A10B"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "snowflake-cortex",
    "name": "Snowflake Cortex",
    "env": [
      "SNOWFLAKE_ACCOUNT",
      "SNOWFLAKE_CORTEX_PAT"
    ],
    "api": "https://${SNOWFLAKE_ACCOUNT}.snowflakecomputing.com/api/v2/cortex/v1",
    "models": [
      {
        "id": "claude-opus-5",
        "name": "Claude Opus 5"
      },
      {
        "id": "openai-gpt-5.6-luna",
        "name": "GPT-5.6 Luna"
      },
      {
        "id": "openai-gpt-5.6-sol",
        "name": "GPT-5.6 Sol"
      },
      {
        "id": "openai-gpt-5.6-terra",
        "name": "GPT-5.6 Terra"
      },
      {
        "id": "claude-sonnet-5",
        "name": "Claude Sonnet 5"
      },
      {
        "id": "claude-fable-5",
        "name": "Claude Fable 5"
      },
      {
        "id": "claude-opus-4-8",
        "name": "Claude Opus 4.8"
      },
      {
        "id": "openai-gpt-5.5",
        "name": "GPT-5.5"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "stackit",
    "name": "STACKIT",
    "env": [
      "STACKIT_API_KEY"
    ],
    "api": "https://api.openai-compat.model-serving.eu01.onstackit.cloud/v1",
    "models": [
      {
        "id": "openai/gpt-oss-120b",
        "name": "GPT OSS 120B"
      },
      {
        "id": "openai/gpt-oss-20b",
        "name": "GPT OSS 20B"
      },
      {
        "id": "Qwen/Qwen3.6-27B",
        "name": "Qwen3.6 27B"
      },
      {
        "id": "cortecs/Llama-3.3-70B-Instruct-FP8-Dynamic",
        "name": "Llama 3.3 70B"
      },
      {
        "id": "Qwen/Qwen3-VL-235B-A22B-Instruct-FP8",
        "name": "Qwen3-VL 235B"
      },
      {
        "id": "google/gemma-3-27b-it",
        "name": "Gemma 3 27B"
      },
      {
        "id": "intfloat/e5-mistral-7b-instruct",
        "name": "E5 Mistral 7B"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "stepfun",
    "name": "StepFun (China)",
    "env": [
      "STEPFUN_API_KEY"
    ],
    "api": "https://api.stepfun.com/v1",
    "models": [
      {
        "id": "step-5-preview",
        "name": "Step 5 Preview"
      },
      {
        "id": "step-3.7-flash",
        "name": "Step 3.7 Flash"
      },
      {
        "id": "step-3.5-flash-2603",
        "name": "Step 3.5 Flash 2603"
      },
      {
        "id": "step-3.5-flash",
        "name": "Step 3.5 Flash"
      },
      {
        "id": "step-1-32k",
        "name": "Step 1 (32K)"
      },
      {
        "id": "step-2-16k",
        "name": "Step 2 (16K)"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "stepfun-ai",
    "name": "StepFun (Global)",
    "env": [
      "STEPFUN_API_KEY"
    ],
    "api": "https://api.stepfun.ai/v1",
    "models": [
      {
        "id": "step-5-preview",
        "name": "Step 5 Preview"
      },
      {
        "id": "step-3.7-flash",
        "name": "Step 3.7 Flash"
      },
      {
        "id": "step-3.5-flash-2603",
        "name": "Step 3.5 Flash 2603"
      },
      {
        "id": "step-3.5-flash",
        "name": "Step 3.5 Flash"
      },
      {
        "id": "step-1-32k",
        "name": "Step 1 (32K)"
      },
      {
        "id": "step-2-16k",
        "name": "Step 2 (16K)"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "stepfun-step-plan",
    "name": "StepFun Step Plan (China)",
    "env": [
      "STEPFUN_API_KEY"
    ],
    "api": "https://api.stepfun.com/step_plan/v1",
    "models": [
      {
        "id": "step-5-preview",
        "name": "Step 5 Preview"
      },
      {
        "id": "step-3.7-flash",
        "name": "Step 3.7 Flash"
      },
      {
        "id": "step-3.5-flash-2603",
        "name": "Step 3.5 Flash 2603"
      },
      {
        "id": "step-3.5-flash",
        "name": "Step 3.5 Flash"
      },
      {
        "id": "step-router-v1",
        "name": "Step Router v1"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "stepfun-ai-step-plan",
    "name": "StepFun Step Plan (Global)",
    "env": [
      "STEPFUN_API_KEY"
    ],
    "api": "https://api.stepfun.ai/step_plan/v1",
    "models": [
      {
        "id": "step-5-preview",
        "name": "Step 5 Preview"
      },
      {
        "id": "step-3.7-flash",
        "name": "Step 3.7 Flash"
      },
      {
        "id": "step-3.5-flash-2603",
        "name": "Step 3.5 Flash 2603"
      },
      {
        "id": "step-3.5-flash",
        "name": "Step 3.5 Flash"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "submodel",
    "name": "submodel",
    "env": [
      "SUBMODEL_INSTAGEN_ACCESS_KEY"
    ],
    "api": "https://llm.submodel.ai/v1",
    "models": [
      {
        "id": "deepseek-ai/DeepSeek-R1-0528",
        "name": "DeepSeek R1 0528"
      },
      {
        "id": "deepseek-ai/DeepSeek-V3.1",
        "name": "DeepSeek V3.1"
      },
      {
        "id": "openai/gpt-oss-120b",
        "name": "GPT OSS 120B"
      },
      {
        "id": "Qwen/Qwen3-235B-A22B-Thinking-2507",
        "name": "Qwen3 235B A22B Thinking 2507"
      },
      {
        "id": "zai-org/GLM-4.5-FP8",
        "name": "GLM 4.5 FP8"
      },
      {
        "id": "deepseek-ai/DeepSeek-V3-0324",
        "name": "DeepSeek V3 0324"
      },
      {
        "id": "Qwen/Qwen3-235B-A22B-Instruct-2507",
        "name": "Qwen3 235B A22B Instruct 2507"
      },
      {
        "id": "Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8",
        "name": "Qwen3 Coder 480B A35B Instruct"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "synthetic",
    "name": "Synthetic",
    "env": [
      "SYNTHETIC_API_KEY"
    ],
    "api": "https://api.synthetic.new/openai/v1",
    "models": [
      {
        "id": "hf:deepseek-ai/DeepSeek-V4.1-Flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "hf:zai-org/GLM-5.3-Flash",
        "name": "GLM-5.3-Flash"
      },
      {
        "id": "hf:moonshotai/Kimi-K3",
        "name": "Kimi K3"
      },
      {
        "id": "hf:zai-org/GLM-5.2",
        "name": "GLM-5.2"
      },
      {
        "id": "hf:MiniMaxAI/MiniMax-M3",
        "name": "MiniMax-M3"
      },
      {
        "id": "hf:moonshotai/Kimi-K2.7-Code",
        "name": "Kimi K2.7 Code"
      },
      {
        "id": "hf:Qwen/Qwen3.6-27B",
        "name": "Qwen3.6 27B"
      },
      {
        "id": "hf:nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-NVFP4",
        "name": "Nemotron 3 Super 120B A12B"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "tempr",
    "name": "Tempr Gateway",
    "env": [
      "TEMPR_API_KEY"
    ],
    "api": "https://api.temprhq.io/v1",
    "models": [
      {
        "id": "xiaomi-mimo/mimo-v2.6-flash",
        "name": "MiMo-V2.6-Flash"
      },
      {
        "id": "xiaomi-mimo/mimo-v2.6-pro",
        "name": "MiMo-V2.6-Pro"
      },
      {
        "id": "xai/grok-4.7",
        "name": "Grok 4.7"
      },
      {
        "id": "xiaomi-mimo/mimo-v2.6-pro-ultraspeed",
        "name": "MiMo-V2.6-Pro-UltraSpeed"
      },
      {
        "id": "zai/glm-5.3-flashx",
        "name": "GLM-5.3-FlashX"
      },
      {
        "id": "deepseek/deepseek-flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "google/gemini-3.8-flash",
        "name": "Gemini 3.8 Flash"
      },
      {
        "id": "anthropic/claude-fable-5-1",
        "name": "Claude Fable 5.1"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "tencent-coding-plan",
    "name": "Tencent Coding Plan (China)",
    "env": [
      "TENCENT_CODING_PLAN_API_KEY"
    ],
    "api": "https://api.lkeap.cloud.tencent.com/coding/v3",
    "models": [
      {
        "id": "hunyuan-2.0-thinking",
        "name": "Tencent HY 2.0 Think"
      },
      {
        "id": "hunyuan-t1",
        "name": "Hunyuan-T1"
      },
      {
        "id": "minimax-m2.5",
        "name": "MiniMax-M2.5"
      },
      {
        "id": "glm-5",
        "name": "GLM-5"
      },
      {
        "id": "kimi-k2.5",
        "name": "Kimi-K2.5"
      },
      {
        "id": "hunyuan-2.0-instruct",
        "name": "Tencent HY 2.0 Instruct"
      },
      {
        "id": "hunyuan-turbos",
        "name": "Hunyuan-TurboS"
      },
      {
        "id": "tc-code-latest",
        "name": "Auto"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "tencent-token-plan",
    "name": "Tencent Token Plan",
    "env": [
      "TENCENT_TOKEN_PLAN_API_KEY"
    ],
    "api": "https://api.lkeap.cloud.tencent.com/plan/v3",
    "models": [
      {
        "id": "hy4-preview",
        "name": "Hy4 preview"
      },
      {
        "id": "hy3",
        "name": "Hy3"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "tencent-tokenhub",
    "name": "Tencent TokenHub",
    "env": [
      "TENCENT_TOKENHUB_API_KEY"
    ],
    "api": "https://tokenhub.tencentmaas.com/v1",
    "models": [
      {
        "id": "hy4-preview",
        "name": "Hy4 preview"
      },
      {
        "id": "hy3",
        "name": "Hy3"
      },
      {
        "id": "hy3-preview",
        "name": "Hy3 preview"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "tensorx",
    "name": "TensorX",
    "env": [
      "TENSORX_API_KEY"
    ],
    "api": "https://api.tensorx.ai/v1",
    "models": [
      {
        "id": "deepseek/deepseek-v4.1-flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "qwen/qwen3.8-flash-next",
        "name": "Qwen3.8 Flash Next"
      },
      {
        "id": "z-ai/glm-5.3-flash",
        "name": "GLM-5.3-Flash"
      },
      {
        "id": "qwen/qwen3.8-27b",
        "name": "Qwen3.8 27B"
      },
      {
        "id": "z-ai/glm-5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "deepseek/deepseek-v4-pro-0813",
        "name": "DeepSeek V4 Pro 0813"
      },
      {
        "id": "qwen/qwen3.8-2.4t-a95b",
        "name": "Qwen3.8 2.4T A95B"
      },
      {
        "id": "deepseek/deepseek-v4-flash-0731",
        "name": "DeepSeek V4 Flash 0731"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "the-grid-ai",
    "name": "The Grid AI",
    "env": [
      "THEGRID_API_KEY"
    ],
    "api": "https://api.thegrid.ai/v1",
    "models": [
      {
        "id": "agent-max",
        "name": "Agent Max"
      },
      {
        "id": "agent-prime",
        "name": "Agent Prime"
      },
      {
        "id": "agent-standard",
        "name": "Agent Standard"
      },
      {
        "id": "code-max",
        "name": "Code Max"
      },
      {
        "id": "code-prime",
        "name": "Code Prime"
      },
      {
        "id": "code-standard",
        "name": "Code Standard"
      },
      {
        "id": "text-max",
        "name": "Text Max"
      },
      {
        "id": "text-prime",
        "name": "Text Prime"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "tinfoil",
    "name": "Tinfoil",
    "env": [
      "TINFOIL_API_KEY"
    ],
    "api": "https://inference.tinfoil.sh/v1",
    "models": [
      {
        "id": "deepseek-v4-1-flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "glm-5-3-flash",
        "name": "GLM-5.3-Flash"
      },
      {
        "id": "glm-5-3",
        "name": "GLM-5.3"
      },
      {
        "id": "kimi-k3",
        "name": "Kimi K3"
      },
      {
        "id": "gemma4-31b",
        "name": "Gemma 4 31B IT"
      },
      {
        "id": "gpt-oss-120b",
        "name": "gpt-oss-120b"
      },
      {
        "id": "llama3-3-70b",
        "name": "Llama-3.3-70B-Instruct"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "tokengo",
    "name": "TokenGo",
    "env": [
      "TOKENGO_API_KEY"
    ],
    "api": "https://api.tokengo.com/v1",
    "models": [
      {
        "id": "z-ai/glm-5.3-flash",
        "name": "GLM-5.3-Flash"
      },
      {
        "id": "z-ai/glm-5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "moonshotai/kimi-k3",
        "name": "Kimi K3"
      },
      {
        "id": "z-ai/glm-5.2",
        "name": "GLM-5.2"
      },
      {
        "id": "deepseek/deepseek-v4-flash",
        "name": "DeepSeek V4 Flash"
      },
      {
        "id": "deepseek/deepseek-v4-pro",
        "name": "DeepSeek V4 Pro"
      },
      {
        "id": "moonshotai/kimi-k2.6",
        "name": "Kimi K2.6"
      },
      {
        "id": "z-ai/glm-5.1",
        "name": "GLM-5.1"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "tokenrouter",
    "name": "TokenRouter",
    "env": [
      "TOKENROUTER_API_KEY"
    ],
    "api": "https://api.tokenrouter.com/v1",
    "models": [
      {
        "id": "z-ai/glm-5.3-free",
        "name": "GLM-5.3 (free)"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "trustedrouter",
    "name": "TrustedRouter",
    "env": [
      "TRUSTEDROUTER_API_KEY"
    ],
    "api": "https://api.trustedrouter.com/v1",
    "models": [
      {
        "id": "trustedrouter/synth",
        "name": "Synth"
      },
      {
        "id": "trustedrouter/synth-code",
        "name": "Synth Code"
      },
      {
        "id": "trustedrouter/e2e",
        "name": "End-to-End Encrypted"
      },
      {
        "id": "trustedrouter/fast",
        "name": "Fast"
      },
      {
        "id": "trustedrouter/zdr",
        "name": "Zero Data Retention"
      },
      {
        "id": "trustedrouter/auto",
        "name": "Auto"
      },
      {
        "id": "trustedrouter/cheap",
        "name": "Cheap"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "umans-ai",
    "name": "Umans AI",
    "env": [
      "UMANS_AI_API_KEY"
    ],
    "api": "https://api.code.umans.ai/v1",
    "models": [
      {
        "id": "umans-deepseek-v4.1-flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "umans-coder",
        "name": "Umans Coder"
      },
      {
        "id": "umans-glm-5.3-flash",
        "name": "GLM 5.3 Flash"
      },
      {
        "id": "umans-deepseek-v4-flash-0731",
        "name": "DeepSeek V4 Flash"
      },
      {
        "id": "umans-kimi-k3",
        "name": "Kimi K3"
      },
      {
        "id": "umans-flash",
        "name": "Umans Flash"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "umans-ai-coding-plan",
    "name": "Umans AI Coding Plan",
    "env": [
      "UMANS_AI_CODING_PLAN_API_KEY"
    ],
    "api": "https://api.code.umans.ai/v1",
    "models": [
      {
        "id": "umans-deepseek-v4.1-flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "umans-coder",
        "name": "Umans Coder"
      },
      {
        "id": "umans-glm-5.3-flash",
        "name": "GLM 5.3 Flash"
      },
      {
        "id": "umans-deepseek-v4-flash-0731",
        "name": "DeepSeek V4 Flash"
      },
      {
        "id": "umans-kimi-k3",
        "name": "Kimi K3"
      },
      {
        "id": "umans-flash",
        "name": "Umans Flash"
      },
      {
        "id": "umans-qwen3.6-35b-a3b",
        "name": "Qwen3.6 35B A3B"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "unorouter",
    "name": "UnoRouter",
    "env": [
      "UNOROUTER_API_KEY"
    ],
    "api": "https://api.unorouter.com/v1",
    "models": [
      {
        "id": "claude-sonnet-5",
        "name": "Claude Sonnet 5"
      },
      {
        "id": "glm-5.2",
        "name": "GLM-5.2"
      },
      {
        "id": "glm-5.2:free",
        "name": "GLM-5.2"
      },
      {
        "id": "nemotron-3-ultra-550b-a55b:free",
        "name": "Nemotron 3 Ultra 550B A55B"
      },
      {
        "id": "step-3.7-flash:free",
        "name": "Step 3.7 Flash"
      },
      {
        "id": "claude-opus-4-8",
        "name": "Claude Opus 4.8"
      },
      {
        "id": "gemini-3.5-flash",
        "name": "Gemini 3.5 Flash"
      },
      {
        "id": "deepseek-v4-flash",
        "name": "DeepSeek V4 Flash"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "upstage",
    "name": "Upstage",
    "env": [
      "UPSTAGE_API_KEY"
    ],
    "api": "https://api.upstage.ai/v1/solar",
    "models": [
      {
        "id": "solar-pro4",
        "name": "Solar Pro 4"
      },
      {
        "id": "solar-pro3",
        "name": "solar-pro3"
      },
      {
        "id": "solar-pro2",
        "name": "solar-pro2"
      },
      {
        "id": "solar-mini",
        "name": "solar-mini"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "vancine",
    "name": "Vancine",
    "env": [
      "VANCINE_API_KEY"
    ],
    "api": "https://vancine.com/v1",
    "models": [
      {
        "id": "deepseek-v4.1-flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "hy4-preview",
        "name": "Hy4 preview"
      },
      {
        "id": "glm-5.3-flash",
        "name": "GLM-5.3-Flash"
      },
      {
        "id": "qwen3.8-flash",
        "name": "Qwen3.8 Flash"
      },
      {
        "id": "glm-5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "qwen3.8-max",
        "name": "Qwen3.8 Max"
      },
      {
        "id": "kimi-k3",
        "name": "Kimi K3"
      },
      {
        "id": "MiniMax-M3",
        "name": "MiniMax-M3"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "vispark",
    "name": "Vispark",
    "env": [
      "VISPARK_LAB_API_KEY"
    ],
    "api": "https://api.lab.vispark.in/v1",
    "models": [
      {
        "id": "vispark/vision-large",
        "name": "Vision Large"
      },
      {
        "id": "vispark/vision-medium",
        "name": "Vision Medium"
      },
      {
        "id": "vispark/vision-small",
        "name": "Vision Small"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "vivgrid",
    "name": "Vivgrid",
    "env": [
      "VIVGRID_API_KEY"
    ],
    "api": "https://api.vivgrid.com/v1",
    "models": [
      {
        "id": "gpt-6.1-sol",
        "name": "GPT-6.1 Sol"
      },
      {
        "id": "claude-sonnet-5-5",
        "name": "Claude Sonnet 5.5"
      },
      {
        "id": "claude-opus-5-5",
        "name": "Claude Opus 5.5"
      },
      {
        "id": "gpt-6-luna",
        "name": "GPT-6 Luna"
      },
      {
        "id": "gpt-6-sol",
        "name": "GPT-6 Sol"
      },
      {
        "id": "viv-fast",
        "name": "Viv Fast"
      },
      {
        "id": "deepseek-v4.1-flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "gpt-6-astra",
        "name": "GPT-6 Astra"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "volcengine",
    "name": "Volcengine Ark",
    "env": [
      "ARK_API_KEY"
    ],
    "api": "https://ark.cn-beijing.volces.com/api/v3",
    "models": [
      {
        "id": "glm-5-3-flash-260828",
        "name": "GLM-5.3-Flash"
      },
      {
        "id": "deepseek-v4-pro-ga-260813",
        "name": "DeepSeek V4 Pro 0813"
      },
      {
        "id": "deepseek-v4-flash-ga-260731",
        "name": "DeepSeek V4 Flash 0731"
      },
      {
        "id": "doubao-seed-2-1-pro-260628",
        "name": "Seed 2.1 Pro"
      },
      {
        "id": "doubao-seed-2-1-turbo-260628",
        "name": "Seed 2.1 Turbo"
      },
      {
        "id": "doubao-seed-character-260628",
        "name": "Seed Character"
      },
      {
        "id": "doubao-seed-evolving",
        "name": "Seed Evolving"
      },
      {
        "id": "glm-5-2-260617",
        "name": "GLM-5.2"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "volcengine-coding-plan",
    "name": "Volcengine Ark Coding Plan",
    "env": [
      "ARK_CODING_PLAN_API_KEY"
    ],
    "api": "https://ark.cn-beijing.volces.com/api/coding/v3",
    "models": [
      {
        "id": "glm-5.3-flash",
        "name": "GLM-5.3-Flash"
      },
      {
        "id": "glm-5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "kimi-k3",
        "name": "Kimi K3"
      },
      {
        "id": "doubao-seed-2.1-turbo",
        "name": "Seed 2.1 Turbo"
      },
      {
        "id": "doubao-seed-evolving",
        "name": "Seed Evolving"
      },
      {
        "id": "kimi-k2.7-code",
        "name": "Kimi K2.7 Code"
      },
      {
        "id": "minimax-m3",
        "name": "MiniMax-M3"
      },
      {
        "id": "deepseek-v4-flash",
        "name": "DeepSeek V4 Flash"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "vultr",
    "name": "Vultr",
    "env": [
      "VULTR_API_KEY"
    ],
    "api": "https://api.vultrinference.com/v1",
    "models": [
      {
        "id": "mimo-v2.6-flash-rl",
        "name": "MiMo-V2.6-Flash"
      },
      {
        "id": "mimo-v2.6-pro-rl",
        "name": "MiMo-V2.6-Pro"
      },
      {
        "id": "deepseek-v4.1-flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "qwen3.8-flash-next",
        "name": "Qwen3.8 Flash Next"
      },
      {
        "id": "glm-5.3-flash",
        "name": "GLM-5.3-Flash"
      },
      {
        "id": "glm-5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "qwen3.8-27b",
        "name": "Qwen3.8 27B"
      },
      {
        "id": "muse-glimmer-30b",
        "name": "Muse Glimmer 30B"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "wafer.ai",
    "name": "Wafer",
    "env": [
      "WAFER_API_KEY"
    ],
    "api": "https://pass.wafer.ai/v1",
    "models": [
      {
        "id": "GLM-5.2",
        "name": "GLM-5.2"
      },
      {
        "id": "glm5.2-fast",
        "name": "GLM5.2-Fast"
      },
      {
        "id": "MiniMax-M3",
        "name": "MiniMax-M3"
      },
      {
        "id": "Kimi-K2.6",
        "name": "Kimi K2.6"
      },
      {
        "id": "GLM-5.1",
        "name": "GLM-5.1"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "wallaby",
    "name": "Wallaby",
    "env": [
      "WALLABY_API_KEY"
    ],
    "api": "https://api.wallabytoken.com/v1",
    "models": [
      {
        "id": "moonshotai/kimi-k3",
        "name": "Kimi K3"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "xiaomi",
    "name": "Xiaomi",
    "env": [
      "XIAOMI_API_KEY"
    ],
    "api": "https://api.xiaomimimo.com/v1",
    "models": [
      {
        "id": "mimo-v2.6-flash",
        "name": "MiMo-V2.6-Flash"
      },
      {
        "id": "mimo-v2.6-pro",
        "name": "MiMo-V2.6-Pro"
      },
      {
        "id": "mimo-v2.6-pro-ultraspeed",
        "name": "MiMo-V2.6-Pro-UltraSpeed"
      },
      {
        "id": "mimo-v2.5-pro-ultraspeed",
        "name": "MiMo-V2.5-Pro-UltraSpeed"
      },
      {
        "id": "mimo-v2.5",
        "name": "MiMo-V2.5"
      },
      {
        "id": "mimo-v2.5-pro",
        "name": "MiMo-V2.5-Pro"
      },
      {
        "id": "mimo-v2-omni",
        "name": "MiMo-V2-Omni"
      },
      {
        "id": "mimo-v2-pro",
        "name": "MiMo-V2-Pro"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "xiaomi-token-plan-cn",
    "name": "Xiaomi Token Plan (China)",
    "env": [
      "XIAOMI_API_KEY"
    ],
    "api": "https://token-plan-cn.xiaomimimo.com/v1",
    "models": [
      {
        "id": "mimo-v2.6-flash",
        "name": "MiMo-V2.6-Flash"
      },
      {
        "id": "mimo-v2.6-pro",
        "name": "MiMo-V2.6-Pro"
      },
      {
        "id": "mimo-v2.5",
        "name": "MiMo-V2.5"
      },
      {
        "id": "mimo-v2.5-pro",
        "name": "MiMo-V2.5-Pro"
      },
      {
        "id": "mimo-v2-pro",
        "name": "MiMo-V2-Pro"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "xiaomi-token-plan-ams",
    "name": "Xiaomi Token Plan (Europe)",
    "env": [
      "XIAOMI_API_KEY"
    ],
    "api": "https://token-plan-ams.xiaomimimo.com/v1",
    "models": [
      {
        "id": "mimo-v2.6-flash",
        "name": "MiMo-V2.6-Flash"
      },
      {
        "id": "mimo-v2.6-pro",
        "name": "MiMo-V2.6-Pro"
      },
      {
        "id": "mimo-v2.5",
        "name": "MiMo-V2.5"
      },
      {
        "id": "mimo-v2.5-pro",
        "name": "MiMo-V2.5-Pro"
      },
      {
        "id": "mimo-v2-pro",
        "name": "MiMo-V2-Pro"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "xiaomi-token-plan-sgp",
    "name": "Xiaomi Token Plan (Singapore)",
    "env": [
      "XIAOMI_API_KEY"
    ],
    "api": "https://token-plan-sgp.xiaomimimo.com/v1",
    "models": [
      {
        "id": "mimo-v2.6-flash",
        "name": "MiMo-V2.6-Flash"
      },
      {
        "id": "mimo-v2.6-pro",
        "name": "MiMo-V2.6-Pro"
      },
      {
        "id": "mimo-v2.5",
        "name": "MiMo-V2.5"
      },
      {
        "id": "mimo-v2.5-pro",
        "name": "MiMo-V2.5-Pro"
      },
      {
        "id": "mimo-v2-pro",
        "name": "MiMo-V2-Pro"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "xpersona",
    "name": "Xpersona",
    "env": [
      "XPERSONA_API_KEY"
    ],
    "api": "https://www.xpersona.co/v1",
    "models": [
      {
        "id": "gpt-5.6",
        "name": "GPT-5.6"
      },
      {
        "id": "gpt-5.6-sol",
        "name": "GPT-5.6 Sol"
      },
      {
        "id": "gpt-5.6-terra",
        "name": "GPT-5.6 Terra"
      },
      {
        "id": "claude-fable-5",
        "name": "Claude Fable 5"
      },
      {
        "id": "xpersona-gpt-5.5",
        "name": "GPT-5.5"
      },
      {
        "id": "claude-opus-4-8",
        "name": "Claude Opus 4.8"
      },
      {
        "id": "gemini-3.5-flash",
        "name": "Gemini 3.5 Flash"
      },
      {
        "id": "xpersona-frieren-coder",
        "name": "Xpersona Frieren 1"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "zai",
    "name": "Z.ai (ZCode)",
    "env": [
      "ZHIPU_API_KEY",
      "ZCODE_API_KEY"
    ],
    "api": "https://api.z.ai/api/paas/v4",
    "models": [
      {
        "id": "glm-5.3-flashx",
        "name": "GLM-5.3-FlashX"
      },
      {
        "id": "glm-5.3-flash",
        "name": "GLM-5.3-Flash"
      },
      {
        "id": "glm-5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "glm-5.2",
        "name": "GLM-5.2"
      },
      {
        "id": "glm-5.1",
        "name": "GLM-5.1"
      },
      {
        "id": "glm-5v-turbo",
        "name": "GLM-5V-Turbo"
      },
      {
        "id": "glm-5-turbo",
        "name": "GLM-5-Turbo"
      },
      {
        "id": "glm-5",
        "name": "GLM-5"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "zai-coding-plan",
    "name": "Z.AI Coding Plan",
    "env": [
      "ZHIPU_API_KEY"
    ],
    "api": "https://api.z.ai/api/coding/paas/v4",
    "models": [
      {
        "id": "glm-5.3-flash",
        "name": "GLM-5.3-Flash"
      },
      {
        "id": "glm-5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "glm-5.3-highspeed",
        "name": "GLM-5.3 Highspeed"
      },
      {
        "id": "glm-5.2",
        "name": "GLM-5.2"
      },
      {
        "id": "glm-5.2-highspeed",
        "name": "GLM-5.2 Highspeed"
      },
      {
        "id": "glm-5-turbo",
        "name": "GLM-5-Turbo"
      },
      {
        "id": "glm-4.7",
        "name": "GLM-4.7"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "zeldoc",
    "name": "Zeldoc",
    "env": [
      "ZELDOC_API_KEY"
    ],
    "api": "https://api.zeldoc.ai/v1",
    "models": [
      {
        "id": "zdev",
        "name": "ZDev"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "zenifra",
    "name": "Zenifra",
    "env": [
      "ZENIFRA_AI_KEY"
    ],
    "api": "https://ai.zenifra.com/v1",
    "models": [
      {
        "id": "alibaba/qwen3.6-35b-a3b",
        "name": "Qwen3.6 35B-A3B"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "zenmux",
    "name": "ZenMux",
    "env": [
      "ZENMUX_API_KEY"
    ],
    "api": "https://zenmux.ai/api/v1",
    "models": [
      {
        "id": "anthropic/claude-opus-5.5",
        "name": "Claude Opus 5.5"
      },
      {
        "id": "openai/gpt-6-sol",
        "name": "GPT-6 Sol"
      },
      {
        "id": "xiaomi/mimo-v2.6-pro",
        "name": "MiMo-V2.6-Pro"
      },
      {
        "id": "deepseek/deepseek-v4.1-flash",
        "name": "DeepSeek V4.1 Flash"
      },
      {
        "id": "openai/gpt-6-astra",
        "name": "GPT-6 Astra"
      },
      {
        "id": "anthropic/claude-fable-5.1",
        "name": "Claude Fable 5.1"
      },
      {
        "id": "z-ai/glm-5.3-flash",
        "name": "GLM 5.3 Flash"
      },
      {
        "id": "z-ai/glm-5.3-flashx",
        "name": "GLM 5.3 FlashX"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "zhipuai",
    "name": "Zhipu AI",
    "env": [
      "ZHIPU_API_KEY"
    ],
    "api": "https://open.bigmodel.cn/api/paas/v4",
    "models": [
      {
        "id": "glm-5.3-flashx",
        "name": "GLM-5.3-FlashX"
      },
      {
        "id": "glm-5.3-flash",
        "name": "GLM-5.3-Flash"
      },
      {
        "id": "glm-5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "glm-5.2",
        "name": "GLM-5.2"
      },
      {
        "id": "glm-5v-turbo",
        "name": "GLM-5V-Turbo"
      },
      {
        "id": "glm-5.1",
        "name": "GLM-5.1"
      },
      {
        "id": "glm-5",
        "name": "GLM-5"
      },
      {
        "id": "glm-4.7-flash",
        "name": "GLM-4.7-Flash"
      }
    ],
    "note": "",
    "local": false
  },
  {
    "id": "zhipuai-coding-plan",
    "name": "Zhipu AI Coding Plan",
    "env": [
      "ZHIPU_API_KEY"
    ],
    "api": "https://open.bigmodel.cn/api/coding/paas/v4",
    "models": [
      {
        "id": "glm-5.3-flash",
        "name": "GLM-5.3-Flash"
      },
      {
        "id": "glm-5.3",
        "name": "GLM-5.3"
      },
      {
        "id": "glm-5.3-highspeed",
        "name": "GLM-5.3 Highspeed"
      },
      {
        "id": "glm-4.6v",
        "name": "GLM-4.6V"
      }
    ],
    "note": "",
    "local": false
  }
];
