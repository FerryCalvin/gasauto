import React from 'react';
import { useGas } from '../../context/GasContext';
import { Gauge, ShieldCheck, AlertTriangle, Power } from 'lucide-react';

export const GasPipelineCanvas: React.FC = () => {
  const { meter, vTrigger, setValveManual } = useGas();

  const valveStatus = meter?.valveStatus || 'CLOSED';
  const valveAngle = meter?.valveAngleDeg ?? 0;
  const flowRate = meter?.currentFlowRateLpm || 0;
  const isFlowing = flowRate > 0 && valveStatus !== 'CLOSED';

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Gauge className="w-5 h-5 text-amber-400" />
            Alur Fisik Pipa Gas & Katup Motorik
          </h3>
          <p className="text-xs text-slate-400">
            Simulasi aliran fluida gas bertekanan rendah (28 mbar) & aktuator katup bola
          </p>
        </div>

        {/* Status Katup Badge & Manual Toggle */}
        <div className="flex items-center gap-2">
          <div
            className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border ${
              valveStatus === 'OPEN'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : valveStatus === 'CLOSING'
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse'
                : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
            }`}
          >
            {valveStatus === 'OPEN' && <ShieldCheck className="w-4 h-4" />}
            {valveStatus === 'CLOSING' && <AlertTriangle className="w-4 h-4" />}
            {valveStatus === 'CLOSED' && <Power className="w-4 h-4" />}
            <span>Katup: {valveStatus} ({Math.round(valveAngle)}°)</span>
          </div>

          <button
            onClick={() => setValveManual(valveStatus === 'OPEN' ? 'CLOSE' : 'OPEN')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
              valveStatus === 'OPEN'
                ? 'bg-rose-950/40 text-rose-300 border-rose-800 hover:bg-rose-900/60'
                : 'bg-emerald-950/40 text-emerald-300 border-emerald-800 hover:bg-emerald-900/60'
            }`}
          >
            {valveStatus === 'OPEN' ? 'Tutup Paksa' : 'Buka Katup'}
          </button>
        </div>
      </div>

      {/* SVG Pipeline Diagram */}
      <div className="w-full bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 sm:p-6 flex flex-col items-center justify-center relative">
        <svg viewBox="0 0 800 240" className="w-full h-auto max-w-3xl drop-shadow-md">
          <defs>
            {/* Linear gradient for gas pipes */}
            <linearGradient id="pipeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Glowing gas stream */}
            <linearGradient id="gasGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.4" />
            </linearGradient>

            {/* Valve stem gradient */}
            <linearGradient id="valveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>

          {/* BACKGROUND PIPELINES */}
          {/* Main pipe left (From Gas Source) */}
          <rect x="40" y="105" width="220" height="30" rx="4" fill="url(#pipeGrad)" stroke="#1e293b" strokeWidth="2" />
          
          {/* Valve Body Box */}
          <rect x="250" y="90" width="80" height="60" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="3" />

          {/* Pipe between Valve & Sensor */}
          <rect x="320" y="105" width="160" height="30" rx="4" fill="url(#pipeGrad)" stroke="#1e293b" strokeWidth="2" />

          {/* Sensor Body Box */}
          <rect x="470" y="85" width="90" height="70" rx="10" fill="#0f172a" stroke="#0ea5e9" strokeWidth="2" />

          {/* Pipe right (To Kitchen / House appliances) */}
          <rect x="550" y="105" width="210" height="30" rx="4" fill="url(#pipeGrad)" stroke="#1e293b" strokeWidth="2" />

          {/* GAS FLOW PARTICLES (ANIMATED PATH) */}
          {isFlowing && (
            <>
              {/* Upstream flow */}
              <line
                x1="40"
                y1="120"
                x2="255"
                y2="120"
                stroke="url(#gasGrad)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray="12 8"
                className={flowRate > 2.0 ? 'animate-gas-flow-fast' : 'animate-gas-flow'}
              />

              {/* Downstream flow through sensor */}
              <line
                x1="325"
                y1="120"
                x2="755"
                y2="120"
                stroke="url(#gasGrad)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray="12 8"
                className={flowRate > 2.0 ? 'animate-gas-flow-fast' : 'animate-gas-flow'}
              />
            </>
          )}

          {/* GAS SOURCE TANK (LEFT) */}
          <g transform="translate(10, 70)">
            <rect x="0" y="0" width="45" height="100" rx="12" fill="#0284c7" stroke="#0369a1" strokeWidth="2" />
            <rect x="12" y="-12" width="20" height="14" rx="3" fill="#e2e8f0" />
            <text x="22" y="55" fill="#f8fafc" fontSize="10" fontWeight="bold" textAnchor="middle" transform="rotate(-90 22 55)">
              GAS PGN
            </text>
          </g>

          {/* MOTORIZED VALVE (CWX-15Q MOTOR & BALL) */}
          <g transform="translate(290, 120)">
            {/* Actuator motor housing on top */}
            <rect x="-24" y="-72" width="48" height="42" rx="6" fill="#0f172a" stroke="#d97706" strokeWidth="2" />
            <circle cx="0" cy="-51" r="10" fill={valveStatus === 'OPEN' ? '#10b981' : valveStatus === 'CLOSING' ? '#f59e0b' : '#ef4444'} />
            <text x="0" y="-48" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
              M
            </text>

            {/* Rotating ball valve lever/stem */}
            <circle cx="0" cy="0" r="22" fill="#020617" stroke="#64748b" strokeWidth="2" />
            
            {/* Rotating orifice path */}
            <g transform={`rotate(${90 - valveAngle})`}>
              <line x1="-18" y1="0" x2="18" y2="0" stroke="url(#valveGrad)" strokeWidth="8" strokeLinecap="round" />
              <circle cx="0" cy="0" r="5" fill="#ffffff" />
            </g>

            <text x="0" y="38" fill="#cbd5e1" fontSize="10" fontWeight="600" textAnchor="middle">
              Motorized Valve
            </text>
            <text x="0" y="52" fill={valveStatus === 'OPEN' ? '#34d399' : '#f87171'} fontSize="9" fontWeight="bold" textAnchor="middle">
              {Math.round(valveAngle)}° {valveStatus}
            </text>
          </g>

          {/* FLOW SENSOR (TURBINE / REED PULSE METER) */}
          <g transform="translate(515, 120)">
            <circle cx="0" cy="0" r="26" fill="#020617" stroke="#38bdf8" strokeWidth="2" />
            
            {/* Spinning impeller rotor */}
            <g className={isFlowing ? 'origin-center animate-spin' : ''} style={{ transformOrigin: '515px 120px' }}>
              <line x1="500" y1="120" x2="530" y2="120" stroke="#38bdf8" strokeWidth="3" />
              <line x1="515" y1="105" x2="515" y2="135" stroke="#38bdf8" strokeWidth="3" />
            </g>
            <circle cx="0" cy="0" r="6" fill="#0284c7" />

            <text x="0" y="42" fill="#cbd5e1" fontSize="10" fontWeight="600" textAnchor="middle">
              Flow Sensor
            </text>
            <text x="0" y="56" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle">
              {flowRate.toFixed(2)} L/min
            </text>
          </g>

          {/* HOUSE APPLIANCES OUTLET (RIGHT) */}
          <g transform="translate(750, 75)">
            <rect x="0" y="15" width="40" height="70" rx="8" fill="#1e293b" stroke="#475569" strokeWidth="2" />
            <text x="20" y="55" fill="#f8fafc" fontSize="10" fontWeight="bold" textAnchor="middle" transform="rotate(90 20 55)">
              RUMAH
            </text>
          </g>
        </svg>

        {/* Live Parameters Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full mt-4 pt-4 border-t border-slate-800">
          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block uppercase">Laju Alir Terukur</span>
            <span className="text-base font-bold text-sky-400 font-mono">
              {flowRate.toFixed(2)} <span className="text-xs font-normal text-slate-400">L/min</span>
            </span>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block uppercase">Sudut Bukaan Katup</span>
            <span className="text-base font-bold text-amber-400 font-mono">
              {Math.round(valveAngle)}° <span className="text-xs font-normal text-slate-400">/ 90°</span>
            </span>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block uppercase">Trigger Cutoff Antisipasi</span>
            <span className="text-base font-bold text-rose-400 font-mono">
              {vTrigger > 0 ? (vTrigger * 1000).toFixed(2) : '0.00'}{' '}
              <span className="text-xs font-normal text-slate-400">Liter</span>
            </span>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block uppercase">Tekanan Statis Pipa</span>
            <span className="text-base font-bold text-emerald-400 font-mono">
              {valveStatus === 'OPEN' ? '28.0' : valveStatus === 'CLOSING' ? '14.2' : '0.0'}{' '}
              <span className="text-xs font-normal text-slate-400">mbar</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
