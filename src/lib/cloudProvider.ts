/**
 * 云端存储提供者 - 支持多平台切换
 *
 * 当前支持：
 * - Supabase (默认)
 * - 预留：Firebase、Appwrite、Cloudflare D1、自建服务器等
 *
 * 如何切换平台：
 * 1. 修改 CLOUD_PROVIDER 为目标平台
 * 2. 在对应平台配置文件中填写凭证
 * 3. 重新部署前端即可
 */

import { supabase } from './supabase';
import { Character, GlobalSettings, TTSPreset, SecretMailboxPrompts } from '../types';

// ============ 云端服务商配置 ============

export type CloudProvider = 'supabase' | 'firebase' | 'appwrite' | 'custom';

interface CloudConfig {
  provider: CloudProvider;
  supabase?: {
    url: string;
    anonKey: string;
  };
  firebase?: {
    apiKey: string;
    projectId: string;
    // 其他 Firebase 配置...
  };
  appwrite?: {
    endpoint: string;
    projectId: string;
    databaseId: string;
    // 其他 Appwrite 配置...
  };
  custom?: {
    apiUrl: string;
    apiKey?: string;
  };
}

// 当前使用的云端配置（从环境变量读取）
const cloudConfig: CloudConfig = {
  provider: (import.meta.env.VITE_CLOUD_PROVIDER as CloudProvider) || 'supabase',
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || 'https://obymoypzamyrnmfliwod.supabase.co',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ls3mCKcjDEPg_h-0dU96Hg_ZkYadtFQ',
  },
};

// ============ 云端存储键名（统一格式）============

export const CLOUD_KEYS = {
  GLOBAL_CONFIG: 'global_config',
  CHARACTERS: 'cloud_characters',
  CONTACT_INFO: 'cloud_contact_info',
  TTS_PRESETS: 'cloud_tts_presets',
  MAILBOX_PROMPTS: 'cloud_mailbox_prompts',
  HELP_CONTENT: 'cloud_help_content',
  VERSION_URL: 'cloud_version_url',
};

// ============ 统一数据接口 ============

interface CloudData<T = any> {
  id: string;
  data: T;
  updatedAt: string;
}

// ============ 云端操作统一接口 ============

class CloudProviderAdapter {
  private provider: CloudProvider;

  constructor(provider: CloudProvider) {
    this.provider = provider;
  }

  // 通用读取方法
  async read<T>(key: string): Promise<T | null> {
    switch (this.provider) {
      case 'supabase':
        return this.readFromSupabase<T>(key);
      case 'firebase':
        return this.readFromFirebase<T>(key);
      case 'appwrite':
        return this.readFromAppwrite<T>(key);
      case 'custom':
        return this.readFromCustomAPI<T>(key);
      default:
        console.error(`不支持的云端提供商: ${this.provider}`);
        return null;
    }
  }

  // 通用写入方法
  async write<T>(key: string, data: T): Promise<boolean> {
    switch (this.provider) {
      case 'supabase':
        return this.writeToSupabase(key, data);
      case 'firebase':
        return this.writeToFirebase(key, data);
      case 'appwrite':
        return this.writeToAppwrite(key, data);
      case 'custom':
        return this.writeToCustomAPI(key, data);
      default:
        console.error(`不支持的云端提供商: ${this.provider}`);
        return false;
    }
  }

  // ============ Supabase 实现 ============
  private async readFromSupabase<T>(key: string): Promise<T | null> {
    try {
      const { data, error } = await supabase
        .from('cloud_data')
        .select('data_json')
        .eq('id', key)
        .single();

      if (error || !data) return null;
      return data.data_json as T;
    } catch (error) {
      console.error(`[Supabase] 读取 ${key} 失败:`, error);
      return null;
    }
  }

  private async writeToSupabase(key: string, data: any): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('cloud_data')
        .upsert({
          id: key,
          data_json: data,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`[Supabase] 写入 ${key} 失败:`, error);
      return false;
    }
  }

  // ============ Firebase 实现（预留）============
  private async readFromFirebase<T>(key: string): Promise<T | null> {
    // TODO: 实现 Firebase 读取逻辑
    console.log(`[Firebase] 读取 ${key} - 功能预留中`);
    return null;
  }

  private async writeToFirebase(key: string, data: any): Promise<boolean> {
    // TODO: 实现 Firebase 写入逻辑
    console.log(`[Firebase] 写入 ${key} - 功能预留中`);
    return false;
  }

  // ============ Appwrite 实现（预留）============
  private async readFromAppwrite<T>(key: string): Promise<T | null> {
    // TODO: 实现 Appwrite 读取逻辑
    console.log(`[Appwrite] 读取 ${key} - 功能预留中`);
    return null;
  }

  private async writeToAppwrite(key: string, data: any): Promise<boolean> {
    // TODO: 实现 Appwrite 写入逻辑
    console.log(`[Appwrite] 写入 ${key} - 功能预留中`);
    return false;
  }

  // ============ 自定义 API 实现（预留）============
  private async readFromCustomAPI<T>(key: string): Promise<T | null> {
    // TODO: 实现自定义 API 读取逻辑
    console.log(`[Custom API] 读取 ${key} - 功能预留中`);
    return null;
  }

  private async writeToCustomAPI(key: string, data: any): Promise<boolean> {
    // TODO: 实现自定义 API 写入逻辑
    console.log(`[Custom API] 写入 ${key} - 功能预留中`);
    return false;
  }

  // ============ 数据迁移工具 ============

  /**
   * 从一个平台迁移数据到另一个平台
   * 用户数据会自动迁移，无需手动操作
   */
  async migrateFrom(
    sourceProvider: CloudProvider,
    targetProvider: CloudProvider,
    dataKeys: string[]
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const key of dataKeys) {
      try {
        // 从源平台读取
        const originalProvider = this.provider;
        this.provider = sourceProvider;
        const data = await this.read(key);

        // 写入目标平台
        this.provider = targetProvider;
        if (data !== null) {
          await this.write(key, data);
        }

        // 恢复原提供商
        this.provider = originalProvider;
      } catch (error) {
        errors.push(`迁移 ${key} 失败: ${error}`);
      }
    }

    return {
      success: errors.length === 0,
      errors,
    };
  }
}

// 导出单例
export const cloudProvider = new CloudProviderAdapter(cloudConfig.provider);

// 导出配置信息（用于显示当前使用的服务商）
export function getCloudProviderInfo(): string {
  switch (cloudConfig.provider) {
    case 'supabase':
      return `Supabase (${cloudConfig.supabase?.url})`;
    case 'firebase':
      return 'Firebase';
    case 'appwrite':
      return 'Appwrite';
    case 'custom':
      return '自定义 API';
    default:
      return '未知';
  }
}
