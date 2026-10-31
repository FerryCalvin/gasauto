import { describe, it, expect, beforeEach } from 'vitest';
import { MeterEngine } from '../services/MeterEngine.js';
import { TariffService } from '../services/TariffService.js';
import { TokenService } from '../services/TokenService.js';

describe('MeterEngine', () => {
  let tariffService: TariffService;
  let tokenService: TokenService;
  let meterEngine: MeterEngine;
  const meterId = 'GAS-PLG-001';
  const serialNumber = 'SN-2026-GAS01';

  beforeEach(() => {
    tariffService = new TariffService({
      pricePerM3: 11500,
      warningThresholdPct: 10,
      valveCloseDurationSec: 2.5
    });
    tokenService = new TokenService();
    meterEngine = new MeterEngine(
      meterId,
      serialNumber,
      'Budi Santoso',
      'Jl. Melati No. 12',
      tariffService,
      tokenService,
      5.0 // Kuota awal 5.0 m³
    );
  });

  it('menginisialisasi meter dengan katup terbuka dan kuota positif', () => {
    const state = meterEngine.getState();
    expect(state.id).toBe(meterId);
    expect(state.remainingQuotaM3).toBe(5.0);
    expect(state.valveStatus).toBe('OPEN');
    expect(state.valveAngleDeg).toBe(90);
    expect(state.isAlertActive).toBe(false);
  });

  it('mengubah laju alir sesuai beban kompor dan water heater', () => {
    // Awalnya semua OFF -> 0 LPM
    expect(meterEngine.calculateTargetLpm()).toBe(0);

    // Kompor 1 LOW -> 0.60 LPM
    meterEngine.setAppliances({ stove1: 'LOW' });
    expect(meterEngine.calculateTargetLpm()).toBe(0.60);

    // Kompor 1 HIGH (1.50) + Water Heater (2.10) -> 3.60 LPM
    meterEngine.setAppliances({ stove1: 'HIGH', waterHeater: 'ON' });
    expect(meterEngine.calculateTargetLpm()).toBe(3.60);
    expect(meterEngine.getState().currentFlowRateLpm).toBe(3.60);
  });

  it('mengaktifkan peringatan 10% saat kuota gas mendekati habis', () => {
    // Set kuota ke 0.45 m³ (di bawah ambang 0.50 m³)
    const engineLow = new MeterEngine(
      meterId,
      serialNumber,
      'Budi',
      'Jl. Melati',
      tariffService,
      tokenService,
      0.45
    );
    expect(engineLow.getState().isAlertActive).toBe(true);
  });

  it('menjalankan Predictive Cutoff (Trigger Tutup sebelum 0 m³)', () => {
    // Atur kompor HIGH (1.5 LPM)
    meterEngine.setAppliances({ stove1: 'HIGH' });
    const triggerVol = meterEngine.getPredictiveCutoffTriggerVolume();
    expect(triggerVol).toBeGreaterThan(0);

    // Buat engine dengan kuota sedikit di bawah ambang trigger agar langsung trigger closing saat tick
    const engineNearZero = new MeterEngine(
      meterId,
      serialNumber,
      'Budi',
      'Jl. Melati',
      tariffService,
      tokenService,
      triggerVol * 0.95
    );
    engineNearZero.setAppliances({ stove1: 'HIGH' });

    // Tick 1 detik
    const tickResult = engineNearZero.tick(1.0);
    expect(tickResult.state.valveStatus).toBe('CLOSING');
  });

  it('menutup katup secara penuh dan menghentikan aliran saat habis', () => {
    // Kuota sangat kecil di bawah V_trigger
    const engineDepleting = new MeterEngine(
      meterId,
      serialNumber,
      'Budi',
      'Jl. Melati',
      tariffService,
      tokenService,
      0.00005
    );
    engineDepleting.setAppliances({ stove1: 'HIGH' });

    // Tick 1 detik: memicu CLOSING
    engineDepleting.tick(1.0);
    // Tick 3 detik lagi: katup butuh 2.5 detik untuk menutup penuh dari 90° ke 0°
    engineDepleting.tick(3.0);

    const finalState = engineDepleting.getState();
    expect(finalState.valveStatus).toBe('CLOSED');
    expect(finalState.valveAngleDeg).toBe(0);
    expect(finalState.currentFlowRateLpm).toBe(0);
  });

  it('merekam saldo negatif (Overdraft) jika ada sisa aliran saat katup berputar', () => {
    const engineOverdraft = new MeterEngine(
      meterId,
      serialNumber,
      'Budi',
      'Jl. Melati',
      tariffService,
      tokenService,
      0.00001
    );
    engineOverdraft.setAppliances({ waterHeater: 'ON' }); // Beban besar 2.1 LPM

    // Jalankan tick saat katup menutup
    engineOverdraft.tick(1.0);
    engineOverdraft.tick(2.0);

    const state = engineOverdraft.getState();
    expect(state.remainingQuotaM3).toBe(0);
    expect(state.overdraftM3).toBeGreaterThan(0); // Kerugian fisik tertangkap di ledger!
  });

  it('melakukan rekonsiliasi otomatis saat top-up: memotong saldo minus terlebih dahulu', () => {
    const engineDebt = new MeterEngine(
      meterId,
      serialNumber,
      'Budi',
      'Jl. Melati',
      tariffService,
      tokenService,
      0
    );
    // Simulasikan ada hutang gas (overdraft) sebesar 0.0050 m³
    (engineDebt as any).state.overdraftM3 = 0.0050;

    // Pelanggan beli token baru 5.0000 m³
    const token = tokenService.generateToken(meterId, 50000, 5.0000);

    // Redeem token ke meter
    const redeemResult = engineDebt.redeemToken(token.tokenCode);

    expect(redeemResult.success).toBe(true);
    expect(redeemResult.creditedVolumeM3).toBe(5.0000);
    expect(redeemResult.deductedOverdraftM3).toBe(0.0050);
    expect(redeemResult.effectiveRemainingM3).toBe(4.9950);

    const finalState = engineDebt.getState();
    expect(finalState.remainingQuotaM3).toBe(4.9950);
    expect(finalState.overdraftM3).toBe(0);
    expect(finalState.valveStatus).toBe('OPEN');
    expect(finalState.valveAngleDeg).toBe(90);
  });

  it('menolak pengisian token yang salah atau milik meter lain', () => {
    const foreignToken = tokenService.generateToken('METER-LAIN', 50000, 5.0);
    const result = meterEngine.redeemToken(foreignToken.tokenCode);

    expect(result.success).toBe(false);
    expect(result.message).toContain('nomor meter yang berbeda');
  });
});
