import React from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { ActionCard } from '../../components/common/ActionCard';
import { IconTile } from '../../components/common/IconTile';
import { Household } from '../../types';
import { Building2, Plus, UserPlus, Check } from 'lucide-react';

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
      title="Switch Apartment"
      subtitle="You can belong to multiple student apartments"
    >
      <div className="space-y-3.5">
        {households.map((h) => {
          const isActive = h.id === activeHouseholdId;
          return (
            <ActionCard
              key={h.id}
              tint={isActive ? 'coral' : 'neutral'}
              iconTile={
                <IconTile
                  icon={<Building2 className="w-6 h-6" />}
                  color={isActive ? 'coral' : 'slate'}
                  size="md"
                />
              }
              title={h.name}
              subtitle={`Code: ${h.inviteCode} • Currency: ${h.currency}`}
              badge={
                isActive ? (
                  <div className="w-7 h-7 rounded-full bg-[#FF6B4A] text-white flex items-center justify-center shadow-xs">
                    <Check className="w-4 h-4" />
                  </div>
                ) : undefined
              }
              onClick={() => {
                onSelectHousehold(h.id);
                onClose();
              }}
              className="cursor-pointer"
            />
          );
        })}

        {/* Equal choices styled as equal secondary tactile buttons */}
        <div className="pt-4 border-t border-[#E6E8EE] flex flex-col gap-3">
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => {
              onClose();
              onCreateNew();
            }}
            icon={<Plus className="w-4 h-4 text-[#FF6B4A]" />}
          >
            Create New Apartment
          </Button>

          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => {
              onClose();
              onJoinWithCode();
            }}
            icon={<UserPlus className="w-4 h-4 text-[#5B5BD6]" />}
          >
            Join with Code or QR
          </Button>
        </div>
      </div>
    </Modal>
  );
};
