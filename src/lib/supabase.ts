import { createClient } from '@supabase/supabase-js';

// Supabase 配置 - 已配置用户 Supabase 项目
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://obymoypzamyrnmfliwod.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ls3mCKcjDEPg_h-0dU96Hg_ZkYadtFQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 本地存储键名
export const STORAGE_KEYS = {
  CHARACTERS: 'ai_chat_characters',
  MESSAGES: 'ai_chat_messages',
  USER_CONFIG: 'ai_chat_user_config',
  GLOBAL_SETTINGS: 'ai_chat_global_settings',
  USER_ID: 'ai_chat_user_id',
};

// 生成本地用户ID
export function generateUserId(): string {
  const userId = localStorage.getItem(STORAGE_KEYS.USER_ID);
  if (!userId) {
    const newUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(STORAGE_KEYS.USER_ID, newUserId);
    return newUserId;
  }
  return userId;
}

// 获取当前用户ID
export function getCurrentUserId(): string {
  return localStorage.getItem(STORAGE_KEYS.USER_ID) || generateUserId();
}
