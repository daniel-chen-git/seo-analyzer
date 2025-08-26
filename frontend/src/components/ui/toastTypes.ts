export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export type ToastPosition = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface ToastConfig {
  /** 通知類型 */
  type?: ToastType;
  /** 通知標題 */
  title?: string;
  /** 通知內容 */
  message: string;
  /** 顯示位置 */
  position?: ToastPosition;
  /** 自動關閉時間（毫秒），0 表示不自動關閉 */
  duration?: number;
  /** 是否可手動關閉 */
  closable?: boolean;
  /** 是否顯示圖示 */
  showIcon?: boolean;
  /** 是否顯示進度條 */
  showProgress?: boolean;
  /** 點擊回調 */
  onClick?: () => void;
  /** 關閉回調 */
  onClose?: () => void;
  /** 自定義樣式 */
  className?: string;
  /** 額外數據 */
  data?: Record<string, unknown>;
}

export interface ToastState extends ToastConfig {
  /** 唯一 ID */
  id: string;
  /** 創建時間 */
  createdAt: Date;
  /** 是否正在關閉 */
  isClosing: boolean;
  /** 剩餘時間（毫秒） */
  remainingTime?: number;
  /** 是否暫停計時 */
  isPaused: boolean;
}