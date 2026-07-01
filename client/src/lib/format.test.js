import { describe, it, expect } from 'vitest';
import { initials, toDateInput, daysSince, href } from './format.js';

describe('format helpers', () => {
  describe('initials', () => {
    it('takes the first letter of the first two words, uppercased', () => {
      expect(initials('Jo Bloggs')).toBe('JB');
    });

    it('handles a single name', () => {
      expect(initials('Cher')).toBe('C');
    });

    it('falls back to "?" for empty input', () => {
      expect(initials('')).toBe('?');
      expect(initials(null)).toBe('?');
    });
  });

  describe('toDateInput', () => {
    it('formats an ISO datetime as YYYY-MM-DD', () => {
      expect(toDateInput('2026-06-01T12:34:56.000Z')).toBe('2026-06-01');
    });

    it('returns "" for falsy or invalid input', () => {
      expect(toDateInput(null)).toBe('');
      expect(toDateInput('not-a-date')).toBe('');
    });
  });

  describe('daysSince', () => {
    it('counts whole days since a past date', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000);
      expect(daysSince(threeDaysAgo)).toBe(3);
    });

    it('returns 0 for an invalid date', () => {
      expect(daysSince('nonsense')).toBe(0);
    });
  });

  describe('href', () => {
    it('leaves an absolute URL untouched', () => {
      expect(href('https://example.com')).toBe('https://example.com');
    });

    it('prepends https:// when the scheme is missing', () => {
      expect(href('example.com')).toBe('https://example.com');
    });
  });
});
