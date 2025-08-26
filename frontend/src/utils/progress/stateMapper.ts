/**
 * 分析狀態輔助工具
 * 提供便利的狀態檢查和操作函數
 */

import type { AnalysisStatus } from '@/hooks/api'

/**
 * 分析 Hook 狀態介面
 */
interface AnalysisHookState {
  status: AnalysisStatus
  isRunning: boolean
  canCancel: boolean
  canPause: boolean
  canResume: boolean
}

/**
 * 檢查分析是否正在運行
 */
export function isAnalysisActive(analysisHook: AnalysisHookState): boolean {
  return analysisHook.isRunning || analysisHook.status === 'starting'
}

/**
 * 檢查分析是否可以被取消
 */
export function canCancelAnalysis(analysisHook: AnalysisHookState): boolean {
  return analysisHook.canCancel
}

/**
 * 檢查分析是否可以被暫停
 */
export function canPauseAnalysis(analysisHook: AnalysisHookState): boolean {
  return analysisHook.canPause
}

/**
 * 檢查分析是否可以被恢復
 */
export function canResumeAnalysis(analysisHook: AnalysisHookState): boolean {
  return analysisHook.canResume
}