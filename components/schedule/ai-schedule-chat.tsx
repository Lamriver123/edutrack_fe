"use client";

import {
  History,
  LoaderCircle,
  MessageSquarePlus,
  Mic,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import { schoolApi } from "@/lib/api/school";
import type {
  AiChatMessage,
  AiSessionListItem,
} from "@/types/school";
import styles from "./ai-schedule-chat.module.css";

type ChatState =
  | { phase: "init" }
  | { phase: "loading" }
  | { phase: "ready"; sessionId: string; greeting: string }
  | { phase: "error"; message: string };

let fabPosition = { x: 0, y: 0 };

export function AiScheduleChatButton({
  onClick,
}: {
  onClick: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const startTranslate = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const hasDragged = useRef(false);

  useEffect(() => {
    if (buttonRef.current) {
      buttonRef.current.style.transform = `translate(${fabPosition.x}px, ${fabPosition.y}px)`;
    }
  }, []);

  const handlePointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    isDragging.current = true;
    hasDragged.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };
    startTranslate.current = { ...fabPosition };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!isDragging.current || !buttonRef.current) return;
    
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasDragged.current = true;
    }
    
    if (hasDragged.current) {
      e.preventDefault();
      let newX = startTranslate.current.x + dx;
      let newY = startTranslate.current.y + dy;
      
      const minX = -window.innerWidth + 90;
      const maxX = 0;
      const minY = -window.innerHeight + 90;
      const maxY = 0;
      
      newX = Math.max(minX, Math.min(newX, maxX));
      newY = Math.max(minY, Math.min(newY, maxY));
      
      fabPosition = { x: newX, y: newY };
      
      buttonRef.current.style.transition = 'none';
      buttonRef.current.style.transform = `translate(${fabPosition.x}px, ${fabPosition.y}px)`;
    }
  };

  const handlePointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    isDragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (buttonRef.current) {
      buttonRef.current.style.transition = 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (hasDragged.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick();
  };

  return (
    <button
      className={styles.fab}
      onClick={handleClick}
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      ref={buttonRef}
      type="button"
    >
      <Sparkles size={24} />
    </button>
  );
}

export function AiScheduleChat({ onClose }: { onClose: () => void }) {
  const [chatState, setChatState] = useState<ChatState>({ phase: "init" });
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [chatTransform, setChatTransform] = useState({ x: 0, y: 0 });
  const [sessions, setSessions] = useState<AiSessionListItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Tùy chỉnh vị trí để không bị lẹm ra ngoài màn hình
    const chatWidth = 460;
    const chatHeight = 680;
    const rightOffset = 30;
    const bottomOffset = 90;
    
    const maxChatWidth = Math.min(chatWidth, window.innerWidth - 40);
    const origLeft = window.innerWidth - rightOffset - maxChatWidth;
    const minChatX = 20 - origLeft; 
    
    const maxChatHeight = Math.min(chatHeight, window.innerHeight - 120);
    const origTop = window.innerHeight - bottomOffset - maxChatHeight;
    const minChatY = 20 - origTop;

    const chatX = Math.max(minChatX, fabPosition.x);
    const chatY = Math.max(minChatY, fabPosition.y);
    
    setChatTransform({ x: chatX, y: chatY });

    // Load TTS Voices
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  const startNewSession = useCallback(async () => {
    setChatState({ phase: "loading" });
    setMessages([]);

    try {
      const result = await schoolApi.createAiScheduleSession();

      setChatState({
        phase: "ready",
        sessionId: result.sessionId,
        greeting: result.greeting,
      });

      setMessages([
        {
          role: "ai",
          text: result.greeting,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Không thể tạo phiên trò chuyện.";

      setChatState({ phase: "error", message: errorMessage });
    }
  }, []);

  const loadSession = useCallback(
    async (sessionId: string) => {
      setChatState({ phase: "loading" });
      setMessages([]);

      try {
        const detail = await schoolApi.getAiScheduleSession(sessionId);

        setChatState({
          phase: "ready",
          sessionId: detail.sessionId,
          greeting: "",
        });

        setMessages(detail.messages);
        setShowHistory(false);

        setTimeout(scrollToBottom, 100);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Không thể tải phiên trò chuyện.";

        setChatState({ phase: "error", message: errorMessage });
      }
    },
    [scrollToBottom],
  );

  useEffect(() => {
    void startNewSession();
  }, [startNewSession]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function loadHistory() {
    setShowHistory((prev) => !prev);

    if (sessions.length > 0) {
      return;
    }

    setIsLoadingHistory(true);
    try {
      const list = await schoolApi.listAiScheduleSessions();
      setSessions(list);
    } catch {
      // Ignore
    } finally {
      setIsLoadingHistory(false);
    }
  }

  const triggerSend = async (textToSend: string, isVoiceInput = false) => {
    if (chatState.phase !== "ready" || !textToSend.trim() || isSending) {
      return;
    }

    const userMessage = textToSend.trim();

    setInputValue("");
    setIsSending(true);
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text: userMessage,
        timestamp: new Date().toISOString(),
      },
    ]);

    try {
      const result = await schoolApi.sendAiScheduleMessage(
        chatState.sessionId,
        userMessage,
      );

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: result.reply,
          timestamp: new Date().toISOString(),
        },
      ]);
      
      if (isVoiceInput) {
        speakReply(result.reply);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "Xin lỗi, đã có lỗi xảy ra khi gửi tin nhắn.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSending(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  const speakReply = (text: string) => {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    
    const cleanText = text.replace(/[*#]/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "vi-VN";
    
    const voices = window.speechSynthesis.getVoices();
    let viVoice = voices.find(v => v.lang.includes("vi") && (v.name.includes("Hoài My") || v.name.includes("Google")));
    
    if (!viVoice) {
      viVoice = voices.find(v => v.lang.includes("vi"));
    }
    
    if (viVoice) {
      utterance.voice = viVoice;
    }
    
    utterance.rate = 1.05;
    utterance.pitch = 1.1;

    window.speechSynthesis.speak(utterance);
  };

  const initSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Trình duyệt của bạn không hỗ trợ tính năng nhận diện giọng nói. Vui lòng dùng Chrome hoặc Edge.");
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'vi-VN';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => setIsListening(true);
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setInputValue(finalTranscript);
          setTimeout(() => void triggerSend(finalTranscript, true), 200);
        } else {
          setInputValue(interimTranscript);
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error("Speech error", event.error);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      initSpeechRecognition();
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setInputValue("");
      recognitionRef.current?.start();
    }
  };

  async function handleSend() {
    await triggerSend(inputValue, false);
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  function handleTextareaInput() {
    const el = textareaRef.current;

    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }
  }

  const currentSessionId =
    chatState.phase === "ready" ? chatState.sessionId : null;

  return (
    <aside 
      className={styles.chatWindow}
      style={{
        '--drag-x': `${chatTransform.x}px`,
        '--drag-y': `${chatTransform.y}px`,
      } as React.CSSProperties}
    >
      <header className={styles.header}>
        <div className={styles.headerLeft}>
            <span className={styles.headerIcon}>
              <Sparkles size={20} />
            </span>
            <div className={styles.headerInfo}>
              <h3 className={styles.headerTitle}>Trợ lý AI Lịch học</h3>
              <p className={styles.headerSubtitle}>
                Gợi ý sắp xếp thời khóa biểu
              </p>
            </div>
          </div>

          <div className={styles.headerActions}>
            <div className={styles.historyBtnWrapper}>
              <button
                aria-label="Lịch sử"
                className={styles.iconBtn}
                onClick={() => void loadHistory()}
                title="Lịch sử phiên"
                type="button"
              >
                <History size={16} />
              </button>

              {showHistory ? (
                <div className={styles.historyDropdown}>
                  {isLoadingHistory ? (
                    <div className={styles.historyEmpty}>Đang tải...</div>
                  ) : sessions.length === 0 ? (
                    <div className={styles.historyEmpty}>
                      Chưa có phiên trò chuyện nào
                    </div>
                  ) : (
                    sessions.map((session) => (
                      <button
                        className={`${styles.historyItem} ${
                          session.sessionId === currentSessionId
                            ? styles.historyItemActive
                            : ""
                        }`}
                        key={session.sessionId}
                        onClick={() => void loadSession(session.sessionId)}
                        type="button"
                      >
                        <span className={styles.historyPreview}>
                          {session.preview || "Phiên trò chuyện"}
                        </span>
                        <span className={styles.historyMeta}>
                          {session.messageCount} tin
                        </span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>

            <button
              aria-label="Phiên mới"
              className={styles.iconBtn}
              onClick={() => void startNewSession()}
              title="Tạo phiên mới"
              type="button"
            >
              <MessageSquarePlus size={16} />
            </button>
            <button
              aria-label="Đóng"
              className={`${styles.iconBtn} ${styles.closeBtn}`}
              onClick={onClose}
              type="button"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {chatState.phase === "loading" ? (
          <div className={styles.loadingInit}>
            <div className={styles.loadingSpinner} />
            <span className={styles.loadingText}>
              Đang phân tích lịch dạy của bạn...
            </span>
          </div>
        ) : chatState.phase === "error" ? (
          <div className={styles.errorState}>
            <p className={styles.errorMessage}>{chatState.message}</p>
            <button
              className={styles.retryBtn}
              onClick={() => void startNewSession()}
              type="button"
            >
              Thử lại
            </button>
          </div>
        ) : chatState.phase === "ready" ? (
          <>
            <div className={styles.messagesArea}>
              {messages.map((msg, index) => (
                <div
                  className={`${styles.bubble} ${
                    msg.role === "user" ? styles.userBubble : styles.aiBubble
                  }`}
                  key={`${msg.role}-${index}`}
                >
                  {msg.role === "ai" ? (
                    <div className={styles.aiBubbleLabel}>
                      <Sparkles size={12} />
                      EduTrack AI
                    </div>
                  ) : null}
                  {msg.text}
                </div>
              ))}

              {isSending ? (
                <div className={styles.typingIndicator}>
                  <div className={styles.typingDots}>
                    <span className={styles.typingDot} />
                    <span className={styles.typingDot} />
                    <span className={styles.typingDot} />
                  </div>
                  <span className={styles.typingLabel}>AI đang suy nghĩ...</span>
                </div>
              ) : null}

              <div ref={messagesEndRef} />
            </div>

            <div className={styles.inputArea}>
              <div className={styles.inputRow}>
                <div className={styles.inputWrapper}>
                  <textarea
                    className={styles.textInput}
                    disabled={isSending}
                    onChange={(e) => setInputValue(e.target.value)}
                    onInput={handleTextareaInput}
                    onKeyDown={handleKeyDown}
                    placeholder={isListening ? "Đang lắng nghe..." : "Mô tả yêu cầu sắp xếp lịch..."}
                    ref={textareaRef}
                    rows={1}
                    value={inputValue}
                  />
                </div>
                <button
                  aria-label="Nhập giọng nói"
                  className={`${styles.iconBtn} ${styles.micBtn} ${isListening ? styles.listening : ""}`}
                  onClick={toggleListening}
                  title="Nhập bằng giọng nói"
                  type="button"
                >
                  <Mic size={20} />
                </button>
                <button
                  aria-label="Gửi tin nhắn"
                  className={styles.sendBtn}
                  disabled={isSending || (!inputValue.trim() && !isListening)}
                  onClick={() => void handleSend()}
                  title="Gửi"
                  type="button"
                >
                  {isSending ? <LoaderCircle className={styles.spinIcon} size={18} /> : <Send size={18} />}
                </button>
              </div>
              <p className={styles.inputHint}>
                Enter để gửi · Shift+Enter để xuống dòng
              </p>
            </div>
          </>
        ) : null}
      </aside>
  );
}
