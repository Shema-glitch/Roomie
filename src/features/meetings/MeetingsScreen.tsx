import React, { useState } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Chip } from '../../components/common/Chip';
import { Avatar } from '../../components/common/Avatar';
import { Modal } from '../../components/common/Modal';
import { MeetingTopic, HouseAgreement, User } from '../../types';
import { THEME } from '../../theme/tokens';
import { sound } from '../../services/sound';
import {
  Users,
  Plus,
  Check,
  ThumbsUp,
  ThumbsDown,
  Minus,
  MessageSquare,
  BookOpen,
  Pin,
  Send,
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
      showToast('Meeting topic proposed! Roommates can now vote.', 'success');
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
    <div className="space-y-4 pb-20 select-none">
      {/* Tab Switcher */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#E6E8EE]/60">
        <button
          onClick={() => {
            sound.playTap();
            setTab('topics');
          }}
          className={`py-2 rounded-xl text-xs font-heading font-extrabold transition-all cursor-pointer ${
            tab === 'topics'
              ? 'bg-white text-[#1F2430] shadow-xs'
              : 'text-[#6B7280] hover:text-[#1F2430]'
          }`}
        >
          Open Discussions ({topics.length})
        </button>
        <button
          onClick={() => {
            sound.playTap();
            setTab('agreements');
          }}
          className={`py-2 rounded-xl text-xs font-heading font-extrabold transition-all cursor-pointer ${
            tab === 'agreements'
              ? 'bg-white text-[#1F2430] shadow-xs'
              : 'text-[#6B7280] hover:text-[#1F2430]'
          }`}
        >
          House Agreements ({agreements.length}) 📌
        </button>
      </div>

      {/* TAB 1: TOPICS */}
      {tab === 'topics' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-base text-[#1F2430]">
                House Topics & Votes
              </h3>
              <p className="text-xs text-[#6B7280]">
                Vote on noise, guests, and standards
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setProposeModalOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Propose Topic
            </Button>
          </div>

          <div className="space-y-3">
            {topics.map((topic) => {
              const proposer = roommates.find((r) => r.id === topic.proposedBy);
              const myVote = topic.votes.find((v) => v.userId === currentUser.id)?.vote;

              const agreeVotes = topic.votes.filter((v) => v.vote === 'agree').length;
              const disagreeVotes = topic.votes.filter((v) => v.vote === 'disagree').length;

              return (
                <Card key={topic.id} padding="md" className="bg-white space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        src={proposer?.avatar}
                        name={proposer?.name || ''}
                        flag={proposer?.flag}
                        size="xs"
                      />
                      <div>
                        <h4 className="font-heading font-extrabold text-sm text-[#1F2430]">
                          {topic.title}
                        </h4>
                        <p className="text-[10px] text-[#6B7280]">
                          Proposed by {proposer?.name.split(' ')[0]}
                        </p>
                      </div>
                    </div>
                    <Chip
                      label={topic.status === 'agreed' ? 'Passed 🎉' : 'Voting'}
                      variant={topic.status === 'agreed' ? 'success' : 'reward'}
                      size="sm"
                    />
                  </div>

                  <p className="text-xs text-[#6B7280] leading-relaxed">
                    {topic.description}
                  </p>

                  {/* Voting Buttons */}
                  <div className="p-2 rounded-2xl bg-[#F7F8FB] border border-[#E6E8EE] flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1F2430]">
                      Your vote:
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleVote(topic.id, 'agree')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                          myVote === 'agree'
                            ? 'border-[#3DBE6D] bg-[#EBF9F0] text-[#3DBE6D]'
                            : 'border-[#E6E8EE] bg-white text-[#6B7280]'
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" /> Agree ({agreeVotes})
                      </button>
                      <button
                        onClick={() => handleVote(topic.id, 'disagree')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                          myVote === 'disagree'
                            ? 'border-[#E5484D] bg-[#FDECEE] text-[#E5484D]'
                            : 'border-[#E6E8EE] bg-white text-[#6B7280]'
                        }`}
                      >
                        <ThumbsDown className="w-3.5 h-3.5" /> Disagree ({disagreeVotes})
                      </button>
                    </div>
                  </div>

                  {/* Comments section */}
                  {topic.comments.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-extrabold uppercase text-[#6B7280]">
                        Comments ({topic.comments.length})
                      </span>
                      {topic.comments.map((c) => {
                        const commenter = roommates.find((r) => r.id === c.userId);
                        return (
                          <div
                            key={c.id}
                            className="p-2 rounded-xl bg-[#F7F8FB] text-xs text-[#1F2430] flex items-start gap-2"
                          >
                            <span className="font-bold text-[#5B5BD6] shrink-0">
                              {commenter?.name.split(' ')[0]}:
                            </span>
                            <span className="flex-1">{c.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add quick comment */}
                  <div className="flex gap-1.5 pt-1">
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
                      className="flex-1 px-3 py-1.5 rounded-xl border border-[#E6E8EE] bg-white text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleComment(topic.id)}
                      icon={<Send className="w-3.5 h-3.5" />}
                    >
                      Post
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: AGREEMENTS (Calm Style as specified in Section 8) */}
      {tab === 'agreements' && (
        <div className="space-y-3">
          <div>
            <h3 className="font-heading font-bold text-base text-[#1F2430]">
              House Rules & Agreements
            </h3>
            <p className="text-xs text-[#6B7280]">
              Pinned living standards accepted by all flatmates
            </p>
          </div>

          <div className="space-y-2.5">
            {agreements.map((agr) => (
              <Card key={agr.id} padding="md" variant="calm" className="bg-white space-y-1">
                <div className="flex items-center gap-2">
                  <Pin className="w-3.5 h-3.5 text-[#FF6B4A]" />
                  <span className="text-[11px] font-extrabold text-[#FF6B4A] uppercase tracking-wider">
                    {agr.category}
                  </span>
                </div>
                <p className="text-xs font-semibold text-[#1F2430] leading-relaxed">
                  "{agr.text}"
                </p>
                <p className="text-[10px] text-[#6B7280] pt-1">
                  Agreed by consensus
                </p>
              </Card>
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
            <label className="block text-xs font-bold text-[#1F2430] mb-1">
              Topic Title
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Quiet hours on weeknights, Guest overnight policy"
              className="w-full px-4 py-2.5 rounded-2xl border border-[#E6E8EE] bg-white text-xs focus:outline-none focus:border-[#FF6B4A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1F2430] mb-1">
              Explanation / Suggestion
            </label>
            <textarea
              required
              rows={3}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Explain the proposed rule or standard and how it helps the apartment..."
              className="w-full px-4 py-2.5 rounded-2xl border border-[#E6E8EE] bg-white text-xs focus:outline-none focus:border-[#FF6B4A]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button
              variant="outline"
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
              {loading ? 'Submitting...' : 'Post Topic'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
