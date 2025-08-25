/**
 * 表單驗證工具函數
 */

// 關鍵字驗證
export const validateKeyword = (keyword: string): { isValid: boolean; message?: string } => {
  if (!keyword.trim()) {
    return { isValid: false, message: '關鍵字不可為空' };
  }
  
  if (keyword.length > 50) {
    return { isValid: false, message: '關鍵字長度不可超過 50 字元' };
  }
  
  // 檢查特殊字元
  const invalidChars = /[^\w\s\u4e00-\u9fff]/g;
  if (invalidChars.test(keyword)) {
    return { isValid: false, message: '關鍵字含有不允許的特殊字元' };
  }
  
  return { isValid: true };
};

// 受眾描述驗證
export const validateAudience = (audience: string): { isValid: boolean; message?: string } => {
  if (!audience.trim()) {
    return { isValid: false, message: '受眾描述不可為空' };
  }
  
  if (audience.length > 200) {
    return { isValid: false, message: '受眾描述長度不可超過 200 字元' };
  }
  
  return { isValid: true };
};

// 分析選項驗證
export const validateAnalysisOptions = (options: {
  generate_draft: boolean;
  include_faq: boolean;
  include_table: boolean;
}): { isValid: boolean; message?: string } => {
  const selectedCount = Object.values(options).filter(Boolean).length;
  
  if (selectedCount === 0) {
    return { isValid: false, message: '請選擇至少一個分析選項' };
  }
  
  return { isValid: true };
};

// 字元計數工具
export const getCharacterCount = (text: string): number => {
  return text.length;
};

// 計算字元使用百分比
export const getCharacterUsagePercent = (text: string, maxLength: number): number => {
  return Math.min((text.length / maxLength) * 100, 100);
};

// 檢查是否接近字元限制
export const isNearCharacterLimit = (text: string, maxLength: number, threshold = 0.8): boolean => {
  return (text.length / maxLength) >= threshold;
};