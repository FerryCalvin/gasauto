import { describe, it, expect, beforeEach } from 'vitest';
import { TariffService } from '../services/TariffService.js';

describe('TariffService', () => {
  let tariffService: TariffService;

  beforeEach(() => {
    tariffService = new TariffService({
      pricePerM3: 11500,
      warningThresholdPct: 10,
      valveCloseDurationSec: 2.5
    });
  });

  it('menginisialisasi tarif default dengan benar', () => {
    const config = tariffService.getConfig();
    expect(config.pricePerM3).toBe(11500);
    expect(config.warningThresholdPct).toBe(10);
    expect(config.valveCloseDurationSec).toBe(2.5);
  });

  it('mengubah tarif gas dinamis dengan benar', () => {
    const updated = tariffService.updateConfig({ pricePerM3: 12000 });
    expect(updated.pricePerM3).toBe(12000);
    expect(tariffService.getConfig().pricePerM3).toBe(12000);
  });

  it('menolak tarif <= 0', () => {
    expect(() => tariffService.updateConfig({ pricePerM3: 0 })).toThrow(
      'Tarif harga per m³ harus lebih besar dari 0'
    );
    expect(() => tariffService.updateConfig({ pricePerM3: -500 })).toThrow();
  });

  it('menolak ambang batas peringatan di luar 1-99%', () => {
    expect(() => tariffService.updateConfig({ warningThresholdPct: 0 })).toThrow();
    expect(() => tariffService.updateConfig({ warningThresholdPct: 100 })).toThrow();
  });

  it('menghitung konversi Rupiah ke volume m³ dengan presisi 4 desimal', () => {
    // Rp 50.000 / Rp 11.500 = 4.347826... -> 4.3478 m³
    const result = tariffService.calculateVolumeFromRupiah(50000);
    expect(result.amountIdr).toBe(50000);
    expect(result.pricePerM3).toBe(11500);
    expect(result.volumeM3).toBe(4.3478);
  });

  it('menghitung konversi dengan tarif baru setelah diupdate', () => {
    tariffService.updateConfig({ pricePerM3: 10000 });
    const result = tariffService.calculateVolumeFromRupiah(50000);
    expect(result.volumeM3).toBe(5.0);
  });

  it('menolak perhitungan dengan nominal Rupiah <= 0', () => {
    expect(() => tariffService.calculateVolumeFromRupiah(0)).toThrow(
      'Nominal Rupiah harus lebih besar dari 0'
    );
  });
});
