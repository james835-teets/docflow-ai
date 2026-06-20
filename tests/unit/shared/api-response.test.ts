import { describe, it, expect } from 'vitest';
import { ok, paginated } from '../../../src/shared/types/api.js';

describe('API Response Helpers', () => {
  describe('ok', () => {
    it('wraps data in success envelope', () => {
      const result = ok({ id: '1', name: 'test' });

      expect(result).toEqual({
        success: true,
        data: { id: '1', name: 'test' },
      });
    });

    it('handles null data', () => {
      expect(ok(null)).toEqual({ success: true, data: null });
    });
  });

  describe('paginated', () => {
    it('includes pagination metadata', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const result = paginated(items, 50, 1, 10);

      expect(result).toEqual({
        success: true,
        data: items,
        meta: {
          total: 50,
          page: 1,
          limit: 10,
          totalPages: 5,
        },
      });
    });

    it('calculates totalPages correctly for partial last page', () => {
      const result = paginated([], 51, 6, 10);
      expect(result.meta.totalPages).toBe(6);
    });

    it('handles empty result set', () => {
      const result = paginated([], 0, 1, 10);
      expect(result.meta.totalPages).toBe(0);
      expect(result.data).toEqual([]);
    });
  });
});
