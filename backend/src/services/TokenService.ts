import { TokenRecord } from '../types/index.js';

export class TokenService {
  private redeemedTokens: Map<string, TokenRecord> = new Map();
  private generatedTokens: Map<string, TokenRecord> = new Map();

  /**
   * Menghasilkan hash numerik sederhana untuk Meter Serial (4 digit)
   */
  public getMeterHash(meterId: string): string {
    let hash = 0;
    for (let i = 0; i < meterId.length; i++) {
      hash = (hash * 31 + meterId.charCodeAt(i)) % 10000;
    }
    return hash.toString().padStart(4, '0');
  }

  /**
   * Menghitung checksum 4 digit untuk 16 digit pertama token
   */
  private calculateChecksum(partialToken16: string, meterId: string): string {
    let sum = 0;
    const combined = partialToken16 + meterId;
    for (let i = 0; i < combined.length; i++) {
      const charCode = combined.charCodeAt(i);
      const weight = (i % 7) + 1;
      sum = (sum + charCode * weight * 13) % 10000;
    }
    return sum.toString().padStart(4, '0');
  }

  /**
   * Generate 20 digit STS token
   * Format: XXXX-XXXX-XXXX-XXXX-XXXX
   */
  public generateToken(meterId: string, amountIdr: number, volumeM3: number): TokenRecord {
    if (volumeM3 <= 0) {
      throw new Error('Volume token harus lebih besar dari 0 m³');
    }

    // Bagian 1: Integer volume (4 digit, max 9999 m³)
    const intPart = Math.floor(volumeM3).toString().padStart(4, '0').slice(-4);

    // Bagian 2: Fraksi volume 4 desimal (4 digit)
    const fracPart = Math.round((volumeM3 - Math.floor(volumeM3)) * 10000)
      .toString()
      .padStart(4, '0')
      .slice(-4);

    // Bagian 3: Meter Hash (4 digit)
    const meterHash = this.getMeterHash(meterId);

    // Bagian 4: Random Salt (4 digit)
    const salt = Math.floor(1000 + Math.random() * 9000).toString();

    // 16 digit dasar
    const base16 = `${intPart}${fracPart}${meterHash}${salt}`;

    // Bagian 5: Checksum (4 digit)
    const checksum = this.calculateChecksum(base16, meterId);

    // Gabungkan menjadi 20 digit terformat
    const raw20 = `${base16}${checksum}`;
    const tokenCode = `${raw20.slice(0, 4)}-${raw20.slice(4, 8)}-${raw20.slice(8, 12)}-${raw20.slice(12, 16)}-${raw20.slice(16, 20)}`;

    const record: TokenRecord = {
      tokenCode,
      meterId,
      amountIdr,
      volumeM3: Number(volumeM3.toFixed(4)),
      isRedeemed: false,
      createdAt: new Date().toISOString()
    };

    this.generatedTokens.set(tokenCode, record);
    return record;
  }

  /**
   * Memvalidasi dan mengekstrak data dari token 20 digit
   */
  public validateToken(rawToken: string, targetMeterId: string): {
    isValid: boolean;
    volumeM3?: number;
    error?: string;
  } {
    // Normalisasi: hilangkan spasi dan tanda minus
    const cleanToken = rawToken.replace(/[\s-]/g, '');

    if (!/^\d{20}$/.test(cleanToken)) {
      return {
        isValid: false,
        error: 'Format token tidak valid (harus 20 digit angka)'
      };
    }

    // Format kembali untuk pencocokan cache
    const formattedToken = `${cleanToken.slice(0, 4)}-${cleanToken.slice(4, 8)}-${cleanToken.slice(8, 12)}-${cleanToken.slice(12, 16)}-${cleanToken.slice(16, 20)}`;

    // Cek apakah sudah pernah di-redeem
    if (this.redeemedTokens.has(formattedToken)) {
      return {
        isValid: false,
        error: 'Token ini sudah pernah digunakan (KADALUARSA / SUDAH DIGUNAKAN)'
      };
    }

    const base16 = cleanToken.slice(0, 16);
    const checksum = cleanToken.slice(16, 20);

    // Verifikasi Checksum integritas
    const expectedChecksum = this.calculateChecksum(base16, targetMeterId);
    if (checksum !== expectedChecksum) {
      // Periksa apakah mungkin milik meter lain
      const tokenMeterHash = base16.slice(8, 12);
      const targetMeterHash = this.getMeterHash(targetMeterId);

      if (tokenMeterHash !== targetMeterHash) {
        return {
          isValid: false,
          error: 'Token ditolak: Token ini dibeli untuk nomor meter yang berbeda!'
        };
      }

      return {
        isValid: false,
        error: 'Token salah atau rusak (Checksum tidak cocok)'
      };
    }

    // Ekstrak volume
    const intPart = parseInt(base16.slice(0, 4), 10);
    const fracPart = parseInt(base16.slice(4, 8), 10);
    const volumeM3 = Number((intPart + fracPart / 10000).toFixed(4));

    if (volumeM3 <= 0) {
      return {
        isValid: false,
        error: 'Volume token tidak valid'
      };
    }

    return {
      isValid: true,
      volumeM3
    };
  }

  /**
   * Tandai token sebagai telah digunakan (redeemed)
   */
  public markAsRedeemed(formattedToken: string, meterId: string, volumeM3: number): TokenRecord {
    let record = this.generatedTokens.get(formattedToken);
    const now = new Date().toISOString();

    if (!record) {
      record = {
        tokenCode: formattedToken,
        meterId,
        amountIdr: 0,
        volumeM3,
        isRedeemed: true,
        createdAt: now,
        redeemedAt: now
      };
    } else {
      record.isRedeemed = true;
      record.redeemedAt = now;
    }

    this.redeemedTokens.set(formattedToken, record);
    return record;
  }

  public getRedeemedTokens(): TokenRecord[] {
    return Array.from(this.redeemedTokens.values());
  }

  public getGeneratedTokens(): TokenRecord[] {
    return Array.from(this.generatedTokens.values());
  }
}
