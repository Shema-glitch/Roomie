import React, { useState, useRef, useEffect } from 'react';
import { ActionCard } from '../../components/common/ActionCard';
import { IconTile } from '../../components/common/IconTile';
import { Button } from '../../components/common/Button';
import { SectionTitle } from '../../components/common/SectionTitle';
import { Avatar } from '../../components/common/Avatar';
import { ChatMessage, User } from '../../types';
import { sound } from '../../services/sound';
import { Send, Sparkles, Receipt, ArrowRight, Heart } from 'lucide-react';
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
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    setSending(true);
    sound.playTap();
    try {
      await onSendMessage(inputText.trim());
      setInputText('');
    } catch {
      showToast('Could not send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleReaction = async (msgId: string, emoji: string) => {
    sound.playPop();
    setActiveReactionMsgId(null);
    try {
      await onAddReaction(msgId, emoji);
    } catch {
      showToast('Could not add reaction', 'error');
    }
  };

  const handleTouchStart = (msgId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      setActiveReactionMsgId(msgId);
      sound.playPop();
    }, 450);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const quickEmojis = ['❤️', '🎉', '👍', '😋', '🔥'];

  return (
    <div
      className="flex flex-col h-[calc(100vh-160px)] w-full max-w-5xl mx-auto pb-6 select-none md:bg-white md:p-6 md:rounded-3xl md:border-2 md:border-[#E6E8EE] md:shadow-sm"
      onClick={() => setActiveReactionMsgId(null)}
    >
      {/* Header Info */}
      <div className="py-2.5 px-1 flex items-center justify-between border-b border-[#E6E8EE] mb-2 shrink-0">
        <div>
          <h3 className="font-heading font-black text-xl text-[#1F2430]">
            Apartment 4B Chat
          </h3>
          <p className="text-sm font-semibold text-[#475569]">
            {roommates.length} roomies in this group
          </p>
        </div>
        <div className="flex -space-x-2">
          {roommates.map((r) => (
            <Avatar key={r.id} src={r.avatar} name={r.name} flag={r.flag} statusRing={true} isHome={r.isHome} size="xs" />
          ))}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-3.5 px-1 pr-1">
        {messages.map((msg) => {
          // 1. SYSTEM ACTIVITY MESSAGE (ActionCard with solid icon tile and tactile action)
          if (msg.type === 'activity' || !msg.senderId) {
            const isChore =
              msg.body.toLowerCase().includes('chore') ||
              msg.body.toLowerCase().includes('clean') ||
              msg.body.toLowerCase().includes('bathroom');
            const isExpense =
              msg.body.toLowerCase().includes('expense') ||
              msg.body.toLowerCase().includes('₺') ||
              msg.body.toLowerCase().includes('paid');

            const tint = isChore ? 'teal' : isExpense ? 'coral' : 'indigo';
            const icon = isChore ? (
              <Sparkles className="w-5 h-5" />
            ) : isExpense ? (
              <Receipt className="w-5 h-5" />
            ) : (
              <Sparkles className="w-5 h-5" />
            );

            return (
              <ActionCard
                key={msg.id}
                tint={tint}
                iconTile={<IconTile icon={icon} color={tint} size="sm" />}
                title={msg.body}
                subtitle={new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                actions={
                  msg.linkTarget ? (
                    <Button
                      variant={tint === 'teal' ? 'teal' : tint === 'coral' ? 'primary' : 'indigo'}
                      size="sm"
                      onClick={() => onNavigateAction(msg.linkTarget!)}
                      icon={<ArrowRight className="w-4 h-4" />}
                    >
                      {isChore ? 'View Chore' : isExpense ? 'View Expense' : 'Open'}
                    </Button>
                  ) : undefined
                }
                className="max-w-md mx-auto"
              />
            );
          }

          // 2. USER TEXT MESSAGE
          const sender = roommates.find((r) => r.id === msg.senderId);
          const isMe = msg.senderId === currentUser.id;
          const isPickerOpen = activeReactionMsgId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2.5 relative ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              {!isMe && (
                <Avatar
                  src={sender?.avatar}
                  name={sender?.name || 'User'}
                  flag={sender?.flag}
                  isHome={sender?.isHome}
                  statusRing={true}
                  size="sm"
                />
              )}

              <div className={`max-w-[80%] space-y-1.5 ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && (
                  <span className="text-sm font-bold text-[#475569] ml-1">
                    {sender?.name.split(' ')[0]}
                  </span>
                )}

                {/* Message Bubble with Tap/Long-Press trigger */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    sound.playTap();
                    setActiveReactionMsgId(isPickerOpen ? null : msg.id);
                  }}
                  onTouchStart={() => handleTouchStart(msg.id)}
                  onTouchEnd={handleTouchEnd}
                  title="Tap or long-press to react with emoji"
                  className={`p-3.5 rounded-[22px] text-base font-semibold leading-relaxed shadow-sm relative cursor-pointer transition-all select-text ${
                    isMe
                      ? 'bg-[#FF6B4A] text-white rounded-br-xs shadow-[#FF6B4A]/25'
                      : 'bg-white text-[#1F2430] border-2 border-[#E6E8EE] rounded-bl-xs'
                  }`}
                >
                  <p className="type-body leading-relaxed">{msg.body}</p>
                  <span
                    className={`text-[14px] block text-right mt-1.5 font-normal ${
                      isMe ? 'text-orange-100' : 'text-[#64748B]'
                    }`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Floating Emoji Picker: ONLY visible on tap or long-press */}
                {isPickerOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={`flex items-center gap-2 p-2 bg-white border-2 border-[#E6E8EE] shadow-lg rounded-2xl z-20 animate-in fade-in zoom-in-95 duration-150 ${
                      isMe ? 'ml-auto' : 'mr-auto'
                    }`}
                  >
                    <span className="text-sm font-black text-[#475569] pl-1">React:</span>
                    {quickEmojis.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => handleReaction(msg.id, e)}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center text-xl hover:scale-125 transition-transform cursor-pointer rounded-xl hover:bg-[#F7F8FB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A]/70"
                        aria-label={`React with ${e}`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}

                {/* Existing Emoji reactions badges */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    {msg.reactions.map((rx) => (
                      <button
                        key={rx.emoji}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReaction(msg.id, rx.emoji);
                        }}
                        className={`min-h-[32px] px-2.5 py-1 rounded-full text-sm font-black border-2 flex items-center gap-1 transition-all cursor-pointer ${
                          rx.userIds.includes(currentUser.id)
                            ? 'border-[#FF6B4A] bg-[#FFF0ED] text-[#FF6B4A]'
                            : 'border-[#E6E8EE] bg-white text-[#475569]'
                        }`}
                        title={`${rx.userIds.length} reaction${rx.userIds.length > 1 ? 's' : ''}`}
                      >
                        <span>{rx.emoji}</span>
                        <span>{rx.userIds.length}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form onSubmit={handleSend} className="pt-2 flex items-center gap-2.5 shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Message roomies..."
          className="flex-1 min-h-[48px] px-4 py-2.5 rounded-2xl border-2 border-[#E6E8EE] bg-white text-base text-[#1F2430] placeholder:text-[#475569] focus:outline-none focus:border-[#FF6B4A] focus:ring-2 focus:ring-[#FF6B4A]/40 shadow-xs"
        />
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={!inputText.trim() || sending}
          className="shrink-0 min-h-[48px] min-w-[48px] px-4"
          aria-label="Send message"
          icon={<Send className="w-5 h-5" />}
        >
          Send
        </Button>
      </form>
    </div>
  );
};
