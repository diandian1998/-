import { useState, useRef, useEffect } from 'react';

// 用户聊天页面组件
export default function UserChat() {
  const [messages, setMessages] = useState<Array<{role: string; content: string}>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // 这里添加你的 AI API 调用逻辑
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] })
      });

      // 模拟响应
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '这是一个简单的聊天界面示例。请配置您的 AI API。'
        }]);
      }, 1000);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '抱歉，发生了错误。请稍后重试。'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px'
    }}>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        marginBottom: '20px',
        padding: '10px',
        borderRadius: '8px',
        backgroundColor: '#f5f5f5'
      }}>
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              marginBottom: '10px',
              textAlign: msg.role === 'user' ? 'right' : 'left'
            }}
          >
            <span style={{
              display: 'inline-block',
              padding: '10px 15px',
              borderRadius: '15px',
              backgroundColor: msg.role === 'user' ? '#007AFF' : '#E5E5EA',
              color: msg.role === 'user' ? 'white' : 'black',
              maxWidth: '70%'
            }}>
              {msg.content}
            </span>
          </div>
        ))}
        {isLoading && (
          <div style={{ textAlign: 'center', color: '#666' }}>
            正在思考...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入消息..."
          style={{
            flex: 1,
            padding: '15px',
            borderRadius: '25px',
            border: '1px solid #ddd',
            fontSize: '16px'
          }}
        />
        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: '15px 25px',
            borderRadius: '25px',
            border: 'none',
            backgroundColor: '#007AFF',
            color: 'white',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          发送
        </button>
      </form>
    </div>
  );
}
