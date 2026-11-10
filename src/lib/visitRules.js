/**
 * Card-sharing "worth checking" thresholds (one place to tune them).
 * These are cautious hints for reception, never proof. All times are Europe/London.
 */
export const SHARING_RULES={
  /** Two scans this close together could be two people on one card (needs stored raw scans; counted visits are always 3h+ apart). */
  closeScanMinMinutes:5,
  closeScanMaxMinutes:90,
  /** Counted check-ins on the same day. 2 = worth checking, 3+ = look closer. */
  sameDayCheck:2,
  sameDayHigh:3,
  /** Same-day visits this far apart look like separate people rather than one long stay. */
  sameDayFarApartHours:5,
  /** Opening hours used for the "unusual time" hint (24h clock, London). Confirm with the front desk. */
  openHour:6,
  closeHour:22,
  /** Check-ins in one Monday-Sunday week. */
  weekCheck:8,
  weekHigh:10,
  /** A week this many times the member's own usual week (needs some history first). */
  spikeFactor:2.5,
  spikeMinVisits:5,
  spikeMinHistoryWeeks:3,
  /** A week this many times the typical (median) member week on the board. */
  normFactor:3,
  normMinVisits:5,
};
export const SEVERITY_ORDER={none:0,check:1,high:2};
