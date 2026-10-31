import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type {
  MeterState,
  TelemetryPacket,
  ApplianceLoad,
  TariffConfig,
  TransactionRecord,
  NetworkType
} from '../types/gas';
import { audioBuzzer } from '../utils/audioBuzzer';

interface GasContextType {
  meter: MeterState | null;
  telemetry: TelemetryPacket | null;
  appliances: ApplianceLoad;
  tariff: TariffConfig | null;
  vTrigger: number;
  loraHex: string;
  transactions: TransactionRecord[];
  isConnected: boolean;
  activeTab: 'twin' | 'portal' | 'admin' | 'iot';
  setActiveTab: (tab: 'twin' | 'portal' | 'admin' | 'iot') => void;
  isBuzzerMuted: boolean;
  toggleBuzzerMute: () => void;
  lastPurchasedToken: any;
  setLastPurchasedToken: (t: any) => void;
  setAppliances: (load: Partial<ApplianceLoad>) => Promise<void>;
  setNetwork: (type: NetworkType) => Promise<void>;
  purchaseToken: (amountIdr: number) => Promise<{ success: boolean; token?: any; error?: string }>;
  redeemToken: (tokenCode: string) => Promise<{ success: boolean; message: string }>;
  updateTariff: (config: Partial<TariffConfig>) => Promise<boolean>;
  setValveManual: (action: 'OPEN' | 'CLOSE') => Promise<{ success: boolean; message?: string }>;
  fetchTransactions: () => Promise<void>;
}

const GasContext = createContext<GasContextType | undefined>(undefined);

export const GasProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [meter, setMeter] = useState<MeterState | null>({
    id: 'GAS-PLG-001',
    serialNumber: 'SN-2026-GAS01',
    customerName: 'Keluarga Budi Santoso',
    customerAddress: 'Jl. Melati Blok C No. 15, Surabaya',
    remainingQuotaM3: 5.0,
    totalConsumedM3: 12.45,
    overdraftM3: 0,
    valveStatus: 'OPEN',
    valveAngleDeg: 90,
    currentFlowRateLpm: 0,
    isAlertActive: false,
    networkType: 'WIFI',
    rssi: -68,
    batteryPct: 98,
    lastUpdated: Date.now()
  });
  const [telemetry, setTelemetry] = useState<TelemetryPacket | null>({
    meter_id: 'GAS-PLG-001',
    serial_number: 'SN-2026-GAS01',
    flow_rate_lpm: 0,
    volume_total_m3: 12.45,
    remaining_quota_m3: 5.0,
    overdraft_m3: 0,
    valve_status: 'OPEN',
    valve_angle_deg: 90,
    battery_pct: 98,
    rssi_dbm: -68,
    network_type: 'WIFI',
    is_alert: false,
    timestamp: Date.now()
  });
  const [appliances, setAppliancesState] = useState<ApplianceLoad>({
    stove1: 'OFF',
    stove2: 'OFF',
    waterHeater: 'OFF'
  });
  const [tariff, setTariff] = useState<TariffConfig | null>({
    pricePerM3: 11500,
    warningThresholdPct: 10,
    valveCloseDurationSec: 2.5,
    pulsesPerM3: 100,
    updatedAt: new Date().toISOString()
  });
  const [vTrigger, setVTrigger] = useState<number>(0);
  const [loraHex, setLoraHex] = useState<string>('');
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'twin' | 'portal' | 'admin' | 'iot'>('twin');
  const [isBuzzerMuted, setIsBuzzerMuted] = useState<boolean>(false);
  const [lastPurchasedToken, setLastPurchasedToken] = useState<any>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch('/api/transactions');
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch {
      // Safe ignore when offline
    }
  }, []);

  const fetchInitialData = useCallback(async () => {
    try {
      const res = await fetch('/api/meter');
      if (res.ok) {
        const data = await res.json();
        if (data.state) setMeter(data.state);
        if (data.appliances) setAppliancesState(data.appliances);
        if (data.telemetry) setTelemetry(data.telemetry);
        if (typeof data.vTrigger === 'number') setVTrigger(data.vTrigger);
        if (data.loraHex) setLoraHex(data.loraHex);
      }
    } catch {
      // Server starting up
    }

    try {
      const tRes = await fetch('/api/tariff');
      if (tRes.ok) {
        const tData = await tRes.json();
        setTariff(tData);
      }
    } catch {
      // Server starting up
    }

    await fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetchInitialData();

    // Reconnection & WebSocket Setup
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use Vite proxy /ws during dev (any port other than 3001), direct host during production
    const wsUrl = window.location.port !== '3001'
      ? `${protocol}//${window.location.host}/ws`
      : `${protocol}//${window.location.host}`;

    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let isDisposed = false;
    let retryAttempt = 0;
    const maxRetryDelay = 10000;

    const connectWs = () => {
      if (isDisposed) return;

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (isDisposed) {
            ws?.close();
            return;
          }
          retryAttempt = 0;
          setIsConnected(true);
          fetchInitialData();
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'INITIAL_STATE' || data.type === 'TELEMETRY_UPDATE') {
              setMeter(data.state);
              setTelemetry(data.telemetry);
              setAppliancesState(data.appliances);
              setTariff(data.tariff);
              setVTrigger(data.vTrigger);
              setLoraHex(data.loraHex);

              // Sound Buzzer alert jika kuota <= 10%
              if (data.state?.isAlertActive) {
                audioBuzzer.startWarningLoop();
              } else {
                audioBuzzer.stopWarningLoop();
              }
            }
          } catch {
            // Ignore parse errors
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          audioBuzzer.stopWarningLoop();
          if (!isDisposed) {
            // Exponential backoff reconnect
            const delay = Math.min(1500 * Math.pow(1.5, retryAttempt), maxRetryDelay);
            retryAttempt++;
            reconnectTimeout = setTimeout(connectWs, delay);
          }
        };

        ws.onerror = () => {
          setIsConnected(false);
        };
      } catch {
        if (!isDisposed) {
          const delay = Math.min(1500 * Math.pow(1.5, retryAttempt), maxRetryDelay);
          retryAttempt++;
          reconnectTimeout = setTimeout(connectWs, delay);
        }
      }
    };

    connectWs();

    return () => {
      isDisposed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        } else if (ws.readyState === WebSocket.CONNECTING) {
          // If still connecting, close cleanly on open
          ws.onopen = () => ws?.close();
        }
      }
      audioBuzzer.stopWarningLoop();
    };
  }, [fetchInitialData]);

  const toggleBuzzerMute = () => {
    const next = !isBuzzerMuted;
    setIsBuzzerMuted(next);
    audioBuzzer.setMuted(next);
  };

  const setAppliances = async (load: Partial<ApplianceLoad>) => {
    try {
      const res = await fetch('/api/appliances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(load)
      });
      if (res.ok) {
        const data = await res.json();
        setAppliancesState(data.appliances);
      }
    } catch {
      // Fallback
      setAppliancesState(prev => ({ ...prev, ...load }));
    }
  };

  const setNetwork = async (type: NetworkType) => {
    try {
      await fetch('/api/network', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ networkType: type })
      });
    } catch {
      // Fallback
    }
  };

  const purchaseToken = async (amountIdr: number) => {
    try {
      const res = await fetch('/api/tokens/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountIdr })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return {
          success: false,
          error: errData.error || `Server status ${res.status}: Backend sedang offline atau memulai`
        };
      }
      const data = await res.json();
      setLastPurchasedToken(data.token);
      fetchTransactions();
      return { success: true, token: data.token };
    } catch (e: any) {
      return { success: false, error: e.message || 'Koneksi ke backend gagal' };
    }
  };

  const redeemToken = async (tokenCode: string) => {
    try {
      const res = await fetch('/api/tokens/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenCode })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        audioBuzzer.playErrorBuzz();
        return {
          success: false,
          message: errData.message || `Server status ${res.status}: Backend offline`
        };
      }
      const data = await res.json();
      if (data.success) {
        audioBuzzer.playSuccessChime();
        fetchTransactions();
        return { success: true, message: data.message };
      }
      audioBuzzer.playErrorBuzz();
      return { success: false, message: data.message || 'Token ditolak' };
    } catch (e: any) {
      audioBuzzer.playErrorBuzz();
      return { success: false, message: e.message || 'Koneksi backend gagal' };
    }
  };

  const updateTariff = async (config: Partial<TariffConfig>) => {
    try {
      const res = await fetch('/api/tariff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        const data = await res.json();
        setTariff(data.tariff || data);
        fetchTransactions();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const setValveManual = async (action: 'OPEN' | 'CLOSE') => {
    try {
      const res = await fetch('/api/valve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { success: false, message: errData.message || `Server status ${res.status}` };
      }
      const data = await res.json();
      return { success: true, message: data.message };
    } catch (e: any) {
      return { success: false, message: e.message || 'Koneksi gagal' };
    }
  };

  return (
    <GasContext.Provider
      value={{
        meter,
        telemetry,
        appliances,
        tariff,
        vTrigger,
        loraHex,
        transactions,
        isConnected,
        activeTab,
        setActiveTab,
        isBuzzerMuted,
        toggleBuzzerMute,
        lastPurchasedToken,
        setLastPurchasedToken,
        setAppliances,
        setNetwork,
        purchaseToken,
        redeemToken,
        updateTariff,
        setValveManual,
        fetchTransactions
      }}
    >
      {children}
    </GasContext.Provider>
  );
};

export const useGas = () => {
  const context = useContext(GasContext);
  if (!context) {
    throw new Error('useGas must be used within a GasProvider');
  }
  return context;
};
