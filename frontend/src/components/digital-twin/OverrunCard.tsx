import React from 'react';
import { useGas } from '../../context/GasContext';
import { ShieldCheck, Info, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { formatRupiah, formatVolume } from '../../utils/formatters';

export const OverrunCard: React.FC = () => {
  const { meter, tariff, vTrigger } = useGas();

  const closeSec = tariff?.valveCloseDurationSec || 2.5;
  const overdraftM3 = meter?.overdraftM3 || 0;
  const priceM3 = tariff?.pricePerM3 || 11500;
  const protectedIdr = Math.round(vTrigger * priceM3);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Sistem Proteksi Cerdas (Anti-Bocor & Tepat Waktu)
            </h3>
            <p className="text-xs text-slate-400">
              Menjaga kuota gas Anda akurat hingga tetes terakhir
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Aktif & Melindungi
        </span>
      </div>

      {/* 3 Kartu Penjelasan Ramah */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3">
        <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>Tutup Tepat Waktu</span>
          </div>
          <div className="text-sm font-bold text-slate-100">
            {closeSec} Detik Sebelum Habis
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Katup fisik butuh 2.5s berputar menutup. Sistem menutup lebih awal agar gas tidak terbuang sia-sia.
          </p>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Gas Terselamatkan</span>
          </div>
          <div className="text-sm font-bold text-amber-400">
            {(vTrigger * 1000).toFixed(1)} Liter ({formatRupiah(protectedIdr)})
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Estimasi volume gas yang terselamatkan secara aman saat penutupan katup.
          </p>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Info className="w-3.5 h-3.5 text-purple-400" />
            <span>Penyesuaian Saldo</span>
          </div>
          <div className={`text-sm font-bold ${overdraftM3 > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {overdraftM3 > 0 ? `-${formatVolume(overdraftM3)}` : '0 m³ (Sempurna)'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Jika ada sisa gas mikro saat katup menutup, otomatis disesuaikan secara adil saat top-up berikutnya.
          </p>
        </div>
      </div>
    </div>
  );
};
