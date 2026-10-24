import React, { useState, useRef, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { ChatMessage, User } from '../../types';
import { THEME } from '../../theme/tokens';
import { sound } from '../../services/sound';
import { Send, Smile, Sparkles, Receipt, ArrowRight, Shield } from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface ChatScreenProps {
  messages: ChatMessage[];
  roommates: User[];
  currentUser: User;
  onSendMessage: (text: string) => Promise<ChatMessage>;
  onAddReaction: (messageId: string, emoji: string) => Promise<void>;
  onNavigateAction: (target: { screen: string; id?: string }) => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  messages,
  roommates,
  currentUser,
  onSendMessage,
  onAddReaction,
  onNavigateAction,
}) => {
  const { showToast } = useToast();
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const text = inputText.trim();
    setInputText('');
    setSending(true);
    try {
      sound.playPop();
      await onSendMessage(text);
    } catch {
      showToast('Could not send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleReaction = async (msgId: string, emoji: string) => {
    sound.playTap();
    await onAddReaction(msgId, emoji);
  };

  const quickEmojis = ['❤️', '🎉', '👍', '😋', '🔥'];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] pb-16 select-none">
      {/* Header Info */}
      <div className="py-2 px-1 flex items-center justify-between border-b border-[#E6E8EE] mb-2 shrink-0">
        <div>
          <h3 className="font-heading font-black text-lg text-[#1F2430]">
            Apartment 4B Chat
          </h3>
          <p className="text-xs text-[#6B7280]">
            {roommates.length} flatmates in this group
          </p>
        </div>
        <div className="flex -space-x-2">
          {roommates.map((r) => (
            <Avatar key={r.id} src={r.avatar} name={r.name} flag={r.flag} size="xs" />
          ))}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-3 px-1 pr-1">
        {messages.map((msg) => {
          // 1. SYSTEM ACTIVITY MESSAGE
          if (msg.type === 'activity' || !msg.senderId) {
            return (
              <div
                key={msg.id}
                onClick={() => msg.linkTarget && onNavigateAction(msg.linkTarget)}
                className={`mx-auto max-w-sm p-3 rounded-2xl bg-white border border-[#E6E8EE] shadow-xs flex items-center gap-2.5 transition-all ${
                  msg.linkTarget ? 'cursor-pointer hover:border-[#FF6B4A]' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-[#FFF0ED] text-[#FF6B4A] flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#1F2430] leading-snug">
                    {msg.body}
                  </p>
                  <p className="text-[10px] text-[#6B7280] mt-0.5">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {msg.linkTarget && (
                  <ArrowRight className="w-4 h-4 text-[#FF6B4A] shrink-0" />
                )}
              </div>
            );
          }

          // 2. USER TEXT MESSAGE
          const sender = roommates.find((r) => r.id === msg.senderId);
          const isMe = msg.senderId === currentUser.id;

          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              {!isMe && (
                <Avatar
                  src={sender?.avatar}
                  name={sender?.name || 'User'}
                  flag={sender?.flag}
                  size="xs"
                />
              )}

              <div className={`max-w-[78%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && (
                  <span className="text-[10px] font-bold text-[#6B7280] ml-1">
                    {sender?.name.split(' ')[0]}
                  </span>
                )}

                <div
                  className={`p-3 rounded-2xl text-xs font-semibold leading-relaxed shadow-xs relative group ${
                    isMe
                      ? 'bg-[#FF6B4A] text-white rounded-br-xs'
                      : 'bg-white text-[#1F2430] border border-[#E6E8EE] rounded-bl-xs'
                  }`}
                >
                  <p>{msg.body}</p>
                  <span
                    className={`text-[9px] block text-right mt-1 ${
                      isMe ? 'text-white/75' : 'text-[#9CA3AF]'
                    }`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Emoji reactions */}
                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                  {msg.reactions?.map((rx) => (
                    <button
                      key={rx.emoji}
                      onClick={() => handleReaction(msg.id, rx.emoji)}
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-0.5 transition-all cursor-pointer ${
                        rx.userIds.includes(currentUser.id)
                          ? 'border-[#FF6B4A] bg-[#FFF0ED] text-[#FF6B4A]'
                          : 'border-[#E6E8EE] bg-white text-[#6B7280]'
                      }`}
                    >
                      <span>{rx.emoji}</span>
                      <span>{rx.userIds.length}</span>
                    </button>
                  ))}

                  {/* Reaction trigger */}
                  <div className="flex gap-0.5 opacity-60 hover:opacity-100 transition-opacity">
                    {quickEmojis.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => handleReaction(msg.id, e)}
                        className="text-xs hover:scale-125 transition-transform cursor-pointer"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form onSubmit={handleSend} className="pt-2 flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Message flatmates..."
          className="flex-1 px-4 py-2.5 rounded-full border border-[#E6E8EE] bg-white text-xs focus:outline-none focus:border-[#FF6B4A] shadow-xs"
        />
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!inputText.trim() || sending}
          className="rounded-full w-10 h-10 p-0 flex items-center justify-center shrink-0"
        >
          <Send className="w-4 h-4 ml-0.5" />
        </Button>
      </form>
    </div>
  );
};
