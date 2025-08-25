/**
 * 表單格式化工具函數
 */

// 清理關鍵字輸入
export const cleanKeywordInput = (input: string): string => {
  return input
    .trim()
    .replace(/\s+/g, ' ')  // 移除多餘空格
    .toLowerCase();
};

// 清理受眾描述輸入
export const cleanAudienceInput = (input: string): string => {
  return input
    .trim()
    .replace(/\n\s*\n/g, '\n\n')  // 移除多餘的空行
    .replace(/\s+/g, ' ');        // 移除多餘空格
};

// 格式化時間顯示
export const formatEstimatedTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds} 秒`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (remainingSeconds === 0) {
    return `${minutes} 分鐘`;
  }
  
  return `${minutes} 分 ${remainingSeconds} 秒`;
};

// 格式化進度百分比
export const formatProgress = (progress: number): string => {
  return `${Math.round(progress)}%`;
};

// 生成表單摘要
export const generateFormSummary = (data: {
  keyword: string;
  audience: string;
  options: {
    generate_draft: boolean;
    include_faq: boolean;
    include_table: boolean;
  };
}): string => {
  const selectedOptions = [];
  if (data.options.generate_draft) selectedOptions.push('內容草稿');
  if (data.options.include_faq) selectedOptions.push('常見問答');
  if (data.options.include_table) selectedOptions.push('資料表格');
  
  return `關鍵字: "${data.keyword}" | 目標受眾: ${data.audience.slice(0, 50)}${data.audience.length > 50 ? '...' : ''} | 分析選項: ${selectedOptions.join(', ')}`;
};