import React, { useEffect, useState } from 'react';
import { MascotView } from './MascotView';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Hold splash briefly for brand impact, then trigger the circular iris reveal
    const timer = setTimeout(() => {
      setExiting(true);
    }, 1400);

    const finishTimer = setTimeout(() => {
      onFinish();
    }, 2200);

    return () => {
      clearTimeout(timer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FF6B4A] text-white transition-all duration-700 select-none ${
        exiting ? 'pointer-events-none' : ''
      }`}
      style={{
        clipPath: exiting ? 'circle(0% at 50% 50%)' : 'circle(150% at 50% 50%)',
        transition: 'clip-path 0.75s cubic-bezier(0.7, 0, 0.2, 1)',
      }}
    >
      <div className="flex flex-col items-center space-y-4 animate-bounce-soft text-center px-6">
        {/* White Mascot Container */}
        <div className="w-28 h-28 rounded-full bg-white shadow-xl flex items-center justify-center p-2 border-4 border-white/40">
          <MascotView state="celebrating" size="md" />
        </div>

        <div className="space-y-1">
          <h1 className="font-heading font-black text-4xl tracking-tight text-white drop-shadow-sm">
            Roomie
          </h1>
          <p className="text-white/90 font-medium text-sm">
            The joyful way to share a home
          </p>
        </div>

        {/* Subtle dot pulse */}
        <div className="flex items-center gap-1.5 pt-4">
          <span className="w-2 h-2 rounded-full bg-white/70 animate-pulse" />
          <span className="w-2 h-2 rounded-full bg-white/70 animate-pulse [animation-delay:200ms]" />
          <span className="w-2 h-2 rounded-full bg-white/70 animate-pulse [animation-delay:400ms]" />
        </div>
      </div>
    </div>
  );
};