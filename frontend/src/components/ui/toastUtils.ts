import type { ToastConfig } from './toastTypes';

export function createErrorToast(
  error: Error | string,
  options: Partial<ToastConfig> = {}
): ToastConfig {
  const message = error instanceof Error ? error.message : error;
  
  return {
    type: 'error',
    title: '發生錯誤',
    message,
    duration: 0, // 錯誤消息不自動關閉
    closable: true,
    showIcon: true,
    showProgress: false,
    ...options
  };
}

export function createSuccessToast(
  message: string,
  options: Partial<ToastConfig> = {}
): ToastConfig {
  return {
    type: 'success',
    title: '操作成功',
    message,
    duration: 3000,
    closable: true,
    showIcon: true,
    showProgress: false,
    ...options
  };
}

export function createWarningToast(
  message: string,
  options: Partial<ToastConfig> = {}
): ToastConfig {
  return {
    type: 'warning',
    title: '注意',
    message,
    duration: 5000,
    closable: true,
    showIcon: true,
    showProgress: false,
    ...options
  };
}