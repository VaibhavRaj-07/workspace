import { describe, it, expect, beforeEach, vi } from 'vitest';
import { tokenStorage, ApiErrorInstance } from '../lib/api/client';

describe('Token Storage & Client State', () => {
  beforeEach(() => {
    tokenStorage.clear();
  });

  it('stores and retrieves access tokens correctly in memory and session storage', () => {
    expect(tokenStorage.getAccessToken()).toBeNull();
    tokenStorage.setAccessToken('test-jwt-access-token');
    expect(tokenStorage.getAccessToken()).toBe('test-jwt-access-token');
    tokenStorage.clear();
    expect(tokenStorage.getAccessToken()).toBeNull();
  });

  it('stores and retrieves refresh tokens in local storage', () => {
    expect(tokenStorage.getRefreshToken()).toBeNull();
    tokenStorage.setRefreshToken('test-jwt-refresh-token');
    expect(tokenStorage.getRefreshToken()).toBe('test-jwt-refresh-token');
    tokenStorage.clear();
    expect(tokenStorage.getRefreshToken()).toBeNull();
  });

  it('constructs ApiErrorInstance with correct status, code, and details', () => {
    const err = new ApiErrorInstance(409, 'VERSION_CONFLICT', 'Collision detected', {
      conflictingFields: ['title'],
    });

    expect(err.status).toBe(409);
    expect(err.code).toBe('VERSION_CONFLICT');
    expect(err.message).toBe('Collision detected');
    expect(err.details?.conflictingFields).toContain('title');
  });
});
