import { useState, useEffect, useRef } from 'react';
import { Character, Message, MemoryNode, ImageLibrary } from '../types';
import SecretMailboxModal from '../components/SecretMailboxModal';
import CalendarView from '../components/CalendarView';
import {
  getCharacters, getMessages, saveMessage, getUserConfig, saveUserConfig,
  getGlobalSettings, clearCharacterMessages, getStorageUsed, isStorageAlmostFull,
  getMessagesStats, getMemories, saveMemory, deleteMemory, getMemoriesByCharacter,
  getImageLibrary, searchImages, addImageToLibrary, getMailboxLettersByCharacter,
  saveCharacters, saveGlobalSettings
} from '../lib/chatStorage';
import { smartChat, getProviderList, getApiProvider } from '../lib/deepseek';
import { SpeechRecognitionService, TextToSpeechService } from '../lib/voice';
import {
  syncAllFromCloud,
  getVersionUrlFromCloud,
  getContactInfoFromCloud,
  getHelpContentFromCloud,
  getGlobalConfigFromCloud,
  getImageLibraryFromCloud
} from '../lib/cloudStorage';
import {
  Settings, Send, Mic, MicOff, Image, FileText, Volume2, VolumeX,
  RefreshCw, Trash2, User, Plus, X, BookOpen, Star, ImagePlus,
  AlertTriangle, Clock, Search, Smile, MessageSquare, ExternalLink, CheckCircle, XCircle,
  Sparkles, BookHeart, HelpCircle, Mail, Calendar, Download, Cloud, CloudOff,
  ChevronDown, Wand2, Sliders
} from 'lucide-react';

// 当前版本号
const CURRENT_VERSION = '1.0.0';
const VERSION_KEY = 'ai_chat_version';
const NEW_VERSION_URL_KEY = 'ai_chat_new_version_url';
const HAS_SEEN_GUIDE_KEY = 'ai_chat_has_seen_guide';

// 联系信息存储键
const CONTACT_INFO_KEY = 'ai_chat_contact_info';

// 新用户引导内容
const GUIDE_CONTENT = {
  welcome: '欢迎来到你的秘密基地',
  features: [
    { icon: '📚', title: '日记本', desc: '收藏重要对话，添加标题和心情标签' },
    { icon: '💫', title: '回忆', desc: 'AI根据聊天生成温馨故事/诗歌' },
    { icon: '💌', title: '秘密信箱', desc: '神秘的限时来信，30天后自动消失' },
    { icon: '😊', title: '表情包', desc: '发送可爱的表情图片' },
    { icon: '⚙️', title: '设置', desc: '自定义头像、背景和语音功能' },
  ],
  rules: [
    { icon: '⭐', title: '收藏', desc: '点击AI消息旁的星星收藏到日记本' },
    { icon: '📅', title: '日历', desc: '按日期查看历史聊天记录' },
    { icon: '✏️', title: '改写', desc: '不满意AI回复？点击改写重新生成' },
    { icon: '💾', title: '导出', desc: '记忆满时自动提示下载备份' },
  ],
};

// 配置帮助文档（用户端）
const HELP_CONTENT_KEY = 'ai_chat_help_content';
const DEFAULT_HELP_CONTENT = `# AI聊天平台使用帮助

## 一、基础配置

### 1. API Key 配置
- **位置**：设置 → API Key
- **说明**：在对应的AI服务商平台获取API Key
- **支持平台**：DeepSeek、SiliconFlow、豆包、Minimax、通义千问
- **格式**：粘贴完整的API Key字符串
- **失败处理**：如果提示"API Key无效"，请检查Key是否正确或是否过期

### 2. TTS语音配置
- **位置**：设置 → 启用语音播报
- **可选**：使用浏览器内置TTS（免费）或配置自定义TTS服务
- **格式**：填写TTS服务API地址

### 3. STT语音输入
- **位置**：设置 → 启用语音输入
- **说明**：使用浏览器语音识别功能，需要麦克风权限

---

## 二、核心功能

### 1. 日记本
- **位置**：顶部导航 → 日记本
- **功能**：
  - 点击AI消息旁的星星收藏
  - 可添加标题和心情标签
  - 查看所有收藏的记忆
  - 支持搜索记忆内容
- **存储**：保存在本地，最多100条

### 2. 回忆
- **位置**：顶部导航 → 回忆
- **功能**：
  - 基于聊天记录生成温馨内容
  - 支持三种模式：温馨总结、浪漫小诗、温馨故事
  - 可保存到日记本
- **要求**：至少需要3条聊天记录

### 3. 秘密信箱
- **位置**：菜单 → 秘密信箱
- **重要说明**：开了哪个角色的对话框，就只能收到那个角色的信！切换角色后，信箱内容也会相应变化
- **规则**：
  - 最多存储35封信件
  - 每封信最长存活30天
  - 剩余3天会高亮提醒
  - 剩余1天会弹窗询问是否收藏
  - 聊天活跃时会额外生成
  - 长期未登录会强制生成

### 4. 表情包
- **位置**：顶部导航 → 表情
- **功能**：发送可爱的表情图片
- **支持**：表情库和自定义上传

---

## 三、高级功能

### 1. 日历查看
- **功能**：按日期查看历史聊天记录
- **操作**：点击日期查看当天对话

### 2. 关键词搜索
- **功能**：搜索聊天历史中的关键词
- **位置**：日历视图中的搜索框

### 3. 改写
- **功能**：对AI回复不满意时可重新生成
- **限制**：只保存最新版本

### 4. 自动回复
- **位置**：设置 → 启用自动回复
- **说明**：设置间隔时间，AI会在你沉默时主动发消息

---

## 四、导出与备份

### 1. 自动导出
- **触发**：当记忆接近存储上限时自动提示
- **格式**：JSON格式

### 2. 手动导出
- **方法**：在设置中手动导出备份文件

### 3. 导入恢复
- **方法**：导入之前下载的备份文件恢复数据

---

## 五、常见问题

### Q1：提示"API Key无效"？
- 检查Key是否正确
- 检查Key是否过期
- 确认选择的API服务商是否正确

### Q2：语音功能无法使用？
- 检查浏览器是否授予麦克风权限
- 确认浏览器支持Web Speech API

### Q3：消息发送失败？
- 检查网络连接
- 检查API Key余额

### Q4：如何清除聊天记录？
- 在设置中可清除当前角色的聊天记录
- 注意：清除后无法恢复

---

## 六、快捷操作

- **PC端**：直接输入文字发送
- **移动端**：可使用语音输入
- **表情**：点击表情按钮选择
- **图片**：点击图片按钮上传
- **收藏**：鼠标悬停或点击AI消息旁的星星

---

*如有问题请联系开发者*
`;

// 默认联系信息（用于兼容）
const DEFAULT_CONTACT_INFO = {
  xiaohongshuQrUrl: 'https://img.remit.ee/api/file/BQACAgUAAyEGAASHRsPbAAEW1WdqTiuM-yqTmEryxcCMmVwB-XRSLAACfy0AAuHecVb-LUNNpAe2vTwE.jpg',
  wechatPayQrUrl: 'https://img.remit.ee/api/file/BQACAgUAAyEGAASHRsPbAAEW1W1qTiwhuHj2DaHr0X8attSUUh_PqAAChS0AAuHecVbmrrwHwlC-CDwE.jpg',
  contactTitle: '和我联系',
  contactDesc: '扫码关注我的小红书，和我聊天互动~',
  supportTitle: '支持开发',
  supportText1: '你好呀我是电电，目前我的开发费用大概在每月50~100之间，用于AI编程和功能维护升级。本意我是不想盈利的，但是开支也实在地产生了。',
  supportText2: '因此如果你有余力且乐意支持的话，非常欢迎~！如果对我的制作感到担忧或想免费聊老公也完全Ok我完全理解！',
  supportText3: '感谢你的信任并阅读到这段文字，祝你生活愉快。',
};

// Toast通知组件
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  emoji?: string;
}

export default function UserChat() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [currentCharacter, setCurrentCharacter] = useState<Character | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [userConfig, setUserConfig] = useState(getUserConfig());
  const [failedAvatars, setFailedAvatars] = useState<Set<string>>(new Set());
  const [showDiary, setShowDiary] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [memories, setMemories] = useState<MemoryNode[]>([]);
  const [imageLibrary, setImageLibrary] = useState<ImageLibrary[]>([]);
  const [imageSearch, setImageSearch] = useState('');
  const [lastReplyTime, setLastReplyTime] = useState<number>(Date.now());
  const [lastUserReplyTime, setLastUserReplyTime] = useState<number>(Date.now());
  const [autoReplyCount, setAutoReplyCount] = useState<number>(0);
  const [showMemorySave, setShowMemorySave] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summarizedContent, setSummarizedContent] = useState('');
  const [showMessageBoard, setShowMessageBoard] = useState(false);
  const [showMemories, setShowMemories] = useState(false);
  const [memoryContent, setMemoryContent] = useState('');
  const [isGeneratingMemory, setIsGeneratingMemory] = useState(false);
  const [memoryType, setMemoryType] = useState<'summary' | 'poem' | 'story'>('summary');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [bgPreviewUrl, setBgPreviewUrl] = useState<string>('');
  const [showVersionAlert, setShowVersionAlert] = useState(false);
  const [newVersionUrl, setNewVersionUrl] = useState('');
  const [contactInfo, setContactInfo] = useState(DEFAULT_CONTACT_INFO);
  const [showGuide, setShowGuide] = useState(false);
  const [showRulesDetail, setShowRulesDetail] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [helpContent, setHelpContent] = useState(DEFAULT_HELP_CONTENT);
  const [showNavMenu, setShowNavMenu] = useState(false);
  const [showSecretMailbox, setShowSecretMailbox] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'syncing' | 'success' | 'offline'>('syncing');
  const [showCharacterPicker, setShowCharacterPicker] = useState(false);
  const [showTuning, setShowTuning] = useState(false);
  const [userCustomPrompt, setUserCustomPrompt] = useState('');
  const [userForceMemory, setUserForceMemory] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoReplyTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 显示Toast通知 - 顶部居中显示
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info', emoji?: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type, emoji }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // 修复7：加载当前角色的调教设置
  useEffect(() => {
    if (showTuning && currentCharacter) {
      const tuningKey = `ai_chat_tuning_${currentCharacter.id}`;
      const savedTuning = JSON.parse(localStorage.getItem(tuningKey) || '{}');
      setUserCustomPrompt(savedTuning.customPrompt || '');
      setUserForceMemory(savedTuning.forceMemory || '');
    }
  }, [showTuning, currentCharacter]);

  // 从云端同步配置
  useEffect(() => {
    const syncFromCloud = async () => {
      try {
        // 批量获取云端配置
        const cloudData = await syncAllFromCloud();

        // 同步角色列表
        if (cloudData.characters && cloudData.characters.length > 0) {
          saveCharacters(cloudData.characters);
        }

        // 同步全局配置（包含默认API Key等）
        if (cloudData.globalConfig) {
          const localGlobal = getGlobalSettings() || {};
          const cloudConfig = cloudData.globalConfig as any;
          const localConfig = localGlobal as any;
          const mergedGlobal = {
            ...localGlobal,
            ...cloudConfig,
            // 用户自己设置的优先
            defaultApiKey: localConfig.defaultApiKey || cloudConfig.defaultApiKey,
          };
          saveGlobalSettings(mergedGlobal);
        }

        // 同步联系信息
        if (cloudData.contactInfo) {
          localStorage.setItem(CONTACT_INFO_KEY, JSON.stringify(cloudData.contactInfo));
          setContactInfo(cloudData.contactInfo);
        }

        // 同步帮助内容
        if (cloudData.helpContent) {
          localStorage.setItem(HELP_CONTENT_KEY, cloudData.helpContent);
          setHelpContent(cloudData.helpContent);
        }

        // 同步版本URL
        if (cloudData.versionUrl) {
          localStorage.setItem(NEW_VERSION_URL_KEY, cloudData.versionUrl);
          const savedVersion = localStorage.getItem(VERSION_KEY);
          if (savedVersion && savedVersion !== CURRENT_VERSION) {
            setNewVersionUrl(cloudData.versionUrl);
            setShowVersionAlert(true);
          }
        }

        setCloudSyncStatus('success');
      } catch (error) {
        console.error('云端同步失败:', error);
        setCloudSyncStatus('offline');
      }
    };

    syncFromCloud();
  }, []);

  // 检查版本更新
  useEffect(() => {
    const savedVersion = localStorage.getItem(VERSION_KEY);
    const savedNewUrl = localStorage.getItem(NEW_VERSION_URL_KEY);

    // 如果有保存的新版本URL且与当前版本不同，显示提示
    if (savedNewUrl && savedVersion && savedVersion !== CURRENT_VERSION) {
      setNewVersionUrl(savedNewUrl);
      setShowVersionAlert(true);
    }

    // 保存当前版本
    localStorage.setItem(VERSION_KEY, CURRENT_VERSION);

    // 加载联系信息
    const savedContactInfo = localStorage.getItem(CONTACT_INFO_KEY);
    if (savedContactInfo) {
      setContactInfo(JSON.parse(savedContactInfo));
    }

    // 检查是否需要显示新用户引导
    const hasSeenGuide = localStorage.getItem(HAS_SEEN_GUIDE_KEY);
    if (!hasSeenGuide) {
      // 延迟显示引导，让页面先加载完成
      setTimeout(() => setShowGuide(true), 500);
    }

    // 加载帮助内容
    const savedHelpContent = localStorage.getItem(HELP_CONTENT_KEY);
    if (savedHelpContent) {
      setHelpContent(savedHelpContent);
    }
  }, []);

  // 版本更新提示忽略
  const handleDismissVersionAlert = () => {
    setShowVersionAlert(false);
  };

  // 导出对话记录
  const handleExportChat = (format: 'txt' | 'markdown') => {
    if (messages.length === 0) {
      showToast('没有可导出的对话记录', 'error', '❌');
      return;
    }

    const characterName = currentCharacter?.name || 'AI';
    const dateStr = new Date().toLocaleDateString('zh-CN');

    let content = '';
    let fileName = '';

    if (format === 'markdown') {
      fileName = `${characterName}_对话_${dateStr}.md`;
      content = `# 与 ${characterName} 的对话记录\n\n`;
      content += `导出时间：${new Date().toLocaleString('zh-CN')}\n\n---\n\n`;

      messages.forEach(msg => {
        const time = new Date(msg.createdAt).toLocaleString('zh-CN');
        const role = msg.role === 'user' ? '我' : characterName;
        content += `## ${role} · ${time}\n\n`;
        if (msg.imageUrl) {
          content += `![图片](图片)\n\n`;
        }
        if (msg.fileName) {
          content += `[附件: ${msg.fileName}]\n\n`;
        }
        content += `${msg.content}\n\n---\n\n`;
      });
    } else {
      fileName = `${characterName}_对话_${dateStr}.txt`;
      content = `与 ${characterName} 的对话记录\n`;
      content += `导出时间：${new Date().toLocaleString('zh-CN')}\n`;
      content += `${'='.repeat(40)}\n\n`;

      messages.forEach(msg => {
        const time = new Date(msg.createdAt).toLocaleString('zh-CN');
        const role = msg.role === 'user' ? '我' : characterName;
        content += `[${role}] ${time}\n`;
        if (msg.imageUrl) {
          content += `[发送了图片]\n`;
        }
        if (msg.fileName) {
          content += `[附件: ${msg.fileName}]\n`;
        }
        content += `${msg.content}\n\n`;
        content += `${'-'.repeat(30)}\n\n`;
      });
    }

    // 创建下载
    const blob = new Blob([content], { type: format === 'markdown' ? 'text/markdown' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`已导出为${format === 'markdown' ? 'Markdown' : 'TXT'}格式`, 'success', '📥');
    setShowExport(false);
  };

  // 跳转到新版本
  const handleGoToNewVersion = () => {
    if (newVersionUrl) {
      window.open(newVersionUrl, '_blank');
    }
    setShowVersionAlert(false);
  };

  // 备用头像（使用SVG内联，不依赖外部URL）
  const fallbackAvatar = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#3b82f6"/><circle cx="50" cy="35" r="20" fill="#fff"/><ellipse cx="50" cy="80" rx="30" ry="20" fill="#fff"/></svg>')}`;

  // 头像加载失败处理
  const handleAvatarError = (avatarUrl: string) => {
    setFailedAvatars(prev => new Set([...prev, avatarUrl]));
  };

  // 获取头像URL（如果加载失败则使用备用头像）
  const getAvatarUrl = (avatarUrl: string, name: string) => {
    // 检查是否已标记为加载失败
    if (failedAvatars.has(avatarUrl)) {
      // 返回带名字首字母的彩色备用头像
      const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981'];
      const color = colors[name.length % colors.length];
      const initial = name.charAt(0);
      return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="${color}"/><text x="50" y="65" font-size="50" font-family="Arial" text-anchor="middle" fill="white">${initial}</text></svg>`)}`;
    }
    return avatarUrl;
  };

  const sttService = new SpeechRecognitionService();
  const ttsService = new TextToSpeechService();

  useEffect(() => {
    loadCharacters();
    loadMemories();
    loadImageLibrary();
    // 初始化时也加载消息
    const initMessages = () => {
      const chars = getCharacters();
      if (chars.length > 0) {
        const msgs = getMessages(chars[0].id);
        setMessages(msgs);
      }
    };
    initMessages();
  }, []);

  useEffect(() => {
    if (currentCharacter) {
      loadMessages();
      loadMemories();
    }
  }, [currentCharacter]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 自动回复功能
  useEffect(() => {
    if (userConfig.autoReplyEnabled && currentCharacter) {
      // 清除之前的定时器
      if (autoReplyTimerRef.current) {
        clearInterval(autoReplyTimerRef.current);
      }

      // 设置新的定时器
      autoReplyTimerRef.current = setInterval(() => {
        const now = Date.now();
        const timeSinceLastReply = now - lastReplyTime;
        const interval = userConfig.autoReplyInterval * 1000;

        // 如果超过设定时间没有新消息，且不在加载状态
        if (timeSinceLastReply >= interval && !isLoading && messages.length > 0) {
          triggerAutoReply();
        }
      }, 10000); // 每10秒检查一次

      return () => {
        if (autoReplyTimerRef.current) {
          clearInterval(autoReplyTimerRef.current);
        }
      };
    }
  }, [userConfig.autoReplyEnabled, userConfig.autoReplyInterval, currentCharacter, lastReplyTime, isLoading, messages.length]);

  // 触发主动发消息
  const triggerAutoReply = async () => {
    if (!currentCharacter || !userConfig.apiKey) return;

    const currentConfig = getUserConfig();
    if (!currentConfig.apiKey) return;

    // 检查是否超过3条连续自动回复
    if (autoReplyCount >= 3) {
      console.log('已达到最大连续自动回复次数(3条)，等待用户主动回复');
      return;
    }

    setIsLoading(true);
    try {
      const recentMessages = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));

      // 获取图片库中的表情
      const images = getImageLibrary();
      const emojiImages = images.filter(img => img.category === 'emoji');
      const emojiList = emojiImages.map(e => `${e.name}: ${e.url}`).join('\n');

      // 判断用户多久没回复了
      const userIdleTime = (Date.now() - lastUserReplyTime) / 1000; // 秒
      const isUserIdle = userIdleTime > userConfig.autoReplyInterval * 2;

      let autoReplyPrompt: string;

      if (isUserIdle || autoReplyCount > 0) {
        // 用户长时间没回复或已有多条自动回复，只能发询问/关心类消息
        autoReplyPrompt = `你是${currentCharacter.name}，角色性格：${currentCharacter.personality}。

重要规则：
1. 你只能基于对话中的已有内容进行回复，禁止编造任何新的剧情、事件或信息
2. 你只能发送简短的问候、关心或提问类的消息
3. 禁止创造新的人物、地点、故事线或任何对话中没有提到的内容
4. 最多20字
5. 可以询问对方是否还在、是否需要帮助、或者简单表达关心
6. 【可选】你可以在回复末尾用 [表情名称] 格式发送一个表情，例如：[开心]、[爱心]

可用的表情列表：
${emojiList}

只回复消息内容，格式为：消息内容 [表情名称]（表情可选），不要加其他说明`;
      } else {
        // 用户刚离开，可以稍微俏皮一些
        autoReplyPrompt = `你是${currentCharacter.name}，角色性格：${currentCharacter.personality}。

重要规则：
1. 你只能基于对话中的已有内容进行回复，禁止编造任何新的剧情、事件或信息
2. 根据对话氛围发送简短自然的回复
3. 禁止创造新的人物、地点、故事线或任何对话中没有提到的内容
4. 简短一些，20字以内
5. 如果对方刚刚在倾诉，多关心；如果气氛轻松，可以俏皮一些
6. 【可选】你可以在回复末尾用 [表情名称] 格式发送一个表情，例如：[开心]、[爱心]

可用的表情列表：
${emojiList}

只回复消息内容，格式为：消息内容 [表情名称]（表情可选），不要加其他说明`;
      }

      const response = await smartChat(recentMessages, autoReplyPrompt);

      // 解析AI回复，提取表情
      let replyContent = response.content;
      let imageUrl: string | undefined;

      const emojiMatch = replyContent.match(/\[([^\]]+)\]$/);
      if (emojiMatch) {
        const emojiName = emojiMatch[1];
        const matchedEmoji = emojiImages.find(e =>
          e.name.includes(emojiName) || emojiName.includes(e.name)
        );
        if (matchedEmoji) {
          imageUrl = matchedEmoji.url;
          replyContent = replyContent.replace(/\[([^\]]+)\]$/, '').trim();
        }
      }

      // 保存AI主动发送的消息
      const aiMsg = saveMessage({
        role: 'assistant',
        content: replyContent,
        characterId: currentCharacter.id,
        userId: 'current_user',
        imageUrl,
      });
      setMessages(prev => [...prev, aiMsg]);
      setLastReplyTime(Date.now());
      setAutoReplyCount(prev => prev + 1);

      // TTS播报
      if (userConfig.ttsEnabled) {
        try {
          await ttsService.speak(replyContent);
        } catch (ttsError) {
          console.log('TTS播放失败:', ttsError);
        }
      }
    } catch (error) {
      console.log('主动发消息失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 加载记忆
  const loadMemories = () => {
    if (currentCharacter) {
      setMemories(getMemoriesByCharacter(currentCharacter.id));
    }
  };

  // 加载图片库
  const loadImageLibrary = () => {
    setImageLibrary(getImageLibrary());
  };

  // 生成回忆内容
  const handleGenerateMemory = async () => {
    if (!currentCharacter || !userConfig.apiKey || messages.length === 0) {
      showToast('没有足够的聊天记录生成回忆~', 'error', '📝');
      return;
    }

    setIsGeneratingMemory(true);
    setMemoryContent('');

    try {
      const conversationText = messages.slice(-20).map(m =>
        `${m.role === 'user' ? '我' : currentCharacter.name}：${m.content}`
      ).join('\n');

      let prompt = '';
      switch (memoryType) {
        case 'summary':
          prompt = `请根据以下对话内容，生成一段温馨的回忆总结。要求：
1. 以第二人称"你"来称呼用户
2. 描述你们对话中的温馨时刻和情感交流
3. 温馨、感人、有画面感
4. 100字以内
5. 不需要标题，直接输出内容

对话内容：
${conversationText}`;
          break;
        case 'poem':
          prompt = `请根据以下对话内容，为这段美好的聊天创作一首小诗。要求：
1. 4-8句，有韵律感
2. 温馨、浪漫、情感真挚
3. 不需要标题，直接输出诗句

对话内容：
${conversationText}`;
          break;
        case 'story':
          prompt = `请根据以下对话内容，续写一个温馨的小故事片段。要求：
1. 50-100字
2. 以对话中的温馨氛围为基础
3. 温馨、感人、有画面感
4. 不需要标题，直接输出故事内容

对话内容：
${conversationText}`;
          break;
      }

      const response = await smartChat(
        [{ role: 'user', content: prompt }],
        '你是一个善于创作温馨故事的作家，文字温暖感人。'
      );

      setMemoryContent(response.content.trim());
      showToast('回忆生成成功~', 'success', '✨');
    } catch (error) {
      console.log('生成回忆失败:', error);
      showToast('生成失败啦，再试一次吧~', 'error', '❌');
    } finally {
      setIsGeneratingMemory(false);
    }
  };

  // 添加记忆
  const handleAddMemory = (msg: Message, title: string, mood?: string) => {
    const memory = saveMemory({
      messageId: msg.id,
      characterId: currentCharacter!.id,
      userId: 'current_user',
      title: title || `与${currentCharacter?.name}的对话`,
      content: msg.content.substring(0, 200),
      mood,
    });
    setMemories(prev => [...prev, memory]);
    showToast('已保存到日记本啦~', 'success', '📚');
  };

  // 删除记忆
  const handleDeleteMemory = (id: string) => {
    deleteMemory(id);
    setMemories(prev => prev.filter(m => m.id !== id));
    showToast('已删除记忆', 'info', '🗑️');
  };

  // 添加自定义图片
  const handleAddCustomImage = (name: string, url: string, category: string = 'photo') => {
    const image = addImageToLibrary({
      name,
      url,
      category,
      tags: [name],
    });
    setImageLibrary(prev => [...prev, image]);
  };

  // 选择图片发送
  const handleSelectImage = (img: ImageLibrary) => {
    saveMessage({
      role: 'assistant',
      content: `[${currentCharacter?.name}发送了表情：${img.name}]`,
      imageUrl: img.url,
      characterId: currentCharacter!.id,
      userId: 'current_user',
    });
    loadMessages();
    setShowImagePicker(false);
    setLastReplyTime(Date.now());
  };

  const loadCharacters = () => {
    const chars = getCharacters();
    setCharacters(chars);
    if (chars.length > 0 && !currentCharacter) {
      setCurrentCharacter(chars[0]);
    }
  };

  const loadMessages = () => {
    if (currentCharacter) {
      const msgs = getMessages(currentCharacter.id);
      setMessages(msgs);

      // 如果消息为空且有打招呼内容，自动发送开场白
      if (msgs.length === 0 && currentCharacter.greetingPrompt) {
        const greetingMsg: Message = {
          id: 'greeting_' + Date.now(),
          role: 'assistant',
          content: currentCharacter.greetingPrompt,
          characterId: currentCharacter.id,
          userId: 'current_user',
          createdAt: new Date().toISOString(),
        };
        saveMessage(greetingMsg);
        setMessages([greetingMsg]);
      }
    }
  };

  // 切换角色时重置自动回复计数器并清空消息
  const handleCharacterSwitch = (char: Character) => {
    setAutoReplyCount(0);
    setLastUserReplyTime(Date.now());
    setMessages([]); // 立即清空旧消息，防止混乱
    setCurrentCharacter(char);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 检测存储并自动总结
  const checkStorageAndSummarize = async () => {
    if (!isStorageAlmostFull() || isSummarizing) return false;

    setIsSummarizing(true);
    try {
      const currentMessages = getMessages(currentCharacter!.id);
      if (currentMessages.length < 5) {
        setIsSummarizing(false);
        return false;
      }

      // 调用AI总结对话
      const conversationText = currentMessages.map(m =>
        `${m.role === 'user' ? '用户' : currentCharacter!.name}：${m.content}`
      ).join('\n');

      const summaryPrompt = `请总结以下对话的要点，提取关键信息、情感交流和重要事件。回复格式：【总结】+ 100字以内的总结内容`;

      const response = await smartChat(
        [{ role: 'user', content: `${summaryPrompt}\n\n${conversationText}` }],
        '你是一个善于总结对话的助手，用简洁的语言总结对话要点。'
      );

      const summary = response.content.replace(/^【总结】/, '').trim();
      const date = new Date().toLocaleDateString('zh-CN');

      // 保存为记忆
      saveMemory({
        messageId: 'summary_' + Date.now(),
        characterId: currentCharacter!.id,
        userId: 'current_user',
        title: `${currentCharacter!.name}的对话记忆 (${date})`,
        content: summary,
        mood: '对话总结',
      });

      setSummarizedContent(summary);
      setShowMemorySave(true);
      showToast('对话记忆已保存，我们可以继续聊天啦~', 'success', '✨');

      // 清空对话继续
      clearCharacterMessages(currentCharacter!.id);
      setMessages([]);

      setIsSummarizing(false);
      return true;
    } catch (error) {
      console.log('自动总结失败:', error);
      setIsSummarizing(false);
      return false;
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !currentCharacter || isLoading) return;

    // 检查用户是否配置了 API Key
    const currentUserConfig = getUserConfig();
    if (!currentUserConfig.apiKey) {
      // 动态获取当前配置的API服务商名称
      const providerName = getProviderList().find(p => p.id === currentUserConfig.apiProvider)?.name || 'AI';
      setError(`请先在设置中配置您的 API Key（当前服务商：${providerName}）`);
      setShowSettings(true);
      showToast('请先配置API Key哦~', 'error', '🔑');
      return;
    }

    // 检测存储空间，必要时自动总结
    await checkStorageAndSummarize();

    const userMessage = inputText.trim();
    setInputText('');
    setError(null);

    // 保存用户消息
    const savedMsg = saveMessage({
      role: 'user',
      content: userMessage,
      characterId: currentCharacter.id,
      userId: 'current_user',
    });
    setMessages(prev => [...prev, savedMsg]);

    // 用户主动回复后重置自动回复计数器
    setAutoReplyCount(0);
    setLastUserReplyTime(Date.now());

    // ============ 表情触发逻辑（发送前检测）============
    // 获取图片库中的表情（从云端同步）
    let images = getImageLibrary();
    const cloudImages = await getImageLibraryFromCloud();
    if (cloudImages && cloudImages.length > 0) {
      images = cloudImages; // 使用云端图片库
      saveImageLibrary(images); // 同步到本地
    }
    const emojiImages = images.filter(img => img.category === 'emoji');

    // 负面情绪关键词列表
    const negativeKeywords = [
      '吵架', '分手', '滚', '滚蛋', '不要', '滚开', '讨厌', '烦', '生气', '愤怒', '发火', '暴躁',
      '难过', '伤心', '失望', '委屈', '哭', '哭泣', '泪', '心碎', '痛', '痛苦', '绝望',
      '冷漠', '不理', '不在乎', '无所谓', '随便', '无聊', '没意思',
      '垃圾', '废物', '很差', '烂', '恨', '憎恨', '怨',
      '离婚', '不合适', '离开', '走了'
    ];

    let shouldSendEmoji = false;
    let matchedEmojiName = '';
    let matchedEmojiUrl = '';

    // 只检测用户消息中的负面情绪
    const isNegativeTone = negativeKeywords.some(kw => userMessage.includes(kw));

    // 表情触发：只检测用户消息，不检测AI回复
    if (!isNegativeTone && emojiImages.length > 0) {
      // 1. 测试模式："电电的测试" → 100%触发
      if (userMessage.includes('电电的测试')) {
        const testEmoji = emojiImages.find(e => e.name === '电电的测试');
        if (testEmoji) {
          shouldSendEmoji = true;
          matchedEmojiName = testEmoji.name;
          matchedEmojiUrl = testEmoji.url;
        }
      }
      // 2. 其他关键词 → 50%概率触发
      else {
        for (const emoji of emojiImages) {
          const emojiKeywords = [emoji.name, ...(emoji.tags || [])];
          const hasMatch = emojiKeywords.some(kw => {
            if (!kw) return false;
            return userMessage.includes(kw);
          });

          if (hasMatch) {
            // 50%概率发送
            if (Math.random() < 0.5) {
              shouldSendEmoji = true;
              matchedEmojiName = emoji.name;
              matchedEmojiUrl = emoji.url;
              break;
            }
          }
        }
      }
    }

    // 立即发送表情（不等待AI回复）
    if (shouldSendEmoji && matchedEmojiName && matchedEmojiUrl) {
      setTimeout(() => {
        const emojiMsg = saveMessage({
          role: 'assistant',
          content: `[${currentCharacter?.name || 'AI'}发送了表情：${matchedEmojiName}]`,
          imageUrl: matchedEmojiUrl,
          characterId: currentCharacter!.id,
          userId: 'current_user',
        });
        setMessages(prev => [...prev, emojiMsg]);
        showToast('收到一个表情~', 'info', '😊');
      }, 800); // 延迟0.8秒发送表情
    }

    // 调用 AI
    setIsLoading(true);
    try {
      const historyMessages = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      // 构建完整的系统提示词（包含基础提示 + 调教指令 + 用户自定义调教）
      let fullSystemPrompt = currentCharacter.systemPrompt || '';
      if (currentCharacter.customInstructions) {
        fullSystemPrompt += '\n\n' + currentCharacter.customInstructions;
      }

      // 修复7：读取用户针对当前角色的调教设置
      const tuningKey = `ai_chat_tuning_${currentCharacter.id}`;
      const userTuning = JSON.parse(localStorage.getItem(tuningKey) || '{}');
      if (userTuning.customPrompt) {
        fullSystemPrompt += '\n\n【用户自定义调教】\n' + userTuning.customPrompt;
      }
      if (userTuning.forceMemory) {
        fullSystemPrompt += '\n\n【强制记忆内容】\n' + userTuning.forceMemory;
      }

      // 获取Token限制
      const maxTokens = currentCharacter.maxTokens || userConfig.defaultMaxTokens || 2000;

      const response = await smartChat(
        [...historyMessages, { role: 'user', content: userMessage }],
        fullSystemPrompt,
        maxTokens
      );

      // 保存 AI 回复
      let aiMsg = saveMessage({
        role: 'assistant',
        content: response.content,
        characterId: currentCharacter.id,
        userId: 'current_user',
      });
      setMessages(prev => [...prev, aiMsg]);
      setLastReplyTime(Date.now());
      showToast('消息发送成功~', 'success', '✅');

      // TTS 播报
      if (userConfig.ttsEnabled) {
        try {
          await ttsService.speak(response.content);
        } catch (ttsError) {
          console.log('TTS播放失败:', ttsError);
        }
      }

      // ============ 修复11：自动收信逻辑（订阅模式）============
      // 检查是否已订阅
      const subscriptionKey = `ai_chat_mailbox_subscribed_${currentCharacter!.id}`;
      const isSubscribed = localStorage.getItem(subscriptionKey) === 'true';

      if (isSubscribed) {
        const currentMessagesCount = getMessages(currentCharacter!.id).length;

        // 每发送3条消息，有30%概率自动生成一封信并直接保存
        if (currentMessagesCount > 0 && currentMessagesCount % 3 === 0) {
          if (Math.random() < 0.3) {
            if (userConfig.apiKey && currentMessagesCount >= 3) {
              const letterCount = getMailboxLettersByCharacter(currentCharacter!.id).length;

              if (letterCount < 30) {
                // 延迟3秒后直接生成并保存信件（不提示用户去查看）
                setTimeout(() => {
                  // 直接调用SecretMailboxModal中的生成逻辑
                  generateAutoLetter(currentCharacter!, messages, userConfig.apiKey);
                }, 3000);
              }
            }
          }
        }
      }
    } catch (error: any) {
      setError(error.message || '发送消息失败，请重试');
      showToast('发送失败啦，再试一次吧~', 'error', '❌');
    } finally {
      setIsLoading(false);
    }
  };

  // 修复11：自动生成并保存信件（订阅模式）
  const generateAutoLetter = async (character: Character, recentMessages: Message[], apiKey: string) => {
    try {
      // 获取最近的对话上下文
      const recentMsgText = recentMessages.slice(-10).map(m =>
        `${m.role === 'user' ? '用户' : character.name}：${m.content}`
      ).join('\n');

      // 获取管理员设置的提示词
      const mailboxPrompts = (window as any).__MAILBOX_PROMPTS__ || {
        category1: '写一封温柔的心里话，表达对方在你心中的特别之处，50字以内',
        category2: '以心声的方式，写下那些想说却没说出口的话，50字以内',
        category3: '记录一些生活中的小细节，那些让你感到温暖的瞬间，50字以内',
        category4: '写下一些从未说出口的话，可以是遗憾、感谢或期待，50字以内',
      };

      // 随机选择一种类型
      const categories = Object.keys(mailboxPrompts);
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];

      const fullPrompt = `你是${character.name}，角色性格：${character.personality}。
请根据以下对话内容，写一封信。
要求：50字以内，情感真挚，符合角色性格，直接输出信件内容。

对话内容：
${recentMsgText}

信件主题：${mailboxPrompts[randomCategory as keyof typeof mailboxPrompts]}`;

      const response = await smartChat(
        [{ role: 'user', content: fullPrompt }],
        '你是一个善于表达情感的角色，能够写出温暖人心的文字。输出内容要简洁有力。'
      );

      const content = response.content.trim();

      // 计算过期时间（30天后）
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // 保存信件
      saveMailboxLetter({
        content,
        category: randomCategory.replace('category', ''),
        expiresAt: expiresAt.toISOString(),
        isRead: false,
        characterId: character.id,
        userId: 'current_user',
      });

      console.log('自动生成信件成功');
    } catch (error) {
      console.error('自动生成信件失败:', error);
    }
  };

  const handleVoiceInput = () => {
    if (!sttService.isSupported()) {
      setError('您的浏览器不支持语音识别');
      return;
    }

    if (isListening) {
      sttService.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      sttService.start(
        (text) => {
          setInputText(prev => prev + text);
          setIsListening(false);
        },
        (errorMsg) => {
          setError(errorMsg);
          setIsListening(false);
        }
      );
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        // 图片消息处理逻辑
        saveMessage({
          role: 'user',
          content: '[用户发送了一张图片]',
          imageUrl: base64,
          characterId: currentCharacter!.id,
          userId: 'current_user',
        });
        loadMessages();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      saveMessage({
        role: 'user',
        content: `[用户发送了文件: ${file.name}]`,
        fileName: file.name,
        characterId: currentCharacter!.id,
        userId: 'current_user',
      });
      loadMessages();
    }
  };

  const handleClearChat = () => {
    if (confirm('确定要清空对话记录吗？')) {
      clearCharacterMessages(currentCharacter!.id);
      setMessages([]);
      showToast('对话记录已清空~', 'success', '🗑️');
    }
  };

  const handleSaveSettings = () => {
    // 确保保存最新的 userConfig
    const config = getUserConfig();
    const updatedConfig = {
      ...config,
      apiKey: userConfig.apiKey,
      apiProvider: userConfig.apiProvider || 'deepseek',
      apiModel: userConfig.apiModel,
      ttsEnabled: userConfig.ttsEnabled,
      ttsUrl: userConfig.ttsUrl,
      sttEnabled: userConfig.sttEnabled,
      autoReplyEnabled: userConfig.autoReplyEnabled,
      autoReplyInterval: userConfig.autoReplyInterval,
      customAvatar: userConfig.customAvatar,
      customBackground: userConfig.customBackground,
      customBackgroundUrl: userConfig.customBackgroundUrl,
      customTheme: userConfig.customTheme,
      dialogName: userConfig.dialogName,
      // 修复2：保存每个角色的背景图片设置
      characterBackgrounds: userConfig.characterBackgrounds,
    };
    saveUserConfig(updatedConfig);
    setUserConfig(updatedConfig);
    setShowSettings(false);
    showToast('设置已保存~', 'success', '💾');
  };

  // 背景图片预览（按当前角色单独保存）
  const handleBgUrlChange = (url: string) => {
    if (!currentCharacter) {
      setUserConfig({ ...userConfig, customBackgroundUrl: url });
      setBgPreviewUrl(url);
      return;
    }
    // 按角色ID分别保存背景URL
    const characterBackgrounds = {
      ...(userConfig.characterBackgrounds || {}),
      [currentCharacter.id]: url,
    };
    setUserConfig({ ...userConfig, characterBackgrounds });
    setBgPreviewUrl(url);
  };

  // 获取当前角色对应的背景URL
  const getCurrentCharacterBgUrl = (): string => {
    if (!currentCharacter) return userConfig.customBackgroundUrl || '';
    return userConfig.characterBackgrounds?.[currentCharacter.id] || '';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (characters.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">暂无角色配置</p>
          <a href="/admin" className="text-blue-600 hover:underline">
            去管理后台配置
          </a>
        </div>
      </div>
    );
  }

  // 获取背景样式（按当前角色独立显示）
  const getBackgroundStyle = () => {
    const charBgUrl = getCurrentCharacterBgUrl();
    if (charBgUrl) {
      return {
        background: `linear-gradient(rgba(255,255,255,0.9), rgba(255,255,255,0.9)), url(${charBgUrl}) center/cover`,
      };
    }
    return {
      background: userConfig.customBackground
        ? `linear-gradient(to bottom, ${userConfig.customBackground}, white)`
        : undefined,
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col" style={getBackgroundStyle()}>
      {/* 记忆保存提示 */}
      {showMemorySave && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-700">
              <BookOpen className="w-5 h-5" />
              <span className="text-sm">
                对话已保存到记忆，我们可以继续聊天了！
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDiary(true)}
                className="px-3 py-1 text-xs bg-green-200 text-green-800 rounded hover:bg-green-300"
              >
                查看日记本
              </button>
              <button
                onClick={() => setShowMemorySave(false)}
                className="text-green-500 hover:text-green-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 顶部栏 - 方案A：点击角色名弹出切换列表 */}
      <div className="bg-white shadow-sm border-b px-4 py-3 relative">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={getAvatarUrl(currentCharacter?.avatar || '', currentCharacter?.name || '')}
              alt={currentCharacter?.name}
              onError={() => handleAvatarError(currentCharacter?.avatar || '')}
              className="w-10 h-10 rounded-full bg-gray-200"
            />
            <button
              onClick={() => setShowCharacterPicker(!showCharacterPicker)}
              className="flex items-center gap-2 hover:bg-gray-50 px-2 py-1 -ml-2 rounded-lg transition-colors"
            >
              <div className="text-left">
                <h1 className="font-semibold">{userConfig.dialogName || currentCharacter?.name}</h1>
                <p className="text-xs text-gray-500">
                  {userConfig.dialogName ? `${currentCharacter?.name} · ` : ''}{currentCharacter?.personality}
                </p>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCharacterPicker ? 'rotate-180' : ''}`} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {/* 导航菜单按钮 */}
            <button
              onClick={() => setShowNavMenu(!showNavMenu)}
              className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
            >
              <span className="text-sm">菜单</span>
              <svg className={`w-4 h-4 transition-transform ${showNavMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* 角色切换弹窗（方案A） */}
        {showCharacterPicker && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowCharacterPicker(false)}
            />
            <div className="absolute left-0 right-0 top-full bg-white shadow-lg border-t z-50 max-h-96 overflow-y-auto">
              <div className="max-w-4xl mx-auto py-2">
                {characters.map((char) => (
                  <button
                    key={char.id}
                    onClick={() => {
                      handleCharacterSwitch(char);
                      setShowCharacterPicker(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                      currentCharacter?.id === char.id ? 'bg-pink-50' : ''
                    }`}
                  >
                    <img
                      src={getAvatarUrl(char.avatar, char.name)}
                      alt={char.name}
                      onError={() => handleAvatarError(char.avatar)}
                      className="w-10 h-10 rounded-full bg-gray-200"
                    />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-800">{char.name}</div>
                      <div className="text-xs text-gray-500">{char.personality}</div>
                    </div>
                    {currentCharacter?.id === char.id && (
                      <CheckCircle className="w-5 h-5 text-pink-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 导航弹出菜单 */}
      {showNavMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowNavMenu(false)}
          />
          <div className="absolute right-4 top-16 bg-white rounded-xl shadow-lg border z-50 py-2 min-w-48">
            <button
              onClick={() => { setShowCalendar(true); setShowNavMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 text-indigo-600 transition-colors"
            >
              <Calendar className="w-5 h-5" />
              <span className="text-sm font-medium">日历查看</span>
            </button>
            <button
              onClick={() => { setShowExport(true); setShowNavMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-teal-50 text-teal-600 transition-colors"
            >
              <Download className="w-5 h-5" />
              <span className="text-sm font-medium">导出对话</span>
            </button>
            <div className="border-t my-2" />
            <button
              onClick={() => { setShowSecretMailbox(true); setShowNavMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-pink-50 text-pink-600 transition-colors"
            >
              <Mail className="w-5 h-5" />
              <span className="text-sm font-medium">秘密信箱</span>
            </button>
            <button
              onClick={() => { setShowDiary(true); setShowNavMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-purple-50 text-purple-600 transition-colors"
            >
              <BookOpen className="w-5 h-5" />
              <span className="text-sm font-medium">日记本</span>
            </button>
            <button
              onClick={() => { setShowImagePicker(true); setShowNavMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-pink-50 text-pink-500 transition-colors"
            >
              <Smile className="w-5 h-5" />
              <span className="text-sm font-medium">表情包</span>
            </button>
            <div className="border-t my-2" />
            <button
              onClick={() => { setShowTuning(true); setShowNavMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 text-indigo-600 transition-colors"
            >
              <Wand2 className="w-5 h-5" />
              <span className="text-sm font-medium">调教</span>
            </button>
            <button
              onClick={() => { setShowSettings(true); setShowNavMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-600 transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span className="text-sm font-medium">设置</span>
            </button>
            <button
              onClick={() => { setShowMessageBoard(true); setShowNavMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-green-50 text-green-600 transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-sm font-medium">联系开发者</span>
            </button>
            <button
              onClick={() => { setShowHelp(true); setShowNavMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-blue-600 transition-colors"
            >
              <HelpCircle className="w-5 h-5" />
              <span className="text-sm font-medium">帮助</span>
            </button>
          </div>
        </>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <span className="text-red-700 text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12 px-4">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-md mx-auto shadow-sm">
                <img
                  src={getAvatarUrl(currentCharacter?.avatar || '', currentCharacter?.name || '')}
                  alt={currentCharacter?.name}
                  onError={() => handleAvatarError(currentCharacter?.avatar || '')}
                  className="w-16 h-16 rounded-full mx-auto mb-4 bg-gray-200"
                />
                <p className="text-lg font-medium text-gray-800 mb-2">{currentCharacter?.name}</p>
                <p className="text-gray-600 whitespace-pre-wrap">
                  {currentCharacter?.greetingPrompt || `嗨~终于等到你啦，今天过得怎么样？`}
                </p>
              </div>
              <p className="text-gray-400 text-sm mt-6">
                输入消息开始对话吧~
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} relative group`}
            >
              {/* 时间显示 */}
              <div className={`absolute ${msg.role === 'user' ? 'right-0 -bottom-6' : 'left-0 -bottom-6'} text-xs text-gray-400`}>
                {new Date(msg.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white rounded-br-sm'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                }`}
              >
                {msg.imageUrl && (
                  <img
                    src={msg.imageUrl}
                    alt="图片"
                    className="rounded-lg mb-2 max-w-full"
                  />
                )}
                {msg.fileName && (
                  <div className="flex items-center gap-2 text-sm opacity-80 mb-2">
                    <FileText className="w-4 h-4" />
                    <span>{msg.fileName}</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
              {/* 收藏和改写按钮（仅AI消息显示） */}
              {msg.role === 'assistant' && (
                <div className="absolute left-0 top-0 -translate-x-full px-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      const title = prompt('为这条记忆起个标题：', `与${currentCharacter?.name}的温馨对话`);
                      if (title !== null) {
                        handleAddMemory(msg, title);
                      }
                    }}
                    className="p-1.5 bg-yellow-100 text-yellow-600 rounded-full hover:bg-yellow-200 transition-colors"
                    title="收藏到日记本"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                  <button
                    onClick={async () => {
                      // 改写功能：重新生成AI回复
                      const msgIndex = messages.indexOf(msg);
                      if (msgIndex === -1) return;

                      // 找到这条AI消息之前的用户消息
                      const historyBeforeMsg = messages.slice(0, msgIndex);
                      const lastUserMsg = [...historyBeforeMsg].reverse().find(m => m.role === 'user');

                      if (!lastUserMsg) {
                        showToast('找不到对应的用户消息', 'error', '❌');
                        return;
                      }

                      // 删除当前AI消息
                      const updatedMessages = messages.filter((m, i) => i !== msgIndex);

                      // 重新构建历史消息（不包括要重新生成的那条AI回复）
                      const historyMessages = updatedMessages.slice(0, msgIndex).map(m => ({
                        role: m.role,
                        content: m.content,
                      }));

                      setMessages(updatedMessages);
                      setIsLoading(true);
                      showToast('正在重新生成...', 'info', '🔄');

                      try {
                        // 调用AI重新生成
                        const response = await smartChat(
                          historyMessages,
                          currentCharacter!.systemPrompt
                        );

                        // 保存新的AI回复
                        const newAiMsg = saveMessage({
                          role: 'assistant',
                          content: response.content,
                          characterId: currentCharacter!.id,
                          userId: 'current_user',
                        });

                        // 更新消息列表
                        setMessages([...updatedMessages, newAiMsg]);
                        showToast('重新生成成功~', 'success', '✨');
                      } catch (error: any) {
                        // 恢复原消息
                        setMessages(messages);
                        showToast('重新生成失败: ' + (error.message || '未知错误'), 'error', '❌');
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="p-1.5 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors"
                    title="改写重说"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex items-center gap-2 text-gray-500">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>正在思考...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 输入区域 */}
      <div className="bg-white border-t px-4 py-3 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-2">
            <div className="flex-1 flex items-end gap-2">
              <label className="p-2.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-full cursor-pointer flex-shrink-0">
                <Image className="w-5 h-5" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              <label className="p-2.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-full cursor-pointer flex-shrink-0">
                <FileText className="w-5 h-5" />
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <div className="flex-1">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="输入消息..."
                  rows={1}
                  className="w-full px-5 py-4 bg-gray-100 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                />
              </div>
            </div>

            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isLoading}
              className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 设置弹窗 */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] flex flex-col">
            <div className="border-b px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-semibold">设置</h3>
              <button
                onClick={() => {
                  // 检查是否有未保存的更改
                  const hasUnsavedChanges = JSON.stringify(userConfig) !== JSON.stringify(getUserConfig());
                  if (hasUnsavedChanges) {
                    if (confirm('有未保存的更改，确定要退出吗？')) {
                      setUserConfig(getUserConfig()); // 恢复原配置
                      setShowSettings(false);
                    }
                  } else {
                    setShowSettings(false);
                  }
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1" style={{ maxHeight: 'calc(90vh - 140px)' }}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  对话框名称/备注
                </label>
                <input
                  type="text"
                  value={userConfig.dialogName || ''}
                  onChange={(e) => setUserConfig({ ...userConfig, dialogName: e.target.value })}
                  placeholder="给这个对话起个名字"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API 服务商
                </label>
                <select
                  value={userConfig.apiProvider || 'deepseek'}
                  onChange={(e) => setUserConfig({ ...userConfig, apiProvider: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {getProviderList().map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  自定义 API Key（必填）
                </label>
                <input
                  type="password"
                  value={userConfig.apiKey || ''}
                  onChange={(e) => setUserConfig({ ...userConfig, apiKey: e.target.value })}
                  placeholder="输入您的 API Key"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  请前往对应的服务商平台获取 API Key
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  自定义模型（可选）
                </label>
                <input
                  type="text"
                  value={userConfig.apiModel || ''}
                  onChange={(e) => setUserConfig({ ...userConfig, apiModel: e.target.value })}
                  placeholder="留空使用默认模型"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  例如: deepseek-chat, qwen-plus, doubao-pro
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={userConfig.ttsEnabled}
                    onChange={(e) => setUserConfig({ ...userConfig, ttsEnabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <Volume2 className="w-4 h-4 text-gray-600" />
                  <span className="text-sm">启用语音播报</span>
                </label>

                {userConfig.ttsEnabled && (
                  <div className="ml-6">
                    <label className="block text-xs text-gray-600 mb-1">
                      TTS 服务地址（可选）
                    </label>
                    <input
                      type="text"
                      value={userConfig.ttsUrl || ''}
                      onChange={(e) => setUserConfig({ ...userConfig, ttsUrl: e.target.value })}
                      placeholder="留空使用浏览器内置TTS"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      例如: https://api.tts.com/v1/speak
                    </p>
                  </div>
                )}

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={userConfig.sttEnabled}
                    onChange={(e) => setUserConfig({ ...userConfig, sttEnabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <Mic className="w-4 h-4 text-gray-600" />
                  <span className="text-sm">启用语音输入</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={userConfig.autoReplyEnabled}
                    onChange={(e) => setUserConfig({ ...userConfig, autoReplyEnabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <RefreshCw className="w-4 h-4 text-gray-600" />
                  <span className="text-sm">启用自动回复</span>
                </label>
              </div>

              {userConfig.autoReplyEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    自动回复间隔（秒）
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="300"
                    value={userConfig.autoReplyInterval}
                    onChange={(e) => setUserConfig({ ...userConfig, autoReplyInterval: parseInt(e.target.value) })}
                    className="w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  自定义头像
                </label>
                <input
                  type="text"
                  value={userConfig.customAvatar || ''}
                  onChange={(e) => setUserConfig({ ...userConfig, customAvatar: e.target.value })}
                  placeholder="头像URL（支持http/https）"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  自定义背景色
                </label>
                <input
                  type="color"
                  value={userConfig.customBackground || '#f0f9ff'}
                  onChange={(e) => setUserConfig({ ...userConfig, customBackground: e.target.value })}
                  className="w-full h-10 border rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  背景图片URL（可选 · {currentCharacter?.name || '当前角色'}专属）
                </label>
                <input
                  type="text"
                  value={getCurrentCharacterBgUrl() || ''}
                  onChange={(e) => handleBgUrlChange(e.target.value)}
                  placeholder="输入图片URL作为背景"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  每个角色的背景独立保存，切换对话自动应用对应的背景。建议使用https链接
                </p>
                {/* 背景图片预览 */}
                {getCurrentCharacterBgUrl() && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">预览：</p>
                    <div className="w-full h-24 rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={getCurrentCharacterBgUrl()}
                        alt="背景预览"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t px-6 py-4 flex gap-3 justify-end flex-shrink-0">
              <button
                onClick={() => {
                  const hasUnsavedChanges = JSON.stringify(userConfig) !== JSON.stringify(getUserConfig());
                  if (hasUnsavedChanges) {
                    if (confirm('有未保存的更改，确定要退出吗？')) {
                      setUserConfig(getUserConfig());
                      setShowSettings(false);
                    }
                  } else {
                    setShowSettings(false);
                  }
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 日记本弹窗 */}
      {showDiary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-white">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold">日记本</h3>
                <span className="text-xs text-gray-500">({memories.length}条记忆)</span>
              </div>
              <button
                onClick={() => setShowDiary(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {memories.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>还没有收藏任何记忆</p>
                  <p className="text-sm mt-1">点击AI消息旁的星星标记重要对话</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {memories.map((mem) => (
                    <div key={mem.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-purple-700">{mem.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{mem.content}</p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(mem.createdAt).toLocaleString('zh-CN')}</span>
                            {mem.mood && (
                              <span className="px-2 py-0.5 bg-pink-100 text-pink-600 rounded">
                                {mem.mood}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteMemory(mem.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 秘密信箱弹窗 */}
      {showSecretMailbox && (
        <SecretMailboxModal
          onClose={() => setShowSecretMailbox(false)}
          currentCharacter={currentCharacter}
          userConfig={userConfig}
          messages={messages}
          onSaveToDiary={(content, title) => {
            if (currentCharacter) {
              saveMemory({
                messageId: 'mailbox_' + Date.now(),
                characterId: currentCharacter.id,
                userId: 'current_user',
                title: title || '秘密信箱收藏',
                content: content,
                mood: '信箱收藏',
              });
              showToast('已保存到日记本~', 'success', '📚');
            }
          }}
        />
      )}

      {/* 图片选择器弹窗 */}
      {showImagePicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-white">
              <div className="flex items-center gap-2">
                <Smile className="w-5 h-5 text-pink-600" />
                <h3 className="text-lg font-semibold">表情包</h3>
              </div>
              <button
                onClick={() => setShowImagePicker(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              {/* 搜索和添加 */}
              <div className="flex gap-2 mb-4">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={imageSearch}
                    onChange={(e) => setImageSearch(e.target.value)}
                    placeholder="搜索表情..."
                    className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <button
                  onClick={() => {
                    const name = prompt('表情名称：');
                    if (name) {
                      const url = prompt('图片URL：');
                      if (url) {
                        handleAddCustomImage(name, url);
                      }
                    }
                  }}
                  className="px-3 py-2 bg-pink-100 text-pink-600 rounded-lg hover:bg-pink-200"
                >
                  <ImagePlus className="w-5 h-5" />
                </button>
              </div>

              {/* 图片网格 */}
              <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                {(imageSearch ? searchImages(imageSearch) : imageLibrary).map((img) => (
                  <button
                    key={img.id}
                    onClick={() => handleSelectImage(img)}
                    className="aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-pink-400 transition-all"
                    title={img.name}
                  >
                    <img
                      src={img.url}
                      alt={img.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="#f3f4f6" width="100" height="100"/><text x="50" y="55" font-size="30" text-anchor="middle" fill="#9ca3af">?</text></svg>')}`;
                      }}
                    />
                  </button>
                ))}
              </div>

              {imageLibrary.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Smile className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>还没有表情包</p>
                  <p className="text-sm mt-1">点击右上角+添加自定义表情</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 留言板弹窗 */}
      {showMessageBoard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-white">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold">联系开发者</h3>
              </div>
              <button
                onClick={() => setShowMessageBoard(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 和我联系 */}
              <div className="text-center">
                <h4 className="font-medium text-gray-800 mb-3">{contactInfo.contactTitle || '和我联系'}</h4>
                <p className="text-sm text-gray-600 mb-4">
                  {contactInfo.contactDesc || '扫码关注我的小红书，和我聊天互动~'}
                </p>
                <div className="flex justify-center">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <img
                      src={contactInfo.xiaohongshuQrUrl}
                      alt="小红书二维码"
                      className="w-48 h-48 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="#f3f4f6" width="200" height="200"/><text x="100" y="100" font-size="14" text-anchor="middle" fill="#9ca3af">小红书二维码</text></svg>')}`;
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 支持开发 */}
              <div className="border-t pt-6">
                <h4 className="font-medium text-gray-800 mb-3 text-center">{contactInfo.supportTitle || '支持开发'}</h4>
                <div className="bg-pink-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {contactInfo.supportText1}
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed mt-2">
                    {contactInfo.supportText2}
                  </p>
                  <p className="text-sm text-pink-600 mt-2 font-medium">
                    {contactInfo.supportText3}
                  </p>
                </div>
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-lg border border-pink-200">
                    <p className="text-sm text-gray-600 mb-2 text-center">微信收款码</p>
                    <img
                      src={contactInfo.wechatPayQrUrl}
                      alt="微信收款二维码"
                      className="w-48 h-48 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="#f3f4f6" width="200" height="200"/><text x="100" y="100" font-size="14" text-anchor="middle" fill="#9ca3af">微信收款码</text></svg>')}`;
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 版本更新提示 */}
      {showVersionAlert && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-md">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">发现新版本</span>
              </div>
              <p className="text-sm opacity-90">
                网站已更新，请点击下方链接访问新版本~
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleGoToNewVersion}
                className="px-3 py-1 bg-white text-blue-500 rounded text-sm hover:bg-blue-50 flex items-center gap-1"
              >
                <ExternalLink className="w-4 h-4" />
                访问新版本
              </button>
              <button
                onClick={handleDismissVersionAlert}
                className="text-white opacity-70 hover:opacity-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新用户引导弹窗 */}
      {showGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            {/* 头部 */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-6 rounded-t-2xl">
              <div className="text-center">
                <div className="text-4xl mb-2">👋</div>
                <h2 className="text-xl font-bold">{GUIDE_CONTENT.welcome}</h2>
                <p className="text-sm opacity-90 mt-1">让我来介绍一下主要功能吧~</p>
              </div>
            </div>

            {/* 功能介绍 */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {GUIDE_CONTENT.features.map((feature, index) => (
                  <div key={index} className="bg-blue-50 rounded-xl p-3">
                    <div className="text-2xl mb-1">{feature.icon}</div>
                    <div className="font-medium text-gray-800 text-sm">{feature.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{feature.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 按钮 */}
            <div className="p-6 pt-0 space-y-3">
              <button
                onClick={() => {
                  localStorage.setItem(HAS_SEEN_GUIDE_KEY, 'true');
                  setShowGuide(false);
                }}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-600 transition-all"
              >
                我知道了
              </button>
              <button
                onClick={() => {
                  setShowRulesDetail(true);
                }}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
              >
                查看详细规则
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 调教功能弹窗 */}
      {showTuning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
            <div className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-white">
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold">调教设置</h3>
              </div>
              <button
                onClick={() => setShowTuning(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 自定义提示词 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  <label className="text-sm font-medium text-gray-700">自定义提示词</label>
                </div>
                <p className="text-xs text-gray-500 mb-2">设置后优先级高于管理员配置，会叠加在角色设定之上</p>
                <textarea
                  value={userCustomPrompt}
                  onChange={(e) => setUserCustomPrompt(e.target.value)}
                  placeholder="例如：你是一个非常粘人的女友，喜欢撒娇..."
                  className="w-full h-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* 强制记忆 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  <label className="text-sm font-medium text-gray-700">强制记忆</label>
                </div>
                <p className="text-xs text-gray-500 mb-2">这些内容会被AI永久记住，不会被遗忘（优先级最高）</p>
                <textarea
                  value={userForceMemory}
                  onChange={(e) => setUserForceMemory(e.target.value)}
                  placeholder="例如：我们的纪念日是6月1日，我喜欢被叫宝贝..."
                  className="w-full h-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              {/* 保存按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    // 修复7：按角色ID保存调教设置
                    const tuningKey = `ai_chat_tuning_${currentCharacter?.id || 'default'}`;
                    const tuningData = {
                      customPrompt: userCustomPrompt,
                      forceMemory: userForceMemory,
                    };
                    localStorage.setItem(tuningKey, JSON.stringify(tuningData));
                    showToast('调教设置已保存~', 'success', '✨');
                    setShowTuning(false);
                  }}
                  className="flex-1 py-3 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition-colors"
                >
                  保存设置
                </button>
                <button
                  onClick={() => {
                    setUserCustomPrompt('');
                    setUserForceMemory('');
                  }}
                  className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  重置
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 详细规则说明弹窗 */}
      {showRulesDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-800">功能规则说明</h3>
              <button
                onClick={() => setShowRulesDetail(false)}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 日记本 */}
              <div className="bg-purple-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">📚</span>
                  <h4 className="font-semibold text-gray-800">日记本</h4>
                </div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 点击AI消息旁的星星收藏到日记本</li>
                  <li>• 可添加标题和心情标签</li>
                  <li>• 记忆满时自动提示下载备份</li>
                  <li>• 支持导入之前的备份文件恢复</li>
                </ul>
              </div>

              {/* 回忆 */}
              <div className="bg-amber-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">💫</span>
                  <h4 className="font-semibold text-gray-800">回忆</h4>
                </div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 基于聊天记录生成温馨内容</li>
                  <li>• 支持三种模式：温馨总结、浪漫小诗、温馨故事</li>
                  <li>• 需要至少3条消息才能生成</li>
                  <li>• 可保存到日记本</li>
                </ul>
              </div>

              {/* 秘密信箱 */}
              <div className="bg-pink-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">💌</span>
                  <h4 className="font-semibold text-gray-800">秘密信箱</h4>
                </div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 最多存储35封信件</li>
                  <li>• 每封信最长存活30天</li>
                  <li>• 剩余3天会高亮提醒</li>
                  <li>• 剩余1天会弹窗询问是否收藏</li>
                  <li>• 聊天活跃时会额外生成信件</li>
                  <li>• 长期未登录会强制生成信件</li>
                </ul>
              </div>

              {/* 其他功能 */}
              <div className="bg-green-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">✨</span>
                  <h4 className="font-semibold text-gray-800">其他功能</h4>
                </div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 📅 日历视图 - 按日期查看历史聊天</li>
                  <li>• 🔍 关键词搜索 - 快速找到历史消息</li>
                  <li>• ✏️ 改写 - 不满意回复可重新生成</li>
                  <li>• 🎤 语音输入 - 解放双手</li>
                  <li>• 🔊 语音播报 - AI自动朗读回复</li>
                </ul>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t p-4">
              <button
                onClick={() => {
                  localStorage.setItem(HAS_SEEN_GUIDE_KEY, 'true');
                  setShowRulesDetail(false);
                  setShowGuide(false);
                }}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-600 transition-all"
              >
                开始聊天
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 配置帮助弹窗 */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="border-b px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold">使用帮助</h3>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-sm max-w-none">
                {helpContent.split('\n').map((line, index) => {
                  if (line.startsWith('# ')) {
                    return <h1 key={index} className="text-xl font-bold mt-4 mb-2">{line.substring(2)}</h1>;
                  } else if (line.startsWith('## ')) {
                    return <h2 key={index} className="text-lg font-semibold mt-4 mb-2">{line.substring(3)}</h2>;
                  } else if (line.startsWith('### ')) {
                    return <h3 key={index} className="text-base font-medium mt-3 mb-1">{line.substring(4)}</h3>;
                  } else if (line.startsWith('---')) {
                    return <hr key={index} className="my-4 border-gray-200" />;
                  } else if (line.startsWith('- ')) {
                    return <li key={index} className="ml-4">{line.substring(2)}</li>;
                  } else if (line.trim() === '') {
                    return <div key={index} className="h-2"></div>;
                  } else {
                    return <p key={index} className="text-gray-600">{line}</p>;
                  }
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 日历查看弹窗 */}
      {showCalendar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="border-b px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold">日历查看</h3>
              </div>
              <button
                onClick={() => setShowCalendar(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <CalendarView
                messages={messages}
                onSelectDate={(date) => {
                  // 筛选选中日期的消息
                  console.log('选中日期:', date);
                  setShowCalendar(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 导出对话弹窗 */}
      {showExport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-teal-600" />
                <h3 className="text-lg font-semibold">导出对话</h3>
              </div>
              <button
                onClick={() => setShowExport(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-600 text-sm">
                选择导出格式，将当前与 {currentCharacter?.name} 的对话记录下载到本地
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => handleExportChat('txt')}
                  disabled={messages.length === 0}
                  className="w-full py-4 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FileText className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">导出为 TXT 文本</div>
                    <div className="text-xs opacity-80">纯文本格式，适合阅读</div>
                  </div>
                </button>
                <button
                  onClick={() => handleExportChat('markdown')}
                  disabled={messages.length === 0}
                  className="w-full py-4 px-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">导出为 Markdown</div>
                    <div className="text-xs opacity-80">支持Markdown格式</div>
                  </div>
                </button>
              </div>
              {messages.length === 0 && (
                <p className="text-center text-gray-400 text-sm">暂无对话记录可导出</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast通知 - 顶部居中显示 */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 space-y-2 z-50">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-slide-in ${
              toast.type === 'success' ? 'bg-green-500 text-white' :
              toast.type === 'error' ? 'bg-red-500 text-white' :
              'bg-gray-800 text-white'
            }`}
          >
            {toast.emoji && <span className="text-lg">{toast.emoji}</span>}
            <span className="text-sm">{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
