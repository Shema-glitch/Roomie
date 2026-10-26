import React, { useState } from 'react';
import { ActionCard } from '../../components/common/ActionCard';
import { InfoCard } from '../../components/common/InfoCard';
import { IconTile } from '../../components/common/IconTile';
import { Button } from '../../components/common/Button';
import { SectionTitle } from '../../components/common/SectionTitle';
import { Avatar } from '../../components/common/Avatar';
import { Chip } from '../../components/common/Chip';
import { Modal } from '../../components/common/Modal';
import { User, Household, Membership, MeetingTopic, HouseAgreement } from '../../types';
import { sound } from '../../services/sound';
import {
  Shield,
  QrCode,
  LogOut,
  Building2,
  Flame,
  Check,
  AlertTriangle,
  Copy,
  Plus,
  ThumbsUp,
  ThumbsDown,
  Pin,
  Send,
  MessageSquare,
  Users,
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface ApartmentScreenProps {
  household: Household;
  members: { user: User; membership: Membership }[];
  currentUser: User;
  netBalance: number;
  topics: MeetingTopic[];
  agreements: HouseAgreement[];
  roommates: User[];
  onShowQR: () => void;
  onHandoverAdmin: (toUserId: string) => Promise<void>;
  onLeaveHousehold: () => Promise<void>;
  onCreateTopic: (title: string, desc: string) => Promise<MeetingTopic>;
  onVoteTopic: (topicId: string, vote: 'agree' | 'disagree' | 'neutral') => Promise<void>;
  onAddComment: (topicId: string, text: string) => Promise<void>;
  onAddAgreement: (text: string, category: string) => Promise<HouseAgreement>;
}

export const ApartmentScreen: React.FC<ApartmentScreenProps> = ({
  household,
  members,
  currentUser,
  netBalance,
  topics,
  agreements,
  roommates,
  onShowQR,
  onHandoverAdmin,
  onLeaveHousehold,
  onCreateTopic,
  onVoteTopic,
  onAddComment,
  onAddAgreement,
}) => {
  const { showToast } = useToast();

  // Mobile / Tablet Tab Switcher (Visible on < lg screens)
  const [mobileTab, setMobileTab] = useState<'roomies' | 'meetings'>('roomies');

  // Meetings sub-tab (Topics vs Rules)
  const [meetingsSubTab, setMeetingsSubTab] = useState<'topics' | 'agreements'>('topics');

  // Modals state
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [selectedSuccessorId, setSelectedSuccessorId] = useState('');
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [acknowledgeDebt, setAcknowledgeDebt] = useState(false);
  const [proposeModalOpen, setProposeModalOpen] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const currentMembership = members.find((m) => m.user.id === currentUser.id)?.membership;
  const isAdmin = currentMembership?.role === 'admin';

  const copyCode = () => {
    sound.playTap();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(household.inviteCode);
      showToast(`Copied code #${household.inviteCode} to clipboard!`, 'success');
    } else {
      showToast(`Apartment code: #${household.inviteCode}`, 'info');
    }
  };

  const handleHandover = async () => {
    if (!selectedSuccessorId) return;
    setLoading(true);
    try {
      sound.playSuccess();
      await onHandoverAdmin(selectedSuccessorId);
      showToast('Admin role handed over successfully!', 'success');
      setHandoverModalOpen(false);
    } catch {
      showToast('Admin handover failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (Math.abs(netBalance) > 1 && !acknowledgeDebt) {
      showToast('Please acknowledge your unsettled balance first', 'error');
      return;
    }
    setLoading(true);
    try {
      sound.playCalmNotice();
      await onLeaveHousehold();
      showToast('You have left the apartment.', 'info');
      setLeaveModalOpen(false);
    } catch {
      showToast('Could not leave apartment', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePropose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicTitle.trim()) return;
    setLoading(true);
    try {
      sound.playSuccess();
      await onCreateTopic(newTopicTitle.trim(), newTopicDesc.trim());
      showToast('Meeting topic proposed! Roomies can now vote.', 'success');
      setNewTopicTitle('');
      setNewTopicDesc('');
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
    <div className="w-full select-none pb-20 md:pb-8">
      {/* Mobile / Tablet Segmented Section Switcher (Only visible on < lg screens) */}
      <div className="lg:hidden mb-5">
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[#E6E8EE]/70">
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setMobileTab('roomies');
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-heading font-black transition-all cursor-pointer ${
              mobileTab === 'roomies'
                ? 'bg-white text-[#1F2430] shadow-sm'
                : 'text-[#475569] hover:text-[#1F2430]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Roomies ({members.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setMobileTab('meetings');
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-heading font-black transition-all cursor-pointer ${
              mobileTab === 'meetings'
                ? 'bg-white text-[#1F2430] shadow-sm'
                : 'text-[#475569] hover:text-[#1F2430]'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Rules & Meetings ({topics.length + agreements.length})</span>
          </button>
        </div>
      </div>

      {/* RESPONSIVE 2-COLUMN DESKTOP GRID (lg:grid lg:grid-cols-12 lg:gap-8 items-start) */}
      <div className="w-full lg:grid lg:grid-cols-12 lg:gap-8 items-start">
        {/* ================= LEFT COLUMN: Roomies Directory & Community ================= */}
        <div
          className={`w-full lg:col-span-7 self-start space-y-6 ${
            mobileTab === 'roomies' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <SectionTitle
              title={`Apartment Roomies (${members.length})`}
              subtitle="Household community, live status, and streaks"
            />
            <Chip
              status="active"
              label={`${members.filter((m) => m.user.isHome).length} of ${members.length} Home`}
              size="sm"
            />
          </div>

          {/* Roomies 2-Column Responsive Card Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {members.map(({ user, membership }) => {
              const isMe = user.id === currentUser.id;
              return (
                <ActionCard
                  key={user.id}
                  tint={isMe ? 'teal' : 'neutral'}
                  iconTile={
                    <Avatar
                      src={user.avatar}
                      name={user.name}
                      flag={user.flag}
                      isHome={user.isHome}
                      statusRing={true}
                      size="md"
                    />
                  }
                  title={
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="truncate">{user.name}</span>
                      {isMe && <span className="type-label text-[#FF6B4A] font-black">(You)</span>}
                    </div>
                  }
                  subtitle={`From ${user.country} ${user.flag || ''}`}
                  badge={
                    membership.role === 'admin' ? (
                      <Chip status="admin" size="sm" />
                    ) : undefined
                  }
                  detail={
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between type-secondary text-xs">
                        <span className="flex items-center gap-1 text-[#FF6B4A] font-bold">
                          <Flame className="w-3.5 h-3.5 fill-[#FF6B4A]" /> {user.streakDays} day streak
                        </span>
                        <span>{user.points} points</span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <Chip
                          status={user.isHome ? 'active' : 'away'}
                          label={user.isHome ? 'At home' : 'Away'}
                          size="sm"
                        />
                      </div>
                    </div>
                  }
                />
              );
            })}
          </div>

          {/* Leave Apartment Action */}
          <div className="pt-2 flex justify-start">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setLeaveModalOpen(true)}
              icon={<LogOut className="w-4 h-4 text-[#E5484D]" />}
            >
              Leave this Apartment
            </Button>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: Apartment Hub & Meetings/Rules ================= */}
        <div
          className={`w-full lg:col-span-5 self-start h-fit space-y-6 lg:sticky lg:top-0 mt-6 lg:mt-0 ${
            mobileTab === 'meetings' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* 1. APARTMENT CARD WITH INVITE CODE, QR & GOVERNANCE */}
          <ActionCard
            tint="coral"
            iconTile={<IconTile icon={<Building2 className="w-6 h-6" />} color="coral" size="md" />}
            title={household.name}
            subtitle={`Apartment Code: #${household.inviteCode} • Currency: ${household.currency}`}
            detail={
              <div className="p-3 rounded-2xl bg-white/80 border border-[#FFD3C9] space-y-1 text-xs font-bold text-[#475569]">
                <div className="flex items-center gap-1.5 text-[#1F2430]">
                  <Shield className="w-4 h-4 text-[#FF6B4A] shrink-0" />
                  <span>Doorkeeper Governance:</span>
                </div>
                <p className="type-secondary font-normal text-xs pl-5.5">
                  Admin only reviews incoming join requests; zero chore control.
                </p>
              </div>
            }
            actions={
              <div className="w-full flex flex-wrap items-center gap-2.5">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onShowQR}
                  icon={<QrCode className="w-4 h-4 text-[#FF6B4A]" />}
                >
                  Show QR
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={copyCode}
                  icon={<Copy className="w-4 h-4 text-[#FF6B4A]" />}
                >
                  Copy Code
                </Button>
                {isAdmin && members.length > 1 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setHandoverModalOpen(true)}
                    icon={<Shield className="w-4 h-4 text-[#FF6B4A]" />}
                  >
                    Handover Admin
                  </Button>
                )}
              </div>
            }
          />

          {/* 2. HOUSE MEETINGS & APARTMENT RULES CONTAINER */}
          <InfoCard padding="md" className="bg-white border-2 border-[#E6E8EE] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="type-section-heading">House Discussions & Rules</h3>
                <p className="type-secondary text-xs">Agreed standards & votes</p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setProposeModalOpen(true)}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Propose
              </Button>
            </div>

            {/* Sub-tab Switcher (Discussions vs Rules) */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#E6E8EE]/70">
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setMeetingsSubTab('topics');
                }}
                className={`py-2 px-2.5 rounded-lg text-xs font-heading font-black transition-all cursor-pointer ${
                  meetingsSubTab === 'topics'
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
                  setMeetingsSubTab('agreements');
                }}
                className={`py-2 px-2.5 rounded-lg text-xs font-heading font-black transition-all cursor-pointer ${
                  meetingsSubTab === 'agreements'
                    ? 'bg-white text-[#1F2430] shadow-xs'
                    : 'text-[#475569] hover:text-[#1F2430]'
                }`}
              >
                Apartment Rules ({agreements.length}) 📌
              </button>
            </div>

            {/* SUB-VIEW 1: TOPICS */}
            {meetingsSubTab === 'topics' && (
              <div className="space-y-3">
                {topics.length === 0 ? (
                  <p className="type-secondary text-center py-4 text-xs">
                    No active discussion topics right now.
                  </p>
                ) : (
                  topics.map((topic) => {
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
                            icon={<MessageSquare className="w-5 h-5" />}
                            color={topic.status === 'agreed' ? 'green' : 'indigo'}
                            size="sm"
                          />
                        }
                        title={topic.title}
                        subtitle={`Proposed by ${proposer?.name.split(' ')[0] || 'Roomie'}`}
                        detail={<p className="type-secondary text-xs leading-relaxed">{topic.description}</p>}
                        badge={
                          <Chip
                            status={topic.status === 'agreed' ? 'agreed' : 'pending'}
                            label={topic.status === 'agreed' ? 'Passed 🎉' : 'Voting Open'}
                            size="sm"
                          />
                        }
                        actions={
                          <div className="w-full space-y-2.5">
                            {/* Voting Buttons */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="type-label text-xs">Your vote:</span>
                              <div className="flex gap-1.5">
                                <Button
                                  variant={myVote === 'agree' ? 'green' : 'secondary'}
                                  size="sm"
                                  onClick={() => handleVote(topic.id, 'agree')}
                                  icon={<ThumbsUp className="w-3.5 h-3.5" />}
                                >
                                  Agree ({agreeVotes})
                                </Button>
                                <Button
                                  variant={myVote === 'disagree' ? 'danger-outline' : 'secondary'}
                                  size="sm"
                                  onClick={() => handleVote(topic.id, 'disagree')}
                                  icon={<ThumbsDown className="w-3.5 h-3.5" />}
                                >
                                  Disagree ({disagreeVotes})
                                </Button>
                              </div>
                            </div>

                            {/* Comment Input */}
                            <div className="flex gap-1.5 pt-1">
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
                                className="flex-1 px-3 py-1.5 rounded-xl border border-[#E6E8EE] bg-[#F7F8FB] text-xs text-[#1F2430] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FF6B4A]"
                              />
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleComment(topic.id)}
                                icon={<Send className="w-3.5 h-3.5" />}
                              >
                                Post
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

            {/* SUB-VIEW 2: AGREEMENTS & RULES */}
            {meetingsSubTab === 'agreements' && (
              <div className="space-y-3">
                {agreements.length === 0 ? (
                  <p className="type-secondary text-center py-4 text-xs">
                    No apartment rules defined yet.
                  </p>
                ) : (
                  agreements.map((agr) => (
                    <ActionCard
                      key={agr.id}
                      tint="coral"
                      iconTile={<IconTile icon={<Pin className="w-5 h-5" />} color="coral" size="sm" />}
                      title={agr.category.toUpperCase()}
                      subtitle="Consensus agreement"
                      detail={
                        <p className="type-body text-xs font-medium mt-1 leading-relaxed text-[#1F2430]">
                          "{agr.text}"
                        </p>
                      }
                    />
                  ))
                )}
              </div>
            )}
          </InfoCard>
        </div>
      </div>

      {/* Propose Topic Modal */}
      <Modal
        isOpen={proposeModalOpen}
        onClose={() => setProposeModalOpen(false)}
        title="Propose Meeting Topic"
        subtitle="Bring up an apartment matter peacefully"
        size="md"
      >
        <form onSubmit={handlePropose} className="space-y-4">
          <div>
            <label className="type-label block mb-1.5">Topic Title</label>
            <input
              type="text"
              value={newTopicTitle}
              onChange={(e) => setNewTopicTitle(e.target.value)}
              placeholder="e.g. Quiet hours during finals, Guest stay notice"
              className="w-full px-4 py-2.5 rounded-2xl bg-[#F7F8FB] border-2 border-[#E6E8EE] focus:border-[#FF6B4A] focus:outline-none text-[15px] font-semibold text-[#1F2430]"
              required
            />
          </div>

          <div>
            <label className="type-label block mb-1.5">Description & Suggestion</label>
            <textarea
              value={newTopicDesc}
              onChange={(e) => setNewTopicDesc(e.target.value)}
              placeholder="Explain the background and what you're proposing..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-2xl bg-[#F7F8FB] border-2 border-[#E6E8EE] focus:border-[#FF6B4A] focus:outline-none text-[14px] font-semibold text-[#1F2430]"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setProposeModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              disabled={!newTopicTitle.trim() || loading}
            >
              {loading ? 'Submitting...' : 'Propose Topic'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Handover Admin Modal */}
      <Modal
        isOpen={handoverModalOpen}
        onClose={() => setHandoverModalOpen(false)}
        title="Handover Admin Role"
        subtitle="Pass the doorkeeper role to a roomie"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm font-semibold text-[#475569]">
            Select which roomie will take over reviewing join requests and refreshing apartment invite codes.
          </p>

          <div className="space-y-2.5">
            {members
              .filter((m) => m.user.id !== currentUser.id)
              .map(({ user }) => (
                <ActionCard
                  key={user.id}
                  tint={selectedSuccessorId === user.id ? 'coral' : 'neutral'}
                  iconTile={
                    <Avatar
                      src={user.avatar}
                      name={user.name}
                      flag={user.flag}
                      isHome={user.isHome}
                      statusRing={true}
                      size="sm"
                    />
                  }
                  title={user.name}
                  subtitle={`From ${user.country}`}
                  actions={
                    <Button
                      variant={selectedSuccessorId === user.id ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => {
                        sound.playTap();
                        setSelectedSuccessorId(user.id);
                      }}
                      icon={selectedSuccessorId === user.id ? <Check className="w-4 h-4" /> : undefined}
                    >
                      {selectedSuccessorId === user.id ? 'Selected' : 'Select'}
                    </Button>
                  }
                />
              ))}
          </div>

          <div className="flex gap-3 pt-3">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setHandoverModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              fullWidth
              disabled={!selectedSuccessorId || loading}
              onClick={handleHandover}
            >
              {loading ? 'Confirming...' : 'Confirm Handover'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Leave Household Modal */}
      <Modal
        isOpen={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        title="Leave Apartment"
        subtitle="Are you sure you want to disconnect from this household?"
        size="md"
      >
        <div className="space-y-4">
          {Math.abs(netBalance) > 1 ? (
            <div className="p-4 rounded-2xl bg-[#FFF0ED] border-2 border-[#FFD7CF] space-y-2">
              <div className="flex items-center gap-2 text-[#E5484D] font-bold">
                <AlertTriangle className="w-5 h-5" />
                <span>You have an unsettled balance of ₺{Math.abs(netBalance).toFixed(2)}</span>
              </div>
              <p className="text-sm text-[#475569]">
                Leaving before settling up may disrupt shared expense agreements with your roomies.
              </p>
              <label className="flex items-center gap-2 pt-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acknowledgeDebt}
                  onChange={(e) => setAcknowledgeDebt(e.target.checked)}
                  className="w-4 h-4 rounded text-[#FF6B4A] focus:ring-[#FF6B4A]"
                />
                <span className="text-sm font-bold text-[#1F2430]">
                  I will settle my shared expenses outside the app
                </span>
              </label>
            </div>
          ) : (
            <p className="text-sm text-[#475569]">
              Your apartment balances are settled! You will lose access to the chore rotation, secret drafts, and group chat.
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setLeaveModalOpen(false)}
            >
              Stay in Apartment
            </Button>
            <Button
              variant="danger"
              size="md"
              fullWidth
              disabled={Math.abs(netBalance) > 1 && !acknowledgeDebt}
              onClick={handleLeave}
            >
              {loading ? 'Leaving...' : 'Yes, Leave'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
