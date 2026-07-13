import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Character } from '../types';
import { getCharacters, saveCharacters } from '../lib/chatStorage';
import { syncAllFromCloud } from '../lib/cloudStorage';
import { Menu, ChevronRight, Sparkles, Settings, Loader } from 'lucide-react';

// 缓存键名
const CACHE_TIMESTAMP_KEY = 'ai_chat_cache_timestamp';
const CACHE_STALE_TIME = 5 * 60 * 1000; // 5分钟内使用本地缓存

// 备用头像SVG
const fallbackAvatar = (name: string) => {
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981'];
  const color = colors[name.length % colors.length];
  const initial = name.charAt(0);
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="${color}"/><text x="50" y="65" font-size="50" font-family="Arial" text-anchor="middle" fill="white">${initial}</text></svg>`)}`;
};

export default function Index() {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [failedAvatars, setFailedAvatars] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false); // 是否正在同步
  const isSyncingRef = useRef(false);
  const [userCustomAvatar, setUserCustomAvatar] = useState<string>('');

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 顶部栏 */}
      <div className="bg-white shadow-sm border-b px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            {userCustomAvatar ? (
              <img
                src={getAvatarUrl(userCustomAvatar, '用户')}
                alt="用户头像"
                onError={() => handleAvatarError(userCustomAvatar)}
                className="w-8 h-8 rounded-full bg-gray-200"
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
          <div className="absolute right-4 top-14 bg-white rounded-xl shadow-lg border z-50 py-2 min-w-40">
            <button
              onClick={() => {
                // Bug2: 跳转到聊天页面并传递参数，自动打开设置弹窗
                navigate('/chat?openSettings=true');
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span className="text-sm font-medium">设置</span>
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
                    <img
                      src={getAvatarUrl(userCustomAvatar || char.avatar, userCustomAvatar ? '用户' : char.name)}
                      alt={userCustomAvatar ? '用户头像' : char.name}
                      onError={() => {
                        // 如果用户自定义头像加载失败，尝试角色默认头像
                        if (userCustomAvatar) {
                          handleAvatarError(userCustomAvatar);
                        } else {
                          handleAvatarError(char.avatar);
                        }
                      }}
                      className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0"
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
    </div>
  );
}
