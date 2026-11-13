import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, Sparkles, X } from 'lucide-react';
import { sound } from '../../services/sound';

export type ToastType = 'success' | 'info' | 'reward' | 'error';

export interface ToastMessage {
  id: string;
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration: number = 3000) => {
      const id = 'toast_' + Date.now() + Math.random().toString(36).substring(2, 5);
      setToasts((prev) => [...prev.slice(-2), { id, message, type, duration }]);

      if (type === 'success' || type === 'reward') {
        sound.playSuccess();
      } else if (type === 'error') {
        sound.playCalmNotice();
      } else {
        sound.playPop();
      }

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    []
  );

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getIcon = (type?: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-[#2CA358] shrink-0" />;
      case 'reward':
        return <Sparkles className="w-5 h-5 text-[#8A6200] shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-[#E5484D] shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-[#5B5BD6] shrink-0" />;
    }
  };

  const getToastClasses = (type?: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-[#F0FDF4] border-2 border-[#86EFAC]';
      case 'reward':
        return 'bg-[#FFFBEB] border-2 border-[#FDE68A]';
      case 'error':
        return 'bg-[#FFF0ED] border-2 border-[#FFD7CF]';
      case 'info':
      default:
        return 'bg-white border-2 border-[#E6E8EE]';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-16 md:top-6 left-0 right-0 z-50 flex flex-col items-center pointer-events-none px-4 gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg max-w-sm w-full transition-all duration-150 ease-out animate-fade-up motion-reduce:animate-none ${getToastClasses(
              toast.type
            )}`}
          >
            {getIcon(toast.type)}
            <p className="text-sm font-bold text-[#1F2430] flex-1 leading-snug">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[#6B7280] hover:text-[#1F2430] active:scale-[0.95] p-1 rounded-full transition-all duration-150 cursor-pointer"
              aria-label="Dismiss toast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
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
