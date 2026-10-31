import React from 'react';
import { useGas } from '../../context/GasContext';
import { Flame, Droplets, UtensilsCrossed, AlertCircle, Sparkles } from 'lucide-react';

export const ApplianceController: React.FC = () => {
  const { appliances, setAppliances, meter } = useGas();

  const isGasSupplied = meter?.valveStatus === 'OPEN' && (meter?.remainingQuotaM3 ?? 0) > 0;
  const isPartiallyClosing = meter?.valveStatus === 'CLOSING';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
            <UtensilsCrossed className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Kontrol Alat Dapur & Api</h3>
            <p className="text-xs text-slate-400">
              Nyalakan kompor untuk melihat aliran gas dan api 3D menyala
            </p>
          </div>
        </div>

        <div>
          {isGasSupplied ? (
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Gas Siap Pakai
            </span>
          ) : (
            <span className="text-xs font-semibold text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Gas Terputus
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KOMPOR 1 (UTAMA) */}
        <div
          className={`border rounded-xl p-4 flex flex-col justify-between transition-all ${
            isGasSupplied && appliances.stove1 !== 'OFF'
              ? 'bg-slate-950/90 border-amber-500/40 shadow-lg shadow-amber-950/20'
              : 'bg-slate-950/60 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-xs font-bold text-slate-200 block">Kompor Utama</span>
              <span className="text-[11px] text-slate-400">
                {appliances.stove1 === 'OFF'
                  ? 'Mati'
                  : appliances.stove1 === 'LOW'
                  ? 'Api Kecil (Hangat)'
                  : appliances.stove1 === 'MED'
                  ? 'Api Sedang (Tumis)'
                  : 'Api Besar (Mendidih)'}
              </span>
            </div>
            {isGasSupplied && appliances.stove1 !== 'OFF' && (
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-800/40 font-bold">
                {appliances.stove1 === 'HIGH' ? '1.50 L/m' : appliances.stove1 === 'MED' ? '1.08 L/m' : '0.60 L/m'}
              </span>
            )}
          </div>

          {/* Visual Burner Ring */}
          <div className="h-24 bg-slate-900/90 rounded-xl flex items-center justify-center relative border border-slate-800 my-2 overflow-hidden">
            <div className="w-16 h-16 rounded-full border-2 border-slate-700/60 flex items-center justify-center">
              {isGasSupplied && appliances.stove1 !== 'OFF' ? (
                <div
                  className={`rounded-full transition-all duration-300 flex items-center justify-center ${
                    appliances.stove1 === 'HIGH'
                      ? 'w-14 h-14 bg-cyan-400/30 shadow-[0_0_20px_#06b6d4] border border-cyan-300'
                      : appliances.stove1 === 'MED'
                      ? 'w-11 h-11 bg-cyan-500/30 shadow-[0_0_12px_#06b6d4] border border-cyan-400'
                      : 'w-8 h-8 bg-cyan-600/30 shadow-[0_0_8px_#06b6d4] border border-cyan-500'
                  }`}
                >
                  <Flame
                    className={`text-cyan-300 animate-pulse ${
                      appliances.stove1 === 'HIGH' ? 'w-8 h-8' : appliances.stove1 === 'MED' ? 'w-6 h-6' : 'w-4 h-4'
                    }`}
                  />
                </div>
              ) : (
                <span className="text-xs text-slate-500 font-medium">Mati</span>
              )}
            </div>

            {isPartiallyClosing && appliances.stove1 !== 'OFF' && (
              <div className="absolute inset-0 bg-amber-500/15 flex items-center justify-center backdrop-blur-xs">
                <span className="text-[10px] text-amber-300 font-bold px-2 py-0.5 rounded bg-slate-950/90 border border-amber-500/40">
                  Katup Sedang Menutup...
                </span>
              </div>
            )}
          </div>

          {/* Tombol Pilihan Api */}
          <div className="grid grid-cols-4 gap-1.5 mt-2">
            {[
              { id: 'OFF', label: 'Mati' },
              { id: 'LOW', label: 'Kecil' },
              { id: 'MED', label: 'Sedang' },
              { id: 'HIGH', label: 'Besar' }
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setAppliances({ stove1: id as any })}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  appliances.stove1 === id
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* KOMPOR 2 (KEDUA) */}
        <div
          className={`border rounded-xl p-4 flex flex-col justify-between transition-all ${
            isGasSupplied && appliances.stove2 !== 'OFF'
              ? 'bg-slate-950/90 border-amber-500/40 shadow-lg shadow-amber-950/20'
              : 'bg-slate-950/60 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-xs font-bold text-slate-200 block">Kompor Kedua</span>
              <span className="text-[11px] text-slate-400">
                {appliances.stove2 === 'MED' ? 'Api Sedang Menyala' : 'Mati'}
              </span>
            </div>
            {isGasSupplied && appliances.stove2 === 'MED' && (
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-800/40 font-bold">
                1.08 L/m
              </span>
            )}
          </div>

          <div className="h-24 bg-slate-900/90 rounded-xl flex items-center justify-center relative border border-slate-800 my-2 overflow-hidden">
            <div className="w-16 h-16 rounded-full border-2 border-slate-700/60 flex items-center justify-center">
              {isGasSupplied && appliances.stove2 === 'MED' ? (
                <div className="w-11 h-11 rounded-full bg-cyan-500/30 shadow-[0_0_12px_#06b6d4] border border-cyan-400 flex items-center justify-center">
                  <Flame className="w-6 h-6 text-cyan-300 animate-pulse" />
                </div>
              ) : (
                <span className="text-xs text-slate-500 font-medium">Mati</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              onClick={() => setAppliances({ stove2: 'OFF' })}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                appliances.stove2 === 'OFF'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              Matikan
            </button>
            <button
              onClick={() => setAppliances({ stove2: 'MED' })}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                appliances.stove2 === 'MED'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              Nyalakan Api
            </button>
          </div>
        </div>

        {/* WATER HEATER */}
        <div
          className={`border rounded-xl p-4 flex flex-col justify-between transition-all ${
            isGasSupplied && appliances.waterHeater === 'ON'
              ? 'bg-slate-950/90 border-sky-500/40 shadow-lg shadow-sky-950/20'
              : 'bg-slate-950/60 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-sky-400" />
              <div>
                <span className="text-xs font-bold text-slate-200 block">Pemanas Air Mandi</span>
                <span className="text-[11px] text-slate-400">
                  {appliances.waterHeater === 'ON' ? 'Air Hangat 42°C Aktif' : 'Standby'}
                </span>
              </div>
            </div>
            {isGasSupplied && appliances.waterHeater === 'ON' && (
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-800/40 font-bold">
                2.10 L/m
              </span>
            )}
          </div>

          <div className="h-24 bg-slate-900/90 rounded-xl flex items-center justify-center relative border border-slate-800 my-2 overflow-hidden">
            {isGasSupplied && appliances.waterHeater === 'ON' ? (
              <div className="flex flex-col items-center gap-1 text-sky-300">
                <Sparkles className="w-6 h-6 animate-spin text-sky-400" />
                <span className="text-xs font-bold font-mono">Air Panas Mengalir</span>
              </div>
            ) : (
              <span className="text-xs text-slate-500 font-medium">Mati</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              onClick={() => setAppliances({ waterHeater: 'OFF' })}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                appliances.waterHeater === 'OFF'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              Matikan
            </button>
            <button
              onClick={() => setAppliances({ waterHeater: 'ON' })}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                appliances.waterHeater === 'ON'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              Nyalakan Air
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
