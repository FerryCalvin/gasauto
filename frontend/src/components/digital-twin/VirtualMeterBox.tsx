import React, { useState, useEffect } from 'react';
import { useGas } from '../../context/GasContext';
import { audioBuzzer } from '../../utils/audioBuzzer';
import { Radio, ShieldAlert } from 'lucide-react';

export const VirtualMeterBox: React.FC = () => {
  const { meter, redeemToken, lastPurchasedToken } = useGas();
  const [typedToken, setTypedToken] = useState<string>('');
  const [lcdMessage, setLcdMessage] = useState<{ line1: string; line2: string } | null>(null);
  const [isPulseActive, setIsPulseActive] = useState<boolean>(false);

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

    if (char === '*') {
      setTypedToken(prev => prev.slice(0, -1));
      return;
    }

    if (char === '#') {
      if (typedToken.length === 0) return;
      handleSubmitToken();
      return;
    }

    if (typedToken.length < 20 && /^[0-9]$/.test(char)) {
      setTypedToken(prev => prev + char);
    }
  };

  const handleSubmitToken = async () => {
    if (typedToken.length !== 20) {
      setLcdMessage({
        line1: 'ERROR TOKEN:',
        line2: 'BUTUH 20 DIGIT'
      });
      setTimeout(() => setLcdMessage(null), 2500);
      return;
    }

    setLcdMessage({
      line1: 'VERIFIKASI...',
      line2: 'DEKRIPSI STS'
    });

    const result = await redeemToken(typedToken);

    if (result.success) {
      setLcdMessage({
        line1: 'TOKEN DITERIMA!',
        line2: 'KATUP DIBUKA'
      });
      setTypedToken('');
    } else {
      setLcdMessage({
        line1: 'TOKEN DITOLAK:',
        line2: result.message.slice(0, 16)
      });
    }

    setTimeout(() => {
      setLcdMessage(null);
    }, 3500);
  };

  const autoFillAndRedeem = () => {
    if (!lastPurchasedToken) return;
    const clean = lastPurchasedToken.tokenCode.replace(/[\s-]/g, '');
    setTypedToken(clean);
  };

  const remainingStr = meter ? meter.remainingQuotaM3.toFixed(4) : '0.0000';
  const flowStr = meter ? meter.currentFlowRateLpm.toFixed(2) : '0.00';
  const valveStr = meter ? meter.valveStatus : 'OFF';

  const formattedInput = typedToken
    .match(/.{1,4}/g)
    ?.join('-') || typedToken;

  return (
    <div className="bg-[#121824] border border-slate-700/80 rounded-2xl p-5 shadow-2xl relative max-w-sm mx-auto">
      {/* Header Plate */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div>
          <span className="text-[11px] font-bold tracking-wider text-slate-200 uppercase block font-mono">
            SMART GAS METER
          </span>
          <span className="text-[10px] font-mono text-slate-500">
            {meter?.id || 'GAS-PLG-001'} &bull; {meter?.serialNumber || 'SN-2026-GAS01'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
          <Radio className="w-3 h-3 text-emerald-400" />
          <span>{meter?.networkType || 'WIFI'}</span>
        </div>
      </div>

      {/* LCD Matrix Display */}
      <div className="bg-[#152317] border-2 border-[#263c2a] rounded-lg p-3 shadow-inner mb-3">
        <div className="font-lcd text-[#4ade80] text-xs font-bold tracking-widest leading-relaxed">
          {lcdMessage ? (
            <>
              <div className="truncate">{lcdMessage.line1}</div>
              <div className="truncate">{lcdMessage.line2}</div>
            </>
          ) : typedToken.length > 0 ? (
            <>
              <div className="text-[10px] text-[#22c55e]">TOKEN STS: {typedToken.length}/20</div>
              <div className="truncate text-xs text-[#86efac]">
                {formattedInput}
                <span className="animate-pulse inline-block w-1.5 h-3 bg-[#4ade80] ml-0.5 align-middle" />
              </div>
            </>
          ) : meter?.isAlertActive ? (
            <>
              <div className="text-amber-400 animate-pulse">! KUOTA TINGGAL 10% !</div>
              <div>SISA: {remainingStr} m3</div>
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <span>SISA:</span>
                <span>{remainingStr} m3</span>
              </div>
              <div className="flex justify-between text-[11px] mt-0.5 text-[#22c55e]">
                <span>V:{valveStr}</span>
                <span>{flowStr} L/m</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status Bar: Pulse LED + Debt Indicator */}
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              isPulseActive
                ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                : 'bg-slate-800 border border-slate-700'
            }`}
          />
          <span className="text-[10px] font-mono text-slate-400">PULSE</span>
        </div>

        {meter && meter.overdraftM3 > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-rose-400 font-mono font-bold bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800">
            <ShieldAlert className="w-3 h-3" />
            <span>HUTANG: -{meter.overdraftM3.toFixed(4)} m³</span>
          </div>
        )}
      </div>

      {/* Tactile Keypad */}
      <div className="bg-slate-950 rounded-xl p-3 border border-slate-800/80">
        <div className="grid grid-cols-4 gap-2">
          {['1', '2', '3', 'A', '4', '5', '6', 'B', '7', '8', '9', 'C', '*', '0', '#', 'D'].map((key) => {
            const isSubmit = key === '#';
            const isClear = key === '*';

            return (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                className={`h-10 rounded-lg font-mono text-xs font-bold transition-all active:scale-95 flex items-center justify-center ${
                  isSubmit
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : isClear
                    ? 'bg-rose-900/60 hover:bg-rose-800 text-rose-200'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/60'
                }`}
              >
                {key}
              </button>
            );
          })}
        </div>
      </div>

      {lastPurchasedToken && (
        <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[10px] font-mono text-amber-400 truncate mr-2">
            Token: {lastPurchasedToken.tokenCode}
          </span>
          <button
            onClick={autoFillAndRedeem}
            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-semibold rounded border border-amber-500/30 whitespace-nowrap"
          >
            Isi Otomatis
          </button>
        </div>
      )}
    </div>
  );
};
