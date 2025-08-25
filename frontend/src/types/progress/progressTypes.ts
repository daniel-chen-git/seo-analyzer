// 進度追蹤類型定義

export type ProgressStatus = 'idle' | 'running' | 'completed' | 'error' | 'cancelled';

export type StageType = 'serp' | 'crawler' | 'ai';

export interface ProgressState {
  currentStage: 1 | 2 | 3;
  overallProgress: number;        // 0-100 整體進度
  stageProgress: number;          // 0-100 當前階段進度
  status: ProgressStatus;
  
  // 階段狀態
  stages: {
    serp: StageStatus;
    crawler: StageStatus;
    ai: StageStatus;
  };
  
  // 時間追蹤
  timing: {
    startTime: Date;
    currentStageStartTime: Date;
    estimatedTotalTime: number;    // 總預估時間（秒）
    estimatedRemainingTime: number; // 剩餘時間（秒）
  };
  
  // 任務相關
  jobId: string;
  canCancel: boolean;
}

// 進度更新數據格式（來自 WebSocket 或 API）
export interface ProgressUpdate {
  current_stage: 1 | 2 | 3;
  overall_progress: number;
  stage_progress: number;
  estimated_remaining: number;
  subtask_updates?: SubtaskUpdate[];
  error_message?: string;
}

export interface SubtaskUpdate {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress?: number;
}