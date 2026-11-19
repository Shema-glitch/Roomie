import React, { useState } from 'react';
import { ActionCard } from '../../../components/common/ActionCard';
import { IconTile } from '../../../components/common/IconTile';
import { Button } from '../../../components/common/Button';
import { Chip } from '../../../components/common/Chip';
import { sound } from '../../../services/sound';
import { haptics } from '../../../utils/haptics';
import { Icon } from '@iconify/react';
import { UsersThree, Check, ForkKnife, Plus } from '@phosphor-icons/react';
import { CulturalDinner, DietaryTag, User } from '../../../types';

export interface CulturalDinnerCardProps {
  dinner?: CulturalDinner | null;
  hostName?: string;
  cuisine?: string;
  dishTitle?: string;
  scheduledDay?: string;
  scheduledTime?: string;
  dietaryTags?: DietaryTag[];
  attendeesCount?: number;
  initialAttending?: boolean;
  currentUserId?: string;
  roommates?: User[];
  onToggleRsvp?: (dinnerId: string) => Promise<void>;
  onRsvpChange?: (attending: boolean) => void;
  onOpenHostModal?: () => void;
}

const DIETARY_LABELS: Record<string, string> = {
  halal: 'Halal Certified',
  vegetarian: 'Vegetarian',
  vegan: '100% Vegan',
  nut_free: 'Nut-Free',
  'nut-free': 'Nut-Free',
  gluten_free: 'Gluten-Free',
  'gluten-free': 'Gluten-Free',
  dairy_free: 'Dairy-Free',
  'dairy-free': 'Dairy-Free',
};

export const CulturalDinnerCard: React.FC<CulturalDinnerCardProps> = ({
  dinner,
  hostName = 'Amina',
  cuisine = 'Moroccan',
  dishTitle = 'Friday Night Tagine & Couscous',
  scheduledDay = 'Friday',
  scheduledTime = '19:30',
  dietaryTags = ['halal', 'dairy_free'],
  attendeesCount,
  initialAttending,
  currentUserId,
  roommates = [],
  onToggleRsvp,
  onRsvpChange,
  onOpenHostModal,
}) => {
  const activeDish = dinner ? dinner.dishTitle : dishTitle;
  const activeCuisine = dinner ? dinner.cuisineTag : cuisine;
  const activeDate = dinner ? dinner.scheduledDate : scheduledDay;
  const activeTags: DietaryTag[] = dinner ? dinner.dietaryTags : dietaryTags;

  const resolvedHost = dinner && roommates.length > 0
    ? roommates.find((r) => r.id === dinner.hostUserId)?.name.split(' ')[0] || hostName
    : hostName;

  const isUserAttending = dinner && currentUserId
    ? dinner.rsvpUserIds?.includes(currentUserId)
    : (initialAttending ?? false);

  const [attending, setAttending] = useState(isUserAttending);
  const [isUpdating, setIsUpdating] = useState(false);

  const rsvpCount = dinner
    ? (dinner.rsvpUserIds?.length || 0)
    : (attendeesCount ?? 3);

  const handleToggleRsvp = async () => {
    const nextState = !attending;
    setAttending(nextState);

    if (nextState) {
      sound.playSuccess();
      haptics.swapAccept();
    } else {
      sound.playTap();
      haptics.tokenClink();
    }

    onRsvpChange?.(nextState);

    if (dinner && onToggleRsvp) {
      setIsUpdating(true);
      try {
        await onToggleRsvp(dinner.id);
      } finally {
        setIsUpdating(false);
      }
    }
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
            Cultural Dinner: {activeDish}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#9A6700] text-xs font-black uppercase tracking-wider">
            Beta Labs
          </span>
        </div>
      }
      subtitle={`Hosted by ${resolvedHost} (${activeCuisine}) • ${activeDate} ${dinner ? '' : `at ${scheduledTime}`}`}
      detail={
        <div className="space-y-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {activeTags.map((tag) => (
              <Chip
                key={tag}
                label={DIETARY_LABELS[tag] || tag}
                status="agreed"
                size="xs"
              />
            ))}
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B]">
              <UsersThree weight="duotone" className="w-4 h-4 text-[#D97706]" />
              <span>
                {rsvpCount} roommate{rsvpCount === 1 ? '' : 's'} attending
              </span>
            </div>

            {onOpenHostModal && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  sound.playTap();
                  haptics.tokenClink();
                  onOpenHostModal();
                }}
                className="text-xs font-bold text-[#9A6700] hover:text-[#78350F] flex items-center gap-1 transition-colors"
              >
                <Plus weight="bold" className="w-3.5 h-3.5" />
                <span>Host another</span>
              </button>
            )}
          </div>
        </div>
      }
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant={attending ? 'green' : 'reward'}
            size="sm"
            onClick={handleToggleRsvp}
            loading={isUpdating}
            icon={attending ? <Check weight="bold" className="w-4 h-4" /> : <ForkKnife weight="duotone" className="w-4 h-4" />}
          >
            {attending ? 'Attending' : "I'm In"}
          </Button>
        </div>
      }
    />
  );
};
