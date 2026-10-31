import React, { useState } from 'react';
import { useGas } from '../../context/GasContext';
import type { NetworkType } from '../../types/gas';
import { Terminal, Radio, Wrench, Copy, Check, Send } from 'lucide-react';

export const MqttInspectorTerminal: React.FC = () => {
  const { meter, telemetry, loraHex, setNetwork } = useGas();
  const [activeSubTab, setActiveSubTab] = useState<'packets' | 'blueprint' | 'loraTest'>('packets');
  const [loraInput, setLoraInput] = useState<string>(loraHex || '');
  const [loraDecodeResult, setLoraDecodeResult] = useState<any | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const networkType = meter?.networkType || 'WIFI';

  const networks: { type: NetworkType; label: string; desc: string }[] = [
    { type: 'WIFI', label: 'WiFi Rumah', desc: 'MQTT TLS / JSON' },
    { type: 'CELLULAR_4G', label: '4G LTE / GSM', desc: 'SIM7600 MQTT' },
    { type: 'NBIOT', label: 'NB-IoT', desc: 'CoAP / MQTT-SN' },
    { type: 'LORAWAN', label: 'LoRaWAN', desc: '10-Byte Hex Uplink' }
  ];

  const handleCopyJson = () => {
    if (!telemetry) return;
    navigator.clipboard.writeText(JSON.stringify(telemetry, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestLoraDecode = async () => {
    try {
      const res = await fetch('/api/lora/uplink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hex: loraInput || loraHex, meterId: meter?.id || 'GAS-PLG-001' })
      });
      const data = await res.json();
      setLoraDecodeResult(data);
    } catch (e: any) {
      setLoraDecodeResult({ error: e.message });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Network Switcher */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            JARINGAN IOT AKTIF
          </span>
          <span className="text-[10px] font-mono text-slate-500">
            Pilih adapter komunikasi hardware
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {networks.map((net) => {
            const isSelected = networkType === net.type;
            return (
              <button
                key={net.type}
                onClick={() => setNetwork(net.type)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/50 shadow-sm'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold text-slate-200">{net.label}</div>
                <div className="text-[10px] text-slate-500 font-mono truncate">{net.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('packets')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
            activeSubTab === 'packets'
              ? 'bg-slate-800 text-amber-400 border border-slate-700'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>MQTT JSON Telemetry</span>
        </button>

        <button
          onClick={() => setActiveSubTab('loraTest')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
            activeSubTab === 'loraTest'
              ? 'bg-slate-800 text-amber-400 border border-slate-700'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>LoRaWAN Hex</span>
        </button>

        <button
          onClick={() => setActiveSubTab('blueprint')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
            activeSubTab === 'blueprint'
              ? 'bg-slate-800 text-amber-400 border border-slate-700'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Pinout ESP32</span>
        </button>
      </div>

      {/* TAB 1: MQTT JSON */}
      {activeSubTab === 'packets' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">
              gas/meter/{meter?.id || 'GAS-PLG-001'}/telemetry
            </span>

            <button
              onClick={handleCopyJson}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1 border border-slate-700"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Tersalin' : 'Salin'}</span>
            </button>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-emerald-400 leading-relaxed overflow-x-auto">
            <pre>{JSON.stringify(telemetry, null, 2)}</pre>
          </div>
        </div>
      )}

      {/* TAB 2: LORAWAN TEST */}
      {activeSubTab === 'loraTest' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
          <span className="text-xs font-mono font-bold text-slate-300 uppercase block">
            UPLINK LORAWAN (10 BYTE / 20 KARAKTER HEX)
          </span>

          <div className="flex gap-2">
            <input
              type="text"
              value={loraInput || loraHex}
              onChange={(e) => setLoraInput(e.target.value.toUpperCase())}
              placeholder="47010E0300965F5F3A"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-xs font-bold text-amber-400 tracking-wider focus:outline-none focus:border-amber-500 uppercase"
            />
            <button
              onClick={handleTestLoraDecode}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs rounded-xl flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Decode</span>
            </button>
          </div>

          {loraDecodeResult && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-sky-300">
              <pre>{JSON.stringify(loraDecodeResult, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ESP32 PINOUT */}
      {activeSubTab === 'blueprint' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <span className="text-xs font-mono font-bold text-slate-300 uppercase block">
            SKEMA PINOUT ESP32 FISIK
          </span>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono text-slate-300 border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-500 uppercase text-[10px]">
                  <th className="py-2 px-3">Komponen</th>
                  <th className="py-2 px-3">Model</th>
                  <th className="py-2 px-3">Pin ESP32</th>
                  <th className="py-2 px-3">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                <tr>
                  <td className="py-2 px-3 font-semibold text-slate-200">Sensor Pulsa Aliran</td>
                  <td className="py-2 px-3 text-amber-400">Reed Switch / YF-B1</td>
                  <td className="py-2 px-3 text-emerald-400 font-bold">GPIO 4 (Interrupt)</td>
                  <td className="py-2 px-3 text-slate-400">100 pulsa per m³</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold text-slate-200">Motor Katup Buka</td>
                  <td className="py-2 px-3 text-amber-400">CWX-15Q / DRV8833</td>
                  <td className="py-2 px-3 text-emerald-400 font-bold">GPIO 19</td>
                  <td className="py-2 px-3 text-slate-400">Putar ke 90° (buka)</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold text-slate-200">Motor Katup Tutup</td>
                  <td className="py-2 px-3 text-amber-400">CWX-15Q / DRV8833</td>
                  <td className="py-2 px-3 text-emerald-400 font-bold">GPIO 18</td>
                  <td className="py-2 px-3 text-slate-400">Putar ke 0° (tutup rapat)</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold text-slate-200">LCD 1602 (I2C)</td>
                  <td className="py-2 px-3 text-amber-400">PCF8574 Backlit</td>
                  <td className="py-2 px-3 text-emerald-400 font-bold">SDA 21, SCL 22</td>
                  <td className="py-2 px-3 text-slate-400">Tampilan saldo & status</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold text-slate-200">Keypad Matriks 4x4</td>
                  <td className="py-2 px-3 text-amber-400">Tactile Membrane</td>
                  <td className="py-2 px-3 text-emerald-400 font-bold">13,12,14,27 | 26,25,33,32</td>
                  <td className="py-2 px-3 text-slate-400">Input 20 digit token</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold text-slate-200">Piezo Buzzer</td>
                  <td className="py-2 px-3 text-amber-400">Active Buzzer 5V</td>
                  <td className="py-2 px-3 text-emerald-400 font-bold">GPIO 5</td>
                  <td className="py-2 px-3 text-slate-400">Alarm kuota 10%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
