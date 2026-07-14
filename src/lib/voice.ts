// 语音识别服务（STT - 语音转文字）
export class SpeechRecognitionService {
  private recognition: any;
  private isListening: boolean = false;

  constructor() {
    // 检测浏览器支持
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'zh-CN';
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
    }
  }

  // 检查是否支持语音识别
  isSupported(): boolean {
    return !!this.recognition;
  }

  // 开始语音识别
  start(onResult: (text: string) => void, onError?: (error: string) => void): void {
    if (!this.recognition) {
      onError?.('您的浏览器不支持语音识别功能');
      return;
    }

    if (this.isListening) {
      return;
    }

    this.isListening = true;

    this.recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        }
      }
      if (finalTranscript) {
        onResult(finalTranscript);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('语音识别错误:', event.error);
      onError?.(this.getErrorMessage(event.error));
      this.isListening = false;
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };

    try {
      this.recognition.start();
    } catch (error) {
      console.error('启动语音识别失败:', error);
      this.isListening = false;
    }
  }

  // 停止语音识别
  stop(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  // 获取错误消息
  private getErrorMessage(error: string): string {
    const messages: Record<string, string> = {
      'no-speech': '没有检测到语音，请重试',
      'audio-capture': '无法访问麦克风，请检查权限',
      'not-allowed': '麦克风权限被拒绝，请在设置中允许',
      'network': '网络错误，请检查网络连接',
      'aborted': '语音识别被中断',
    };
    return messages[error] || '语音识别出错，请重试';
  }
}

// 语音合成服务（TTS - 文字转语音）
export class TextToSpeechService {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;

      // 加载语音列表（异步处理）
      setTimeout(() => {
        this.loadVoices();
      }, 100);

      // Chrome需要监听事件
      if (this.synth && speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => {
          this.loadVoices();
        };
      }
    }
  }

  // 加载可用语音
  private loadVoices(): void {
    if (this.synth) {
      this.voices = this.synth.getVoices() || [];
    }
  }

  // 检查是否支持
  isSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  // 获取中文语音
  private getChineseVoice(): SpeechSynthesisVoice | null {
    // 优先选择中文语音
    const chineseVoice = this.voices.find(voice =>
      voice.lang.includes('zh') || voice.lang.includes('CN')
    );
    return chineseVoice || this.voices[0] || null;
  }

  // 文字转语音
  speak(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported() || !this.synth) {
        reject(new Error('您的浏览器不支持语音合成功能'));
        return;
      }

      // 停止之前的语音
      this.synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;

      // 设置语音
      const voice = this.getChineseVoice();
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(new Error('语音播放出错'));

      this.synth.speak(utterance);
    });
  }

  // 停止语音
  stop(): void {
    if (this.synth) {
      this.synth.cancel();
    }
  }
}
