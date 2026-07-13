/**
 * 云端存储模块 - 实现管理员配置云端同步
 * 管理员在 /admin 配置 → 所有用户的 /chat 自动获取
 */

import { supabase } from './supabase';
import { Character, GlobalSettings, TTSPreset, SecretMailboxPrompts, ImageLibrary } from '../types';

// 云端存储键名
export const CLOUD_KEYS = {
  GLOBAL_CONFIG: 'global_config',      // 全局配置（AI模型、TTS等）
  CHARACTERS: 'cloud_characters',      // 角色列表
  CONTACT_INFO: 'cloud_contact_info',  // 联系信息
  TTS_PRESETS: 'cloud_tts_presets',    // TTS预设
  MAILBOX_PROMPTS: 'cloud_mailbox_prompts', // 信箱提示词
  HELP_CONTENT: 'cloud_help_content',  // 帮助内容
  VERSION_URL: 'cloud_version_url',    // 新版本URL
  IMAGE_LIBRARY: 'cloud_image_library', // 图片库（表情包）
};

// ============ 全局配置（管理员设置，用户只读）============

// 保存全局配置到云端
export async function saveGlobalConfigToCloud(config: {
  defaultApiKey?: string;
  apiProvider?: string;
  apiModel?: string;
  defaultTtsEnabled?: boolean;
  defaultTtsPreset?: string;
  defaultAutoReplyEnabled?: boolean;
  defaultAutoReplyInterval?: number;
}): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('global_configs')
      .upsert({
        id: CLOUD_KEYS.GLOBAL_CONFIG,
        config_data: config,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('保存全局配置到云端失败:', error);
    return false;
  }
}

// 从云端获取全局配置
export async function getGlobalConfigFromCloud(): Promise<{
  defaultApiKey?: string;
  apiProvider?: string;
  apiModel?: string;
  defaultTtsEnabled?: boolean;
  defaultTtsPreset?: string;
  defaultAutoReplyEnabled?: boolean;
  defaultAutoReplyInterval?: number;
} | null> {
  try {
    const { data, error } = await supabase
      .from('global_configs')
      .select('config_data')
      .eq('id', CLOUD_KEYS.GLOBAL_CONFIG)
      .single();

    if (error || !data) return null;
    return data.config_data;
  } catch (error) {
    console.error('获取全局配置失败:', error);
    return null;
  }
}

// ============ 角色列表（管理员设置，用户只读）============

// 保存角色列表到云端
export async function saveCharactersToCloud(characters: Character[]): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('cloud_data')
      .upsert({
        id: CLOUD_KEYS.CHARACTERS,
        data_json: characters,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('保存角色到云端失败:', error);
    return false;
  }
}

// 从云端获取角色列表
export async function getCharactersFromCloud(): Promise<Character[] | null> {
  try {
    const { data, error } = await supabase
      .from('cloud_data')
      .select('data_json')
      .eq('id', CLOUD_KEYS.CHARACTERS)
      .single();

    if (error || !data) return null;
    return data.data_json;
  } catch (error) {
    console.error('获取角色列表失败:', error);
    return null;
  }
}

// ============ 联系信息 ============

export async function saveContactInfoToCloud(contactInfo: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('cloud_data')
      .upsert({
        id: CLOUD_KEYS.CONTACT_INFO,
        data_json: contactInfo,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('保存联系信息到云端失败:', error);
    return false;
  }
}

export async function getContactInfoFromCloud(): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('cloud_data')
      .select('data_json')
      .eq('id', CLOUD_KEYS.CONTACT_INFO)
      .single();

    if (error || !data) return null;
    return data.data_json;
  } catch (error) {
    console.error('获取联系信息失败:', error);
    return null;
  }
}

// ============ TTS预设 ============

export async function saveTtsPresetsToCloud(presets: TTSPreset[]): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('cloud_data')
      .upsert({
        id: CLOUD_KEYS.TTS_PRESETS,
        data_json: presets,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('保存TTS预设到云端失败:', error);
    return false;
  }
}

export async function getTtsPresetsFromCloud(): Promise<TTSPreset[] | null> {
  try {
    const { data, error } = await supabase
      .from('cloud_data')
      .select('data_json')
      .eq('id', CLOUD_KEYS.TTS_PRESETS)
      .single();

    if (error || !data) return null;
    return data.data_json;
  } catch (error) {
    console.error('获取TTS预设失败:', error);
    return null;
  }
}

// ============ 秘密信箱提示词 ============

export async function saveMailboxPromptsToCloud(prompts: SecretMailboxPrompts): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('cloud_data')
      .upsert({
        id: CLOUD_KEYS.MAILBOX_PROMPTS,
        data_json: prompts,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('保存信箱提示词到云端失败:', error);
    return false;
  }
}

export async function getMailboxPromptsFromCloud(): Promise<SecretMailboxPrompts | null> {
  try {
    const { data, error } = await supabase
      .from('cloud_data')
      .select('data_json')
      .eq('id', CLOUD_KEYS.MAILBOX_PROMPTS)
      .single();

    if (error || !data) return null;
    return data.data_json;
  } catch (error) {
    console.error('获取信箱提示词失败:', error);
    return null;
  }
}

// ============ 帮助内容 ============

export async function saveHelpContentToCloud(content: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('cloud_data')
      .upsert({
        id: CLOUD_KEYS.HELP_CONTENT,
        data_json: content,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('保存帮助内容到云端失败:', error);
    return false;
  }
}

export async function getHelpContentFromCloud(): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('cloud_data')
      .select('data_json')
      .eq('id', CLOUD_KEYS.HELP_CONTENT)
      .single();

    if (error || !data) return null;
    return data.data_json;
  } catch (error) {
    console.error('获取帮助内容失败:', error);
    return null;
  }
}

// ============ 版本更新URL ============

export async function saveVersionUrlToCloud(url: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('cloud_data')
      .upsert({
        id: CLOUD_KEYS.VERSION_URL,
        data_json: url,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('保存版本URL到云端失败:', error);
    return false;
  }
}

export async function getVersionUrlFromCloud(): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('cloud_data')
      .select('data_json')
      .eq('id', CLOUD_KEYS.VERSION_URL)
      .single();

    if (error || !data) return null;
    return data.data_json;
  } catch (error) {
    console.error('获取版本URL失败:', error);
    return null;
  }
}

// ============ 图片库（表情包）============

export async function saveImageLibraryToCloud(images: ImageLibrary[]): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('cloud_data')
      .upsert({
        id: CLOUD_KEYS.IMAGE_LIBRARY,
        data_json: images,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('保存图片库到云端失败:', error);
    return false;
  }
}

export async function getImageLibraryFromCloud(): Promise<ImageLibrary[] | null> {
  try {
    const { data, error } = await supabase
      .from('cloud_data')
      .select('data_json')
      .eq('id', CLOUD_KEYS.IMAGE_LIBRARY)
      .single();

    if (error || !data) return null;
    return data.data_json;
  } catch (error) {
    console.error('获取图片库失败:', error);
    return null;
  }
}

// ============ 同步状态检查 ============

// 检查是否是首次同步（需要初始化云端数据）
export async function checkCloudSyncStatus(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('cloud_data')
      .select('id')
      .limit(1);

    return !error && data !== null;
  } catch (error) {
    console.error('检查云端状态失败:', error);
    return false;
  }
}

// 批量获取所有云端配置（用于用户界面初始化）
export async function syncAllFromCloud(): Promise<{
  globalConfig: any;
  characters: Character[];
  contactInfo: any;
  ttsPresets: TTSPreset[];
  mailboxPrompts: SecretMailboxPrompts;
  helpContent: string;
  versionUrl: string;
  imageLibrary: ImageLibrary[];
}> {
  const [
    globalConfig,
    characters,
    contactInfo,
    ttsPresets,
    mailboxPrompts,
    helpContent,
    versionUrl,
    imageLibrary
  ] = await Promise.all([
    getGlobalConfigFromCloud(),
    getCharactersFromCloud(),
    getContactInfoFromCloud(),
    getTtsPresetsFromCloud(),
    getMailboxPromptsFromCloud(),
    getHelpContentFromCloud(),
    getVersionUrlFromCloud(),
    getImageLibraryFromCloud(),
  ]);

  return {
    globalConfig: globalConfig || {},
    characters: characters || [],
    contactInfo: contactInfo || null,
    ttsPresets: ttsPresets || [],
    mailboxPrompts: mailboxPrompts || null,
    helpContent: helpContent || '',
    versionUrl: versionUrl || '',
    imageLibrary: imageLibrary || [],
  };
}
