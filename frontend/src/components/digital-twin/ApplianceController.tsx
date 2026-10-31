import React from 'react';
import { useGas } from '../../context/GasContext';
import { Flame, Droplets, AlertCircle } from 'lucide-react';

export const ApplianceController: React.FC = () => {
  const { appliances, setAppliances, meter } = useGas();

  const isGasSupplied = meter?.valveStatus === 'OPEN' && (meter?.remainingQuotaM3 ?? 0) > 0;
  const isPartiallyClosing = meter?.valveStatus === 'CLOSING';

  return (
    <div className="bg-[#0f1013] border border-zinc-800/80 rounded-xl p-5 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800/80 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold tracking-wider text-zinc-200 uppercase">
              Kontrol Beban Peralatan Gas
            </h3>
            <p className="text-[11px] font-mono text-zinc-500">
              Simulasi aktuasi kompor & penukar panas mandi
            </p>
          </div>
        </div>

        <div>
          {isGasSupplied ? (
            <span className="text-xs font-mono text-emerald-400 bg-zinc-950 px-2.5 py-1 rounded-md border border-zinc-800 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>PASOKAN AKTIF</span>
            </span>
          ) : (
            <span className="text-xs font-mono text-rose-400 bg-zinc-950 px-2.5 py-1 rounded-md border border-zinc-800 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>PASOKAN DITUTUP</span>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KOMPOR 1 (UTAMA) */}
        <div
          className={`border rounded-xl p-4 flex flex-col justify-between transition-all ${
            isGasSupplied && appliances.stove1 !== 'OFF'
              ? 'bg-[#121316] border-zinc-700/80'
              : 'bg-[#090a0d] border-zinc-800/80'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-xs font-mono font-bold text-zinc-200 block">
                Kompor 1 (Utama)
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                {appliances.stove1 === 'OFF'
                  ? 'OFF • Standby'
                  : appliances.stove1 === 'LOW'
                  ? 'MIN • Api Kecil'
                  : appliances.stove1 === 'MED'
                  ? 'MED • Api Sedang'
                  : 'MAX • Api Besar'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 tabular-nums">
              {isGasSupplied && appliances.stove1 !== 'OFF'
                ? appliances.stove1 === 'HIGH'
                  ? '1.50 L/m'
                  : appliances.stove1 === 'MED'
                  ? '1.08 L/m'
                  : '0.60 L/m'
                : '0.00 L/m'}
            </span>
          </div>

          {/* Visual Concentric Burner Dial */}
          <div className="h-28 bg-[#090a0d] rounded-xl flex items-center justify-center relative border border-zinc-800/80 my-2 overflow-hidden">
            <div className="w-20 h-20 rounded-full border border-zinc-800/80 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full border border-zinc-700/60 flex items-center justify-center">
                {isGasSupplied && appliances.stove1 !== 'OFF' ? (
                  <div
                    className={`rounded-full transition-all duration-300 flex items-center justify-center ${
                      appliances.stove1 === 'HIGH'
                        ? 'w-14 h-14 bg-sky-400/30 border border-cyan-300 shadow-[0_0_22px_rgba(56,189,248,0.55)]'
                        : appliances.stove1 === 'MED'
                        ? 'w-11 h-11 bg-sky-500/25 border border-sky-400/80 shadow-[0_0_16px_rgba(56,189,248,0.45)]'
                        : 'w-8 h-8 bg-sky-500/20 border border-sky-400/60 shadow-[0_0_12px_rgba(56,189,248,0.35)]'
                    }`}
                  >
                    <Flame
                      className={`text-sky-300 animate-pulse ${
                        appliances.stove1 === 'HIGH'
                          ? 'w-7 h-7 text-cyan-200'
                          : appliances.stove1 === 'MED'
                          ? 'w-5 h-5 text-sky-300'
                          : 'w-4 h-4 text-sky-300'
                      }`}
                    />
                  </div>
                ) : (
                  <span className="text-[11px] font-mono text-zinc-600">STANDBY</span>
                )}
              </div>
            </div>

            {isPartiallyClosing && appliances.stove1 !== 'OFF' && (
              <div className="absolute inset-0 bg-amber-500/10 flex items-center justify-center backdrop-blur-xs">
                <span className="text-[10px] font-mono text-amber-300 px-2 py-0.5 rounded bg-zinc-950 border border-amber-500/40">
                  KATUP MENUTUP...
                </span>
              </div>
            )}
          </div>

          {/* Stepped 4-Position Rocker Switch */}
          <div className="grid grid-cols-4 p-1 bg-zinc-950 border border-zinc-800/80 rounded-lg mt-2">
            {[
              { id: 'OFF', label: 'OFF' },
              { id: 'LOW', label: 'MIN' },
              { id: 'MED', label: 'MED' },
              { id: 'HIGH', label: 'MAX' },
            ].map((lvl) => (
              <button
                key={lvl.id}
                onClick={() => setAppliances({ stove1: lvl.id as any })}
                className={`py-1.5 text-xs font-mono font-medium rounded transition-all cursor-pointer ${
                  appliances.stove1 === lvl.id
                    ? 'bg-zinc-800 text-amber-400 font-bold shadow-xs border border-zinc-700/60'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>
        </div>

        {/* KOMPOR 2 (SEKUNDER) */}
        <div
          className={`border rounded-xl p-4 flex flex-col justify-between transition-all ${
            isGasSupplied && appliances.stove2 !== 'OFF'
              ? 'bg-[#121316] border-zinc-700/80'
              : 'bg-[#090a0d] border-zinc-800/80'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-xs font-mono font-bold text-zinc-200 block">
                Kompor 2 (Sekunder)
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                {appliances.stove2 === 'MED' ? 'MED • Api Sedang' : 'OFF • Standby'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 tabular-nums">
              {isGasSupplied && appliances.stove2 === 'MED' ? '1.08 L/m' : '0.00 L/m'}
            </span>
          </div>

          <div className="h-28 bg-[#090a0d] rounded-xl flex items-center justify-center relative border border-zinc-800/80 my-2 overflow-hidden">
            <div className="w-20 h-20 rounded-full border border-zinc-800/80 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full border border-zinc-700/60 flex items-center justify-center">
                {isGasSupplied && appliances.stove2 === 'MED' ? (
                  <div className="w-11 h-11 rounded-full bg-sky-500/25 border border-sky-400/80 shadow-[0_0_16px_rgba(56,189,248,0.45)] flex items-center justify-center">
                    <Flame className="w-5 h-5 text-sky-300 animate-pulse" />
                  </div>
                ) : (
                  <span className="text-[11px] font-mono text-zinc-600">STANDBY</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 p-1 bg-zinc-950 border border-zinc-800/80 rounded-lg mt-2">
            {[
              { id: 'OFF', label: 'OFF' },
              { id: 'MED', label: 'MED' },
            ].map((lvl) => (
              <button
                key={lvl.id}
                onClick={() => setAppliances({ stove2: lvl.id as any })}
                className={`py-1.5 text-xs font-mono font-medium rounded transition-all cursor-pointer ${
                  appliances.stove2 === lvl.id
                    ? 'bg-zinc-800 text-amber-400 font-bold shadow-xs border border-zinc-700/60'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>
        </div>

        {/* WATER HEATER (TECHNICAL HEAT EXCHANGER) */}
        <div
          className={`border rounded-xl p-4 flex flex-col justify-between transition-all ${
            isGasSupplied && appliances.waterHeater === 'ON'
              ? 'bg-[#121316] border-zinc-700/80'
              : 'bg-[#090a0d] border-zinc-800/80'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-sky-400" />
              <div>
                <span className="text-xs font-mono font-bold text-zinc-200 block">
                  Pemanas Air Mandi
                </span>
                <span className="text-[11px] font-mono text-zinc-500">
                  {appliances.waterHeater === 'ON' ? '42.0°C • Aktif' : 'Standby (28.0°C)'}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 tabular-nums">
              {isGasSupplied && appliances.waterHeater === 'ON' ? '2.10 L/m' : '0.00 L/m'}
            </span>
          </div>

          <div className="h-28 bg-[#090a0d] rounded-xl flex flex-col items-center justify-center relative border border-zinc-800/80 my-2 px-3 text-center">
            {isGasSupplied && appliances.waterHeater === 'ON' ? (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5 text-sky-400 font-mono text-xs font-bold">
                  <Droplets className="w-4 h-4 text-sky-400" />
                  <span>HEATING: 42.0°C</span>
                </div>
                <div className="text-[10px] font-mono text-zinc-400">
                  Penukar Panas Instan • 2.10 L/m
                </div>
                <span className="w-16 h-0.5 bg-sky-500/40 rounded-full mt-1" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 text-zinc-600 font-mono">
                <Droplets className="w-4 h-4 text-zinc-600" />
                <span className="text-xs">STANDBY: 28.0°C</span>
                <span className="text-[10px] text-zinc-600">Termokopel Dingin</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 p-1 bg-zinc-950 border border-zinc-800/80 rounded-lg mt-2">
            {[
              { id: 'OFF', label: 'OFF' },
              { id: 'ON', label: 'AKTIF' },
            ].map((lvl) => (
              <button
                key={lvl.id}
                onClick={() => setAppliances({ waterHeater: lvl.id as any })}
                className={`py-1.5 text-xs font-mono font-medium rounded transition-all cursor-pointer ${
                  appliances.waterHeater === lvl.id
                    ? 'bg-zinc-800 text-amber-400 font-bold shadow-xs border border-zinc-700/60'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
