import type { ReactNode } from 'react';
import { createContext, useContext, useState, useCallback } from 'react';
import type { ToastMessage } from '@/types/index.ts';
import { X, CheckCircle, WarningCircle, Warning, Info , Buildings , SignOut , CalendarBlank , CaretRight , MagnifyingGlass , House } from '@phosphor-icons/react';

interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${++toastId}`;
    const newToast: ToastMessage = { ...toast, id };
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, toast.duration || 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((message: string) => addToast({ type: 'success', message }), [addToast]);
  const error = useCallback((message: string) => addToast({ type: 'error', message }), [addToast]);
  const warning = useCallback((message: string) => addToast({ type: 'warning', message }), [addToast]);
  const info = useCallback((message: string) => addToast({ type: 'info', message }), [addToast]);

  const icons = {
    success: <CheckCircle size={18} />,
    error: <WarningCircle size={18} />,
    warning: <Warning size={18} />,
    info: <Info size={18} />,
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(toast => (
            <div key={toast.id} className={`toast toast-${toast.type}`}>
              {icons[toast.type]}
              <span style={{ flex: 1 }}>{toast.message}</span>
              <button
                className="btn-icon btn-ghost"
                onClick={() => removeToast(toast.id)}
                style={{ marginLeft: '8px', padding: '2px' }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
