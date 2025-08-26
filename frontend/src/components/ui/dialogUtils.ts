import type { ConfirmDialogProps } from './ConfirmDialog';

// 預設對話框工具函數
export function createErrorDialog(
  error: Error | string,
  options?: Partial<ConfirmDialogProps>
): Partial<ConfirmDialogProps> {
  const message = error instanceof Error ? error.message : error;
  
  return {
    type: 'error',
    title: '發生錯誤',
    message,
    confirmText: '確定',
    showCancel: false,
    confirmVariant: 'danger',
    ...options
  };
}

export function createWarningDialog(
  title: string,
  message: string,
  options?: Partial<ConfirmDialogProps>
): Partial<ConfirmDialogProps> {
  return {
    type: 'warning',
    title,
    message,
    confirmText: '繼續',
    cancelText: '取消',
    confirmVariant: 'warning',
    ...options
  };
}