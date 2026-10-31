import React, { useState } from 'react';
import { useGas } from '../../context/GasContext';
import { formatRupiah, formatVolume, formatDateTime } from '../../utils/formatters';
import { ShoppingBag, Copy, Check, ArrowRight, CheckCircle2, AlertCircle, Receipt, Zap } from 'lucide-react';

const QUICK_AMOUNTS = [25000, 50000, 100000, 150000, 200000, 500000];

export const TokenPurchaseModal: React.FC = () => {
  const { tariff, meter, purchaseToken, redeemToken, setActiveTab, setLastPurchasedToken } = useGas();
  const [amount, setAmount] = useState<number>(50000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isRedeemingDirect, setIsRedeemingDirect] = useState<boolean>(false);
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
      const receiptData = {
        ...result.token,
        pricePerM3,
        meterCustomer: meter?.customerName,
        meterAddress: meter?.customerAddress
      };
      setReceipt(receiptData);
      setLastPurchasedToken(receiptData);
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

  const directRedeemNow = async () => {
    if (!receipt?.tokenCode) return;
    setIsRedeemingDirect(true);
    const clean = receipt.tokenCode.replace(/[\s-]/g, '');
    await redeemToken(clean);
    setIsRedeemingDirect(false);
    setActiveTab('twin');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            Beli Kuota Token Gas Prabayar
          </h2>
          <p className="text-xs text-slate-400">
            Tarif: <strong className="text-amber-400">{formatRupiah(pricePerM3)} / m³</strong> &bull; Standar Kode Token STS 20 Digit
          </p>
        </div>

        <div className="text-xs text-slate-300 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-1.5">
          <span className="text-slate-500">ID Meter:</span>
          <span className="font-bold text-amber-400 font-mono">{meter?.id || 'GAS-PLG-001'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Form Column */}
        <div className="md:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            PILIH NOMINAL ISI ULANG
          </span>

          <div className="grid grid-cols-3 gap-2.5">
            {QUICK_AMOUNTS.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleSelectQuick(val)}
                className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  !customAmount && amount === val
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-extrabold'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                {formatRupiah(val)}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Atau Masukkan Nominal Kustom (Rp):
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 font-mono">
                Rp
              </span>
              <input
                type="text"
                value={customAmount ? Number(customAmount).toLocaleString('id-ID') : ''}
                onChange={handleCustomChange}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          {/* Estimation Row */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 block">Perkiraan Tambahan Gas:</span>
              <span className="text-lg font-extrabold text-sky-400 font-mono">
                +{formatVolume(estimatedVolumeM3)}
              </span>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-500 block">Total Pembayaran:</span>
              <span className="text-lg font-extrabold text-amber-400 font-mono">
                {formatRupiah(activeAmount)}
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            onClick={handlePurchase}
            disabled={isSubmitting || activeAmount <= 0}
            className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <span>Memproses Pembelian...</span>
            ) : (
              <>
                <span>Beli Kuota &bull; {formatRupiah(activeAmount)}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Struk Column */}
        <div className="md:col-span-5">
          {receipt ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3.5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-xs font-bold text-slate-200 uppercase font-mono">
                  BUKTI PEMBELIAN TOKEN
                </span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  Lunas
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">ID Meter:</span>
                  <span className="text-slate-200 font-mono font-bold">{receipt.meterId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Biaya:</span>
                  <span className="text-slate-100 font-bold">{formatRupiah(receipt.amountIdr)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Kuantitas Gas:</span>
                  <span className="text-sky-400 font-mono font-bold">+{receipt.volumeM3.toFixed(4)} m³</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">
                  <span>Waktu:</span>
                  <span>{formatDateTime(receipt.createdAt)}</span>
                </div>
              </div>

              {/* 20 Digit Code Box */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-center my-2">
                <span className="text-[10px] text-slate-400 uppercase block mb-1">
                  KODE TOKEN STS 20 ANGKA
                </span>
                <div className="font-mono text-base sm:text-lg font-extrabold text-amber-400 tracking-wider">
                  {receipt.tokenCode}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={directRedeemNow}
                  disabled={isRedeemingDirect}
                  className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Zap className="w-4 h-4 text-amber-300 fill-current" />
                  <span>{isRedeemingDirect ? 'Mengisi Kuota...' : '⚡ Langsung Isi ke Meteran Sekarang'}</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="py-2 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Tersalin' : 'Salin Kode'}</span>
                  </button>

                  <button
                    onClick={autoInjectToKeypad}
                    className="py-2 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Buka Keypad</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center h-full flex flex-col items-center justify-center text-slate-500 text-xs">
              <Receipt className="w-10 h-10 text-slate-700 mb-3" />
              <span className="text-slate-400 font-semibold mb-1">Struk Pembelian</span>
              <span>Pilih nominal di sebelah kiri untuk membuat kode token prabayar</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
