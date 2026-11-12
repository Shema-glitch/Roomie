import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Chip } from '../../components/common/Chip';
import { Avatar } from '../../components/common/Avatar';
import { DutySchedule, User, Chore, DayOfWeek, Membership } from '../../types';
import { DAY_DISPLAY_NAMES, getDayOfWeekFromDate } from '../../utils/dutyRotation';
import { Calendar, CheckCircle2, ArrowLeftRight, UserCheck, Sparkles, Clock } from 'lucide-react';
import { useToast } from '../../components/common/Toast';
import { sound } from '../../services/sound';

interface DutyTimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  dutySchedule: DutySchedule | null;
  roommates: User[];
  chores: Chore[];
  currentUser: User;
  currentMembership: Membership | null;
  onReassignDay: (day: DayOfWeek, userId: string) => Promise<void>;
  onSwapDays: (day1: DayOfWeek, day2: DayOfWeek) => Promise<void>;
  onCompleteTodayDuty: (day: DayOfWeek) => Promise<void>;
}

export const DutyTimetableModal: React.FC<DutyTimetableModalProps> = ({
  isOpen,
  onClose,
  dutySchedule,
  roommates,
  chores,
  currentUser,
  currentMembership,
  onReassignDay,
  onSwapDays,
  onCompleteTodayDuty,
}) => {
  const { showToast } = useToast();
  const [reassignDayTarget, setReassignDayTarget] = useState<DayOfWeek | null>(null);
  const [swapDaySource, setSwapDaySource] = useState<DayOfWeek | null>(null);
  const [updating, setUpdating] = useState<boolean>(false);

  if (!dutySchedule) return null;

  const todayDay = getDayOfWeekFromDate();
  const isAdmin = currentMembership?.role === 'admin';

  const handleSelectReassign = async (day: DayOfWeek, userId: string) => {
    setUpdating(true);
    sound.playTap();
    try {
      await onReassignDay(day, userId);
      const user = roommates.find((r) => r.id === userId);
      showToast(`${DAY_DISPLAY_NAMES[day].full} reassigned to ${user?.name || 'roommate'}`, 'success');
      setReassignDayTarget(null);
    } catch {
      showToast('Could not reassign duty day', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleInitiateSwap = (day: DayOfWeek) => {
    sound.playTap();
    if (!swapDaySource) {
      setSwapDaySource(day);
      showToast(`Selected ${DAY_DISPLAY_NAMES[day].full}. Now tap another day to swap!`, 'info');
    } else if (swapDaySource === day) {
      setSwapDaySource(null);
    } else {
      executeSwap(swapDaySource, day);
    }
  };

  const executeSwap = async (day1: DayOfWeek, day2: DayOfWeek) => {
    setUpdating(true);
    sound.playTap();
    try {
      await onSwapDays(day1, day2);
      showToast(`Swapped ${DAY_DISPLAY_NAMES[day1].full} with ${DAY_DISPLAY_NAMES[day2].full}!`, 'success');
      setSwapDaySource(null);
    } catch {
      showToast('Could not swap duty days', 'error');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Weekly Duty Timetable"
      subtitle="One flat captain per day • Fair rotating schedule"
      size="lg"
    >
      <div className="space-y-4">
        {/* Banner */}
        <div className="p-3.5 rounded-2xl bg-[#EEF0FD] border border-[#C7D2FE] flex items-center justify-between gap-3 text-xs text-[#1F2430]">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-[#5B5BD6] shrink-0" />
            <div>
              <span className="font-bold block text-sm">How Day Duty Works</span>
              <span className="text-[#64748B]">
                Instead of scattered chores, one roommate is the flat captain each day to handle general tidiness and daily chores.
              </span>
            </div>
          </div>
        </div>

        {/* Swap Mode Indicator */}
        {swapDaySource && (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 flex items-center justify-between gap-2 text-xs text-amber-900 animate-pulse">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Swapping <strong>{DAY_DISPLAY_NAMES[swapDaySource].full}</strong>. Tap another day to complete swap.
              </span>
            </div>
            <button
              onClick={() => setSwapDaySource(null)}
              className="font-bold underline cursor-pointer text-amber-800"
            >
              Cancel
            </button>
          </div>
        )}

        {/* 7-Day Timetable Grid */}
        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {dutySchedule.entries.map((entry) => {
            const isToday = entry.day === todayDay;
            const assignedUser = roommates.find((r) => r.id === entry.assignedUserId) || (entry.assignedUserId === currentUser.id ? currentUser : null);
            const isMe = assignedUser?.id === currentUser.id;
            const isSelectedForSwap = swapDaySource === entry.day;

            return (
              <div
                key={entry.day}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isSelectedForSwap
                    ? 'ring-2 ring-amber-500 bg-amber-50/70 border-amber-300'
                    : isToday
                    ? 'bg-white border-[#FF6B4A] shadow-sm'
                    : 'bg-white border-[#E6E8EE]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Day Label & Badges */}
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-black text-sm text-[#1F2430] w-20">
                      {DAY_DISPLAY_NAMES[entry.day].full}
                    </span>
                    {isToday && (
                      <Chip variant="primary" size="xs" label="TODAY" />
                    )}
                    {entry.completed && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3" /> Done
                      </span>
                    )}
                  </div>

                  {/* Assigned Flatmate & Actions */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <Avatar
                        src={assignedUser?.avatar || ''}
                        name={assignedUser?.name || 'Unassigned'}
                        flag={assignedUser?.flag || ''}
                        size="sm"
                      />
                      <span className="text-xs font-bold text-[#1F2430]">
                        {assignedUser?.name || 'Unassigned'} {isMe && '(You)'}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 pl-2 border-l border-[#E6E8EE]">
                      <button
                        type="button"
                        onClick={() => handleInitiateSwap(entry.day)}
                        disabled={updating}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          isSelectedForSwap
                            ? 'bg-amber-500 text-white'
                            : 'text-[#64748B] hover:text-[#1F2430] hover:bg-[#F7F8FB]'
                        }`}
                        title="Swap day with another flatmate"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setReassignDayTarget(reassignDayTarget === entry.day ? null : entry.day)}
                          disabled={updating}
                          className="p-1.5 rounded-lg text-xs font-bold text-[#64748B] hover:text-[#1F2430] hover:bg-[#F7F8FB] cursor-pointer"
                          title="Admin: Reassign flatmate"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Duty checklist preview */}
                <div className="mt-2 pt-2 border-t border-[#F1F3F8] flex items-center justify-between text-xs text-[#64748B]">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#FF6B4A]" />
                    {entry.notes || 'Mopping, kitchen tidy, trash & recycling'}
                  </span>

                  {isToday && isMe && !entry.completed && (
                    <button
                      type="button"
                      onClick={() => {
                        sound.playSuccess();
                        onCompleteTodayDuty(entry.day);
                        showToast('Duty day marked complete! Great work keeping the flat tidy 🎉', 'success');
                      }}
                      className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                    >
                      Mark Finished ✨
                    </button>
                  )}
                </div>

                {/* Admin Quick Reassign Picker */}
                {reassignDayTarget === entry.day && (
                  <div className="mt-3 p-2.5 rounded-xl bg-[#F7F8FB] border border-[#E6E8EE] space-y-2">
                    <span className="text-[11px] font-bold text-[#64748B] block uppercase tracking-wider">
                      Reassign {DAY_DISPLAY_NAMES[entry.day].full} to:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {roommates.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleSelectReassign(entry.day, r.id)}
                          className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            entry.assignedUserId === r.id
                              ? 'bg-[#1F2430] text-white border-[#1F2430]'
                              : 'bg-white text-[#1F2430] border-[#E6E8EE] hover:border-[#1F2430]'
                          }`}
                        >
                          <Avatar src={r.avatar} name={r.name} flag={r.flag} size="xs" />
                          <span className="truncate">{r.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <Button variant="secondary" size="md" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};
