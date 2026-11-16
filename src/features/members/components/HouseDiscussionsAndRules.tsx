import React, { useState } from 'react';
import { ActionCard } from '../../../components/common/ActionCard';
import { InfoCard } from '../../../components/common/InfoCard';
import { IconTile } from '../../../components/common/IconTile';
import { Button } from '../../../components/common/Button';
import { Chip } from '../../../components/common/Chip';
import { User, MeetingTopic, HouseAgreement } from '../../../types';
import { sound } from '../../../services/sound';
import { useToast } from '../../../components/common/Toast';
import {
  PlusCircle,
  ChatCircleDots,
  ThumbsUp,
  ThumbsDown,
  PaperPlaneRight,
  FileText,
} from '@phosphor-icons/react';

interface HouseDiscussionsAndRulesProps {
  topics: MeetingTopic[];
  agreements: HouseAgreement[];
  roommates: User[];
  currentUser: User;
  onOpenProposeModal: () => void;
  onOpenAddAgreementModal: () => void;
  onVoteTopic: (topicId: string, vote: 'agree' | 'disagree' | 'neutral') => Promise<void>;
  onAddComment: (topicId: string, text: string) => Promise<void>;
}

export const HouseDiscussionsAndRules: React.FC<HouseDiscussionsAndRulesProps> = ({
  topics,
  agreements,
  roommates,
  currentUser,
  onOpenProposeModal,
  onOpenAddAgreementModal,
  onVoteTopic,
  onAddComment,
}) => {
  const { showToast } = useToast();
  const [subTab, setSubTab] = useState<'topics' | 'agreements'>('topics');
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [postingTopicId, setPostingTopicId] = useState<string | null>(null);

  const handleVote = async (topicId: string, vote: 'agree' | 'disagree' | 'neutral') => {
    sound.playTap();
    try {
      await onVoteTopic(topicId, vote);
      showToast('Vote registered!', 'info');
    } catch {
      showToast('Vote failed', 'error');
    }
  };

  const handleComment = async (topicId: string) => {
    const text = commentInputs[topicId]?.trim();
    if (!text || postingTopicId === topicId) return;
    setPostingTopicId(topicId);
    sound.playPop();
    try {
      await onAddComment(topicId, text);
      setCommentInputs((prev) => ({ ...prev, [topicId]: '' }));
      showToast('Comment posted to discussion!', 'success');
    } catch {
      showToast('Comment failed', 'error');
    } finally {
      setPostingTopicId(null);
    }
  };

  return (
    <InfoCard padding="md" className="bg-white border-2 border-[#E6E8EE] shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="type-section-heading">House discussions and rules</h3>
          <p className="type-secondary text-[14px]">Agreed standards and votes</p>
        </div>
        {subTab === 'topics' ? (
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenProposeModal}
            icon={<PlusCircle className="w-3.5 h-3.5" weight="fill" />}
          >
            Propose
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenAddAgreementModal}
            icon={<PlusCircle className="w-3.5 h-3.5" weight="fill" />}
          >
            Add rule
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#E6E8EE]/70">
        <button
          type="button"
          onClick={() => {
            sound.playTap();
            setSubTab('topics');
          }}
          className={`py-2 px-2 rounded-lg text-[13px] sm:text-[14px] font-heading font-black whitespace-nowrap transition-all duration-150 ease-out active:scale-[0.98] motion-reduce:transition-none cursor-pointer ${
            subTab === 'topics'
              ? 'bg-white text-[#1F2430] shadow-xs'
              : 'text-[#475569] hover:text-[#1F2430]'
          }`}
        >
          Discussions ({topics.length})
        </button>
        <button
          type="button"
          onClick={() => {
            sound.playTap();
            setSubTab('agreements');
          }}
          className={`py-2 px-2 rounded-lg text-[13px] sm:text-[14px] font-heading font-black whitespace-nowrap transition-all duration-150 ease-out active:scale-[0.98] motion-reduce:transition-none cursor-pointer ${
            subTab === 'agreements'
              ? 'bg-white text-[#1F2430] shadow-xs'
              : 'text-[#475569] hover:text-[#1F2430]'
          }`}
        >
          Rules ({agreements.length})
        </button>
      </div>

      {subTab === 'topics' && (
        <div className="space-y-3">
          {topics.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#F7F8FB] border border-[#E6E8EE] text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#EEF0FD] border border-[#D3D5F9] flex items-center justify-center text-[#5B5BD6]">
                <ChatCircleDots className="w-5 h-5" />
              </div>
              <div className="space-y-1 max-w-xs">
                <h4 className="type-card-title text-[#1F2430]">No active discussions</h4>
                <p className="type-secondary text-[14px]">
                  Everything is peaceful! Bring up quiet hours, guests, or shared purchases whenever needed.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenProposeModal}
                icon={<PlusCircle className="w-3.5 h-3.5 text-[#5B5BD6]" weight="fill" />}
              >
                Propose first topic
              </Button>
            </div>
          ) : (
            topics.map((topic) => {
              const proposer = roommates.find((r) => r.id === topic.proposedBy);
              const myVote = topic.votes.find((v) => v.userId === currentUser.id)?.vote;
              const agreeVotes = topic.votes.filter((v) => v.vote === 'agree').length;
              const disagreeVotes = topic.votes.filter((v) => v.vote === 'disagree').length;
              const isPosting = postingTopicId === topic.id;

              return (
                <ActionCard
                  key={topic.id}
                  tint={topic.status === 'agreed' ? 'green' : 'neutral'}
                  iconTile={
                    <IconTile
                      icon={<ChatCircleDots className="w-5 h-5" />}
                      color={topic.status === 'agreed' ? 'green' : 'indigo'}
                      size="sm"
                    />
                  }
                  title={topic.title}
                  subtitle={`Proposed by ${proposer?.name.split(' ')[0] || 'Roomie'}`}
                  detail={<p className="type-secondary text-[14px] leading-relaxed">{topic.description}</p>}
                  badge={
                    <Chip
                      status={topic.status === 'agreed' ? 'agreed' : 'pending'}
                      label={topic.status === 'agreed' ? 'Passed' : 'Voting Open'}
                      size="sm"
                    />
                  }
                  actions={
                    <div className="w-full space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="type-label text-[14px] shrink-0">Your vote:</span>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleVote(topic.id, 'agree')}
                            className={`min-h-[38px] px-3 py-1.5 rounded-xl text-[13px] sm:text-[14px] font-bold whitespace-nowrap transition-all duration-150 ease-out active:scale-[0.98] motion-reduce:transition-none cursor-pointer flex items-center gap-1.5 border-2 ${
                              myVote === 'agree'
                                ? 'bg-[#1F2430] text-white border-[#1F2430] shadow-xs'
                                : 'bg-white text-[#475569] border-[#E6E8EE] hover:bg-[#F7F8FB] hover:border-[#CBD5E1]'
                            }`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5 shrink-0" />
                            <span>Agree{myVote ? ` (${agreeVotes})` : ''}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVote(topic.id, 'disagree')}
                            className={`min-h-[38px] px-3 py-1.5 rounded-xl text-[13px] sm:text-[14px] font-bold whitespace-nowrap transition-all duration-150 ease-out active:scale-[0.98] motion-reduce:transition-none cursor-pointer flex items-center gap-1.5 border-2 ${
                              myVote === 'disagree'
                                ? 'bg-[#1F2430] text-white border-[#1F2430] shadow-xs'
                                : 'bg-white text-[#475569] border-[#E6E8EE] hover:bg-[#F7F8FB] hover:border-[#CBD5E1]'
                            }`}
                          >
                            <ThumbsDown className="w-3.5 h-3.5 shrink-0" />
                            <span>Disagree{myVote ? ` (${disagreeVotes})` : ''}</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-1.5 pt-1 min-w-0">
                        <input
                          type="text"
                          placeholder="Add quiet comment..."
                          value={commentInputs[topic.id] || ''}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({
                              ...prev,
                              [topic.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleComment(topic.id);
                          }}
                          className="flex-1 min-w-0 px-3 py-1.5 rounded-xl border border-[#E6E8EE] bg-[#F7F8FB] text-[14px] text-[#1F2430] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FF6B4A] transition-colors duration-150"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={isPosting}
                          disabled={!commentInputs[topic.id]?.trim() || isPosting}
                          onClick={() => handleComment(topic.id)}
                          icon={<PaperPlaneRight className="w-3.5 h-3.5" />}
                        >
                          {isPosting ? '...' : 'Post'}
                        </Button>
                      </div>
                    </div>
                  }
                />
              );
            })
          )}
        </div>
      )}

      {subTab === 'agreements' && (
        <div className="space-y-3">
          {agreements.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#F7F8FB] border border-[#E6E8EE] text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFF5F2] border border-[#FFD3C9] flex items-center justify-center text-[#FF6B4A]">
                <FileText className="w-5 h-5" />
              </div>
              <div className="space-y-1 max-w-xs">
                <h4 className="type-card-title text-[#1F2430]">No house rules saved yet</h4>
                <p className="type-secondary text-[14px]">
                  Document shared agreements on quiet hours, cleaning, and guests so everyone stays on the same page.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenAddAgreementModal}
                icon={<PlusCircle className="w-3.5 h-3.5 text-[#FF6B4A]" weight="fill" />}
              >
                Add first house rule
              </Button>
            </div>
          ) : (
            agreements.map((agr) => (
              <ActionCard
                key={agr.id}
                tint="coral"
                iconTile={<IconTile icon={<FileText className="w-5 h-5" />} color="coral" size="sm" />}
                title={agr.category.toUpperCase().replace('_', ' ')}
                subtitle="Consensus agreement"
                detail={
                  <p className="type-body text-[14px] font-medium mt-1 leading-relaxed text-[#1F2430]">
                    "{agr.text}"
                  </p>
                }
              />
            ))
          )}
        </div>
      )}
    </InfoCard>
  );
};
