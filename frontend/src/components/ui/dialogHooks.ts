import { useState, useCallback, createElement } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import type { DialogType, ConfirmDialogProps } from './ConfirmDialog';

// 對話框管理 Hook
export function useConfirmDialog() {
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    config: Partial<ConfirmDialogProps>;
    resolve: (confirmed: boolean) => void;
  } | null>(null);

  const openDialog = useCallback((config: Partial<ConfirmDialogProps>): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({
        isOpen: true,
        config,
        resolve
      });
    });
  }, []);

  const closeDialog = useCallback((confirmed: boolean) => {
    if (dialog) {
      dialog.resolve(confirmed);
      setDialog(null);
    }
  }, [dialog]);

  const confirmDialog = useCallback(() => {
    closeDialog(true);
  }, [closeDialog]);

  const cancelDialog = useCallback(() => {
    closeDialog(false);
  }, [closeDialog]);

  // 便利方法
  const confirm = useCallback(async (
    title: string,
    message: string,
    options?: Partial<ConfirmDialogProps>
  ): Promise<boolean> => {
    return openDialog({
      title,
      message,
      ...options
    });
  }, [openDialog]);

  const alert = useCallback(async (
    title: string,
    message: string,
    type: DialogType = 'info'
  ): Promise<boolean> => {
    return openDialog({
      title,
      message,
      type,
      showCancel: false,
      confirmText: '確定'
    });
  }, [openDialog]);

  const DialogComponent = dialog ? createElement(ConfirmDialog, {
    isOpen: dialog.isOpen,
    title: dialog.config.title || '',
    message: dialog.config.message || '',
    onConfirm: confirmDialog,
    onCancel: cancelDialog,
    ...dialog.config
  }) : null;

  return {
    openDialog,
    confirm,
    alert,
    DialogComponent
  };
}