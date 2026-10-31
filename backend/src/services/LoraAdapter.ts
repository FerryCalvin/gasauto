import { LoraPayloadDecoded, ValveStatus, NetworkType, TelemetryPacket } from '../types/index.js';

export class LoraAdapter {
  private static readonly HEADER_BYTE = 0x47; // 'G' for Gas

  /**
   * Hitung CRC-8 (Polinomial Maxim/Dallas: 0x8C)
   */
  public static calculateCrc8(data: Uint8Array, length: number): number {
    let crc = 0x00;
    for (let i = 0; i < length; i++) {
      let extract = data[i];
      for (let tempI = 8; tempI; tempI--) {
        const sum = (crc ^ extract) & 0x01;
        crc >>= 1;
        if (sum) {
          crc ^= 0x8c;
        }
        extract >>= 1;
      }
    }
    return crc;
  }

  /**
   * Encode Telemetry Packet menjadi 10-byte Hex String untuk uplink LoRaWAN
   */
  public static encodeTelemetry(telemetry: TelemetryPacket): string {
    const buffer = new Uint8Array(10);

    // Byte 0: Header
    buffer[0] = this.HEADER_BYTE;

    // Byte 1: Status & Flags
    let valveBits = 0;
    if (telemetry.valve_status === 'OPEN') valveBits = 0x01;
    else if (telemetry.valve_status === 'CLOSING') valveBits = 0x02;

    let netBits = 0;
    if (telemetry.network_type === 'NBIOT') netBits = 0x01;
    else if (telemetry.network_type === 'CELLULAR_4G') netBits = 0x02;
    else if (telemetry.network_type === 'WIFI') netBits = 0x03;

    const alertBit = telemetry.is_alert ? 0x10 : 0x00;
    buffer[1] = valveBits | (netBits << 2) | alertBit;

    // Byte 2-4: Remaining Quota (m³ * 1000) - 24 bit Big Endian
    const quotaInt = Math.max(0, Math.min(16777215, Math.round(telemetry.remaining_quota_m3 * 1000)));
    buffer[2] = (quotaInt >> 16) & 0xff;
    buffer[3] = (quotaInt >> 8) & 0xff;
    buffer[4] = quotaInt & 0xff;

    // Byte 5-6: Flow Rate LPM * 100 - 16 bit Big Endian
    const flowInt = Math.max(0, Math.min(65535, Math.round(telemetry.flow_rate_lpm * 100)));
    buffer[5] = (flowInt >> 8) & 0xff;
    buffer[6] = flowInt & 0xff;

    // Byte 7: Battery Pct (0 - 100)
    buffer[7] = Math.max(0, Math.min(100, Math.round(telemetry.battery_pct)));

    // Byte 8: RSSI offset (RSSI + 200, misal -105 dBm -> 95)
    buffer[8] = Math.max(0, Math.min(255, telemetry.rssi_dbm + 200));

    // Byte 9: Checksum CRC-8
    buffer[9] = this.calculateCrc8(buffer, 9);

    // Konversi ke format Hex string (20 karakter hex)
    return Array.from(buffer)
      .map(b => b.toString(16).padStart(2, '0').toUpperCase())
      .join('');
  }

  /**
   * Decode 10-byte Hex String dari Uplink LoRaWAN (TTN / ChirpStack)
   */
  public static decodeUplink(hexString: string, meterId: string): LoraPayloadDecoded {
    const cleanHex = hexString.replace(/[\s-]/g, '');
    if (cleanHex.length !== 20) {
      throw new Error(`Panjang payload LoRaWAN tidak valid (diterima ${cleanHex.length} karakter hex, diharapkan 20)`);
    }

    const bytes = new Uint8Array(10);
    for (let i = 0; i < 10; i++) {
      bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
    }

    if (bytes[0] !== this.HEADER_BYTE) {
      throw new Error(`Header byte tidak valid (0x${bytes[0].toString(16)} != 0x${this.HEADER_BYTE.toString(16)})`);
    }

    const calculatedCrc = this.calculateCrc8(bytes, 9);
    const checksumValid = calculatedCrc === bytes[9];

    // Decode status katup
    const valveBits = bytes[1] & 0x03;
    let valveStatus: ValveStatus = 'CLOSED';
    if (valveBits === 0x01) valveStatus = 'OPEN';
    else if (valveBits === 0x02) valveStatus = 'CLOSING';

    // Decode network type
    const netBits = (bytes[1] >> 2) & 0x03;
    let networkType: NetworkType = 'LORAWAN';
    if (netBits === 0x01) networkType = 'NBIOT';
    else if (netBits === 0x02) networkType = 'CELLULAR_4G';
    else if (netBits === 0x03) networkType = 'WIFI';

    // Decode Quota (Bytes 2-4)
    const quotaInt = (bytes[2] << 16) | (bytes[3] << 8) | bytes[4];
    const remainingQuotaM3 = Number((quotaInt / 1000).toFixed(4));

    // Decode Flow Rate (Bytes 5-6)
    const flowInt = (bytes[5] << 8) | bytes[6];
    const flowRateLpm = Number((flowInt / 100).toFixed(2));

    // Battery
    const batteryPct = bytes[7];

    return {
      meterId,
      valveStatus,
      networkType,
      remainingQuotaM3,
      flowRateLpm,
      batteryPct,
      checksumValid
    };
  }
}
