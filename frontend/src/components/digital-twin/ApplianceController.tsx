import React from 'react';
import { useGas } from '../../context/GasContext';
import { Flame, Droplets, UtensilsCrossed } from 'lucide-react';

export const ApplianceController: React.FC = () => {
  const { appliances, setAppliances, meter } = useGas();

  const isGasSupplied = meter?.valveStatus === 'OPEN' && (meter?.remainingQuotaM3 ?? 0) > 0;
  const isPartiallyClosing = meter?.valveStatus === 'CLOSING';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <UtensilsCrossed className="w-4 h-4 text-orange-400" />
          Kontrol Beban Aliran Gas
        </h3>
        {!isGasSupplied && (
          <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
            Aliran Terputus
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* KOMPOR 1 */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-200">Kompor Tungku 1</span>
            <span className="text-[11px] font-mono text-cyan-400 font-bold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
              {appliances.stove1 === 'HIGH' ? '1.50' : appliances.stove1 === 'MED' ? '1.08' : appliances.stove1 === 'LOW' ? '0.60' : '0.00'} L/m
            </span>
          </div>

          {/* Visual Burner Ring */}
          <div className="h-20 bg-slate-900/80 rounded-lg flex items-center justify-center relative border border-slate-800">
            <div className="w-14 h-14 rounded-full border-2 border-slate-700/60 flex items-center justify-center">
              {isGasSupplied && appliances.stove1 !== 'OFF' ? (
                <div
                  className={`rounded-full transition-all duration-300 flex items-center justify-center ${
                    appliances.stove1 === 'HIGH'
                      ? 'w-12 h-12 bg-cyan-400/30 shadow-[0_0_16px_#06b6d4] border border-cyan-300'
                      : appliances.stove1 === 'MED'
                      ? 'w-9 h-9 bg-cyan-500/30 shadow-[0_0_10px_#06b6d4] border border-cyan-400'
                      : 'w-6 h-6 bg-cyan-600/30 shadow-[0_0_6px_#06b6d4] border border-cyan-500'
                  }`}
                >
                  <Flame
                    className={`text-cyan-300 animate-pulse ${
                      appliances.stove1 === 'HIGH' ? 'w-6 h-6' : appliances.stove1 === 'MED' ? 'w-5 h-5' : 'w-3.5 h-3.5'
                    }`}
                  />
                </div>
              ) : (
                <span className="text-[10px] text-slate-600 font-medium">Off</span>
              )}
            </div>

            {isPartiallyClosing && appliances.stove1 !== 'OFF' && (
              <div className="absolute inset-0 bg-amber-500/10 flex items-center justify-center">
                <span className="text-[9px] text-amber-300 font-bold px-1.5 py-0.5 rounded bg-slate-950/90 border border-amber-500/30">
                  Meredup...
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-4 gap-1 mt-2.5">
            {(['OFF', 'LOW', 'MED', 'HIGH'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setAppliances({ stove1: level })}
                className={`py-1 text-[11px] font-semibold rounded-md transition-all ${
                  appliances.stove1 === level
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {level === 'OFF' ? 'Mati' : level === 'LOW' ? 'Min' : level === 'MED' ? 'Mid' : 'Max'}
              </button>
            ))}
          </div>
        </div>

        {/* KOMPOR 2 */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-200">Kompor Tungku 2</span>
            <span className="text-[11px] font-mono text-cyan-400 font-bold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
              {appliances.stove2 === 'MED' ? '1.08' : '0.00'} L/m
            </span>
          </div>

          <div className="h-20 bg-slate-900/80 rounded-lg flex items-center justify-center relative border border-slate-800">
            <div className="w-14 h-14 rounded-full border-2 border-slate-700/60 flex items-center justify-center">
              {isGasSupplied && appliances.stove2 === 'MED' ? (
                <div className="w-9 h-9 rounded-full bg-cyan-500/30 shadow-[0_0_10px_#06b6d4] border border-cyan-400 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-cyan-300 animate-pulse" />
                </div>
              ) : (
                <span className="text-[10px] text-slate-600 font-medium">Off</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 mt-2.5">
            <button
              onClick={() => setAppliances({ stove2: 'OFF' })}
              className={`py-1 text-[11px] font-semibold rounded-md transition-all ${
                appliances.stove2 === 'OFF'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Mati
            </button>
            <button
              onClick={() => setAppliances({ stove2: 'MED' })}
              className={`py-1 text-[11px] font-semibold rounded-md transition-all ${
                appliances.stove2 === 'MED'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Nyala (1.08 L)
            </button>
          </div>
        </div>

        {/* WATER HEATER */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-sky-400" />
              Pemanas Air Gas
            </span>
            <span className="text-[11px] font-mono text-cyan-400 font-bold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
              {appliances.waterHeater === 'ON' ? '2.10' : '0.00'} L/m
            </span>
          </div>

          <div className="h-20 bg-slate-900/80 rounded-lg flex items-center justify-center relative border border-slate-800">
            {isGasSupplied && appliances.waterHeater === 'ON' ? (
              <div className="flex items-center gap-2 text-orange-400">
                <Flame className="w-6 h-6 animate-bounce" />
                <span className="text-xs font-bold font-mono">42°C Aktif</span>
              </div>
            ) : (
              <span className="text-[10px] text-slate-600 font-medium">Standby</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5 mt-2.5">
            <button
              onClick={() => setAppliances({ waterHeater: 'OFF' })}
              className={`py-1 text-[11px] font-semibold rounded-md transition-all ${
                appliances.waterHeater === 'OFF'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Mati
            </button>
            <button
              onClick={() => setAppliances({ waterHeater: 'ON' })}
              className={`py-1 text-[11px] font-semibold rounded-md transition-all ${
                appliances.waterHeater === 'ON'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Nyala (2.10 L)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
