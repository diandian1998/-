/**
 * Supabase 心跳任务 - 防止免费项目 7 天挂起
 *
 * 部署方式：
 * 1. 注册 Cloudflare Workers（免费）
 * 2. 创建一个新的 Worker
 * 3. 将此代码粘贴进去
 * 4. 设置定时触发器（每 5 天执行一次）
 * 5. 部署即可
 */

// 你的 Supabase 项目配置
const SUPABASE_URL = 'https://obymoypzamyrnmfliwod.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ls3mCKcjDEPg_h-0dU96Hg_ZkYadtFQ';

interface Env {
  // 如果使用 Wrangler 部署，可以在这里配置环境变量
}

export default {
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    console.log('🫀 Supabase 心跳任务开始...');

    const startTime = Date.now();
    let success = false;
    let errorMessage = '';

    try {
      // 执行一个简单的查询来保持项目活跃
      const response = await fetch(`${SUPABASE_URL}/rest/v1/global_configs?select=id&limit=1`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        success = true;
        const data = await response.json();
        console.log('✅ Supabase 连接成功，当前数据:', data);
      } else {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        console.error('❌ Supabase 请求失败:', errorMessage);
      }
    } catch (error: any) {
      errorMessage = error.message || '未知错误';
      console.error('❌ Supabase 连接失败:', errorMessage);
    }

    const duration = Date.now() - startTime;

    // 输出日志（可以在 Cloudflare Dashboard 查看）
    console.log(`📊 心跳任务完成 - 耗时: ${duration}ms, 状态: ${success ? '成功' : '失败'}`);

    if (errorMessage) {
      console.error(`💔 错误信息: ${errorMessage}`);
    }

    // 如果失败，可以在这里添加重试逻辑或发送通知
    if (!success) {
      // 可选：发送错误通知（需要配置外部服务）
      // await sendErrorNotification(errorMessage);
    }
  },
};

// 可选：添加手动触发端点（用于测试）
export async function onRequest(context: { request: Request }): Promise<Response> {
  // 只允许特定来源的请求
  const allowedOrigins = ['https://your-admin-domain.com'];
  const origin = context.request.headers.get('Origin');

  if (!allowedOrigins.includes(origin || '')) {
    return new Response('Forbidden', { status: 403 });
  }

  // 手动执行心跳
  const fakeController = { noop: () => {} } as any;
  await this.scheduled(fakeController, {}, {} as ExecutionContext);

  return new Response(JSON.stringify({
    success: true,
    message: 'Heartbeat executed successfully'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
