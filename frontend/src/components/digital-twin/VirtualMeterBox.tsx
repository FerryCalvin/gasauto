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
    <div className="bg-[#121316] border border-zinc-800/90 rounded-2xl p-5 shadow-2xl relative max-w-sm mx-auto">
      {/* Subtle Mechanical Screw Impressions (Teenage Engineering Hardware Detail) */}
      <div className="absolute top-2.5 left-2.5 text-zinc-700 font-mono text-[9px] select-none pointer-events-none">
        +
      </div>
      <div className="absolute top-2.5 right-2.5 text-zinc-700 font-mono text-[9px] select-none pointer-events-none">
        +
      </div>
      <div className="absolute bottom-2.5 left-2.5 text-zinc-700 font-mono text-[9px] select-none pointer-events-none">
        +
      </div>
      <div className="absolute bottom-2.5 right-2.5 text-zinc-700 font-mono text-[9px] select-none pointer-events-none">
        +
      </div>

      {/* Header Plate */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold tracking-widest text-zinc-200 uppercase">
              UNIT METER GAS STS-20
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
              REV-2.4
            </span>
          </div>
          <span className="font-mono text-[10px] text-zinc-500 mt-0.5 block">
            SN: {meter?.serialNumber || 'SN-2026-GAS01'} &bull; ID: {meter?.id || 'GAS-PLG-001'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400 bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
          <Radio className="w-3 h-3 text-emerald-400" />
          <span>{meter?.networkType || 'WIFI'}</span>
        </div>
      </div>

      {/* Retro-Modern Monochrome LCD Display (Teenage Engineering Amber Phosphor) */}
      <div className="bg-[#050507] border border-zinc-700/80 rounded-xl p-3.5 shadow-inner mb-3 relative overflow-hidden lcd-scanlines te-lcd-amber">
        <div className="font-mono leading-relaxed">
          {lcdMessage ? (
            <div className="text-center py-1">
              <div className="text-amber-300 font-bold text-xs tracking-wider">{lcdMessage.line1}</div>
              <div className="text-zinc-300 text-[11px] mt-0.5 tracking-wide">{lcdMessage.line2}</div>
            </div>
          ) : typedToken.length > 0 ? (
            <div>
              <div className="flex justify-between items-center text-[10px] text-amber-500/80 tracking-widest uppercase">
                <span>STS Token Entry</span>
                <span className="tabular-nums">({typedToken.length}/20)</span>
              </div>
              <div className="text-sm font-bold text-amber-300 tracking-wider mt-1 truncate">
                {formattedInput}
                <span className="animate-pulse inline-block w-2 h-3.5 bg-amber-400 ml-1 align-middle" />
              </div>
            </div>
          ) : meter?.isAlertActive ? (
            <div className="text-center py-0.5">
              <div className="text-rose-400 font-bold text-xs tracking-widest animate-pulse">
                ! PERINGATAN: KUOTA &lt; 10% !
              </div>
              <div className="text-zinc-300 text-xs mt-1 tabular-nums">
                SISA: {remainingStr} m³ &bull; KATUP: {valveStr}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] text-zinc-500 tracking-widest">SISA GAS:</span>
                <span className="text-base font-bold text-amber-400 tabular-nums tracking-wider">
                  {remainingStr} m³
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/60">
                <span>KATUP: {valveStr === 'OPEN' ? 'TERBUKA' : 'TERTUTUP'}</span>
                <span className="tabular-nums">{flowStr} L/m</span>
                <span className="text-emerald-400">PULSE: OK</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hardware Quick Action Key */}
      <button
        onClick={handleQuickAutoFill}
        disabled={isAutoLoading}
        className="w-full mb-3 py-2 px-3 bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-xs font-mono font-medium rounded-lg flex items-center justify-between transition-all cursor-pointer shadow-xs disabled:opacity-50"
      >
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
          <span className="tracking-wide">
            {isAutoLoading ? 'MEMPROSES TOKEN...' : 'AUTO-FILL TOKEN DEMO'}
          </span>
        </div>
        <span className="text-[10px] text-zinc-500 font-mono">1-KLIK ISI</span>
      </button>

      {/* Status Bar: Pulse LED + Overdraft */}
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full transition-all ${
              isPulseActive
                ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                : 'bg-zinc-800 border border-zinc-700'
            }`}
          />
          <span className="text-[10px] font-mono text-zinc-400">PULSA SENSOR</span>
        </div>

        {meter && meter.overdraftM3 > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-rose-400 font-mono font-bold bg-rose-950/30 px-2 py-0.5 rounded border border-rose-800/60">
            <ShieldAlert className="w-3 h-3" />
            <span className="tabular-nums">REKONSILIASI: -{meter.overdraftM3.toFixed(4)} m³</span>
          </div>
        )}
      </div>

      {/* Tactile Keypad (Low-Profile Mechanical Switch Chic) */}
      <div className="bg-[#0b0c0e] rounded-xl p-3 border border-zinc-800/80">
        <div className="grid grid-cols-4 gap-2">
          {['1', '2', '3', 'A', '4', '5', '6', 'B', '7', '8', '9', 'C', 'DEL', '0', 'OK', 'D'].map(
            (key) => {
              const isSubmit = key === 'OK';
              const isClear = key === 'DEL';
              const isFunctionKey = ['A', 'B', 'C', 'D'].includes(key);

              let keyStyle = 'bg-[#181a1f] hover:bg-[#20232a] active:bg-[#14151a] border border-zinc-800 text-zinc-200 font-mono text-xs font-bold rounded-lg h-10 shadow-[0_2px_0_#090a0d] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center cursor-pointer';

              if (isSubmit) {
                keyStyle = 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-mono text-xs font-bold rounded-lg h-10 border border-amber-400 shadow-[0_2px_0_#b45309] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center cursor-pointer';
              } else if (isClear) {
                keyStyle = 'bg-zinc-900 hover:bg-rose-950/40 active:bg-rose-950/60 border border-zinc-800 hover:border-rose-800/50 text-zinc-400 hover:text-rose-300 font-mono text-xs font-bold rounded-lg h-10 shadow-[0_2px_0_#090a0d] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center cursor-pointer';
              } else if (isFunctionKey) {
                keyStyle = 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 font-mono text-xs font-semibold rounded-lg h-10 border border-zinc-800/60 shadow-[0_2px_0_#090a0d] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center cursor-pointer';
              }

              return (
                <button
                  key={key}
                  onClick={() => handleKeyPress(key)}
                  className={keyStyle}
                >
                  {key}
                </button>
              );
            }
          )}
        </div>
      </div>

      {lastPurchasedToken && (
        <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono">
          <span className="text-amber-400/90 truncate mr-2 tabular-nums">
            Token: {lastPurchasedToken.tokenCode}
          </span>
          <button
            onClick={() => setTypedToken(lastPurchasedToken.tokenCode.replace(/[\s-]/g, ''))}
            className="text-[11px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
          >
            Salin
          </button>
        </div>
      )}
    </div>
  );
};
