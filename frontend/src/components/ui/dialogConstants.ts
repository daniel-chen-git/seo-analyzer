import type { DialogType } from './ConfirmDialog';

// 預定義對話框配置
export const DIALOG_PRESETS = {
  // 錯誤處理相關
  retryAnalysis: {
    type: 'warning' as DialogType,
    title: '重新分析確認',
    message: '是否要重新開始 SEO 分析？當前進度將會丟失。',
    confirmText: '重新開始',
    confirmVariant: 'warning' as const
  },
  
  cancelAnalysis: {
    type: 'warning' as DialogType,
    title: '取消分析確認',
    message: '確定要取消當前的 SEO 分析嗎？已收集的數據將會保留。',
    confirmText: '取消分析',
    cancelText: '繼續分析',
    confirmVariant: 'danger' as const
  },

  pauseAnalysis: {
    type: 'info' as DialogType,
    title: '暫停分析',
    message: '分析將暫停，您可以隨時恢復。已收集的數據會保留。',
    confirmText: '確定暫停',
    cancelText: '繼續分析',
    confirmVariant: 'warning' as const
  },
  
  resumeAnalysis: {
    type: 'info' as DialogType,
    title: '恢復分析',
    message: '是否要恢復分析？將從暫停的位置繼續執行。',
    confirmText: '恢復分析',
    cancelText: '保持暫停',
    confirmVariant: 'success' as const
  },

  deleteAnalysis: {
    type: 'error' as DialogType,
    title: '刪除分析結果',
    message: '確定要刪除此分析結果嗎？此操作無法撤銷。',
    confirmText: '刪除',
    confirmVariant: 'danger' as const
  },

  networkError: {
    type: 'error' as DialogType,
    title: '網路連接錯誤',
    message: '無法連接到伺服器。請檢查您的網路連接並重試。',
    confirmText: '重試',
    cancelText: '稍後再試',
    confirmVariant: 'primary' as const
  },

  sessionExpired: {
    type: 'warning' as DialogType,
    title: '會話已過期',
    message: '您的登入會話已過期，需要重新登入才能繼續使用。',
    confirmText: '重新登入',
    confirmVariant: 'warning' as const,
    showCancel: false
  },

  unsavedChanges: {
    type: 'warning' as DialogType,
    title: '未保存的更改',
    message: '您有未保存的更改。離開此頁面將會丟失這些更改。',
    confirmText: '離開',
    cancelText: '留在此頁',
    confirmVariant: 'danger' as const
  },

  dataLoss: {
    type: 'error' as DialogType,
    title: '數據丟失風險',
    message: '此操作可能導致數據丟失。請確認您已備份重要數據。',
    confirmText: '我已備份',
    confirmVariant: 'danger' as const
  },

  startAnalysis: {
    type: 'info' as DialogType,
    title: '開始 SEO 分析',
    message: '即將開始分析您的關鍵字。分析過程可能需要幾分鐘時間，請確保網路連接穩定。',
    confirmText: '開始分析',
    cancelText: '稍後再分析',
    confirmVariant: 'success' as const
  }
};