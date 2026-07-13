import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Character } from '../types';
import { getCharacters } from '../lib/chatStorage';
import { syncAllFromCloud } from '../lib/cloudStorage';
import { Calendar, Settings, Menu, ChevronRight, Sparkles } from 'lucide-react';

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

  useEffect(() => {
    // 从云端同步角色配置
    const syncCharacters = async () => {
      try {
        const cloudData = await syncAllFromCloud();
        if (cloudData.characters && cloudData.characters.length > 0) {
          setCharacters(cloudData.characters);
        } else {
          setCharacters(getCharacters());
        }
      } catch (error) {
        console.error('云端同步失败:', error);
        setCharacters(getCharacters());
      }
    };
    syncCharacters();
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
            <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-purple-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-semibold text-gray-800">AI Chat</h1>
          </div>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
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
                navigate('/chat');
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
                      src={getAvatarUrl(char.avatar, char.name)}
                      alt={char.name}
                      onError={() => handleAvatarError(char.avatar)}
                      className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0"
                    />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-800">{char.name}</div>
                      <div className="text-sm text-gray-500 truncate">{char.description || char.personality}</div>
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

      {/* 底部导航栏 */}
      <div className="bg-white border-t px-4 py-2 safe-area-pb">
        <div className="max-w-lg mx-auto flex justify-around">
          <button
            onClick={() => navigate('/chat')}
            className="flex flex-col items-center gap-1 py-2 px-4 text-pink-500"
          >
            <div className="w-6 h-6 bg-current rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
            <span className="text-xs font-medium">聊天</span>
          </button>
          <button
            onClick={() => navigate('/chat')}
            className="flex flex-col items-center gap-1 py-2 px-4 text-gray-400"
          >
            <Calendar className="w-6 h-6" />
            <span className="text-xs">日历</span>
          </button>
          <button
            onClick={() => navigate('/chat')}
            className="flex flex-col items-center gap-1 py-2 px-4 text-gray-400"
          >
            <Settings className="w-6 h-6" />
            <span className="text-xs">设置</span>
          </button>
        </div>
      </div>
    </div>
  );
}
