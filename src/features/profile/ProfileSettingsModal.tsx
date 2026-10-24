import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Avatar } from '../../components/common/Avatar';
import { User, UserSettings } from '../../types';
import { THEME } from '../../theme/tokens';
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
  Check,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  settings: UserSettings;
  onUpdateSettings: (updates: Partial<UserSettings>) => Promise<UserSettings>;
  onExportData: () => void;
  onDeleteAccount: () => void;
  onOpenFeedback: () => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  settings,
  onUpdateSettings,
  onExportData,
  onDeleteAccount,
  onOpenFeedback,
}) => {
  const { showToast } = useToast();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const toggleSound = async () => {
    const next = !settings.soundEnabled;
    sound.setEnabled(next);
    if (next) sound.playSuccess();
    await onUpdateSettings({ soundEnabled: next });
    showToast(next ? 'Sound effects enabled 🎵' : 'Sound effects muted', 'info');
  };

  const toggleReducedMotion = async () => {
    const next = !settings.reducedMotion;
    await onUpdateSettings({ reducedMotion: next });
    showToast(next ? 'Reduced motion enabled' : 'Smooth motion restored', 'info');
  };

  const togglePush = async () => {
    const next = !settings.pushNotifications;
    await onUpdateSettings({ pushNotifications: next });
    showToast(next ? 'Push notifications active' : 'Push notifications paused', 'info');
  };

  const handleLanguageChange = async (lang: 'en' | 'tr' | 'fr' | 'ar') => {
    await onUpdateSettings({ language: lang });
    showToast(
      `Language set to ${
        lang === 'en' ? 'English' : lang === 'tr' ? 'Türkçe' : lang === 'fr' ? 'Français' : 'العربية'
      }`,
      'info'
    );
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
          {/* User Profile Card */}
          <Card padding="md" variant="calm" className="flex items-center gap-3 bg-[#F7F8FB]">
            <Avatar
              src={currentUser.avatar}
              name={currentUser.name}
              flag={currentUser.flag}
              size="lg"
            />
            <div>
              <h4 className="font-heading font-black text-lg text-[#1F2430]">
                {currentUser.name}
              </h4>
              <p className="text-xs text-[#6B7280]">{currentUser.email}</p>
              <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-[#1F2430]">
                <span>{currentUser.country}</span>
                <span>{currentUser.flag}</span>
                <span>•</span>
                <span className="text-[#FF6B4A]">{currentUser.points} points</span>
              </div>
            </div>
          </Card>

          {/* Preferences */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#1F2430] block">
              Preferences
            </span>

            {/* Language */}
            <div className="p-3 rounded-2xl border border-[#E6E8EE] bg-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-[#5B5BD6]" />
                <span className="text-xs font-bold text-[#1F2430]">Language</span>
              </div>
              <div className="flex gap-1">
                {[
                  { id: 'en', label: 'EN' },
                  { id: 'tr', label: 'TR' },
                  { id: 'fr', label: 'FR' },
                  { id: 'ar', label: 'AR' },
                ].map((l) => (
                  <button
                    key={l.id}
                    onClick={() => handleLanguageChange(l.id as any)}
                    className={`px-2 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      settings.language === l.id
                        ? 'bg-[#FF6B4A] text-white'
                        : 'bg-[#F7F8FB] text-[#6B7280]'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sound Toggle */}
            <div className="p-3 rounded-2xl border border-[#E6E8EE] bg-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {settings.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-[#FF6B4A]" />
                ) : (
                  <VolumeX className="w-4 h-4 text-[#6B7280]" />
                )}
                <div>
                  <span className="text-xs font-bold text-[#1F2430] block">
                    Sound Effects
                  </span>
                  <span className="text-[10px] text-[#6B7280]">
                    Tactile chimes & celebratory fanfares
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
              <div className="flex items-center gap-2.5">
                <Eye className="w-4 h-4 text-[#19B5A5]" />
                <div>
                  <span className="text-xs font-bold text-[#1F2430] block">
                    Reduced Motion
                  </span>
                  <span className="text-[10px] text-[#6B7280]">
                    Calmer transitions without big bounces
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleReducedMotion}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.reducedMotion ? 'bg-[#19B5A5]' : 'bg-[#E6E8EE]'
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
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-[#FFC93C]" />
                <div>
                  <span className="text-xs font-bold text-[#1F2430] block">
                    Push Notifications
                  </span>
                  <span className="text-[10px] text-[#6B7280]">
                    Time-based reminders for your chores
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={togglePush}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.pushNotifications ? 'bg-[#3DBE6D]' : 'bg-[#E6E8EE]'
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

          {/* Feedback & Support */}
          <div className="space-y-2 pt-1">
            <span className="text-xs font-bold text-[#1F2430] block">
              Feedback & Help
            </span>
            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={() => {
                onClose();
                onOpenFeedback();
              }}
              icon={<MessageSquareHeart className="w-4 h-4 text-[#FF6B4A]" />}
            >
              Rate App, Report Bug, or Suggest Feature
            </Button>
          </div>

          {/* Data Export & Account Deletion (Build spec section 12) */}
          <div className="space-y-2 pt-2 border-t border-[#E6E8EE]">
            <span className="text-xs font-bold text-[#1F2430] block">
              Data & Privacy
            </span>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onExportData}
                icon={<Download className="w-3.5 h-3.5 text-[#5B5BD6]" />}
              >
                Export JSON Data
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmOpen(true)}
                icon={<Trash2 className="w-3.5 h-3.5 text-[#E5484D]" />}
              >
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete Account?"
        subtitle="This action cannot be undone"
      >
        <div className="space-y-4 text-center">
          <AlertCircle className="w-12 h-12 text-[#E5484D] mx-auto" />
          <p className="text-xs text-[#6B7280] leading-relaxed">
            Deleting your account will permanently remove your profile, streaks, and preferences from Roomie. Your shared expense history remains for your flatmates to maintain ledger accuracy.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button variant="outline" size="md" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                setDeleteConfirmOpen(false);
                onClose();
                onDeleteAccount();
              }}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
