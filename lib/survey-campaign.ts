const CAMPAIGN_PERIOD_PATTERN = /^(20\d{2})-Q([1-4])$/;

export function normalizeSurveyCampaignPeriod(value: string) {
  return value.trim().toUpperCase();
}

export function isSurveyCampaignPeriod(value: string) {
  return CAMPAIGN_PERIOD_PATTERN.test(normalizeSurveyCampaignPeriod(value));
}

export function surveyCampaignPeriodForDate(date: Date) {
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
  return `${date.getUTCFullYear()}-Q${quarter}`;
}

export function shiftSurveyCampaignPeriod(period: string, quarters: number) {
  const normalized = normalizeSurveyCampaignPeriod(period);
  const match = CAMPAIGN_PERIOD_PATTERN.exec(normalized);
  if (!match) throw new Error("Ongeldige campagneperiode");
  const zeroBasedQuarter = Number(match[2]) - 1;
  const absoluteQuarter = Number(match[1]) * 4 + zeroBasedQuarter + quarters;
  const year = Math.floor(absoluteQuarter / 4);
  const quarter = ((absoluteQuarter % 4) + 4) % 4 + 1;
  return `${year}-Q${quarter}`;
}

export function surveyCampaignPeriodOptions(now = new Date()) {
  const current = surveyCampaignPeriodForDate(now);
  return [-1, 0, 1, 2, 3, 4].map((offset) => shiftSurveyCampaignPeriod(current, offset));
}
