// 角色配置
export interface Character {
  id: string;
  name: string;
  avatar: string;
  description: string;
  personality: string;
  systemPrompt: string;
  greetingPrompt?: string; // 打招呼提示（首次对话时使用）
  customInstructions?: string; // 自定义调教指令
  maxTokens?: number; // 回复Token限制
  createdAt: string;
  updatedAt: string;
}

// 消息类型
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  imageUrl?: string;
  fileName?: string;
  characterId: string;
  userId: string;
  isMemory?: boolean; // 是否标记为重要记忆
  createdAt: string;
}

// 记忆节点（日记本）
export interface MemoryNode {
  id: string;
  messageId: string;
  characterId: string;
  userId: string;
  title: string; // 用户可自定义标题
  content: string; // 消息内容摘要
  mood?: string; // 心情标签
  tags?: string[]; // 自定义标签
  createdAt: string;
}

// 图片库
export interface ImageLibrary {
  id: string;
  name: string;
  url: string;
  category: string; // 分类：emoji, sticker, photo, meme
  tags?: string[]; // 标签便于搜索
  createdAt: string;
}

// API提供商
export type APIProvider = 'deepseek' | 'siliconflow' | 'doubao' | 'minimax' | 'qwen';

// 用户配置
export interface UserConfig {
  id: string;
  userId: string;
  customAvatar?: string;
  customBackground?: string;
  customBackgroundUrl?: string; // 背景图片URL（兼容旧版本，全局）
  // 每个角色单独背景：key为角色ID，value为背景URL
  characterBackgrounds?: Record<string, string>;
  customTheme?: string;
  apiKey?: string;
  apiProvider?: APIProvider; // API服务商
  apiModel?: string; // 自定义模型名称
  defaultMaxTokens?: number; // 默认Token限制
  ttsEnabled: boolean;
  ttsUrl?: string; // 自定义TTS服务地址
  sttEnabled: boolean;
  autoReplyEnabled: boolean;
  autoReplyInterval: number;
  autoReplyStyle?: string; // 主动消息风格：casual, caring, playful
  dialogName?: string; // 对话框名称/备注
  aiCanSendImages?: boolean; // AI是否可以使用图片库
  aiCanSearch?: boolean; // AI是否可以联网搜索
  // 对话风格设置
  dialogueStyle?: 'normal' | 'playful' | 'formal'; // 对话风格
  preventScriptStyle?: boolean; // 防止剧本式输出
  createdAt: string;
  updatedAt: string;
}

// 全局设置（管理员配置）
export interface GlobalSettings {
  id: string;
  defaultApiKey: string;
  defaultTtsEnabled: boolean;
  defaultAutoReplyEnabled: boolean;
  defaultAutoReplyInterval: number;
  updatedAt: string;
}

// TTS预设配置
export interface TTSPreset {
  id: string;
  name: string; // 显示名称
  description: string; // 描述
  baseUrl: string; // API地址
  apiKey?: string; // 认证密钥（可选）
  method: 'POST' | 'GET'; // 请求方法
  headers?: string; // 自定义请求头（JSON字符串格式）
  bodyTemplate?: string; // 请求体模板，使用{{text}}表示文本占位
  contentType?: string; // 请求Content-Type
  voiceId?: string; // 声音ID参数名
  voiceIdValue?: string; // 声音ID值
  responseType: 'audio' | 'json' | 'base64'; // 响应类型
  audioUrlField?: string; // JSON响应中音频URL字段路径（如 data.url）
  testText: string; // 测试文本
}

// 秘密信箱提示词配置
export interface SecretMailboxPrompts {
  category1: string; // 心里话
  category2: string; // 心声
  category3: string; // 生活细节
  category4: string; // 未说出口
}

// AI响应类型
export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  imageUrl?: string; // AI可选返回图片
}

// 秘密信箱信件
export interface SecretMailboxLetter {
  id: string;
  content: string; // 信件内容
  category: string; // 分类：心里话/心声/生活细节/未说出口
  expiresAt: string; // 过期时间
  createdAt: string; // 创建时间
  isRead: boolean; // 是否已读
  characterId: string; // 关联角色ID
  userId: string; // 用户ID
}

// API配置
export interface APIConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}
