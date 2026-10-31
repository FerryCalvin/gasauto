import React, { useState } from 'react';
import { useGas } from '../../context/GasContext';
import { formatRupiah, formatDateTime } from '../../utils/formatters';
import { Settings, Save, History, RefreshCw, CheckCircle } from 'lucide-react';

export const TariffSettingsView: React.FC = () => {
  const { tariff, updateTariff, transactions, fetchTransactions } = useGas();

  const [pricePerM3, setPricePerM3] = useState<number>(tariff?.pricePerM3 || 11500);
  const [warningThresholdPct, setWarningThresholdPct] = useState<number>(tariff?.warningThresholdPct || 10);
  const [valveCloseSec, setValveCloseSec] = useState<number>(tariff?.valveCloseDurationSec || 2.5);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg(null);

    const success = await updateTariff({
      pricePerM3,
      warningThresholdPct,
      valveCloseDurationSec: valveCloseSec
    });

    setIsSaving(false);
    if (success) {
      setStatusMsg('Pengaturan tersimpan!');
      setTimeout(() => setStatusMsg(null), 2500);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Settings className="w-4 h-4 text-amber-400" />
            Pengaturan Tarif & Parameter Operasional
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            Konfigurasi server realtime & buku besar rekonsiliasi
          </span>
        </div>

        <button
          onClick={fetchTransactions}
          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono flex items-center gap-1.5 border border-slate-800"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Settings Form */}
        <div className="md:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">
            PARAMETER SISTEM
          </span>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">
                TARIF GAS DASAR (RP/M³):
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                  Rp
                </span>
                <input
                  type="number"
                  min="1000"
                  max="100000"
                  step="100"
                  value={pricePerM3}
                  onChange={(e) => setPricePerM3(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">
                AMBANG PERINGATAN (% KUOTA):
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="5"
                  max="25"
                  step="1"
                  value={warningThresholdPct}
                  onChange={(e) => setWarningThresholdPct(Number(e.target.value))}
                  className="flex-1 accent-amber-500"
                />
                <span className="w-12 text-center py-1 rounded bg-slate-950 border border-slate-800 font-mono text-xs font-bold text-slate-200">
                  {warningThresholdPct}%
                </span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">
                DURASI PENUTUPAN KATUP (DETIK):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.5"
                  max="10.0"
                  step="0.1"
                  value={valveCloseSec}
                  onChange={(e) => setValveCloseSec(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-200 focus:outline-none focus:border-amber-500"
                  required
                />
                <span className="text-xs font-mono text-slate-500">Detik</span>
              </div>
            </div>

            {statusMsg && (
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{statusMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 rounded-xl font-bold text-xs font-mono uppercase bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Parameter'}</span>
            </button>
          </form>
        </div>

        {/* Audit Log */}
        <div className="md:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-200 uppercase font-mono flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-emerald-400" />
              Buku Besar Rekonsiliasi & Transaksi
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {transactions.length} Data
            </span>
          </div>

          <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1 font-mono">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 text-xs space-y-1"
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded ${
                      tx.type === 'PURCHASE'
                        ? 'bg-amber-500/10 text-amber-400'
                        : tx.type === 'REDEEM'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-rose-500/10 text-rose-400'
                    }`}
                  >
                    {tx.type}
                  </span>
                  <span className="text-slate-500">{formatDateTime(tx.timestamp)}</span>
                </div>

                <div className="text-slate-300 text-[11px] truncate">{tx.description}</div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                  <span>{tx.id}</span>
                  {tx.amountIdr && (
                    <span className="text-amber-400 font-bold">{formatRupiah(tx.amountIdr)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
