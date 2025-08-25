// 進度動畫工具函數

/**
 * 動畫類名生成器
 */
export class AnimationBuilder {
  private classes: string[] = [];

  // 基礎動畫
  fadeIn(duration: 'fast' | 'normal' | 'slow' = 'normal') {
    const durations = { fast: '200ms', normal: '300ms', slow: '500ms' };
    this.classes.push(`animate-fade-in duration-${durations[duration]}`);
    return this;
  }

  slideUp(duration: 'fast' | 'normal' | 'slow' = 'normal') {
    const durations = { fast: '200ms', normal: '400ms', slow: '600ms' };
    this.classes.push(`animate-slide-up duration-${durations[duration]}`);
    return this;
  }

  // 進度特定動畫
  progressFlow() {
    this.classes.push('animate-progress-flow');
    return this;
  }

  pulseRing() {
    this.classes.push('animate-pulse-ring relative');
    return this;
  }

  breathingGlow() {
    this.classes.push('animate-breathing-glow');
    return this;
  }

  gradientShift() {
    this.classes.push('animate-gradient-shift');
    return this;
  }

  successPop() {
    this.classes.push('animate-success-pop');
    return this;
  }

  shake() {
    this.classes.push('animate-shake');
    return this;
  }

  float() {
    this.classes.push('animate-float');
    return this;
  }

  // 條件動畫
  when(condition: boolean) {
    return condition ? this : new AnimationBuilder();
  }

  // 延遲
  delay(ms: number) {
    this.classes.push(`delay-${ms}`);
    return this;
  }

  // 建構結果
  build(): string {
    return this.classes.join(' ');
  }
}

/**
 * 建立動畫建構器
 */
export const animate = () => new AnimationBuilder();

/**
 * 進度狀態動畫映射
 */
export const getProgressStatusAnimation = (status: string): string => {
  switch (status) {
    case 'running':
      return animate()
        .breathingGlow()
        .gradientShift()
        .build();
    case 'completed':
      return animate()
        .successPop()
        .build();
    case 'error':
      return animate()
        .shake()
        .build();
    default:
      return '';
  }
};

/**
 * 進度條動畫類名
 */
export const getProgressBarAnimation = (status: string, showFlow: boolean = true): string => {
  const builder = animate();
  
  if (status === 'running' && showFlow) {
    builder.progressFlow();
  }
  
  return builder.build();
};

/**
 * 階段指示器動畫
 */
export const getStageIndicatorAnimation = (isActive: boolean, isCompleted: boolean): string => {
  const builder = animate();
  
  if (isCompleted) {
    builder.successPop();
  } else if (isActive) {
    builder.pulseRing().breathingGlow();
  }
  
  return builder.build();
};

/**
 * 按鈕動畫
 */
export const getButtonAnimation = (isLoading: boolean, isDisabled: boolean): string => {
  const builder = animate();
  
  if (isLoading) {
    // 加載狀態不需要特殊動畫，spinner 已經有旋轉
    return '';
  }
  
  if (!isDisabled) {
    builder.when(true); // 可以添加 hover 效果等
  }
  
  return builder.build();
};

/**
 * 時間估算器動畫
 */
export const getTimeEstimatorAnimation = (status: string): string => {
  const builder = animate();
  
  switch (status) {
    case 'running':
      builder.float();
      break;
    case 'completed':
      builder.successPop();
      break;
    case 'error':
      builder.shake();
      break;
  }
  
  return builder.build();
};

/**
 * 響應式動畫控制
 */
export const getResponsiveAnimationClasses = (): string => {
  return [
    // 大螢幕正常動畫
    'motion-safe:animate-normal',
    // 小螢幕減少動畫
    'sm:motion-safe:animate-reduced',
    // 支援減少動畫偏好
    'motion-reduce:animate-none'
  ].join(' ');
};

/**
 * GPU 加速優化類名
 */
export const getPerformanceOptimizedClasses = (): string => {
  return [
    'transform-gpu', // 啟用 GPU 加速
    'will-change-transform', // 告知瀏覽器變換即將發生
    'backface-visibility-hidden' // 隱藏背面以優化性能
  ].join(' ');
};

/**
 * 無障礙動畫控制
 */
export const getAccessibilityAnimationClasses = (): string => {
  return [
    // 尊重用戶的動畫偏好
    'motion-reduce:transition-none',
    'motion-reduce:animate-none',
    // 確保動畫不影響焦點
    'focus:outline-none',
    'focus-visible:outline-2',
    'focus-visible:outline-blue-500'
  ].join(' ');
};

/**
 * 組合動畫工具
 */
export const combineAnimations = (...animations: string[]): string => {
  return animations.filter(Boolean).join(' ');
};

/**
 * 動畫狀態檢查
 */
export const shouldAnimate = (
  condition: boolean = true,
  respectMotionPreference: boolean = true
): boolean => {
  if (!condition) return false;
  
  if (respectMotionPreference && typeof window !== 'undefined') {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  
  return true;
};

/**
 * 預設動畫配置
 */
export const ANIMATION_DEFAULTS = {
  duration: {
    fast: '200ms',
    normal: '300ms',
    slow: '500ms',
    progress: '800ms'
  },
  easing: {
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  },
  delays: {
    none: '0ms',
    short: '100ms',
    medium: '200ms',
    long: '300ms'
  }
} as const;