import { z } from 'zod';

// 表單 Schema 設計
export const analyzeFormSchema = z.object({
  keyword: z.string()
    .min(1, '關鍵字不可為空')
    .max(50, '關鍵字長度不可超過 50 字元')
    .regex(/^[a-zA-Z0-9\s\u4e00-\u9fff]+$/, '含有不允許的特殊字元'),
    
  audience: z.string()
    .min(1, '受眾描述不可為空')
    .max(200, '受眾描述長度不可超過 200 字元'),
    
  options: z.object({
    generate_draft: z.boolean(),
    include_faq: z.boolean(),
    include_table: z.boolean()
  })
});

export type AnalyzeFormData = z.infer<typeof analyzeFormSchema>;

// 表單欄位狀態介面
export interface FormFieldState {
  value: string;
  error?: string;
  isTouched: boolean;
  isValidating: boolean;
}

// 分析選項介面
export interface AnalysisOptions {
  generate_draft: boolean;
  include_faq: boolean;
  include_table: boolean;
}

// 表單提交狀態
export interface SubmissionState {
  isSubmitting: boolean;
  isSubmitted: boolean;
  error?: string;
  result?: unknown;
}