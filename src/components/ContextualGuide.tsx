import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Info, ChevronDown, ChevronUp, Sparkles, Lightbulb, X } from 'lucide-react';

interface InfoTooltipProps {
  content: React.ReactNode;
  title?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  content,
  title,
  className = '',
  size = 'sm'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        isOpen &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <span className={`relative inline-flex items-center align-middle ml-1 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="text-slate-400 hover:text-blue-600 focus:outline-none transition rounded-full p-0.5"
        aria-label={title || 'Informações explicativas'}
      >
        <HelpCircle className={`${iconSize} stroke-[2.2]`} />
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-slate-100 text-xs rounded-xl shadow-xl border border-slate-800 z-50 animate-fade-in pointer-events-auto"
        >
          {title && (
            <div className="font-bold text-white text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1.5 border-b border-slate-800 pb-1">
              <Info className="w-3 h-3 text-blue-400" />
              {title}
            </div>
          )}
          <div className="text-slate-300 leading-relaxed font-normal">{content}</div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </span>
  );
};

interface StepGuidanceBannerProps {
  id: string;
  title: string;
  subtitle: string;
  stepNumber: string;
  tips: { icon?: string; text: string }[];
  proTip?: string;
  onOpenFullTour?: () => void;
  defaultExpanded?: boolean;
}

export const StepGuidanceBanner: React.FC<StepGuidanceBannerProps> = ({
  id,
  title,
  subtitle,
  stepNumber,
  tips,
  proTip,
  onOpenFullTour,
  defaultExpanded = true
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div
      id={`guide-banner-${id}`}
      className="bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 border border-blue-200/80 rounded-2xl p-4 shadow-sm transition-all"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm shadow-blue-500/20 shrink-0">
            {stepNumber}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">{title}</h3>
              <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                Guia Rápido
              </span>
            </div>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenFullTour && (
            <button
              onClick={onOpenFullTour}
              className="text-xs text-blue-700 hover:text-blue-900 bg-white hover:bg-blue-50 border border-blue-200 font-semibold px-2.5 py-1 rounded-lg transition flex items-center gap-1 shadow-2xs"
            >
              <Sparkles className="w-3 h-3 text-blue-600" />
              Tour Completo
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200/60 transition"
            title={isExpanded ? 'Recolher dicas' : 'Expandir dicas'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsDismissed(true)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/60 transition"
            title="Ocultar guia"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-blue-200/60 space-y-2.5 animate-fade-in text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {tips.map((tip, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2 rounded-lg bg-white/80 border border-blue-100 text-slate-700"
              >
                <span className="text-sm shrink-0">{tip.icon || '✓'}</span>
                <span className="leading-snug">{tip.text}</span>
              </div>
            ))}
          </div>

          {proTip && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-100/60 text-blue-950 font-medium">
              <Lightbulb className="w-3.5 h-3.5 text-blue-700 shrink-0" />
              <span>{proTip}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
