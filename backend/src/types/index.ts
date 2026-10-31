export type ValveStatus = 'OPEN' | 'CLOSED' | 'CLOSING';

export type NetworkType = 'WIFI' | 'CELLULAR_4G' | 'NBIOT' | 'LORAWAN';

export interface MeterState {
  id: string;
  serialNumber: string;
  customerName: string;
  customerAddress: string;
  remainingQuotaM3: number;
  totalConsumedM3: number;
  overdraftM3: number;
  valveStatus: ValveStatus;
  valveAngleDeg: number; // 0 (Closed) - 90 (Fully Open)
  currentFlowRateLpm: number; // Liters per minute
  isAlertActive: boolean; // True when remaining <= 10%
  networkType: NetworkType;
  rssi: number; // dBm
  batteryPct: number; // 0 - 100
  lastUpdated: number;
}

export interface TariffConfig {
  pricePerM3: number; // IDR per m3 (e.g. 11500)
  warningThresholdPct: number; // e.g. 10 (%)
  valveCloseDurationSec: number; // e.g. 2.5 (seconds)
  pulsesPerM3: number; // e.g. 100 (1 pulse = 0.01 m3)
  updatedAt: string;
}

export interface TokenRecord {
  tokenCode: string; // 20 digits: XXXX-XXXX-XXXX-XXXX-XXXX
  meterId: string;
  amountIdr: number;
  volumeM3: number;
  isRedeemed: boolean;
  createdAt: string;
  redeemedAt?: string;
}

export interface TransactionRecord {
  id: string;
  meterId: string;
  type: 'PURCHASE' | 'REDEEM' | 'OVERDRAFT_DEDUCTION' | 'TARIFF_UPDATE';
  amountIdr?: number;
  volumeM3: number;
  description: string;
  timestamp: string;
}

export interface ApplianceLoad {
  stove1: 'OFF' | 'LOW' | 'MED' | 'HIGH';
  stove2: 'OFF' | 'MED';
  waterHeater: 'OFF' | 'ON';
}

export interface TelemetryPacket {
  meter_id: string;
  serial_number: string;
  flow_rate_lpm: number;
  volume_total_m3: number;
  remaining_quota_m3: number;
  overdraft_m3: number;
  valve_status: ValveStatus;
  valve_angle_deg: number;
  battery_pct: number;
  rssi_dbm: number;
  network_type: NetworkType;
  is_alert: boolean;
  timestamp: number;
}

export interface LoraPayloadDecoded {
  meterId: string;
  valveStatus: ValveStatus;
  networkType: NetworkType;
  remainingQuotaM3: number;
  flowRateLpm: number;
  batteryPct: number;
  checksumValid: boolean;
}
