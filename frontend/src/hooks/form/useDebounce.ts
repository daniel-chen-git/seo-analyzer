import { useCallback, useRef } from 'react';

/**
 * useDebounce Hook
 * 提供防抖功能，延遲執行回調函數直到指定時間內沒有新的呼叫
 * 
 * @param callback - 要防抖的回調函數
 * @param delay - 延遲時間（毫秒）
 * @returns 防抖後的函數
 */
export function useDebounce<T extends (...args: never[]) => unknown>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<number | undefined>(undefined);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      // 清除之前的定時器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // 設置新的定時器
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  return debouncedCallback;
}

/**
 * useDebounceValue Hook
 * 對值進行防抖處理
 * 
 * @param value - 要防抖的值
 * @param delay - 延遲時間（毫秒）
 * @returns 防抖後的值
 */
export function useDebounceValue<T>(value: T, delay: number): T {
  const timeoutRef = useRef<number | undefined>(undefined);
  const valueRef = useRef<T>(value);

  const updateValue = useCallback(
    (newValue: T) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        valueRef.current = newValue;
      }, delay);
    },
    [delay]
  );

  // 當 value 改變時，更新防抖值
  if (value !== valueRef.current) {
    updateValue(value);
  }

  return valueRef.current;
}