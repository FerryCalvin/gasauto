import { MeterState, ApplianceLoad, ValveStatus, NetworkType, TelemetryPacket } from '../types/index.js';
import { TariffService } from './TariffService.js';
import { TokenService } from './TokenService.js';

export class MeterEngine {
  private state: MeterState;
  private appliances: ApplianceLoad = {
    stove1: 'OFF',
    stove2: 'OFF',
    waterHeater: 'OFF'
  };

  private tariffService: TariffService;
  private tokenService: TokenService;

  // Tracking waktu simulasi (detik)
  private valveClosingTimerSec: number = 0;
  private initialQuotaM3: number = 5.0; // Kuota awal untuk kalkulasi ambang 10%

  constructor(
    meterId: string,
    serialNumber: string,
    customerName: string,
    customerAddress: string,
    tariffService: TariffService,
    tokenService: TokenService,
    initialQuotaM3: number = 0
  ) {
    this.tariffService = tariffService;
    this.tokenService = tokenService;
    this.initialQuotaM3 = initialQuotaM3 > 0 ? initialQuotaM3 : 5.0;

    this.state = {
      id: meterId,
      serialNumber,
      customerName,
      customerAddress,
      remainingQuotaM3: Number(initialQuotaM3.toFixed(6)),
      totalConsumedM3: 0,
      overdraftM3: 0,
      valveStatus: initialQuotaM3 > 0 ? 'OPEN' : 'CLOSED',
      valveAngleDeg: initialQuotaM3 > 0 ? 90 : 0,
      currentFlowRateLpm: 0,
      isAlertActive: false,
      networkType: 'WIFI',
      rssi: -65,
      batteryPct: 98,
      lastUpdated: Date.now()
    };

    this.updateFlowRateAndAlert();
  }

  public getState(): MeterState {
    return { ...this.state };
  }

  public getAppliances(): ApplianceLoad {
    return { ...this.appliances };
  }

  public setNetworkType(type: NetworkType): void {
    this.state.networkType = type;
    if (type === 'WIFI') this.state.rssi = -65;
    else if (type === 'CELLULAR_4G') this.state.rssi = -78;
    else if (type === 'NBIOT') this.state.rssi = -85;
    else if (type === 'LORAWAN') this.state.rssi = -105;
  }

  public setAppliances(load: Partial<ApplianceLoad>): ApplianceLoad {
    this.appliances = { ...this.appliances, ...load };
    this.updateFlowRateAndAlert();
    return this.getAppliances();
  }

  /**
   * Menghitung target laju alir (Liter per Menit) berdasarkan peralatan yang menyala
   */
  public calculateTargetLpm(): number {
    let lpm = 0;

    switch (this.appliances.stove1) {
      case 'LOW': lpm += 0.60; break;
      case 'MED': lpm += 1.08; break;
      case 'HIGH': lpm += 1.50; break;
      default: break;
    }

    if (this.appliances.stove2 === 'MED') {
      lpm += 1.08;
    }

    if (this.appliances.waterHeater === 'ON') {
      lpm += 2.10;
    }

    return Number(lpm.toFixed(2));
  }

  /**
   * Mengupdate laju alir efektif dan status peringatan 10%
   */
  private updateFlowRateAndAlert(): void {
    const targetLpm = this.calculateTargetLpm();
    const config = this.tariffService.getConfig();

    // Laju alir efektif tergantung posisi katup
    if (this.state.valveStatus === 'CLOSED' || this.state.valveAngleDeg <= 0) {
      this.state.currentFlowRateLpm = 0;
    } else if (this.state.valveStatus === 'CLOSING') {
      const ratio = this.state.valveAngleDeg / 90;
      this.state.currentFlowRateLpm = Number((targetLpm * ratio).toFixed(3));
    } else {
      this.state.currentFlowRateLpm = targetLpm;
    }

    // Peringatan 10% sisa kuota
    // Threshold dihitung dari 10% dari alokasi awal atau <= 0.500 m³
    const thresholdM3 = Math.max(0.500, this.initialQuotaM3 * (config.warningThresholdPct / 100));
    this.state.isAlertActive = this.state.remainingQuotaM3 > 0 && this.state.remainingQuotaM3 <= thresholdM3;
    this.state.lastUpdated = Date.now();
  }

  /**
   * Menghitung volume pemicu cutoff (Predictive Closing Offset)
   * V_trigger = Q (m³/detik) * t_valve_close
   */
  public getPredictiveCutoffTriggerVolume(): number {
    const config = this.tariffService.getConfig();
    const targetLpm = this.calculateTargetLpm();
    if (targetLpm <= 0) return 0;

    const m3PerSecond = targetLpm / (1000 * 60);
    const triggerVolume = m3PerSecond * config.valveCloseDurationSec;
    return Number(triggerVolume.toFixed(6));
  }

  /**
   * Langkah simulasi fisik (Tick) per interval detik (deltaSec)
   * Mensimulasikan konsumsi gas, pergerakan katup motorik, dan pencatatan overrun
   */
  public tick(deltaSec: number = 1.0): {
    consumedM3: number;
    state: MeterState;
    event?: 'CUTOFF_TRIGGERED' | 'VALVE_CLOSED' | 'OVERDRAFT_RECORDED' | 'ALERT_10_PCT';
  } {
    let event: 'CUTOFF_TRIGGERED' | 'VALVE_CLOSED' | 'OVERDRAFT_RECORDED' | 'ALERT_10_PCT' | undefined;
    const config = this.tariffService.getConfig();

    // 1. Tangani transisi katup jika sedang CLOSING
    if (this.state.valveStatus === 'CLOSING') {
      const closeSpeedDegPerSec = 90 / config.valveCloseDurationSec;
      this.state.valveAngleDeg = Math.max(0, this.state.valveAngleDeg - closeSpeedDegPerSec * deltaSec);

      if (this.state.valveAngleDeg <= 0) {
        this.state.valveAngleDeg = 0;
        this.state.valveStatus = 'CLOSED';
        this.state.currentFlowRateLpm = 0;
        event = 'VALVE_CLOSED';
      }
    }

    // 2. Perbarui laju alir sesaat
    this.updateFlowRateAndAlert();

    // 3. Hitung konsumsi gas selama deltaSec
    let consumedM3 = 0;
    if (this.state.currentFlowRateLpm > 0) {
      // m³ = (LPM / 1000 / 60) * deltaSec
      consumedM3 = (this.state.currentFlowRateLpm / 60000) * deltaSec;

      if (this.state.remainingQuotaM3 >= consumedM3) {
        this.state.remainingQuotaM3 = Number((this.state.remainingQuotaM3 - consumedM3).toFixed(6));
        this.state.totalConsumedM3 = Number((this.state.totalConsumedM3 + consumedM3).toFixed(6));
      } else {
        // Kuota habis! Sisa konsumsi dicatat sebagai OVERDRAFT (Anti-Rugi)
        const deficit = consumedM3 - this.state.remainingQuotaM3;
        this.state.totalConsumedM3 = Number((this.state.totalConsumedM3 + this.state.remainingQuotaM3).toFixed(6));
        this.state.remainingQuotaM3 = 0;
        this.state.overdraftM3 = Number((this.state.overdraftM3 + deficit).toFixed(6));
        event = 'OVERDRAFT_RECORDED';
      }
    }

    // 4. Deteksi Pemicu Predictive Cutoff saat katup masih OPEN
    if (this.state.valveStatus === 'OPEN' && this.state.currentFlowRateLpm > 0) {
      const vTrigger = this.getPredictiveCutoffTriggerVolume();
      if (this.state.remainingQuotaM3 <= vTrigger) {
        this.state.valveStatus = 'CLOSING';
        event = 'CUTOFF_TRIGGERED';
      }
    }

    // Jika kuota sudah 0 dan katup masih OPEN (misal saat flow 0 tiba-tiba habis), langsung tutup
    if (this.state.remainingQuotaM3 <= 0 && this.state.valveStatus === 'OPEN') {
      this.state.valveStatus = 'CLOSING';
      event = 'CUTOFF_TRIGGERED';
    }

    this.updateFlowRateAndAlert();
    this.state.lastUpdated = Date.now();

    return {
      consumedM3,
      state: this.getState(),
      event
    };
  }

  /**
   * Redeem Token Gas 20 digit ke Meter
   * Melakukan validasi, rekonsiliasi saldo negatif (Overdraft Recovery), dan membuka katup
   */
  public redeemToken(rawToken: string): {
    success: boolean;
    message: string;
    creditedVolumeM3?: number;
    deductedOverdraftM3?: number;
    effectiveRemainingM3?: number;
  } {
    const validation = this.tokenService.validateToken(rawToken, this.state.id);

    if (!validation.isValid || !validation.volumeM3) {
      return {
        success: false,
        message: validation.error || 'Token tidak valid'
      };
    }

    const tokenVolume = validation.volumeM3;
    let deductedOverdraft = 0;
    let newRemaining = 0;

    // Rekonsiliasi Overdraft (Pilar 4: Anti-Rugi)
    if (this.state.overdraftM3 > 0) {
      if (tokenVolume >= this.state.overdraftM3) {
        deductedOverdraft = this.state.overdraftM3;
        newRemaining = Number((tokenVolume - this.state.overdraftM3).toFixed(4));
        this.state.overdraftM3 = 0;
      } else {
        deductedOverdraft = tokenVolume;
        this.state.overdraftM3 = Number((this.state.overdraftM3 - tokenVolume).toFixed(4));
        newRemaining = 0;
      }
    } else {
      newRemaining = Number((this.state.remainingQuotaM3 + tokenVolume).toFixed(4));
    }

    this.state.remainingQuotaM3 = newRemaining;
    this.initialQuotaM3 = Math.max(this.initialQuotaM3, newRemaining);

    // Buka katup jika saldo positif
    if (this.state.remainingQuotaM3 > 0) {
      this.state.valveStatus = 'OPEN';
      this.state.valveAngleDeg = 90;
    }

    this.tokenService.markAsRedeemed(rawToken, this.state.id, tokenVolume);
    this.updateFlowRateAndAlert();

    let message = `Pengisian Berhasil! Kuota bertambah +${tokenVolume.toFixed(4)} m³.`;
    if (deductedOverdraft > 0) {
      message += ` (Dipotong penutupan overrun: -${deductedOverdraft.toFixed(4)} m³) Saldo bersih: ${newRemaining.toFixed(4)} m³.`;
    }

    return {
      success: true,
      message,
      creditedVolumeM3: tokenVolume,
      deductedOverdraftM3: deductedOverdraft,
      effectiveRemainingM3: newRemaining
    };
  }

  /**
   * Kendali katup darurat / manual (oleh pengguna atau IoT remote command)
   */
  public setValveManual(action: 'OPEN' | 'CLOSE'): boolean {
    if (action === 'OPEN') {
      if (this.state.remainingQuotaM3 <= 0) {
        return false; // Dilarang buka jika saldo kosong!
      }
      this.state.valveStatus = 'OPEN';
      this.state.valveAngleDeg = 90;
    } else {
      this.state.valveStatus = 'CLOSED';
      this.state.valveAngleDeg = 0;
    }
    this.updateFlowRateAndAlert();
    return true;
  }

  /**
   * Menghasilkan Telemetry Packet standar JSON
   */
  public generateTelemetryPacket(): TelemetryPacket {
    return {
      meter_id: this.state.id,
      serial_number: this.state.serialNumber,
      flow_rate_lpm: this.state.currentFlowRateLpm,
      volume_total_m3: Number(this.state.totalConsumedM3.toFixed(4)),
      remaining_quota_m3: Number(this.state.remainingQuotaM3.toFixed(4)),
      overdraft_m3: Number(this.state.overdraftM3.toFixed(4)),
      valve_status: this.state.valveStatus,
      valve_angle_deg: Math.round(this.state.valveAngleDeg),
      battery_pct: this.state.batteryPct,
      rssi_dbm: this.state.rssi,
      network_type: this.state.networkType,
      is_alert: this.state.isAlertActive,
      timestamp: Math.floor(Date.now() / 1000)
    };
  }
}
