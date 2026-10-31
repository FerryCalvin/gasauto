import React from 'react';
import { useGas } from '../../context/GasContext';
import { ShieldCheck, TrendingDown, DollarSign } from 'lucide-react';
import { formatRupiah } from '../../utils/formatters';

export const OverrunCard: React.FC = () => {
  const { meter, tariff, vTrigger } = useGas();

  const flowLpm = meter?.currentFlowRateLpm || 0;
  const closeSec = tariff?.valveCloseDurationSec || 2.5;
  const overdraftM3 = meter?.overdraftM3 || 0;
  const priceM3 = tariff?.pricePerM3 || 11500;
  const potentialLossIdr = Math.round(vTrigger * priceM3);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Sistem Proteksi Anti-Rugi (Mode A)
          </h3>
        </div>

        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Kompensasi Latensi Aktif
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl">
          <span className="text-[10px] text-slate-500 uppercase block font-mono">Latensi Katup</span>
          <span className="text-sm font-bold font-mono text-slate-200">{closeSec}s</span>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl">
          <span className="text-[10px] text-slate-500 uppercase block font-mono">Pemicu Cutoff</span>
          <span className="text-sm font-bold font-mono text-rose-400">
            {(vTrigger * 1000).toFixed(2)} L
          </span>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl">
          <span className="text-[10px] text-slate-500 uppercase block font-mono">Proteksi Nilai</span>
          <span className="text-sm font-bold font-mono text-emerald-400 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5" />
            {formatRupiah(potentialLossIdr)}
          </span>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl">
          <span className="text-[10px] text-slate-500 uppercase block font-mono">Saldo Overdraft</span>
          <span className={`text-sm font-bold font-mono ${overdraftM3 > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
            {overdraftM3 > 0 ? `-${overdraftM3.toFixed(4)} m³` : '0.0000 m³'}
          </span>
        </div>
      </div>

      {/* Formula Strip */}
      <div className="mt-3 bg-slate-950/90 border border-slate-800/80 px-3.5 py-2 rounded-xl flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-400">
          <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
          <span>V_trigger = Q × t_close = ({(flowLpm / 60).toFixed(4)} L/s) × {closeSec}s</span>
        </div>
        <span className="font-bold text-amber-400">{(vTrigger * 1000).toFixed(3)} Liter</span>
      </div>
    </div>
  );
};
