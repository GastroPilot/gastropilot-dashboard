import { describe, it, expect } from 'vitest';
import { cn, formatDate, formatDateOnly } from '@/lib/utils';

describe('utils', () => {
  describe('cn', () => {
    it('merges class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('handles conditional classes', () => {
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
    });
  });

  describe('formatDate', () => {
    it('formats a Date object', () => {
      const result = formatDate(new Date('2024-06-15T14:30:00'));
      expect(result).toContain('15.06.2024');
    });

    it('formats a date string', () => {
      const result = formatDate('2024-06-15T14:30:00');
      expect(result).toContain('15.06.2024');
    });
  });

  describe('formatDateOnly', () => {
    it('formats a Date object without time', () => {
      const result = formatDateOnly(new Date('2024-06-15T14:30:00'));
      expect(result).toBe('15.06.2024');
    });

    it('formats a date string without time', () => {
      const result = formatDateOnly('2024-06-15T14:30:00');
      expect(result).toBe('15.06.2024');
    });
  });
});
