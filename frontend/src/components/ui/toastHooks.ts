import { useState, useCallback } from 'react';
import type { ToastConfig, ToastState, ToastPosition } from './toastTypes';

export function useToast(defaultPosition: ToastPosition = 'top-right') {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  // 添加 toast
  const addToast = useCallback((config: ToastConfig): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newToast: ToastState = {
      id,
      type: 'info',
      position: defaultPosition,
      duration: 5000,
      closable: true,
      showIcon: true,
      showProgress: false,
      isPaused: false,
      isClosing: false,
      createdAt: new Date(),
      ...config,
      remainingTime: config.duration || 5000
    };

    setToasts(prev => [...prev, newToast]);
    return id;
  }, [defaultPosition]);

  // 移除 toast
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // 開始關閉 toast
  const closeToast = useCallback((id: string) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, isClosing: true } : toast
    ));
    
    // 延遲移除以播放動畫
    setTimeout(() => removeToast(id), 300);
  }, [removeToast]);

  // 暫停計時
  const pauseToast = useCallback((id: string) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, isPaused: true } : toast
    ));
  }, []);

  // 恢復計時
  const resumeToast = useCallback((id: string) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, isPaused: false } : toast
    ));
  }, []);

  // 更新剩餘時間
  const updateRemainingTime = useCallback((id: string, remainingTime: number) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, remainingTime } : toast
    ));
  }, []);

  // 清空所有 toast
  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // 清空指定位置的 toast
  const clearToastsAtPosition = useCallback((position: ToastPosition) => {
    setToasts(prev => prev.filter(toast => toast.position !== position));
  }, []);

  // 便利方法
  const success = useCallback((message: string, options?: Partial<ToastConfig>) => {
    return addToast({ ...options, type: 'success', message });
  }, [addToast]);

  const error = useCallback((message: string, options?: Partial<ToastConfig>) => {
    return addToast({ ...options, type: 'error', message, duration: 0 });
  }, [addToast]);

  const warning = useCallback((message: string, options?: Partial<ToastConfig>) => {
    return addToast({ ...options, type: 'warning', message, duration: 8000 });
  }, [addToast]);

  const info = useCallback((message: string, options?: Partial<ToastConfig>) => {
    return addToast({ ...options, type: 'info', message });
  }, [addToast]);

  const loading = useCallback((message: string, options?: Partial<ToastConfig>) => {
    return addToast({ 
      ...options, 
      type: 'loading', 
      message, 
      duration: 0, 
      closable: false,
      showProgress: true 
    });
  }, [addToast]);

  // 按位置分組的 toasts
  const toastsByPosition = toasts.reduce((acc, toast) => {
    const position = toast.position || 'top-right';
    if (!acc[position]) {
      acc[position] = [];
    }
    acc[position].push(toast);
    return acc;
  }, {} as Record<ToastPosition, ToastState[]>);

  return {
    toasts,
    toastsByPosition,
    addToast,
    removeToast,
    closeToast,
    pauseToast,
    resumeToast,
    updateRemainingTime,
    clearAllToasts,
    clearToastsAtPosition,
    success,
    error,
    warning,
    info,
    loading
  };
}