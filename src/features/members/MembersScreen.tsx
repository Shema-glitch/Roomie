import React, { useState } from 'react';
import { ActionCard } from '../../components/common/ActionCard';
import { InfoCard } from '../../components/common/InfoCard';
import { IconTile } from '../../components/common/IconTile';
import { Button } from '../../components/common/Button';
import { SectionTitle } from '../../components/common/SectionTitle';
import { Avatar } from '../../components/common/Avatar';
import { Chip } from '../../components/common/Chip';
import { Modal } from '../../components/common/Modal';
import { User, Household, Membership } from '../../types';
import { sound } from '../../services/sound';
import {
  Shield,
  QrCode,
  LogOut,
  Building2,
  Flame,
  Check,
  AlertTriangle,
  UserCheck,
  Copy,
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface MembersScreenProps {
  household: Household;
  members: { user: User; membership: Membership }[];
  currentUser: User;
  netBalance: number;
  onShowQR: () => void;
  onHandoverAdmin: (toUserId: string) => Promise<void>;
  onLeaveHousehold: () => Promise<void>;
}

export const MembersScreen: React.FC<MembersScreenProps> = ({
  household,
  members,
  currentUser,
  netBalance,
  onShowQR,
  onHandoverAdmin,
  onLeaveHousehold,
}) => {
  const { showToast } = useToast();
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [selectedSuccessorId, setSelectedSuccessorId] = useState('');
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [acknowledgeDebt, setAcknowledgeDebt] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentMembership = members.find((m) => m.user.id === currentUser.id)?.membership;
  const isAdmin = currentMembership?.role === 'admin';

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

  const copyCode = () => {
    sound.playTap();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(household.inviteCode);
      showToast(`Copied code #${household.inviteCode} to clipboard!`, 'success');
    } else {
      showToast(`Apartment code: #${household.inviteCode}`, 'info');
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* 1. APARTMENT CARD WITH INVITE CODE & QR */}
      <ActionCard
        tint="coral"
        iconTile={<IconTile icon={<Building2 className="w-6 h-6" />} color="coral" size="md" />}
        title={household.name}
        subtitle={`Apartment Code: #${household.inviteCode} • Currency: ${household.currency}`}
        detail={
          <div className="p-3.5 rounded-2xl bg-white/80 border border-[#FFD3C9] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm font-bold text-[#475569]">
            <span className="flex items-center gap-1.5 text-[#1F2430]">
              <Shield className="w-4 h-4 text-[#FF6B4A]" /> Doorkeeper Governance:
            </span>
            <span>Admin only approves join requests; zero chore control</span>
          </div>
        }
        actions={
          <div className="w-full flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              size="md"
              onClick={onShowQR}
              icon={<QrCode className="w-4 h-4 text-[#FF6B4A]" />}
            >
              Show Apartment QR
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={copyCode}
              icon={<Copy className="w-4 h-4 text-[#FF6B4A]" />}
            >
              Copy Code
            </Button>
            {isAdmin && members.length > 1 && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => setHandoverModalOpen(true)}
                icon={<Shield className="w-4 h-4 text-[#FF6B4A]" />}
              >
                Handover Admin
              </Button>
            )}
          </div>
        }
      />

      {/* 2. MEMBERS DIRECTORY IN RESPONSIVE AUTO-FLOW GRID */}
      <div className="space-y-4">
        <SectionTitle
          title={`Apartment Roomies (${members.length})`}
          subtitle="Household community, live status, and streaks"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
