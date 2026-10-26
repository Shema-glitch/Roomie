import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { MascotView } from '../../components/common/MascotView';
import { Plane, Calendar, Check, AlertCircle } from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface AwayModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAway: boolean;
  onSetAway: (days: number | null) => Promise<void>;
}

export const AwayModeModal: React.FC<AwayModeModalProps> = ({
  isOpen,
  onClose,
  isAway,
  onSetAway,
}) => {
  const { showToast } = useToast();
  const [days, setDays] = useState<number>(7);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (enable: boolean) => {
    setLoading(true);
    try {
      await onSetAway(enable ? days : null);
      showToast(
        enable
          ? `Away mode enabled for ${days} days! Chores paused.`
          : 'Welcome back! You are active for chores again.',
        'info'
      );
      onClose();
    } catch {
      showToast('Could not update away status', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Away Mode"
      subtitle="Travel, exam season, or visiting family"
    >
      <div className="flex flex-col items-center text-center space-y-4">
        <MascotView
          state={isAway ? 'sleepy' : 'calm'}
          size="md"
          bubbleText={isAway ? 'Safe travels! ✈️' : 'Pause your chores'}
        />

        <p className="type-secondary leading-relaxed">
          While Away Mode is on, you won't be assigned new chores in draft rounds, and your pending tasks are safely paused without hurting your streaks.
        </p>

        {!isAway ? (
          <div className="w-full space-y-3">
            <label className="type-label block text-left">
              Days away:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[3, 7, 14].map((d) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => setDays(d)}
                  className={`py-2.5 rounded-2xl border text-[14px] font-bold transition-all cursor-pointer ${
                    days === d
                      ? 'border-[#FF6B4A] bg-[#FFF0ED] text-[#FF6B4A]'
                      : 'border-[#E6E8EE] bg-white text-[#64748B]'
                  }`}
                >
                  {d} Days
                </button>
              ))}
            </div>

            <Button
              variant="primary"
              size="md"
              fullWidth
              disabled={loading}
              onClick={() => handleToggle(true)}
              icon={<Plane className="w-4 h-4" />}
            >
              {loading ? 'Activating...' : `Activate (${days} days)`}
            </Button>
          </div>
        ) : (
          <div className="w-full space-y-3">
            <div className="p-3 bg-[#E6FAF8] border border-[#BBEFEA] rounded-2xl text-[14px] font-bold text-[#138E82]">
              🌴 You are currently in Away Mode.
            </div>
            <Button
              variant="secondary"
              size="md"
              fullWidth
              disabled={loading}
              onClick={() => handleToggle(false)}
            >
              Resume chores
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
