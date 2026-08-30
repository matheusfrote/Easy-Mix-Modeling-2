import React, { useState, useRef, useEffect, UIEvent } from 'react';
import { ArrowRight, ChevronRight, ChevronsLeftRight } from 'lucide-react';

interface ScrollableTableWrapperProps {
  children: React.ReactNode;
  className?: string;
  hintText?: string;
  minWidth?: string | number;
  showFadeGradients?: boolean;
}

/**
 * Responsive scroll container for data tables with touch momentum scrolling,
 * dynamic edge shadows/gradients, and an interactive scroll hint for mobile devices.
 */
export const ScrollableTableWrapper: React.FC<ScrollableTableWrapperProps> = ({
  children,
  className = '',
  hintText = 'Arraste para ver mais colunas',
  minWidth,
  showFadeGradients = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  const checkScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    // Allow 2px threshold for floating point inaccuracies
    const isOverflowing = scrollWidth > clientWidth + 2;
    const canLeft = scrollLeft > 5;
    const canRight = scrollLeft + clientWidth < scrollWidth - 5;

    setCanScrollLeft(canLeft);
    setCanScrollRight(isOverflowing && canRight);
  };

  useEffect(() => {
    checkScroll();

    const handleResize = () => {
      checkScroll();
    };

    window.addEventListener('resize', handleResize);
    
    // Also observe mutations / content size changes
    const observer = new ResizeObserver(() => {
      checkScroll();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, []);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    checkScroll();
    if (!hasScrolled && e.currentTarget.scrollLeft > 20) {
      setHasScrolled(true);
    }
  };

  const scrollRight = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  return (
    <div className={`relative w-full min-w-0 ${className}`}>
      {/* Mobile Scroll Hint Pill */}
      {canScrollRight && !hasScrolled && (
        <div className="md:hidden flex items-center justify-between px-2.5 py-1 mb-1.5 bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 rounded-md text-[11px] font-medium text-blue-700 dark:text-blue-300 animate-pulse transition-opacity duration-300">
          <span className="flex items-center gap-1.5">
            <ChevronsLeftRight className="w-3.5 h-3.5" />
            {hintText}
          </span>
          <button
            type="button"
            onClick={scrollRight}
            aria-label="Rolar para a direita"
            className="flex items-center gap-0.5 text-[10px] font-bold text-blue-800 dark:text-blue-200 uppercase tracking-wider pl-1.5 hover:underline"
          >
            Rolar <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Main Scroll Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full overflow-x-auto overscroll-x-contain touch-pan-x scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent rounded-lg"
        style={{
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div style={minWidth ? { minWidth } : undefined} className="w-full">
          {children}
        </div>
      </div>

      {/* Left Edge Shadow/Gradient Mask */}
      {showFadeGradients && canScrollLeft && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-slate-900/10 dark:from-slate-950/40 to-transparent rounded-l-lg transition-opacity duration-200"
        />
      )}

      {/* Right Edge Shadow/Gradient Mask */}
      {showFadeGradients && canScrollRight && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-900/15 dark:from-slate-950/50 to-transparent rounded-r-lg transition-opacity duration-200 flex items-center justify-end pr-1"
        >
          <span className="text-slate-400 dark:text-slate-500 opacity-60 hidden sm:inline-block">
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      )}
    </div>
  );
};
