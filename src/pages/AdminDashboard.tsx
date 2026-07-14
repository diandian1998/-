import { useState, useEffect } from 'react';
import { Character, GlobalSettings, TTSPreset, SecretMailboxPrompts, ImageLibrary } from '../types';
import { getCharacters, saveCharacters, addCharacter, updateCharacter, deleteCharacter, getGlobalSettings, saveGlobalSettings, DEFAULT_CHARACTERS, getImageLibrary, saveImageLibrary } from '../lib/chatStorage';
import { Save, Trash2, Plus, Settings, Users, MessageSquare, ChevronLeft, RotateCcw, X, AlertTriangle, ExternalLink, MessageCircle, Send, Edit3, Eye, Volume2, Mic, Play, TestTube, Copy, Check, Loader, Mail, HelpCircle, Cloud, CloudOff, RefreshCw, Image as ImageIcon } from 'lucide-react';
import {
  saveCharactersToCloud,
  saveContactInfoToCloud,
  saveTtsPresetsToCloud,
  saveMailboxPromptsToCloud,
  saveHelpContentToCloud,
  saveVersionUrlToCloud,
  saveGlobalConfigToCloud,
  saveImageLibraryToCloud,
  getCharactersFromCloud,
  getContactInfoFromCloud,
  getTtsPresetsFromCloud,
  getMailboxPromptsFromCloud,
  getHelpContentFromCloud,
  getVersionUrlFromCloud,
  getGlobalConfigFromCloud,
  syncAllFromCloud,
  getImageLibraryFromCloud
} from '../lib/cloudStorage';

// 当前版本号
const CURRENT_VERSION = '1.0.0';
const VERSION_KEY = 'ai_chat_version';
const NEW_VERSION_URL_KEY = 'ai_chat_new_version_url';

// 联系信息存储键
const CONTACT_INFO_KEY = 'ai_chat_contact_info';

// TTS预设存储键
const TTS_PRESETS_KEY = 'ai_chat_tts_presets';

// 秘密信箱提示词存储键（与chatStorage.ts中保持一致）
const MAILBOX_PROMPTS_KEY = 'ai_chat_mailbox_prompts';

// 默认TTS预设
const DEFAULT_TTS_PRESETS: TTSPreset[] = [
  {
    id: 'cosyvoice',
    name: 'CosyVoice (阿里开源)',
    description: '阿里开源语音克隆，支持实时语音合成，延迟<150ms',
    baseUrl: 'https://your-cosyvoice-api.example.com',
    method: 'POST',
    headers: JSON.stringify({ 'Content-Type': 'application/json' }),
    bodyTemplate: JSON.stringify({ text: '{{text}}', voice_id: '{{voice_id}}' }, null, 2),
    contentType: 'application/json',
    responseType: 'json',
    audioUrlField: 'audio_url',
    testText: '你好，这是一段测试语音。',
  },
  {
    id: 'chattts',
    name: 'ChatTTS (开源)',
    description: '高度自然的中文TTS，适合对话场景',
    baseUrl: 'https://your-chattts-api.example.com',
    method: 'POST',
    headers: JSON.stringify({ 'Content-Type': 'application/json' }),
    bodyTemplate: JSON.stringify({ text: '{{text}}' }, null, 2),
    contentType: 'application/json',
    responseType: 'audio',
    testText: '你好，很高兴认识你。',
  },
  {
    id: 'azure-tts',
    name: 'Azure TTS',
    description: '微软Azure语音服务，支持多种声音和语言',
    baseUrl: 'https://eastus.tts.speech.microsoft.com/cognitiveservices/v1',
    method: 'POST',
    headers: JSON.stringify({
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
      'Authorization': 'Bearer {{api_key}}',
    }),
    bodyTemplate: `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='zh-CN'><voice name='{{voice_id}}'>{{text}}</voice></speak>`,
    contentType: 'application/ssml+xml',
    voiceId: 'voice_id',
    voiceIdValue: 'zh-CN-XiaoxiaoNeural',
    responseType: 'audio',
    testText: '你好，这是一段Azure语音测试。',
  },
  {
    id: 'custom-api',
    name: '自定义API',
    description: '自定义TTS服务接口，可配置完整参数',
    baseUrl: '',
    method: 'POST',
    headers: JSON.stringify({ 'Content-Type': 'application/json' }),
    bodyTemplate: JSON.stringify({ text: '{{text}}' }, null, 2),
    contentType: 'application/json',
    responseType: 'audio',
    testText: '你好，请配置你的TTS服务。',
  },
];

// 默认秘密信箱提示词
const DEFAULT_SECRET_MAILBOX_PROMPTS: SecretMailboxPrompts = {
  category1: '请根据对话生成一句温馨的"心里话"，表达对方想说但可能没说出口的关心和思念。要求：温柔、真诚、30字以内、第一人称。',
  category2: '请根据对话生成一句真挚的"心声"，表达对方内心的感受和想法。要求：感人、细腻、30字以内、第一人称。',
  category3: '请根据对话提炼一个"生活细节"，展示对方对用户日常的关注。要求：温馨、有画面感、30字以内。',
  category4: '请根据对话写一句"未说出口"的话，表达对方想说但最终没有说出口的心情。要求：含蓄、动人、30字以内、第一人称。',
};

// 帮助内容存储键
const HELP_CONTENT_KEY = 'ai_chat_help_content';

// 默认帮助内容
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
- **位置**：需要主动触发
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

// 默认联系信息
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

// Toast通知类型
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  emoji?: string;
}

// 联系信息类型
interface ContactInfo {
  xiaohongshuQrUrl: string;
  wechatPayQrUrl: string;
  contactTitle: string;
  contactDesc: string;
  supportTitle: string;
  supportText1: string;
  supportText2: string;
  supportText3: string;
}

// 头像预览组件 - 实时响应URL变化
interface AvatarPreviewProps {
  avatarUrl: string;
  name: string;
  size?: 'small' | 'medium' | 'large';
}

function AvatarPreview({ avatarUrl, name, size = 'medium' }: AvatarPreviewProps) {
  const [loadState, setLoadState] = useState<'loading' | 'success' | 'error'>('loading');

  // 当avatarUrl变化时重置加载状态
  useEffect(() => {
    if (avatarUrl) {
      setLoadState('loading');
    } else {
      setLoadState('error');
    }
  }, [avatarUrl]);

  const sizeClasses = {
    small: 'w-10 h-10',
    medium: 'w-14 h-14',
    large: 'w-20 h-20'
  };

  // 生成备用头像SVG
  const getFallbackSvg = (nameStr: string) => {
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981'];
    const color = colors[nameStr.length % colors.length];
    const initial = nameStr.charAt(0) || '?';
    return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="${color}"/><text x="50" y="65" font-size="50" font-family="Arial" text-anchor="middle" fill="white">${initial}</text></svg>`)}`;
  };

  // 空URL时显示默认头像
  if (!avatarUrl || avatarUrl.trim() === '') {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-gray-300 to-gray-400 border-2 border-dashed border-gray-500 flex items-center justify-center flex-shrink-0`}>
        <span className="text-white text-xs font-medium">{name.charAt(0) || '?'}</span>
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full relative flex-shrink-0`}>
      {/* 加载中状态 */}
      {loadState === 'loading' && (
        <div className={`absolute inset-0 ${sizeClasses[size]} rounded-full bg-gray-100 border-2 border-gray-300 flex items-center justify-center animate-pulse`}>
          <span className="text-gray-400 text-xs">...</span>
        </div>
      )}
      {/* 头像图片 */}
      <img
        key={avatarUrl} // key变化时强制重新渲染
        src={avatarUrl}
        alt="头像预览"
        className={`${sizeClasses[size]} rounded-full border-2 ${loadState === 'error' ? 'border-red-300' : 'border-gray-200'} object-cover`}
        onLoad={() => setLoadState('success')}
        onError={(e) => {
          setLoadState('error');
          // 加载失败时显示带名字首字母的彩色头像
          (e.target as HTMLImageElement).src = getFallbackSvg(name);
        }}
      />
      {/* 错误指示器 */}
      {loadState === 'error' && (
        <div className={`absolute -bottom-1 -right-1 ${size === 'small' ? 'w-4 h-4 text-[8px]' : 'w-5 h-5 text-[10px]'} rounded-full bg-orange-500 text-white flex items-center justify-center font-bold`}>
          !
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isLoadingFromCloud, setIsLoadingFromCloud] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    avatar: '',
    description: '',
    personality: '',
    systemPrompt: '',
    greetingPrompt: '',
    customInstructions: '',
    maxTokens: 300,
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [failedAvatars, setFailedAvatars] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [newVersionUrl, setNewVersionUrl] = useState('');
  const [contactInfo, setContactInfo] = useState<ContactInfo>(DEFAULT_CONTACT_INFO);
  const [editContactMode, setEditContactMode] = useState(false);
  const [contactPreview, setContactPreview] = useState(false);
  const [ttsPresets, setTtsPresets] = useState<TTSPreset[]>(DEFAULT_TTS_PRESETS);
  const [showTtsConfig, setShowTtsConfig] = useState(false);
  const [editingPreset, setEditingPreset] = useState<TTSPreset | null>(null);
  const [showSecretMailbox, setShowSecretMailbox] = useState(false);
  const [secretMailboxPrompts, setSecretMailboxPrompts] = useState<SecretMailboxPrompts>(DEFAULT_SECRET_MAILBOX_PROMPTS);
  const [testingTts, setTestingTts] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showHelpConfig, setShowHelpConfig] = useState(false);
  const [helpContent, setHelpContent] = useState(DEFAULT_HELP_CONTENT);
  const [originalContactInfo, setOriginalContactInfo] = useState<ContactInfo>(DEFAULT_CONTACT_INFO);
  const [originalFormData, setOriginalFormData] = useState(formData);
  const [originalSecretMailbox, setOriginalSecretMailbox] = useState<SecretMailboxPrompts>(DEFAULT_SECRET_MAILBOX_PROMPTS);
  const [originalHelpContent, setOriginalHelpContent] = useState(DEFAULT_HELP_CONTENT);
  const [loadError, setLoadError] = useState<string | null>(null); // 加载错误状态

  // loadData函数必须定义在useEffect之前（箭头函数不会提升）
  const loadData = async () => {
    setIsLoadingFromCloud(true);
    setLoadError(null);

    // 创建超时Promise（5秒）
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('加载超时，请检查网络连接')), 5000);
    });

    try {
      // 从云端同步所有数据（带超时）
      const cloudData: any = await Promise.race([
        syncAllFromCloud(),
        timeoutPromise
      ]);

      // 更新角色列表
      if (cloudData.characters && cloudData.characters.length > 0) {
        setCharacters(cloudData.characters);
        saveCharacters(cloudData.characters);
      } else {
        // 如果云端没有数据，使用本地数据
        setCharacters(getCharacters());
      }

      // 更新全局设置
      if (cloudData.globalConfig) {
        const newSettings = {
          ...getGlobalSettings(),
          ...cloudData.globalConfig,
        };
        setGlobalSettings(newSettings);
        saveGlobalSettings(newSettings);
      } else {
        setGlobalSettings(getGlobalSettings());
      }

      // 更新联系信息
      if (cloudData.contactInfo) {
        setContactInfo(cloudData.contactInfo);
        localStorage.setItem(CONTACT_INFO_KEY, JSON.stringify(cloudData.contactInfo));
      }

      // 更新TTS预设
      if (cloudData.ttsPresets && cloudData.ttsPresets.length > 0) {
        setTtsPresets(cloudData.ttsPresets);
        localStorage.setItem(TTS_PRESETS_KEY, JSON.stringify(cloudData.ttsPresets));
      }

      // 更新信箱提示词
      if (cloudData.mailboxPrompts) {
        setSecretMailboxPrompts(cloudData.mailboxPrompts);
        localStorage.setItem(MAILBOX_PROMPTS_KEY, JSON.stringify(cloudData.mailboxPrompts));
      }

      // 更新帮助内容
      if (cloudData.helpContent) {
        setHelpContent(cloudData.helpContent);
        localStorage.setItem(HELP_CONTENT_KEY, cloudData.helpContent);
      }

      // 更新版本URL
      if (cloudData.versionUrl) {
        setNewVersionUrl(cloudData.versionUrl);
        localStorage.setItem(NEW_VERSION_URL_KEY, cloudData.versionUrl);
      }

    } catch (error: any) {
      console.error('从云端加载数据失败:', error);
      setLoadError(error.message || '加载失败，请检查网络连接');
      // 加载失败时使用本地数据
      setCharacters(getCharacters());
      setGlobalSettings(getGlobalSettings());
    } finally {
      setIsLoadingFromCloud(false);
    }
  };

  // 弹窗滚动隔离 - 当有弹窗打开时锁定body滚动
  useEffect(() => {
    const hasModal = showContactInfo || showForm || showTtsConfig || showSecretMailbox || showHelpConfig;
    if (hasModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showContactInfo, showForm, showTtsConfig, showSecretMailbox, showHelpConfig]);

  // 显示Toast通知
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info', emoji?: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message: msg, type, emoji }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // 初始化新版本URL
  useEffect(() => {
    const savedUrl = localStorage.getItem(NEW_VERSION_URL_KEY);
    if (savedUrl) {
      setNewVersionUrl(savedUrl);
    }

    // 加载联系信息
    const savedContactInfo = localStorage.getItem(CONTACT_INFO_KEY);
    if (savedContactInfo) {
      setContactInfo(JSON.parse(savedContactInfo));
    }

    // 加载TTS预设
    const savedTtsPresets = localStorage.getItem(TTS_PRESETS_KEY);
    if (savedTtsPresets) {
      setTtsPresets(JSON.parse(savedTtsPresets));
    }

    // 加载秘密信箱提示词
    const savedPrompts = localStorage.getItem(MAILBOX_PROMPTS_KEY);
    if (savedPrompts) {
      setSecretMailboxPrompts(JSON.parse(savedPrompts));
    }

    // 加载帮助内容
    const savedHelpContent = localStorage.getItem(HELP_CONTENT_KEY);
    if (savedHelpContent) {
      setHelpContent(savedHelpContent);
    }
  }, []);

  // 保存TTS预设（本地+云端同步）
  const handleSaveTtsPresets = async () => {
    localStorage.setItem(TTS_PRESETS_KEY, JSON.stringify(ttsPresets));
    // 同步到云端
    await saveTtsPresetsToCloud(ttsPresets);
    showToast('TTS预设配置已保存！', 'success', '💾');
    setEditingPreset(null);
  };

  // 保存秘密信箱提示词（本地+云端同步）
  const handleSaveSecretMailboxPrompts = async () => {
    localStorage.setItem(MAILBOX_PROMPTS_KEY, JSON.stringify(secretMailboxPrompts));
    // 同步到云端
    await saveMailboxPromptsToCloud(secretMailboxPrompts);
    // 保存成功后更新原始状态，清除"未保存"状态
    setOriginalSecretMailbox({ ...secretMailboxPrompts });
    showToast('秘密信箱提示词已保存！', 'success', '💾');
  };

  // 保存帮助内容（本地+云端同步）
  const handleSaveHelpContent = async () => {
    localStorage.setItem(HELP_CONTENT_KEY, helpContent);
    // 同步到云端
    await saveHelpContentToCloud(helpContent);
    // 保存成功后更新原始状态，清除"未保存"状态
    setOriginalHelpContent(helpContent);
    showToast('帮助内容已保存！', 'success', '💾');
  };

  // 测试TTS API
  const handleTestTts = async (preset: TTSPreset) => {
    if (!preset.baseUrl) {
      showToast('请先配置API地址', 'error', '❌');
      return;
    }

    setTestingTts(preset.id);
    setTestResult(null);

    try {
      // 构建请求头
      const headers: Record<string, string> = {};
      if (preset.headers) {
        const parsedHeaders = JSON.parse(preset.headers);
        Object.entries(parsedHeaders).forEach(([key, value]) => {
          headers[key] = String(value).replace('{{api_key}}', preset.apiKey || '');
        });
      }
      if (preset.contentType) {
        headers['Content-Type'] = preset.contentType;
      }

      // 构建请求体
      let body = preset.bodyTemplate || '{}';
      body = body.replace(/\{\{text\}\}/g, preset.testText);
      if (preset.voiceId && preset.voiceIdValue) {
        body = body.replace(/\{\{voice_id\}\}/g, preset.voiceIdValue);
      }

      const response = await fetch(preset.baseUrl, {
        method: preset.method,
        headers,
        body: preset.method === 'POST' ? body : undefined,
      });

      if (response.ok) {
        if (preset.responseType === 'audio') {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.controls = true;
          audio.autoplay = true;
          showToast('测试成功！音频正在播放', 'success', '🔊');
        } else {
          showToast('API连接成功！', 'success', '✅');
        }
        setTestResult({ success: true, message: '测试成功' });
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      showToast(`测试失败: ${errorMsg}`, 'error', '❌');
      setTestResult({ success: false, message: errorMsg });
    } finally {
      setTestingTts(null);
    }
  };

  // 更新TTS预设
  const updatePreset = (id: string, updates: Partial<TTSPreset>) => {
    setTtsPresets(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  // 保存联系信息（本地+云端同步）
  const handleSaveContactInfo = async () => {
    localStorage.setItem(CONTACT_INFO_KEY, JSON.stringify(contactInfo));
    // 同步到云端
    await saveContactInfoToCloud(contactInfo);
    // 保存成功后更新原始状态，清除"未保存"状态
    setOriginalContactInfo({ ...contactInfo });
    showToast('联系信息已保存！', 'success', '💾');
    setEditContactMode(false);
  };

  // 重置联系信息
  const handleResetContactInfo = () => {
    if (confirm('确定要重置为默认联系信息吗？')) {
      setContactInfo(DEFAULT_CONTACT_INFO);
      localStorage.setItem(CONTACT_INFO_KEY, JSON.stringify(DEFAULT_CONTACT_INFO));
      showToast('已重置为默认联系信息', 'success', '🔄');
    }
  };

  // 头像加载失败处理
  const handleAvatarError = (avatarUrl: string) => {
    setFailedAvatars(prev => new Set([...prev, avatarUrl]));
  };

  // 获取头像URL
  const getAvatarUrl = (avatarUrl: string, name: string) => {
    if (failedAvatars.has(avatarUrl)) {
      const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981'];
      const color = colors[name.length % colors.length];
      const initial = name.charAt(0);
      return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="${color}"/><text x="50" y="65" font-size="50" font-family="Arial" text-anchor="middle" fill="white">${initial}</text></svg>`)}`;
    }
    return avatarUrl;
  };

  // 重置为默认角色
  const handleResetToDefaults = () => {
    if (confirm('确定要重置所有角色为默认设定吗？这将清除现有角色并恢复初始状态。')) {
      saveCharacters(DEFAULT_CHARACTERS);
      setCharacters(DEFAULT_CHARACTERS);
      setFailedAvatars(new Set());
      showToast('已重置为默认角色！', 'success', '🔄');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 保存新版本URL（本地+云端同步）
  const handleSaveNewVersion = async () => {
    if (newVersionUrl.trim()) {
      localStorage.setItem(NEW_VERSION_URL_KEY, newVersionUrl.trim());
      // 同步到云端
      await saveVersionUrlToCloud(newVersionUrl.trim());
      showToast('新版本链接已设置！用户下次访问时会收到更新提示~', 'success', '🎉');
    } else {
      showToast('请输入有效的版本链接', 'error', '❌');
    }
  };

  const handleAdd = () => {
    const emptyForm = {
      name: '',
      avatar: '',
      description: '',
      personality: '',
      systemPrompt: '',
      greetingPrompt: '',
      customInstructions: '',
      maxTokens: 300,
    };
    setEditingCharacter(null);
    setFormData(emptyForm);
    setOriginalFormData(emptyForm);
    setShowForm(true);
  };

  const handleEdit = (char: Character) => {
    const newFormData = {
      name: char.name,
      avatar: char.avatar,
      description: char.description,
      personality: char.personality,
      systemPrompt: char.systemPrompt,
      greetingPrompt: char.greetingPrompt || '',
      customInstructions: char.customInstructions || '',
      maxTokens: char.maxTokens || 300,
    };
    setEditingCharacter(char);
    setFormData(newFormData);
    setOriginalFormData(newFormData);
    setShowForm(true);
  };

  // 保存角色（本地+云端同步）
  const handleSave = async () => {
    try {
      if (editingCharacter) {
        updateCharacter(editingCharacter.id, formData);
        showToast('角色更新成功！', 'success', '✨');
      } else {
        addCharacter(formData);
        showToast('角色添加成功！', 'success', '➕');
      }
      loadData();
      setShowForm(false);

      // 同步到云端
      const updatedChars = getCharacters();
      await saveCharactersToCloud(updatedChars);
    } catch (error) {
      showToast('保存失败，请重试', 'error', '❌');
    }
  };

  // 删除角色（本地+云端同步）
  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个角色吗？')) {
      deleteCharacter(id);
      loadData();
      showToast('角色删除成功！', 'success', '🗑️');

      // 同步到云端
      const updatedChars = getCharacters();
      await saveCharactersToCloud(updatedChars);
    }
  };

  // 保存全局设置（本地+云端同步）
  const handleSaveSettings = async () => {
    if (globalSettings) {
      saveGlobalSettings(globalSettings);

      // 同步到云端
      await saveGlobalConfigToCloud({
        defaultApiKey: globalSettings.defaultApiKey,
        apiProvider: (globalSettings as any).apiProvider,
        apiModel: (globalSettings as any).apiModel,
        defaultTtsEnabled: globalSettings.defaultTtsEnabled,
        defaultTtsPreset: (globalSettings as any).defaultTtsPreset,
        defaultAutoReplyEnabled: globalSettings.defaultAutoReplyEnabled,
        defaultAutoReplyInterval: globalSettings.defaultAutoReplyInterval,
      });

      showToast('全局设置保存成功！', 'success', '💾');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* 顶部导航 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          {/* 移除返回用户界面链接 */}
          <Settings className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-800">管理员后台</h1>
          <div className="ml-auto flex gap-2">
            {/* 从云端刷新按钮 */}
            <button
              onClick={loadData}
              disabled={isLoadingFromCloud}
              className="flex items-center gap-2 px-3 py-2 text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingFromCloud ? 'animate-spin' : ''}`} />
              {isLoadingFromCloud ? '加载中...' : '刷新云端'}
            </button>
            <button
              onClick={() => setShowContactInfo(true)}
              className="flex items-center gap-2 px-3 py-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100"
            >
              <MessageCircle className="w-4 h-4" />
              联系信息
            </button>
            <button
              onClick={() => {
                setOriginalSecretMailbox({ ...secretMailboxPrompts });
                setShowSecretMailbox(true);
              }}
              className="flex items-center gap-2 px-3 py-2 text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100"
            >
              <Mail className="w-4 h-4" />
              信箱提示词
            </button>
            <button
              onClick={() => {
                setOriginalHelpContent(helpContent);
                setShowHelpConfig(true);
              }}
              className="flex items-center gap-2 px-3 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
            >
              <HelpCircle className="w-4 h-4" />
              帮助内容
            </button>
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg">
              <span className="text-sm">当前版本：</span>
              <span className="font-medium">v{CURRENT_VERSION}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Toast通知 */}
        <div className="fixed bottom-4 right-4 space-y-2 z-50">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
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

        {/* 加载错误提示 */}
        {loadError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{loadError}</span>
            </div>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              重试
            </button>
          </div>
        )}

        {/* 加载中状态 */}
        {isLoadingFromCloud && !loadError && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 flex flex-col items-center justify-center">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
            <span className="text-blue-700">正在从云端加载数据...</span>
            <span className="text-blue-500 text-sm mt-1">如果长时间无响应，请检查网络连接</span>
          </div>
        )}

        {/* 版本更新设置 */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg shadow-lg p-6 mb-6 text-white">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
            <div>
              <h2 className="text-lg font-semibold mb-1">版本更新通知设置</h2>
              <p className="text-sm opacity-90">
                设置新版本链接后，用户访问旧版本时会自动收到更新提示
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={newVersionUrl}
              onChange={(e) => setNewVersionUrl(e.target.value)}
              placeholder="输入新版本的网址链接"
              className="flex-1 px-4 py-2 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-white"
            />
            <button
              onClick={handleSaveNewVersion}
              className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-medium"
            >
              <Send className="w-4 h-4" />
              推送更新
            </button>
          </div>
        </div>

        {/* TTS预设配置 */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg shadow-lg p-6 mb-6 text-white">
          <div className="flex items-start gap-3 mb-4">
            <Volume2 className="w-6 h-6 flex-shrink-0" />
            <div>
              <h2 className="text-lg font-semibold mb-1">TTS语音配置</h2>
              <p className="text-sm opacity-90">
                预设多个TTS服务，配置后可在用户端一键切换使用
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowTtsConfig(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-orange-600 rounded-lg hover:bg-orange-50 font-medium"
          >
            <Settings className="w-4 h-4" />
            管理TTS预设
          </button>
        </div>

        {/* 角色管理 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold">角色管理</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleResetToDefaults}
                className="flex items-center gap-2 px-3 py-2 text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100"
              >
                <RotateCcw className="w-4 h-4" />
                重置默认
              </button>
              <button
                onClick={handleAdd}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                添加角色
              </button>
            </div>
          </div>

          {/* 角色列表 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {characters.map((char) => (
              <div key={char.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <AvatarPreview
                    avatarUrl={char.avatar}
                    name={char.name}
                    size="medium"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold">{char.name}</h3>
                    <p className="text-sm text-gray-600">{char.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      性格：{char.personality}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleEdit(char)}
                    className="flex-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(char.id)}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    <Trash2 className="w-3 h-3" />
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 全局设置 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">全局设置</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                默认 API Key
              </label>
              <input
                type="password"
                value={globalSettings?.defaultApiKey || ''}
                onChange={(e) => setGlobalSettings({ ...globalSettings!, defaultApiKey: e.target.value })}
                placeholder="留空则使用预设Key"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                如果用户没有配置自己的API Key，将使用此默认Key
              </p>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={globalSettings?.defaultTtsEnabled || false}
                  onChange={(e) => setGlobalSettings({ ...globalSettings!, defaultTtsEnabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm">默认启用语音播报</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={globalSettings?.defaultAutoReplyEnabled || false}
                  onChange={(e) => setGlobalSettings({ ...globalSettings!, defaultAutoReplyEnabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm">默认启用自动回复</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                自动回复间隔（秒）
              </label>
              <input
                type="number"
                min="10"
                max="300"
                value={globalSettings?.defaultAutoReplyInterval || 30}
                onChange={(e) => setGlobalSettings({ ...globalSettings!, defaultAutoReplyInterval: parseInt(e.target.value) })}
                className="w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                用户多久没有回复时，AI自动发送消息
              </p>
            </div>

            <button
              onClick={handleSaveSettings}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Save className="w-4 h-4" />
              保存设置
            </button>
          </div>
        </div>

        {/* 使用说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <div className="flex items-start gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-800">使用说明</h3>
              <ul className="text-sm text-blue-700 mt-2 space-y-1">
                <li>• 在这里配置5个角色的基本设定（名字、头像、性格、语气等）</li>
                <li>• 用户打开聊天界面后，可以切换不同的角色进行对话</li>
                <li>• 用户可以自定义自己的头像和背景，但无法修改角色设定</li>
                <li>• 全局设置会影响所有用户的默认配置</li>
                <li>• 设置新版本链接后，用户访问时会收到更新提示</li>
                <li>• 点击「联系信息」可查看/编辑开发者的联系方式</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 联系信息弹窗 */}
      {showContactInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold">联系信息设置</h3>
              </div>
              <div className="flex items-center gap-2">
                {!editContactMode ? (
                  <>
                    <button
                      onClick={() => setContactPreview(!contactPreview)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${
                        contactPreview ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <Eye className="w-4 h-4" />
                      {contactPreview ? '编辑模式' : '预览'}
                    </button>
                    <button
                      onClick={() => {
                        setOriginalContactInfo({ ...contactInfo });
                        setEditContactMode(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                    >
                      <Edit3 className="w-4 h-4" />
                      编辑
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        // 检查是否有未保存的更改
                        const hasUnsavedChanges = JSON.stringify(contactInfo) !== JSON.stringify(originalContactInfo);
                        if (hasUnsavedChanges) {
                          if (confirm('有未保存的更改，确定要退出吗？')) {
                            setContactInfo(originalContactInfo);
                            setEditContactMode(false);
                          }
                        } else {
                          setEditContactMode(false);
                        }
                      }}
                      className="px-3 py-1.5 text-gray-700 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSaveContactInfo}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                    >
                      <Save className="w-4 h-4" />
                      保存
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    // 检查是否有未保存的更改
                    const hasUnsavedChanges = JSON.stringify(contactInfo) !== JSON.stringify(originalContactInfo);
                    if (hasUnsavedChanges) {
                      if (confirm('有未保存的更改，确定要退出吗？')) {
                        setContactInfo(originalContactInfo);
                        setShowContactInfo(false);
                        setEditContactMode(false);
                        setContactPreview(false);
                      }
                    } else {
                      setShowContactInfo(false);
                      setEditContactMode(false);
                      setContactPreview(false);
                    }
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {editContactMode ? (
                /* 编辑模式表单 */
                <div className="space-y-6">
                  {/* 小红书二维码设置 */}
                  <div className="bg-blue-50 rounded-lg p-4 space-y-4">
                    <h4 className="font-medium text-blue-800">小红书二维码设置</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">图片URL</label>
                      <input
                        type="text"
                        value={contactInfo.xiaohongshuQrUrl}
                        onChange={(e) => setContactInfo({ ...contactInfo, xiaohongshuQrUrl: e.target.value })}
                        placeholder="输入图片URL"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                      <input
                        type="text"
                        value={contactInfo.contactTitle}
                        onChange={(e) => setContactInfo({ ...contactInfo, contactTitle: e.target.value })}
                        placeholder="例如：和我联系"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">描述文字</label>
                      <input
                        type="text"
                        value={contactInfo.contactDesc}
                        onChange={(e) => setContactInfo({ ...contactInfo, contactDesc: e.target.value })}
                        placeholder="例如：扫码关注我的小红书"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* 微信收款码设置 */}
                  <div className="bg-pink-50 rounded-lg p-4 space-y-4">
                    <h4 className="font-medium text-pink-800">微信收款码设置</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">收款码图片URL</label>
                      <input
                        type="text"
                        value={contactInfo.wechatPayQrUrl}
                        onChange={(e) => setContactInfo({ ...contactInfo, wechatPayQrUrl: e.target.value })}
                        placeholder="输入收款码图片URL"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                      <input
                        type="text"
                        value={contactInfo.supportTitle}
                        onChange={(e) => setContactInfo({ ...contactInfo, supportTitle: e.target.value })}
                        placeholder="例如：支持开发"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                  </div>

                  {/* 支持文本设置 */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <h4 className="font-medium text-gray-800">支持文本设置</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">文本段落1</label>
                      <textarea
                        value={contactInfo.supportText1}
                        onChange={(e) => setContactInfo({ ...contactInfo, supportText1: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">文本段落2</label>
                      <textarea
                        value={contactInfo.supportText2}
                        onChange={(e) => setContactInfo({ ...contactInfo, supportText2: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">文本段落3</label>
                      <textarea
                        value={contactInfo.supportText3}
                        onChange={(e) => setContactInfo({ ...contactInfo, supportText3: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* 重置按钮 */}
                  <div className="flex justify-center">
                    <button
                      onClick={handleResetContactInfo}
                      className="flex items-center gap-2 px-4 py-2 text-orange-600 bg-orange-100 rounded-lg hover:bg-orange-200"
                    >
                      <RotateCcw className="w-4 h-4" />
                      重置为默认
                    </button>
                  </div>
                </div>
              ) : contactPreview ? (
                /* 预览模式 - 显示用户在留言板看到的效果 */
                <div className="space-y-6">
                  {/* 和我联系区域 */}
                  <div className="text-center">
                    <h4 className="font-medium text-gray-800 mb-2">{contactInfo.contactTitle || '和我联系'}</h4>
                    <p className="text-sm text-gray-600 mb-4">{contactInfo.contactDesc || '扫码关注我的小红书'}</p>
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

                  {/* 支持开发区域 */}
                  <div className="border-t pt-6">
                    <h4 className="font-medium text-gray-800 mb-4 text-center">{contactInfo.supportTitle || '支持开发'}</h4>
                    <div className="flex justify-center mb-4">
                      <div className="bg-white p-4 rounded-lg border border-pink-200">
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
                    <div className="text-sm text-gray-700 space-y-2 text-center">
                      <p>{contactInfo.supportText1}</p>
                      <p>{contactInfo.supportText2}</p>
                      <p className="text-gray-500">{contactInfo.supportText3}</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* 只读模式 - 显示当前设置 */
                <div className="space-y-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">小红书二维码</h4>
                    <p className="text-xs text-gray-600 break-all">URL: {contactInfo.xiaohongshuQrUrl}</p>
                    <p className="text-sm text-gray-700 mt-2">标题: {contactInfo.contactTitle}</p>
                    <p className="text-sm text-gray-700">描述: {contactInfo.contactDesc}</p>
                  </div>

                  <div className="bg-pink-50 rounded-lg p-4">
                    <h4 className="font-medium text-pink-800 mb-2">微信收款码</h4>
                    <p className="text-xs text-gray-600 break-all">URL: {contactInfo.wechatPayQrUrl}</p>
                    <p className="text-sm text-gray-700 mt-2">标题: {contactInfo.supportTitle}</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-800 mb-2">支持文本</h4>
                    <p className="text-sm text-gray-700 mb-2">{contactInfo.supportText1}</p>
                    <p className="text-sm text-gray-700 mb-2">{contactInfo.supportText2}</p>
                    <p className="text-sm text-gray-500">{contactInfo.supportText3}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 添加/编辑角色弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingCharacter ? '编辑角色' : '添加角色'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：温柔女友"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">头像URL（可覆盖初始设置）</label>
                <div className="flex gap-3 items-start">
                  <input
                    type="text"
                    value={formData.avatar}
                    onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  {/* 头像预览 - 实时响应用户输入 */}
                  <AvatarPreview
                    avatarUrl={formData.avatar}
                    name={formData.name || '角色'}
                    size="medium"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  提示：这里设置的头像将覆盖管理员的初始设置。留空则使用默认头像。
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">简介</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="简单描述这个角色"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">性格设定</label>
                <input
                  type="text"
                  value={formData.personality}
                  onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                  placeholder="例如：温柔、善良、体贴"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  系统提示词（System Prompt）
                </label>
                <textarea
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                  placeholder="定义AI的角色扮演方式..."
                  rows={6}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  这是最重要的设定！定义AI的角色性格、说话风格、回复方式等
                </p>
              </div>

              {/* 打招呼提示 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  打招呼提示（可选）
                </label>
                <textarea
                  value={formData.greetingPrompt}
                  onChange={(e) => setFormData({ ...formData, greetingPrompt: e.target.value })}
                  placeholder="首次对话时的开场白，如：'嗨，终于等到你了~'"
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  设置后，首次对话时AI会使用这段开场白（留空则使用默认开场）
                </p>
              </div>

              {/* 自定义调教指令 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  调教指令（可选）
                </label>
                <textarea
                  value={formData.customInstructions}
                  onChange={(e) => setFormData({ ...formData, customInstructions: e.target.value })}
                  placeholder="额外的对话规则，如：禁止输出括号内的动作描写..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  添加额外的对话规则，如：禁止剧本式输出、禁止动作描写、回复长度限制等
                </p>
              </div>

              {/* Token限制 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  回复Token限制
                </label>
                <input
                  type="number"
                  value={formData.maxTokens}
                  onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) || 300 })}
                  placeholder="300"
                  min="100"
                  max="8000"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  限制AI单次回复的最大Token数（100-8000），建议300-500可获得较快响应速度
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex gap-3 justify-end">
              <button
                onClick={() => {
                  // 检查是否有未保存的更改
                  const hasUnsavedChanges = JSON.stringify(formData) !== JSON.stringify(originalFormData);
                  if (hasUnsavedChanges) {
                    if (confirm('有未保存的更改，确定要退出吗？')) {
                      setShowForm(false);
                    }
                  } else {
                    setShowForm(false);
                  }
                }}
                className="px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name || !formData.systemPrompt}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TTS预设配置弹窗 */}
      {showTtsConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg font-semibold">TTS预设配置</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveTtsPresets}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  <Save className="w-4 h-4" />
                  保存全部
                </button>
                <button
                  onClick={() => setShowTtsConfig(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {ttsPresets.map((preset) => (
                <div key={preset.id} className="border rounded-xl p-5 bg-gray-50">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-gray-800">{preset.name}</h4>
                      <p className="text-sm text-gray-500 mt-1">{preset.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleTestTts(preset)}
                        disabled={testingTts === preset.id || !preset.baseUrl}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:bg-gray-300"
                      >
                        {testingTts === preset.id ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        测试
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">API地址</label>
                      <input
                        type="text"
                        value={preset.baseUrl}
                        onChange={(e) => updatePreset(preset.id, { baseUrl: e.target.value })}
                        placeholder="https://your-tts-api.com/generate"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">API密钥（可选）</label>
                      <input
                        type="password"
                        value={preset.apiKey || ''}
                        onChange={(e) => updatePreset(preset.id, { apiKey: e.target.value })}
                        placeholder="留空则不使用认证"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">请求方法</label>
                      <select
                        value={preset.method}
                        onChange={(e) => updatePreset(preset.id, { method: e.target.value as 'POST' | 'GET' })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="POST">POST</option>
                        <option value="GET">GET</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">请求头（JSON格式）</label>
                      <textarea
                        value={preset.headers || '{}'}
                        onChange={(e) => updatePreset(preset.id, { headers: e.target.value })}
                        rows={3}
                        placeholder='{"Content-Type": "application/json"}'
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">支持 {'{{api_key}}'} 作为API密钥占位符</p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">请求体模板</label>
                      <textarea
                        value={preset.bodyTemplate || '{}'}
                        onChange={(e) => updatePreset(preset.id, { bodyTemplate: e.target.value })}
                        rows={4}
                        placeholder='{"text": "{{text}}"}'
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        使用 {'{{text}}'} 作为文本占位符，{'{{voice_id}}'} 作为声音ID占位符
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">声音ID参数名</label>
                      <input
                        type="text"
                        value={preset.voiceId || ''}
                        onChange={(e) => updatePreset(preset.id, { voiceId: e.target.value })}
                        placeholder="如：voice_id"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">声音ID值</label>
                      <input
                        type="text"
                        value={preset.voiceIdValue || ''}
                        onChange={(e) => updatePreset(preset.id, { voiceIdValue: e.target.value })}
                        placeholder="如：zh-CN-XiaoxiaoNeural"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">响应类型</label>
                      <select
                        value={preset.responseType}
                        onChange={(e) => updatePreset(preset.id, { responseType: e.target.value as 'audio' | 'json' | 'base64' })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="audio">直接返回音频</option>
                        <option value="json">JSON（包含音频URL）</option>
                        <option value="base64">Base64编码音频</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">JSON音频URL字段</label>
                      <input
                        type="text"
                        value={preset.audioUrlField || ''}
                        onChange={(e) => updatePreset(preset.id, { audioUrlField: e.target.value })}
                        placeholder="如：data.audio_url"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">测试文本</label>
                      <input
                        type="text"
                        value={preset.testText}
                        onChange={(e) => updatePreset(preset.id, { testText: e.target.value })}
                        placeholder="输入测试用的文本"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  {testResult && (
                    <div className={`mt-4 p-3 rounded-lg ${testResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {testResult.success ? '✅ 测试成功' : `❌ 测试失败: ${testResult.message}`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 秘密信箱提示词配置弹窗 */}
      {showSecretMailbox && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold">秘密信箱提示词配置</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveSecretMailboxPrompts}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  <Save className="w-4 h-4" />
                  保存
                </button>
                <button
                  onClick={() => {
                    // 检查是否有未保存的更改
                    const hasUnsavedChanges = JSON.stringify(secretMailboxPrompts) !== JSON.stringify(originalSecretMailbox);
                    if (hasUnsavedChanges) {
                      if (confirm('有未保存的更改，确定要退出吗？')) {
                        setSecretMailboxPrompts(originalSecretMailbox);
                        setShowSecretMailbox(false);
                      }
                    } else {
                      setShowSecretMailbox(false);
                    }
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  <strong>提示：</strong>这些提示词用于AI生成秘密信箱中的信件内容。每个类别的提示词应包含生成规则、字数限制和风格要求。
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-amber-600 mr-2">💌</span>
                    心里话
                  </label>
                  <textarea
                    value={secretMailboxPrompts.category1}
                    onChange={(e) => setSecretMailboxPrompts({ ...secretMailboxPrompts, category1: e.target.value })}
                    rows={4}
                    placeholder="请根据对话生成一句温馨的心里话..."
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-pink-600 mr-2">💭</span>
                    心声
                  </label>
                  <textarea
                    value={secretMailboxPrompts.category2}
                    onChange={(e) => setSecretMailboxPrompts({ ...secretMailboxPrompts, category2: e.target.value })}
                    rows={4}
                    placeholder="请根据对话生成一句真挚的心声..."
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-green-600 mr-2">🌸</span>
                    生活细节
                  </label>
                  <textarea
                    value={secretMailboxPrompts.category3}
                    onChange={(e) => setSecretMailboxPrompts({ ...secretMailboxPrompts, category3: e.target.value })}
                    rows={4}
                    placeholder="请根据对话提炼一个生活细节..."
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-blue-600 mr-2">🌙</span>
                    未说出口
                  </label>
                  <textarea
                    value={secretMailboxPrompts.category4}
                    onChange={(e) => setSecretMailboxPrompts({ ...secretMailboxPrompts, category4: e.target.value })}
                    rows={4}
                    placeholder="请根据对话写一句未说出口的话..."
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 帮助内容配置弹窗 */}
      {showHelpConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold">帮助内容配置</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // 恢复原始内容
                    const savedContent = localStorage.getItem(HELP_CONTENT_KEY);
                    if (savedContent) {
                      setHelpContent(savedContent);
                    } else {
                      setHelpContent(DEFAULT_HELP_CONTENT);
                    }
                  }}
                  className="px-3 py-1.5 text-orange-600 bg-orange-50 rounded-lg text-sm hover:bg-orange-100"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  重置
                </button>
                <button
                  onClick={handleSaveHelpContent}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  <Save className="w-4 h-4" />
                  保存
                </button>
                <button
                  onClick={() => {
                    // 检查是否有未保存的更改
                    const hasUnsavedChanges = helpContent !== originalHelpContent;
                    if (hasUnsavedChanges) {
                      if (confirm('有未保存的更改，确定要退出吗？')) {
                        setHelpContent(originalHelpContent);
                        setShowHelpConfig(false);
                      }
                    } else {
                      setShowHelpConfig(false);
                    }
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  <strong>提示：</strong>在这里编辑用户在"帮助"页面看到的使用指南。支持Markdown格式：
                  <code className="bg-blue-100 px-1 rounded mx-1"># 标题</code>
                  <code className="bg-blue-100 px-1 rounded mx-1">## 二级标题</code>
                  <code className="bg-blue-100 px-1 rounded mx-1">### 三级标题</code>
                  <code className="bg-blue-100 px-1 rounded mx-1">**粗体**</code>
                  <code className="bg-blue-100 px-1 rounded mx-1">- 列表项</code>
                  <code className="bg-blue-100 px-1 rounded mx-1">--- 分隔线</code>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  帮助文档内容
                </label>
                <textarea
                  value={helpContent}
                  onChange={(e) => setHelpContent(e.target.value)}
                  rows={30}
                  placeholder="输入帮助文档内容..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              </div>

              {/* 预览区域 */}
              <div className="border-t pt-6 mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  预览效果
                </h4>
                <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
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
          </div>
        </div>
      )}
    </div>
  );
}
