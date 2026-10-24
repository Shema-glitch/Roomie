import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { MascotView } from '../../components/common/MascotView';
import { QrCode, Camera, ArrowRight, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface JoinHouseholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (code: string) => Promise<{ success: boolean; message: string }>;
}

export const JoinHouseholdModal: React.FC<JoinHouseholdModalProps> = ({
  isOpen,
  onClose,
  onJoin,
}) => {
  const { showToast } = useToast();
  const [code, setCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleJoin = async (targetCode: string) => {
    if (!targetCode.trim()) return;
    setLoading(true);
    try {
      const res = await onJoin(targetCode.trim());
      if (res.success) {
        setIsWaiting(true);
        showToast(res.message, 'success');
      } else {
        showToast(res.message, 'error');
      }
    } catch {
      showToast('Could not submit join request', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateQR = () => {
    setIsScanning(true);
    // Simulate camera scanner finding QR code
    setTimeout(() => {
      setIsScanning(false);
      setCode('CYP-7492');
      showToast('QR Code scanned: CYP-7492!', 'reward');
    }, 1800);
  };

  const handleReset = () => {
    setCode('');
    setIsWaiting(false);
    setIsScanning(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleReset}
      title={isWaiting ? 'Request Sent!' : 'Join a Household'}
      subtitle={
        isWaiting
          ? 'Waiting for your roommates to approve'
          : 'Enter your flatmate invite code or scan QR'
      }
    >
      {isWaiting ? (
        <div className="flex flex-col items-center text-center space-y-4 py-2">
          <MascotView
            state="calm"
            size="lg"
            bubbleText="Hold tight! The flat is reviewing."
          />

          <Card padding="md" variant="calm" className="w-full space-y-2.5">
            <div className="w-10 h-10 rounded-full bg-[#EEF0FD] text-[#5B5BD6] flex items-center justify-center mx-auto">
              <Clock className="w-5 h-5 animate-spin" />
            </div>
            <h4 className="font-heading font-bold text-lg text-[#1F2430]">
              Waiting for Roommate Approval
            </h4>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              Your request for <strong>Apartment 4B Lefkoşa</strong> was sent to Amina, Lucas, and Yasmin.
            </p>
            <div className="text-[11px] text-[#6B7280] bg-[#F7F8FB] p-2.5 rounded-xl border border-[#E6E8EE]">
              💡 Once the household admin confirms your request, you will automatically gain full access to chores and shared expenses.
            </div>
          </Card>

          <Button variant="primary" size="md" fullWidth onClick={handleReset}>
            Got it, back to app
          </Button>
        </div>
      ) : isScanning ? (
        <div className="flex flex-col items-center text-center py-6 space-y-4">
          <div className="relative w-48 h-48 rounded-2xl bg-black overflow-hidden flex items-center justify-center border-4 border-[#FF6B4A]">
            <Camera className="w-12 h-12 text-white/50" />
            {/* Animated scanning beam */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#FF6B4A] shadow-[0_0_12px_#FF6B4A] animate-pulse transition-all duration-1000 transform translate-y-24" />
          </div>
          <p className="text-xs font-bold text-[#1F2430]">
            Point your camera at your flatmate's Roomie QR code...
          </p>
          <Button variant="outline" size="sm" onClick={() => setIsScanning(false)}>
            Cancel Camera
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#1F2430] mb-1.5">
              Household Invite Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. CYP-7492"
              className="w-full px-4 py-3 rounded-2xl border border-[#E6E8EE] bg-white text-base tracking-widest font-heading font-bold focus:outline-none focus:border-[#FF6B4A] uppercase text-center"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={handleSimulateQR}
              icon={<QrCode className="w-4 h-4 text-[#FF6B4A]" />}
            >
              Scan QR
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={loading || !code.trim()}
              onClick={() => handleJoin(code)}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              {loading ? 'Submitting...' : 'Join Flat'}
            </Button>
          </div>

          <div className="p-3 rounded-2xl bg-[#F7F8FB] border border-[#E6E8EE] text-[11px] text-[#6B7280]">
            <strong>Hint:</strong> Try invite code <code>CYP-7492</code> to simulate joining Apartment 4B.
          </div>
        </div>
      )}
    </Modal>
  );
};
