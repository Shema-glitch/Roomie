import React from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Household } from '../../types';
import { THEME } from '../../theme/tokens';
import { Home, Plus, KeyRound, Check, Shield } from 'lucide-react';

interface HouseholdSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  households: Household[];
  activeHouseholdId: string;
  onSelectHousehold: (householdId: string) => void;
  onCreateNew: () => void;
  onJoinWithCode: () => void;
}

export const HouseholdSwitcherModal: React.FC<HouseholdSwitcherModalProps> = ({
  isOpen,
  onClose,
  households,
  activeHouseholdId,
  onSelectHousehold,
  onCreateNew,
  onJoinWithCode,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Switch Household"
      subtitle="You can belong to multiple student flats"
    >
      <div className="space-y-3">
        {households.map((h) => {
          const isActive = h.id === activeHouseholdId;
          return (
            <div
              key={h.id}
              onClick={() => {
                onSelectHousehold(h.id);
                onClose();
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                isActive
                  ? 'border-[#FF6B4A] bg-[#FFF0ED]/40 shadow-xs'
                  : 'border-[#E6E8EE] bg-white hover:border-[#CBD5E1]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: isActive ? THEME.colors.primary : '#F1F3F9',
                    color: isActive ? '#FFFFFF' : THEME.colors.ink,
                  }}
                >
                  <Home className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-base text-[#1F2430]">
                    {h.name}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                    <span>Code: {h.inviteCode}</span>
                    <span>•</span>
                    <span>Currency: {h.currency}</span>
                  </div>
                </div>
              </div>
              {isActive && (
                <div className="w-6 h-6 rounded-full bg-[#FF6B4A] text-white flex items-center justify-center">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              )}
            </div>
          );
        })}

        <div className="pt-3 border-t border-[#E6E8EE] flex flex-col gap-2">
          <Button
            variant="outline"
            size="md"
            fullWidth
            onClick={() => {
              onClose();
              onCreateNew();
            }}
            icon={<Plus className="w-4 h-4 text-[#FF6B4A]" />}
          >
            Create New Household
          </Button>

          <Button
            variant="ghost"
            size="md"
            fullWidth
            onClick={() => {
              onClose();
              onJoinWithCode();
            }}
            icon={<KeyRound className="w-4 h-4 text-[#5B5BD6]" />}
          >
            Join with Code or QR
          </Button>
        </div>
      </div>
    </Modal>
  );
};
