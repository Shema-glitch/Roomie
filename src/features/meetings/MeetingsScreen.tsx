import React, { useState } from 'react';
import { ActionCard } from '../../components/common/ActionCard';
import { InfoCard } from '../../components/common/InfoCard';
import { IconTile } from '../../components/common/IconTile';
import { Button } from '../../components/common/Button';
import { SectionTitle } from '../../components/common/SectionTitle';
import { Avatar } from '../../components/common/Avatar';
import { Chip } from '../../components/common/Chip';
import { Modal } from '../../components/common/Modal';
import { MeetingTopic, HouseAgreement, User } from '../../types';
import { sound } from '../../services/sound';
import {
  Users,
  Plus,
  ThumbsUp,
  ThumbsDown,
  Pin,
  Send,
  MessageSquare,
  BookOpen,
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface MeetingsScreenProps {
  topics: MeetingTopic[];
  agreements: HouseAgreement[];
  roommates: User[];
  currentUser: User;
  onCreateTopic: (title: string, desc: string) => Promise<MeetingTopic>;
  onVoteTopic: (topicId: string, vote: 'agree' | 'disagree' | 'neutral') => Promise<void>;
  onAddComment: (topicId: string, text: string) => Promise<void>;
  onAddAgreement: (text: string, category: string) => Promise<HouseAgreement>;
}

export const MeetingsScreen: React.FC<MeetingsScreenProps> = ({
  topics,
  agreements,
  roommates,
  currentUser,
  onCreateTopic,
  onVoteTopic,
  onAddComment,
  onAddAgreement,
}) => {
  const { showToast } = useToast();
  const [tab, setTab] = useState<'topics' | 'agreements'>('topics');
  const [proposeModalOpen, setProposeModalOpen] = useState(false);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  // Propose topic form
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePropose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setLoading(true);
    try {
      sound.playSuccess();
      await onCreateTopic(newTitle.trim(), newDesc.trim());
      showToast('Meeting topic proposed! Roomies can now vote.', 'success');
      setNewTitle('');
      setNewDesc('');
      setProposeModalOpen(false);
    } catch {
      showToast('Could not propose topic', 'error');
    } finally {
      setLoading(false);
    }
  };

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
    if (!text) return;
    sound.playPop();
    try {
      await onAddComment(topicId, text);
      setCommentInputs((prev) => ({ ...prev, [topicId]: '' }));
    } catch {
      showToast('Comment failed', 'error');
    }
  };

  return (
    <div className="space-y-5 pb-24 select-none">
      {/* Tab Switcher */}
      <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[#E6E8EE]/70">
        <button
          onClick={() => {
            sound.playTap();
            setTab('topics');
          }}
          className={`py-2.5 px-3 rounded-xl text-sm font-heading font-black transition-all cursor-pointer ${
            tab === 'topics'
              ? 'bg-white text-[#1F2430] shadow-sm'
              : 'text-[#475569] hover:text-[#1F2430]'
          }`}
        >
          Open Discussions ({topics.length})
        </button>
        <button
          onClick={() => {
            sound.playTap();
            setTab('agreements');
          }}
          className={`py-2.5 px-3 rounded-xl text-sm font-heading font-black transition-all cursor-pointer ${
            tab === 'agreements'
              ? 'bg-white text-[#1F2430] shadow-sm'
              : 'text-[#475569] hover:text-[#1F2430]'
          }`}
        >
          Apartment Rules ({agreements.length}) 📌
        </button>
      </div>

      {/* TAB 1: TOPICS */}
      {tab === 'topics' && (
        <div className="space-y-4">
          <SectionTitle
            title="Apartment Topics & Votes"
            subtitle="Vote on quiet hours, visitors, and standards"
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => setProposeModalOpen(true)}
                icon={<Plus className="w-4 h-4" />}
              >
                Propose
              </Button>
            }
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topics.map((topic) => {
              const proposer = roommates.find((r) => r.id === topic.proposedBy);
              const myVote = topic.votes.find((v) => v.userId === currentUser.id)?.vote;

              const agreeVotes = topic.votes.filter((v) => v.vote === 'agree').length;
              const disagreeVotes = topic.votes.filter((v) => v.vote === 'disagree').length;

              return (
                <ActionCard
                  key={topic.id}
                  tint={topic.status === 'agreed' ? 'green' : 'neutral'}
                  iconTile={
                    <IconTile
                      icon={<MessageSquare className="w-6 h-6" />}
                      color={topic.status === 'agreed' ? 'green' : 'indigo'}
                      size="md"
                    />
                  }
                  title={topic.title}
                  subtitle={`Proposed by ${proposer?.name.split(' ')[0] || 'Roomie'}`}
                  detail={<p className="type-secondary leading-relaxed">{topic.description}</p>}
                  badge={
                    <Chip
                      status={topic.status === 'agreed' ? 'agreed' : 'pending'}
                      label={topic.status === 'agreed' ? 'Passed 🎉' : 'Voting Open'}
                      size="sm"
                    />
                  }
                  actions={
                    <div className="w-full space-y-3">
                      {/* Voting Buttons */}
                      <div className="flex items-center justify-between gap-3">
                        <span className="type-label">
                          Your vote
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant={myVote === 'agree' ? 'green' : 'secondary'}
                            size="sm"
                            onClick={() => handleVote(topic.id, 'agree')}
                            icon={<ThumbsUp className="w-4 h-4" />}
                          >
                            Agree ({agreeVotes})
                          </Button>
                          <Button
                            variant={myVote === 'disagree' ? 'danger-outline' : 'secondary'}
                            size="sm"
                            onClick={() => handleVote(topic.id, 'disagree')}
                            icon={<ThumbsDown className="w-4 h-4" />}
                          >
                            Disagree ({disagreeVotes})
                          </Button>
                        </div>
                      </div>

                      {/* Comments section */}
                      {topic.comments.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-black/5">
                          <span className="type-label block">
                            Roomie Comments ({topic.comments.length})
                          </span>
                          {topic.comments.map((c) => {
                            const commenter = roommates.find((r) => r.id === c.userId);
                            return (
                              <div
                                key={c.id}
                                className="p-2.5 rounded-xl bg-white border border-[#E6E8EE] text-sm text-[#1F2430] flex items-start gap-2"
                              >
                                <span className="font-bold text-[#5B5BD6] shrink-0">
                                  {commenter?.name.split(' ')[0]}:
                                </span>
                                <span className="flex-1 font-medium">{c.text}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Add quick comment */}
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={commentInputs[topic.id] || ''}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({
                              ...prev,
                              [topic.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => e.key === 'Enter' && handleComment(topic.id)}
                          placeholder="Add a friendly comment..."
                          className="flex-1 px-3.5 py-2 rounded-xl border-2 border-[#E6E8EE] bg-white text-sm text-[#1F2430] placeholder:text-[#475569] focus:outline-none focus:border-[#FF6B4A]"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleComment(topic.id)}
                          icon={<Send className="w-4 h-4" />}
                        >
                          Post
                        </Button>
                      </div>
                    </div>
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: AGREEMENTS */}
      {tab === 'agreements' && (
        <div className="space-y-4">
          <SectionTitle
            title="Apartment Rules & Agreements"
            subtitle="Pinned living standards accepted by all roomies"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agreements.map((agr) => (
              <ActionCard
                key={agr.id}
                tint="coral"
                iconTile={<IconTile icon={<Pin className="w-6 h-6" />} color="coral" size="md" />}
                title={agr.category.toUpperCase()}
                subtitle="Agreed by apartment consensus"
                detail={
                  <p className="type-body mt-1 leading-relaxed">
                    "{agr.text}"
                  </p>
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Propose Topic Modal */}
      <Modal
        isOpen={proposeModalOpen}
        onClose={() => setProposeModalOpen(false)}
        title="Propose Meeting Topic"
        subtitle="Bring up an apartment matter peacefully"
      >
        <form onSubmit={handlePropose} className="space-y-4">
          <div>
            <label className="type-label block mb-1.5">
              Topic Title
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Quiet hours on weeknights, Guest overnight policy"
              className="w-full px-4 py-3 rounded-2xl border-2 border-[#E6E8EE] bg-white text-sm text-[#1F2430] focus:outline-none focus:border-[#FF6B4A]"
            />
          </div>

          <div>
            <label className="type-label block mb-1.5">
              Explanation
            </label>
            <textarea
              required
              rows={3}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Explain the proposed rule or standard and how it helps the apartment..."
              className="w-full px-4 py-3 rounded-2xl border-2 border-[#E6E8EE] bg-white text-sm text-[#1F2430] focus:outline-none focus:border-[#FF6B4A]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="secondary"
              size="md"
              type="button"
              onClick={() => setProposeModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={loading || !newTitle.trim()}
            >
              {loading ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
