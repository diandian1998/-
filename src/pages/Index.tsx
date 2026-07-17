import { useState, useEffect, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Character } from '../types';
import { getCharacters, saveCharacters } from '../lib/chatStorage';
import { syncAllFromCloud } from '../lib/cloudStorage';
import { Menu, ChevronRight, Sparkles, Settings, Loader, Key, Server, Cpu, Volume2, RefreshCw, Smile, MessageSquare, HelpCircle, X } from 'lucide-react';
import { getProviderList, getApiProvider } from '../lib/deepseek';
import { getUserConfig, saveUserConfig } from '../lib/chatStorage';
import { getImageLibrary } from '../lib/chatStorage';

// 缓存键名
const CACHE_TIMESTAMP_KEY = 'ai_chat_cache_timestamp';
const CACHE_STALE_TIME = 5 * 60 * 1000; // 5分钟内使用本地缓存

// 备用头像SVG - 内联SVG更快加载
const fallbackAvatar = (name: string) => {
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981'];
  const color = colors[name.length % colors.length];
  const initial = name.charAt(0);
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="${color}"/><text x="50" y="65" font-size="50" font-family="Arial" text-anchor="middle" fill="white">${initial}</text></svg>`)}`;
};

// 懒加载头像组件
const LazyAvatar = memo(({
  src,
  alt,
  name,
  className,
  onError
}: {
  src: string;
  alt: string;
  name: string;
  className?: string;
  onError?: () => void;
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(fallbackAvatar(name));
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '50px', threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isInView && src) {
      // 使用图片缓存优化
      const img = new Image();
      img.onload = () => {
        setCurrentSrc(src);
        setIsLoaded(true);
      };
      img.onerror = () => {
        setCurrentSrc(fallbackAvatar(name));
        onError?.();
      };
      img.src = src;
    }
  }, [isInView, src, name, onError]);

  return (
    <div
      ref={imgRef}
      className={`relative ${className || ''}`}
    >
      {/* 骨架屏/占位图 */}
      {!isLoaded && (
        <div
          className="absolute inset-0 bg-gray-200 animate-pulse rounded-full"
          style={{ backgroundColor: '#e5e5e5' }}
        />
      )}
      <img
        src={currentSrc}
        alt={alt}
        loading="lazy"
        className={`${className || ''} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        onError={() => {
          setCurrentSrc(fallbackAvatar(name));
          onError?.();
        }}
      />
    </div>
  );
});

export default function Index() {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [failedAvatars, setFailedAvatars] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false); // 是否正在同步
  const isSyncingRef = useRef(false);
  const [userCustomAvatar, setUserCustomAvatar] = useState<string>('');

  // 全局设置相关状态
  const [globalConfig, setGlobalConfig] = useState(getUserConfig());
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    // 检查缓存是否有效
    const checkCache = () => {
      const cacheTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      if (cacheTimestamp) {
        const elapsed = Date.now() - parseInt(cacheTimestamp);
        return elapsed < CACHE_STALE_TIME;
      }
      return false;
    };

    // 更新缓存时间戳
    const updateCacheTimestamp = () => {
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    };

    // 从云端同步角色配置（带缓存优化）
    const syncCharacters = async () => {
      // 防止重复同步
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;

      try {
        // 先检查本地缓存
        const localChars = getCharacters();
        if (localChars.length > 0) {
          // 优先显示本地数据，快速渲染
          setCharacters(localChars);
        }

        // 检查缓存是否过期
        const cacheValid = checkCache();
        if (cacheValid && localChars.length > 0) {
          // 缓存有效，跳过网络请求
          console.log('使用本地缓存，跳过云端同步');
          return;
        }

        setIsSyncing(true);

        // 创建超时Promise（3秒）
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('同步超时')), 3000);
        });

        // 尝试从云端同步
        const cloudData: any = await Promise.race([
          syncAllFromCloud(),
          timeoutPromise
        ]);

        if (cloudData.characters && cloudData.characters.length > 0) {
          // 云端有数据，保存到本地并更新状态
          saveCharacters(cloudData.characters);
          setCharacters(cloudData.characters);
          updateCacheTimestamp(); // 更新缓存时间戳
        }
      } catch (error) {
        console.error('云端同步失败:', error);
        // 同步失败时确保显示本地数据
        const localChars = getCharacters();
        if (localChars.length > 0) {
          setCharacters(localChars);
        }
      } finally {
        setIsSyncing(false);
        isSyncingRef.current = false;
      }
    };

    syncCharacters();

    // 加载用户自定义头像
    const savedConfig = localStorage.getItem('ai_chat_user_config');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        if (config.customAvatar) {
          setUserCustomAvatar(config.customAvatar);
        }
      } catch (e) {
        console.log('读取用户配置失败');
      }
    }
  }, []);

  const handleAvatarError = (avatarUrl: string) => {
    setFailedAvatars(prev => new Set([...prev, avatarUrl]));
  };

  const getAvatarUrl = (avatarUrl: string, name: string) => {
    if (failedAvatars.has(avatarUrl)) {
      return fallbackAvatar(name);
    }
    return avatarUrl;
  };

  // 安全获取角色简介（处理可能的JSON字符串）
  const getCharDescription = (char: Character) => {
    const desc = char.description || char.personality || '';
    // 如果看起来像JSON，尝试解析
    if (desc.trim().startsWith('{') || desc.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(desc);
        // 取第一个字段的值
        const firstValue = Object.values(parsed)[0];
        if (typeof firstValue === 'string') {
          return firstValue.substring(0, 50) + (firstValue.length > 50 ? '...' : '');
        }
      } catch {
        // JSON解析失败，返回截断的原文
      }
    }
    return desc.substring(0, 50) + (desc.length > 50 ? '...' : '');
  };

  const handleCharacterClick = (char: Character) => {
    // 跳转到聊天页面并传递角色ID
    navigate(`/chat?character=${char.id}`);
  };

  // 显示Toast提示
  const displayToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // 保存全局设置
  const handleSaveGlobalSettings = () => {
    const config = getUserConfig();
    const updatedConfig = {
      ...config,
      apiKey: globalConfig.apiKey,
      apiProvider: globalConfig.apiProvider || 'deepseek',
      apiModel: globalConfig.apiModel,
      ttsEnabled: globalConfig.ttsEnabled,
      ttsUrl: globalConfig.ttsUrl,
      autoReplyEnabled: globalConfig.autoReplyEnabled,
      autoReplyInterval: globalConfig.autoReplyInterval || 30,
      defaultMaxTokens: globalConfig.defaultMaxTokens || 5000,
    };
    saveUserConfig(updatedConfig);
    displayToast('全局设置已保存~');
    setShowGlobalSettings(false);
  };

  // 跳转到聊天页面
  const navigateToChat = () => {
    // 先保存当前全局设置
    handleSaveGlobalSettings();
    // 然后跳转
    if (characters.length > 0) {
      navigate(`/chat?character=${characters[0].id}`);
    } else {
      navigate('/chat');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 顶部栏 */}
      <div className="bg-white shadow-sm border-b px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            {userCustomAvatar ? (
              <LazyAvatar
                src={getAvatarUrl(userCustomAvatar, '用户')}
                alt="用户头像"
                name="用户"
                className="w-8 h-8 rounded-full"
                onError={() => handleAvatarError(userCustomAvatar)}
              />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-purple-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            )}
            <h1 className="text-lg font-semibold text-gray-800">AI Chat</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* 同步状态指示 */}
            {isSyncing && (
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Loader className="w-3 h-3 animate-spin" />
                <span>同步中</span>
              </div>
            )}
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* 导航菜单 */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-4 top-14 bg-white rounded-xl shadow-lg border z-50 py-2 min-w-48">
            <button
              onClick={() => {
                setShowGlobalSettings(true);
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-blue-600 transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span className="text-sm font-medium">全局设置</span>
            </button>
            <button
              onClick={() => {
                // 跳转到聊天页面并打开菜单
                navigate('/chat?openMenu=true');
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 transition-colors"
            >
              <Menu className="w-5 h-5" />
              <span className="text-sm font-medium">角色菜单</span>
            </button>
          </div>
        </>
      )}

      {/* 角色列表（微信通讯录风格） */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto">
          {characters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Sparkles className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-sm">暂无角色配置</p>
              <p className="text-xs mt-2">请联系管理员配置角色</p>
            </div>
          ) : (
            <div className="bg-white">
              {characters.map((char, index) => (
                <div key={char.id}>
                  <button
                    onClick={() => handleCharacterClick(char)}
                    className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <LazyAvatar
                      src={getAvatarUrl(userCustomAvatar || char.avatar, userCustomAvatar ? '用户' : char.name)}
                      alt={userCustomAvatar ? '用户头像' : char.name}
                      name={userCustomAvatar ? '用户' : char.name}
                      className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0"
                      onError={() => {
                        // 如果用户自定义头像加载失败，尝试角色默认头像
                        if (userCustomAvatar) {
                          handleAvatarError(userCustomAvatar);
                        } else {
                          handleAvatarError(char.avatar);
                        }
                      }}
                    />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-800">{char.name}</div>
                      <div className="text-sm text-gray-500 truncate">{getCharDescription(char)}</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </button>
                  {index < characters.length - 1 && <div className="h-px bg-gray-100 ml-16" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 底部留白（安全区域） */}
      <div className="h-4 bg-white border-t safe-area-pb" />

      {/* 全局设置弹窗 */}
      {showGlobalSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* 头部 */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6" />
                <h3 className="text-lg font-semibold">全局设置</h3>
              </div>
              <button
                onClick={() => setShowGlobalSettings(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 设置内容 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* API Key */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Key className="w-4 h-4" />
                  API Key（必填）
                </label>
                <input
                  type="password"
                  value={globalConfig.apiKey || ''}
                  onChange={(e) => setGlobalConfig({ ...globalConfig, apiKey: e.target.value })}
                  placeholder="输入您的 API Key"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">请前往对应的服务商平台获取 API Key</p>
              </div>

              {/* 服务商选择 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Server className="w-4 h-4" />
                  AI 服务商
                </label>
                <select
                  value={globalConfig.apiProvider || 'deepseek'}
                  onChange={(e) => setGlobalConfig({ ...globalConfig, apiProvider: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {getProviderList().map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* 模型选择 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Cpu className="w-4 h-4" />
                  自定义模型（可选）
                </label>
                <input
                  type="text"
                  value={globalConfig.apiModel || ''}
                  onChange={(e) => setGlobalConfig({ ...globalConfig, apiModel: e.target.value })}
                  placeholder="留空使用默认模型"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">例如: deepseek-chat, qwen-plus, doubao-pro</p>
              </div>

              {/* 最大Token数 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Cpu className="w-4 h-4" />
                  最大 Token 数
                </label>
                <input
                  type="number"
                  value={globalConfig.defaultMaxTokens || 5000}
                  onChange={(e) => setGlobalConfig({ ...globalConfig, defaultMaxTokens: parseInt(e.target.value) || 5000 })}
                  min="100"
                  max="8000"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">控制AI单次回复的最大长度（100-8000），默认5000</p>
              </div>

              {/* TTS语音播报 */}
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={globalConfig.ttsEnabled || false}
                    onChange={(e) => setGlobalConfig({ ...globalConfig, ttsEnabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <Volume2 className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">启用语音播报</span>
                </label>
                {globalConfig.ttsEnabled && (
                  <div className="ml-6">
                    <input
                      type="text"
                      value={globalConfig.ttsUrl || ''}
                      onChange={(e) => setGlobalConfig({ ...globalConfig, ttsUrl: e.target.value })}
                      placeholder="留空使用浏览器内置TTS"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                )}
              </div>

              {/* 自动回复 */}
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={globalConfig.autoReplyEnabled || false}
                    onChange={(e) => setGlobalConfig({ ...globalConfig, autoReplyEnabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <RefreshCw className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">启用自动回复</span>
                </label>
                {globalConfig.autoReplyEnabled && (
                  <div className="ml-6">
                    <label className="text-xs text-gray-600 mb-1 block">自动回复间隔（秒）</label>
                    <input
                      type="number"
                      value={globalConfig.autoReplyInterval || 30}
                      onChange={(e) => setGlobalConfig({ ...globalConfig, autoReplyInterval: parseInt(e.target.value) || 30 })}
                      min="10"
                      max="300"
                      className="w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* 共享表情库 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Smile className="w-4 h-4" />
                  共享表情库
                </label>
                <p className="text-xs text-gray-500 mb-2">所有角色共享的表情包，点击进入表情库管理</p>
                <button
                  onClick={() => {
                    // 先保存设置，然后跳转到聊天页面打开表情库
                    handleSaveGlobalSettings();
                    if (characters.length > 0) {
                      navigate(`/chat?character=${characters[0].id}&openImagePicker=true`);
                    } else {
                      navigate('/chat?openImagePicker=true');
                    }
                    setShowGlobalSettings(false);
                    setShowMenu(false);
                  }}
                  className="px-4 py-2 bg-pink-100 text-pink-600 rounded-lg hover:bg-pink-200 transition-colors text-sm"
                >
                  管理表情库
                </button>
              </div>

              {/* 分隔线 */}
              <div className="border-t pt-4">
                <button
                  onClick={() => {
                    // 联系开发者
                    if (characters.length > 0) {
                      navigate(`/chat?character=${characters[0].id}&openMessageBoard=true`);
                    } else {
                      navigate('/chat?openMessageBoard=true');
                    }
                    handleSaveGlobalSettings();
                    setShowGlobalSettings(false);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span className="text-sm font-medium">联系开发者</span>
                </button>
                <button
                  onClick={() => {
                    // 帮助
                    if (characters.length > 0) {
                      navigate(`/chat?character=${characters[0].id}&openHelp=true`);
                    } else {
                      navigate('/chat?openHelp=true');
                    }
                    handleSaveGlobalSettings();
                    setShowGlobalSettings(false);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors mt-2"
                >
                  <HelpCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">帮助</span>
                </button>
              </div>
            </div>

            {/* 保存按钮 */}
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={handleSaveGlobalSettings}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-600 transition-all"
              >
                保存设置
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast提示 */}
      {showToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
