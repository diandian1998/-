import { Character, Message, UserConfig, GlobalSettings, MemoryNode, ImageLibrary } from '../types';
import { STORAGE_KEYS, getCurrentUserId } from './supabase';

// 存储键名扩展
export const STORAGE_KEYS_EXT = {
  MEMORIES: 'ai_chat_memories',
  IMAGE_LIBRARY: 'ai_chat_image_library',
};

// 默认角色 - greetingPrompt 留空，开场白从云端同步获取
export const DEFAULT_CHARACTERS: Character[] = [
  {
    id: 'char_1',
    name: '温柔女友',
    avatar: 'https://i.pravatar.cc/150?img=1',
    description: '一个温柔体贴的女友角色',
    personality: '温柔、善良、体贴',
    systemPrompt: '你是一个温柔体贴的女友，说话轻声细语，关心对方，富有同理心。回复时只用对话形式，不要添加任何动作描写（如：xxx说、xxx想、xxx做等），也不要输出括号内容。',
    greetingPrompt: '', // 开场白从云端同步获取
    customInstructions: '禁止输出剧本式动作描写，回复要像正常聊天一样简洁自然。',
    maxTokens: 300,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'char_2',
    name: '搞笑损友',
    avatar: 'https://i.pravatar.cc/150?img=3',
    description: '一个幽默风趣的损友角色',
    personality: '幽默、搞笑、毒舌',
    systemPrompt: '你是一个幽默风趣的损友，喜欢开玩笑，说话搞笑但不失温暖。回复时只用对话形式，不要添加任何动作描写（如：xxx说、xxx想、xxx做等），也不要输出括号内容。',
    greetingPrompt: '', // 开场白从云端同步获取
    customInstructions: '禁止输出剧本式动作描写，回复要像正常聊天一样简洁有趣。',
    maxTokens: 300,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'char_3',
    name: '知心姐姐',
    avatar: 'https://i.pravatar.cc/150?img=5',
    description: '一个善解人意的知心姐姐角色',
    personality: '成熟、睿智、善解人意',
    systemPrompt: '你是一个善解人意的知心姐姐，可以倾听对方的烦恼，给予温暖的建议。回复时只用对话形式，不要添加任何动作描写（如：xxx说、xxx想、xxx做等），也不要输出括号内容。',
    greetingPrompt: '', // 开场白从云端同步获取
    customInstructions: '禁止输出剧本式动作描写，回复要像正常聊天一样温暖真诚。',
    maxTokens: 300,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'char_4',
    name: '神秘占卜师',
    avatar: 'https://i.pravatar.cc/150?img=12',
    description: '一个神秘的占卜师角色',
    personality: '神秘、睿智、富有洞察力',
    systemPrompt: '你是一个神秘的占卜师，说话充满神秘感，善于洞察人心。回复时只用对话形式，不要添加任何动作描写（如：xxx说、xxx想、xxx做等），也不要输出括号内容。',
    greetingPrompt: '', // 开场白从云端同步获取
    customInstructions: '禁止输出剧本式动作描写，回复要像正常聊天一样神秘有韵味。',
    maxTokens: 300,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'char_5',
    name: '傲娇大小姐',
    avatar: 'https://i.pravatar.cc/150?img=9',
    description: '一个傲娇的大小姐角色',
    personality: '傲娇、可爱、嘴硬心软',
    systemPrompt: '你是一个傲娇的大小姐，说话时表面傲慢但内心温柔，嘴硬心软。回复时只用对话形式，不要添加任何动作描写（如：xxx说、xxx想、xxx做等），也不要输出括号内容。',
    greetingPrompt: '', // 开场白从云端同步获取
    customInstructions: '禁止输出剧本式动作描写，回复要像正常聊天一样傲娇可爱。',
    maxTokens: 300,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// 默认全局设置
const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  id: 'global',
  defaultApiKey: '',
  defaultTtsEnabled: true,
  defaultAutoReplyEnabled: false,
  defaultAutoReplyInterval: 30,
  updatedAt: new Date().toISOString(),
};

// ============ 角色管理 ============

// 获取所有角色
export function getCharacters(): Character[] {
  const data = localStorage.getItem(STORAGE_KEYS.CHARACTERS);
  if (!data) {
    // 初始化默认角色
    saveCharacters(DEFAULT_CHARACTERS);
    return DEFAULT_CHARACTERS;
  }
  return JSON.parse(data);
}

// 保存角色
export function saveCharacters(characters: Character[]): void {
  localStorage.setItem(STORAGE_KEYS.CHARACTERS, JSON.stringify(characters));
}

// 添加角色
export function addCharacter(character: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>): Character {
  const characters = getCharacters();
  const newCharacter: Character = {
    ...character,
    id: `char_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  characters.push(newCharacter);
  saveCharacters(characters);
  return newCharacter;
}

// 更新角色
export function updateCharacter(id: string, updates: Partial<Character>): Character | null {
  const characters = getCharacters();
  const index = characters.findIndex(c => c.id === id);
  if (index === -1) return null;

  characters[index] = {
    ...characters[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveCharacters(characters);
  return characters[index];
}

// 删除角色
export function deleteCharacter(id: string): boolean {
  const characters = getCharacters();
  const filtered = characters.filter(c => c.id !== id);
  if (filtered.length === characters.length) return false;
  saveCharacters(filtered);
  return true;
}

// ============ 消息管理 ============

// 获取用户的消息历史
export function getMessages(characterId: string): Message[] {
  const userId = getCurrentUserId();
  const key = `${STORAGE_KEYS.MESSAGES}_${userId}_${characterId}`;
  const data = localStorage.getItem(key);
  if (!data) return [];
  return JSON.parse(data);
}

// 保存消息
export function saveMessage(message: Omit<Message, 'id' | 'createdAt'>): Message {
  const userId = getCurrentUserId();
  const key = `${STORAGE_KEYS.MESSAGES}_${userId}_${message.characterId}`;
  const messages = getMessages(message.characterId);

  const newMessage: Message = {
    ...message,
    id: `msg_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  messages.push(newMessage);
  localStorage.setItem(key, JSON.stringify(messages));
  return newMessage;
}

// 清空角色对话
export function clearCharacterMessages(characterId: string): void {
  const userId = getCurrentUserId();
  const key = `${STORAGE_KEYS.MESSAGES}_${userId}_${characterId}`;
  localStorage.removeItem(key);
}

// 保存消息列表（覆盖）
export function saveMessages(characterId: string, messages: Message[]): void {
  const userId = getCurrentUserId();
  const key = `${STORAGE_KEYS.MESSAGES}_${userId}_${characterId}`;
  localStorage.setItem(key, JSON.stringify(messages));
}

// 获取所有角色的最新消息（用于主动发消息功能）
export function getAllCharacterLatestMessages(): Array<{ characterId: string; messages: Message[] }> {
  const characters = getCharacters();
  const userId = getCurrentUserId();

  return characters.map(char => {
    const key = `${STORAGE_KEYS.MESSAGES}_${userId}_${char.id}`;
    const data = localStorage.getItem(key);
    return {
      characterId: char.id,
      messages: data ? JSON.parse(data) : [],
    };
  });
}

// ============ 用户配置 ============

// 获取用户配置
export function getUserConfig(): UserConfig {
  const userId = getCurrentUserId();
  const data = localStorage.getItem(STORAGE_KEYS.USER_CONFIG);
  if (!data) {
    const defaultConfig: UserConfig = {
      id: `config_${userId}`,
      userId,
      ttsEnabled: true,
      ttsUrl: '', // 默认使用浏览器TTS
      sttEnabled: true,
      autoReplyEnabled: false,
      autoReplyInterval: 30,
      dialogName: '', // 对话框名称
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveUserConfig(defaultConfig);
    return defaultConfig;
  }
  return JSON.parse(data);
}

// 保存用户配置
export function saveUserConfig(config: UserConfig): void {
  localStorage.setItem(STORAGE_KEYS.USER_CONFIG, JSON.stringify({
    ...config,
    updatedAt: new Date().toISOString(),
  }));
}

// ============ 角色对话名称管理 ============

// 获取指定角色的对话名称
export function getCharacterDialogName(characterId: string): string {
  const config = getUserConfig();
  return config.characterDialogNames?.[characterId] || config.dialogName || '';
}

// 保存指定角色的对话名称
export function saveCharacterDialogName(characterId: string, dialogName: string): void {
  const config = getUserConfig();
  const characterDialogNames = config.characterDialogNames || {};
  characterDialogNames[characterId] = dialogName;
  config.characterDialogNames = characterDialogNames;
  saveUserConfig(config);
}

// ============ 全局设置 ============

// 获取全局设置
export function getGlobalSettings(): GlobalSettings {
  const data = localStorage.getItem(STORAGE_KEYS.GLOBAL_SETTINGS);
  if (!data) {
    saveGlobalSettings(DEFAULT_GLOBAL_SETTINGS);
    return DEFAULT_GLOBAL_SETTINGS;
  }
  return JSON.parse(data);
}

// 保存全局设置
export function saveGlobalSettings(settings: GlobalSettings): void {
  localStorage.setItem(STORAGE_KEYS.GLOBAL_SETTINGS, JSON.stringify({
    ...settings,
    updatedAt: new Date().toISOString(),
  }));
}

// ============ 存储容量检测 ============

// 获取 localStorage 已使用空间（字节）
export function getStorageUsed(): number {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage.getItem(key)?.length || 0;
    }
  }
  return total * 2; // 字符按UTF-16算，约2字节/字符
}

// 获取 localStorage 剩余空间（估算）
export function getStorageRemaining(): number {
  const maxSize = 5 * 1024 * 1024; // 假设5MB
  return maxSize - getStorageUsed();
}

// 检查存储是否即将满（<10%剩余）
export function isStorageAlmostFull(): boolean {
  const used = getStorageUsed();
  const maxSize = 5 * 1024 * 1024;
  return used > maxSize * 0.9;
}

// 获取消息数量统计
export function getMessagesStats(): { total: number; byCharacter: Record<string, number> } {
  const characters = getCharacters();
  const userId = getCurrentUserId();
  const stats = { total: 0, byCharacter: {} as Record<string, number> };

  characters.forEach(char => {
    const key = `${STORAGE_KEYS.MESSAGES}_${userId}_${char.id}`;
    const data = localStorage.getItem(key);
    const count = data ? JSON.parse(data).length : 0;
    stats.byCharacter[char.id] = count;
    stats.total += count;
  });

  return stats;
}

// ============ 记忆节点（日记本） ============

// 获取所有记忆
export function getMemories(): MemoryNode[] {
  const data = localStorage.getItem(STORAGE_KEYS_EXT.MEMORIES);
  if (!data) return [];
  return JSON.parse(data);
}

// 保存记忆
export function saveMemory(memory: Omit<MemoryNode, 'id' | 'createdAt'>): MemoryNode {
  const memories = getMemories();
  const newMemory: MemoryNode = {
    ...memory,
    id: `mem_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  memories.push(newMemory);
  localStorage.setItem(STORAGE_KEYS_EXT.MEMORIES, JSON.stringify(memories));
  return newMemory;
}

// 删除记忆
export function deleteMemory(id: string): void {
  const memories = getMemories().filter(m => m.id !== id);
  localStorage.setItem(STORAGE_KEYS_EXT.MEMORIES, JSON.stringify(memories));
}

// 更新记忆
export function updateMemory(id: string, updates: Partial<MemoryNode>): void {
  const memories = getMemories();
  const index = memories.findIndex(m => m.id === id);
  if (index !== -1) {
    memories[index] = { ...memories[index], ...updates };
    localStorage.setItem(STORAGE_KEYS_EXT.MEMORIES, JSON.stringify(memories));
  }
}

// 获取某个角色的记忆
export function getMemoriesByCharacter(characterId: string): MemoryNode[] {
  return getMemories().filter(m => m.characterId === characterId);
}

// ============ 图片库 ============

// 默认图片库（添加测试用表情）
export const DEFAULT_IMAGE_LIBRARY: ImageLibrary[] = [
  {
    id: 'img_test_diandian',
    name: '电电',
    url: 'https://tucdn.wpon.cn/2026/07/07/4866090e19b05-1783423697.jpg',
    category: 'emoji',
    tags: ['电电'],
    createdAt: new Date().toISOString()
  }
];

// 获取图片库（支持按角色过滤）
export function getImageLibrary(characterId?: string): ImageLibrary[] {
  const data = localStorage.getItem(STORAGE_KEYS_EXT.IMAGE_LIBRARY);
  if (!data) {
    // 初始化默认图片
    saveImageLibrary(DEFAULT_IMAGE_LIBRARY);
    return DEFAULT_IMAGE_LIBRARY;
  }
  const allImages: ImageLibrary[] = JSON.parse(data);
  if (!characterId) {
    return allImages;
  }
  // 返回该角色的表情包 + 全局表情包（characterId 为空）
  return allImages.filter(img => !img.characterId || img.characterId === characterId);
}

// 保存图片库
export function saveImageLibrary(images: ImageLibrary[]): void {
  localStorage.setItem(STORAGE_KEYS_EXT.IMAGE_LIBRARY, JSON.stringify(images));
}

// 添加图片到库
export function addImageToLibrary(image: Omit<ImageLibrary, 'id' | 'createdAt'>): ImageLibrary {
  const images = getImageLibrary();
  const newImage: ImageLibrary = {
    ...image,
    id: `img_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  images.push(newImage);
  saveImageLibrary(images);
  return newImage;
}

// 删除图片
export function deleteImageFromLibrary(id: string): void {
  const images = getImageLibrary().filter(img => img.id !== id);
  saveImageLibrary(images);
}

// 按分类获取图片
export function getImagesByCategory(category: string): ImageLibrary[] {
  return getImageLibrary().filter(img => img.category === category);
}

// 搜索图片（支持按角色过滤）
export function searchImages(keyword: string, characterId?: string): ImageLibrary[] {
  const lowerKeyword = keyword.toLowerCase();
  return getImageLibrary(characterId).filter(img =>
    img.name.toLowerCase().includes(lowerKeyword) ||
    img.tags?.some(tag => tag.toLowerCase().includes(lowerKeyword))
  );
}

// ============ 秘密信箱 ============

import { SecretMailboxLetter, SecretMailboxPrompts } from '../types';

// 存储键
const MAILBOX_STORAGE_KEY = 'ai_chat_secret_mailbox';
const MAILBOX_PROMPTS_KEY = 'ai_chat_mailbox_prompts';

// 默认提示词
export const DEFAULT_MAILBOX_PROMPTS: SecretMailboxPrompts = {
  category1: '写一封温柔的心里话，表达对方在你心中的特别之处，50字以内',
  category2: '以心声的方式，写下那些想说却没说出口的话，50字以内',
  category3: '记录一些生活中的小细节，那些让你感到温暖的瞬间，50字以内',
  category4: '写下一些从未说出口的话，可以是遗憾、感谢或期待，50字以内',
};

// 获取所有信件
export function getMailboxLetters(): SecretMailboxLetter[] {
  const data = localStorage.getItem(MAILBOX_STORAGE_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

// 保存信件到信箱
export function saveMailboxLetter(letter: Omit<SecretMailboxLetter, 'id' | 'createdAt'>): SecretMailboxLetter {
  const letters = getMailboxLetters();

  // 检查是否超过35封信
  if (letters.length >= 35) {
    // 删除最老的信件
    const oldestFirst = [...letters].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    letters.splice(0, letters.length - 34);
  }

  // 删除已过期的信件
  const now = new Date();
  const validLetters = letters.filter(l => new Date(l.expiresAt) > now);

  const newLetter: SecretMailboxLetter = {
    ...letter,
    id: `mail_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  validLetters.push(newLetter);
  localStorage.setItem(MAILBOX_STORAGE_KEY, JSON.stringify(validLetters));
  return newLetter;
}

// 获取特定角色的信件
export function getMailboxLettersByCharacter(characterId: string): SecretMailboxLetter[] {
  return getMailboxLetters()
    .filter(l => l.characterId === characterId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// 标记信件为已读
export function markLetterAsRead(letterId: string): void {
  const letters = getMailboxLetters();
  const index = letters.findIndex(l => l.id === letterId);
  if (index !== -1) {
    letters[index].isRead = true;
    localStorage.setItem(MAILBOX_STORAGE_KEY, JSON.stringify(letters));
  }
}

// 删除信件
export function deleteMailboxLetter(letterId: string): void {
  const letters = getMailboxLetters().filter(l => l.id !== letterId);
  localStorage.setItem(MAILBOX_STORAGE_KEY, JSON.stringify(letters));
}

// 获取即将过期的信件（3天内）
export function getExpiringLetters(): SecretMailboxLetter[] {
  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  return getMailboxLetters().filter(l => {
    const expiresAt = new Date(l.expiresAt);
    return expiresAt > now && expiresAt <= threeDaysLater;
  });
}

// 获取信箱提示词
export function getMailboxPrompts(): SecretMailboxPrompts {
  const data = localStorage.getItem(MAILBOX_PROMPTS_KEY);
  if (!data) {
    saveMailboxPrompts(DEFAULT_MAILBOX_PROMPTS);
    return DEFAULT_MAILBOX_PROMPTS;
  }
  return JSON.parse(data);
}

// 保存信箱提示词
export function saveMailboxPrompts(prompts: SecretMailboxPrompts): void {
  localStorage.setItem(MAILBOX_PROMPTS_KEY, JSON.stringify(prompts));
}

// 计算信件剩余天数
export function getDaysUntilExpiry(expiresAt: string): number {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}
