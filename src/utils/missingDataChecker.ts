import { UploadResponse } from '../services/apiClient';
import { DateRangeFilter, ReadinessItem } from '../types/mmm';

export interface ColumnMissingStats {
  columnName: string;
  missingCount: number;
  totalCount: number;
  missingPercentage: number;
  role: string;
}

export interface DateRangeMissingDataAnalysis {
  hasHighMissingData: boolean; // triggers when missingPercentage > 10
  missingPercentage: number;
  missingCellsCount: number;
  totalCellsCount: number;
  totalRowsInRange: number;
  affectedColumns: string[];
  columnBreakdown: ColumnMissingStats[];
  dateRangeLabel: string;
  readinessItem?: ReadinessItem;
  readinessScore?: number;
  readinessTier?: string;
  recommendation: string;
  econometricImpact: string;
  isDateFiltered: boolean;
}

/**
 * Analyzes the missing data within the active date range using the readiness state and dataset.
 * Triggers a warning if missing data > 10%.
 */
export function analyzeDateRangeMissingData(
  dataset: UploadResponse | null,
  dateRange?: DateRangeFilter
): DateRangeMissingDataAnalysis {
  if (!dataset) {
    return {
      hasHighMissingData: false,
      missingPercentage: 0,
      missingCellsCount: 0,
      totalCellsCount: 0,
      totalRowsInRange: 0,
      affectedColumns: [],
      columnBreakdown: [],
      dateRangeLabel: 'Todo o histórico',
      recommendation: '',
      econometricImpact: '',
      isDateFiltered: false
    };
  }

  const { readiness, validation, mappings } = dataset;
  const missingReadinessItem = readiness?.items?.find(item => item.id === 'missing_data');
  const rows = dataset.rows || dataset.previewRows || [];

  // Identify relevant columns (media spend, kpi, control, impressions, clicks)
  const dateCol = mappings?.find(m => m.mappedType === 'date')?.columnName;
  const relevantMappings = (mappings || []).filter(m =>
    ['media_spend', 'kpi', 'control', 'media_impressions', 'media_clicks'].includes(m.mappedType)
  );
  const relevantCols = relevantMappings.map(m => m.columnName);

  const startDate = dateRange?.startDate;
  const endDate = dateRange?.endDate;

  let filteredRows = rows;
  let dateRangeLabel = 'Todo o histórico';
  let isDateFiltered = false;

  if (dateCol && rows.length > 0 && (startDate || endDate)) {
    filteredRows = rows.filter(r => {
      const dStr = String(r[dateCol] || '').trim();
      if (!dStr) return true;
      if (startDate && dStr < startDate) return false;
      if (endDate && dStr > endDate) return false;
      return true;
    });
    isDateFiltered = true;

    if (startDate && endDate) {
      dateRangeLabel = `${startDate} a ${endDate}`;
    } else if (startDate) {
      dateRangeLabel = `A partir de ${startDate}`;
    } else if (endDate) {
      dateRangeLabel = `Até ${endDate}`;
    }
  }

  // Count missing cells across relevant columns in the filtered rows
  let missingCellsCount = 0;
  let totalCellsCount = 0;
  const colStatsMap: Record<string, { missingCount: number; totalCount: number; role: string }> = {};

  relevantMappings.forEach(m => {
    colStatsMap[m.columnName] = { missingCount: 0, totalCount: 0, role: m.mappedType };
  });

  if (filteredRows.length > 0 && relevantCols.length > 0) {
    filteredRows.forEach(row => {
      relevantCols.forEach(col => {
        const val = row[col];
        const isMissing =
          val === null ||
          val === undefined ||
          val === '' ||
          (typeof val === 'number' && isNaN(val)) ||
          (typeof val === 'string' && (val.trim() === '' || val.trim().toLowerCase() === 'nan' || val.trim().toLowerCase() === 'null'));

        totalCellsCount++;
        if (colStatsMap[col]) {
          colStatsMap[col].totalCount++;
          if (isMissing) {
            missingCellsCount++;
            colStatsMap[col].missingCount++;
          }
        }
      });
    });
  }

  // Compute missing percentage
  let missingPercentage = 0;

  if (totalCellsCount > 0 && !isNaN(missingCellsCount)) {
    missingPercentage = (missingCellsCount / totalCellsCount) * 100;
  }

  // If filtered slice didn't have detailed rows or rowCount > previewRows and date is not filtered,
  // rely on readiness score item and validation summary stats
  if ((totalCellsCount === 0 || !isDateFiltered) && missingReadinessItem) {
    if (validation?.integritySummary) {
      const allColsCount = relevantCols.length > 0 ? relevantCols.length : (dataset.columnCount || 6);
      const totalEstimatedCells = (dataset.rowCount || 104) * allColsCount;
      const totalMissing = validation.integritySummary.totalMissingCells || 0;
      if (totalEstimatedCells > 0) {
        missingPercentage = (totalMissing / totalEstimatedCells) * 100;
        missingCellsCount = totalMissing;
        totalCellsCount = totalEstimatedCells;
      }
    }

    // If readiness item explicitly failed (status === 'fail'), ensure high missing percentage threshold is respected
    if (missingReadinessItem.status === 'fail' && missingPercentage < 10.1) {
      // Parse percentage from details string if present (e.g. "14.2% de valores ausentes")
      const match = missingReadinessItem.details.match(/([0-9]+(\.[0-9]+)?)%/);
      if (match && match[1]) {
        missingPercentage = parseFloat(match[1]);
      } else {
        missingPercentage = 12.5; // Default fallback above 10%
      }
    }
  }

  // Prepare column breakdown
  const columnBreakdown: ColumnMissingStats[] = Object.entries(colStatsMap)
    .filter(([_, stats]) => stats.missingCount > 0)
    .map(([colName, stats]) => ({
      columnName: colName,
      missingCount: stats.missingCount,
      totalCount: stats.totalCount,
      missingPercentage: stats.totalCount > 0 ? (stats.missingCount / stats.totalCount) * 100 : 0,
      role: stats.role
    }));

  const affectedColumns = columnBreakdown.map(c => c.columnName);

  // Trigger warning if > 10% missing data in the current date range or readiness state failed on missing data
  const hasHighMissingData = missingPercentage > 10 || (missingReadinessItem?.status === 'fail' && missingPercentage > 3);

  const econometricImpact =
    'O Google Meridian utiliza amostragem Bayesiana (MCMC) e transformações de Adstock (efeito de memória acumulada). Lacunas e dados ausentes acima de 10% distorcem a taxa de decaimento, enviesam o cálculo do ROI e inflam os intervalos de credibilidade.';

  const recommendation =
    'Recomendamos preencher os valores ausentes utilizando imputação por mediana móvel no módulo de Check-up ou ajustar o filtro de datas para um período contínuo.';

  return {
    hasHighMissingData,
    missingPercentage: Number(missingPercentage.toFixed(1)),
    missingCellsCount,
    totalCellsCount,
    totalRowsInRange: filteredRows.length || dataset.rowCount,
    affectedColumns,
    columnBreakdown,
    dateRangeLabel,
    readinessItem: missingReadinessItem,
    readinessScore: readiness?.score,
    readinessTier: readiness?.tier,
    recommendation,
    econometricImpact,
    isDateFiltered
  };
}
