import { describe, expect, it } from 'vitest';
import { MeridianModelConfig } from '../types/mmm';
import { attachExposureColumns, handleApiRequest } from './apiRouter';

const baseConfig: MeridianModelConfig = {
  dateColumn: 'week',
  kpiColumn: 'revenue',
  targetKpiType: 'revenue',
  mediaChannels: [{
    channelName: 'TV',
    channelType: 'tv',
    spendColumn: 'tv_spend'
  }],
  controlColumns: [],
  seasonalityFourierTerms: 2,
  mcmcChains: 2,
  mcmcDraws: 100,
  mcmcWarmup: 50,
  priors: {}
};

describe('attachExposureColumns', () => {
  it('maps a channel exposure separately from its spend column', () => {
    const result = attachExposureColumns(baseConfig, [
      { columnName: 'tv_spend', mappedType: 'media_spend', channelName: 'TV' },
      { columnName: 'tv_clicks', mappedType: 'media_clicks', channelName: 'TV' },
      { columnName: 'tv_impressions', mappedType: 'media_impressions', channelName: 'TV' }
    ]);

    expect(result.mediaChannels[0].impressionsColumn).toBe('tv_impressions');
    expect(result.mediaChannels[0].impressionsColumn).not.toBe('tv_spend');
  });

  it('leaves exposure absent when no valid mapping exists so Python returns 422', () => {
    const result = attachExposureColumns(baseConfig, [
      { columnName: 'tv_spend', mappedType: 'media_spend', channelName: 'TV' }
    ]);

    expect(result.mediaChannels[0].impressionsColumn).toBeUndefined();
  });
});

describe('unimplemented model features', () => {
  it.each(['/api/optimize-budget', '/api/simulate', '/api/report'])(
    'returns 501 for %s',
    async path => {
      const response = await handleApiRequest(path, 'POST', {});

      expect(response.status).toBe(501);
      expect(response.data.code).toBe('NOT_IMPLEMENTED');
    }
  );
});
