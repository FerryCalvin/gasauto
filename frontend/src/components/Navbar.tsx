import React from 'react';
import { useGas } from '../context/GasContext';
import { formatRupiah } from '../utils/formatters';
import { Flame, Volume2, VolumeX, ShieldAlert, Cpu, ShoppingBag, Settings, Sparkles } from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    isBuzzerMuted,
    toggleBuzzerMute,
    tariff,
    meter
  } = useGas();

  return (
    <header className="sticky top-0 z-50 bg-[#070b12]/95 backdrop-blur-md border-b border-slate-800/80 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Flame className="w-5 h-5 text-slate-950 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-100 font-mono">
                  GASAUTO
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Meter Pintar
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                Simulasi Gas Prabayar Rumah Tangga
              </p>
            </div>
          </div>

          {/* Navigation Tabs - Friendly */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('twin')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'twin'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Simulasi Gas</span>
            </button>

            <button
              onClick={() => setActiveTab('portal')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'portal'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Beli Token</span>
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Tarif & Info</span>
            </button>

            <button
              onClick={() => setActiveTab('iot')}
              className={`hidden lg:flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'iot'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
              }`}
              title="Khusus Pengembang / IoT Blueprint"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Mode Teknisi</span>
            </button>
          </nav>

          {/* Right Status Bar */}
          <div className="flex items-center gap-2.5">
            {tariff && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="text-slate-400">Tarif:</span>
                <span className="font-bold text-amber-400">{formatRupiah(tariff.pricePerM3)}/m³</span>
              </div>
            )}

            {meter && meter.overdraftM3 > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold animate-pulse">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>-{meter.overdraftM3.toFixed(3)} m³</span>
              </div>
            )}

            <button
              onClick={toggleBuzzerMute}
              title={isBuzzerMuted ? 'Nyalakan Suara Buzzer' : 'Bisukan Suara Buzzer'}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              {isBuzzerMuted ? (
                <VolumeX className="w-4 h-4 text-slate-500" />
              ) : (
                <Volume2 className="w-4 h-4 text-amber-400" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
