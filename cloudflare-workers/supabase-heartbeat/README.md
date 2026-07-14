# Supabase 心跳任务 - 防止免费项目挂起

## 📋 简介

这是一个 Cloudflare Workers 定时任务，用于定期访问你的 Supabase 项目，防止免费计划项目因 7 天无活动而被挂起。

## ✨ 功能

- ✅ 每周自动执行一次（可自定义频率）
- ✅ 轻量级，几乎不消耗资源
- ✅ 完全免费（Cloudflare Workers 每天 100,000 请求免费）
- ✅ 可在 Cloudflare Dashboard 查看执行日志

## 🚀 部署步骤

### 方法一：Cloudflare Dashboard（推荐新手）

1. **注册 Cloudflare 账号**
   - 访问 https://dash.cloudflare.com/
   - 使用邮箱注册（免费）

2. **创建 Worker**
   - 登录后，点击左侧「Workers & Pages」
   - 点击「Create application」
   - 选择「Create Worker」
   - 输入 Worker 名称：`supabase-heartbeat`（或其他名称）
   - 点击「Deploy」

3. **配置定时触发器**
   - 在 Worker 详情页，点击「Triggers」
   - 选择「Cron Triggers」标签
   - 点击「Add cron trigger」
   - 输入：`0 0 */5 * *`（每 5 天执行一次）
   - 或者输入 `0 0 * * *`（每天执行）
   - 点击「Save」

4. **部署代码**
   - 点击「Quick edit」
   - 删除所有现有代码
   - 复制 `src/index.ts` 中的全部内容
   - 粘贴到编辑器中
   - 点击「Save and deploy」

5. **验证部署**
   - 点击「Logs」标签
   - 查看是否有执行日志
   - 或者等待下一次定时执行

### 方法二：使用 Wrangler CLI

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
   cd cloudflare-workers/supabase-heartbeat
   wrangler deploy
   ```

4. **配置定时触发器**
   ```bash
   wrangler crons create "0 0 */5 * *"
   ```

## ⚙️ 自定义配置

### 修改 Supabase 配置

在 `src/index.ts` 文件中，修改以下配置：

```typescript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

### 修改执行频率

在 `wrangler.toml` 或 Dashboard 中修改 cron 表达式：

| 表达式 | 含义 |
|--------|------|
| `0 0 * * *` | 每天午夜执行 |
| `0 0 */3 * *` | 每 3 天执行一次 |
| `0 0 */5 * *` | 每 5 天执行一次（推荐） |
| `0 0 */7 * *` | 每 7 天执行一次 |

## 📊 监控

### 查看执行日志

1. 在 Cloudflare Dashboard 中打开你的 Worker
2. 点击「Logs」标签
3. 可以看到每次执行的详细日志

### 设置失败通知（可选）

如果需要接收失败通知，可以使用：

1. **Cloudflare Analytics**
   - 免费功能
   - 在 Worker 详情页查看请求统计

2. **外部监控服务**
   - 如：UptimeRobot（免费版够用）
   - 监控 Worker URL 的可用性

## ❓ 常见问题

### Q1: 免费额度够用吗？
**A**: 完全够用！
- Cloudflare Workers 免费版：每天 100,000 请求
- 这个心跳任务：每天最多 1 次
- 每月仅消耗约 30 次请求（0.03%）

### Q2: 如果任务失败了怎么办？
**A**:
- Cloudflare 会自动重试失败的 Worker
- 你可以查看日志排查问题
- 建议设置较长的执行间隔（5-7 天），减少失败概率

### Q3: 可以同时监控多个 Supabase 项目吗？
**A**: 可以！创建多个 Worker，每个项目一个，或者修改代码支持多项目。

### Q4: 如何手动触发测试？
**A**:
- 在 Worker 详情页，点击「Test Worker」
- 或访问 Worker 的 URL（如：`https://supabase-heartbeat.your-subdomain.workers.dev/`）

## 📝 完整代码

### src/index.ts

```typescript
/**
 * Supabase 心跳任务 - 防止免费项目 7 天挂起
 */

const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

export default {
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    console.log('🫀 Supabase 心跳任务开始...');

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/global_configs?select=id&limit=1`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });

      if (response.ok) {
        console.log('✅ Supabase 连接成功');
      } else {
        console.error('❌ 请求失败:', response.status);
      }
    } catch (error) {
      console.error('❌ 错误:', error);
    }
  },
};
```

## 🎯 最佳实践

1. **使用有意义的 Worker 名称**：如 `supabase-heartbeat-yourservice`
2. **定期检查日志**：确保任务正常执行
3. **设置监控**：使用免费服务监控 Worker 可用性
4. **更新凭证**：如果 Supabase 凭证变更，及时更新代码

## 📞 支持

如果遇到问题：
1. 查看 Cloudflare Workers 文档：https://developers.cloudflare.com/workers/
2. 查看 Worker 日志排查问题
3. 确保 Supabase 项目未被暂停

---

**💡 小提示**：部署完成后，建议等几天后再检查 Supabase Dashboard，确认项目保持活跃状态。
