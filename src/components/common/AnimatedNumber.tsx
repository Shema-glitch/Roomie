import React, { useState, useEffect, useRef } from 'react';

export interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
  className?: string;
  formatFn?: (val: number) => string;
}

/**
 * Pure cubic ease-out interpolation helper for smooth 300ms counter rolling.
 */
export function interpolateCounterValue(from: number, to: number, progress: number): number {
  const clamped = Math.min(1, Math.max(0, progress));
  const eased = 1 - Math.pow(1 - clamped, 3);
  return from + (to - from) * eased;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  durationMs = 300,
  className = '',
  formatFn,
}) => {
  const [displayValue, setDisplayValue] = useState<number>(value);
  const [isPopping, setIsPopping] = useState<boolean>(false);
  const prevValueRef = useRef<number>(value);

  useEffect(() => {
    const startValue = prevValueRef.current;
    if (startValue === value) {
      setDisplayValue(value);
      return;
    }

    prevValueRef.current = value;

    const prefersReducedMotion =
      typeof document !== 'undefined' &&
      (document.documentElement.classList.contains('reduce-motion') ||
        (typeof window !== 'undefined' &&
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches));

    if (prefersReducedMotion || typeof requestAnimationFrame === 'undefined') {
      setDisplayValue(value);
      return;
    }

    setIsPopping(true);
    const popTimer = setTimeout(() => setIsPopping(false), 320);

    const startTime = performance.now();
    let rafId = 0;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const current = interpolateCounterValue(startValue, value, progress);
      setDisplayValue(progress >= 1 ? value : current);

      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(popTimer);
    };
  }, [value, durationMs]);

  const formatted = formatFn
    ? formatFn(displayValue)
    : decimals > 0
    ? displayValue.toFixed(decimals)
    : String(Math.round(displayValue));

  return (
    <span
      className={`inline-block tabular-nums ${isPopping ? 'animate-number-pop' : ''} ${className}`}
    >
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};
