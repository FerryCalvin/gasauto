import React, { useState } from 'react';
import { useGas } from '../../context/GasContext';
import { formatRupiah, formatVolume, formatDateTime } from '../../utils/formatters';
import { ShoppingBag, Copy, Check, ArrowRight, CheckCircle2, AlertCircle, Receipt } from 'lucide-react';

const QUICK_AMOUNTS = [25000, 50000, 100000, 150000, 200000, 500000];

export const TokenPurchaseModal: React.FC = () => {
  const { tariff, meter, purchaseToken, setActiveTab, setLastPurchasedToken } = useGas();
  const [amount, setAmount] = useState<number>(50000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [receipt, setReceipt] = useState<any | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pricePerM3 = tariff?.pricePerM3 || 11500;
  const activeAmount = customAmount ? parseInt(customAmount, 10) || 0 : amount;
  const estimatedVolumeM3 = activeAmount > 0 ? activeAmount / pricePerM3 : 0;

  const handleSelectQuick = (val: number) => {
    setAmount(val);
    setCustomAmount('');
    setErrorMsg(null);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setCustomAmount(raw);
    setErrorMsg(null);
  };

  const handlePurchase = async () => {
    if (activeAmount < 10000) {
      setErrorMsg('Minimal pembelian Rp 10.000');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const result = await purchaseToken(activeAmount);
    setIsSubmitting(false);

    if (result.success && result.token) {
      setReceipt({
        ...result.token,
        pricePerM3,
        meterCustomer: meter?.customerName,
        meterAddress: meter?.customerAddress
      });
    } else {
      setErrorMsg(result.error || 'Gagal memproses pembelian');
    }
  };

  const copyToClipboard = () => {
    if (!receipt?.tokenCode) return;
    navigator.clipboard.writeText(receipt.tokenCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const autoInjectToKeypad = () => {
    if (receipt) {
      setLastPurchasedToken(receipt);
      setActiveTab('twin');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            Pembelian Token Gas Prabayar
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            Tarif: {formatRupiah(pricePerM3)} / m³ &bull; Standar STS 20 Digit
          </span>
        </div>

        <div className="font-mono text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
          Meter: <span className="font-bold text-amber-400">{meter?.id || 'GAS-PLG-001'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Form Column */}
        <div className="md:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">
            PILIH NOMINAL
          </span>

          <div className="grid grid-cols-3 gap-2">
            {QUICK_AMOUNTS.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleSelectQuick(val)}
                className={`py-2.5 px-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                  !customAmount && amount === val
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                {formatRupiah(val)}
              </button>
            ))}
          </div>

          <div>
            <label className="text-[11px] font-mono text-slate-500 block mb-1">
              NOMINAL KUSTOM (RP):
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-500">
                Rp
              </span>
              <input
                type="text"
                value={customAmount ? Number(customAmount).toLocaleString('id-ID') : ''}
                onChange={handleCustomChange}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm font-mono font-bold text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Estimation Row */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between font-mono">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Volume Gas</span>
              <span className="text-base font-bold text-sky-400">
                {formatVolume(estimatedVolumeM3)}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-500 block uppercase">Total Tagihan</span>
              <span className="text-base font-bold text-amber-400">
                {formatRupiah(activeAmount)}
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            onClick={handlePurchase}
            disabled={isSubmitting || activeAmount <= 0}
            className="w-full py-3 rounded-xl font-bold text-xs font-mono uppercase bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Memproses...</span>
            ) : (
              <>
                <span>Beli Token &bull; {formatRupiah(activeAmount)}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

        {/* Struk Column */}
        <div className="md:col-span-5">
          {receipt ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-200 uppercase font-mono">
                  STRUK PEMBELIAN
                </span>
                <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  LUNAS
                </span>
              </div>

              <div className="space-y-1 text-xs font-mono text-slate-400">
                <div className="flex justify-between">
                  <span>Meter:</span>
                  <span className="text-slate-200 font-bold">{receipt.meterId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Nominal:</span>
                  <span className="text-slate-200">{formatRupiah(receipt.amountIdr)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Volume:</span>
                  <span className="text-sky-400 font-bold">+{receipt.volumeM3.toFixed(4)} m³</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 pt-1">
                  <span>Waktu:</span>
                  <span>{formatDateTime(receipt.createdAt)}</span>
                </div>
              </div>

              {/* 20 Digit Code Box */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center my-2">
                <span className="text-[9px] font-mono text-slate-500 uppercase block mb-1">
                  KODE TOKEN STS (20 DIGIT)
                </span>
                <div className="font-mono text-base font-extrabold text-amber-400 tracking-wider">
                  {receipt.tokenCode}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={copyToClipboard}
                  className="py-2 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center gap-1.5 border border-slate-700"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tersalin' : 'Salin'}</span>
                </button>

                <button
                  onClick={autoInjectToKeypad}
                  className="py-2 px-3 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ketik ke Meter</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 text-center h-full flex flex-col items-center justify-center text-slate-600 font-mono text-xs">
              <Receipt className="w-8 h-8 text-slate-700 mb-2" />
              <span>Struk voucher token akan tampil di sini setelah pembelian</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
