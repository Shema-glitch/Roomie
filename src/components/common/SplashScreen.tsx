import React, { useEffect, useState } from 'react';
import { MascotView } from './MascotView';

interface SplashScreenProps {
  onFinish: () => void;
  onRevealStart?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish, onRevealStart }) => {
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const DURATION = 5000; // 5 seconds loading bar

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.floor((elapsed / DURATION) * 100));
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(interval);
        // Start the slow circular transition shrinking upward to reveal content
        setExiting(true);
        onRevealStart?.();

        // Allow 1.2s for the slow circle transition before unmounting
        setTimeout(() => {
          onFinish();
        }, 1250);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [onFinish, onRevealStart]);

  const getLoadingMessage = (p: number) => {
    if (p < 25) return 'Waking up Roomie...';
    if (p < 55) return 'Tidying the chore board...';
    if (p < 85) return 'Balancing flat harmony...';
    return 'Welcome home!';
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#FF7A5C] via-[#FF6B4A] to-[#E85635] text-white select-none ${
        exiting ? 'pointer-events-none' : ''
      }`}
      style={{
        clipPath: exiting ? 'circle(0% at 50% -10%)' : 'circle(150% at 50% 50%)',
        transition: 'clip-path 1.2s cubic-bezier(0.65, 0, 0.35, 1)',
      }}
    >
      <div
        className={`flex flex-col items-center space-y-6 text-center px-6 max-w-xs w-full transition-all duration-700 ease-out ${
          exiting ? 'opacity-0 -translate-y-12 scale-95' : 'opacity-100 translate-y-0 scale-100'
        }`}
      >
        {/* Mascot in tactile white sticker container */}
        <div className="w-32 h-32 rounded-full bg-white shadow-2xl flex items-center justify-center p-3 border-4 border-white/30 animate-bounce-soft">
          <MascotView state="celebrating" size="md" />
        </div>

        {/* Brand Wordmark & Tagline */}
        <div className="space-y-1">
          <h1 className="font-heading font-black text-4xl tracking-tight text-white drop-shadow-md">
            Roomie
          </h1>
          <p className="text-white/90 font-medium text-sm drop-shadow-xs">
            The joyful way to share a home
          </p>
        </div>

        {/* 5-Second Simulated Loading Bar */}
        <div className="w-full space-y-2 pt-2">
          <div className="w-full h-3.5 bg-black/20 rounded-full p-0.5 overflow-hidden backdrop-blur-xs border border-white/20 shadow-inner">
            <div
              className="h-full bg-white rounded-full transition-all duration-75 ease-out shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-white/80 font-bold px-1">
            <span>{getLoadingMessage(progress)}</span>
            <span className="font-mono">{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};