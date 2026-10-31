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
import { Flame, Gauge, Zap, ShoppingBag, CheckCircle2, Power, Sparkles } from 'lucide-react';

const MainDashboard: React.FC = () => {
  const { activeTab, setActiveTab, meter, tariff, appliances, setAppliances } = useGas();

  const remaining = meter?.remainingQuotaM3 ?? 0;
  const isAlert = meter?.isAlertActive ?? false;
  const valveStatus = meter?.valveStatus ?? 'CLOSED';
  const priceM3 = tariff?.pricePerM3 ?? 11500;
  const equivalentRupiah = remaining * priceM3;

  const isCooking =
    valveStatus === 'OPEN' &&
    remaining > 0 &&
    (appliances.stove1 !== 'OFF' || appliances.stove2 !== 'OFF' || appliances.waterHeater !== 'OFF');

  const totalUsedRupiah = (meter?.totalConsumedM3 ?? 0) * priceM3;

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* TAB 1: SIMULASI GAS & DIGITAL TWIN */}
        {activeTab === 'twin' && (
          <div className="space-y-5">
            {/* Consumer-Friendly Status Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* 1. Sisa Saldo Gas */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  isAlert
                    ? 'bg-rose-950/25 border-rose-500/50 shadow-lg shadow-rose-950/40'
                    : 'bg-slate-900/90 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-semibold">SISA SALDO GAS</span>
                  <Flame
                    className={`w-4 h-4 ${
                      isAlert ? 'text-rose-400 animate-pulse' : 'text-amber-400'
                    }`}
                  />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight font-mono">
                  {formatVolume(remaining)}
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-amber-400 font-bold">{formatRupiah(equivalentRupiah)}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      remaining <= 0
                        ? 'bg-rose-500/20 text-rose-300'
                        : isAlert
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {remaining <= 0 ? 'Habis' : isAlert ? 'Menipis' : 'Aman'}
                  </span>
                </div>
              </div>

              {/* 2. Status Aliran Gas */}
              <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-semibold">STATUS ALIRAN GAS</span>
                  <Gauge className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                  <span
                    className={
                      valveStatus === 'OPEN'
                        ? 'text-emerald-400'
                        : valveStatus === 'CLOSING'
                        ? 'text-amber-400 animate-pulse'
                        : 'text-rose-400'
                    }
                  >
                    {valveStatus === 'OPEN'
                      ? 'Mengalir'
                      : valveStatus === 'CLOSING'
                      ? 'Menutup'
                      : 'Tertutup'}
                  </span>
                  <span className="text-xs text-slate-400 font-normal">
                    ({Math.round(meter?.valveAngleDeg ?? 0)}°)
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  {valveStatus === 'OPEN' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Katup terbuka aman</span>
                    </>
                  ) : (
                    <>
                      <Power className="w-3.5 h-3.5 text-rose-400" />
                      <span>Katup otomatis terkunci</span>
                    </>
                  )}
                </div>
              </div>

              {/* 3. Aktivitas Dapur */}
              <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-semibold">AKTIVITAS DAPUR</span>
                  <Zap className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2">
                  <span className={isCooking ? 'text-amber-400' : 'text-slate-400'}>
                    {isCooking ? 'Sedang Memasak' : 'Semua Mati'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                  <span>Pemakaian:</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {(meter?.currentFlowRateLpm ?? 0).toFixed(2)} L/m
                  </span>
                </div>
              </div>

              {/* 4. Total Pemakaian Gas */}
              <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-semibold">TOTAL PEMAKAIAN</span>
                  <Sparkles className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-slate-100">
                  {formatVolume(meter?.totalConsumedM3 ?? 0)}
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                  <span>Akumulasi:</span>
                  <span className="text-slate-300 font-semibold">{formatRupiah(totalUsedRupiah)}</span>
                </div>
              </div>
            </div>

            {/* Quick Action Ribbon for Non-Coder Friends */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-300 px-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>
                  <strong>Aksi Cepat:</strong> Coba tombol di samping untuk menguji simulasi secara langsung
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('portal')}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Beli Kuota Gas</span>
                </button>

                <button
                  onClick={() => setAppliances({ stove1: appliances.stove1 === 'OFF' ? 'MED' : 'OFF' })}
                  className={`px-3.5 py-1.5 font-bold text-xs rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                    appliances.stove1 !== 'OFF'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>{appliances.stove1 !== 'OFF' ? 'Matikan Kompor' : 'Nyalakan Kompor'}</span>
                </button>
              </div>
            </div>

            {/* Main Interactive Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: 3D Miniature & Stove Controls */}
              <div className="lg:col-span-7 xl:col-span-8 space-y-5">
                <GasPipeline3D />
                <ApplianceController />
                <OverrunCard />
              </div>

              {/* Right Column: Physical Meter Box & Keypad */}
              <div className="lg:col-span-5 xl:col-span-4 sticky top-20">
                <VirtualMeterBox />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PORTAL PELANGGAN / BELI TOKEN */}
        {activeTab === 'portal' && <TokenPurchaseModal />}

        {/* TAB 3: PENGATURAN TARIF & INFORMASI */}
        {activeTab === 'admin' && <TariffSettingsView />}

        {/* TAB 4: IOT BLUEPRINT (MODE TEKNISI) */}
        {activeTab === 'iot' && <MqttInspectorTerminal />}
      </main>

      {/* Friendly Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>GasAuto &bull; Sistem Cerdas Meteran Gas Prabayar &bull; Standard STS 20-Digit</span>
          <span>Simulasi 3D Interaktif untuk Pengguna & Komunitas</span>
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
