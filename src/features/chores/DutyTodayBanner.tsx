import React from 'react';
import { DutySchedule, User, DayOfWeek } from '../../types';
import { getTodayDuty, DAY_DISPLAY_NAMES } from '../../utils/dutyRotation';
import { Avatar } from '../../components/common/Avatar';
import { Calendar, CheckCircle } from '@phosphor-icons/react';
import { Icon } from '@iconify/react';
import { Chip } from '../../components/common/Chip';
import { sound } from '../../services/sound';
import { useToast } from '../../components/common/Toast';

interface DutyTodayBannerProps {
  dutySchedule: DutySchedule | null;
  roommates: User[];
  currentUser: User;
  onOpenTimetable: () => void;
  onCompleteTodayDuty?: (day: DayOfWeek) => Promise<void>;
  className?: string;
}

export const DutyTodayBanner: React.FC<DutyTodayBannerProps> = ({
  dutySchedule,
  roommates,
  currentUser,
  onOpenTimetable,
  onCompleteTodayDuty,
  className = '',
}) => {
  const { showToast } = useToast();
  if (!dutySchedule) return null;

  const duty = getTodayDuty(dutySchedule, roommates, currentUser.id);
  if (!duty) return null;

  const { entry, user, isMe, day } = duty;
  const dayName = DAY_DISPLAY_NAMES[day].full;

  const handleFinish = async () => {
    if (!onCompleteTodayDuty) return;
    sound.playSuccess();
    try {
      await onCompleteTodayDuty(day);
      showToast('Duty day finished! The flat salutes you! 🎉', 'success');
    } catch {
      showToast('Could not update status', 'error');
    }
  };

  if (isMe) {
    return (
      <div
        className={`p-4 rounded-2xl bg-gradient-to-r from-[#FFF5F2] via-[#FFF0ED] to-[#FFF9E6] border-2 border-[#FFD7CF] shadow-xs flex flex-col gap-3 ${className}`}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FF6B4A] flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5">
            <Icon icon="fluent-emoji-flat:broom" className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="font-heading font-semibold text-sm text-[#1F2430]">
                  You are Today&apos;s Duty Captain
                </h4>
                <span className="text-xs text-[#64748B]" aria-hidden="true">·</span>
                <span className="text-xs font-medium text-[#64748B]">{dayName}</span>
              </div>
              <Chip
                status={entry.completed ? 'done' : 'due'}
                size="xs"
                label={entry.completed ? 'Done' : 'Due Today'}
              />
            </div>
            <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
              {entry.notes || 'Handle common area mopping, kitchen tidy, and trash.'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#FFD7CF]/60">
          {!entry.completed && onCompleteTodayDuty && (
            <button
              type="button"
              onClick={handleFinish}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" weight="fill" />
              <span>Mark Finished</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              onOpenTimetable();
            }}
            className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#F7F8FB] border border-[#E6E8EE] text-xs font-bold text-[#1F2430] transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
          >
            <Calendar className="w-3.5 h-3.5 text-[#FF6B4A]" />
            <span>Timetable</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-3.5 rounded-2xl bg-white border border-[#E6E8EE] shadow-2xs flex flex-col gap-2.5 ${className}`}
    >
      <div className="flex items-start gap-3">
        <Avatar
          src={user?.avatar || ''}
          name={user?.name || 'Flatmate'}
          flag={user?.flag || ''}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-[#64748B]">Today&apos;s Flat Captain:</span>
              <span className="font-heading font-semibold text-sm text-[#1F2430]">
                {user?.name || 'Roomie'}
              </span>
              <span className="text-xs text-[#64748B]" aria-hidden="true">·</span>
              <span className="text-xs text-[#64748B]">{dayName}</span>
            </div>
            {entry.completed && (
              <Chip status="done" size="xs" label="Done" />
            )}
          </div>
          <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
            {entry.completed
              ? `${user?.name || 'Roomie'} finished today's flat duties.`
              : `${user?.name || 'Roomie'} is on duty today. Be kind and keep shared spaces tidy.`}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end pt-1.5 border-t border-[#F1F3F8]">
        <button
          type="button"
          onClick={() => {
            sound.playTap();
            onOpenTimetable();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F7F8FB] hover:bg-[#EEF0FD] border border-[#E6E8EE] text-xs font-bold text-[#1F2430] transition-colors cursor-pointer"
        >
          <Calendar className="w-3.5 h-3.5 text-[#5B5BD6]" />
          <span>Timetable</span>
        </button>
      </div>
    </div>
  );
};
