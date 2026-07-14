-- AI Chat Platform 数据库表结构
-- 请在 Supabase Dashboard → SQL Editor 中执行

-- 1. 用户配置表
CREATE TABLE IF NOT EXISTS user_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  api_key TEXT,
  api_provider TEXT DEFAULT 'deepseek',
  api_model TEXT DEFAULT 'deepseek-chat',
  theme TEXT DEFAULT 'light',
  tts_enabled BOOLEAN DEFAULT false,
  tts_url TEXT,
  stt_enabled BOOLEAN DEFAULT false,
  auto_reply BOOLEAN DEFAULT false,
  auto_reply_delay INTEGER DEFAULT 1000,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 2. 角色表
CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  avatar_bg TEXT,
  description TEXT,
  personality TEXT,
  system_prompt TEXT,
  greeting_prompt TEXT,
  custom_instructions TEXT,
  max_tokens INTEGER DEFAULT 2048,
  temperature REAL DEFAULT 0.8,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 聊天记录表
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- 4. 记忆表
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  memory_type TEXT DEFAULT 'summary',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. 表情库表
CREATE TABLE IF NOT EXISTS image_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. 秘密信箱表
CREATE TABLE IF NOT EXISTS secret_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  sender_name TEXT,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  is_replied BOOLEAN DEFAULT false,
  reply_content TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. 启用 RLS (行级安全策略)
ALTER TABLE user_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE secret_letters ENABLE ROW LEVEL SECURITY;

-- 8. RLS 策略 (允许用户访问自己的数据)
CREATE POLICY "用户访问自己的配置" ON user_configs FOR ALL USING (user_id = auth.uid()::text);
CREATE POLICY "用户访问自己的角色" ON characters FOR ALL USING (user_id = auth.uid()::text);
CREATE POLICY "用户访问自己的消息" ON messages FOR ALL USING (user_id = auth.uid()::text);
CREATE POLICY "用户访问自己的记忆" ON memories FOR ALL USING (user_id = auth.uid()::text);
CREATE POLICY "用户访问自己的表情" ON image_library FOR ALL USING (user_id = auth.uid()::text);
CREATE POLICY "用户访问自己的信件" ON secret_letters FOR ALL USING (user_id = auth.uid()::text);

-- 9. 简化策略 (暂时允许所有操作，方便开发)
DROP POLICY IF EXISTS "允许所有用户访问配置" ON user_configs;
CREATE POLICY "允许所有用户访问配置" ON user_configs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "允许所有用户访问角色" ON characters;
CREATE POLICY "允许所有用户访问角色" ON characters FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "允许所有用户访问消息" ON messages;
CREATE POLICY "允许所有用户访问消息" ON messages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "允许所有用户访问记忆" ON memories;
CREATE POLICY "允许所有用户访问记忆" ON memories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "允许所有用户访问表情" ON image_library;
CREATE POLICY "允许所有用户访问表情" ON image_library FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "允许所有用户访问信件" ON secret_letters;
CREATE POLICY "允许所有用户访问信件" ON secret_letters FOR ALL USING (true) WITH CHECK (true);

-- 10. 全局配置表（管理员设置，用户只读）
CREATE TABLE IF NOT EXISTS global_configs (
  id TEXT PRIMARY KEY,
  config_data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. 云端数据表（管理员发布的配置，用户只读）
CREATE TABLE IF NOT EXISTS cloud_data (
  id TEXT PRIMARY KEY,
  data_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 12. 启用 RLS
ALTER TABLE global_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_data ENABLE ROW LEVEL SECURITY;

-- 13. RLS 策略（允许所有人读取）
DROP POLICY IF EXISTS "允许所有人读取全局配置" ON global_configs;
CREATE POLICY "允许所有人读取全局配置" ON global_configs FOR SELECT USING (true);
DROP POLICY IF EXISTS "允许管理员写入全局配置" ON global_configs;
CREATE POLICY "允许管理员写入全局配置" ON global_configs FOR ALL USING (true);

DROP POLICY IF EXISTS "允许所有人读取云端数据" ON cloud_data;
CREATE POLICY "允许所有人读取云端数据" ON cloud_data FOR SELECT USING (true);
DROP POLICY IF EXISTS "允许管理员写入云端数据" ON cloud_data;
CREATE POLICY "允许管理员写入云端数据" ON cloud_data FOR ALL USING (true);

-- 14. 创建索引
CREATE INDEX IF NOT EXISTS idx_messages_character ON messages(character_id);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_memories_character ON memories(character_id);
