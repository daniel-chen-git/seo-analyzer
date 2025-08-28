import { useState, useCallback } from 'react';
import type { ToastState, ToastType } from './toastTypes';

export interface AddToastConfig {
  type: ToastType;
  message: string;
  duration?: number;
  title?: string;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const addToast = useCallback((config: AddToastConfig) => {
    const id = Date.now().toString();
    const toast: ToastState = {
      id,
      type: config.type || 'info',
      message: config.message,
      title: config.title,
      duration: config.duration || 5000,
      createdAt: new Date(),
      isClosing: false,
      isPaused: false,
      closable: true,
      showIcon: true
    };

    setToasts(prev => [...prev, toast]);

    // 自動移除 toast
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts
  };
}