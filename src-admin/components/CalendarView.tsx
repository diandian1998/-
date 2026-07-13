import { useState, useMemo } from 'react';
import { Message } from '../types';
import { ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';

interface CalendarViewProps {
  messages: Message[];
  onSelectDate?: (date: string) => void;
}

export default function CalendarView({ messages, onSelectDate }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 获取当前月份的日期
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (number | null)[] = [];

    // 添加空白
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    // 添加日期
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  // 获取有消息的日期
  const getDatesWithMessages = useMemo(() => {
    const dates = new Set<string>();
    messages.forEach(msg => {
      const date = new Date(msg.createdAt).toLocaleDateString('zh-CN');
      dates.add(date);
    });
    return dates;
  }, [messages]);

  // 获取某天的消息
  const getMessagesForDate = (day: number) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dateStr = new Date(year, month, day).toLocaleDateString('zh-CN');
    return messages.filter(msg =>
      new Date(msg.createdAt).toLocaleDateString('zh-CN') === dateStr
    );
  };

  const days = getDaysInMonth(currentDate);
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDayClick = (day: number | null) => {
    if (day === null) return;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dateStr = new Date(year, month, day).toLocaleDateString('zh-CN');
    const hasMessages = getDatesWithMessages.has(dateStr);

    if (hasMessages) {
      setSelectedDate(dateStr);
    }
  };

  const selectedMessages = selectedDate
    ? messages.filter(msg =>
        new Date(msg.createdAt).toLocaleDateString('zh-CN') === selectedDate
      )
    : [];

  return (
    <div className="space-y-4">
      {/* 日历头部 */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h4 className="text-lg font-semibold text-gray-800">
          {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
        </h4>
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekDays.map((day, index) => (
          <div
            key={index}
            className="text-xs font-medium text-gray-500 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (day === null) {
            return <div key={index} className="h-10" />;
          }

          const year = currentDate.getFullYear();
          const month = currentDate.getMonth();
          const dateStr = new Date(year, month, day).toLocaleDateString('zh-CN');
          const hasMessages = getDatesWithMessages.has(dateStr);
          const isSelected = selectedDate === dateStr;
          const isToday = new Date().toLocaleDateString('zh-CN') === dateStr;

          return (
            <button
              key={index}
              onClick={() => handleDayClick(day)}
              disabled={!hasMessages}
              className={`
                h-10 rounded-lg text-sm font-medium transition-all
                ${hasMessages
                  ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 cursor-pointer'
                  : 'text-gray-300 cursor-not-allowed'
                }
                ${isSelected ? 'ring-2 ring-indigo-500 bg-indigo-500 text-white' : ''}
                ${isToday && !isSelected ? 'ring-2 ring-blue-400' : ''}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* 选中日期的消息列表 */}
      {selectedDate && (
        <div className="mt-6 border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-medium text-gray-700">
              {selectedDate} 的对话
            </h5>
            <span className="text-xs text-gray-400">
              {selectedMessages.length} 条消息
            </span>
          </div>

          {selectedMessages.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {selectedMessages.map((msg, index) => (
                <div
                  key={msg.id || index}
                  className={`
                    p-3 rounded-lg text-sm
                    ${msg.role === 'user'
                      ? 'bg-blue-50 text-blue-800 ml-4'
                      : 'bg-gray-50 text-gray-800 mr-4'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-xs">
                      {msg.role === 'user' ? '我' : 'AI'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(msg.createdAt).toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 text-sm py-4">
              暂无消息
            </p>
          )}
        </div>
      )}

      {/* 提示 */}
      <div className="text-center text-xs text-gray-400 pt-2">
        点击有消息的日期查看对话记录
      </div>
    </div>
  );
}
