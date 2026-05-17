// tests/time.test.ts — company-timezone date helpers.
import { describe, it, expect } from 'vitest';
import {
  businessDate,
  addDays,
  businessWeekStartDate,
  COMPANY_TIMEZONE,
  MAX_SESSION_HOURS,
} from '@/lib/time';

describe('businessDate', () => {
  it('uses the company timezone, not UTC (the original bug)', () => {
    // 01:00 UTC on the 15th is still 21:00 on the 14th in Eastern.
    expect(businessDate(new Date('2026-05-15T01:00:00Z'))).toBe('2026-05-14');
  });

  it('returns the calendar date for daytime hours', () => {
    expect(businessDate(new Date('2026-05-15T16:00:00Z'))).toBe('2026-05-15');
  });

  it('accepts an ISO string as well as a Date', () => {
    expect(businessDate('2026-05-15T16:00:00Z')).toBe('2026-05-15');
  });
});

describe('addDays', () => {
  it('adds days within a month', () => {
    expect(addDays('2026-05-15', 3)).toBe('2026-05-18');
  });

  it('crosses a month boundary', () => {
    expect(addDays('2026-05-31', 1)).toBe('2026-06-01');
  });

  it('crosses a year boundary going backwards', () => {
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });
});

describe('businessWeekStartDate', () => {
  it('returns the Monday of the current week (Friday input)', () => {
    expect(businessWeekStartDate(new Date('2026-05-15T16:00:00Z'))).toBe('2026-05-11');
  });

  it('treats Sunday as part of the week that is ending', () => {
    expect(businessWeekStartDate(new Date('2026-05-17T16:00:00Z'))).toBe('2026-05-11');
  });

  it('applies a negative week offset', () => {
    expect(businessWeekStartDate(new Date('2026-05-15T16:00:00Z'), -1)).toBe('2026-05-04');
  });
});

describe('constants', () => {
  it('defaults the company timezone to US Eastern', () => {
    expect(COMPANY_TIMEZONE).toBe('America/New_York');
  });

  it('caps a session at 12 hours', () => {
    expect(MAX_SESSION_HOURS).toBe(12);
  });
});
