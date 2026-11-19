import React, { useState } from 'react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { Card } from '../../../components/common/Card';
import { Chip } from '../../../components/common/Chip';
import { User, DietaryTag, DIETARY_BADGES, CulturalDinner } from '../../../types';
import { sound } from '../../../services/sound';
import { haptics } from '../../../utils/haptics';
import { Icon } from '@iconify/react';
import {
  ForkKnife,
  CalendarBlank,
  UsersThree,
  Check,
  Sparkle,
  ShieldCheck,
  Heart,
  GlobeHemisphereWest,
} from '@phosphor-icons/react';

export interface CulturalDinnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  roommates: User[];
  onScheduleDinner: (params: {
    dishTitle: string;
    cuisineTag: string;
    scheduledDate: string;
    dietaryTags: DietaryTag[];
  }) => Promise<void>;
  onUpdateDietaryPreferences: (tags: DietaryTag[]) => Promise<void>;
  existingDinner?: CulturalDinner | null;
}

export const CulturalDinnerModal: React.FC<CulturalDinnerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  roommates,
  onScheduleDinner,
  onUpdateDietaryPreferences,
  existingDinner,
}) => {
  const [activeTab, setActiveTab] = useState<'host' | 'dietary'>('host');

  // Host form states
  const [dishTitle, setDishTitle] = useState('');
  const [cuisineTag, setCuisineTag] = useState('');
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [selectedTags, setSelectedTags] = useState<DietaryTag[]>(['halal']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // User dietary preference states
  const [userDietaryTags, setUserDietaryTags] = useState<DietaryTag[]>(
    currentUser.dietaryTags || []
  );
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  if (!isOpen) return null;

  const handleToggleTag = (tag: DietaryTag) => {
    sound.playTap();
    haptics.tokenClink();
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleToggleUserPref = (tag: DietaryTag) => {
    sound.playTap();
    haptics.tokenClink();
    if (userDietaryTags.includes(tag)) {
      setUserDietaryTags(userDietaryTags.filter((t) => t !== tag));
    } else {
      setUserDietaryTags([...userDietaryTags, tag]);
    }
  };

  const handleSubmitHost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishTitle.trim()) {
      setErrorMsg('Please name the dish you plan to cook.');
      return;
    }
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      await onScheduleDinner({
        dishTitle: dishTitle.trim(),
        cuisineTag: cuisineTag.trim() || 'Home Recipe',
        scheduledDate,
        dietaryTags: selectedTags,
      });
      sound.awardCelebrate();
      haptics.awardCelebrate();
      onClose();
    } catch {
      setErrorMsg('Failed to schedule dinner. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDietaryPrefs = async () => {
    setIsSavingPrefs(true);
    try {
      await onUpdateDietaryPreferences(userDietaryTags);
      sound.playSuccess();
      haptics.swapAccept();
    } finally {
      setIsSavingPrefs(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Dinner Night"
      subtitle="Plan a shared meal & check dietary needs"
    >
      <div className="space-y-4 py-1">
        {/* Tab Switcher */}
        <div className="flex rounded-2xl bg-[#F0F2F6] p-1 border border-[#E6E8EE]">
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              haptics.tokenClink();
              setActiveTab('host');
            }}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 ${
              activeTab === 'host'
                ? 'bg-white text-[#1F2430] shadow-sm'
                : 'text-[#64748B] hover:text-[#1F2430]'
            }`}
          >
            <ForkKnife weight="duotone" className="w-4 h-4 text-[#FF6B4A]" />
            <span>Host a Dinner</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              haptics.tokenClink();
              setActiveTab('dietary');
            }}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 ${
              activeTab === 'dietary'
                ? 'bg-white text-[#1F2430] shadow-sm'
                : 'text-[#64748B] hover:text-[#1F2430]'
            }`}
          >
            <ShieldCheck weight="duotone" className="w-4 h-4 text-[#10B981]" />
            <span>Dietary Profile ({roommates.length})</span>
          </button>
        </div>

        {/* Tab 1: Host a Dinner */}
        {activeTab === 'host' && (
          <form onSubmit={handleSubmitHost} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-[#FFF5F5] border border-[#FEB2B2] text-xs text-[#E53E3E] font-bold">
                {errorMsg}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="type-label block mb-1">Dish Title</label>
                <input
                  type="text"
                  placeholder="e.g. Japanese Katsu Curry, Moroccan Tagine"
                  value={dishTitle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDishTitle(e.target.value)}
                  maxLength={100}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E6E8EE] bg-white text-xs font-semibold text-[#1F2430] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#FF6B4A]/40 focus:border-[#FF6B4A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="type-label block mb-1">Cuisine / Origin</label>
                  <input
                    type="text"
                    placeholder="e.g. Japanese, Italian, Turkish"
                    value={cuisineTag}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCuisineTag(e.target.value)}
                    maxLength={40}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E6E8EE] bg-white text-xs font-semibold text-[#1F2430] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#FF6B4A]/40 focus:border-[#FF6B4A]"
                  />
                </div>
                <div>
                  <label className="type-label block mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScheduledDate(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E6E8EE] bg-white text-xs font-semibold text-[#1F2430] focus:outline-none focus:ring-2 focus:ring-[#FF6B4A]/40 focus:border-[#FF6B4A]"
                  />
                </div>
              </div>

              {/* Dietary Badges */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-[#1F2430] flex items-center justify-between">
                  <span>Dietary Accommodations</span>
                  <span className="text-xs text-[#4B5063] font-normal">Select all that apply</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {DIETARY_BADGES.map((b) => {
                    const isSelected = selectedTags.includes(b.id);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => handleToggleTag(b.id)}
                        className={`tactile-press px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border-2 flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-[#10B981]/15 border-[#10B981] text-[#047857]'
                            : 'bg-white border-[#E6E8EE] text-[#475569] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        {isSelected && <Check weight="bold" className="w-3.5 h-3.5" />}
                        <span>{b.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Roommate Diets Notice Card */}
              <Card padding="sm" className="bg-[#FEF3C7]/40 border border-[#F59E0B]/30 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-black text-[#92400E]">
                  <Sparkle weight="fill" className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>Flatmates Dietary Preferences</span>
                </div>
                <p className="text-xs text-[#78350F] leading-relaxed">
                  {roommates
                    .filter((r) => r.dietaryTags && r.dietaryTags.length > 0)
                    .map((r) => `${r.name.split(' ')[0]} (${r.dietaryTags?.join(', ')})`)
                    .join(' • ') || 'No roommates have registered dietary restrictions yet.'}
                </p>
              </Card>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting}
              icon={<Icon icon="fluent-emoji-flat:pot-of-food" className="w-5 h-5" />}
            >
              Schedule dinner
            </Button>
          </form>
        )}

        {/* Tab 2: Dietary Profile & Flatmate Needs */}
        {activeTab === 'dietary' && (
          <div className="space-y-4">
            {/* Current user's own preferences */}
            <div className="space-y-2 p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-[#1F2033]">My Dietary Profile</h4>
                  <p className="text-xs text-[#4B5063]">
                    Let flatmates know what you eat so dinners are always safe.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  loading={isSavingPrefs}
                  onClick={handleSaveDietaryPrefs}
                >
                  Save Profile
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {DIETARY_BADGES.map((b) => {
                  const isSelected = userDietaryTags.includes(b.id);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleToggleUserPref(b.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#10B981] border-[#10B981] text-white shadow-sm'
                          : 'bg-white border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      {isSelected && <Check weight="bold" className="w-3.5 h-3.5 text-white" />}
                      <span>{b.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Flatmates Dietary Roster */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-[#1F2430] uppercase tracking-wider">
                Household Dietary Overview
              </h4>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                {roommates.map((r) => (
                  <div
                    key={r.id}
                    className="p-2.5 rounded-xl bg-white border border-[#E6E8EE] flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={r.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                        alt={r.name}
                        className="w-7 h-7 rounded-full object-cover shrink-0"
                      />
                      <span className="font-bold text-[#1F2430] truncate">{r.name}</span>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap shrink-0">
                      {r.dietaryTags && r.dietaryTags.length > 0 ? (
                        r.dietaryTags.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-lg bg-[#EBF9F0] text-[#0F7A3D] font-bold text-xs"
                          >
                            {t}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-[#4B5063]">No restrictions</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
