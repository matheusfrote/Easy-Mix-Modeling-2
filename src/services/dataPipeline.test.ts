import { describe, expect, it } from 'vitest';
import { inferColumnMappings } from './dataMapper';
import { calculateDataReadinessScore } from './dataReadiness';
import { sanitizeDataset, validateDataset } from './dataValidator';
import { ColumnMapping } from '../types/mmm';

function controlledRows(count = 16) {
  return Array.from({ length: count }, (_, index) => ({
    week: new Date(Date.UTC(2025, 0, 6 + index * 7)).toISOString().slice(0, 10),
    revenue: 1000 + index * 13,
    search_spend: 100 + index * 7,
    search_impressions: 10_000 + index * 420,
    holiday: index % 5 === 0 ? 1 : 0
  }));
}

describe('scientific data pipeline validation', () => {
  it('pairs spend and exposure while keeping controls separate', () => {
    const rows = controlledRows();
    const mappings = inferColumnMappings(Object.keys(rows[0]), rows);
    const spend = mappings.find(mapping => mapping.columnName === 'search_spend');
    const exposure = mappings.find(mapping => mapping.columnName === 'search_impressions');

    expect(spend).toMatchObject({ mappedType: 'media_spend' });
    expect(exposure).toMatchObject({ mappedType: 'media_impressions' });
    expect(exposure?.channelName).toBe(spend?.channelName);
    expect(mappings.find(mapping => mapping.columnName === 'holiday')?.mappedType).toBe('control');

    const validation = validateDataset(rows, mappings);
    const readiness = calculateDataReadinessScore(rows, mappings, validation);
    expect(validation.isModelBlocked).toBe(false);
    expect(readiness.isModelReady).toBe(true);
  });

  it('does not treat reach or frequency as impressions', () => {
    const rows = controlledRows().map(row => ({
      ...row,
      search_reach: row.search_impressions / 2,
      search_frequency: 2
    }));
    const mappings = inferColumnMappings(Object.keys(rows[0]), rows);

    expect(mappings.find(mapping => mapping.columnName === 'search_reach')?.mappedType).toBe('media_reach');
    expect(mappings.find(mapping => mapping.columnName === 'search_frequency')?.mappedType).toBe('media_frequency');
  });

  it('blocks invalid dates and a spend channel without exposure', () => {
    const rows = controlledRows();
    rows[3].week = 'not-a-date';
    const mappings = inferColumnMappings(Object.keys(rows[0]), rows)
      .filter(mapping => mapping.columnName !== 'search_impressions');

    const validation = validateDataset(rows, mappings);
    expect(validation.canRunModel).toBe(false);
    expect(validation.isModelBlocked).toBe(true);
    expect(validation.alerts.map(alert => alert.id)).toEqual(expect.arrayContaining([
      'invalid_dates', 'missing_media_exposure'
    ]));
  });

  it('sanitizes structure without replacing missing or negative measurements with zero', () => {
    const mappings: ColumnMapping[] = [
      { columnName: 'week', mappedType: 'date' },
      { columnName: 'revenue', mappedType: 'kpi' },
      { columnName: 'search_spend', mappedType: 'media_spend', channelName: 'Search' },
      { columnName: 'search_impressions', mappedType: 'media_impressions', channelName: 'Search' },
      { columnName: 'temperature', mappedType: 'control' }
    ];
    const result = sanitizeDataset([
      { week: '2025-01-13', revenue: null, search_spend: -10, search_impressions: 100, temperature: 20 },
      { week: '2025-01-06', revenue: 100, search_spend: 10, search_impressions: 80, temperature: 18 },
      { week: '2025-01-06', revenue: 150, search_spend: 15, search_impressions: 120, temperature: 22 }
    ], mappings);

    expect(result.missingValuesImputed).toBe(0);
    expect(result.negativeValuesClipped).toBe(0);
    expect(result.cleanedRows[0]).toMatchObject({
      week: '2025-01-06', revenue: 250, search_spend: 25,
      search_impressions: 200, temperature: 20
    });
    expect(result.cleanedRows[1].revenue).toBeNull();
    expect(result.cleanedRows[1].search_spend).toBe(-10);
  });
});
