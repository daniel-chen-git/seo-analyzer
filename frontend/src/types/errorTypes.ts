// 錯誤相關類型定義

export interface ErrorEntry {
  id: string;
  type: string;
  message: string;
  timestamp: Date;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  metadata?: Record<string, unknown>;
  resolved?: boolean;
  resolvedAt?: Date;
}

export interface ErrorContext {
  component?: string;
  action?: string;
  url?: string;
  userAgent?: string;
  userId?: string;
  sessionId?: string;
}

export interface ErrorReport {
  error: ErrorEntry;
  context: ErrorContext;
  stackTrace?: string;
  additionalData?: Record<string, unknown>;
}