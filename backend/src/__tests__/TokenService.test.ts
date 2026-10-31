import { describe, it, expect, beforeEach } from 'vitest';
import { TokenService } from '../services/TokenService.js';

describe('TokenService', () => {
  let tokenService: TokenService;
  const targetMeterId = 'GAS-PLG-001';
  const otherMeterId = 'GAS-PLG-999';

  beforeEach(() => {
    tokenService = new TokenService();
  });

  it('menghasilkan token 20 digit dengan format XXXX-XXXX-XXXX-XXXX-XXXX', () => {
    const token = tokenService.generateToken(targetMeterId, 50000, 4.3478);
    expect(token.tokenCode).toMatch(/^\d{4}-\d{4}-\d{4}-\d{4}-\d{4}$/);
    expect(token.meterId).toBe(targetMeterId);
    expect(token.amountIdr).toBe(50000);
    expect(token.volumeM3).toBe(4.3478);
    expect(token.isRedeemed).toBe(false);
  });

  it('memvalidasi token yang valid dan mengekstrak volume dengan benar', () => {
    const token = tokenService.generateToken(targetMeterId, 50000, 4.3478);
    const result = tokenService.validateToken(token.tokenCode, targetMeterId);

    expect(result.isValid).toBe(true);
    expect(result.volumeM3).toBe(4.3478);
    expect(result.error).toBeUndefined();
  });

  it('menolak token jika dimasukkan ke Meter ID yang berbeda', () => {
    const token = tokenService.generateToken(targetMeterId, 50000, 4.3478);
    const result = tokenService.validateToken(token.tokenCode, otherMeterId);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Token ini dibeli untuk nomor meter yang berbeda');
  });

  it('menolak token yang rusak / salah ketik digit', () => {
    const token = tokenService.generateToken(targetMeterId, 50000, 4.3478);
    // Ubah satu digit di tengah
    const corrupted = token.tokenCode.slice(0, -1) + (token.tokenCode.slice(-1) === '9' ? '0' : '9');
    const result = tokenService.validateToken(corrupted, targetMeterId);

    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('mencegah penggunaan token ganda (replay attack)', () => {
    const token = tokenService.generateToken(targetMeterId, 50000, 4.3478);
    tokenService.markAsRedeemed(token.tokenCode, targetMeterId, 4.3478);

    const secondTry = tokenService.validateToken(token.tokenCode, targetMeterId);
    expect(secondTry.isValid).toBe(false);
    expect(secondTry.error).toContain('sudah pernah digunakan');
  });

  it('menolak token yang kurang dari 20 digit', () => {
    const invalid = tokenService.validateToken('1234-5678-9012', targetMeterId);
    expect(invalid.isValid).toBe(false);
    expect(invalid.error).toContain('harus 20 digit');
  });
});
