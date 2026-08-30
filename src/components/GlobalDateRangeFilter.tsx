import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  RotateCcw,
  Check,
  X,
  SlidersHorizontal,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { DateRangeFilter } from '../types/mmm';

interface GlobalDateRangeFilterProps {
  availableDates: string[];
  dateRange: DateRangeFilter;
  onChangeDateRange: (newRange: DateRangeFilter) => void;
  className?: string;
  variant?: 'header' | 'banner' | 'inline';
}

export function formatDateBR(dateStr?: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('-') && dateStr.length >= 10) {
    const [year, month, day] = dateStr.slice(0, 10).split('-');
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

export function formatDateLongBR(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number);
    if (!year || !month || !day) return dateStr;
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return formatDateBR(dateStr);
  }
}

export const GlobalDateRangeFilter: React.FC<GlobalDateRangeFilterProps> = memo(({
  availableDates,
  dateRange,
  onChangeDateRange,
  className = '',
  variant = 'header'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const minAvailableDate = availableDates[0] || '';
  const maxAvailableDate = availableDates[availableDates.length - 1] || '';
  const totalWeeksCount = availableDates.length;

  // Active start and end dates
  const activeStartDate = dateRange.startDate || minAvailableDate;
  const activeEndDate = dateRange.endDate || maxAvailableDate;

  // Local draft state for popover editing before clicking "Aplicar"
  const [draftPreset, setDraftPreset] = useState<DateRangeFilter['preset']>(dateRange.preset || 'all');
  const [draftStart, setDraftStart] = useState<string>(activeStartDate);
  const [draftEnd, setDraftEnd] = useState<string>(activeEndDate);
  const [compareEnabled, setCompareEnabled] = useState<boolean>(false);

  // Sync draft state whenever popover opens or dateRange changes
  useEffect(() => {
    if (isOpen) {
      setDraftPreset(dateRange.preset || 'all');
      setDraftStart(activeStartDate);
      setDraftEnd(activeEndDate);
    }
  }, [isOpen, dateRange, activeStartDate, activeEndDate]);

  // Calculate selected weeks count
  const selectedWeeksCount = useMemo(() => {
    if (availableDates.length === 0) return 0;
    return availableDates.filter(
      d => (!activeStartDate || d >= activeStartDate) && (!activeEndDate || d <= activeEndDate)
    ).length;
  }, [availableDates, activeStartDate, activeEndDate]);

  const isFiltered = useMemo(() => {
    if (!minAvailableDate || !maxAvailableDate) return false;
    return (
      (activeStartDate && activeStartDate > minAvailableDate) ||
      (activeEndDate && activeEndDate < maxAvailableDate)
    );
  }, [activeStartDate, activeEndDate, minAvailableDate, maxAvailableDate]);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectPresetInDraft = useCallback((preset: DateRangeFilter['preset']) => {
    setDraftPreset(preset);
    if (availableDates.length === 0) return;

    if (preset === 'all') {
      setDraftStart(minAvailableDate);
      setDraftEnd(maxAvailableDate);
    } else if (preset === '3m') {
      const startIdx = Math.max(0, availableDates.length - 13);
      setDraftStart(availableDates[startIdx]);
      setDraftEnd(maxAvailableDate);
    } else if (preset === '6m') {
      const startIdx = Math.max(0, availableDates.length - 26);
      setDraftStart(availableDates[startIdx]);
      setDraftEnd(maxAvailableDate);
    } else if (preset === '12m') {
      const startIdx = Math.max(0, availableDates.length - 52);
      setDraftStart(availableDates[startIdx]);
      setDraftEnd(maxAvailableDate);
    } else if (preset === 'year1') {
      const endIdx = Math.min(availableDates.length - 1, 51);
      setDraftStart(minAvailableDate);
      setDraftEnd(availableDates[endIdx]);
    } else if (preset === 'year2') {
      const startIdx = Math.min(availableDates.length - 1, 52);
      setDraftStart(availableDates[startIdx]);
      setDraftEnd(maxAvailableDate);
    }
  }, [availableDates, minAvailableDate, maxAvailableDate]);

  const applyPresetDirectly = useCallback((preset: DateRangeFilter['preset']) => {
    if (availableDates.length === 0) return;

    if (preset === 'all') {
      onChangeDateRange({
        startDate: minAvailableDate,
        endDate: maxAvailableDate,
        preset: 'all'
      });
      setIsOpen(false);
      return;
    }

    if (preset === '3m') {
      const startIdx = Math.max(0, availableDates.length - 13);
      onChangeDateRange({
        startDate: availableDates[startIdx],
        endDate: maxAvailableDate,
        preset: '3m'
      });
      setIsOpen(false);
      return;
    }

    if (preset === '6m') {
      const startIdx = Math.max(0, availableDates.length - 26);
      onChangeDateRange({
        startDate: availableDates[startIdx],
        endDate: maxAvailableDate,
        preset: '6m'
      });
      setIsOpen(false);
      return;
    }

    if (preset === '12m') {
      const startIdx = Math.max(0, availableDates.length - 52);
      onChangeDateRange({
        startDate: availableDates[startIdx],
        endDate: maxAvailableDate,
        preset: '12m'
      });
      setIsOpen(false);
      return;
    }

    if (preset === 'year1') {
      const endIdx = Math.min(availableDates.length - 1, 51);
      onChangeDateRange({
        startDate: minAvailableDate,
        endDate: availableDates[endIdx],
        preset: 'year1'
      });
      setIsOpen(false);
      return;
    }

    if (preset === 'year2') {
      const startIdx = Math.min(availableDates.length - 1, 52);
      onChangeDateRange({
        startDate: availableDates[startIdx],
        endDate: maxAvailableDate,
        preset: 'year2'
      });
      setIsOpen(false);
      return;
    }
  }, [availableDates, minAvailableDate, maxAvailableDate, onChangeDateRange]);

  const handleApplyDraft = useCallback(() => {
    onChangeDateRange({
      startDate: draftStart,
      endDate: draftEnd,
      preset: draftPreset
    });
    setIsOpen(false);
  }, [onChangeDateRange, draftStart, draftEnd, draftPreset]);

  const handleResetToAll = useCallback(() => {
    onChangeDateRange({
      startDate: minAvailableDate,
      endDate: maxAvailableDate,
      preset: 'all'
    });
    setIsOpen(false);
  }, [onChangeDateRange, minAvailableDate, maxAvailableDate]);

  if (availableDates.length === 0) {
    return null;
  }

  // Label text matching Google Looker Studio
  const getLookerStudioPresetLabel = (p?: DateRangeFilter['preset']) => {
    switch (p) {
      case '3m': return 'Últimos 3 meses';
      case '6m': return 'Últimos 6 meses';
      case '12m': return 'Últimos 12 meses';
      case 'year1': return 'Ano 1';
      case 'year2': return 'Ano 2';
      case 'custom': return 'Personalizado';
      default: return isFiltered ? 'Personalizado' : 'Todo o período';
    }
  };

  // ----------------------------------------------------
  // Looker Studio Dialog Popover Content
  // ----------------------------------------------------
  const renderLookerStudioPopover = () => {
    return (
      <div
        id="looker-studio-date-picker-dialog"
        className="absolute right-0 sm:right-auto sm:left-0 top-full mt-2 w-[min(calc(100vw-1.5rem),32rem)] max-w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden text-slate-800 dark:text-slate-100 font-sans animate-fade-in"
        style={{
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 10px 25px -5px rgba(0, 0, 0, 0.15)'
        }}
      >
        {/* Google Data Studio Header */}
        <div className="bg-slate-50 dark:bg-slate-800/90 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#1a73e8]" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              Controle de período (Looker Studio)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-md transition"
            aria-label="Fechar painel de datas"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2-Column Looker Studio Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 text-xs">
          {/* Left Column: Preset Options (Looker Studio Style List) */}
          <div className="md:col-span-5 p-3 bg-slate-50/50 dark:bg-slate-900/50 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 block">
              Tipo de período
            </span>

            <div className="space-y-0.5">
              {[
                { id: 'all', label: 'Todo o período (Automático)' },
                { id: '3m', label: 'Últimos 3 meses (13 semanas)' },
                { id: '6m', label: 'Últimos 6 meses (26 semanas)' },
                { id: '12m', label: 'Últimos 12 meses (52 semanas)' },
                ...(totalWeeksCount > 60
                  ? [
                      { id: 'year1', label: 'Ano 1 (1º Ano histórico)' },
                      { id: 'year2', label: 'Ano 2 (2º Ano histórico)' }
                    ]
                  : []),
                { id: 'custom', label: 'Personalizado...' }
              ].map(item => {
                const isSelected = draftPreset === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectPresetInDraft(item.id as any)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md flex items-center justify-between text-xs transition ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/70 text-[#1a73e8] dark:text-blue-300 font-semibold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{item.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#1a73e8] dark:text-blue-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Custom Start/End Date Pickers */}
          <div className="md:col-span-7 p-4 space-y-4 bg-white dark:bg-slate-900">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Intervalo de datas
              </span>

              <div className="space-y-3">
                {/* Start Date */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Data de início
                  </label>
                  <div className="relative">
                    <select
                      value={draftStart}
                      onChange={e => {
                        setDraftPreset('custom');
                        setDraftStart(e.target.value);
                        if (draftEnd < e.target.value) {
                          setDraftEnd(e.target.value);
                        }
                      }}
                      className="w-full text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30 focus:border-[#1a73e8] shadow-2xs"
                    >
                      {availableDates.map(d => (
                        <option key={`start-${d}`} value={d}>
                          {formatDateBR(d)} ({formatDateLongBR(d)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Data de término
                  </label>
                  <div className="relative">
                    <select
                      value={draftEnd}
                      onChange={e => {
                        setDraftPreset('custom');
                        setDraftEnd(e.target.value);
                        if (draftStart > e.target.value) {
                          setDraftStart(e.target.value);
                        }
                      }}
                      className="w-full text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30 focus:border-[#1a73e8] shadow-2xs"
                    >
                      {availableDates.map(d => (
                        <option key={`end-${d}`} value={d} disabled={d < draftStart}>
                          {formatDateBR(d)} ({formatDateLongBR(d)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Looker Studio Comparison Toggle */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={compareEnabled}
                  onChange={e => setCompareEnabled(e.target.checked)}
                  className="rounded border-slate-300 text-[#1a73e8] focus:ring-[#1a73e8] w-3.5 h-3.5"
                />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Comparar período
                </span>
              </label>
              {compareEnabled && (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 pl-5.5">
                  Comparar com período imediatamente anterior de igual duração.
                </p>
              )}
            </div>

            {/* Selected range preview */}
            <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 rounded-md text-[11px] text-blue-800 dark:text-blue-300">
              <div className="font-semibold flex items-center justify-between">
                <span>Período selecionado:</span>
                <span className="font-mono">{formatDateBR(draftStart)} – {formatDateBR(draftEnd)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Google Data Studio Footer Action Bar */}
        <div className="bg-slate-50 dark:bg-slate-800/90 px-4 py-2.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetToAll}
            className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2 py-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700 transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Redefinir
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700 px-3 py-1.5 rounded-md transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleApplyDraft}
              className="text-xs font-bold text-white bg-[#1a73e8] hover:bg-[#1557b0] px-4 py-1.5 rounded-md shadow-xs transition"
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ----------------------------------------------------
  // Banner Variant (Looker Studio Dashboard Control Bar)
  // ----------------------------------------------------
  if (variant === 'banner') {
    return (
      <div
        id="looker-studio-date-control-banner"
        className={`bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-3 sm:p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3 transition-colors ${className}`}
      >
        {/* Left Side: Looker Studio Filter Widget Label & Selector */}
        <div className="flex items-center gap-3">
          <div className="relative" ref={popoverRef}>
            {/* Google Looker Studio Main Button */}
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className={`px-3 py-1.5 rounded-md border text-xs font-medium flex items-center gap-2 transition-all shadow-2xs select-none ${
                isOpen || isFiltered
                  ? 'bg-white dark:bg-slate-800 border-[#1a73e8] text-slate-800 dark:text-slate-100 ring-2 ring-[#1a73e8]/20'
                  : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500'
              }`}
              title="Clique para alterar o controle de período (Looker Studio)"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-[#1a73e8] shrink-0" />
              <div className="flex items-center gap-1.5 text-left">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {getLookerStudioPresetLabel(dateRange.preset)}:
                </span>
                <span className="font-mono text-slate-600 dark:text-slate-300">
                  {formatDateBR(activeStartDate)} – {formatDateBR(activeEndDate)}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ml-1 ${isOpen ? 'rotate-180 text-[#1a73e8]' : ''}`} />
            </button>

            {/* Popover Dropdown */}
            {isOpen && renderLookerStudioPopover()}
          </div>

          {/* Looker Studio Badge */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{selectedWeeksCount} de {totalWeeksCount} semanas analisadas</span>
          </div>
        </div>

        {/* Right Side: Quick Presets (Google Data Studio Chips) */}
        <div className="flex items-center flex-wrap gap-1.5">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mr-1 hidden sm:inline">
            Atalhos:
          </span>

          <button
            type="button"
            onClick={() => applyPresetDirectly('all')}
            className={`px-2.5 py-1 text-xs rounded-full border transition ${
              dateRange.preset === 'all' && !isFiltered
                ? 'bg-[#1a73e8] border-[#1a73e8] text-white font-semibold shadow-2xs'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Todo o Período
          </button>

          <button
            type="button"
            onClick={() => applyPresetDirectly('3m')}
            className={`px-2.5 py-1 text-xs rounded-full border transition ${
              dateRange.preset === '3m'
                ? 'bg-[#1a73e8] border-[#1a73e8] text-white font-semibold shadow-2xs'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Últimos 3 Meses
          </button>

          <button
            type="button"
            onClick={() => applyPresetDirectly('6m')}
            className={`px-2.5 py-1 text-xs rounded-full border transition ${
              dateRange.preset === '6m'
                ? 'bg-[#1a73e8] border-[#1a73e8] text-white font-semibold shadow-2xs'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Últimos 6 Meses
          </button>

          <button
            type="button"
            onClick={() => applyPresetDirectly('12m')}
            className={`px-2.5 py-1 text-xs rounded-full border transition ${
              dateRange.preset === '12m'
                ? 'bg-[#1a73e8] border-[#1a73e8] text-white font-semibold shadow-2xs'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Últimos 12 Meses
          </button>

          {isFiltered && (
            <button
              type="button"
              onClick={handleResetToAll}
              title="Redefinir para todo o período"
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition ml-0.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // Header Variant (Looker Studio Compact Dropdown Button)
  // ----------------------------------------------------
  return (
    <div className={`relative ${className}`} ref={popoverRef}>
      {/* Google Data Studio / Looker Studio Filter Button */}
      <button
        id="global-date-range-selector"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`px-2.5 sm:px-3 py-1.5 rounded-md border text-xs font-medium flex items-center gap-1.5 sm:gap-2 transition-all shadow-2xs shrink-0 select-none ${
          isOpen || isFiltered
            ? 'bg-white dark:bg-slate-800 border-[#1a73e8] text-slate-800 dark:text-slate-100 ring-2 ring-[#1a73e8]/20'
            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500'
        }`}
        title="Filtrar dados por intervalo de datas (Google Looker Studio)"
      >
        <CalendarIcon className="w-3.5 h-3.5 text-[#1a73e8] shrink-0" />
        <div className="flex items-center gap-1.5 text-left">
          <span className="hidden xl:inline font-semibold text-slate-800 dark:text-slate-200">
            {getLookerStudioPresetLabel(dateRange.preset)}:
          </span>
          <span className="font-mono text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 hidden sm:inline">
            {formatDateBR(activeStartDate)} – {formatDateBR(activeEndDate)}
          </span>
          <span className="font-mono text-[10px] sm:hidden text-slate-600 dark:text-slate-300">
            {formatDateBR(activeStartDate).slice(0, 5)}–{formatDateBR(activeEndDate).slice(0, 5)}
          </span>
          {isFiltered && (
            <span className="bg-[#1a73e8] text-white text-[10px] px-1.5 py-0.2 rounded font-bold shrink-0">
              {selectedWeeksCount} sem
            </span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${isOpen ? 'rotate-180 text-[#1a73e8]' : ''}`} />
      </button>

      {/* Popover Dropdown */}
      {isOpen && renderLookerStudioPopover()}
    </div>
  );
});

GlobalDateRangeFilter.displayName = 'GlobalDateRangeFilter';

