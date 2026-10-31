import React from 'react';
import { useGas } from '../../context/GasContext';
import { ShieldCheck, CheckCircle2, Clock, Activity, Sliders } from 'lucide-react';
import { formatRupiah, formatVolume } from '../../utils/formatters';

export const OverrunCard: React.FC = () => {
  const { meter, tariff, vTrigger } = useGas();

  const closeSec = tariff?.valveCloseDurationSec || 2.5;
  const overdraftM3 = meter?.overdraftM3 || 0;
  const priceM3 = tariff?.pricePerM3 || 11500;
  const protectedIdr = Math.round(vTrigger * priceM3);

  return (
    <div className="bg-[#0f1013] border border-zinc-800/80 rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800/80 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold tracking-wider text-zinc-200 uppercase">
              Proteksi Aktuator & Rekonsiliasi Overrun
            </h3>
            <p className="text-[11px] font-mono text-zinc-500">
              Kompensasi presisi penutupan katup 90° sesuai standar STS
            </p>
          </div>
        </div>

        <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-zinc-950 text-emerald-400 border border-zinc-800 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>TERKALIBRASI AKTIF</span>
        </span>
      </div>

      {/* 3 Dieter Rams Technical Specification Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 my-1">
        {/* Spec 1: Valve Cutoff Lead Time */}
        <div className="bg-[#090a0d] border border-zinc-800/80 p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-2">
            <span className="uppercase tracking-wider">Lead Time Cutoff</span>
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div className="my-1">
            <div className="text-xl font-mono font-bold text-zinc-100 tabular-nums">
              {closeSec.toFixed(2)}s
            </div>
            <div className="text-[10px] font-mono text-amber-400/90 font-medium mt-0.5">
              vTrigger = (Q × {closeSec.toFixed(1)}) / 60
            </div>
          </div>
          <p className="text-[11px] font-mono text-zinc-500 mt-2 leading-relaxed">
            Offset aktuasi mekanis sebelum kuota nol untuk kompensasi putaran 90°.
          </p>
        </div>

        {/* Spec 2: Protected Gas Volume */}
        <div className="bg-[#090a0d] border border-zinc-800/80 p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-2">
            <span className="uppercase tracking-wider">Gas Terlindungi</span>
            <Activity className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div className="my-1">
            <div className="text-xl font-mono font-bold text-zinc-100 tabular-nums">
              +{(vTrigger * 1000).toFixed(1)} L
            </div>
            <div className="text-[10px] font-mono text-emerald-400 font-medium mt-0.5 tabular-nums">
              Nilai: {formatRupiah(protectedIdr)} (ΔV: {vTrigger.toFixed(4)} m³)
            </div>
          </div>
          <p className="text-[11px] font-mono text-zinc-500 mt-2 leading-relaxed">
            Volume penyangga yang diamankan dari depresurisasi aliran pipa.
          </p>
        </div>

        {/* Spec 3: Overdraft Reconciliation */}
        <div className="bg-[#090a0d] border border-zinc-800/80 p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-2">
            <span className="uppercase tracking-wider">Rekonsiliasi Overrun</span>
            <Sliders className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div className="my-1">
            <div
              className={`text-xl font-mono font-bold tabular-nums ${
                overdraftM3 > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {overdraftM3 > 0 ? `-${formatVolume(overdraftM3)}` : '0.0000 m³ (Presisi)'}
            </div>
            <div className="text-[10px] font-mono text-zinc-400 font-medium mt-0.5">
              {overdraftM3 > 0 ? 'Penyesuaian di Token Berikutnya' : 'Status: Nol Deviasi Overdraft'}
            </div>
          </div>
          <p className="text-[11px] font-mono text-zinc-500 mt-2 leading-relaxed">
            Sinkronisasi register otomatis pada token STS berikutnya tanpa kerugian volume.
          </p>
        </div>
      </div>
    </div>
  );
};
