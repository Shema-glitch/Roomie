import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  CheckCircle,
  WarningCircle,
  XCircle,
  BellRinging,
  Sparkle,
  X,
} from '@phosphor-icons/react';
import { sound } from '../../services/sound';

export type ToastType = 'success' | 'info' | 'warning' | 'reward' | 'error';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastVisualStyle {
  surfaceClass: string;
  badgeClass: string;
  progressClass: string;
  icon: React.ReactNode;
}

function getToastVisualStyle(type: ToastType): ToastVisualStyle {
  switch (type) {
    case 'success':
      return {
        surfaceClass: 'bg-[#F2FBF7] border-[#BCEAD5] text-[#14532D]',
        badgeClass: 'bg-[#DCFCE7] text-[#15803D]',
        progressClass: 'bg-[#2CA358]',
        icon: <CheckCircle weight="fill" className="w-4 h-4" />,
      };
    case 'warning':
      return {
        surfaceClass: 'bg-[#FFFBEB] border-[#FDE68A] text-[#78350F]',
        badgeClass: 'bg-[#FEF3C7] text-[#D97706]',
        progressClass: 'bg-[#F59E0B]',
        icon: <WarningCircle weight="fill" className="w-4 h-4" />,
      };
    case 'reward':
      return {
        surfaceClass: 'bg-[#FFFBEB] border-[#FDE68A] text-[#78350F]',
        badgeClass: 'bg-[#FEF3C7] text-[#D97706]',
        progressClass: 'bg-[#F59E0B]',
        icon: <Sparkle weight="fill" className="w-4 h-4" />,
      };
    case 'error':
      return {
        surfaceClass: 'bg-[#FFF1F2] border-[#FECDD3] text-[#881337]',
        badgeClass: 'bg-[#FFE4E6] text-[#E5484D]',
        progressClass: 'bg-[#E5484D]',
        icon: <XCircle weight="fill" className="w-4 h-4" />,
      };
    case 'info':
    default:
      return {
        surfaceClass: 'bg-[#FFF9F6] border-[#FFD9CC] text-[#1E293B]',
        badgeClass: 'bg-[#FFF0EB] text-[#FF6B4A]',
        progressClass: 'bg-[#FF6B4A]',
        icon: <BellRinging weight="fill" className="w-4 h-4" />,
      };
  }
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration: number = 3200) => {
      const id = 'toast_' + Date.now() + Math.random().toString(36).substring(2, 5);
      setToasts((prev) => [...prev.slice(-2), { id, message, type, duration }]);

      if (type === 'reward') {
        if (message.toLowerCase().includes('token')) {
          sound.tokenClink();
        } else {
          sound.awardCelebrate();
        }
      } else if (type === 'success') {
        sound.playSuccess();
      } else if (type === 'error' || type === 'warning') {
        sound.softReject();
      } else {
        sound.notificationPing();
      }

      const timer = setTimeout(() => {
        timersRef.current.delete(id);
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
      timersRef.current.set(id, timer);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-[calc(env(safe-area-inset-top)+68px)] inset-x-0 z-[80] flex flex-col items-center pointer-events-none px-4 gap-2">
        {toasts.map((toast) => {
          const style = getToastVisualStyle(toast.type);
          return (
            <div
              key={toast.id}
              role="status"
              aria-live="polite"
              className={`pointer-events-auto relative overflow-hidden w-full mx-auto max-w-[360px] rounded-2xl border-2 border-b-4 px-3.5 py-2.5 shadow-lg backdrop-blur-sm flex items-center gap-3 transition-all duration-150 ease-out animate-fade-up motion-reduce:animate-none ${style.surfaceClass}`}
            >
              <span
                aria-hidden="true"
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${style.badgeClass}`}
              >
                {style.icon}
              </span>
              <p className="text-[13px] sm:text-sm font-bold flex-1 leading-snug min-w-0 break-words">
                {toast.message}
              </p>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="w-7 h-7 rounded-full hover:bg-black/5 flex items-center justify-center shrink-0 transition-colors cursor-pointer active:scale-95"
                aria-label="Dismiss toast"
              >
                <X weight="bold" className="w-3.5 h-3.5 opacity-75" />
              </button>
              <span
                aria-hidden="true"
                className={`toast-progress-bar absolute bottom-0 inset-x-0 h-[3px] origin-left rtl:origin-right ${style.progressClass}`}
                style={{ animationDuration: `${toast.duration}ms` }}
              />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
