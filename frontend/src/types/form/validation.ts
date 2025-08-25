// 驗證狀態類型
export type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

// 驗證結果介面
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// 欄位驗證狀態
export interface FieldValidationState {
  status: ValidationStatus;
  errors: string[];
  warnings?: string[];
  characterCount?: number;
  maxLength?: number;
}

// 表單驗證狀態
export interface FormValidationState {
  isValid: boolean;
  isValidating: boolean;
  fields: Record<string, FieldValidationState>;
  globalErrors: string[];
}

// 驗證規則配置
export interface ValidationConfig {
  debounceMs?: number;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  showWarnings?: boolean;
}

// 驗證錯誤類型
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}