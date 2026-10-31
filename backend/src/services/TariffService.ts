import { TariffConfig } from '../types/index.js';

export class TariffService {
  private config: TariffConfig;

  constructor(initialConfig?: Partial<TariffConfig>) {
    this.config = {
      pricePerM3: initialConfig?.pricePerM3 ?? 11500, // Rp 11.500 / m³
      warningThresholdPct: initialConfig?.warningThresholdPct ?? 10, // 10%
      valveCloseDurationSec: initialConfig?.valveCloseDurationSec ?? 2.5, // 2.5s
      pulsesPerM3: initialConfig?.pulsesPerM3 ?? 100, // 1 pulse = 0.01 m3
      updatedAt: new Date().toISOString()
    };
  }

  public getConfig(): TariffConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<TariffConfig>): TariffConfig {
    if (newConfig.pricePerM3 !== undefined) {
      if (newConfig.pricePerM3 <= 0) {
        throw new Error('Tarif harga per m³ harus lebih besar dari 0');
      }
      this.config.pricePerM3 = Math.round(newConfig.pricePerM3);
    }

    if (newConfig.warningThresholdPct !== undefined) {
      if (newConfig.warningThresholdPct <= 0 || newConfig.warningThresholdPct >= 100) {
        throw new Error('Ambang batas peringatan harus berada antara 1% dan 99%');
      }
      this.config.warningThresholdPct = newConfig.warningThresholdPct;
    }

    if (newConfig.valveCloseDurationSec !== undefined) {
      if (newConfig.valveCloseDurationSec <= 0) {
        throw new Error('Durasi penutupan katup harus lebih dari 0 detik');
      }
      this.config.valveCloseDurationSec = Number(newConfig.valveCloseDurationSec.toFixed(2));
    }

    this.config.updatedAt = new Date().toISOString();
    return this.getConfig();
  }

  /**
   * Konversi Rupiah ke Volume Gas (m³)
   * Dibulatkan ke 4 digit desimal (akurasi 0.0001 m³ / 0.1 Liter)
   */
  public calculateVolumeFromRupiah(amountIdr: number): {
    amountIdr: number;
    pricePerM3: number;
    volumeM3: number;
  } {
    if (amountIdr <= 0) {
      throw new Error('Nominal Rupiah harus lebih besar dari 0');
    }

    const rawVolume = amountIdr / this.config.pricePerM3;
    const volumeM3 = Number(rawVolume.toFixed(4));

    return {
      amountIdr,
      pricePerM3: this.config.pricePerM3,
      volumeM3
    };
  }
}
