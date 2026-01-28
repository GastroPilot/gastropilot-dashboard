import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api, ApiError } from '@/lib/api/client';

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage mock
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);
  });

  describe('api.get', () => {
    it('makes GET requests successfully', async () => {
      // Token is required for most endpoints
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
        if (key === 'access_token') return 'mock_token';
        if (key === 'access_token_expires_at') return String(Date.now() + 3600000);
        return null;
      });

      const result = await api.get('/auth/me');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('operator_number');
    });
  });

  describe('api.post', () => {
    it('makes POST requests with body', async () => {
      const result = await api.post('/auth/login', {
        operator_number: '1234',
        pin: '123456',
      });

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
    });

    it('throws ApiError on invalid credentials', async () => {
      await expect(
        api.post('/auth/login', {
          operator_number: 'wrong',
          pin: 'wrong',
        })
      ).rejects.toThrow(ApiError);
    });
  });

  describe('Authentication', () => {
    it('includes Authorization header when token exists', async () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
        if (key === 'access_token') return 'test_token';
        if (key === 'access_token_expires_at') return String(Date.now() + 3600000);
        return null;
      });

      // This should not throw - auth header will be included
      const result = await api.get('/auth/me');
      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('throws ApiError with correct status code', async () => {
      try {
        await api.post('/auth/login', {
          operator_number: 'invalid',
          pin: 'invalid',
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(401);
      }
    });

    it('formats error messages correctly', async () => {
      try {
        await api.post('/auth/login', {
          operator_number: 'invalid',
          pin: 'invalid',
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toContain('Invalid');
      }
    });
  });
});
