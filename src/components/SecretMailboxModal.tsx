import { useState, useEffect, useMemo } from 'react';
import { X, Mail, Clock, Heart, Sparkles, MessageCircle, Star, Trash2, RefreshCw, Shuffle, CheckCircle } from 'lucide-react';
import { Character, Message, UserConfig, SecretMailboxLetter } from '../types';
import {
  getMailboxLettersByCharacter,
  saveMailboxLetter,
  markLetterAsRead,
  deleteMailboxLetter,
  getDaysUntilExpiry,
  getMailboxPrompts,
} from '../lib/chatStorage';
import { smartChat } from '../lib/deepseek';

interface SecretMailboxModalProps {
  onClose: () => void;
  currentCharacter: Character | null;
  userConfig: UserConfig;
  messages: Message[];
  onSaveToDiary: (content: string, title: string) => void;
}

const CATEGORY_INFO = [
  { key: 'category1', name: '心里话', icon: Heart, color: 'text-pink-500', bg: 'bg-pink-50', prompt: '写一封温柔的心里话，表达对方在你心中的特别之处，50字以内' },
  { key: 'category2', name: '心声', icon: MessageCircle, color: 'text-purple-500', bg: 'bg-purple-50', prompt: '以心声的方式，写下那些想说却没说出口的话，50字以内' },
  { key: 'category3', name: '生活细节', icon: Sparkles, color: 'text-blue-500', bg: 'bg-blue-50', prompt: '记录一些生活中的小细节，那些让你感到温暖的瞬间，50字以内' },
  { key: 'category4', name: '未说出口', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50', prompt: '写下一些从未说出口的话，可以是遗憾、感谢或期待，50字以内' },
];

export default function SecretMailboxModal({
  onClose,
  currentCharacter,
  userConfig,
  messages,
  onSaveToDiary
}: SecretMailboxModalProps) {
  const [letters, setLetters] = useState<SecretMailboxLetter[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<SecretMailboxLetter | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'inbox' | 'generate' | 'subscribed'>('inbox');
  const [showExpiryWarning, setShowExpiryWarning] = useState<SecretMailboxLetter | null>(null);
  const [generationHistory, setGenerationHistory] = useState<Set<string>>(new Set());
  const [recentCategories, setRecentCategories] = useState<{ category: string; count: number }[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // 初始化订阅状态 - 从localStorage读取
  useEffect(() => {
    const subscriptionKey = `ai_chat_mailbox_subscribed_${currentCharacter?.id}`;
    const savedSubscribed = localStorage.getItem(subscriptionKey) === 'true';
    setIsSubscribed(savedSubscribed);
    loadLetters();
    checkExpiryWarnings();
  }, [currentCharacter]);

  const loadLetters = () => {
    if (currentCharacter) {
      const letterList = getMailboxLettersByCharacter(currentCharacter.id);
      setLetters(letterList);

      // 构建历史记录（用于去重）
      const history = new Set<string>();
      letterList.forEach(l => history.add(l.content));
      setGenerationHistory(history);

      // 统计最近使用的类别（最近3封信）
      const recent = letterList.slice(0, 3);
      const categoryCounts: Record<string, number> = {};
      recent.forEach(l => {
        categoryCounts[l.category] = (categoryCounts[l.category] || 0) + 1;
      });
      setRecentCategories(
        Object.entries(categoryCounts).map(([category, count]) => ({ category, count }))
      );
    }
  };

  const checkExpiryWarnings = () => {
    if (currentCharacter) {
      const expiring = getMailboxLettersByCharacter(currentCharacter.id).filter(l => {
        const days = getDaysUntilExpiry(l.expiresAt);
        return days <= 1 && days > 0 && !l.isRead;
      });
      if (expiring.length > 0) {
        setShowExpiryWarning(expiring[0]);
      }
    }
  };

  // AI 智能选择类别（避免重复和过度集中）
  const selectCategory = useMemo(() => {
    const prompts = getMailboxPrompts();

    // 过滤可用的类别（最近3封没有用过的，或者使用次数<2的）
    const availableCategories = CATEGORY_INFO.filter(cat => {
      const recentUse = recentCategories.find(r => r.category === cat.name);
      return !recentUse || recentUse.count < 2;
    });

    // 如果所有类别都被频繁使用，从所有类别中选择
    const pool = availableCategories.length > 0 ? availableCategories : CATEGORY_INFO;

    // 随机选择一个
    const selected = pool[Math.floor(Math.random() * pool.length)];

    // 获取该类别的实际提示词（从管理员配置的提示词中获取）
    const promptText = prompts[selected.key as keyof typeof prompts] || selected.prompt;

    return { category: selected, prompt: promptText };
  }, [recentCategories]);

  // 检查内容是否重复
  const isContentDuplicate = (content: string): boolean => {
    // 检查历史记录
    if (generationHistory.has(content)) return true;

    // 检查信件列表中是否有相似内容（简化版：前20个字符相同则视为重复）
    const prefix = content.substring(0, 20);
    return letters.some(l => l.content.substring(0, 20) === prefix);
  };

  const handleGenerateLetter = async () => {
    if (!currentCharacter || !userConfig.apiKey) return;

    setIsGenerating(true);
    let attempts = 0;
    const maxAttempts = 3;
    let newLetter: SecretMailboxLetter | null = null;

    try {
      // 获取AI选择的类别
      const { category, prompt } = selectCategory;

      // 构建对话上下文
      const recentMessages = messages.slice(-10).map(m =>
        `${m.role === 'user' ? '用户' : currentCharacter.name}：${m.content}`
      ).join('\n');

      const fullPrompt = `你是${currentCharacter.name}，角色性格：${currentCharacter.personality}。

请根据以下对话内容，写一封信：
要求：
1. 50字以内
2. 情感真挚，符合角色性格
3. 直接输出信件内容，不要加任何前缀或说明
4. 内容要新颖，不要和之前的信件重复

对话内容：
${recentMessages}

信件主题：${prompt}`;

      const response = await smartChat(
        [{ role: 'user', content: fullPrompt }],
        '你是一个善于表达情感的角色，能够写出温暖人心的文字。输出内容要简洁有力，不要重复之前写过的内容。'
      );

      const content = response.content.trim();

      // 检查内容是否重复
      if (isContentDuplicate(content)) {
        // 如果重复，再尝试一次
        if (attempts < maxAttempts) {
          attempts++;
          // 重新获取类别和提示词
          const retryCategory = selectCategory;
          const retryPromptText = retryCategory.prompt;
          const retryFullPrompt = `请根据以下对话内容，写一封不同于之前的信。要求50字以内，情感真挚，直接输出内容。

对话内容：
${recentMessages}

信件主题：${retryPromptText}`;

          const retryResponse = await smartChat(
            [{ role: 'user', content: retryFullPrompt }],
            '你是一个善于表达情感的角色，能够写出温暖人心的文字。这次要写一些不同的内容。'
          );

          const retryContent = retryResponse.content.trim();
          if (!isContentDuplicate(retryContent)) {
            // 计算过期时间（30天后）
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);

            newLetter = saveMailboxLetter({
              content: retryContent,
              category: retryCategory.category.name,
              expiresAt: expiresAt.toISOString(),
              isRead: false,
              characterId: currentCharacter.id,
              userId: 'current_user',
            });
          }
        }
      } else {
        // 计算过期时间（30天后）
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        newLetter = saveMailboxLetter({
          content,
          category: category.name,
          expiresAt: expiresAt.toISOString(),
          isRead: false,
          characterId: currentCharacter.id,
          userId: 'current_user',
        });
      }

      // 如果多次尝试仍重复，使用内容并记录（避免无限循环）
      if (!newLetter) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        newLetter = saveMailboxLetter({
          content: content + '（随机）',
          category: category.name,
          expiresAt: expiresAt.toISOString(),
          isRead: false,
          characterId: currentCharacter.id,
          userId: 'current_user',
        });
      }

      loadLetters();
      setSelectedLetter(newLetter);
      setActiveTab('inbox');
    } catch (error) {
      console.error('生成信件失败:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenLetter = (letter: SecretMailboxLetter) => {
    markLetterAsRead(letter.id);
    setSelectedLetter(letter);
    loadLetters();
  };

  const handleDeleteLetter = (letterId: string) => {
    if (confirm('确定要删除这封信吗？')) {
      deleteMailboxLetter(letterId);
      if (selectedLetter?.id === letterId) {
        setSelectedLetter(null);
      }
      loadLetters();
    }
  };

  const handleSaveToDiary = (letter: SecretMailboxLetter) => {
    const title = `来自${currentCharacter?.name}的信 - ${letter.category}`;
    onSaveToDiary(letter.content, title);
  };

  const unreadCount = letters.filter(l => !l.isRead).length;

  // 获取当前角色的名称首字母（用于署名）
  const getCharacterSignature = (characterId: string): string => {
    if (currentCharacter && characterId === currentCharacter.id) {
      return currentCharacter.name.charAt(0);
    }
    return '?';
  };

  // 阅读信件视图
  if (selectedLetter) {
    const daysLeft = getDaysUntilExpiry(selectedLetter.expiresAt);
    const isExpiring = daysLeft <= 3;
    const characterName = currentCharacter?.name || '';

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] flex flex-col overflow-hidden">
          {/* 信封样式头部 */}
          <div className="bg-gradient-to-r from-pink-400 to-purple-400 p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
              <Mail className="w-full h-full" />
            </div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                <span className="font-medium">秘密信箱</span>
              </div>
              <button
                onClick={() => setSelectedLetter(null)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative z-10 mt-4">
              <p className="text-sm opacity-80">{selectedLetter.category}</p>
              <p className="text-xs opacity-60 mt-1">
                剩余 {daysLeft} 天后消失
              </p>
            </div>
          </div>

          {/* 信件内容 - 带署名格式："内容"——角色首字母 */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-100 shadow-sm">
              <div className="text-amber-800 whitespace-pre-wrap leading-relaxed text-center">
                <p className="text-lg italic mb-4">"{selectedLetter.content}"</p>
                <p className="text-sm font-medium">——{characterName}</p>
              </div>
            </div>
            <p className="text-center text-xs text-gray-400 mt-4">
              这封信来自 {new Date(selectedLetter.createdAt).toLocaleDateString('zh-CN')}
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="p-4 border-t flex gap-3">
            <button
              onClick={() => handleSaveToDiary(selectedLetter)}
              className="flex-1 py-3 bg-purple-100 text-purple-600 rounded-xl font-medium hover:bg-purple-200 transition-colors flex items-center justify-center gap-2"
            >
              <Star className="w-4 h-4" />
              收藏到日记本
            </button>
            <button
              onClick={() => handleDeleteLetter(selectedLetter.id)}
              className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 主视图
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* 头部 */}
        <div className="border-b px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
              <Mail className="w-5 h-5 text-pink-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">秘密信箱</h3>
              <p className="text-xs text-gray-500">
                {unreadCount > 0 ? `${unreadCount} 封未读信件` : '共 ' + letters.length + ' 封信'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 标签切换 */}
        <div className="flex border-b flex-shrink-0">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'inbox' ? 'text-pink-600' : 'text-gray-500'
            }`}
          >
            收件箱
            {unreadCount > 0 && (
              <span className="absolute top-2 right-1/2 translate-x-6 w-5 h-5 bg-pink-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
            {activeTab === 'inbox' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'generate' || activeTab === 'subscribed' ? 'text-pink-600' : 'text-gray-500'
            }`}
          >
            {isSubscribed ? '已订阅' : '订阅收信'}
            {activeTab === 'generate' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500" />
            )}
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'inbox' ? (
            // 收件箱
            letters.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Mail className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-sm">信箱空空如也</p>
                <p className="text-xs mt-1">点击"收取新信"获取第一封信吧~</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {letters.map((letter) => {
                  const daysLeft = getDaysUntilExpiry(letter.expiresAt);
                  const isExpiring = daysLeft <= 3;
                  const CategoryIcon = CATEGORY_INFO.find(c => c.name === letter.category)?.icon || Mail;
                  const CategoryColor = CATEGORY_INFO.find(c => c.name === letter.category)?.color || 'text-gray-500';
                  const CategoryBg = CATEGORY_INFO.find(c => c.name === letter.category)?.bg || 'bg-gray-50';
                  const signature = getCharacterSignature(letter.characterId);

                  return (
                    <button
                      key={letter.id}
                      onClick={() => handleOpenLetter(letter)}
                      className={`w-full text-left p-4 rounded-xl border transition-all hover:shadow-md ${
                        letter.isRead
                          ? 'bg-white border-gray-100'
                          : 'bg-gradient-to-r from-pink-50 to-purple-50 border-pink-100'
                      } ${isExpiring ? 'ring-2 ring-amber-300' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 ${CategoryBg} rounded-full flex items-center justify-center flex-shrink-0`}>
                          <Mail className={`w-5 h-5 ${CategoryColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-600 line-clamp-2 italic">
                            "{letter.content}"
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-3 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {daysLeft} 天
                              </span>
                              <span>
                                {new Date(letter.createdAt).toLocaleDateString('zh-CN')}
                              </span>
                            </div>
                            <span className="text-xs font-medium text-pink-600">
                              ——{currentCharacter?.name}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            // 订阅模式 - 一次订阅，自动推送
            <div className="p-6">
              {isSubscribed ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">已成功订阅</h4>
                  <p className="text-sm text-gray-500">聊天时会自动收到来自 {currentCharacter?.name} 的来信~</p>
                  <button
                    onClick={() => setIsSubscribed(false)}
                    className="mt-4 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 underline"
                  >
                    取消订阅
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    // 修复11：点击订阅后按钮消失，只设置订阅状态，不立即生成信件
                    // 信件会在后台自动推送（在用户聊天时）
                    setIsSubscribed(true);
                    // 保存订阅状态到localStorage
                    const subscriptionKey = `ai_chat_mailbox_subscribed_${currentCharacter?.id}`;
                    localStorage.setItem(subscriptionKey, 'true');
                  }}
                  disabled={isGenerating || messages.length < 3 || !userConfig.apiKey || letters.length >= 30}
                  className={`w-full py-5 rounded-xl font-medium text-lg transition-all flex items-center justify-center gap-3 ${
                    isGenerating || messages.length < 3 || !userConfig.apiKey || letters.length >= 30
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 shadow-lg hover:shadow-xl'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      正在订阅...
                    </>
                  ) : messages.length < 3 ? (
                    <>
                      <Mail className="w-5 h-5" />
                      继续聊天解锁（{messages.length}/3）
                    </>
                  ) : !userConfig.apiKey ? (
                    '请先配置API Key'
                  ) : letters.length >= 30 ? (
                    '信箱已满'
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      订阅 {currentCharacter?.name} 的来信
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* 过期提醒弹窗 */}
        {showExpiryWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-amber-500" />
              </div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">
                信件即将消失
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                你有一封信只剩1天就要消失了，要不要先看看并收藏起来？
              </p>
              <div className="bg-amber-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-amber-800 truncate">
                  {showExpiryWarning.content}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExpiryWarning(null)}
                  className="flex-1 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  稍后再说
                </button>
                <button
                  onClick={() => {
                    handleOpenLetter(showExpiryWarning);
                    setShowExpiryWarning(null);
                  }}
                  className="flex-1 py-2 text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
                >
                  查看信件
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
