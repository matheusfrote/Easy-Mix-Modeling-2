/**
 * Synthetic Marketing Mix Modeling (MMM) Dataset Generator
 * Generates 104 weeks (2 full years) of realistic weekly marketing and revenue data
 * with carryover (adstock), diminishing returns (Hill saturation), seasonality, and holidays.
 */

export interface SyntheticRow {
  date: string;
  revenue: number;
  sales: number;
  google_ads_spend: number;
  meta_ads_spend: number;
  youtube_spend: number;
  tiktok_spend: number;
  tv_spend: number;
  google_ads_impressions: number;
  meta_impressions: number;
  youtube_impressions: number;
  holiday: number;
  promotion: number;
  economic_index: number;
}

export function generateSyntheticDataset(seed = 42): {
  rows: SyntheticRow[];
  csv: string;
} {
  const rows: SyntheticRow[] = [];
  const numWeeks = 104; // 2 years of weekly data
  const startDate = new Date(2024, 0, 1); // Jan 1, 2024

  // Channel true parameters for simulation
  // Google Ads: High efficiency, quick adstock (alpha=0.2), moderate saturation
  // Meta Ads: Strong scale, medium adstock (alpha=0.35), reaches saturation at higher spend
  // YouTube: Brand building, higher adstock (alpha=0.6), high half-saturation
  // TikTok: Fast decaying adstock (alpha=0.25), lower saturation threshold
  // TV: Long carryover (alpha=0.75), high capacity, moderate base ROI
  
  let prevAdstockGoogle = 0;
  let prevAdstockMeta = 0;
  let prevAdstockYoutube = 0;
  let prevAdstockTiktok = 0;
  let prevAdstockTV = 0;

  // Simple pseudo-random generator with seed
  let currentSeed = seed;
  const pseudoRandom = () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };

  const normalRandom = (mean = 0, std = 1) => {
    const u1 = Math.max(1e-6, pseudoRandom());
    const u2 = Math.max(1e-6, pseudoRandom());
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z * std;
  };

  for (let week = 0; week < numWeeks; week++) {
    const curDate = new Date(startDate);
    curDate.setDate(startDate.getDate() + week * 7);
    const dateStr = curDate.toISOString().split('T')[0];

    const weekOfYear = Math.floor((week % 52) + 1);

    // Holidays & Seasonality
    // Q4 holiday spikes (Black Friday ~week 47, Christmas ~week 51, Summer sales ~week 26)
    const isBlackFriday = weekOfYear === 47;
    const isChristmas = weekOfYear === 51 || weekOfYear === 52;
    const isSummerSale = weekOfYear === 26 || weekOfYear === 27;
    const isHoliday = isBlackFriday || isChristmas ? 1 : 0;
    const isPromotion = isSummerSale || isBlackFriday ? 1 : (pseudoRandom() > 0.85 ? 1 : 0);

    // Annual Fourier Seasonality wave
    const annualSine = Math.sin((2 * Math.PI * weekOfYear) / 52);
    const annualCosine = Math.cos((2 * Math.PI * weekOfYear) / 52);
    const seasonalityMultiplier = 1.0 + 0.18 * annualSine - 0.12 * annualCosine;

    // Macroeconomic index (e.g. consumer sentiment 95 - 105)
    const economicIndex = 100 + 4 * Math.sin(week / 15) + normalRandom(0, 1);

    // Base spend with seasonality adjustments and campaigns
    const spendMultiplier = isHoliday ? 1.55 : (isPromotion ? 1.3 : 1.0);

    const googleSpend = Math.max(8000, Math.round((28000 + normalRandom(0, 4500) + (isHoliday ? 18000 : 0)) * spendMultiplier));
    const metaSpend = Math.max(10000, Math.round((32000 + normalRandom(0, 5000) + (isHoliday ? 22000 : 0)) * spendMultiplier));
    const youtubeSpend = Math.max(4000, Math.round((16000 + normalRandom(0, 3000) + (isPromotion ? 8000 : 0)) * (isHoliday ? 1.4 : 1.0)));
    const tiktokSpend = Math.max(3000, Math.round((12000 + normalRandom(0, 2500) + (isPromotion ? 6000 : 0)) * (isHoliday ? 1.3 : 1.0)));
    const tvSpend = Math.max(0, Math.round((weekOfYear >= 40 || weekOfYear <= 10 ? (24000 + normalRandom(0, 4000)) : (8000 + normalRandom(0, 3000))) * (isHoliday ? 1.6 : 1.0)));

    // Impressions calculation (with slight CPM variation)
    const googleImpressions = Math.round(googleSpend * (45 + normalRandom(0, 3)));
    const metaImpressions = Math.round(metaSpend * (62 + normalRandom(0, 4)));
    const youtubeImpressions = Math.round(youtubeSpend * (55 + normalRandom(0, 4)));

    // Adstock carryover
    const alphaGoogle = 0.20;
    const alphaMeta = 0.35;
    const alphaYoutube = 0.55;
    const alphaTiktok = 0.22;
    const alphaTV = 0.70;

    const adstockGoogle = googleSpend + alphaGoogle * prevAdstockGoogle;
    const adstockMeta = metaSpend + alphaMeta * prevAdstockMeta;
    const adstockYoutube = youtubeSpend + alphaYoutube * prevAdstockYoutube;
    const adstockTiktok = tiktokSpend + alphaTiktok * prevAdstockTiktok;
    const adstockTV = tvSpend + alphaTV * prevAdstockTV;

    prevAdstockGoogle = adstockGoogle;
    prevAdstockMeta = adstockMeta;
    prevAdstockYoutube = adstockYoutube;
    prevAdstockTiktok = adstockTiktok;
    prevAdstockTV = adstockTV;

    // Hill Saturation Curves: f(x) = MaxLift * (x^S / (x^S + K^S))
    // Google: high slope, K=45,000, MaxLift=160,000
    const hillGoogle = 175000 * (Math.pow(adstockGoogle, 1.2) / (Math.pow(adstockGoogle, 1.2) + Math.pow(48000, 1.2)));
    
    // Meta: K=55,000, MaxLift=135,000
    const hillMeta = 145000 * (Math.pow(adstockMeta, 1.1) / (Math.pow(adstockMeta, 1.1) + Math.pow(62000, 1.1)));
    
    // YouTube: K=35,000, MaxLift=80,000
    const hillYoutube = 85000 * (Math.pow(adstockYoutube, 1.0) / (Math.pow(adstockYoutube, 1.0) + Math.pow(38000, 1.0)));
    
    // TikTok: K=25,000, MaxLift=48,000
    const hillTiktok = 52000 * (Math.pow(adstockTiktok, 1.15) / (Math.pow(adstockTiktok, 1.15) + Math.pow(26000, 1.15)));
    
    // TV: K=60,000, MaxLift=70,000
    const hillTV = 78000 * (Math.pow(adstockTV, 0.95) / (Math.pow(adstockTV, 0.95) + Math.pow(65000, 0.95)));

    // Baseline Revenue (organic demand + growth trend)
    const baseTrend = 180000 + (week * 650); // slight growth over 2 years
    const holidayLift = isHoliday * 95000;
    const promoLift = isPromotion * 48000;
    const macroLift = (economicIndex - 100) * 1200;

    const baseRevenue = (baseTrend + holidayLift + promoLift + macroLift) * seasonalityMultiplier;
    const mediaRevenue = hillGoogle + hillMeta + hillYoutube + hillTiktok + hillTV;
    
    // Gaussian noise (approx 3% error)
    const noise = normalRandom(0, 12000);
    const totalRevenue = Math.max(50000, Math.round(baseRevenue + mediaRevenue + noise));
    const estimatedOrders = Math.round(totalRevenue / 185); // Avg order value ~R$ 185

    rows.push({
      date: dateStr,
      revenue: totalRevenue,
      sales: estimatedOrders,
      google_ads_spend: googleSpend,
      meta_ads_spend: metaSpend,
      youtube_spend: youtubeSpend,
      tiktok_spend: tiktokSpend,
      tv_spend: tvSpend,
      google_ads_impressions: googleImpressions,
      meta_impressions: metaImpressions,
      youtube_impressions: youtubeImpressions,
      holiday: isHoliday,
      promotion: isPromotion,
      economic_index: Math.round(economicIndex * 10) / 10,
    });
  }

  // Generate CSV Header & Content
  const headers = [
    'date',
    'revenue',
    'sales',
    'google_ads_spend',
    'meta_ads_spend',
    'youtube_spend',
    'tiktok_spend',
    'tv_spend',
    'google_ads_impressions',
    'meta_impressions',
    'youtube_impressions',
    'holiday',
    'promotion',
    'economic_index'
  ];

  const csvLines = [headers.join(',')];
  for (const row of rows) {
    csvLines.push([
      row.date,
      row.revenue,
      row.sales,
      row.google_ads_spend,
      row.meta_ads_spend,
      row.youtube_spend,
      row.tiktok_spend,
      row.tv_spend,
      row.google_ads_impressions,
      row.meta_impressions,
      row.youtube_impressions,
      row.holiday,
      row.promotion,
      row.economic_index
    ].join(','));
  }

  return {
    rows,
    csv: csvLines.join('\n')
  };
}
