import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, Sparkles, X } from 'lucide-react';
import { THEME } from '../../theme/tokens';
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

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 3200) => {
    const id = 'toast_' + Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

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
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getIcon = (type?: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-[#3DBE6D] shrink-0" />;
      case 'reward':
        return <Sparkles className="w-5 h-5 text-[#FFC93C] shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-[#E5484D] shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-[#5B5BD6] shrink-0" />;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container at top of viewport */}
      <div className="fixed top-4 left-0 right-0 z-50 flex flex-col items-center pointer-events-none px-4 gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-[#E6E8EE] shadow-lg max-w-sm w-full animate-in fade-in slide-in-from-top-4 duration-200"
            style={{
              borderColor:
                toast.type === 'reward'
                  ? '#FFE8A3'
                  : toast.type === 'success'
                  ? '#B8ECC8'
                  : '#E6E8EE',
            }}
          >
            {getIcon(toast.type)}
            <p className="text-sm font-bold text-[#1F2430] flex-1 leading-snug">
              {toast.message}
            </p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[#6B7280] hover:text-[#1F2430] p-1 rounded-full cursor-pointer"
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
