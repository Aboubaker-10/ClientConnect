// Performance optimization utilities for animations and rendering

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Optimized animation classes
export const animationClasses = {
  fadeIn: 'animate-optimized opacity-0 animate-[fadeInUp_0.3s_ease-out_forwards]',
  slideIn: 'animate-optimized translate-x-[-30px] opacity-0 animate-[slideInLeft_0.3s_ease-out_forwards]',
  scaleIn: 'animate-optimized scale-95 opacity-0 animate-[scaleIn_0.2s_ease-out_forwards]',
  pulse: 'animate-optimized-pulse',
  spin: 'animate-spin animate-optimized',
} as const;

// Performance monitoring
export const measurePerformance = (name: string, fn: () => void) => {
  if (typeof performance !== 'undefined') {
    const start = performance.now();
    fn();
    const end = performance.now();
    console.log(`${name} took ${end - start} milliseconds`);
  } else {
    fn();
  }
};

// Intersection Observer for lazy animations
export const createIntersectionObserver = (
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {}
) => {
  if (typeof IntersectionObserver === 'undefined') {
    return null;
  }

  return new IntersectionObserver(callback, {
    threshold: 0.1,
    rootMargin: '50px',
    ...options,
  });
};

// Optimized CSS class names for better performance
export const getOptimizedClassName = (baseClass: string, isActive?: boolean) => {
  const classes = [baseClass];
  
  if (isActive) {
    classes.push('transition-optimized');
  }
  
  return classes.join(' ');
};