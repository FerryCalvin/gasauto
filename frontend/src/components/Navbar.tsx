import React from 'react';
import { useGas } from '../context/GasContext';
import { formatRupiah } from '../utils/formatters';
import { Flame, Volume2, VolumeX, ShieldAlert, Cpu, ShoppingBag, Settings, Activity } from 'lucide-react';

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
    <header className="sticky top-0 z-50 bg-[#070b12]/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20">
              <Flame className="w-5 h-5 text-slate-950 fill-current" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-slate-100 font-mono">
                GASAUTO
              </span>
              <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/80">
                v1.0 3D
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('twin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'twin'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Digital Twin</span>
            </button>

            <button
              onClick={() => setActiveTab('portal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'portal'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Beli Token</span>
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'admin'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Tarif & Admin</span>
            </button>

            <button
              onClick={() => setActiveTab('iot')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'iot'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Protokol IoT</span>
            </button>
          </nav>

          {/* Right Status Bar */}
          <div className="flex items-center gap-3">
            {tariff && (
              <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800">
                <span className="text-slate-500">TARIF:</span>
                <span className="font-bold text-amber-400">{formatRupiah(tariff.pricePerM3)}/m³</span>
              </div>
            )}

            {meter && meter.overdraftM3 > 0 && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-mono font-bold animate-pulse">
                <ShieldAlert className="w-3 h-3" />
                <span>-{meter.overdraftM3.toFixed(4)} m³</span>
              </div>
            )}

            <button
              onClick={toggleBuzzerMute}
              title={isBuzzerMuted ? 'Nyalakan Buzzer' : 'Bisukan Buzzer'}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              {isBuzzerMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-600" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
