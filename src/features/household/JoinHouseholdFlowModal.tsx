import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { MascotView } from '../../components/common/MascotView';
import { QrCode, Camera, ArrowRight, Clock, CheckCircle2, Building2, UserPlus, X, RefreshCw } from 'lucide-react';
import { IconTile } from '../../components/common/IconTile';
import { useToast } from '../../components/common/Toast';
import { sound } from '../../services/sound';

interface JoinHouseholdFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (code: string) => Promise<{ success: boolean; message: string }>;
}

export const JoinHouseholdFlowModal: React.FC<JoinHouseholdFlowModalProps> = ({
  isOpen,
  onClose,
  onJoin,
}) => {
  const { showToast } = useToast();
  // 1: Choose Method -> 2: Camera or Code Entry -> 3: Apartment Preview -> 4: Waiting Approval
  const [step, setStep] = useState<number>(1);
  const [code, setCode] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);

  // Stop camera tracks helper
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startLiveCamera = async () => {
    sound.playTap();
    setIsScanning(true);
    setHasCamera(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCamera(false);
      handleSimulateScanFallback();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // If BarcodeDetector is available in browser, scan live
      if ('BarcodeDetector' in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['qr_code'],
        });

        const scanFrame = async () => {
          if (!videoRef.current || !streamRef.current) return;
          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const rawVal = barcodes[0].rawValue || '';
              // Extract code from link or raw text
              const detectedCode = rawVal.includes('code=')
                ? new URLSearchParams(rawVal.split('?')[1]).get('code') || rawVal
                : rawVal;

              stopCamera();
              setIsScanning(false);
              setCode(detectedCode.trim().toUpperCase());
              sound.playSuccess();
              showToast(`Scanned: ${detectedCode.toUpperCase()}`, 'reward');
              setStep(3);
              return;
            }
          } catch {
            // Keep scanning frame
          }
          scanLoopRef.current = requestAnimationFrame(scanFrame);
        };

        scanLoopRef.current = requestAnimationFrame(scanFrame);
      } else {
        // Fallback simulation timer if BarcodeDetector is not natively present
        setTimeout(() => {
          stopCamera();
          setIsScanning(false);
          setCode('CYP-7492');
          sound.playSuccess();
          showToast('Scanned: CYP-7492!', 'reward');
          setStep(3);
        }, 2200);
      }
    } catch {
      setHasCamera(false);
      stopCamera();
      handleSimulateScanFallback();
    }
  };

  const handleSimulateScanFallback = () => {
    setTimeout(() => {
      setIsScanning(false);
      setCode('CYP-7492');
      sound.playSuccess();
      showToast('QR Scanned: CYP-7492!', 'reward');
      setStep(3); // Preview apartment
    }, 1500);
  };

  const handleCodeSubmit = () => {
    if (!code.trim()) return;
    sound.playTap();
    setStep(3); // Preview apartment
  };

  const handleConfirmJoin = async () => {
    setLoading(true);
    try {
      const res = await onJoin(code);
      if (res.success) {
        sound.playSuccess();
        setStep(4); // Waiting for approval
      } else {
        showToast(res.message, 'error');
      }
    } catch {
      showToast('Could not submit request', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    setStep(1);
    setCode('');
    setIsScanning(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 4 ? 'Request Sent!' : `Join a Flat (${step}/3)`}
      subtitle={
        step === 1
          ? 'Step 1: Choose how to connect'
          : step === 2
          ? 'Step 2: Enter invite code or scan'
          : step === 3
          ? 'Step 3: Confirm roomie request'
          : 'Waiting for roomies to approve'
      }
    >
      <div className="space-y-4">
        {/* STEP 1: CHOOSE METHOD */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h4 className="type-section-heading">
                How would you like to join?
              </h4>
              <p className="type-secondary mt-0.5">
                Every apartment has a unique invite code and QR display.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={startLiveCamera}
                className="p-4 rounded-2xl border-2 border-[#E6E8EE] hover:border-[#FF6B4A] bg-white flex items-center gap-3.5 text-left cursor-pointer transition-all active:scale-[0.98] min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A]/70"
              >
                <IconTile icon={<QrCode className="w-6 h-6" />} color="coral" size="md" />
                <div>
                  <h4 className="type-section-heading">
                    Scan Roomie QR Code
                  </h4>
                  <p className="type-secondary">
                    Point camera at your roomie's phone
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setStep(2);
                }}
                className="p-4 rounded-2xl border-2 border-[#E6E8EE] hover:border-[#19B5A5] bg-white flex items-center gap-3.5 text-left cursor-pointer transition-all active:scale-[0.98] min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A]/70"
              >
                <IconTile icon={<UserPlus className="w-6 h-6" />} color="indigo" size="md" />
                <div>
                  <h4 className="type-section-heading">
                    Type Apartment Invite Code
                  </h4>
                  <p className="type-secondary">
                    Enter short code (e.g. CYP-7492)
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: CAMERA VIEWFINDER OR CODE INPUT */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h4 className="type-section-heading">
                Enter Invite Code
              </h4>
              <p className="type-secondary mt-0.5">
                Ask any current roomie for their apartment code.
              </p>
            </div>

            <div>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. CYP-7492"
                className="w-full px-4 py-3 rounded-2xl border border-[#E6E8EE] bg-white type-title tracking-widest focus:outline-none focus:border-[#FF6B4A] uppercase text-center"
              />
              <p className="type-secondary mt-1 text-center">
                Try code <strong>CYP-7492</strong> to join Apartment 4B.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button variant="outline" size="md" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={!code.trim()}
                onClick={handleCodeSubmit}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Find Apartment
              </Button>
            </div>
          </div>
        )}

        {/* CAMERA SCANNING OVERLAY */}
        {isScanning && (
          <div className="p-4 flex flex-col items-center text-center space-y-4">
            <div className="relative w-56 h-56 rounded-3xl bg-black overflow-hidden flex items-center justify-center border-4 border-[#FF6B4A] shadow-lg">
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#FF6B4A] shadow-[0_0_16px_#FF6B4A] animate-pulse transition-all duration-1000 transform translate-y-28 pointer-events-none" />
              <div className="absolute inset-4 border-2 border-dashed border-white/50 rounded-2xl pointer-events-none" />
            </div>
            <div>
              <p className="type-body font-bold text-[#1F2430]">
                {hasCamera ? 'Point camera at your roomie’s QR code' : 'Simulating QR scan...'}
              </p>
              <p className="type-secondary mt-0.5">
                Keep the code centered in the frame
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                stopCamera();
                setIsScanning(false);
              }}
              icon={<X className="w-3.5 h-3.5" />}
            >
              Cancel scan
            </Button>
          </div>
        )}

        {/* STEP 3: APARTMENT PREVIEW */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h4 className="type-section-heading">
                Apartment Found
              </h4>
              <p className="type-secondary mt-0.5">
                Ready to submit your join request?
              </p>
            </div>

            <Card padding="md" variant="calm" className="bg-[#F7F8FB] space-y-3">
              <div className="flex items-center gap-3">
                <IconTile icon={<Building2 className="w-5 h-5" />} color="coral" size="sm" />
                <div>
                  <h4 className="type-section-heading">
                    Apartment 4B Lefkoşa
                  </h4>
                  <p className="type-secondary">
                    Code: {code} • 4 roomies active
                  </p>
                </div>
              </div>

              <div className="type-secondary bg-white p-2.5 rounded-xl border border-[#E6E8EE] leading-relaxed">
                Your request will be shared with the roomies. Every member sees your request and votes OK or Not sure, then the admin approves.
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button variant="secondary" size="md" onClick={() => setStep(1)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={loading}
                onClick={handleConfirmJoin}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                {loading ? 'Submitting...' : 'Send Request'}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: WAITING FOR APPROVAL */}
        {step === 4 && (
          <div className="flex flex-col items-center text-center space-y-4 py-3">
            <MascotView
              state="calm"
              size="lg"
              bubbleText="Hold tight! The apartment is reviewing."
            />

            <div className="space-y-1 max-w-xs">
              <h3 className="type-title">
                Request Sent!
              </h3>
              <p className="type-secondary leading-relaxed">
                Your request to join Apartment 4B Lefkoşa has been delivered. Roomies will review and vote.
              </p>
            </div>

            <div className="w-full pt-2">
              <Button variant="primary" size="md" fullWidth onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
