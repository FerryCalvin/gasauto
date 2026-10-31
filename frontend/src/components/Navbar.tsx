import React from 'react';
import { useGas } from '../context/GasContext';
import { formatRupiah } from '../utils/formatters';
import { Flame, Volume2, VolumeX, ShieldAlert, Cpu, ShoppingBag, Settings, Gauge } from 'lucide-react';

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
    <header className="sticky top-0 z-50 bg-[#09090b]/90 backdrop-blur-md border-b border-zinc-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Minimalist Geometric Brand Mark */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-amber-400">
              <Flame className="w-4 h-4 fill-amber-400/20 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono font-bold text-sm tracking-wider text-zinc-100">
                GASAUTO
              </span>
              <span className="text-[10px] font-mono text-zinc-500">STS-20</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>ONLINE</span>
            </div>
          </div>

          {/* Linear-Style Segmented Control Navigation */}
          <nav className="inline-flex p-1 bg-zinc-900/90 border border-zinc-800/80 rounded-lg">
            {[
              { id: 'twin', label: 'Simulasi Gas', icon: Gauge, hideOnMobile: false },
              { id: 'portal', label: 'Beli Token', icon: ShoppingBag, hideOnMobile: false },
              { id: 'admin', label: 'Tarif & Parameter', icon: Settings, hideOnMobile: true },
              { id: 'iot', label: 'Mode Teknisi', icon: Cpu, hideOnMobile: true },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    tab.hideOnMobile ? 'hidden md:inline-flex' : 'inline-flex'
                  } ${
                    isActive
                      ? 'bg-zinc-800 text-zinc-100 shadow-xs border border-zinc-700/60 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-zinc-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Status Cluster */}
          <div className="flex items-center gap-2">
            {tariff && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-900/80 px-2.5 py-1 rounded-md border border-zinc-800/80 font-mono">
                <span className="text-zinc-500">Tarif:</span>
                <span className="text-zinc-200 tabular-nums">{formatRupiah(tariff.pricePerM3)}/m³</span>
              </div>
            )}

            {meter && meter.overdraftM3 > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs font-mono tabular-nums">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>-{meter.overdraftM3.toFixed(3)} m³</span>
              </div>
            )}

            <button
              onClick={toggleBuzzerMute}
              title={isBuzzerMuted ? 'Nyalakan Suara Buzzer' : 'Bisukan Suara Buzzer'}
              className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              {isBuzzerMuted ? (
                <VolumeX className="w-4 h-4 text-zinc-500" />
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
