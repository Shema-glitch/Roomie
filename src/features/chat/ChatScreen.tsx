import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Avatar } from '../../components/common/Avatar';
import { EmptyState } from '../../components/common/EmptyState';
import { ChatMessage, User, DraftRound } from '../../types';
import { sound } from '../../services/sound';
import { Icon } from '@iconify/react';
import { PaperPlaneRight, CheckCircle, ArrowsClockwise } from '@phosphor-icons/react';
import { useToast } from '../../components/common/Toast';
import { getChoreDraftState } from '../../utils/stateTable';
import { buildChatTimeline } from './chatActivity';
import { useI18n } from '../../i18n/I18nProvider';
import { localizeChoreDraftState } from '../../i18n/helpers';

const QUICK_REACTIONS = [
  { emoji: 'heart', icon: 'fluent-emoji-flat:red-heart', label: 'Love' },
  { emoji: 'party', icon: 'fluent-emoji-flat:party-popper', label: 'Celebrate' },
  { emoji: 'thumbsup', icon: 'fluent-emoji-flat:thumbs-up', label: 'Thumbs Up' },
  { emoji: 'fire', icon: 'fluent-emoji-flat:fire', label: 'Fire' },
  { emoji: 'star', icon: 'fluent-emoji-flat:glowing-star', label: 'Star' },
];

const REACTION_ICON_MAP: Record<string, string> = {
  heart: 'fluent-emoji-flat:red-heart',
  '❤️': 'fluent-emoji-flat:red-heart',
  party: 'fluent-emoji-flat:party-popper',
  '🎉': 'fluent-emoji-flat:party-popper',
  thumbsup: 'fluent-emoji-flat:thumbs-up',
  '👍': 'fluent-emoji-flat:thumbs-up',
  fire: 'fluent-emoji-flat:fire',
  '🔥': 'fluent-emoji-flat:fire',
  star: 'fluent-emoji-flat:glowing-star',
  '🌟': 'fluent-emoji-flat:glowing-star',
  '😋': 'fluent-emoji-flat:trophy',
};

interface ChatScreenProps {
  messages: ChatMessage[];
  roommates: User[];
  currentUser: User;
  draftRound?: DraftRound | null;
  householdName?: string;
  onSendMessage: (text: string) => Promise<ChatMessage>;
  onAddReaction: (messageId: string, emoji: string) => Promise<void>;
  onNavigateAction: (target: { screen: string; id?: string }) => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  messages,
  roommates,
  currentUser,
  draftRound,
  householdName,
  onSendMessage,
  onAddReaction,
  onNavigateAction,
}) => {
  const { showToast } = useToast();
  const { t } = useI18n();
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const draftState = localizeChoreDraftState(
    getChoreDraftState(draftRound, currentUser.id),
    t
  );
  const timeline = useMemo(() => buildChatTimeline(messages), [messages]);
  const hasDraftText = inputText.trim().length > 0;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [timeline.length]);

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

  const pinnedSubtitle =
    draftState.state === 'draft_open'
      ? t('draft.chatBannerSubtitle')
      : draftState.bannerSubtitle;

  return (
    <div
      className="flex flex-col h-full w-full max-w-5xl mx-auto pb-1 select-none md:bg-white md:p-6 md:rounded-3xl md:border-2 md:border-[#E6E8EE] md:shadow-sm"
      onClick={() => setActiveReactionMsgId(null)}
    >
      {/* Header Info */}
      <div className="py-2.5 px-1 flex items-center justify-between border-b border-[#E6E8EE] mb-2 shrink-0">
        <div>
          <h3 className="font-heading font-black text-xl text-[#1F2430]">
            {householdName || t('chat.title')}
          </h3>
          <p className="text-sm font-semibold text-[#475569]">
            {t('chat.activeRoomies', { count: roommates.length })}
          </p>
        </div>
        <div className="flex -space-x-2">
          {roommates.map((r) => (
            <Avatar
              key={r.id}
              src={r.avatar}
              name={r.name}
              flag={r.flag}
              statusRing={true}
              isHome={r.isHome}
              size="xs"
            />
          ))}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 px-1 pe-3 sm:pe-5">
        {/* Pinned Chore Picks State Pill */}
        {draftState.state !== 'reveal_done' && (
          <div className="px-3.5 py-2.5 rounded-2xl bg-[#EEF0FD] border border-[#DDD6FE] flex items-center justify-between gap-2.5 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {draftState.state === 'reveal_ready' ? (
                <CheckCircle weight="duotone" className="w-4 h-4 text-[#5B5BD6] shrink-0" />
              ) : (
                <ArrowsClockwise weight="duotone" className="w-4 h-4 text-[#5B5BD6] shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-[#1F2430] truncate">
                  {draftState.bannerTitle}
                </p>
                <p className="text-[12px] text-[#475569] truncate">{pinnedSubtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                onNavigateAction({
                  screen: draftState.state === 'reveal_ready' ? 'chore-reveal' : 'chore-draft',
                });
              }}
              className="shrink-0 whitespace-nowrap px-2.5 py-1.5 rounded-xl bg-[#5B5BD6] text-white text-[12px] font-bold hover:bg-[#4747B8] transition-colors cursor-pointer"
            >
              {draftState.actionLabel}
            </button>
          </div>
        )}

        {timeline.length === 0 ? (
          <div className="h-full flex items-center justify-center p-6 text-center">
            <EmptyState
              title={t('chat.emptyTitle')}
              description={t('chat.emptySubtitle')}
              mascotState="idle"
              bubbleText={t('chat.title')}
              className="border-none shadow-none bg-transparent"
            />
          </div>
        ) : (
          timeline.map((entry) => {
            const { msg, displayBody } = entry;

            // 1. WHISPER SYSTEM PILL (Centered WhatsApp-style micro-pill)
            if (entry.kind === 'activity') {
              return (
                <div key={msg.id} className="contain-content">
                  <div className="mx-auto my-1.5 max-w-[82%] w-fit rounded-full bg-[#EEF1F6] px-3 py-1 text-center text-[11px] font-medium text-[#64748B]">
                    {displayBody}
                  </div>
                </div>
              );
            }

            // 2. NATIVE USER CHAT BUBBLE
            const sender = roommates.find((r) => r.id === msg.senderId);
            const isMe = msg.senderId === currentUser.id;
            const isPickerOpen = activeReactionMsgId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 relative contain-content ${
                  isMe ? 'justify-end' : 'justify-start'
                }`}
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

                <div
                  className={`max-w-[78%] flex flex-col space-y-1 ${
                    isMe ? 'items-end' : 'items-start'
                  }`}
                >
                  {!isMe && (
                    <span className="text-xs font-bold text-[#475569] ms-1">
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
                    title={t('chat.tapToReact')}
                    className={`px-3.5 py-2 rounded-2xl text-[15px] leading-snug shadow-xs relative cursor-pointer transition-all select-text ${
                      isMe
                        ? 'bg-[#FF6B4A] text-white rounded-ee-sm shadow-[#FF6B4A]/20'
                        : 'bg-white text-[#1F2430] border border-[#E6E8EE] rounded-es-sm'
                    }`}
                  >
                    <p className="font-medium break-words">{displayBody}</p>
                    <span
                      className={`text-[10px] block text-end mt-1 leading-none font-medium ${
                        isMe ? 'text-white/80' : 'text-[#64748B]'
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
                        isMe ? 'ms-auto' : 'me-auto'
                      }`}
                    >
                      <span className="text-sm font-black text-[#475569] ps-1">
                        {t('chat.reactPrefix')}
                      </span>
                      {QUICK_REACTIONS.map((r) => (
                        <button
                          key={r.emoji}
                          type="button"
                          onClick={() => handleReaction(msg.id, r.emoji)}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center hover:scale-125 transition-transform cursor-pointer rounded-xl hover:bg-[#F7F8FB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A]/70"
                          aria-label={`React with ${r.label}`}
                        >
                          <Icon icon={r.icon} className="w-5 h-5" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Existing Emoji reaction badges */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      {msg.reactions.map((rx) => (
                        <button
                          key={rx.emoji}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReaction(msg.id, rx.emoji);
                          }}
                          className={`min-h-[30px] px-2.5 py-0.5 rounded-full text-xs font-black border-2 flex items-center gap-1 transition-all cursor-pointer ${
                            rx.userIds.includes(currentUser.id)
                              ? 'border-[#FF6B4A] bg-[#FFF0ED] text-[#FF6B4A]'
                              : 'border-[#E6E8EE] bg-white text-[#475569]'
                          }`}
                          title={`${rx.userIds.length} reaction${
                            rx.userIds.length > 1 ? 's' : ''
                          }`}
                        >
                          {REACTION_ICON_MAP[rx.emoji] ? (
                            <Icon icon={REACTION_ICON_MAP[rx.emoji]} className="w-4 h-4 shrink-0" />
                          ) : (
                            <span className="text-xs font-bold">{rx.emoji}</span>
                          )}
                          <span>{rx.userIds.length}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer Bar */}
      <form onSubmit={handleSend} className="pt-2.5 flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t('chat.placeholder')}
          className="flex-1 min-w-0 h-11 px-4 rounded-2xl border-2 border-[#E6E8EE] bg-white text-[15px] text-[#1F2430] placeholder:text-[#64748B] focus:outline-none focus:border-[#FF6B4A] focus:ring-2 focus:ring-[#FF6B4A]/30 shadow-xs"
        />
        <button
          type="submit"
          disabled={!hasDraftText || sending}
          aria-label={t('chat.sendAria')}
          className={`w-11 h-11 shrink-0 aspect-square rounded-full p-0 flex items-center justify-center transition-all active:scale-95 shadow-xs ${
            hasDraftText && !sending
              ? 'bg-[#FF6B4A] hover:bg-[#E55A3A] text-white cursor-pointer'
              : 'bg-[#E6E8EE] text-[#94A3B8] cursor-not-allowed'
          }`}
        >
          <PaperPlaneRight weight="fill" className="w-5 h-5 rtl-flip" />
        </button>
      </form>
    </div>
  );
};
