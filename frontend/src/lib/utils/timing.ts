/**
 * Throttles a function to only execute at most once every `limit` milliseconds.
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  let trailingCall: (() => void) | null = null;

  const run = () => {
    if (trailingCall) {
      trailingCall();
      trailingCall = null;
      setTimeout(run, limit);
    } else {
      inThrottle = false;
    }
  };

  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(run, limit);
    } else {
      trailingCall = () => func.apply(this, args);
    }
  };
}

/**
 * Debounces a function to only execute after `delay` milliseconds have passed since the last call.
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}
