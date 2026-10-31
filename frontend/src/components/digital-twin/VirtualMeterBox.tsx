import React, { useState, useEffect } from 'react';
import { useGas } from '../../context/GasContext';
import { audioBuzzer } from '../../utils/audioBuzzer';
import { Radio, ShieldAlert, Zap } from 'lucide-react';

export const VirtualMeterBox: React.FC = () => {
  const { meter, redeemToken, lastPurchasedToken, purchaseToken } = useGas();
  const [typedToken, setTypedToken] = useState<string>('');
  const [lcdMessage, setLcdMessage] = useState<{ line1: string; line2: string } | null>(null);
  const [isPulseActive, setIsPulseActive] = useState<boolean>(false);
  const [isAutoLoading, setIsAutoLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!meter || meter.currentFlowRateLpm <= 0 || meter.valveStatus === 'CLOSED') {
      setIsPulseActive(false);
      return;
    }

    const intervalMs = Math.max(120, Math.min(1000, 1000 / (meter.currentFlowRateLpm * 2)));
    const timer = setInterval(() => {
      setIsPulseActive(true);
      setTimeout(() => setIsPulseActive(false), 50);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [meter?.currentFlowRateLpm, meter?.valveStatus]);

  const handleKeyPress = (char: string) => {
    audioBuzzer.playKeyClick();

    if (char === '*' || char === 'DEL') {
      setTypedToken((prev) => prev.slice(0, -1));
      return;
    }

    if (char === '#' || char === 'OK') {
      if (typedToken.length === 0) return;
      handleSubmitToken(typedToken);
      return;
    }

    if (typedToken.length < 20 && /^[0-9]$/.test(char)) {
      setTypedToken((prev) => prev + char);
    }
  };

  const handleSubmitToken = async (codeToSubmit: string) => {
    const cleanCode = codeToSubmit.replace(/[\s-]/g, '');

    if (cleanCode.length !== 20) {
      setLcdMessage({
        line1: 'ERROR:',
        line2: 'BUTUH 20 ANGKA'
      });
      setTimeout(() => setLcdMessage(null), 2500);
      return;
    }

    setLcdMessage({
      line1: 'MEMPROSES...',
      line2: 'DEKRIPSI TOKEN'
    });

    const result = await redeemToken(cleanCode);

    if (result.success) {
      setLcdMessage({
        line1: 'BERHASIL!',
        line2: 'KATUP GAS TERBUKA'
      });
      setTypedToken('');
    } else {
      setLcdMessage({
        line1: 'GAGAL:',
        line2: result.message.slice(0, 16)
      });
    }

    setTimeout(() => {
      setLcdMessage(null);
    }, 3500);
  };

  // 1-Klik Isi Cepat: Otomatis jika ada token, atau buat token cepat Rp 50.000 jika belum ada
  const handleQuickAutoFill = async () => {
    setIsAutoLoading(true);
    let tokenStr = '';

    if (lastPurchasedToken?.tokenCode) {
      tokenStr = lastPurchasedToken.tokenCode.replace(/[\s-]/g, '');
    } else {
      // Buat token cepat demo secara mulus
      const res = await purchaseToken(50000);
      if (res.success && res.token?.tokenCode) {
        tokenStr = res.token.tokenCode.replace(/[\s-]/g, '');
      }
    }

    if (tokenStr) {
      setTypedToken(tokenStr);
      await handleSubmitToken(tokenStr);
    }
    setIsAutoLoading(false);
  };

  const remainingStr = meter ? meter.remainingQuotaM3.toFixed(4) : '0.0000';
  const flowStr = meter ? meter.currentFlowRateLpm.toFixed(2) : '0.00';
  const valveStr = meter ? meter.valveStatus : 'OFF';

  const formattedInput =
    typedToken.match(/.{1,4}/g)?.join('-') || typedToken;

  return (
    <div className="bg-[#101726] border border-slate-700/80 rounded-2xl p-5 shadow-2xl relative max-w-sm mx-auto">
      {/* Header Plate */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div>
          <span className="text-xs font-bold tracking-wider text-slate-100 uppercase block font-mono">
            METERAN GAS FISIK
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            {meter?.id || 'GAS-PLG-001'} &bull; {meter?.customerName || 'Pelanggan'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-400 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
          <Radio className="w-3 h-3 text-emerald-400" />
          <span>{meter?.networkType || 'WIFI'}</span>
        </div>
      </div>

      {/* LCD Screen Display */}
      <div className="bg-[#051f1a] border-2 border-[#0f766e]/70 rounded-xl p-3.5 shadow-inner mb-3">
        <div className="font-mono text-[#2dd4bf] text-xs font-bold tracking-wider leading-relaxed">
          {lcdMessage ? (
            <div className="text-center py-1">
              <div className="text-amber-300 font-bold">{lcdMessage.line1}</div>
              <div className="text-slate-100 text-[11px] mt-0.5">{lcdMessage.line2}</div>
            </div>
          ) : typedToken.length > 0 ? (
            <div>
              <div className="text-[10px] text-[#5eead4]">INPUT TOKEN ({typedToken.length}/20):</div>
              <div className="truncate text-xs text-[#99f6e4] font-bold">
                {formattedInput}
                <span className="animate-pulse inline-block w-1.5 h-3 bg-[#2dd4bf] ml-0.5 align-middle" />
              </div>
            </div>
          ) : meter?.isAlertActive ? (
            <div className="text-center">
              <div className="text-rose-400 animate-pulse font-bold">! KUOTA TINGGAL 10% !</div>
              <div className="text-slate-200 text-xs">Sisa: {remainingStr} m³</div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center text-slate-300">
                <span>SISA GAS:</span>
                <span className="text-sm font-extrabold text-[#5eead4]">{remainingStr} m³</span>
              </div>
              <div className="flex justify-between text-[11px] mt-1 text-[#2dd4bf]">
                <span>KATUP: {valveStr === 'OPEN' ? 'TERBUKA' : 'TERTUTUP'}</span>
                <span>{flowStr} L/m</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tombol 1-Klik Masukkan Token Otomatis (Friendly Feature) */}
      <div className="mb-3">
        <button
          onClick={handleQuickAutoFill}
          disabled={isAutoLoading}
          className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/40 border border-emerald-400/30 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
        >
          <Zap className="w-4 h-4 text-amber-300 fill-current" />
          <span>{isAutoLoading ? 'Memasukkan Token...' : '⚡ Masukkan Token Otomatis (1-Klik)'}</span>
        </button>
      </div>

      {/* Status Bar: Pulse LED + Overdraft */}
      <div className="flex items-center justify-between px-1 mb-2.5">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              isPulseActive
                ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                : 'bg-slate-800 border border-slate-700'
            }`}
          />
          <span className="text-[10px] font-mono text-slate-400">PULSA SENSOR</span>
        </div>

        {meter && meter.overdraftM3 > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-rose-400 font-mono font-bold bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800">
            <ShieldAlert className="w-3 h-3" />
            <span>PENYESUAIAN: -{meter.overdraftM3.toFixed(4)} m³</span>
          </div>
        )}
      </div>

      {/* Tactile Keypad */}
      <div className="bg-slate-950 rounded-xl p-3 border border-slate-800/80">
        <div className="grid grid-cols-4 gap-2">
          {['1', '2', '3', 'A', '4', '5', '6', 'B', '7', '8', '9', 'C', 'DEL', '0', 'OK', 'D'].map(
            (key) => {
              const isSubmit = key === 'OK';
              const isClear = key === 'DEL';

              return (
                <button
                  key={key}
                  onClick={() => handleKeyPress(key)}
                  className={`h-10 rounded-lg font-mono text-xs font-bold transition-all active:scale-95 flex items-center justify-center ${
                    isSubmit
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                      : isClear
                      ? 'bg-rose-900/60 hover:bg-rose-800 text-rose-200'
                      : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/60'
                  }`}
                >
                  {key}
                </button>
              );
            }
          )}
        </div>
      </div>

      {lastPurchasedToken && (
        <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
          <span className="text-amber-400 font-mono truncate mr-2">
            Token: {lastPurchasedToken.tokenCode}
          </span>
          <button
            onClick={() => setTypedToken(lastPurchasedToken.tokenCode.replace(/[\s-]/g, ''))}
            className="text-xs text-sky-400 hover:text-sky-300 font-semibold underline cursor-pointer"
          >
            Salin
          </button>
        </div>
      )}
    </div>
  );
};
