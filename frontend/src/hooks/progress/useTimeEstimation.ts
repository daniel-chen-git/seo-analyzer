import { useCallback, useMemo } from 'react';
import { STAGE_CONFIGS } from '../../types/progress/stageTypes';
import type { ProgressState, StageType } from '../../types/progress';

// 基礎時間估算配置
const BASE_ESTIMATES = {
  serp: 18,    // SERP 分析: 15-20 秒
  crawler: 22, // 網頁爬蟲: 20-25 秒  
  ai: 17       // AI 生成: 15-20 秒
} as const;

// 效率調整參數
const EFFICIENCY_ADJUSTMENT_RATE = 0.3; // 調整率：30%
const MIN_EFFICIENCY_FACTOR = 0.5;      // 最小效率係數：50%
const MAX_EFFICIENCY_FACTOR = 2.0;      // 最大效率係數：200%

export interface TimeEstimationResult {
  estimatedTotalTime: number;      // 總預估時間（秒）
  estimatedRemainingTime: number;  // 剩餘時間（秒）
  formattedRemainingTime: string;  // 格式化的剩餘時間顯示
  formattedTotalTime: string;      // 格式化的總時間顯示
  overallProgress: number;         // 整體進度 0-100
  efficiencyFactor: number;        // 當前效率係數
}

export function useTimeEstimation() {
  // 格式化時間顯示（秒 -> "mm:ss" 格式）
  const formatTime = useCallback((seconds: number): string => {
    if (seconds <= 0) return '00:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // 計算整體進度（基於當前階段和階段進度）
  const calculateOverallProgress = useCallback((currentStage: 1 | 2 | 3, stageProgress: number): number => {
    // 每個階段的權重
    const stageWeights = {
      1: BASE_ESTIMATES.serp,
      2: BASE_ESTIMATES.crawler, 
      3: BASE_ESTIMATES.ai
    };
    
    const totalWeight = BASE_ESTIMATES.serp + BASE_ESTIMATES.crawler + BASE_ESTIMATES.ai;
    
    // 已完成階段的權重總和
    let completedWeight = 0;
    for (let stage = 1; stage < currentStage; stage++) {
      completedWeight += stageWeights[stage as 1 | 2 | 3];
    }
    
    // 當前階段的完成權重
    const currentStageWeight = (stageWeights[currentStage] * stageProgress) / 100;
    
    // 計算整體進度
    const overallProgress = ((completedWeight + currentStageWeight) / totalWeight) * 100;
    
    return Math.min(100, Math.max(0, overallProgress));
  }, []);

  // 根據實際執行效率調整預估時間
  const adjustEstimateByEfficiency = useCallback((
    actualElapsedTime: number,
    expectedElapsedTime: number
  ): number => {
    if (expectedElapsedTime <= 0) return 1.0;
    
    // 計算當前效率係數（實際時間 / 預期時間）
    const currentEfficiency = actualElapsedTime / expectedElapsedTime;
    
    // 應用調整率來平滑效率變化
    const adjustedEfficiency = 1 + (currentEfficiency - 1) * EFFICIENCY_ADJUSTMENT_RATE;
    
    // 限制效率係數在合理範圍內
    return Math.min(MAX_EFFICIENCY_FACTOR, Math.max(MIN_EFFICIENCY_FACTOR, adjustedEfficiency));
  }, []);

  // 計算剩餘時間
  const calculateRemainingTime = useCallback((
    progressState: ProgressState,
    efficiencyFactor?: number
  ): number => {
    const { currentStage, stageProgress, timing } = progressState;
    const now = new Date().getTime();
    const elapsedTime = (now - timing.startTime.getTime()) / 1000;
    
    // 計算當前效率係數
    const currentOverallProgress = calculateOverallProgress(currentStage, stageProgress);
    const expectedElapsedTime = (timing.estimatedTotalTime * currentOverallProgress) / 100;
    const currentEfficiency = efficiencyFactor ?? adjustEstimateByEfficiency(elapsedTime, expectedElapsedTime);
    
    // 調整後的總預估時間
    const adjustedTotalTime = timing.estimatedTotalTime * currentEfficiency;
    
    // 剩餘時間 = 調整後總時間 - 已用時間
    const remainingTime = Math.max(0, adjustedTotalTime - elapsedTime);
    
    return remainingTime;
  }, [calculateOverallProgress, adjustEstimateByEfficiency]);

  // 計算時間估算結果
  const calculateTimeEstimation = useCallback((progressState: ProgressState): TimeEstimationResult => {
    const { currentStage, stageProgress, timing } = progressState;
    const now = new Date().getTime();
    const elapsedTime = (now - timing.startTime.getTime()) / 1000;
    
    // 計算整體進度
    const overallProgress = calculateOverallProgress(currentStage, stageProgress);
    
    // 計算效率係數
    const expectedElapsedTime = (timing.estimatedTotalTime * overallProgress) / 100;
    const efficiencyFactor = adjustEstimateByEfficiency(elapsedTime, expectedElapsedTime);
    
    // 計算調整後的總時間和剩餘時間
    const adjustedTotalTime = timing.estimatedTotalTime * efficiencyFactor;
    const remainingTime = calculateRemainingTime(progressState, efficiencyFactor);
    
    return {
      estimatedTotalTime: adjustedTotalTime,
      estimatedRemainingTime: remainingTime,
      formattedRemainingTime: formatTime(remainingTime),
      formattedTotalTime: formatTime(adjustedTotalTime),
      overallProgress,
      efficiencyFactor
    };
  }, [calculateOverallProgress, adjustEstimateByEfficiency, calculateRemainingTime, formatTime]);

  // 獲取階段配置信息
  const getStageConfig = useCallback((stageType: StageType) => {
    return STAGE_CONFIGS[stageType];
  }, []);

  // 計算初始預估時間（基於所有階段）
  const calculateInitialEstimate = useMemo((): number => {
    return BASE_ESTIMATES.serp + BASE_ESTIMATES.crawler + BASE_ESTIMATES.ai;
  }, []);

  return {
    calculateTimeEstimation,
    calculateRemainingTime,
    calculateOverallProgress,
    adjustEstimateByEfficiency,
    formatTime,
    getStageConfig,
    calculateInitialEstimate,
    BASE_ESTIMATES
  };
}