import React, { useState } from 'react';
import { ActionCard } from '../../../components/common/ActionCard';
import { IconTile } from '../../../components/common/IconTile';
import { Button } from '../../../components/common/Button';
import { Chip } from '../../../components/common/Chip';
import { sound } from '../../../services/sound';
import { haptics } from '../../../utils/haptics';
import { Icon } from '@iconify/react';
import { UsersThree, Check, ForkKnife } from '@phosphor-icons/react';

export type DietaryTag = 'halal' | 'vegetarian' | 'vegan' | 'nut-free' | 'gluten-free';

export interface CulturalDinnerCardProps {
  hostName: string;
  cuisine: string;
  dishTitle: string;
  scheduledDay: string;
  scheduledTime: string;
  dietaryTags: DietaryTag[];
  attendeesCount?: number;
  initialAttending?: boolean;
  onRsvpChange?: (attending: boolean) => void;
}

const DIETARY_LABELS: Record<DietaryTag, { label: string; icon: string }> = {
  halal: { label: 'Halal Certified', icon: 'fluent-emoji-flat:crescent-moon' },
  vegetarian: { label: 'Vegetarian', icon: 'fluent-emoji-flat:herb' },
  vegan: { label: '100% Vegan', icon: 'fluent-emoji-flat:seedling' },
  'nut-free': { label: 'Nut-Free', icon: 'fluent-emoji-flat:peanuts' },
  'gluten-free': { label: 'Gluten-Free', icon: 'fluent-emoji-flat:sheaf-of-rice' },
};

export const CulturalDinnerCard: React.FC<CulturalDinnerCardProps> = ({
  hostName,
  cuisine,
  dishTitle,
  scheduledDay,
  scheduledTime,
  dietaryTags,
  attendeesCount = 3,
  initialAttending = false,
  onRsvpChange,
}) => {
  const [attending, setAttending] = useState(initialAttending);
  const [count, setCount] = useState(attendeesCount);

  const handleToggleRsvp = () => {
    const nextState = !attending;
    setAttending(nextState);
    setCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));

    if (nextState) {
      sound.playSuccess();
      haptics.swapAccept();
    } else {
      sound.playTap();
      haptics.tokenClink();
    }

    onRsvpChange?.(nextState);
  };

  return (
    <ActionCard
      tint="amber"
      className="contain-content card-interactive ease-spring border-2 border-b-4 border-[#F59E0B]/40"
      iconTile={
        <IconTile
          icon={<Icon icon="fluent-emoji-flat:pot-of-food" className="w-6 h-6" />}
          color="amber"
          size="md"
        />
      }
      title={
        <div className="flex items-center gap-2 flex-wrap">
          <span className="type-card-title text-[#1F2430]">
            Cultural Dinner: {dishTitle}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] text-[11px] font-black uppercase tracking-wider">
            Beta Labs
          </span>
        </div>
      }
      subtitle={`Hosted by ${hostName} (${cuisine}) • ${scheduledDay} at ${scheduledTime}`}
      detail={
        <div className="space-y-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {dietaryTags.map((tag) => (
              <Chip
                key={tag}
                label={DIETARY_LABELS[tag]?.label || tag}
                status="agreed"
                size="xs"
              />
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B]">
            <UsersThree weight="duotone" className="w-4 h-4 text-[#D97706]" />
            <span>
              {count} roommate{count === 1 ? '' : 's'} attending
            </span>
          </div>
        </div>
      }
      actions={
        <div className="w-full flex items-center justify-between gap-3 pt-1">
          <span className="text-xs text-[#64748B] font-medium">
            Shared meal rotation • dietary tags enforced
          </span>
          <Button
            variant={attending ? 'teal' : 'reward'}
            size="md"
            onClick={handleToggleRsvp}
            icon={
              attending ? (
                <Check weight="bold" className="w-4 h-4" />
              ) : (
                <ForkKnife weight="duotone" className="w-4 h-4" />
              )
            }
          >
            {attending ? "I'm In! ✓" : "RSVP / I'm In"}
          </Button>
        </div>
      }
    />
  );
};
