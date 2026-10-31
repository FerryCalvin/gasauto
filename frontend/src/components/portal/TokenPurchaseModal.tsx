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

  const formattedTokenCode =
    receipt?.tokenCode?.replace(/[^0-9]/g, '').match(/.{1,4}/g)?.join(' - ') ||
    receipt?.tokenCode ||
    '';

  return (
    <div className="max-w-4xl mx-auto space-y-5 bg-[#0f1013] border border-zinc-800/80 rounded-2xl p-6 shadow-xl">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-mono font-bold text-zinc-100 tracking-wide uppercase">
              Pembelian Kuota Token Gas Prabayar
            </h2>
            <p className="text-[11px] font-mono text-zinc-500">
              Tarif: <strong className="text-zinc-300 font-semibold">{formatRupiah(pricePerM3)} / m³</strong> &bull; Standar Kode Token STS 20 Digit
            </p>
          </div>
        </div>

        <div className="text-xs text-zinc-400 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800 font-mono flex items-center gap-1.5">
          <span className="text-zinc-500">ID METER:</span>
          <span className="font-bold text-zinc-200">{meter?.id || 'GAS-PLG-001'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Form Column */}
        <div className="md:col-span-7 space-y-4">
          <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
            PILIH NOMINAL ISI ULANG
          </span>

          <div className="grid grid-cols-3 gap-2.5">
            {QUICK_AMOUNTS.map((val) => {
              const vol = (val / pricePerM3).toFixed(2);
              const isSelected = !customAmount && amount === val;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleSelectQuick(val)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-800/90 border-zinc-600 text-zinc-100 ring-1 ring-zinc-500/30 shadow-xs'
                      : 'bg-zinc-950/80 border-zinc-800/80 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <div className="font-mono font-bold text-sm text-zinc-100 tabular-nums">
                    {formatRupiah(val)}
                  </div>
                  <div className="font-mono text-[11px] text-zinc-500 mt-0.5 tabular-nums">
                    ~{vol} m³ Gas
                  </div>
                </button>
              );
            })}
          </div>

          <div>
            <label className="text-[11px] font-mono text-zinc-400 block mb-1">
              Atau Masukkan Nominal Kustom (Rp):
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-zinc-500">
                Rp
              </span>
              <input
                type="text"
                value={customAmount ? Number(customAmount).toLocaleString('id-ID') : ''}
                onChange={handleCustomChange}
                placeholder="0"
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-600 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-zinc-100 focus:outline-none font-mono tabular-nums"
              />
            </div>
          </div>

          {/* Estimation Row */}
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-zinc-500 block">Perkiraan Tambahan Gas:</span>
              <span className="text-lg font-mono font-bold text-zinc-100 tabular-nums">
                +{formatVolume(estimatedVolumeM3)}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-mono text-zinc-500 block">Total Pembayaran:</span>
              <span className="text-lg font-mono font-bold text-amber-400 tabular-nums">
                {formatRupiah(activeAmount)}
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* High-Contrast Solid Purchase CTA */}
          <button
            onClick={handlePurchase}
            disabled={isSubmitting || activeAmount <= 0}
            className="w-full py-3.5 rounded-xl font-mono font-semibold text-xs uppercase tracking-wider bg-zinc-100 hover:bg-white active:bg-zinc-200 text-zinc-950 shadow-xs active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
          >
            {isSubmitting ? (
              <span>Memproses Pembelian...</span>
            ) : (
              <>
                <span>Beli Kuota Gas &bull; {formatRupiah(activeAmount)}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Struk / Thermal Voucher Column */}
        <div className="md:col-span-5">
          {receipt ? (
            <div className="bg-[#0a0b0d] border border-zinc-800 rounded-xl p-5 space-y-3.5 shadow-sm font-mono text-xs">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  VOUCHER ELEKTRONIK STS-20
                </span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20">
                  LUNAS
                </span>
              </div>

              <div className="space-y-1.5 text-zinc-300">
                <div className="flex justify-between">
                  <span className="text-zinc-500">ID Meter:</span>
                  <span className="text-zinc-200 font-bold">{receipt.meterId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Nilai Transaksi:</span>
                  <span className="text-zinc-100 font-bold tabular-nums">{formatRupiah(receipt.amountIdr)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Kuantitas Gas:</span>
                  <span className="text-emerald-400 font-bold tabular-nums">+{receipt.volumeM3.toFixed(4)} m³</span>
                </div>
                <div className="flex justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-800/60">
                  <span>Waktu:</span>
                  <span>{formatDateTime(receipt.createdAt)}</span>
                </div>
              </div>

              {/* 20 Digit Code Box (Braun Style) */}
              <div className="bg-[#121316] border border-zinc-700/80 rounded-lg p-4 text-center my-3">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
                  KODE TOKEN 20-DIGIT (STS)
                </span>
                <div className="text-base sm:text-lg font-bold text-amber-400 tracking-widest tabular-nums">
                  {formattedTokenCode}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={directRedeemNow}
                  disabled={isRedeemingDirect}
                  className="w-full py-2.5 px-3 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>{isRedeemingDirect ? 'Mengisi Kuota...' : 'Langsung Isi ke Meteran'}</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="py-2 px-3 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 flex items-center justify-center gap-1.5 border border-zinc-800 cursor-pointer transition-all"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Tersalin' : 'Salin Kode'}</span>
                  </button>

                  <button
                    onClick={autoInjectToKeypad}
                    className="py-2 px-3 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 flex items-center justify-center gap-1.5 border border-zinc-800 cursor-pointer transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Buka Keypad</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-8 text-center h-full flex flex-col items-center justify-center text-zinc-500 font-mono text-xs">
              <Receipt className="w-8 h-8 text-zinc-700 mb-2.5" />
              <span className="text-zinc-400 font-semibold mb-1 uppercase tracking-wider">
                Voucher Standar STS-20
              </span>
              <span className="text-[11px] text-zinc-600">
                Pilih nominal di panel kiri untuk mencetak voucher kode token
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
