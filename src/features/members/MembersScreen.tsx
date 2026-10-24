import React, { useState } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { Chip } from '../../components/common/Chip';
import { Modal } from '../../components/common/Modal';
import { User, Household, Membership } from '../../types';
import { THEME } from '../../theme/tokens';
import { sound } from '../../services/sound';
import {
  Shield,
  QrCode,
  LogOut,
  UserCheck,
  Share2,
  Copy,
  Check,
  AlertTriangle,
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
      showToast('You have left the household.', 'info');
      setLeaveModalOpen(false);
    } catch {
      showToast('Could not leave household', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-20 select-none">
      {/* Apartment Card with Invite Code & QR */}
      <Card padding="md" variant="calm" className="bg-white space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading font-black text-xl text-[#1F2430]">
              {household.name}
            </h3>
            <p className="text-xs text-[#6B7280]">
              Invite Code: <strong>{household.inviteCode}</strong> • {household.currency}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onShowQR}
            icon={<QrCode className="w-4 h-4 text-[#FF6B4A]" />}
          >
            Show QR
          </Button>
        </div>

        <div className="p-2.5 rounded-xl bg-[#F7F8FB] border border-[#E6E8EE] flex items-center justify-between text-xs font-semibold text-[#6B7280]">
          <span>Admin rule:</span>
          <span>Doorkeeper for join requests only (no power over daily life)</span>
        </div>
      </Card>

      {/* Members Directory */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-base text-[#1F2430]">
            Household Members ({members.length})
          </h3>
          {isAdmin && members.length > 1 && (
            <button
              onClick={() => setHandoverModalOpen(true)}
              className="text-xs font-bold text-[#FF6B4A] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" /> Handover Admin
            </button>
          )}
        </div>

        <div className="space-y-2">
          {members.map(({ user, membership }) => {
            const isMe = user.id === currentUser.id;
            return (
              <Card
                key={user.id}
                padding="md"
                variant="calm"
                className="bg-white flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    src={user.avatar}
                    name={user.name}
                    flag={user.flag}
                    isHome={user.isHome}
                    showStatus
                    size="md"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-heading font-bold text-base text-[#1F2430]">
                        {user.name} {isMe ? '(You)' : ''}
                      </h4>
                      {membership.role === 'admin' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF0ED] text-[#FF6B4A] border border-[#FFD7CF] text-[10px] font-bold">
                          <Shield className="w-3 h-3" /> Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#6B7280]">
                      From {user.country} {user.flag} • Streak: {user.streakDays} days 🔥
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full ${
                      user.isHome ? 'bg-[#3DBE6D]' : 'bg-[#9CA3AF]'
                    }`}
                    title={user.isHome ? 'Home' : 'Away'}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Leave Household Action (Calm style with balance check) */}
      <div className="pt-4 border-t border-[#E6E8EE]">
        <Button
          variant="outline"
          size="md"
          fullWidth
          onClick={() => setLeaveModalOpen(true)}
          icon={<LogOut className="w-4 h-4 text-[#E5484D]" />}
        >
          Leave this Household
        </Button>
      </div>

      {/* Handover Admin Modal */}
      <Modal
        isOpen={handoverModalOpen}
        onClose={() => setHandoverModalOpen(false)}
        title="Handover Admin Role"
        subtitle="Pass the doorkeeper role to a flatmate"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#6B7280]">
            Select which roommate will take over reviewing join requests and refreshing invite codes.
          </p>

          <div className="space-y-2">
            {members
              .filter((m) => m.user.id !== currentUser.id)
              .map(({ user }) => (
                <div
                  key={user.id}
                  onClick={() => setSelectedSuccessorId(user.id)}
                  className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                    selectedSuccessorId === user.id
                      ? 'border-[#FF6B4A] bg-[#FFF0ED]'
                      : 'border-[#E6E8EE] bg-white hover:border-[#CBD5E1]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar src={user.avatar} name={user.name} flag={user.flag} size="sm" />
                    <div>
                      <h4 className="font-heading font-bold text-sm text-[#1F2430]">
                        {user.name}
                      </h4>
                      <p className="text-xs text-[#6B7280]">{user.country}</p>
                    </div>
                  </div>
                  {selectedSuccessorId === user.id && (
                    <div className="w-5 h-5 rounded-full bg-[#FF6B4A] text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>
              ))}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button variant="outline" size="md" onClick={() => setHandoverModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={!selectedSuccessorId || loading}
              onClick={handleHandover}
            >
              {loading ? 'Updating...' : 'Confirm Handover'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Leave Household Modal (with balance check) */}
      <Modal
        isOpen={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        title="Leave Household"
        subtitle="Settle balances before departing"
      >
        <div className="space-y-4">
          {Math.abs(netBalance) > 1 ? (
            <div className="p-3.5 rounded-2xl bg-[#FDECEE] border border-[#F8BFC2] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#E5484D]">
                <AlertTriangle className="w-4 h-4" />
                <span>Unsettled Balance Detected</span>
              </div>
              <p className="text-xs text-[#1F2430] leading-relaxed">
                You currently have a balance of{' '}
                <strong>
                  {netBalance > 0
                    ? `+₺${netBalance.toFixed(2)} (owed to you)`
                    : `-₺${Math.abs(netBalance).toFixed(2)} (you owe flatmates)`}
                </strong>
                .
              </p>
              <label className="flex items-start gap-2 pt-1 text-xs font-semibold text-[#1F2430] cursor-pointer">
                <input
                  type="checkbox"
                  checked={acknowledgeDebt}
                  onChange={(e) => setAcknowledgeDebt(e.target.checked)}
                  className="mt-0.5 accent-[#FF6B4A]"
                />
                <span>
                  I have arranged settlement with my flatmates offline or acknowledge this remaining balance.
                </span>
              </label>
            </div>
          ) : (
            <p className="text-xs text-[#6B7280] leading-relaxed">
              Your balances are all settled (₺0.00). When you leave, your chores will return to the draft pool for the remaining members.
            </p>
          )}

          {isAdmin && members.length > 1 && (
            <div className="p-3 rounded-2xl bg-[#FFF8E6] border border-[#FFE8A3] text-xs text-[#8A6200] font-semibold">
              ⚠️ You are currently the admin. Leaving will automatically promote the next longest-standing flatmate to admin.
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button variant="outline" size="md" onClick={() => setLeaveModalOpen(false)}>
              Stay in Flat
            </Button>
            <Button
              variant="danger"
              size="md"
              disabled={loading || (Math.abs(netBalance) > 1 && !acknowledgeDebt)}
              onClick={handleLeave}
            >
              {loading ? 'Processing...' : 'Confirm & Leave'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
