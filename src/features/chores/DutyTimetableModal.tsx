import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Chip } from '../../components/common/Chip';
import { Avatar } from '../../components/common/Avatar';
import { DutySchedule, User, Chore, DayOfWeek, Membership } from '../../types';
import { DAY_DISPLAY_NAMES, getDayOfWeekFromDate, formatDutyCompletedTime } from '../../utils/dutyRotation';
import { Calendar, ArrowsLeftRight, UserSwitch } from '@phosphor-icons/react';
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
        <div className="p-3.5 rounded-2xl bg-[#EEF0FD] border-2 border-[#C7D2FE] flex items-center justify-between gap-3 text-xs text-[#1F2430]">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-[#5B5BD6] shrink-0" />
            <div>
              <span className="font-bold block text-sm">How Day Duty Works</span>
              <span className="text-[#64748B] block">
                One roommate covers daily tidy duty each day so chores stay fair.
              </span>
              <span className="text-[11px] font-bold text-[#4F46E5] block mt-1">
                Daily checklist: Mopping, kitchen tidy, trash &amp; recycling
              </span>
            </div>
          </div>
        </div>

        {/* Swap Mode Indicator */}
        {swapDaySource && (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 flex items-center justify-between gap-2 text-xs text-amber-900 animate-pulse">
            <div className="flex items-center gap-2">
              <ArrowsLeftRight className="w-4 h-4 text-amber-600 shrink-0" />
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
            const completedTime = formatDutyCompletedTime(entry.completedAt);

            return (
              <div
                key={entry.day}
                className={`p-3.5 rounded-2xl border-2 border-b-4 transition-[transform,background-color,border-color] duration-150 ${
                  isSelectedForSwap
                    ? 'ring-2 ring-amber-500 bg-amber-50/70 border-amber-400 shadow-2xs'
                    : isToday
                    ? 'bg-white border-[#FF6B4A] shadow-2xs'
                    : 'bg-white border-[#E6E8EE]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  {/* Day Label & Badges (always left) */}
                  <div className="flex items-center gap-1.5 min-w-0 shrink-0">
                    <span className="font-heading font-semibold text-sm text-[#1F2430] whitespace-nowrap">
                      {DAY_DISPLAY_NAMES[entry.day].full}
                    </span>
                    {entry.completed ? (
                      <Chip
                        status="done"
                        size="xs"
                        label={completedTime ? `Done at ${completedTime}` : 'Done'}
                      />
                    ) : isToday ? (
                      <Chip status="due" size="xs" label="Due Today" />
                    ) : null}
                  </div>

                  {/* Assigned Flatmate & Actions (always right, single baseline) */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Avatar
                        src={assignedUser?.avatar || ''}
                        name={assignedUser?.name || 'Unassigned'}
                        flag={assignedUser?.flag || ''}
                        size="sm"
                      />
                      <span className="text-xs font-bold text-[#1F2430] truncate max-w-[92px] sm:max-w-[140px]">
                        {assignedUser?.name || 'Unassigned'} {isMe && '(You)'}
                      </span>
                    </div>

                    {/* Tactile Circular Action Buttons */}
                    <div className="flex items-center gap-1.5 pl-2 border-l border-[#E6E8EE] shrink-0">
                      <button
                        type="button"
                        onClick={() => handleInitiateSwap(entry.day)}
                        disabled={updating}
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                          isSelectedForSwap
                            ? 'bg-amber-500 text-white hover:bg-amber-600'
                            : 'bg-[#F4F6FA] hover:bg-[#E5E9F0] text-[#475569] hover:text-[#1F2430]'
                        }`}
                        title="Swap day with another flatmate"
                        aria-label={`Swap ${DAY_DISPLAY_NAMES[entry.day].full} duty`}
                      >
                        <ArrowsLeftRight weight="bold" className="w-3.5 h-3.5" />
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setReassignDayTarget(reassignDayTarget === entry.day ? null : entry.day)}
                          disabled={updating}
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                            reassignDayTarget === entry.day
                              ? 'bg-[#1F2430] text-white'
                              : 'bg-[#F4F6FA] hover:bg-[#E5E9F0] text-[#475569] hover:text-[#1F2430]'
                          }`}
                          title="Admin: Reassign flatmate"
                          aria-label={`Reassign ${DAY_DISPLAY_NAMES[entry.day].full} duty`}
                        >
                          <UserSwitch weight="bold" className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Custom day note or today's Mark Finished CTA */}
                {((entry.notes && entry.notes.trim().length > 0) || (isToday && isMe && !entry.completed)) && (
                  <div className="mt-2 pt-2 border-t border-[#F1F3F8] flex items-center justify-between gap-2 text-xs text-[#64748B]">
                    {entry.notes ? (
                      <span className="truncate">{entry.notes}</span>
                    ) : (
                      <span />
                    )}

                    {isToday && isMe && !entry.completed && (
                      <button
                        type="button"
                        disabled={updating}
                        onClick={async () => {
                          if (updating || entry.completed) return;
                          setUpdating(true);
                          sound.playSuccess();
                          try {
                            await onCompleteTodayDuty(entry.day);
                            showToast('Duty day marked complete! Great work keeping the flat tidy.', 'success');
                          } catch {
                            showToast('Could not update duty status', 'error');
                          } finally {
                            setUpdating(false);
                          }
                        }}
                        className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors cursor-pointer shrink-0"
                      >
                        {updating ? 'Finishing...' : 'Mark Finished'}
                      </button>
                    )}
                  </div>
                )}

                {/* Admin Quick Reassign Picker */}
                {reassignDayTarget === entry.day && (
                  <div className="mt-3 p-2.5 rounded-xl bg-[#F7F8FB] border-2 border-[#E6E8EE] space-y-2">
                    <span className="text-[11px] font-bold text-[#64748B] block uppercase tracking-wider">
                      Reassign {DAY_DISPLAY_NAMES[entry.day].full} to:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {roommates.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleSelectReassign(entry.day, r.id)}
                          className={`p-2 min-h-[44px] rounded-xl border-2 border-b-4 text-xs font-bold flex items-center gap-1.5 transition-[transform,background-color,border-color] duration-150 active:translate-y-[2px] cursor-pointer ${
                            entry.assignedUserId === r.id
                              ? 'bg-[#1F2430] text-white border-[#1F2430] shadow-2xs'
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
