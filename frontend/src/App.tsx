import React from 'react';
import { GasProvider, useGas } from './context/GasContext';
import { Navbar } from './components/Navbar';
import { GasPipeline3D } from './components/digital-twin/GasPipeline3D';
import { ApplianceController } from './components/digital-twin/ApplianceController';
import { VirtualMeterBox } from './components/digital-twin/VirtualMeterBox';
import { OverrunCard } from './components/digital-twin/OverrunCard';
import { TokenPurchaseModal } from './components/portal/TokenPurchaseModal';
import { TariffSettingsView } from './components/admin/TariffSettingsView';
import { MqttInspectorTerminal } from './components/iot/MqttInspectorTerminal';
import { formatVolume, formatRupiah } from './utils/formatters';
import { Flame, Gauge, Zap, ShieldCheck } from 'lucide-react';

const MainDashboard: React.FC = () => {
  const { activeTab, meter, tariff } = useGas();

  const remaining = meter?.remainingQuotaM3 ?? 0;
  const isAlert = meter?.isAlertActive ?? false;
  const valveStatus = meter?.valveStatus ?? 'CLOSED';
  const priceM3 = tariff?.pricePerM3 ?? 11500;
  const equivalentRupiah = remaining * priceM3;

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* TAB 1: DIGITAL TWIN SIMULATION */}
        {activeTab === 'twin' && (
          <div className="space-y-5">
            {/* Minimal High-Contrast KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Sisa Kuota */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  isAlert
                    ? 'bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-950/30'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-1">
                  <span>SISA KUOTA</span>
                  <Flame className={`w-3.5 h-3.5 ${isAlert ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`} />
                </div>
                <div className="text-xl sm:text-2xl font-mono font-extrabold text-slate-100 tracking-tight">
                  {formatVolume(remaining)}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  &asymp; <span className="text-amber-400 font-semibold">{formatRupiah(equivalentRupiah)}</span>
                </div>
              </div>

              {/* Status Katup */}
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-1">
                  <span>KATUP MOTORIK</span>
                  <Gauge className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <div className="text-xl sm:text-2xl font-mono font-extrabold flex items-center gap-1.5">
                  <span
                    className={
                      valveStatus === 'OPEN'
                        ? 'text-emerald-400'
                        : valveStatus === 'CLOSING'
                        ? 'text-amber-400 animate-pulse'
                        : 'text-rose-400'
                    }
                  >
                    {valveStatus}
                  </span>
                  <span className="text-xs text-slate-500 font-normal">
                    {Math.round(meter?.valveAngleDeg ?? 0)}°
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Durasi: <span className="text-slate-300 font-semibold">{tariff?.valveCloseDurationSec || 2.5}s</span>
                </div>
              </div>

              {/* Debit Aliran Gas */}
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-1">
                  <span>DEBIT AKTIF</span>
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-xl sm:text-2xl font-mono font-extrabold text-cyan-400">
                  {(meter?.currentFlowRateLpm ?? 0).toFixed(2)}{' '}
                  <span className="text-xs font-normal text-slate-500">L/m</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Tekanan: <span className="text-slate-300 font-semibold">{valveStatus === 'OPEN' ? '28.0' : '0.0'} mbar</span>
                </div>
              </div>

              {/* Akumulasi Konsumsi */}
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-1">
                  <span>TOTAL PEMAKAIAN</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="text-xl sm:text-2xl font-mono font-extrabold text-slate-200">
                  {formatVolume(meter?.totalConsumedM3 ?? 0)}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Overdraft: <span className={meter && meter.overdraftM3 > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                    {meter && meter.overdraftM3 > 0 ? `-${meter.overdraftM3.toFixed(4)} m³` : '0 m³'}
                  </span>
                </div>
              </div>
            </div>

            {/* Main Interactive Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: 3D WebGL Pipe & Valve + Controls (8 Cols) */}
              <div className="lg:col-span-7 xl:col-span-8 space-y-5">
                <GasPipeline3D />
                <ApplianceController />
                <OverrunCard />
              </div>

              {/* Right Column: Physical Meter Box ESP32 Twin (4 Cols) */}
              <div className="lg:col-span-5 xl:col-span-4 sticky top-20">
                <VirtualMeterBox />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PORTAL PELANGGAN */}
        {activeTab === 'portal' && <TokenPurchaseModal />}

        {/* TAB 3: PENGATURAN ADMIN */}
        {activeTab === 'admin' && <TariffSettingsView />}

        {/* TAB 4: IOT BLUEPRINT */}
        {activeTab === 'iot' && <MqttInspectorTerminal />}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-3 mt-8">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>GasAuto Prepaid System &bull; STS 20-Digit</span>
          <span>Mode A Anti-Overrun Cutoff &bull; Three.js WebGL</span>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <GasProvider>
      <MainDashboard />
    </GasProvider>
  );
}
