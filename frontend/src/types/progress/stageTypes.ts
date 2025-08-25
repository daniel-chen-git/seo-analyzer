// 階段狀態類型定義

export type StageStatus = 'pending' | 'running' | 'completed' | 'error';

export interface StageInfo {
  status: StageStatus;
  progress: number;               // 0-100 階段進度
  startTime?: Date;
  completedTime?: Date;
  subtasks: SubtaskStatus[];
  errorMessage?: string;
}

export interface SubtaskStatus {
  id: string;
  name: string;
  status: StageStatus;
  progress?: number;
}

// 三個主要階段的配置
export interface StageConfig {
  key: 'serp' | 'crawler' | 'ai';
  name: string;
  description: string;
  icon: string;
  estimatedTime: number; // 預估時間（秒）
  subtasks: {
    id: string;
    name: string;
    estimatedTime: number;
  }[];
}

// 預定義的階段配置
export const STAGE_CONFIGS: Record<'serp' | 'crawler' | 'ai', StageConfig> = {
  serp: {
    key: 'serp',
    name: 'SERP 分析',
    description: '搜尋引擎結果頁面分析',
    icon: '🔍',
    estimatedTime: 18,
    subtasks: [
      { id: 'search', name: '搜尋關鍵字排名', estimatedTime: 6 },
      { id: 'analyze', name: '分析競爭對手頁面', estimatedTime: 8 },
      { id: 'evaluate', name: '評估關鍵字難度', estimatedTime: 4 }
    ]
  },
  crawler: {
    key: 'crawler',
    name: '網頁爬蟲',
    description: '目標網頁內容爬取',
    icon: '🕷️',
    estimatedTime: 22,
    subtasks: [
      { id: 'fetch', name: '爬取目標網頁內容', estimatedTime: 8 },
      { id: 'extract', name: '提取結構化資料', estimatedTime: 6 },
      { id: 'analyze', name: '分析競爭對手內容', estimatedTime: 8 }
    ]
  },
  ai: {
    key: 'ai',
    name: 'AI 內容生成',
    description: 'AI 模型分析與內容生成',
    icon: '🤖',
    estimatedTime: 17,
    subtasks: [
      { id: 'process', name: 'AI 模型分析', estimatedTime: 5 },
      { id: 'generate', name: '生成 SEO 優化內容', estimatedTime: 8 },
      { id: 'format', name: '格式化報告輸出', estimatedTime: 4 }
    ]
  }
} as const;