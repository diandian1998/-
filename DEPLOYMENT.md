# AI聊天平台 - 永久免费部署指南

## 方案概述

使用 **GitHub + Vercel** 实现永久免费部署，无需担心平台下架问题。

## 部署架构

```
代码更新 → GitHub → 自动触发 → Vercel自动部署 → 永久在线
```

## 部署步骤

### 第一步：上传代码到GitHub

#### 方法1：使用Git命令（推荐）

```bash
# 1. 进入项目目录
cd ai-chat-platform

# 2. 初始化Git仓库
git init

# 3. 添加所有文件
git add .

# 4. 提交代码
git commit -m "AI Chat Platform - Initial commit"

# 5. 创建GitHub仓库
# 访问 https://github.com/new 创建新仓库

# 6. 关联远程仓库（将YOUR_USERNAME替换为你的GitHub用户名）
git remote add origin https://github.com/YOUR_USERNAME/ai-chat-platform.git

# 7. 推送代码
git branch -M main
git push -u origin main
```

#### 方法2：使用GitHub网页上传

1. 访问 https://github.com/new
2. 创建新仓库，命名为 `ai-chat-platform`
3. 点击 "uploading an existing file"
4. 将项目所有文件拖拽上传
5. 点击 "Commit changes"

### 第二步：连接Vercel

1. 访问 https://vercel.com
2. 使用GitHub账号登录
3. 点击 "Add New Project"
4. 导入刚才创建的GitHub仓库
5. Framework Preset选择 "Vite"
6. Build Command保持默认 `npm run build`
7. Output Directory设置为 `dist`
8. 点击 "Deploy"

### 第三步：配置自定义域名（可选）

1. 在Vercel项目设置中点击 "Domains"
2. 输入你想要的域名
3. 按提示在域名DNS添加CNAME记录
4. 等待验证通过

## 部署完成

部署成功后，你将获得一个免费的 `.vercel.app` 子域名，例如：
`https://your-project.vercel.app`

## 自动更新

以后更新代码只需要：
```bash
git add .
git commit -m "更新说明"
git push
```
Vercel会自动检测到代码更新并重新部署。

## 费用说明

| 项目 | 费用 | 说明 |
|------|------|------|
| GitHub | 免费 | 代码托管 |
| Vercel Hobby | 免费 | 每月100GB流量，个人使用足够 |
| 域名 | 可选 | 可用免费.vercel.app域名 |
| 总费用 | **0元** | 永久免费 |

## 注意事项

1. **Vercel免费版限制**：
   - 每月100GB带宽
   - 无商业使用限制
   - 禁止用于军事/色情等违法用途

2. **API Key安全**：
   - API Key存储在用户浏览器localStorage
   - 不会在GitHub或Vercel暴露

3. **数据存储**：
   - 对话记录存储在浏览器本地
   - 多设备需要手动备份

## 常见问题

**Q: Vercel免费版会下架吗？**
A: Vercel是知名云服务平台，Hobby计划稳定运行多年。

**Q: 超过100GB流量怎么办？**
A: 聊天应用流量很小，100GB可支持数万次对话。

**Q: 如何备份代码？**
A: 代码已在GitHub，永久保存。

---

如需帮助，请联系开发者。
