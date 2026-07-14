import { AIResponse } from '../types';

// API 提供商类型
export type APIProvider = 'deepseek' | 'siliconflow' | 'doubao' | 'minimax' | 'qwen';

// API 配置
const API_CONFIG: Record<APIProvider, { baseUrl: string; defaultModel: string; modelDisplayName: string }> = {
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    modelDisplayName: 'DeepSeek V3',
  },
  siliconflow: {
    baseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'deepseek-ai/DeepSeek-V3',
    modelDisplayName: '硅基流动 DeepSeek',
  },
  doubao: {
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    defaultModel: 'doubao-pro-32k',
    modelDisplayName: '豆包 Pro',
  },
  minimax: {
    baseUrl: 'https://api.minimaxi.chat/v1',
    defaultModel: 'abab6.5s-chat',
    modelDisplayName: 'MiniMax',
  },
  qwen: {
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    modelDisplayName: '通义千问 Plus',
  },
};

// 获取用户配置的 API Key 和提供商
function getAPIConfig(): { apiKey: string; baseUrl: string; provider: APIProvider; model: string } {
  const userConfig = localStorage.getItem('ai_chat_user_config');
  if (userConfig) {
    const config = JSON.parse(userConfig);
    if (config.apiKey) {
      const provider = (config.apiProvider as APIProvider) || 'deepseek';
      const apiConfig = API_CONFIG[provider] || API_CONFIG.deepseek;
      return {
        apiKey: config.apiKey,
        baseUrl: apiConfig.baseUrl,
        provider,
        model: config.apiModel || apiConfig.defaultModel,
      };
    }
  }
  throw new Error('请先在设置中配置您的 API Key');
}

// 获取 API 提供商列表（用于设置界面）
export function getProviderList(): Array<{ id: APIProvider; name: string }> {
  return [
    { id: 'deepseek', name: 'DeepSeek (官方)' },
    { id: 'siliconflow', name: '硅基流动' },
    { id: 'doubao', name: '豆包 (火山引擎)' },
    { id: 'minimax', name: 'MiniMax' },
    { id: 'qwen', name: '通义千问' },
  ];
}

// 获取当前 API 提供商
export function getApiProvider(): APIProvider {
  const userConfig = localStorage.getItem('ai_chat_user_config');
  if (userConfig) {
    const config = JSON.parse(userConfig);
    return (config.apiProvider as APIProvider) || 'deepseek';
  }
  return 'deepseek';
}

// 通用 API 调用函数
async function callAI(
  messages: Array<{ role: string; content: string | { type: string; image_url?: string; text?: string }[] }>,
  systemPrompt?: string,
  model?: string,
  maxTokens?: number
): Promise<AIResponse> {
  let apiKey: string;
  let baseUrl: string;
  let actualModel: string;
  let actualProvider: APIProvider;

  try {
    const config = getAPIConfig();
    apiKey = config.apiKey;
    baseUrl = config.baseUrl;
    actualModel = model || config.model;
    actualProvider = config.provider;
  } catch (error) {
    throw error;
  }

  const allMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  // Token限制：优先使用传入的maxTokens，其次使用用户配置的defaultMaxTokens
  // 注意：降低此值可显著提高响应速度，但会限制回复长度
  const tokenLimit = maxTokens || 500; // 降低默认值从2000到500，提高响应速度

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: actualModel,
        messages: allMessages,
        temperature: 0.7,
        max_tokens: tokenLimit,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `HTTP ${response.status}`;

      // 提供直接、用户友好的错误诊断（不显示技术细节）
      let friendlyMessage = '';
      if (response.status === 400) {
        // 400错误最常见原因：模型名称不对 / API余额不足 / 请求参数问题
        friendlyMessage = 'AI服务调用失败，请检查API Key是否有余额，或尝试更换模型/服务商';
      } else if (response.status === 401) {
        friendlyMessage = 'API Key无效或已过期，请检查设置';
      } else if (response.status === 403) {
        friendlyMessage = '权限不足或账户余额不足，请检查API Key';
      } else if (response.status === 429) {
        friendlyMessage = '请求过于频繁，请稍后再试';
      } else if (response.status >= 500) {
        friendlyMessage = 'AI服务暂时不可用，请稍后重试';
      } else {
        friendlyMessage = '发送失败，请重试';
      }

      // 控制台保留技术细节便于排查，但给用户看的提示是友好的
      console.error(`[${actualProvider}] API错误:`, errorMessage, `状态码: ${response.status}`);
      throw new Error(friendlyMessage);
    }

    const data = await response.json();

    return {
      content: data.choices[0]?.message?.content || '',
      model: actualModel,
      usage: data.usage,
    };
  } catch (error) {
    console.error(`API (${actualProvider}) 错误:`, error);
    throw error;
  }
}

// 调用 DeepSeek V3 / 通用快速模型
export async function chatWithV3(
  messages: Array<{ role: string; content: string | { type: string; image_url?: string; text?: string }[] }>,
  systemPrompt?: string,
  maxTokens?: number
): Promise<AIResponse> {
  return callAI(messages, systemPrompt, undefined, maxTokens);
}

// 调用 DeepSeek R1 / 推理模型
export async function chatWithR1(
  messages: Array<{ role: string; content: string | { type: string; image_url?: string; text?: string }[] }>,
  systemPrompt?: string,
  maxTokens?: number
): Promise<AIResponse> {
  const provider = getApiProvider();

  // 根据不同提供商使用不同的推理/慢速模型
  const reasoningModels: Record<APIProvider, string> = {
    deepseek: 'deepseek-reasoner',
    siliconflow: 'deepseek-ai/DeepSeek-R1',
    doubao: 'doubao-pro-32k', // 豆包不支持R1，使用Pro
    minimax: 'abab6.5s-chat',
    qwen: 'qwen-plus',
  };

  const model = reasoningModels[provider] || 'deepseek-reasoner';
  return callAI(messages, systemPrompt, model, maxTokens);
}

// 智能选择模型（根据消息是否包含图片）
export async function smartChat(
  messages: Array<{ role: string; content: string | { type: string; image_url?: string; text?: string }[] }>,
  systemPrompt?: string,
  maxTokens?: number
): Promise<AIResponse> {
  // 检查是否有图片消息
  const hasImage = messages.some(msg => {
    if (typeof msg.content === 'string') return false;
    return Array.isArray(msg.content) && msg.content.some(c => c.type === 'image_url');
  });

  // 将消息转换为纯文本格式（暂时不支持图片发送）
  const textMessages = messages.map(msg => ({
    role: msg.role,
    content: typeof msg.content === 'string' ? msg.content : `[用户发送了图片]`,
  }));

  if (hasImage) {
    // 有图片，使用推理模型
    return chatWithR1(textMessages, systemPrompt, maxTokens);
  } else {
    // 无图片，使用快速模型
    return chatWithV3(textMessages, systemPrompt, maxTokens);
  }
}
