import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Avatar } from '../../components/common/Avatar';
import { AnimatedNumber } from '../../components/common/AnimatedNumber';
import { IconTile } from '../../components/common/IconTile';
import { User, UserSettings } from '../../types';
import { sound, isSoundEnabled, setSoundEnabled } from '../../services/sound';
import { haptics, isHapticsEnabled, setHapticsEnabled } from '../../utils/haptics';
import {
  Camera,
  UploadSimple,
  SpeakerHigh,
  SpeakerSlash,
  Vibrate,
  Eye,
  Bell,
  Globe,
  DownloadSimple,
  Trash,
  ChatCircleText,
  PencilSimple,
  SignOut,
  Warning,
  Check,
  X,
  WarningCircle,
  DeviceMobile,
  Lightning,
  Bug,
  Flask,
  ForkKnife,
  Sparkle,
} from '@phosphor-icons/react';
import { useToast } from '../../components/common/Toast';
import { Icon } from '@iconify/react';
import { processPhoto } from '../../utils/photoPipeline';
import { uploadPhotoToStorage } from '../../services/supabase';
import { getFeatureFlags, setFeatureFlag } from '../../config/featureFlags';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  settings: UserSettings;
  onUpdateSettings: (updates: Partial<UserSettings>) => Promise<UserSettings>;
  onUpdateProfile?: (updates: Partial<User>) => Promise<User>;
  onExportData: () => void;
  onDeleteAccount: () => void;
  onSignOut?: (options?: { keepSavedLogin?: boolean }) => void;
  isLoginSaved?: boolean;
  onToggleSaveLogin?: (save: boolean) => Promise<boolean>;
  onOpenFeedback: () => void;
  onOpenHowItWorks?: () => void;
  onOpenShowcase?: () => void;
  onOpenHouseholdSetup?: () => void;
  onOpenDebugInspector?: () => void;
}

const PRESET_AVATARS = [
  { label: 'Kai', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { label: 'Amina', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' },
  { label: 'Lucas', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { label: 'Yasmin', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
  { label: 'Tariq', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
];

interface SettingsRowToggleProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}

const SettingsRowToggle: React.FC<SettingsRowToggleProps> = ({
  checked,
  onChange,
  label,
  disabled,
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        sound.playTap();
        haptics.tokenClink();
        onChange();
      }}
      className={`w-12 h-7 rounded-full border-2 border-b-3 transition-all relative shrink-0 cursor-pointer active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-[#FF6B4A] border-[#D94E30]' : 'bg-[#E6E8EE] border-[#CBD5E1]'
      }`}
    >
      <span
        className={`w-5 h-5 rounded-full bg-white shadow-xs absolute top-0.5 transition-transform ${
          checked ? 'right-0.5' : 'left-0.5'
        }`}
      />
    </button>
  );
};

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  settings,
  onUpdateSettings,
  onUpdateProfile,
  onExportData,
  onDeleteAccount,
  onSignOut,
  isLoginSaved = false,
  onToggleSaveLogin,
  onOpenFeedback,
  onOpenHowItWorks,
  onOpenShowcase,
  onOpenHouseholdSetup,
  onOpenDebugInspector,
}) => {
  const { showToast } = useToast();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [signOutPromptOpen, setSignOutPromptOpen] = useState(false);
  const [loginSaved, setLoginSaved] = useState(Boolean(isLoginSaved));
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Edit profile form state
  const [editName, setEditName] = useState(currentUser.name);
  const [editCountry, setEditCountry] = useState(currentUser.country);
  const [editFlag, setEditFlag] = useState(currentUser.flag);
  const [editAvatar, setEditAvatar] = useState(currentUser.avatar);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'account'>('profile');
  const avatarFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingAvatar(true);
      sound.playPop();
      const processed = await processPhoto(file);
      const fileName = `avatar_${currentUser.id}_${Date.now()}.jpg`;
      const finalUrl = await uploadPhotoToStorage('avatars', fileName, processed.fullBlob, processed.fullDataUrl);
      setEditAvatar(finalUrl);
      sound.playSuccess();
      showToast('Custom photo avatar attached!', 'reward');
    } catch {
      showToast('Could not process avatar photo', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };
  const [devModeUnlocked, setDevModeUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('roomie_dev_mode') === 'true';
    }
    return false;
  });
  const [culturalDinnersBeta, setCulturalDinnersBeta] = useState<boolean>(
    () => getFeatureFlags().culturalDinnersBeta
  );
  const [roomieWrappedBeta, setRoomieWrappedBeta] = useState<boolean>(
    () => getFeatureFlags().roomieWrappedBeta
  );
  const [versionTapCount, setVersionTapCount] = useState(0);

  const handleVersionTap = () => {
    sound.playPop();
    const nextCount = versionTapCount + 1;
    if (nextCount >= 5) {
      const nextUnlocked = !devModeUnlocked;
      setDevModeUnlocked(nextUnlocked);
      setVersionTapCount(0);
      if (typeof window !== 'undefined') {
        localStorage.setItem('roomie_dev_mode', String(nextUnlocked));
      }
      if (nextUnlocked) {
        sound.playCelebration();
        showToast('Developer & Debug mode unlocked!', 'reward');
      } else {
        showToast('Developer mode hidden', 'info');
      }
    } else {
      setVersionTapCount(nextCount);
      if (nextCount >= 2) {
        showToast(`${5 - nextCount} more taps to ${devModeUnlocked ? 'hide' : 'unlock'} Developer tools`, 'info');
      }
    }
  };

  const toggleSound = async () => {
    const current = settings.soundEnabled ?? isSoundEnabled();
    const next = !current;
    setSoundEnabled(next);
    if (next) sound.awardCelebrate();
    await onUpdateSettings({ soundEnabled: next });
    showToast(next ? 'Sound effects enabled' : 'Sound effects muted', 'info');
  };

  const toggleHaptics = async () => {
    const currentHaptics = settings.hapticsEnabled ?? isHapticsEnabled();
    const next = !currentHaptics;
    setHapticsEnabled(next);
    if (next) haptics.awardCelebrate();
    await onUpdateSettings({ hapticsEnabled: next });
    showToast(next ? 'Haptic vibration enabled' : 'Haptic vibration muted', 'info');
  };

  const toggleReducedMotion = async () => {
    const next = !settings.reducedMotion;
    await onUpdateSettings({ reducedMotion: next });
    if (typeof document !== 'undefined') {
      if (next) {
        document.documentElement.classList.add('reduce-motion');
      } else {
        document.documentElement.classList.remove('reduce-motion');
      }
    }
    showToast(next ? 'Reduced motion enabled' : 'Smooth motion restored', 'info');
  };

  const togglePush = async () => {
    const next = !settings.pushNotifications;
    await onUpdateSettings({ pushNotifications: next });
    showToast(next ? 'Push notifications active' : 'Push notifications paused', 'info');
  };

  const handleLanguageChange = async (lang: 'en' | 'tr' | 'fr' | 'ar') => {
    await onUpdateSettings({ language: lang });
    if (typeof document !== 'undefined') {
      if (lang === 'ar') {
        document.documentElement.setAttribute('dir', 'rtl');
        document.documentElement.setAttribute('lang', 'ar');
      } else {
        document.documentElement.setAttribute('dir', 'ltr');
        document.documentElement.setAttribute('lang', lang);
      }
    }
    showToast(
      `Language set to ${
        lang === 'en' ? 'English' : lang === 'tr' ? 'Türkçe' : lang === 'fr' ? 'Français' : 'العربية'
      }`,
      'info'
    );
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setSavingProfile(true);
    try {
      if (onUpdateProfile) {
        await onUpdateProfile({
          name: editName.trim(),
          country: editCountry.trim(),
          flag: editFlag.trim() || '🌍',
          avatar: editAvatar,
        });
      }
      setIsEditingProfile(false);
      showToast('Profile updated', 'info');
    } catch {
      showToast('Could not save profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleInstallApp = () => {
    sound.playTap();
    if (typeof window !== 'undefined' && window.deferredPrompt) {
      window.deferredPrompt.prompt();
      window.deferredPrompt.userChoice.then(() => {
        window.deferredPrompt = null;
      });
    } else {
      showToast('Tap Share in Safari / Menu in Chrome and choose "Add to Home Screen"', 'info');
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Profile & Settings"
        subtitle="Manage your identity, roomie habits and account"
      >
        <div className="space-y-4">
          {/* Segmented Pill Navigation with Sliding Indicator */}
          <div className="relative grid grid-cols-3 p-1 bg-[#EEF0F6] rounded-2xl border-2 border-[#E2E5EC]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(33.333%-2.67px)] rounded-xl bg-white shadow-2xs border border-[#CBD5E1] transition-transform duration-250 ease-spring will-change-transform motion-reduce:transition-none"
              style={{
                transform: `translate3d(${
                  activeTab === 'profile' ? 0 : activeTab === 'preferences' ? 100 : 200
                }%, 0, 0)`,
              }}
            />
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setActiveTab('profile');
              }}
              className={`relative z-10 py-2 rounded-xl text-[13px] sm:text-[14px] font-heading font-black transition-colors duration-150 cursor-pointer ${
                activeTab === 'profile'
                  ? 'text-[#1F2430]'
                  : 'text-[#64748B] hover:text-[#1F2430]'
              }`}
            >
              Profile
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setActiveTab('preferences');
              }}
              className={`relative z-10 py-2 rounded-xl text-[13px] sm:text-[14px] font-heading font-black transition-colors duration-150 cursor-pointer ${
                activeTab === 'preferences'
                  ? 'text-[#1F2430]'
                  : 'text-[#64748B] hover:text-[#1F2430]'
              }`}
            >
              Preferences
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setActiveTab('account');
              }}
              className={`relative z-10 py-2 rounded-xl text-[13px] sm:text-[14px] font-heading font-black transition-colors duration-150 cursor-pointer ${
                activeTab === 'account'
                  ? 'text-[#1F2430]'
                  : 'text-[#64748B] hover:text-[#1F2430]'
              }`}
            >
              Account
            </button>
          </div>
          {/* TAB 1: PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {!isEditingProfile ? (
            <Card padding="md" variant="calm" className="flex items-center justify-between gap-3 bg-[#F7F8FB]">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar
                  src={currentUser.avatar}
                  name={currentUser.name}
                  flag={currentUser.flag}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="type-section-heading truncate">
                    {currentUser.name}
                  </h4>
                  <p className="type-secondary truncate" title={currentUser.email}>{currentUser.email}</p>
                  <div className="flex items-center gap-1.5 mt-1 type-secondary text-[#1F2430] flex-wrap">
                    <span className="truncate">{currentUser.country} {currentUser.flag}</span>
                    <span className="shrink-0">•</span>
                    <span className="text-[#FF6B4A] font-bold shrink-0">
                      <AnimatedNumber value={currentUser.points} suffix=" pts" />
                    </span>
                    <span className="shrink-0">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        haptics.tokenClink();
                        sound.tokenClink();
                      }}
                      className="text-[#B45309] font-black text-xs shrink-0 bg-[#FEF3C7] px-2 py-0.5 rounded-full border border-[#FDE68A] inline-flex items-center gap-1 active:scale-95 transition-transform cursor-pointer"
                    >
                      <Icon icon="fluent-emoji-flat:coin" className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        <AnimatedNumber value={currentUser.favorTokens ?? 5} suffix=" tokens" />
                      </span>
                    </button>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  sound.playTap();
                  setEditName(currentUser.name);
                  setEditCountry(currentUser.country);
                  setEditFlag(currentUser.flag);
                  setEditAvatar(currentUser.avatar);
                  setIsEditingProfile(true);
                }}
                icon={<PencilSimple className="w-3.5 h-3.5" />}
              >
                Edit
              </Button>
            </Card>
          ) : (
            <form onSubmit={handleSaveProfile} className="p-4 rounded-2xl border-2 border-[#19B5A5] bg-[#E6FAF8]/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="type-label text-[#138E82] font-bold">Edit profile</span>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="type-secondary hover:text-[#1F2430] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="type-label block mb-1">Full name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E6E8EE] bg-white text-[14px] font-bold focus:outline-none focus:border-[#FF6B4A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="type-label block mb-1">Country</label>
                  <input
                    type="text"
                    value={editCountry}
                    onChange={(e) => setEditCountry(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6E8EE] bg-white text-[14px] focus:outline-none focus:border-[#FF6B4A]"
                  />
                </div>
                <div>
                  <label className="type-label block mb-1">Flag</label>
                  <input
                    type="text"
                    value={editFlag}
                    onChange={(e) => setEditFlag(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6E8EE] bg-white text-[14px] focus:outline-none focus:border-[#FF6B4A]"
                  />
                </div>
              </div>

              <div>
                <label className="type-label block mb-1.5">Your Photo or Avatar</label>
                <input
                  ref={avatarFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                />
                <div className="flex items-center gap-2.5 overflow-x-auto py-1.5">
                  {/* Custom Photo Button */}
                  <button
                    type="button"
                    disabled={uploadingAvatar}
                    onClick={() => avatarFileInputRef.current?.click()}
                    className="w-12 h-12 rounded-full border-2 border-dashed border-[#FF6B4A] bg-[#FFF5F2] hover:bg-[#FFEAE4] flex flex-col items-center justify-center text-[#FF6B4A] shrink-0 active:scale-95 transition-all cursor-pointer shadow-2xs"
                    title="Upload custom photo or selfie"
                  >
                    {uploadingAvatar ? (
                      <UploadSimple className="w-5 h-5 animate-bounce" />
                    ) : (
                      <Camera className="w-5 h-5" weight="bold" />
                    )}
                  </button>

                  {/* Preset Avatars */}
                  {PRESET_AVATARS.map((p) => (
                    <button
                      type="button"
                      key={p.label}
                      onClick={() => {
                        sound.playPop();
                        setEditAvatar(p.url);
                      }}
                      className={`relative rounded-full p-0.5 transition-all cursor-pointer shrink-0 ${
                        editAvatar === p.url ? 'ring-2 ring-[#FF6B4A] scale-105 shadow-2xs' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={p.url} alt={p.label} className="w-11 h-11 rounded-full object-cover border border-[#E6E8EE]" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={savingProfile || !editName.trim()}
                  icon={<Check className="w-3.5 h-3.5" />}
                >
                  {savingProfile ? 'Saving...' : 'Save profile'}
                </Button>
              </div>
            </form>
          )}

              {/* Roomie Stats Highlight */}
              <div className="p-3.5 rounded-2xl bg-[#FFF8E6] border-2 border-[#FFE8A3] flex items-center justify-between">
                <div>
                  <span className="type-label block text-[#8A6200]">Streaks & Contribution</span>
                  <span className="text-sm font-bold text-[#1F2430]">
                    {currentUser.streakDays} Day Chore Streak • {currentUser.points} Roomie Points
                  </span>
                </div>
                <Icon icon="fluent-emoji-flat:fire" className="w-7 h-7 shrink-0" />
              </div>
            </div>
          )}

          {/* TAB 2: PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="space-y-4">
              <div className="space-y-2.5">
                <span className="type-label block text-xs uppercase tracking-wider text-[#64748B]">
                  Interface & System
                </span>

                {/* Language */}
                <div className="p-3.5 rounded-2xl border-2 border-b-4 border-[#E6E8EE] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <IconTile icon={<Globe className="w-4 h-4" />} color="indigo" size="sm" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[14px] font-bold text-[#1F2430] block">Language</span>
                      <span className="type-secondary text-[12px] block">Interface language</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto flex-wrap">
                    {(
                      [
                        { id: 'en', label: 'EN' },
                        { id: 'tr', label: 'TR' },
                        { id: 'fr', label: 'FR' },
                        { id: 'ar', label: 'العربية' },
                      ] satisfies Array<{ id: UserSettings['language']; label: string }>
                    ).map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => handleLanguageChange(l.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-[transform,background-color] duration-150 active:translate-y-[1px] min-h-[34px] flex items-center justify-center shrink-0 ${
                          settings.language === l.id
                            ? 'bg-[#FF6B4A] text-white shadow-2xs'
                            : 'bg-[#F7F8FB] text-[#64748B] hover:text-[#1F2430] hover:bg-[#EEF0F6]'
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sound Toggle */}
                <div className="p-3.5 rounded-2xl border-2 border-b-4 border-[#E6E8EE] bg-white flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <IconTile
                      icon={
                        settings.soundEnabled ? (
                          <SpeakerHigh weight="duotone" className="w-4 h-4" />
                        ) : (
                          <SpeakerSlash weight="duotone" className="w-4 h-4" />
                        )
                      }
                      color="coral"
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[14px] font-bold text-[#1F2430] block truncate">
                        Sound effects
                      </span>
                      <span className="type-secondary text-[12px] block leading-snug truncate sm:whitespace-normal">
                        Tactile chimes and celebratory fanfares
                      </span>
                    </div>
                  </div>
                  <SettingsRowToggle
                    checked={settings.soundEnabled}
                    onChange={toggleSound}
                    label="Toggle sound effects"
                  />
                </div>

                {/* Haptics Toggle */}
                <div className="p-3.5 rounded-2xl border-2 border-b-4 border-[#E6E8EE] bg-white flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <IconTile icon={<Vibrate weight="duotone" className="w-4 h-4" />} color="indigo" size="sm" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[14px] font-bold text-[#1F2430] block truncate">
                        Haptic feedback
                      </span>
                      <span className="type-secondary text-[12px] block leading-snug truncate sm:whitespace-normal">
                        Tactile vibrations for awards, vibe & swaps
                      </span>
                    </div>
                  </div>
                  <SettingsRowToggle
                    checked={settings.hapticsEnabled ?? isHapticsEnabled()}
                    onChange={toggleHaptics}
                    label="Toggle haptic feedback"
                  />
                </div>

                {/* Reduced Motion Toggle */}
                <div className="p-3.5 rounded-2xl border-2 border-b-4 border-[#E6E8EE] bg-white flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <IconTile icon={<Eye weight="duotone" className="w-4 h-4" />} color="teal" size="sm" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[14px] font-bold text-[#1F2430] block truncate">
                        Reduced motion
                      </span>
                      <span className="type-secondary text-[12px] block leading-snug truncate sm:whitespace-normal">
                        Calmer transitions (syncs with OS setting)
                      </span>
                    </div>
                  </div>
                  <SettingsRowToggle
                    checked={settings.reducedMotion}
                    onChange={toggleReducedMotion}
                    label="Toggle reduced motion"
                  />
                </div>

                {/* Push Notifications Toggle */}
                <div className="p-3.5 rounded-2xl border-2 border-b-4 border-[#E6E8EE] bg-white flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <IconTile icon={<Bell weight="duotone" className="w-4 h-4" />} color="amber" size="sm" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[14px] font-bold text-[#1F2430] block truncate">
                        Push notifications
                      </span>
                      <span className="type-secondary text-[12px] block leading-snug truncate sm:whitespace-normal">
                        Time-based reminders for chore duties
                      </span>
                    </div>
                  </div>
                  <SettingsRowToggle
                    checked={settings.pushNotifications}
                    onChange={togglePush}
                    label="Toggle push notifications"
                  />
                </div>
              </div>

              {/* Beta Labs Bento Section */}
              <div className="p-3.5 sm:p-4 rounded-3xl bg-[#FAF5FF] border-2 border-b-4 border-[#E9D5FF] space-y-3 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#9333EA] text-white flex items-center justify-center shadow-xs shrink-0">
                      <Flask weight="fill" className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#581C87] uppercase tracking-wider block">
                          Beta Labs
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#F3E8FF] text-[#7E22CE] border border-[#D8B4FE] uppercase tracking-wider shrink-0">
                          Preview
                        </span>
                      </div>
                      <span className="text-[11px] text-[#7E22CE] block leading-tight">
                        Experimental flat features in early access
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {/* Cultural Dinners Toggle */}
                  <div className="p-3 rounded-2xl border-2 border-b-3 border-[#E9D5FF] bg-white flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <IconTile icon={<ForkKnife weight="duotone" className="w-4 h-4" />} color="amber" size="sm" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[13px] font-bold text-[#1F2430] block truncate">
                          Cultural Dinners
                        </span>
                        <span className="type-secondary text-[12px] block leading-snug truncate sm:whitespace-normal">
                          Weekly flat dinners & dietary badges
                        </span>
                      </div>
                    </div>
                    <SettingsRowToggle
                      checked={culturalDinnersBeta}
                      onChange={() => {
                        const next = !culturalDinnersBeta;
                        setCulturalDinnersBeta(next);
                        setFeatureFlag('culturalDinnersBeta', next);
                        showToast(next ? 'Cultural Dinners enabled' : 'Cultural Dinners disabled', 'info');
                      }}
                      label="Toggle Cultural Dinners Beta"
                    />
                  </div>

                  {/* Roomie Wrapped Toggle */}
                  <div className="p-3 rounded-2xl border-2 border-b-3 border-[#E9D5FF] bg-white flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <IconTile icon={<Sparkle weight="duotone" className="w-4 h-4" />} color="coral" size="sm" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[13px] font-bold text-[#1F2430] block truncate">
                          Roomie Wrapped
                        </span>
                        <span className="type-secondary text-[12px] block leading-snug truncate sm:whitespace-normal">
                          Monthly story recap of flat harmony & streaks
                        </span>
                      </div>
                    </div>
                    <SettingsRowToggle
                      checked={roomieWrappedBeta}
                      onChange={() => {
                        const next = !roomieWrappedBeta;
                        setRoomieWrappedBeta(next);
                        setFeatureFlag('roomieWrappedBeta', next);
                        showToast(next ? 'Roomie Wrapped enabled' : 'Roomie Wrapped disabled', 'info');
                      }}
                      label="Toggle Roomie Wrapped Beta"
                    />
                  </div>
                </div>
              </div>

              {/* Walkthrough & Flat Setup */}
          {(onOpenShowcase || onOpenHowItWorks || onOpenHouseholdSetup) && (
            <div className="space-y-2 pt-1 border-t border-[#E6E8EE]">
              <span className="type-label block">
                Setup & Walkthrough
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {onOpenHouseholdSetup && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onOpenHouseholdSetup();
                    }}
                  >
                    Flat setup
                  </Button>
                )}
                {onOpenShowcase && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onOpenShowcase();
                    }}
                  >
                    Presentation
                  </Button>
                )}
                {onOpenHowItWorks && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onOpenHowItWorks();
                    }}
                  >
                    How it works
                  </Button>
                )}
                {devModeUnlocked && onOpenDebugInspector && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onOpenDebugInspector();
                    }}
                    icon={<Bug className="w-3.5 h-3.5 text-[#5B5BD6]" />}
                    className="border-dashed border-[#5B5BD6] text-[#5B5BD6]"
                  >
                    Debug Layer
                  </Button>
                )}
              </div>
            </div>
          )}
            </div>
          )}

          {/* TAB 3: ACCOUNT & DATA */}
          {activeTab === 'account' && (
            <div className="space-y-4">
              <div className="space-y-2">
            <span className="type-label block">
              Account & Feedback
            </span>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleInstallApp}
                icon={<DeviceMobile className="w-3.5 h-3.5 text-[#19B5A5]" />}
              >
                Install app
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenFeedback();
                }}
                icon={<ChatCircleText className="w-3.5 h-3.5 text-[#FF6B4A]" />}
              >
                Feedback
              </Button>
            </div>

            {onToggleSaveLogin && (
              <Card
                padding="sm"
                className="flex items-center justify-between gap-3 bg-[#F7F8FB] border border-[#E6E8EE] rounded-2xl"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-white text-[#19B5A5] shrink-0">
                    <Lightning className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-[#1F2430] truncate">Save login info</p>
                    <p className="text-[11px] text-[#64748B] truncate">1-tap quick sign-in on this device</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    sound.playTap();
                    const next = await onToggleSaveLogin(!loginSaved);
                    setLoginSaved(next);
                    showToast(
                      next ? 'Saved login for 1-tap sign-in' : 'Removed saved login from this device',
                      'info'
                    );
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-black transition-colors cursor-pointer shrink-0 ${
                    loginSaved
                      ? 'bg-[#19B5A5] text-white'
                      : 'bg-white border border-[#CBD5E1] text-[#475569]'
                  }`}
                >
                  {loginSaved ? 'Saved' : 'Off'}
                </button>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onExportData}
                icon={<DownloadSimple className="w-3.5 h-3.5 text-[#5B5BD6]" />}
              >
                Export data
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (!onSignOut) return;
                  if (loginSaved || !onToggleSaveLogin) {
                    onClose();
                    onSignOut({ keepSavedLogin: loginSaved });
                  } else {
                    setSignOutPromptOpen(true);
                  }
                }}
                icon={<SignOut className="w-3.5 h-3.5 text-[#64748B]" />}
              >
                Sign out
              </Button>
            </div>
          </div>

          {/* Danger Zone: Separate distinct area with confirmation step */}
          <div className="mt-4 pt-3 border-2 border-[#FFD7CF] rounded-2xl p-4 bg-[#FFF0ED]/40 space-y-2.5">
            <div className="flex items-center gap-2">
              <Warning className="w-4 h-4 text-[#E5484D]" />
              <span className="type-label text-[#E5484D] font-bold">Danger zone</span>
            </div>
            <p className="type-secondary text-[#7F1D1D] text-[14px] leading-relaxed">
              Permanently delete your profile and personal streaks from this device.
            </p>
            <Button
              variant="danger-outline"
              size="sm"
              onClick={() => {
                setDeleteConfirmInput('');
                setDeleteConfirmOpen(true);
              }}
              icon={<Trash className="w-3.5 h-3.5" />}
            >
              Delete account
            </Button>
          </div>
            </div>
          )}

          {/* App Version & Secret Dev Mode Trigger */}
          <div className="pt-3 pb-1 text-center border-t border-[#E6E8EE]/60">
            <button
              type="button"
              onClick={handleVersionTap}
              className="text-[12px] font-bold text-[#94A3B8] hover:text-[#64748B] active:scale-95 transition-all cursor-pointer select-none"
            >
              Roomie v2.1.0-beta {devModeUnlocked ? '• Dev Mode Active' : ''}
            </button>
          </div>
        </div>
      </Modal>

      {/* Instagram/Facebook-style Save Login prompt before signing out */}
      <Modal
        isOpen={signOutPromptOpen}
        onClose={() => setSignOutPromptOpen(false)}
        title="Save your login info?"
        subtitle="You can sign right back in with 1 tap next time"
      >
        <div className="space-y-4 text-center">
          <div className="flex flex-col items-center gap-2 py-2">
            <Avatar src={currentUser.avatar} name={currentUser.name} size="lg" />
            <div>
              <p className="font-heading font-black text-base text-[#1F2430]">{currentUser.name}</p>
              <p className="type-secondary text-xs text-[#64748B]">{currentUser.email}</p>
            </div>
          </div>
          <div className="space-y-2">
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={() => {
                setSignOutPromptOpen(false);
                onClose();
                onSignOut?.({ keepSavedLogin: true });
              }}
            >
              Save Info & Sign Out
            </Button>
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => {
                setSignOutPromptOpen(false);
                onClose();
                onSignOut?.({ keepSavedLogin: false });
              }}
            >
              Not Now (Sign Out)
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal with explicit typing step */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete Account?"
        subtitle="This action is permanent and cannot be undone"
      >
        <div className="space-y-4">
          <div className="text-center">
            <WarningCircle className="w-12 h-12 text-[#E5484D] mx-auto mb-2" />
            <p className="type-secondary leading-relaxed">
              Deleting your account will erase your roomie profile, streak data, and preferences. Shared ledger records will remain to keep apartment math consistent for your roomies.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-[#FFF0ED] border border-[#FFD7CF] space-y-1.5">
            <label className="type-label text-[#E5484D] block">
              Type DELETE to confirm:
            </label>
            <input
              type="text"
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3 py-2 rounded-xl border border-[#E6E8EE] bg-white text-[14px] font-bold uppercase tracking-widest focus:outline-none focus:border-[#E5484D] text-center"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button variant="outline" size="md" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger-outline"
              size="md"
              disabled={deleteConfirmInput.trim().toUpperCase() !== 'DELETE'}
              onClick={() => {
                setDeleteConfirmOpen(false);
                onClose();
                onDeleteAccount();
              }}
            >
              Confirm delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
