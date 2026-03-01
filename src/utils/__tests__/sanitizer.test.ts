import { describe, it, expect } from 'vitest';
import { sanitizeData, sanitizeUrl } from '../sanitizer';

describe('sanitizeData', () => {
  describe('primitive values', () => {
    it('should return primitive values unchanged', () => {
      expect(sanitizeData('string')).toBe('string');
      expect(sanitizeData(123)).toBe(123);
      expect(sanitizeData(true)).toBe(true);
      expect(sanitizeData(null)).toBeNull();
      expect(sanitizeData(undefined)).toBeUndefined();
    });
  });

  describe('objects with sensitive fields', () => {
    it('should redact password field', () => {
      const data = { username: 'john', password: 'secret123' };
      const sanitized = sanitizeData(data);

      expect(sanitized.username).toBe('john');
      expect(sanitized.password).toBe('[REDACTED]');
    });

    it('should redact token field', () => {
      const data = { userId: '123', token: 'abc123' };
      const sanitized = sanitizeData(data);

      expect(sanitized.userId).toBe('123');
      expect(sanitized.token).toBe('[REDACTED]');
    });

    it('should redact apikey field (case insensitive)', () => {
      const data = { apiKey: 'key123', ApiKey: 'key456', APIKEY: 'key789' };
      const sanitized = sanitizeData(data);

      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.ApiKey).toBe('[REDACTED]');
      expect(sanitized.APIKEY).toBe('[REDACTED]');
    });

    it('should redact api_key field', () => {
      const data = { api_key: 'key123' };
      const sanitized = sanitizeData(data);

      expect(sanitized.api_key).toBe('[REDACTED]');
    });

    it('should redact secret field', () => {
      const data = { secret: 'mysecret', clientSecret: 'secret123' };
      const sanitized = sanitizeData(data);

      expect(sanitized.secret).toBe('[REDACTED]');
      expect(sanitized.clientSecret).toBe('[REDACTED]');
    });

    it('should redact authorization field', () => {
      const data = { authorization: 'Bearer token123' };
      const sanitized = sanitizeData(data);

      expect(sanitized.authorization).toBe('[REDACTED]');
    });

    it('should redact accesstoken and refreshtoken fields', () => {
      const data = { accessToken: 'access123', refreshToken: 'refresh456' };
      const sanitized = sanitizeData(data);

      expect(sanitized.accessToken).toBe('[REDACTED]');
      expect(sanitized.refreshToken).toBe('[REDACTED]');
    });

    it('should redact privatekey field', () => {
      const data = { privateKey: 'key123', private_key: 'key456' };
      const sanitized = sanitizeData(data);

      expect(sanitized.privateKey).toBe('[REDACTED]');
      expect(sanitized.private_key).toBe('[REDACTED]');
    });

    it('should handle custom sensitive fields', () => {
      const data = { username: 'john', customSecret: 'secret' };
      const sanitized = sanitizeData(data, ['customSecret']);

      expect(sanitized.username).toBe('john');
      expect(sanitized.customSecret).toBe('[REDACTED]');
    });

    it('should handle custom sensitive fields case-insensitively', () => {
      const data = { CustomSecret: 'secret', CUSTOMSECRET: 'secret2' };
      const sanitized = sanitizeData(data, ['customsecret']);

      expect(sanitized.CustomSecret).toBe('[REDACTED]');
      expect(sanitized.CUSTOMSECRET).toBe('[REDACTED]');
    });
  });

  describe('nested objects', () => {
    it('should sanitize nested objects', () => {
      const data = {
        user: {
          name: 'john',
          password: 'secret123',
        },
      };
      const sanitized = sanitizeData(data);

      expect(sanitized.user.name).toBe('john');
      expect(sanitized.user.password).toBe('[REDACTED]');
    });

    it('should sanitize deeply nested objects', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              password: 'secret',
              username: 'john',
            },
          },
        },
      };
      const sanitized = sanitizeData(data);

      expect(sanitized.level1.level2.level3.username).toBe('john');
      expect(sanitized.level1.level2.level3.password).toBe('[REDACTED]');
    });
  });

  describe('arrays', () => {
    it('should sanitize arrays of objects', () => {
      const data = [
        { username: 'john', password: 'secret1' },
        { username: 'jane', password: 'secret2' },
      ];
      const sanitized = sanitizeData(data);

      expect(sanitized[0].username).toBe('john');
      expect(sanitized[0].password).toBe('[REDACTED]');
      expect(sanitized[1].username).toBe('jane');
      expect(sanitized[1].password).toBe('[REDACTED]');
    });

    it('should sanitize nested arrays', () => {
      const data = {
        users: [
          { name: 'john', token: 'token1' },
          { name: 'jane', token: 'token2' },
        ],
      };
      const sanitized = sanitizeData(data);

      expect(sanitized.users[0].name).toBe('john');
      expect(sanitized.users[0].token).toBe('[REDACTED]');
      expect(sanitized.users[1].name).toBe('jane');
      expect(sanitized.users[1].token).toBe('[REDACTED]');
    });
  });

  describe('immutability', () => {
    it('should not modify original object', () => {
      const original = { username: 'john', password: 'secret' };
      const sanitized = sanitizeData(original);

      expect(original.password).toBe('secret');
      expect(sanitized.password).toBe('[REDACTED]');
    });

    it('should not modify original array', () => {
      const original = [{ password: 'secret' }];
      const sanitized = sanitizeData(original);

      expect(original[0].password).toBe('secret');
      expect(sanitized[0].password).toBe('[REDACTED]');
    });
  });
});

describe('sanitizeUrl', () => {
  it('should redact token parameter', () => {
    const url = 'https://api.example.com/users?token=secret123&id=1';
    const sanitized = sanitizeUrl(url);

    expect(sanitized).toContain('token=%5BREDACTED%5D');
    expect(sanitized).toContain('id=1');
    expect(sanitized).not.toContain('secret123');
  });

  it('should redact apikey parameter', () => {
    const url = 'https://api.example.com/data?apikey=key123';
    const sanitized = sanitizeUrl(url);

    expect(sanitized).toContain('apikey=%5BREDACTED%5D');
    expect(sanitized).not.toContain('key123');
  });

  it('should redact api_key parameter', () => {
    const url = 'https://api.example.com/data?api_key=key123';
    const sanitized = sanitizeUrl(url);

    expect(sanitized).toContain('api_key=%5BREDACTED%5D');
  });

  it('should redact secret parameter', () => {
    const url = 'https://api.example.com/auth?secret=mysecret';
    const sanitized = sanitizeUrl(url);

    expect(sanitized).toContain('secret=%5BREDACTED%5D');
  });

  it('should redact password parameter', () => {
    const url = 'https://api.example.com/login?password=pass123';
    const sanitized = sanitizeUrl(url);

    expect(sanitized).toContain('password=%5BREDACTED%5D');
  });

  it('should redact multiple sensitive parameters', () => {
    const url = 'https://api.example.com/auth?token=token123&password=pass123&id=1';
    const sanitized = sanitizeUrl(url);

    expect(sanitized).toContain('token=%5BREDACTED%5D');
    expect(sanitized).toContain('password=%5BREDACTED%5D');
    expect(sanitized).toContain('id=1');
  });

  it('should preserve non-sensitive parameters', () => {
    const url = 'https://api.example.com/users?id=123&name=john&page=1';
    const sanitized = sanitizeUrl(url);

    expect(sanitized).toBe(url);
  });

  it('should handle URLs without query parameters', () => {
    const url = 'https://api.example.com/users';
    const sanitized = sanitizeUrl(url);

    expect(sanitized).toBe(url);
  });

  it('should handle invalid URLs gracefully', () => {
    const invalidUrl = 'not-a-valid-url';
    const sanitized = sanitizeUrl(invalidUrl);

    expect(sanitized).toBe(invalidUrl);
  });

  it('should handle URLs with fragments', () => {
    const url = 'https://api.example.com/users?token=secret#section';
    const sanitized = sanitizeUrl(url);

    expect(sanitized).toContain('token=%5BREDACTED%5D');
    expect(sanitized).toContain('#section');
  });
});
