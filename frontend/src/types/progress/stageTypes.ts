// 階段狀態類型定義

export type StageStatus = 'pending' | 'running' | 'completed' | 'error';

export interface StageInfo {
  status: StageStatus;
  progress: number;               // 0-100 階段進度
  startTime?: Date;
  completedTime?: Date;
  subtasks: SubtaskStatus[];
  errorMessage?: string;
  // 新增：動態描述相關
  currentSubtask?: string;        // 當前子任務名稱
  dataCount?: number;             // 數據計數（如已收集結果數）
  totalCount?: number;            // 總數據量（如總網站數）
  statusMessage?: string;         // 自定義狀態訊息
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

// 詳細階段描述配置
export interface StageDescription {
  title: string;
  subtitle: string;
  detail?: string;
  progressText?: string;
}

// 階段描述生成器配置
export interface StageDescriptionConfig {
  idle: StageDescription;
  starting: StageDescription;
  running: (stageInfo: StageInfo) => StageDescription;
  completed: (stageInfo: StageInfo) => StageDescription;
  error: (stageInfo: StageInfo) => StageDescription;
}

// 詳細階段描述配置
export const STAGE_DESCRIPTIONS: Record<'serp' | 'crawler' | 'ai', StageDescriptionConfig> = {
  serp: {
    idle: {
      title: 'SERP 分析',
      subtitle: '準備分析搜尋結果',
      detail: '即將開始搜尋引擎結果頁面分析'
    },
    starting: {
      title: 'SERP 分析',
      subtitle: '正在啟動分析...',
      detail: '初始化搜尋引擎分析模組'
    },
    running: (stageInfo: StageInfo) => ({
      title: 'SERP 分析進行中',
      subtitle: stageInfo.currentSubtask || '搜尋結果收集中...',
      detail: stageInfo.dataCount && stageInfo.totalCount 
        ? `已收集 ${stageInfo.dataCount}/${stageInfo.totalCount} 個搜尋結果`
        : stageInfo.statusMessage || '正在分析搜尋引擎排名和競爭對手',
      progressText: `${stageInfo.progress.toFixed(0)}% 完成`
    }),
    completed: (stageInfo: StageInfo) => ({
      title: 'SERP 分析完成',
      subtitle: '搜尋結果分析已完成',
      detail: stageInfo.dataCount 
        ? `成功分析了 ${stageInfo.dataCount} 個搜尋結果`
        : '已完成關鍵字排名和競爭對手分析',
      progressText: '100% 完成'
    }),
    error: (stageInfo: StageInfo) => ({
      title: 'SERP 分析失敗',
      subtitle: '搜尋結果分析出現錯誤',
      detail: stageInfo.errorMessage || '無法完成搜尋引擎結果分析'
    })
  },
  
  crawler: {
    idle: {
      title: '網頁爬蟲',
      subtitle: '準備爬取網頁內容',
      detail: '即將開始目標網頁內容爬取'
    },
    starting: {
      title: '網頁爬蟲',
      subtitle: '正在啟動爬蟲...',
      detail: '初始化網頁內容爬取模組'
    },
    running: (stageInfo: StageInfo) => ({
      title: '網頁爬取進行中',
      subtitle: stageInfo.currentSubtask || '網頁內容抓取中...',
      detail: stageInfo.dataCount && stageInfo.totalCount
        ? `已爬取 ${stageInfo.dataCount}/${stageInfo.totalCount} 個網站`
        : stageInfo.statusMessage || '正在爬取目標網頁和競爭對手內容',
      progressText: `${stageInfo.progress.toFixed(0)}% 完成`
    }),
    completed: (stageInfo: StageInfo) => ({
      title: '網頁爬取完成',
      subtitle: '網頁內容爬取已完成',
      detail: stageInfo.dataCount 
        ? `成功爬取了 ${stageInfo.dataCount} 個網站的內容`
        : '已完成目標網頁和競爭對手內容分析',
      progressText: '100% 完成'
    }),
    error: (stageInfo: StageInfo) => ({
      title: '網頁爬取失敗',
      subtitle: '網頁內容爬取出現錯誤',
      detail: stageInfo.errorMessage || '無法完成網頁內容爬取'
    })
  },
  
  ai: {
    idle: {
      title: 'AI 內容生成',
      subtitle: '準備 AI 分析',
      detail: '即將開始 AI 模型分析和內容生成'
    },
    starting: {
      title: 'AI 內容生成',
      subtitle: '正在啟動 AI 引擎...',
      detail: '初始化 AI 分析和生成模組'
    },
    running: (stageInfo: StageInfo) => ({
      title: 'AI 分析處理中',
      subtitle: stageInfo.currentSubtask || 'AI 正在生成 SEO 建議...',
      detail: stageInfo.statusMessage || '正在使用 AI 模型分析數據並生成優化建議',
      progressText: `${stageInfo.progress.toFixed(0)}% 完成`
    }),
    completed: () => ({
      title: 'AI 分析完成',
      subtitle: 'SEO 優化建議生成完成',
      detail: 'AI 已完成數據分析並生成詳細的 SEO 優化報告',
      progressText: '100% 完成'
    }),
    error: (stageInfo: StageInfo) => ({
      title: 'AI 分析失敗',
      subtitle: 'AI 內容生成出現錯誤',
      detail: stageInfo.errorMessage || '無法完成 AI 分析和內容生成'
    })
  }
} as const;

// 工具函數：獲取階段描述
export function getStageDescription(
  stageKey: 'serp' | 'crawler' | 'ai',
  stageInfo: StageInfo,
  globalStatus: 'idle' | 'starting' | 'running' | 'paused' | 'completed' | 'error' | 'cancelled' = 'idle'
): StageDescription {
  const config = STAGE_DESCRIPTIONS[stageKey];
  
  // 如果全域狀態是 starting 且這是第一個階段
  if (globalStatus === 'starting' && stageKey === 'serp') {
    return config.starting;
  }
  
  // 根據階段狀態返回對應描述
  switch (stageInfo.status) {
    case 'running':
      return config.running(stageInfo);
    case 'completed':
      return config.completed(stageInfo);
    case 'error':
      return config.error(stageInfo);
    case 'pending':
    default:
      return config.idle;
  }
}