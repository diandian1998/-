# AI 聊天平台 - 部署指南

## 📋 概述

这是一个完整的云端部署方案，包含：
- ✅ AI 聊天平台前端
- ✅ Supabase 云端数据库
- ✅ Cloudflare Workers 定时任务（防挂起）

## 🏗️ 架构说明

```
用户 (/chat)
    │
    ├── 读取管理员配置 ← Supabase 云端
    ├── 聊天记录存储 ← localStorage（本地）
    └── 导出/导入 ← 用户手动操作
            │
            ▼
Supabase 云端
    │
    ├── 管理员配置存储
    ├── 全局设置
    └── 云端数据（角色/提示词等）
            │
            ▼
Cloudflare Workers
    │
    └── 定时心跳（每5天）→ 防止 Supabase 挂起
```

## 📦 当前数据存储情况

| 数据类型 | 存储位置 | 占用 Supabase | 说明 |
|---------|---------|--------------|------|
| 管理员配置 | Supabase | ✅ ~1MB | 角色、提示词等 |
| 联系信息 | Supabase | ✅ ~1KB | 二维码 URL |
| 全局设置 | Supabase | ✅ ~1KB | 默认 API 等 |
| 用户聊天记录 | localStorage | ❌ 0 | 用户本地 |
| 用户配置 | localStorage | ❌ 0 | API Key 等 |
| 日记/记忆 | localStorage | ❌ 0 | 用户本地 |
| 秘密信箱 | localStorage | ❌ 0 | 用户本地 |
| 图片 | 第三方图床 | ❌ 0 | 只存 URL |

**结论**：Supabase 免费额度（500MB）完全够用！

---

## 🚀 部署步骤

### 第一步：配置 Supabase 用量提醒

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目
3. 点击左侧「Settings」→「Billing」
4. 点击「Set usage alert」
5. 设置提醒阈值（如：80%）
6. 输入接收提醒的邮箱
7. 保存

**效果**：当存储或 API 用量达到 80% 时，你会收到邮件提醒。

---

### 第二步：部署 Cloudflare Workers 心跳任务

#### 方法一：Dashboard 可视化部署（推荐）

1. **注册 Cloudflare 账号**
   - 访问 https://dash.cloudflare.com/
   - 使用邮箱注册（免费）

2. **创建 Worker**
   - 登录后，点击左侧「Workers & Pages」
   - 点击「Create application」
   - 选择「Create Worker」
   - 输入 Worker 名称：`supabase-heartbeat-ai-chat`（或其他名称）
   - 点击「Deploy」

3. **配置定时触发器**
   - 在 Worker 详情页，点击「Triggers」
   - 选择「Cron Triggers」标签
   - 点击「Add cron trigger」
   - 输入：`0 0 */5 * *`（每 5 天执行一次）
   - 点击「Save」

4. **部署代码**
   - 点击「Quick edit」
   - 删除所有现有代码
   - 复制下方「完整代码」中的内容
   - 粘贴到编辑器中
   - 修改 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY` 为你的值
   - 点击「Save and deploy」

5. **验证部署**
   - 点击「Logs」标签
   - 查看是否有执行日志
   - 或等待几分钟，手动触发一次

#### 方法二：使用 Wrangler CLI

1. **安装 Wrangler**
   ```bash
   npm install -g wrangler
   ```

2. **登录 Cloudflare**
   ```bash
   wrangler login
   ```

3. **部署 Worker**
   ```bash
   cd /workspace/ai-chat-platform/cloudflare-workers/supabase-heartbeat
   wrangler deploy
   ```

4. **配置定时触发器**
   ```bash
   wrangler crons create "0 0 */5 * *"
   ```

---

### 第三步：部署前端（如果你还没有部署）

1. **构建项目**
   ```bash
   cd /workspace/ai-chat-platform
   npm run build
   ```

2. **部署**
   - 方法 A：使用内置部署工具
   - 方法 B：手动部署到 Vercel、Netlify 等

---

## 📝 完整代码

### Cloudflare Workers 代码

```typescript
/**
 * Supabase 心跳任务 - 防止免费项目 7 天挂起
 *
 * 部署步骤：
 * 1. 注册 Cloudflare（免费）
 * 2. 创建 Worker
 * 3. 设置定时触发器（每 5 天）
 * 4. 粘贴此代码
 * 5. 修改下方配置
 */

// ⚠️ 请修改为你的 Supabase 配置
const SUPABASE_URL = 'https://obymoypzamyrnmfliwod.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ls3mCKcjDEPg_h-0dU96Hg_ZkYadtFQ';

interface Env {}

export default {
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    console.log('🫀 Supabase 心跳任务开始...');

    const startTime = Date.now();

    try {
      // 执行一个简单的查询来保持项目活跃
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/global_configs?select=id&limit=1`,
        {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Supabase 连接成功');
        console.log('📊 当前数据:', JSON.stringify(data));
      } else {
        console.error('❌ 请求失败:', response.status, response.statusText);
      }
    } catch (error: any) {
      console.error('❌ 错误:', error.message || error);
    }

    const duration = Date.now() - startTime;
    console.log(`📈 任务完成，耗时: ${duration}ms`);
  },
};
```

---

## 🔧 常见问题

### Q1: 免费额度够用吗？
**A**: 完全够用！
- Supabase 免费版：500MB 数据库
- 当前使用：< 1MB
- Cloudflare Workers：每天 100,000 请求免费
- 心跳任务：每 5 天 1 次 = 每月 6 次（0.006%）

### Q2: 如果心跳任务失败了怎么办？
**A**:
- Cloudflare 会自动重试
- 你可以在 Dashboard 查看日志
- 建议设置 5-7 天的间隔，减少失败概率

### Q3: 可以同时监控多个项目吗？
**A**: 可以！创建多个 Worker，每个项目一个。

### Q4: 用户数据会丢失吗？
**A**: 不会！
- 聊天记录在用户本地（localStorage）
- 管理员配置在云端（不会丢）
- 用户可以导出/导入备份

### Q5: 如何测试心跳任务是否工作？
**A**:
- 在 Cloudflare Dashboard 点击「Test Worker」
- 或等待定时执行后查看「Logs」
- 或访问 Worker URL（如：`https://xxx.workers.dev/`）

---

## 📊 监控建议

### Supabase 用量监控
1. 开启内置用量提醒（80% 阈值）
2. 定期检查 Dashboard

### Cloudflare Workers 监控
1. 查看 Worker 日志
2. 使用免费监控服务（如 UptimeRobot）监控 Worker URL

---

## 🎯 最佳实践

1. **定期检查**：每月检查一次 Supabase 用量
2. **日志审查**：定期查看 Cloudflare Worker 日志
3. **更新配置**：如果 Supabase 凭证变更，及时更新代码
4. **用户教育**：告诉用户定期导出聊天记录备份

---

## 📞 成本总结

| 服务 | 成本 | 说明 |
|------|------|------|
| Supabase | $0 | 免费版够用 |
| Cloudflare Workers | $0 | 免费版够用 |
| 图片存储 | $0 | 使用第三方图床 |
| 前端部署 | $0 | 使用免费托管服务 |

**总成本：$0/月** 🎉

---

## 📚 相关资源

- [Supabase 文档](https://supabase.com/docs)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [项目 GitHub 仓库](https://github.com/)

---

**💡 小提示**：部署完成后，建议等几天后再检查 Supabase Dashboard，确认项目保持活跃状态！
