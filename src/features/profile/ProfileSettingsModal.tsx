import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Avatar } from '../../components/common/Avatar';
import { IconTile } from '../../components/common/IconTile';
import { User, UserSettings } from '../../types';
import { sound } from '../../services/sound';
import {
  Volume2,
  VolumeX,
  Eye,
  Bell,
  Globe,
  Download,
  Trash2,
  MessageSquareHeart,
  Pencil,
  LogOut,
  AlertTriangle,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  settings: UserSettings;
  onUpdateSettings: (updates: Partial<UserSettings>) => Promise<UserSettings>;
  onUpdateProfile?: (updates: Partial<User>) => Promise<User>;
  onExportData: () => void;
  onDeleteAccount: () => void;
  onSignOut?: () => void;
  onOpenFeedback: () => void;
}

const PRESET_AVATARS = [
  { label: 'Kai', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { label: 'Amina', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' },
  { label: 'Lucas', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { label: 'Yasmin', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
  { label: 'Tariq', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
];

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
  onOpenFeedback,
}) => {
  const { showToast } = useToast();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Edit profile form state
  const [editName, setEditName] = useState(currentUser.name);
  const [editCountry, setEditCountry] = useState(currentUser.country);
  const [editFlag, setEditFlag] = useState(currentUser.flag);
  const [editAvatar, setEditAvatar] = useState(currentUser.avatar);
  const [savingProfile, setSavingProfile] = useState(false);

  const toggleSound = async () => {
    const next = !settings.soundEnabled;
    sound.setEnabled(next);
    if (next) sound.playSuccess();
    await onUpdateSettings({ soundEnabled: next });
    showToast(next ? 'Sound effects enabled' : 'Sound effects muted', 'info');
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

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Profile & Settings"
        subtitle="Customise your Roomie experience"
      >
        <div className="space-y-4">
          {/* User Profile Card or Edit Form */}
          {!isEditingProfile ? (
            <Card padding="md" variant="calm" className="flex items-center justify-between gap-3 bg-[#F7F8FB]">
              <div className="flex items-center gap-3">
                <Avatar
                  src={currentUser.avatar}
                  name={currentUser.name}
                  flag={currentUser.flag}
                  size="lg"
                />
                <div>
                  <h4 className="type-section-heading">
                    {currentUser.name}
                  </h4>
                  <p className="type-secondary">{currentUser.email}</p>
                  <div className="flex items-center gap-1.5 mt-1 type-secondary text-[#1F2430]">
                    <span>{currentUser.country} {currentUser.flag}</span>
                    <span>•</span>
                    <span className="text-[#FF6B4A] font-bold">{currentUser.points} points</span>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  sound.playTap();
                  setEditName(currentUser.name);
                  setEditCountry(currentUser.country);
                  setEditFlag(currentUser.flag);
                  setEditAvatar(currentUser.avatar);
                  setIsEditingProfile(true);
                }}
                icon={<Pencil className="w-3.5 h-3.5" />}
              >
                Edit profile
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
                <label className="type-label block mb-1">Avatar Preset</label>
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  {PRESET_AVATARS.map((p) => (
                    <button
                      type="button"
                      key={p.label}
                      onClick={() => setEditAvatar(p.url)}
                      className={`relative rounded-full p-0.5 transition-all cursor-pointer ${
                        editAvatar === p.url ? 'ring-2 ring-[#FF6B4A]' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={p.url} alt={p.label} className="w-9 h-9 rounded-full object-cover" />
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

          {/* Preferences */}
          <div className="space-y-2">
            <span className="type-label block">
              Preferences
            </span>

            {/* Language */}
            <div className="p-3 rounded-2xl border border-[#E6E8EE] bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <IconTile icon={<Globe className="w-4 h-4" />} color="indigo" size="sm" />
                <span className="text-[14px] font-bold text-[#1F2430]">Language</span>
              </div>
              <div className="flex gap-1">
                {[
                  { id: 'en', label: 'EN' },
                  { id: 'tr', label: 'TR' },
                  { id: 'fr', label: 'FR' },
                  { id: 'ar', label: 'العربية' },
                ].map((l) => (
                  <button
                    key={l.id}
                    onClick={() => handleLanguageChange(l.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-[14px] font-bold cursor-pointer transition-colors ${
                      settings.language === l.id
                        ? 'bg-[#FF6B4A] text-white'
                        : 'bg-[#F7F8FB] text-[#64748B] hover:text-[#1F2430]'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sound Toggle */}
            <div className="p-3 rounded-2xl border border-[#E6E8EE] bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <IconTile
                  icon={settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  color="coral"
                  size="sm"
                />
                <div>
                  <span className="text-[14px] font-bold text-[#1F2430] block">
                    Sound effects
                  </span>
                  <span className="type-secondary text-[14px]">
                    Tactile chimes and celebratory fanfares
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleSound}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.soundEnabled ? 'bg-[#FF6B4A]' : 'bg-[#E6E8EE]'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    settings.soundEnabled ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Reduced Motion Toggle */}
            <div className="p-3 rounded-2xl border border-[#E6E8EE] bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <IconTile icon={<Eye className="w-4 h-4" />} color="teal" size="sm" />
                <div>
                  <span className="text-[14px] font-bold text-[#1F2430] block">
                    Reduced motion
                  </span>
                  <span className="type-secondary text-[14px]">
                    Calmer transitions (defaults to device setting)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleReducedMotion}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.reducedMotion ? 'bg-[#FF6B4A]' : 'bg-[#E6E8EE]'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    settings.reducedMotion ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Push Notifications Toggle */}
            <div className="p-3 rounded-2xl border border-[#E6E8EE] bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <IconTile icon={<Bell className="w-4 h-4" />} color="amber" size="sm" />
                <div>
                  <span className="text-[14px] font-bold text-[#1F2430] block">
                    Push notifications
                  </span>
                  <span className="type-secondary text-[14px]">
                    Time-based reminders for your chores
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={togglePush}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.pushNotifications ? 'bg-[#FF6B4A]' : 'bg-[#E6E8EE]'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    settings.pushNotifications ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Account & Data */}
          <div className="space-y-2 pt-1 border-t border-[#E6E8EE]">
            <span className="type-label block">
              Account & Feedback
            </span>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenFeedback();
                }}
                icon={<MessageSquareHeart className="w-3.5 h-3.5 text-[#FF6B4A]" />}
              >
                Feedback
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onExportData}
                icon={<Download className="w-3.5 h-3.5 text-[#5B5BD6]" />}
              >
                Export data
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onClose();
                  if (onSignOut) onSignOut();
                }}
                icon={<LogOut className="w-3.5 h-3.5 text-[#64748B]" />}
              >
                Sign out
              </Button>
            </div>
          </div>

          {/* Danger Zone: Separate distinct area with confirmation step */}
          <div className="mt-4 pt-3 border-2 border-[#FFD7CF] rounded-2xl p-4 bg-[#FFF0ED]/40 space-y-2.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#E5484D]" />
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
              icon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete account
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
            <AlertCircle className="w-12 h-12 text-[#E5484D] mx-auto mb-2" />
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
