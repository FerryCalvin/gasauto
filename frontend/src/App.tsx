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

const MainDashboard: React.FC = () => {
  const { activeTab, meter, tariff, appliances } = useGas();

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
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col font-sans selection:bg-amber-500 selection:text-zinc-950">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* TAB 1: SIMULASI GAS & DIGITAL TWIN */}
        {activeTab === 'twin' && (
          <div className="space-y-6">
            {/* Unified Telemetry Console (Braun Receiver / Industrial Instrument Style) */}
            <section className="bg-[#0f1013] border border-zinc-800/80 rounded-xl overflow-hidden shadow-xs">
              <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800/70">
                {/* 1. Sisa Saldo Gas */}
                <div className="p-4 sm:p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 uppercase tracking-wider font-mono">
                    <span>Sisa Saldo Gas</span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        remaining <= 0
                          ? 'bg-rose-500'
                          : isAlert
                          ? 'bg-amber-400 animate-pulse'
                          : 'bg-emerald-400'
                      }`}
                    />
                  </div>
                  <div className="my-2">
                    <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-zinc-100 tabular-nums">
                      {formatVolume(remaining)}
                    </div>
                    <div className="text-xs font-mono text-amber-400/90 font-medium mt-0.5 tabular-nums">
                      {formatRupiah(equivalentRupiah)}
                    </div>
                  </div>
                  <div className="text-[11px] text-zinc-500 font-mono">
                    Status:{' '}
                    <span
                      className={
                        remaining <= 0
                          ? 'text-rose-400 font-medium'
                          : isAlert
                          ? 'text-amber-400 font-medium'
                          : 'text-emerald-400 font-medium'
                      }
                    >
                      {remaining <= 0 ? 'Habis (0 m³)' : isAlert ? 'Menipis (<10%)' : 'Nominal Aman'}
                    </span>
                  </div>
                </div>

                {/* 2. Katup Kontrol */}
                <div className="p-4 sm:p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 uppercase tracking-wider font-mono">
                    <span>Katup Solenoid</span>
                    <span className="font-mono text-[10px] text-zinc-500 tabular-nums">
                      {Math.round(meter?.valveAngleDeg ?? 0)}°
                    </span>
                  </div>
                  <div className="my-2">
                    <div
                      className={`text-2xl sm:text-3xl font-mono font-bold tracking-tight tabular-nums ${
                        valveStatus === 'OPEN'
                          ? 'text-emerald-400'
                          : valveStatus === 'CLOSING'
                          ? 'text-amber-400 animate-pulse'
                          : 'text-rose-400'
                      }`}
                    >
                      {valveStatus === 'OPEN' ? 'OPEN' : valveStatus === 'CLOSING' ? 'CLOSING' : 'LOCKED'}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5 font-mono">
                      {valveStatus === 'OPEN'
                        ? 'Aliran Tersedia'
                        : valveStatus === 'CLOSING'
                        ? 'Proses Memutus'
                        : 'Pasokan Ditutup'}
                    </div>
                  </div>
                  <div className="text-[11px] text-zinc-500 font-mono">
                    Mekanisme: Presisi 90° Rotary
                  </div>
                </div>

                {/* 3. Laju Aliran Real-time */}
                <div className="p-4 sm:p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 uppercase tracking-wider font-mono">
                    <span>Laju Aliran Real-time</span>
                    <span className="text-[10px] font-mono text-zinc-500">LPM</span>
                  </div>
                  <div className="my-2">
                    <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-zinc-100 tabular-nums">
                      {(meter?.currentFlowRateLpm ?? 0).toFixed(2)}{' '}
                      <span className="text-sm font-normal text-zinc-500">L/m</span>
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5 font-mono">
                      {isCooking ? 'Beban Aktif Menyala' : 'Standby (Nol Beban)'}
                    </div>
                  </div>
                  <div className="text-[11px] text-zinc-500 font-mono">
                    Sensor: Hall-Effect Pulse
                  </div>
                </div>

                {/* 4. Total Pemakaian */}
                <div className="p-4 sm:p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 uppercase tracking-wider font-mono">
                    <span>Total Konsumsi</span>
                    <span className="text-[10px] font-mono text-zinc-500">TOTAL</span>
                  </div>
                  <div className="my-2">
                    <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-zinc-100 tabular-nums">
                      {formatVolume(meter?.totalConsumedM3 ?? 0)}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5 font-mono tabular-nums">
                      Akumulasi: {formatRupiah(totalUsedRupiah)}
                    </div>
                  </div>
                  <div className="text-[11px] text-zinc-500 font-mono">
                    Indeks Register Kumulatif
                  </div>
                </div>
              </div>
            </section>

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

      {/* Dieter Rams / Industrial Footer */}
      <footer className="border-t border-zinc-800/80 bg-[#09090b] py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-zinc-500 gap-2">
          <span>GASAUTO &bull; SISTEM CIKAL BAKAL STS-20 &bull; IEC 62055-41 COMPLIANT</span>
          <span>DIGITAL TWIN SIMULATOR &bull; INDUSTRIAL MINIMALISM</span>
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
