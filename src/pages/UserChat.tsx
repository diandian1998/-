import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Character, Message, MemoryNode, ImageLibrary } from '../types';
import SecretMailboxModal from '../components/SecretMailboxModal';
import CalendarView from '../components/CalendarView';
import {
  getCharacters, getMessages, saveMessage, saveMessages, getUserConfig, saveUserConfig,
  getGlobalSettings, clearCharacterMessages, getStorageUsed, isStorageAlmostFull,
  getMessagesStats, getMemories, saveMemory, deleteMemory, getMemoriesByCharacter,
  getImageLibrary, searchImages, addImageToLibrary, deleteImageFromLibrary, getMailboxLettersByCharacter,
  saveCharacters, saveGlobalSettings, saveImageLibrary, saveMailboxLetter,
  getCharacterDialogName, saveCharacterDialogName
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
import { getCurrentUserId } from '../lib/supabase';
import {
  Settings, Send, Mic, MicOff, Image, FileText, Volume2, VolumeX,
  RefreshCw, Trash2, User, Plus, X, BookOpen, Star, ImagePlus,
  AlertTriangle, Clock, Search, Smile, MessageSquare, ExternalLink, CheckCircle, Check, XCircle,
  Sparkles, BookHeart, HelpCircle, Mail, Calendar, Download, Cloud, CloudOff,
  ChevronDown, ChevronLeft, Wand2, Sliders
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
  // Bug6: 修改欢迎语
  welcome: 'hello呀欢迎来用电电做的网站～',
  // Bug3: 完整的使用指引内容
  intro: '欢迎使用AI聊天平台！',
  // 第一步：API Key
  step1: {
    title: '第一步：准备API Key',
    desc: '在使用前，您需要准备自己的API Key',
    providers: [
      { name: 'DeepSeek（推荐）', note: '推荐使用' },
      { name: '硅基流动', note: '备选' },
    ],
    tip: 'API Key可在相应官网注册获取',
  },
  // 第二步：图床
  step2: {
    title: '第二步：使用永久图床',
    desc: '如果需要设置自定义头像或表情包，请使用永久图床上传图片获取链接',
    sites: [
      { name: '路过图床', url: 'https://imgse.com/' },
      { name: '聚合图床', url: 'https://www.superbed.cn/' },
      { name: 'SM.MS', url: 'https://sm.ms/' },
    ],
    note: '注：其他图床可能因安全限制无法使用',
  },
  // 第三步：设置
  step3: {
    title: '第三步：设置头像和表情',
    desc: '在设置页面添加您的API Key；使用图床获取的链接设置头像；可添加自定义表情包',
  },
  // 第四步：开始使用
  step4: {
    title: '第四步：开始使用',
    desc: '完成以上设置后即可开始聊天',
    tip: '点击页面中的「保存快捷方式」按钮可以直接下载桌面快捷方式，方便下次快速访问；也可以手动保存到浏览器收藏夹',
  },
  // 第五步：重要说明
  step5: {
    title: '第五步：重要说明',
    storage: {
      title: '数据存储规则',
      items: [
        '网页版和手机端信息不同步，请分开使用',
        '不同浏览器之间数据也不共享（Chrome/Safari/Firefox各自独立存储）',
        '存储容量约5MB，所有功能共用此空间（聊天记录+日记本+表情包+信箱+调教提示词）',
        '聊天记录无条数限制，但满时需导出备份',
        '日记本最多100条',
        '信箱最多35封，超出自动删除最旧的',
        '调教提示词/强制记忆会占用存储空间',
        '如需清理，请手动进入各功能页面删除或使用一键清空功能',
      ],
    },
    memory: {
      title: '关于AI记忆机制',
      items: [
        'AI模型本身不自动记忆对话',
        '"调教提示词"和"强制记忆"用于让AI记住信息',
        '这些内容存放在本地，可同步到云端备份',
        'AI每次对话时读取您提供的提示词内容',
        '如需让AI忘记某些内容，请手动清空调教设置',
      ],
    },
    cloud: {
      title: '云端存储说明',
      items: [
        '您的个人调教提示词可同步到云端备份',
        '换浏览器或设备时可从云端恢复',
        '聊天记录等数据存储在本地',
      ],
    },
  },
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
  const navigate = useNavigate();
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
  const [cloudSyncComplete, setCloudSyncComplete] = useState(false); // 云端同步是否完成
  const [pendingFile, setPendingFile] = useState<{ name: string; content: string; summary: string } | null>(null);
  const [isSummarizingFile, setIsSummarizingFile] = useState(false);
  const [userCustomPrompt, setUserCustomPrompt] = useState('');
  const [userForceMemory, setUserForceMemory] = useState('');

  // Bug1: 表情包添加弹窗状态
  const [showAddEmoji, setShowAddEmoji] = useState(false);
  const [newEmojiName, setNewEmojiName] = useState('');
  const [newEmojiUrl, setNewEmojiUrl] = useState('');
  const [newEmojiCharacter, setNewEmojiCharacter] = useState(''); // 表情所属角色

  // Bug-性能优化: 对话框备注本地缓存状态（避免每次按键都操作localStorage）
  const [dialogNameInput, setDialogNameInput] = useState('');

  // Bug9: 日记本清空确认弹窗
  const [showClearAllMemories, setShowClearAllMemories] = useState(false);

  // Bug8: 清空所有聊天记录确认弹窗
  const [showClearAllChats, setShowClearAllChats] = useState(false);

  // Bug7: 调教设置云端同步状态
  const [tuningCloudSyncing, setTuningCloudSyncing] = useState(false);

  // 角色头像/背景设置状态
  const [charAvatarUrl, setCharAvatarUrl] = useState('');
  const [charBgUrl, setCharBgUrl] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoReplyTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Bug2-4: 聊天记录分析生成报告功能
  const [showChatAnalysis, setShowChatAnalysis] = useState(false);
  const [analysisFile, setAnalysisFile] = useState<{ name: string; content: string } | null>(null);
  const [isAnalyzingChat, setIsAnalyzingChat] = useState(false);
  const [chatAnalysisReport, setChatAnalysisReport] = useState('');
  const [showReportConfirm, setShowReportConfirm] = useState(false);
  const [userSupplement, setUserSupplement] = useState(''); // Bug4: 用户自定义补充

  // 显示Toast通知 - 顶部居中显示
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info', emoji?: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type, emoji }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // 修复7：加载当前角色的调教设置（Bug7: 优先使用本地，云端备份）
  useEffect(() => {
    if (showTuning && currentCharacter) {
      const tuningKey = `ai_chat_tuning_${currentCharacter.id}`;
      const savedTuning = JSON.parse(localStorage.getItem(tuningKey) || '{}');
      setUserCustomPrompt(savedTuning.customPrompt || '');
      setUserForceMemory(savedTuning.forceMemory || '');

      // Bug7: 异步从云端加载（如果本地为空则使用云端数据）
      if (!savedTuning.customPrompt && !savedTuning.forceMemory) {
        loadTuningFromCloud(currentCharacter.id).then(cloudData => {
          if (cloudData) {
            setUserCustomPrompt(cloudData.customPrompt || '');
            setUserForceMemory(cloudData.forceMemory || '');
          }
        });
      }
    }
  }, [showTuning, currentCharacter]);

  // Bug-性能优化: 当设置弹窗打开时，初始化对话框备注输入值
  useEffect(() => {
    if (showSettings && currentCharacter) {
      const initialValue = getCharacterDialogName(currentCharacter.id);
      setDialogNameInput(initialValue);
    }
  }, [showSettings, currentCharacter]);

  // 从云端同步配置
  useEffect(() => {
    const syncFromCloud = async () => {
      try {
        // 批量获取云端配置
        const cloudData = await syncAllFromCloud();

        // 同步角色列表
        if (cloudData.characters && cloudData.characters.length > 0) {
          saveCharacters(cloudData.characters);
          setCharacters(cloudData.characters); // 更新本地状态

          // 修复1：云端同步完成后，使用云端数据更新 currentCharacter
          if (!currentCharacter) {
            // 如果没有当前角色，设置为云端的第一个角色
            const firstChar = cloudData.characters[0];
            setCurrentCharacter(firstChar);
            // 云端同步完成后，加载消息（会包含打招呼开场白）
            // Bug1修复：只有当用户真的没有任何消息且没有打招呼时才创建打招呼消息
            setTimeout(() => {
              const msgs = getMessages(firstChar.id);
              // 如果有消息（包括用户删除后剩余的消息），加载并清理重复
              if (msgs.length > 0) {
                loadMessages();
              } else if (firstChar.greetingPrompt && firstChar.greetingPrompt.trim() !== '') {
                // 只有真的没有任何消息时才创建打招呼消息
                const greetingMsg: Message = {
                  id: 'greeting_' + Date.now(),
                  role: 'assistant',
                  content: firstChar.greetingPrompt,
                  characterId: firstChar.id,
                  userId: 'current_user',
                  createdAt: new Date().toISOString(),
                };
                // 使用 saveMessages 覆盖模式
                saveMessages(firstChar.id, [greetingMsg]);
                lastSavedHashRef.current = [greetingMsg.id].join(',');
                setMessages([greetingMsg]);
              }
            }, 100);
          } else {
            // 如果已有角色，从云端数据中找对应角色并更新（确保开场白等最新）
            const cloudChar = cloudData.characters.find((c: Character) => c.id === currentCharacter.id);
            if (cloudChar) {
              // 更新当前角色的最新数据（尤其是 greetingPrompt）
              setCurrentCharacter({ ...currentCharacter, ...cloudChar });
              // Bug1修复：云端同步完成后，重新检查并加载打招呼消息
              // 如果本地已有消息（包括用户刚删除的消息），就不再创建打招呼消息
              setTimeout(() => {
                const msgs = getMessages(currentCharacter.id);
                // 如果有消息（包括用户删除后剩余的消息），加载并清理重复
                if (msgs.length > 0) {
                  loadMessages();
                } else if (cloudChar.greetingPrompt && cloudChar.greetingPrompt.trim() !== '') {
                  // 只有真的没有任何消息时才创建打招呼消息
                  const greetingMsg: Message = {
                    id: 'greeting_' + Date.now(),
                    role: 'assistant',
                    content: cloudChar.greetingPrompt,
                    characterId: cloudChar.id,
                    userId: 'current_user',
                    createdAt: new Date().toISOString(),
                  };
                  // 使用 saveMessages 覆盖模式
                  saveMessages(cloudChar.id, [greetingMsg]);
                  lastSavedHashRef.current = [greetingMsg.id].join(',');
                  setMessages([greetingMsg]);
                }
              }, 100);
            }
          }
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

        // 标记云端同步完成
        setCloudSyncComplete(true);

        // 自动清理旧的开场白缓存（如果有旧的错误开场白）
        if (cloudData.characters && cloudData.characters.length > 0) {
          cloudData.characters.forEach((cloudChar: Character) => {
            const cachedMsgs = getMessages(cloudChar.id);
            if (cachedMsgs.length > 0) {
              const firstMsg = cachedMsgs[0];
              // 检查是否是旧的占位符开场白（以"嗨~终于等到你啦"开头的错误开场白）
              const oldGreeting = '嗨~终于等到你啦';
              if (firstMsg.role === 'assistant' && firstMsg.content.startsWith(oldGreeting)) {
                // 删除旧的错误开场白 - 使用与 getMessages 相同的 key 格式
                const userId = 'current_user'; // 默认用户ID
                const key = `ai_chat_messages_${userId}_${cloudChar.id}`;
                localStorage.removeItem(key);
                console.log(`已清理角色 ${cloudChar.name} 的旧开场白缓存`);
              }
            }
          });
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

  // 初始化角色头像/背景设置
  useEffect(() => {
    if (currentCharacter && userConfig) {
      // 加载该角色的头像
      const charAvatars = (userConfig as any).characterAvatars || {};
      setCharAvatarUrl(charAvatars[currentCharacter.id] || currentCharacter.avatar || '');

      // 加载该角色的背景
      const charBgs = (userConfig as any).characterBackgrounds || {};
      setCharBgUrl(charBgs[currentCharacter.id] || userConfig.customBackground || '');
    }
  }, [currentCharacter, userConfig]);

  // 自动保存API Key到localStorage（防止刷新丢失）
  useEffect(() => {
    // 当API Key变化时，自动保存到localStorage
    const currentConfig = getUserConfig();
    if (userConfig.apiKey && userConfig.apiKey !== currentConfig.apiKey) {
      const updatedConfig = { ...currentConfig, apiKey: userConfig.apiKey };
      saveUserConfig(updatedConfig);
    }
  }, [userConfig.apiKey]);

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
  }, []);

  // 从URL参数读取角色ID并设置当前角色
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const characterId = params.get('character');
    if (characterId && characters.length > 0) {
      const char = characters.find(c => c.id === characterId);
      if (char) {
        setCurrentCharacter(char);
      }
    }

    // 处理openMenu参数，打开导航菜单
    const openMenu = params.get('openMenu');
    if (openMenu === 'true') {
      setShowNavMenu(true);
      // 清理URL参数
      const newUrl = window.location.pathname + (characterId ? `?character=${characterId}` : '');
      window.history.replaceState({}, '', newUrl);
    }

    // Bug2: 处理设置页面跳转参数，自动打开设置弹窗
    const openSettings = params.get('openSettings');
    if (openSettings === 'true') {
      setShowSettings(true);
      // 清理URL参数，避免刷新时重复打开
      const newUrl = window.location.pathname + (characterId ? `?character=${characterId}` : '');
      window.history.replaceState({}, '', newUrl);
    }

    // Bug3: 处理联系开发者参数，打开留言板弹窗
    const openMessageBoard = params.get('openMessageBoard');
    if (openMessageBoard === 'true') {
      setShowMessageBoard(true);
      // 清理URL参数，避免刷新时重复打开
      const newUrl = window.location.pathname + (characterId ? `?character=${characterId}` : '');
      window.history.replaceState({}, '', newUrl);
    }

    // Bug3: 处理帮助参数，打开帮助弹窗
    const openHelp = params.get('openHelp');
    if (openHelp === 'true') {
      setShowHelp(true);
      // 清理URL参数，避免刷新时重复打开
      const newUrl = window.location.pathname + (characterId ? `?character=${characterId}` : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, [characters]);

  useEffect(() => {
    if (currentCharacter && cloudSyncComplete) {
      loadMessages();
      loadMemories();
    }
  }, [currentCharacter, cloudSyncComplete]);

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

      // 获取图片库中的表情（按当前角色过滤）
      const images = getImageLibrary(currentCharacter?.id);
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
        // 精确匹配表情包名称
        const matchedEmoji = emojiImages.find(e =>
          e.name === emojiName
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

  // 加载图片库（按当前角色过滤）
  const loadImageLibrary = () => {
    setImageLibrary(getImageLibrary(currentCharacter?.id));
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
      type: 'chat', // 对话收藏
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

  // 添加自定义图片（支持按角色保存）
  const handleAddCustomImage = (name: string, url: string, category: string = 'photo', characterId?: string) => {
    const image = addImageToLibrary({
      name,
      url,
      category,
      tags: [name],
      characterId: characterId || currentCharacter?.id,
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

  // Bug1: 打开添加表情弹窗
  const handleOpenAddEmoji = () => {
    setNewEmojiName('');
    setNewEmojiUrl('');
    setNewEmojiCharacter(''); // 默认空表示当前角色
    setShowAddEmoji(true);
  };

  // Bug1: 确认添加表情
  const handleConfirmAddEmoji = () => {
    if (!newEmojiName.trim()) {
      showToast('请输入表情名称', 'error', '❌');
      return;
    }
    if (!newEmojiUrl.trim()) {
      showToast('请输入图片URL', 'error', '❌');
      return;
    }
    // 使用选中的角色或当前角色
    const targetCharId = newEmojiCharacter || currentCharacter?.id;
    handleAddCustomImage(newEmojiName.trim(), newEmojiUrl.trim(), 'emoji', targetCharId);
    showToast('表情已添加~', 'success', '✅');
    setShowAddEmoji(false);
    setNewEmojiName('');
    setNewEmojiUrl('');
    setNewEmojiCharacter(''); // 重置角色选择
  };

  // Bug1: 取消添加表情
  const handleCancelAddEmoji = () => {
    setShowAddEmoji(false);
    setNewEmojiName('');
    setNewEmojiUrl('');
    setNewEmojiCharacter(''); // 重置角色选择
  };

  // Bug8: 一键清空所有角色的聊天记录
  const handleClearAllChats = () => {
    if (confirm('⚠️ 警告：此操作将清空所有角色的所有对话记录，且无法恢复！\n\n确定要继续吗？')) {
      const allChars = getCharacters();
      allChars.forEach(char => {
        clearCharacterMessages(char.id);
      });
      setMessages([]);
      showToast('已清空所有聊天记录', 'success', '🗑️');
      setShowClearAllChats(false);
      setShowSettings(false);
    }
  };

  // Bug9: 一键清空日记本（当前角色）
  const handleClearAllMemories = () => {
    if (confirm(`⚠️ 警告：此操作将清空「${currentCharacter?.name || '当前角色'}」的所有日记，且无法恢复！\n\n确定要继续吗？`)) {
      const charMemories = getMemories().filter(m => m.characterId === currentCharacter?.id);
      charMemories.forEach(m => deleteMemory(m.id));
      setMemories([]);
      showToast('已清空所有日记', 'success', '🗑️');
      setShowClearAllMemories(false);
    }
  };

  // Bug10: 保存桌面快捷方式（下载HTML文件，带粉色图标）
  const handleSaveShortcut = () => {
    // 使用用户提供的粉色爱心聊天图标
    const iconUrl = 'https://tucdn.wpon.cn/2026/07/16/c89ab7d39cf35-1784173276.jpg';
    const websiteUrl = 'https://chat.diandian1998.cn/';

    // 生成HTML文件，可设置图标，双击跳转到网站
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AI聊天</title>
  <link rel="icon" href="${iconUrl}">
  <style>
    body { margin: 0; padding: 20px; font-family: Arial, sans-serif; text-align: center; }
    .container { max-width: 400px; margin: 50px auto; padding: 30px; background: #fff0f5; border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    img { width: 100px; height: 100px; border-radius: 20px; margin-bottom: 20px; }
    h1 { color: #ec4899; margin-bottom: 20px; }
    p { color: #666; margin-bottom: 30px; }
    a { display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #ec4899, #f472b6); color: white; text-decoration: none; border-radius: 30px; font-size: 18px; box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4); }
    a:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(236, 72, 153, 0.5); }
  </style>
</head>
<body>
  <div class="container">
    <img src="${iconUrl}" alt="AI聊天图标">
    <h1>AI聊天平台</h1>
    <p>点击下方按钮开始聊天</p>
    <a href="${websiteUrl}">打开聊天</a>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AI聊天.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('快捷方式已下载~', 'success', '💾');
  };

  // Bug7: 保存调教设置到云端
  const saveTuningToCloud = async (characterId: string, customPrompt: string, forceMemory: string) => {
    if (!characterId) return;
    setTuningCloudSyncing(true);
    try {
      const { saveUserTuningToCloud } = await import('../lib/cloudStorage');
      const success = await saveUserTuningToCloud(characterId, {
        customPrompt,
        forceMemory,
        updatedAt: new Date().toISOString(),
      });
      if (success) {
        console.log('调教设置已同步到云端');
      }
    } catch (error) {
      console.error('调教云端同步失败:', error);
    } finally {
      setTuningCloudSyncing(false);
    }
  };

  // Bug7: 从云端加载调教设置
  const loadTuningFromCloud = async (characterId: string) => {
    if (!characterId) return;
    try {
      const { getUserTuningFromCloud } = await import('../lib/cloudStorage');
      const cloudTuning = await getUserTuningFromCloud(characterId);
      if (cloudTuning) {
        const tuningKey = `ai_chat_tuning_${characterId}`;
        const localTuning = JSON.parse(localStorage.getItem(tuningKey) || '{}');
        // 合并云端和本地（本地优先，因为本地可能有最新更改）
        const merged = {
          customPrompt: localTuning.customPrompt || cloudTuning.customPrompt || '',
          forceMemory: localTuning.forceMemory || cloudTuning.forceMemory || '',
        };
        // 仅当本地无数据时使用云端数据
        if (!localTuning.customPrompt && !localTuning.forceMemory) {
          localStorage.setItem(tuningKey, JSON.stringify(merged));
        }
        return merged;
      }
    } catch (error) {
      console.error('从云端加载调教设置失败:', error);
    }
    return null;
  };

  const loadCharacters = () => {
    const chars = getCharacters();
    setCharacters(chars);
    if (chars.length > 0 && !currentCharacter) {
      setCurrentCharacter(chars[0]);
    }
  };

  // Bug2修复：清理重复消息的函数
  // 逻辑：每个用户消息后只保留一个AI回复（最新的那个）
  const cleanDuplicateMessages = (msgs: Message[]): Message[] => {
    if (msgs.length <= 1) return msgs;

    const cleaned: Message[] = [];
    const aiMessages: Message[] = []; // 收集所有AI消息

    for (const msg of msgs) {
      if (msg.role === 'user') {
        // 用户消息：如果之前有收集的AI消息，把最后一个加入结果
        if (aiMessages.length > 0) {
          cleaned.push(aiMessages[aiMessages.length - 1]); // 保留最后一个（最新的）
        }
        aiMessages.length = 0; // 清空收集，准备下一轮
        cleaned.push(msg);
      } else {
        // AI消息：收集起来
        aiMessages.push(msg);
      }
    }

    // 处理最后可能剩余的AI消息
    if (aiMessages.length > 0) {
      cleaned.push(aiMessages[aiMessages.length - 1]);
    }

    return cleaned;
  };

  // 用于跟踪最后保存的消息hash，避免重复加载
  const lastSavedHashRef = useRef<string>('');

  const loadMessages = () => {
    if (currentCharacter) {
      // 直接从localStorage读取，不依赖任何缓存
      const msgs = getMessages(currentCharacter.id);

      // 计算当前消息的hash
      const currentHash = msgs.map(m => m.id).join(',');

      // 如果hash没变，不重复加载
      if (currentHash === lastSavedHashRef.current && messages.length > 0) {
        return;
      }

      // 清理重复消息
      const cleanedMsgs = cleanDuplicateMessages(msgs);

      // 保存清理后的消息（如果有必要的话）
      if (cleanedMsgs.length !== msgs.length) {
        saveMessages(currentCharacter.id, cleanedMsgs);
        lastSavedHashRef.current = cleanedMsgs.map(m => m.id).join(',');
      } else {
        lastSavedHashRef.current = currentHash;
      }

      setMessages(cleanedMsgs);

      // 如果消息为空且有打招呼内容，自动创建开场白
      if (cleanedMsgs.length === 0 && currentCharacter.greetingPrompt && currentCharacter.greetingPrompt.trim() !== '') {
        const greetingMsg: Message = {
          id: 'greeting_' + Date.now(),
          role: 'assistant',
          content: currentCharacter.greetingPrompt,
          characterId: currentCharacter.id,
          userId: 'current_user',
          createdAt: new Date().toISOString(),
        };
        saveMessages(currentCharacter.id, [greetingMsg]);
        lastSavedHashRef.current = [greetingMsg.id].join(',');
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

  // 滚动到顶部 - 使用多种方式确保生效
  const scrollToTop = () => {
    // 方式1：尝试找到聊天容器并滚动
    const chatContainer = document.getElementById('chat-messages-container');
    if (chatContainer) {
      chatContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // 方式2：如果方式1失败，使用window滚动
    setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }, 50);
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
        type: 'chat', // 对话收藏
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

    // ============ 用户消息表情触发逻辑（不经过AI）============
    // 用户发送消息时检测是否包含表情关键词，匹配则触发表情
    const triggerUserEmoji = () => {
      const emojiImages = getImageLibrary(currentCharacter?.id);
      if (emojiImages.length === 0) return;

      // 负面情绪关键词：检测到这些词时不触发表情
      const negativeKeywords = ['吵架', '生气', '烦', '讨厌', '滚', '不要', '滚开', '分手', '离婚'];
      const hasNegative = negativeKeywords.some(kw => userMessage.includes(kw));
      if (hasNegative) return; // 负面情绪不触发

      // 找出匹配的表情（用户命名的关键词）
      let matchedEmojis: typeof emojiImages = [];

      for (const emoji of emojiImages) {
        // 检查消息是否包含表情名称（用户自定义的关键词）
        if (userMessage.includes(emoji.name) || userMessage.includes(emoji.name.replace(/\s/g, ''))) {
          if (!matchedEmojis.find(e => e.id === emoji.id)) {
            matchedEmojis.push(emoji);
          }
        }
      }

      // 根据规则决定是否发送
      if (matchedEmojis.length > 0) {
        // 随机选择一个匹配的表情
        const selectedEmoji = matchedEmojis[Math.floor(Math.random() * matchedEmojis.length)];

        // 特殊关键词"电电的测试"100%触发
        const specialKeyword = '电电的测试';
        const isSpecialKeyword = userMessage.includes(specialKeyword);

        // 检查表情是否是首次上传（1小时内创建的视为新上传）
        const emojiCreatedAt = new Date(selectedEmoji.createdAt).getTime();
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const isNewEmoji = emojiCreatedAt > oneHourAgo;

        // 触发规则：
        // 1. 特殊关键词"电电的测试" → 100%触发
        // 2. 新上传的表情（1小时内） → 100%触发
        // 3. 其他表情 → 50%概率触发
        let shouldTrigger = false;

        if (isSpecialKeyword) {
          // 特殊关键词100%触发
          shouldTrigger = true;
        } else if (isNewEmoji) {
          // 新上传表情100%触发
          shouldTrigger = true;
        } else {
          // 其他表情50%概率触发
          shouldTrigger = Math.random() < 0.5;
        }

        if (shouldTrigger) {
          // 延迟100ms发送表情
          setTimeout(() => {
            const emojiMsg = saveMessage({
              role: 'assistant',
              content: `[${currentCharacter?.name}发送了表情：${selectedEmoji.name}]`,
              imageUrl: selectedEmoji.url,
              characterId: currentCharacter!.id,
              userId: 'current_user',
            });
            setMessages(prev => [...prev, emojiMsg]);
            showToast(`收到表情：${selectedEmoji.name}`, 'info', selectedEmoji.name);
          }, 100);
        }
      }
    };

    // 立即执行表情触发检测
    triggerUserEmoji();

    // 用户主动回复后重置自动回复计数器
    setAutoReplyCount(0);
    setLastUserReplyTime(Date.now());

    // 调用 AI
    setIsLoading(true);
    try {
      const historyMessages = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      // 构建完整的系统提示词（强制记忆优先 → 管理员角色设定 → 用户自定义调教）
      let fullSystemPrompt = '';

      // 【最高优先级】强制记忆内容 - 必须放在最前面，确保AI首先读取
      const tuningKey = `ai_chat_tuning_${currentCharacter.id}`;
      const userTuning = JSON.parse(localStorage.getItem(tuningKey) || '{}');
      if (userTuning.forceMemory) {
        fullSystemPrompt += '【强制记忆 - 必须始终遵守】\n' + userTuning.forceMemory + '\n\n';
      }

      // 管理员配置的角色基础设定
      fullSystemPrompt += currentCharacter.systemPrompt || '';

      // 管理员自定义调教指令
      if (currentCharacter.customInstructions) {
        fullSystemPrompt += '\n\n' + currentCharacter.customInstructions;
      }

      // 用户自定义调教（优先级次之）
      if (userTuning.customPrompt) {
        fullSystemPrompt += '\n\n【用户自定义调教】\n' + userTuning.customPrompt;
      }

      // 【重要】添加当前时间上下文，避免AI时间混乱
      const now = new Date();
      const timeStr = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit'
      });
      fullSystemPrompt += `\n\n【当前时间】\n现在是北京时间：${timeStr}\n请根据当前时间调整你的回复，例如：\n- 不要说"早上好"如果现在是晚上\n- 不要说"晚上好"如果现在是下午\n- 如果用户提到时间，确保与当前时间一致`;

      // 表情包使用说明（让AI知道如何使用表情库）
      const images = getImageLibrary(currentCharacter?.id);
      if (images.length > 0) {
        const imageList = images.map(img => `- ${img.name}`).join('\n');
        fullSystemPrompt += `\n\n【表情包库】\n用户上传了以下表情包，你可以适当在回复中提及表情名称（首次提及会100%触发发送，后续随机）：\n${imageList}`;
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

      // ============ AI自主表情触发逻辑 ============
      // AI根据回复的语境自主判断情绪，自主发送对应表情
      const emojiImages = getImageLibrary(currentCharacter?.id);
      if (emojiImages.length > 0 && userConfig.aiCanSendImages !== false) {
        // 正面情绪关键词（AI回复中出现这些内容时，考虑发送正面表情）
        const positiveKeywords = ['开心', '高兴', '喜欢', '爱你', '好开心', '太棒了', '哈哈', '笑', '兴奋', '惊喜', '感动', '幸福', '甜蜜', '可爱', '棒', '耶', '好耶', '嘿嘿', '嘻嘻', '嘿嘿嘿', '撒花', '庆祝'];
        // 负面情绪关键词（AI回复中出现这些内容时，不发送表情）
        const negativeKeywords = ['难过', '伤心', '哭', '悲伤', '对不起', '抱歉', '遗憾', '生气', '愤怒', '讨厌', '烦'];

        // 检查AI回复内容判断情绪
        const hasNegative = negativeKeywords.some(kw => response.content.includes(kw));
        const hasPositive = positiveKeywords.some(kw => response.content.includes(kw));

        // 只有正面情绪才考虑发送表情，负面情绪不发送
        if (hasPositive && !hasNegative && emojiImages.length > 0) {
          // AI自主选择匹配的表情
          const aiSelectedEmoji = emojiImages[Math.floor(Math.random() * emojiImages.length)];

          // 50%概率实际发送
          if (Math.random() < 0.5) {
            setTimeout(() => {
              const emojiMsg = saveMessage({
                role: 'assistant',
                content: `[${currentCharacter?.name}发送了表情：${aiSelectedEmoji.name}]`,
                imageUrl: aiSelectedEmoji.url,
                characterId: currentCharacter!.id,
                userId: 'current_user',
              });
              setMessages(prev => [...prev, emojiMsg]);
              setLastReplyTime(Date.now());
              showToast('收到一个表情~', 'info', aiSelectedEmoji.name);
            }, 1000);
          }
        }
      }

      // ============ 修复11：自动收信逻辑（订阅模式）============
      // 检查是否已订阅
      const subscriptionKey = `ai_chat_mailbox_subscribed_${currentCharacter!.id}`;
      const subscribeTimeKey = `ai_chat_mailbox_subscribe_time_${currentCharacter!.id}`;
      const isSubscribed = localStorage.getItem(subscriptionKey) === 'true';

      if (isSubscribed && userConfig.apiKey) {
        const letterCount = getMailboxLettersByCharacter(currentCharacter!.id).length;

        if (letterCount < 35) {
          // 检查订阅时间
          const subscribeTime = localStorage.getItem(subscribeTimeKey);
          const now = Date.now();
          const fiveMinutes = 5 * 60 * 1000; // 5分钟
          const oneMonth = 30 * 24 * 60 * 60 * 1000; // 30天

          // 情况1：订阅后5分钟内，100%收到一次
          if (subscribeTime) {
            const timeSinceSubscribe = now - parseInt(subscribeTime);

            if (timeSinceSubscribe <= fiveMinutes) {
              // 5分钟内100%触发
              const lastQuickLetterKey = `ai_chat_last_quick_letter_${currentCharacter!.id}`;
              const lastQuickLetter = localStorage.getItem(lastQuickLetterKey);
              if (!lastQuickLetter || now - parseInt(lastQuickLetter) > fiveMinutes) {
                localStorage.setItem(lastQuickLetterKey, now.toString());
                // 追踪定时器ID，便于取消
                if (!(window as any).__pendingAutoLetterTimers) {
                  (window as any).__pendingAutoLetterTimers = [];
                }
                const timerId = setTimeout(() => {
                  generateAutoLetter(currentCharacter!, messages, userConfig.apiKey);
                  // 完成后移除追踪
                  const timers = (window as any).__pendingAutoLetterTimers;
                  const idx = timers.indexOf(timerId);
                  if (idx > -1) timers.splice(idx, 1);
                }, 3000);
                (window as any).__pendingAutoLetterTimers.push(timerId);
              }
            } else if (timeSinceSubscribe <= oneMonth) {
              // 订阅后一个月内：每天约1/30概率推送
              // 简化计算：每次发消息有约3%概率推送（假设每天发10条消息）
              if (Math.random() < 0.03) {
                // 追踪定时器ID，便于取消
                if (!(window as any).__pendingAutoLetterTimers) {
                  (window as any).__pendingAutoLetterTimers = [];
                }
                const timerId = setTimeout(() => {
                  generateAutoLetter(currentCharacter!, messages, userConfig.apiKey);
                  // 完成后移除追踪
                  const timers = (window as any).__pendingAutoLetterTimers;
                  const idx = timers.indexOf(timerId);
                  if (idx > -1) timers.splice(idx, 1);
                }, 3000);
                (window as any).__pendingAutoLetterTimers.push(timerId);
              }
            }
          } else {
            // 首次订阅：立即触发一次（100%）
            localStorage.setItem(subscribeTimeKey, now.toString());
            // 追踪定时器ID，便于取消
            if (!(window as any).__pendingAutoLetterTimers) {
              (window as any).__pendingAutoLetterTimers = [];
            }
            const timerId = setTimeout(() => {
              generateAutoLetter(currentCharacter!, messages, userConfig.apiKey);
              // 完成后移除追踪
              const timers = (window as any).__pendingAutoLetterTimers;
              const idx = timers.indexOf(timerId);
              if (idx > -1) timers.splice(idx, 1);
            }, 3000);
            (window as any).__pendingAutoLetterTimers.push(timerId);
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

  // 文件上传：读取→AI总结→用户确认→发送
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentCharacter) return;

    const fileName = file.name.toLowerCase();
    // 只支持txt和markdown文件
    if (!fileName.endsWith('.txt') && !fileName.endsWith('.md')) {
      showToast('仅支持.txt和.md格式文件', 'error', '❌');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content.trim()) {
        showToast('文件内容为空', 'error', '❌');
        return;
      }

      setIsSummarizingFile(true);

      try {
        // 构建总结提示词
        const summaryPrompt = `请总结以下文件的核心内容，用50字以内简洁描述这份文件是关于什么的：\n\n${content.substring(0, 2000)}`;

        const summaryResponse = await smartChat(
          [{ role: 'user', content: summaryPrompt }],
          `${currentCharacter.systemPrompt || ''}\n\n你是一个文件总结助手，请简洁概括文件内容。`
        );

        // 弹窗让用户确认
        setPendingFile({
          name: file.name,
          content: content,
          summary: summaryResponse.content || '文件内容摘要',
        });
      } catch (error) {
        console.error('文件总结失败:', error);
        // 总结失败时直接让用户确认
        setPendingFile({
          name: file.name,
          content: content,
          summary: '[文件读取成功，点击确认发送给AI]',
        });
      } finally {
        setIsSummarizingFile(false);
      }
    };
    reader.onerror = () => {
      showToast('文件读取失败，请重试', 'error', '❌');
    };
    reader.readAsText(file);
  };

  // 确认发送文件内容
  const handleConfirmFile = () => {
    if (!pendingFile || !currentCharacter) return;

    // 将文件内容作为用户消息发送
    saveMessage({
      role: 'user',
      content: `[用户上传了文件：${pendingFile.name}]\n\n文件摘要：${pendingFile.summary}`,
      fileName: pendingFile.name,
      characterId: currentCharacter.id,
      userId: 'current_user',
    });
    loadMessages();
    setPendingFile(null);
    showToast('文件已发送~', 'success', '📄');
  };

  // 取消发送文件
  const handleCancelFile = () => {
    setPendingFile(null);
    showToast('已取消发送', 'info', 'ℹ️');
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
    // 保存角色头像（使用当前角色的 charAvatarUrl）
    const charAvatars = { ...((config as any).characterAvatars || {}) };
    if (currentCharacter) {
      charAvatars[currentCharacter.id] = charAvatarUrl;
    }
    // 保存角色背景
    const charBgs = { ...((config as any).characterBackgrounds || {}) };
    if (currentCharacter) {
      charBgs[currentCharacter.id] = charBgUrl;
    }
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
      // 保存每个角色的背景图片设置
      characterBackgrounds: charBgs,
      // 保存每个角色的头像设置
      characterAvatars: charAvatars,
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

  // 获取当前角色对应的头像URL
  const getCurrentCharacterAvatar = (): string => {
    if (!currentCharacter) return userConfig.customAvatar || '';
    return userConfig.characterAvatars?.[currentCharacter.id] || '';
  };

  // 处理头像URL变更（按角色单独保存）
  const handleAvatarUrlChange = (url: string) => {
    if (!currentCharacter) return;
    const characterAvatars = {
      ...(userConfig.characterAvatars || {}),
      [currentCharacter.id]: url,
    };
    setUserConfig({ ...userConfig, characterAvatars });
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
    console.log('当前背景URL:', charBgUrl, '角色:', currentCharacter?.name);
    if (charBgUrl) {
      return {
        background: `linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.85)), url(${charBgUrl}) center/cover no-repeat fixed`,
      };
    }
    return {
      background: userConfig.customBackground
        ? `linear-gradient(to bottom, ${userConfig.customBackground}, white)`
        : '#f9fafb',
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
            {/* 返回按钮 */}
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="返回角色列表"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <img
              src={getAvatarUrl(getCurrentCharacterAvatar() || currentCharacter?.avatar || '', currentCharacter?.name || '')}
              alt={currentCharacter?.name}
              onError={() => handleAvatarError(getCurrentCharacterAvatar() || currentCharacter?.avatar || '')}
              className="w-10 h-10 rounded-full bg-gray-200"
            />
            <button
              onClick={() => setShowCharacterPicker(!showCharacterPicker)}
              className="flex items-center gap-2 hover:bg-gray-50 px-2 py-1 -ml-2 rounded-lg transition-colors"
            >
              <div className="text-left">
                <h1 className="font-semibold">{getCharacterDialogName(currentCharacter?.id || '') || currentCharacter?.name}</h1>
                <p className="text-xs text-gray-500">
                  {getCharacterDialogName(currentCharacter?.id || '') ? `${currentCharacter?.name} · ` : ''}{currentCharacter?.personality}
                </p>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCharacterPicker ? 'rotate-180' : ''}`} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {/* 导航菜单按钮 - 直接打开菜单 */}
            <button
              onClick={() => setShowNavMenu(!showNavMenu)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="菜单"
            >
              <svg className={`w-6 h-6 text-gray-600 transition-transform ${showNavMenu ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
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

      {/* 导航弹出菜单 - 按用户逻辑排序 */}
      {showNavMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowNavMenu(false)}
          />
          <div className="absolute right-4 top-16 bg-white rounded-xl shadow-lg border z-50 py-2 min-w-52">
            {/* 第一组：常用功能 */}
            <button
              onClick={() => { setShowSettings(true); setShowNavMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-pink-50 text-pink-600 transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-sm font-medium">对话框备注</span>
            </button>
            <button
              onClick={() => { setShowDiary(true); setShowNavMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-purple-50 text-purple-600 transition-colors"
            >
              <BookOpen className="w-5 h-5" />
              <span className="text-sm font-medium">日记本</span>
            </button>
            <button
              onClick={() => { setShowSecretMailbox(true); setShowNavMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-pink-50 text-pink-600 transition-colors"
            >
              <Mail className="w-5 h-5" />
              <span className="text-sm font-medium">秘密信箱</span>
            </button>
            <button
              onClick={() => { setShowImagePicker(true); setShowNavMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-pink-50 text-pink-500 transition-colors"
            >
              <Smile className="w-5 h-5" />
              <span className="text-sm font-medium">角色表情库</span>
            </button>
            <button
              onClick={() => { setShowCalendar(true); setShowNavMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 text-indigo-600 transition-colors"
            >
              <Calendar className="w-5 h-5" />
              <span className="text-sm font-medium">日历记录</span>
            </button>
            <button
              onClick={() => { setShowSettings(true); setShowNavMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-blue-600 transition-colors"
            >
              <User className="w-5 h-5" />
              <span className="text-sm font-medium">角色头像设置</span>
            </button>
            <button
              onClick={() => { setShowSettings(true); setShowNavMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-green-50 text-green-600 transition-colors"
            >
              <Image className="w-5 h-5" />
              <span className="text-sm font-medium">角色背景设置</span>
            </button>

            <div className="border-t my-2" />

            {/* 第二组：高级互动 */}
            <button
              onClick={() => { setShowTuning(true); setShowNavMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 text-indigo-600 transition-colors"
            >
              <Wand2 className="w-5 h-5" />
              <span className="text-sm font-medium">角色调教</span>
            </button>
            <button
              onClick={() => { setShowChatAnalysis(true); setShowNavMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-purple-50 text-purple-600 transition-colors"
            >
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-medium">聊天记录分析</span>
            </button>

            <div className="border-t my-2" />

            {/* 第二组：工具 */}
            <button
              onClick={() => { setShowExport(true); setShowNavMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-teal-50 text-teal-600 transition-colors"
            >
              <Download className="w-5 h-5" />
              <span className="text-sm font-medium">导出对话</span>
            </button>
            <button
              onClick={() => {
                if (confirm(`确定要清空「${currentCharacter?.name}」的所有对话记录吗？此操作无法恢复！`)) {
                  if (currentCharacter) {
                    clearCharacterMessages(currentCharacter.id);
                    setMessages([]);
                    showToast('对话记录已清空~', 'success', '🗑️');
                  }
                }
                setShowNavMenu(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-red-600 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              <span className="text-sm font-medium">清空对话记录</span>
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
      <div id="chat-messages-container" className="flex-1 overflow-y-auto relative">
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
                  {currentCharacter?.greetingPrompt || `正在加载开场白...`}
                </p>
              </div>
              <p className="text-gray-400 text-sm mt-6">
                输入消息开始对话吧~
              </p>
            </div>
          )}

          {messages.map((msg, msgIndex) => (
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
              {/* 消息操作按钮 - 添加 z-50 确保不被遮挡 */}
              <div className={`absolute ${msg.role === 'user' ? 'left-0' : 'right-0'} top-1/2 -translate-y-1/2 ${msg.role === 'user' ? '-translate-x-2' : 'translate-x-2'} flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-50`}>
                {/* 删除按钮（所有消息） */}
                <button
                  onClick={() => {
                    if (confirm('确定删除这条消息？')) {
                      // 根据消息ID删除，而不是索引（避免闭包问题）
                      const messageId = msg.id;
                      const updatedMessages = messages.filter(m => m.id !== messageId);
                      console.log('【删除调试】删除消息ID:', messageId);
                      console.log('【删除调试】删除后消息数:', updatedMessages.length);
                      // 使用 saveMessages 覆盖模式保存
                      if (currentCharacter) {
                        saveMessages(currentCharacter.id, updatedMessages);
                        console.log('【删除调试】已保存到localStorage');
                        // 立即更新hash，防止loadMessages重新加载旧数据
                        lastSavedHashRef.current = updatedMessages.map(m => m.id).join(',');
                        console.log('【删除调试】新hash:', lastSavedHashRef.current);
                        // 验证保存成功
                        const verify = getMessages(currentCharacter.id);
                        console.log('【删除调试】验证localStorage中的消息数:', verify.length);
                      }
                      setMessages(updatedMessages);
                      showToast('消息已删除', 'info', '🗑️');
                    }
                  }}
                  className="p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors shadow-sm"
                  title="删除消息"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                {/* 用户消息：改写按钮 */}
                {msg.role === 'user' && (
                  <button
                    onClick={async () => {
                      // 防止重复点击
                      if (isLoading) {
                        showToast('正在生成中，请稍候...', 'info', '🔄');
                        return;
                      }

                      // 取消所有待触发的订阅信件定时器
                      const pendingTimers = (window as any).__pendingAutoLetterTimers || [];
                      pendingTimers.forEach((timer: number) => clearTimeout(timer));
                      (window as any).__pendingAutoLetterTimers = [];

                      const newContent = prompt('请输入改写后的内容：', msg.content);
                      if (newContent && newContent !== msg.content) {
                        setIsLoading(true);
                        try {
                          // 更新用户消息内容
                          const updatedMessages = [...messages];
                          updatedMessages[msgIndex] = { ...msg, content: newContent };

                          // 找到这条用户消息后的AI回复并删除
                          const aiReplyIndex = msgIndex + 1;
                          if (aiReplyIndex < updatedMessages.length && updatedMessages[aiReplyIndex].role === 'assistant') {
                            updatedMessages.splice(aiReplyIndex, 1);
                          }

                          // 保存到 localStorage
                          if (currentCharacter) {
                            saveMessages(currentCharacter.id, updatedMessages);
                          }
                          setMessages(updatedMessages);

                          // 获取历史消息（不包括被删除的AI回复）
                          const historyMessages = updatedMessages.slice(0, msgIndex + 1).map(m => ({
                            role: m.role,
                            content: m.content,
                          }));

                          // 调用AI重新生成回复
                          const response = await smartChat(
                            historyMessages,
                            currentCharacter!.systemPrompt
                          );

                          // 创建新的AI回复对象（不调用saveMessage追加）
                          const newAiMsg: Message = {
                            id: `msg_${Date.now()}`,
                            role: 'assistant',
                            content: response.content,
                            characterId: currentCharacter!.id,
                            userId: 'current_user',
                            createdAt: new Date().toISOString(),
                          };

                          // 构建完整的新消息列表
                          const finalMessages = [...updatedMessages, newAiMsg];

                          // 重要：使用 saveMessages 覆盖模式保存到 localStorage
                          saveMessages(currentCharacter!.id, finalMessages);
                          // 更新hash，防止loadMessages重新加载旧数据
                          lastSavedHashRef.current = finalMessages.map(m => m.id).join(',');

                          // 更新消息列表
                          setMessages(finalMessages);
                          showToast('已重新生成回复~', 'success', '✨');
                        } catch (error) {
                          showToast('重新生成失败', 'error', '❌');
                        } finally {
                          setIsLoading(false);
                        }
                      }
                    }}
                    className="p-1.5 bg-purple-100 text-purple-600 rounded-full hover:bg-purple-200 transition-colors shadow-sm"
                    title="改写消息"
                  >
                    <Wand2 className="w-4 h-4" />
                  </button>
                )}
                {/* AI消息：收藏和改写按钮 */}
                {msg.role === 'assistant' && (
                  <>
                    <button
                      onClick={() => {
                        handleAddMemory(msg, `与${currentCharacter?.name}的温馨对话`);
                      }}
                      className="p-1.5 bg-yellow-100 text-yellow-600 rounded-full hover:bg-yellow-200 transition-colors shadow-sm"
                      title="收藏到日记本"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => {
                        // 防止重复点击
                        if (isLoading) {
                          showToast('正在生成中，请稍候...', 'info', '🔄');
                          return;
                        }

                        // 取消所有待触发的订阅信件定时器（避免重说完成时又触发信件）
                        const pendingTimers = (window as any).__pendingAutoLetterTimers || [];
                        pendingTimers.forEach((timer: number) => clearTimeout(timer));
                        (window as any).__pendingAutoLetterTimers = [];

                        // 改写功能：重新生成AI回复
                        // 注意：msgIndex已通过map回调传入
                        const currentIndex = msgIndex;

                        // 找到这条AI消息之前的用户消息
                        const historyBeforeMsg = messages.slice(0, currentIndex);
                        const lastUserMsg = [...historyBeforeMsg].reverse().find(m => m.role === 'user');

                        if (!lastUserMsg) {
                          showToast('找不到对应的用户消息', 'error', '❌');
                          return;
                        }

                        // 删除当前AI消息（不保存到localStorage）
                        const updatedMessages = messages.filter((m, i) => i !== currentIndex);

                        // 重新构建历史消息（不包括要重新生成的那条AI回复）
                        const historyMessages = updatedMessages.slice(0, currentIndex).map(m => ({
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

                          // 创建新的AI回复对象（不调用saveMessage追加）
                          const newAiMsg: Message = {
                            id: `msg_${Date.now()}`,
                            role: 'assistant',
                            content: response.content,
                            characterId: currentCharacter!.id,
                            userId: 'current_user',
                            createdAt: new Date().toISOString(),
                          };

                          // 构建完整的新消息列表
                          const finalMessages = [...updatedMessages, newAiMsg];

                          // 重要：使用 saveMessages 覆盖模式保存到 localStorage
                          saveMessages(currentCharacter!.id, finalMessages);
                          // 更新hash，防止loadMessages重新加载旧数据
                          lastSavedHashRef.current = finalMessages.map(m => m.id).join(',');

                          // 更新消息列表
                          setMessages(finalMessages);
                          showToast('重新生成成功~', 'success', '✨');
                        } catch (error: any) {
                          // 恢复原消息
                          setMessages(messages);
                          showToast('重新生成失败: ' + (error.message || '未知错误'), 'error', '❌');
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      className="p-1.5 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors shadow-sm"
                      title="改写重说"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
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

          {/* 导航按钮 - 固定在消息区域底部右侧，避开底部输入栏 */}
          <div className="fixed right-4 bottom-36 flex flex-col gap-2 z-40 md:bottom-28">
            <button
              onClick={scrollToTop}
              className="w-10 h-10 bg-white border border-gray-200 rounded-full shadow-md hover:bg-gray-50 flex items-center justify-center transition-colors"
              title="回到顶部"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={scrollToBottom}
              className="w-10 h-10 bg-white border border-gray-200 rounded-full shadow-md hover:bg-gray-50 flex items-center justify-center transition-colors"
              title="回到底部"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 输入区域 */}
      <div className="bg-white border-t px-4 py-3 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-2">
            <div className="flex-1 flex items-end gap-2">
              <label className="p-2.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-full cursor-pointer flex-shrink-0" title="上传文本文件(.txt/.md)">
                <FileText className="w-5 h-5" />
                <input
                  type="file"
                  accept=".txt,.md,text/plain,text/markdown"
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

      {/* 角色专属设置弹窗 */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col">
            {/* 头部 */}
            <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <User className="w-6 h-6" />
                <h3 className="text-lg font-semibold">角色设置</h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1" style={{ maxHeight: 'calc(90vh - 140px)' }}>
              {/* 对话框备注 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <MessageSquare className="w-4 h-4" />
                  对话框备注
                </label>
                <input
                  type="text"
                  value={dialogNameInput}
                  onChange={(e) => setDialogNameInput(e.target.value)}
                  onBlur={() => {
                    // 失焦时保存到localStorage
                    if (currentCharacter && dialogNameInput !== getCharacterDialogName(currentCharacter.id)) {
                      saveCharacterDialogName(currentCharacter.id, dialogNameInput);
                    }
                  }}
                  placeholder="给这个对话起个名字"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                />
                <p className="text-xs text-gray-500 mt-1">设置后立即生效，可反复修改</p>
              </div>

              {/* 头像设置 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4" />
                  头像设置（{currentCharacter?.name || '当前角色'}专属）
                </label>
                <input
                  type="text"
                  value={charAvatarUrl}
                  onChange={(e) => setCharAvatarUrl(e.target.value)}
                  placeholder="头像URL（支持http/https）"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                />
                {charAvatarUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <img
                      src={charAvatarUrl}
                      alt="头像预览"
                      className="w-12 h-12 rounded-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <span className="text-xs text-gray-500">头像预览</span>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">每个角色的头像独立保存</p>
              </div>

              {/* 背景色设置 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Sparkles className="w-4 h-4" />
                  背景色
                </label>
                <input
                  type="color"
                  value={userConfig.customBackground || '#f9fafb'}
                  onChange={(e) => setUserConfig({ ...userConfig, customBackground: e.target.value })}
                  className="w-full h-10 border rounded-lg cursor-pointer"
                />
              </div>

              {/* 背景图片设置 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Image className="w-4 h-4" />
                  背景图片（{currentCharacter?.name || '当前角色'}专属）
                </label>
                <input
                  type="text"
                  value={charBgUrl}
                  onChange={(e) => setCharBgUrl(e.target.value)}
                  placeholder="输入图片URL作为背景"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                />
                <p className="text-xs text-gray-500 mt-1">每个角色的背景独立保存，建议使用https链接</p>
                {/* 背景图片预览 */}
                {charBgUrl && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">预览：</p>
                    <div className="w-full h-24 rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={charBgUrl}
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

              {/* 快捷方式 */}
              <div className="border-t pt-4">
                <button
                  onClick={handleSaveShortcut}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-sm font-medium">保存桌面快捷方式</span>
                </button>
              </div>

              {/* 清空对话记录 */}
              <div className="border-t pt-4">
                <button
                  onClick={() => setShowClearAllChats(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm font-medium">清空对话记录</span>
                </button>
                <p className="text-xs text-red-500 mt-1 text-center">⚠️ 将清空当前角色的所有对话</p>
              </div>
            </div>

            {/* 保存按钮 */}
            <div className="border-t px-6 py-4 flex gap-3 justify-end flex-shrink-0 bg-gray-50">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
              >
                关闭
              </button>
              <button
                onClick={() => {
                  handleSaveSettings();
                  showToast('角色设置已保存~', 'success');
                }}
                className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600"
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
              <div className="flex items-center gap-2">
                {/* Bug9: 一键清空按钮 */}
                {memories.length > 0 && (
                  <button
                    onClick={() => setShowClearAllMemories(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="清空所有日记"
                  >
                    <Trash2 className="w-3 h-3" />
                    清空全部
                  </button>
                )}
                <button
                  onClick={() => setShowDiary(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
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
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 flex-wrap">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(mem.createdAt).toLocaleString('zh-CN')}</span>
                            {/* 类型标签 */}
                            <span className={`px-2 py-0.5 rounded ${
                              mem.type === 'mailbox'
                                ? 'bg-pink-100 text-pink-600'
                                : 'bg-blue-100 text-blue-600'
                            }`}>
                              {mem.type === 'mailbox' ? '💌 信件' : '💬 对话'}
                            </span>
                            {mem.mood && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-600 rounded">
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

      {/* 文件上传预览确认弹窗 */}
      {pendingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="border-b px-6 py-4 flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold">确认发送文件</h3>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium text-gray-800 mb-2">{pendingFile.name}</p>
                {isSummarizingFile ? (
                  <div className="flex items-center gap-2 text-gray-500">
                    <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    <span>正在分析文件内容...</span>
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm">{pendingFile.summary}</p>
                )}
              </div>

              <div className="text-xs text-gray-500">
                文件将作为记忆内容发送给AI，帮助AI更好地了解你
              </div>
            </div>

            <div className="border-t px-6 py-4 flex gap-3">
              <button
                onClick={handleCancelFile}
                className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmFile}
                disabled={isSummarizingFile}
                className="flex-1 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认发送
              </button>
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
                type: 'mailbox', // 秘密信箱收藏
              });
              loadMemories(); // 刷新日记本列表
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
                  onClick={handleOpenAddEmoji}
                  className="px-3 py-2 bg-pink-100 text-pink-600 rounded-lg hover:bg-pink-200"
                  title="添加表情"
                >
                  <ImagePlus className="w-5 h-5" />
                </button>
              </div>

              {/* 图片网格 */}
              <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                {(imageSearch ? searchImages(imageSearch, currentCharacter?.id) : imageLibrary).map((img) => (
                  <div
                    key={img.id}
                    className="relative aspect-square rounded-lg overflow-visible group"
                  >
                    <button
                      onClick={() => handleSelectImage(img)}
                      className="w-full h-full rounded-lg overflow-hidden hover:ring-2 hover:ring-pink-400 transition-all"
                      title={img.name + (img.characterId ? ` [${characters.find(c => c.id === img.characterId)?.name || '其他角色'}]` : ' [全局]')}
                    >
                      <img
                        src={img.url}
                        alt={img.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement!.innerHTML = `
                            <div class="w-full h-full flex flex-col items-center justify-center bg-gray-100 rounded-lg p-2">
                              <span class="text-2xl mb-1">⚠️</span>
                              <span class="text-xs text-gray-500 text-center">图片<br>加载失败</span>
                            </div>
                          `;
                        }}
                      />
                    </button>
                    {/* 名称标签 */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-0.5 truncate pointer-events-none">
                      {img.name}
                    </div>
                    {/* 删除按钮 - 右上角 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`确定要删除表情「${img.name}」吗？`)) {
                          deleteImageFromLibrary(img.id);
                          setImageLibrary(prev => prev.filter(i => i.id !== img.id));
                          showToast('已删除表情', 'info', '🗑️');
                        }
                      }}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="删除"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
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

      {/* Bug1: 添加表情弹窗 - 含确认/取消按钮 */}
      {showAddEmoji && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImagePlus className="w-5 h-5 text-pink-600" />
                <h3 className="text-lg font-semibold">添加表情</h3>
              </div>
              <button
                onClick={handleCancelAddEmoji}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  表情名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newEmojiName}
                  onChange={(e) => setNewEmojiName(e.target.value)}
                  placeholder="例如：开心、爱心、比心..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">给表情起个名字，方便发送时引用</p>
              </div>

              {/* 表情所属角色选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  所属角色
                </label>
                <select
                  value={newEmojiCharacter}
                  onChange={(e) => setNewEmojiCharacter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                >
                  <option value="">当前角色（{currentCharacter?.name || '请选择'}）</option>
                  {characters.map(char => (
                    <option key={char.id} value={char.id}>
                      {char.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">选择将此表情添加到哪个角色的表情库</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  图片URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newEmojiUrl}
                  onChange={(e) => setNewEmojiUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  推荐使用路过图床、聚合图床或SM.MS上传图片
                </p>
              </div>

              {/* 图片预览 */}
              {newEmojiUrl && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">预览：</p>
                  <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 relative">
                    <img
                      id="emoji-preview-img"
                      src={newEmojiUrl}
                      alt="预览"
                      className="w-full h-full object-cover"
                      onLoad={() => {
                        // 图片加载成功
                        document.getElementById('emoji-preview-status')!.innerHTML = '<span class="text-green-500 text-xs">✓ 可用</span>';
                      }}
                      onError={() => {
                        // 图片加载失败
                        document.getElementById('emoji-preview-status')!.innerHTML = '<span class="text-red-500 text-xs">✗ URL无效</span>';
                      }}
                    />
                    <div id="emoji-preview-status" className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-0.5">
                      验证中...
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">请确保显示"✓ 可用"后再添加</p>
                </div>
              )}
            </div>

            {/* Bug1: 确认/取消按钮 */}
            <div className="border-t px-6 py-4 flex gap-3">
              <button
                onClick={handleCancelAddEmoji}
                className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmAddEmoji}
                className="flex-1 py-2.5 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors"
              >
                确认添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bug8: 清空所有聊天记录确认弹窗 */}
      {showClearAllChats && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="border-b px-6 py-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-semibold text-red-600">清空所有聊天记录</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-50 rounded-lg p-4 text-sm text-red-700">
                <p className="font-medium mb-2">⚠️ 此操作将永久删除：</p>
                <ul className="space-y-1 ml-2">
                  <li>• 所有角色的对话记录</li>
                  <li>• 所有角色的开场白</li>
                  <li>• 所有角色的图片消息</li>
                </ul>
                <p className="mt-2 font-medium">此操作无法恢复，请谨慎！</p>
              </div>
              <p className="text-sm text-gray-600">建议先导出重要对话作为备份。</p>
            </div>
            <div className="border-t px-6 py-4 flex gap-3">
              <button
                onClick={() => setShowClearAllChats(false)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleClearAllChats}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bug9: 清空日记本确认弹窗 */}
      {showClearAllMemories && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="border-b px-6 py-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-semibold text-red-600">清空日记本</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-50 rounded-lg p-4 text-sm text-red-700">
                <p className="font-medium mb-2">⚠️ 此操作将永久删除「{currentCharacter?.name || '当前角色'}」的所有日记</p>
                <p className="mt-2 font-medium">此操作无法恢复，请谨慎！</p>
              </div>
            </div>
            <div className="border-t px-6 py-4 flex gap-3">
              <button
                onClick={() => setShowClearAllMemories(false)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleClearAllMemories}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
              >
                确认清空
              </button>
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

      {/* 新用户引导弹窗 - Bug3: 完整使用指引 */}
      {showGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            {/* 头部 */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-6 rounded-t-2xl">
              <div className="text-center">
                <div className="text-4xl mb-2">👋</div>
                <h2 className="text-xl font-bold">{GUIDE_CONTENT.welcome}</h2>
                <p className="text-sm opacity-90 mt-1">{GUIDE_CONTENT.intro}</p>
              </div>
            </div>

            {/* 完整使用指引内容 */}
            <div className="p-6 space-y-5">
              {/* 第一步：API Key */}
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-bold text-blue-600">1</span>
                  <h4 className="font-semibold text-gray-800">{GUIDE_CONTENT.step1.title}</h4>
                </div>
                <p className="text-sm text-gray-700 mb-2">{GUIDE_CONTENT.step1.desc}</p>
                <div className="space-y-1 mb-2">
                  {GUIDE_CONTENT.step1.providers.map((p, i) => (
                    <div key={i} className="text-sm text-gray-700">
                      • <span className="font-medium">{p.name}</span>
                      {p.note && <span className="text-xs text-gray-500 ml-1">({p.note})</span>}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">{GUIDE_CONTENT.step1.tip}</p>
              </div>

              {/* 第二步：图床 */}
              <div className="bg-purple-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-bold text-purple-600">2</span>
                  <h4 className="font-semibold text-gray-800">{GUIDE_CONTENT.step2.title}</h4>
                </div>
                <p className="text-sm text-gray-700 mb-2">{GUIDE_CONTENT.step2.desc}</p>
                <div className="space-y-1 mb-2">
                  {GUIDE_CONTENT.step2.sites.map((s, i) => (
                    <div key={i} className="text-sm text-gray-700">
                      • <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{s.name}</a>
                      <span className="text-xs text-gray-500 ml-1">{s.url}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">{GUIDE_CONTENT.step2.note}</p>
              </div>

              {/* 第三步：设置头像和表情 */}
              <div className="bg-pink-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-bold text-pink-600">3</span>
                  <h4 className="font-semibold text-gray-800">{GUIDE_CONTENT.step3.title}</h4>
                </div>
                <p className="text-sm text-gray-700">{GUIDE_CONTENT.step3.desc}</p>
              </div>

              {/* 第四步：开始使用 */}
              <div className="bg-green-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-bold text-green-600">4</span>
                  <h4 className="font-semibold text-gray-800">{GUIDE_CONTENT.step4.title}</h4>
                </div>
                <p className="text-sm text-gray-700 mb-2">{GUIDE_CONTENT.step4.desc}</p>
                <div className="bg-white rounded-lg p-2 text-xs text-gray-600">
                  💡 小提示：{GUIDE_CONTENT.step4.tip}
                </div>
              </div>

              {/* 第五步：重要说明 */}
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg font-bold text-amber-600">5</span>
                  <h4 className="font-semibold text-gray-800">{GUIDE_CONTENT.step5.title}</h4>
                </div>

                {/* 数据存储规则 */}
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-800 mb-1">⚠️ {GUIDE_CONTENT.step5.storage.title}：</p>
                  <ul className="text-xs text-gray-700 space-y-1 ml-2">
                    {GUIDE_CONTENT.step5.storage.items.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>

                {/* AI记忆机制 */}
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-800 mb-1">⚠️ {GUIDE_CONTENT.step5.memory.title}：</p>
                  <ul className="text-xs text-gray-700 space-y-1 ml-2">
                    {GUIDE_CONTENT.step5.memory.items.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>

                {/* 云端存储说明 */}
                <div>
                  <p className="text-sm font-medium text-gray-800 mb-1">⚠️ {GUIDE_CONTENT.step5.cloud.title}：</p>
                  <ul className="text-xs text-gray-700 space-y-1 ml-2">
                    {GUIDE_CONTENT.step5.cloud.items.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* 按钮 */}
            <div className="p-6 pt-0 space-y-3 sticky bottom-0 bg-white">
              <button
                onClick={() => {
                  localStorage.setItem(HAS_SEEN_GUIDE_KEY, 'true');
                  setShowGuide(false);
                }}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-600 transition-all"
              >
                我知道了，开始使用
              </button>
              <button
                onClick={() => {
                  setShowRulesDetail(true);
                }}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
              >
                查看功能规则
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
                {/* Bug7: 云端同步状态指示 */}
                {tuningCloudSyncing && (
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Cloud className="w-3 h-3 animate-pulse" />
                    <span>同步中</span>
                  </div>
                )}
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
                  onClick={async () => {
                    // Bug2修复：确保有currentCharacter时才保存
                    if (!currentCharacter) {
                      showToast('请先选择一个角色', 'error', '❌');
                      return;
                    }

                    // 按角色ID保存调教设置（确保键一致）
                    const tuningKey = `ai_chat_tuning_${currentCharacter.id}`;
                    const tuningData = {
                      customPrompt: userCustomPrompt,
                      forceMemory: userForceMemory,
                    };
                    localStorage.setItem(tuningKey, JSON.stringify(tuningData));

                    // 同步到云端
                    saveTuningToCloud(currentCharacter.id, userCustomPrompt, userForceMemory);

                    showToast('调教设置已保存~', 'success', '✨');
                    setShowTuning(false);

                    // 如果有强制记忆，自动发送确认消息让AI立刻记住
                    if (userForceMemory.trim()) {
                      try {
                        setIsLoading(true);
                        const confirmPrompt = `好的，我已经记住了以下信息：${userForceMemory}。请简短回复确认，不需要重复这些内容，直接说"记住了"即可。`;

                        const response = await smartChat(
                          [{ role: 'user', content: confirmPrompt }],
                          `${currentCharacter.systemPrompt || ''}\n\n【强制记忆 - 必须始终遵守】\n${userForceMemory}`
                        );

                        // 保存AI的确认回复
                        const confirmMsg = saveMessage({
                          role: 'assistant',
                          content: response.content,
                          characterId: currentCharacter!.id,
                          userId: 'current_user',
                        });
                        setMessages(prev => [...prev, confirmMsg]);
                        showToast('AI已记住你的设置~', 'success', '💫');
                      } catch (error) {
                        console.log('AI确认失败:', error);
                      } finally {
                        setIsLoading(false);
                      }
                    }
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

      {/* Bug2-4: 聊天记录分析弹窗 - 上传→生成报告→确认→写入强制记忆 */}
      {showChatAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <h3 className="text-lg font-semibold">聊天记录分析</h3>
              </div>
              <button
                onClick={() => {
                  setShowChatAnalysis(false);
                  setAnalysisFile(null);
                  setChatAnalysisReport('');
                  setShowReportConfirm(false);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              {!analysisFile ? (
                // 步骤1: 上传聊天记录
                <div className="space-y-4">
                  <p className="text-gray-600 text-sm">上传你的聊天记录文件，AI将分析并生成个人信息报告</p>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 transition-colors">
                    <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-600 mb-2">点击上传聊天记录文件</p>
                    <p className="text-xs text-gray-400 mb-4">支持 .txt .json .md 格式</p>
                    <label className="inline-block px-4 py-2 bg-purple-500 text-white rounded-lg cursor-pointer hover:bg-purple-600">
                      选择文件
                      <input
                        type="file"
                        accept=".txt,.json,.md,text/plain,application/json"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const content = event.target?.result as string;
                              setAnalysisFile({ name: file.name, content });
                            };
                            reader.readAsText(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-blue-700 font-medium mb-2">分析报告将包含：</p>
                    <ul className="text-xs text-blue-600 space-y-1">
                      <li>• 情感关系分析</li>
                      <li>• 社会关系分析</li>
                      <li>• 性格特点分析</li>
                      <li>• 身体状况分析</li>
                      <li>• 个人习惯分析</li>
                      <li>• 社交关系分析</li>
                      <li>• 家庭关系分析</li>
                      <li>• 兴趣爱好分析</li>
                      <li>• 关键节点记录</li>
                    </ul>
                  </div>
                </div>
              ) : !chatAnalysisReport ? (
                // 步骤2: AI分析中
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="font-medium text-gray-800">{analysisFile.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {analysisFile.content.length} 个字符
                    </p>
                  </div>
                  {isAnalyzingChat ? (
                    <div className="text-center py-8">
                      <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-gray-600">AI正在分析聊天记录...</p>
                      <p className="text-xs text-gray-400 mt-2">这可能需要一些时间</p>
                    </div>
                  ) : (
                    <button
                      onClick={async () => {
                        setIsAnalyzingChat(true);
                        try {
                          const prompt = `请分析以下聊天记录，生成一份详细的个人信息报告。报告必须包含以下9个方面：

1. 情感关系：描述与他人的情感联系和关系质量
2. 社会关系：描述社会交往圈子和人际关系
3. 性格特点：分析性格特征和行为模式
4. 身体状况：描述健康状态和身体特点
5. 个人习惯：列出日常习惯和行为偏好
6. 社交关系：描述社交方式和朋友圈子
7. 家庭关系：描述家庭环境和家庭成员关系
8. 兴趣爱好：列举兴趣爱好和娱乐方式
9. 关键节点：记录重要事件和转折点

请用简洁的语言描述每个方面，格式清晰，方便阅读。直接输出报告内容，不需要额外说明。

聊天记录：
${analysisFile.content.substring(0, 10000)}`;

                          const response = await smartChat(
                            [{ role: 'user', content: prompt }],
                            '你是一个专业的聊天记录分析师，擅长从对话中提取个人信息。输出格式清晰，语言简洁。'
                          );

                          setChatAnalysisReport(response.content);
                          setShowReportConfirm(true);
                        } catch (error) {
                          console.error('分析失败:', error);
                          showToast('分析失败，请重试', 'error', '❌');
                        } finally {
                          setIsAnalyzingChat(false);
                        }
                      }}
                      className="w-full py-3 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600"
                    >
                      开始分析
                    </button>
                  )}
                </div>
              ) : showReportConfirm ? (
                // 步骤3: 确认报告 + 步骤4: 用户自定义补充
                <div className="space-y-4">
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="font-medium text-purple-700 mb-2">分析报告预览</p>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-purple-50 pr-2">
                      {chatAnalysisReport}
                    </div>
                  </div>

                  {/* Bug4: 用户自定义补充写入框 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      还想让AI了解什么？
                    </label>
                    <textarea
                      value={userSupplement}
                      onChange={(e) => setUserSupplement(e.target.value)}
                      placeholder="这里可以补充基础报告没有覆盖的信息，例如：你的工作、梦想、担忧、特殊的习惯等..."
                      className="w-full h-24 px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 resize-none text-sm"
                    />
                  </div>

                  <p className="text-xs text-gray-500">
                    确认后，此报告将填入调教的"自定义提示词"栏目，让AI记住关于你的信息
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setChatAnalysisReport('');
                        setShowReportConfirm(false);
                        setUserSupplement('');
                      }}
                      className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                    >
                      重新分析
                    </button>
                    <button
                      onClick={async () => {
                        // 步骤5: 整合报告和用户补充内容
                        let fullContent = '【基础报告】\n' + chatAnalysisReport;
                        if (userSupplement.trim()) {
                          fullContent += '\n\n【用户补充】\n' + userSupplement.trim();
                        }

                        // 步骤6: 保存到localStorage
                        const tuningKey = `ai_chat_tuning_${currentCharacter?.id || 'default'}`;
                        const tuningData = {
                          customPrompt: fullContent,
                          forceMemory: '',
                        };
                        localStorage.setItem(tuningKey, JSON.stringify(tuningData));

                        // 步骤7: 关闭分析弹窗，打开调教弹窗
                        setUserCustomPrompt(fullContent);
                        setShowReportConfirm(false);
                        setShowChatAnalysis(false);
                        setShowTuning(true);
                        setUserSupplement('');

                        // 步骤8: 显示保存位置
                        showToast('已保存到【调教设置 → 自定义提示词】', 'success', '✨');

                        // 步骤9: AI读取报告并产生角色内的温暖反馈
                        if (currentCharacter && userConfig.apiKey) {
                          try {
                            setIsLoading(true);
                            // 构建AI反馈提示词：让AI基于角色设定理解报告并给出温暖回应
                            const feedbackPrompt = `你刚刚收到了用户通过聊天记录分析生成的个人信息报告，请认真阅读并给出温暖的角色内回应。

【角色设定】
你是${currentCharacter.name}，${currentCharacter.personality}

【用户信息报告】
${fullContent}

请基于你的角色设定，用温暖自然的方式回应这份报告。表达方式要符合你的性格特点，可以：
- 表达对用户的理解和接纳
- 提到报告中让你印象深刻的细节
- 表达想要进一步了解用户的愿望
- 用你的角色语气和用户建立情感连接

回复要自然、温暖、有代入感，不要机械地复述报告内容。50字以内。`;

                            const response = await smartChat(
                              [{ role: 'user', content: feedbackPrompt }],
                              `${currentCharacter.systemPrompt || ''}\n\n【用户个人信息报告】\n${fullContent}`
                            );

                            // 保存AI的温暖反馈到聊天记录
                            const feedbackMsg = saveMessage({
                              role: 'assistant',
                              content: response.content,
                              characterId: currentCharacter.id,
                              userId: 'current_user',
                            });
                            setMessages(prev => [...prev, feedbackMsg]);
                            setLastReplyTime(Date.now());
                          } catch (error) {
                            console.error('AI反馈生成失败:', error);
                          } finally {
                            setIsLoading(false);
                          }
                        }
                      }}
                      className="flex-1 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                    >
                      确认并写入
                    </button>
                  </div>
                </div>
              ) : null}
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
