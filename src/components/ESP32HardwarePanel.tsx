import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Wifi,
  Zap,
  Code2,
  Copy,
  Check,
  Radio,
  Server,
  Activity,
  Layers,
  HelpCircle,
  Play,
  Terminal,
  Key,
  ShieldCheck
} from 'lucide-react';
import { OccupancyData, GymProfile } from '../types';
import { fetchESP32ArduinoCode } from '../services/api';

interface ESP32HardwarePanelProps {
  occupancy: OccupancyData;
  onSimulateEntry: () => void;
  onSimulateExit: () => void;
  currentGym?: GymProfile;
}

export const ESP32HardwarePanel: React.FC<ESP32HardwarePanelProps> = ({
  occupancy,
  onSimulateEntry,
  onSimulateExit,
  currentGym
}) => {
  const [copied, setCopied] = useState(false);
  const [wifiSSID, setWifiSSID] = useState('ACADEMIA_WIFI_2G');
  const [wifiPass, setWifiPass] = useState('fitflow2026');
  const [serverUrl, setServerUrl] = useState(
    typeof window !== 'undefined' ? window.location.origin : 'http://192.168.1.100:3000'
  );
  const [arduinoCode, setArduinoCode] = useState<string>('');
  const [isRelayActive, setIsRelayActive] = useState<boolean>(false);
  const [lastEventMsg, setLastEventMsg] = useState<string>('ESP32 aguardando pulso nos botões GPIO 18/19');

  // Load code on mount or when config changes
  useEffect(() => {
    fetchESP32ArduinoCode(currentGym?.slug, serverUrl, wifiSSID, wifiPass).then(code => {
      setArduinoCode(code);
    });
  }, [currentGym?.slug, serverUrl, wifiSSID, wifiPass]);

  // Flash relay effect when pending trigger or access occurs
  useEffect(() => {
    if (occupancy.lastAccessTime) {
      setIsRelayActive(true);
      const timer = setTimeout(() => setIsRelayActive(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [occupancy.lastAccessTime]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(arduinoCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePressEntry = () => {
    if (occupancy.isSystemBlocked) {
      setLastEventMsg(`⚠️ ERRO 403: Catracas travadas pelo Administrador Geral do SaaS (${occupancy.blockReason || 'Suspensão'})`);
      return;
    }
    setLastEventMsg(`GPIO 18 -> Pulso de Entrada na unidade ${currentGym?.name || 'Academia'}! Enviando POST...`);
    onSimulateEntry();
  };

  const handlePressExit = () => {
    if (occupancy.isSystemBlocked) {
      setLastEventMsg(`⚠️ ERRO 403: Catracas travadas pelo Administrador Geral do SaaS (${occupancy.blockReason || 'Suspensão'})`);
      return;
    }
    setLastEventMsg(`GPIO 19 -> Pulso de Saída na unidade ${currentGym?.name || 'Academia'}! Enviando POST...`);
    onSimulateExit();
  };

  return (
    <div id="esp32-hardware-panel" className="space-y-6">
      
      {/* Visual Hardware Simulation Rig */}
      <div className="rounded-3xl border border-gray-800 bg-gray-900/30 p-6 sm:p-8 backdrop-blur-sm shadow-xl">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-5 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 border border-gray-800 text-cyan-400">
              <Cpu className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Integração de Hardware IoT
              </h3>
              <h2 className="text-lg font-black font-['Outfit'] text-white">
                Simulador da Placa ESP32 & Catracas
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-2 rounded-full bg-gray-950 px-3.5 py-1.5 border border-gray-800 text-gray-300 font-mono text-xs">
              <span className={`h-2 w-2 rounded-full ${occupancy.esp32Connected ? 'bg-cyan-400 animate-ping' : 'bg-amber-400'}`}></span>
              IP: {occupancy.esp32Ip || '192.168.1.145'}
            </span>
          </div>
        </div>

        {/* ESP32 Interactive Board Mockup */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Virtual Hardware Board (PCB Design) */}
          <div className="lg:col-span-7 rounded-3xl bg-gradient-to-br from-black via-gray-950 to-gray-900 p-6 sm:p-8 border-2 border-cyan-400/30 shadow-2xl relative overflow-hidden">
            
            {/* PCB Trace pattern decor */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#22d3ee_1px,transparent_1px)] [background-size:16px_16px]"></div>
            
            {/* Top Board Status */}
            <div className="relative z-10 flex items-center justify-between border-b border-gray-800 pb-3 mb-5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
                <span className="text-[11px] font-mono font-bold text-gray-300 tracking-wider">
                  ESP32-WROOM-32D • D1 MINI / DEV MODULE
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-cyan-400 bg-cyan-400/10 px-2.5 py-0.5 rounded-full border border-cyan-400/30">
                <span>Wi-Fi 802.11 b/g/n</span>
              </div>
            </div>

            {/* Simulated 16x2 LCD Display Screen */}
            <div className={`relative z-10 rounded-2xl bg-black border-2 p-4 sm:p-5 mb-6 shadow-inner font-mono ${
              occupancy.isSystemBlocked ? 'border-rose-500/60 text-rose-400' : 'border-cyan-400/40 text-cyan-400'
            }`}>
              <div className="text-[11px] uppercase tracking-widest opacity-75 mb-1 flex justify-between">
                <span>[ {currentGym?.name || 'GYMFLOW FIT'} ]</span>
                <span>{occupancy.isSystemBlocked ? '⛔ SUSPENSO (SAAS)' : (occupancy.isOpen ? 'ABERTO' : 'FECHADO')}</span>
              </div>
              <div className="text-base sm:text-lg font-bold tracking-wider flex justify-between items-center">
                <span>{occupancy.isSystemBlocked ? 'CATRACAS BLOQUEADAS' : `LOTACAO: ${occupancy.currentCount}/${occupancy.maxCapacity}`}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${
                  occupancy.isSystemBlocked 
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                    : 'bg-cyan-400/20 text-cyan-300 border-cyan-400/40'
                }`}>
                  {occupancy.isSystemBlocked ? 'TRAVADO' : `${occupancy.percentage}%`}
                </span>
              </div>
            </div>

            {/* Interactive Physical Buttons Row */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              
              {/* Button: Entry (GPIO 18) */}
              <div className="rounded-2xl bg-gray-950 p-4 border border-gray-800 flex flex-col items-center text-center">
                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider mb-3">
                  PIN GPIO 18 (PULL-UP)
                </span>
                
                {/* 3D Tactile Push Button */}
                <button
                  id="esp32-btn-entry"
                  type="button"
                  onClick={handlePressEntry}
                  disabled={occupancy.isSystemBlocked || occupancy.turnstileLocked || occupancy.currentCount >= occupancy.maxCapacity}
                  className={`group relative flex h-20 w-20 items-center justify-center rounded-full text-black shadow-lg transition-all hover:scale-105 active:scale-95 active:shadow-inner disabled:opacity-40 disabled:scale-100 ${
                    occupancy.isSystemBlocked 
                      ? 'bg-rose-600 shadow-rose-600/30 cursor-not-allowed' 
                      : 'bg-gradient-to-b from-cyan-400 to-cyan-600 shadow-cyan-400/30'
                  }`}
                  title={occupancy.isSystemBlocked ? 'Catracas bloqueadas pelo administrador geral do SaaS' : 'Pressionar botão físico de Entrada da Catraca'}
                >
                  <div className={`flex h-14 w-14 items-center justify-center rounded-full font-['Outfit'] font-black text-xs shadow-inner uppercase tracking-wider ${
                    occupancy.isSystemBlocked ? 'bg-rose-400 text-black' : 'bg-cyan-300 text-black'
                  }`}>
                    {occupancy.isSystemBlocked ? 'BLOQ' : 'ENTRADA'}
                  </div>
                </button>

                <span className="mt-3.5 text-xs font-bold text-white uppercase tracking-wider">
                  Botão de Entrada
                </span>
                <span className="text-[11px] text-gray-500 mt-0.5">
                  {occupancy.isSystemBlocked ? 'Acesso suspenso pelo SaaS' : 'Soma +1 ao passar'}
                </span>
              </div>

              {/* Button: Exit (GPIO 19) */}
              <div className="rounded-2xl bg-gray-950 p-4 border border-gray-800 flex flex-col items-center text-center">
                <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-3">
                  PIN GPIO 19 (PULL-UP)
                </span>
                
                {/* 3D Tactile Push Button */}
                <button
                  id="esp32-btn-exit"
                  type="button"
                  onClick={handlePressExit}
                  disabled={occupancy.isSystemBlocked || occupancy.currentCount <= 0}
                  className="group relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-b from-gray-700 to-gray-900 text-white shadow-lg shadow-black/50 transition-all hover:scale-105 active:scale-95 active:shadow-inner disabled:opacity-40 disabled:scale-100 border border-gray-600"
                  title={occupancy.isSystemBlocked ? 'Catracas bloqueadas pelo administrador geral do SaaS' : 'Pressionar botão físico de Saída da Catraca'}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-800 text-white font-['Outfit'] font-black text-xs shadow-inner uppercase tracking-wider">
                    {occupancy.isSystemBlocked ? 'BLOQ' : 'SAÍDA'}
                  </div>
                </button>

                <span className="mt-3.5 text-xs font-bold text-white uppercase tracking-wider">
                  Botão de Saída
                </span>
                <span className="text-[11px] text-gray-500 mt-0.5">
                  {occupancy.isSystemBlocked ? 'Acesso suspenso pelo SaaS' : 'Subtrai -1 ao sair'}
                </span>
              </div>

            </div>

            {/* Hardware LEDs & Relay Indicators */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-black p-3.5 border border-gray-800 text-[11px] font-mono">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]"></span>
                <span className="text-gray-400">PWR: 5V OK</span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${occupancy.esp32Connected ? 'bg-cyan-400 animate-pulse shadow-[0_0_6px_rgba(34,211,238,0.8)]' : 'bg-gray-600'}`}></span>
                <span className="text-gray-400">Wi-Fi TX/RX</span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${
                  occupancy.isSystemBlocked
                    ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                    : (isRelayActive ? 'bg-amber-400 animate-ping shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'bg-gray-700')
                }`}></span>
                <span className={occupancy.isSystemBlocked ? 'text-rose-400 font-bold' : (isRelayActive ? 'text-amber-300 font-bold' : 'text-gray-400')}>
                  RELÉ SOLENOIDE: {occupancy.isSystemBlocked ? 'TRAVADO (BLOQUEIO SAAS)' : (isRelayActive ? 'ARMADO (LIBERADO)' : 'EM REPOUSO')}
                </span>
              </div>
            </div>

            {/* Live Hardware Terminal Log */}
            <div className="relative z-10 mt-3.5 rounded-xl bg-black p-3 border border-gray-800 font-mono text-[11px] text-cyan-400 flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">{lastEventMsg}</span>
            </div>

          </div>

          {/* Telemetry & Pinout Guide */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Live Telemetry Card */}
            <div className="rounded-2xl bg-gray-950 p-5 border border-gray-800 space-y-3 text-xs">
              <h3 className="font-bold text-white uppercase tracking-widest text-[11px] flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-cyan-400" />
                Telemetria do ESP32 Conectado
              </h3>

              <div className="grid grid-cols-2 gap-2.5 pt-1 font-mono text-gray-300">
                <div className="bg-gray-900/80 p-2.5 rounded-xl border border-gray-800">
                  <span className="text-[10px] text-gray-500 uppercase block">Dispositivo:</span>
                  <strong className="text-white text-xs">ESP32_CATRACA_01</strong>
                </div>
                <div className="bg-gray-900/80 p-2.5 rounded-xl border border-gray-800">
                  <span className="text-[10px] text-gray-500 uppercase block">Sinal (RSSI):</span>
                  <strong className="text-cyan-400 text-xs">-58 dBm (Excelente)</strong>
                </div>
                <div className="bg-gray-900/80 p-2.5 rounded-xl border border-gray-800">
                  <span className="text-[10px] text-gray-500 uppercase block">Memória (Heap):</span>
                  <strong className="text-cyan-300 text-xs">184.5 KB</strong>
                </div>
                <div className="bg-gray-900/80 p-2.5 rounded-xl border border-gray-800">
                  <span className="text-[10px] text-gray-500 uppercase block">Protocolo:</span>
                  <strong className="text-gray-200 text-xs">HTTP REST / JSON</strong>
                </div>
              </div>
            </div>

            {/* Pinout Wiring Reference */}
            <div className="rounded-2xl bg-gray-950 p-5 border border-gray-800 space-y-2.5 text-xs">
              <h3 className="font-bold text-white uppercase tracking-widest text-[11px] flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-cyan-400" />
                Pinagem e Conexões Físicas (GPIO)
              </h3>

              <ul className="space-y-2 text-[11px] text-gray-300">
                <li className="flex justify-between py-1 border-b border-gray-800">
                  <span>🟢 Botão de Entrada:</span>
                  <strong className="font-mono text-cyan-400 font-bold">GPIO 18 + GND</strong>
                </li>
                <li className="flex justify-between py-1 border-b border-gray-800">
                  <span>🔵 Botão de Saída:</span>
                  <strong className="font-mono text-gray-300 font-bold">GPIO 19 + GND</strong>
                </li>
                <li className="flex justify-between py-1 border-b border-gray-800">
                  <span>⚡ Relé Entrada:</span>
                  <strong className="font-mono text-amber-400 font-bold">GPIO 22</strong>
                </li>
                <li className="flex justify-between py-1 border-b border-gray-800">
                  <span>⚡ Relé Saída:</span>
                  <strong className="font-mono text-amber-400 font-bold">GPIO 23</strong>
                </li>
                <li className="flex justify-between py-1">
                  <span>🔊 Buzzer:</span>
                  <strong className="font-mono text-purple-400 font-bold">GPIO 4</strong>
                </li>
              </ul>
            </div>

          </div>

        </div>

      </div>

      {/* Complete Arduino C++ Firmware Source Code & Generator */}
      <div className="rounded-3xl border border-gray-800 bg-gray-900/30 p-6 sm:p-8 backdrop-blur-sm shadow-xl">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-5 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 border border-gray-800 text-cyan-400">
              <Code2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Firmware Embarcado
              </h3>
              <h2 className="text-lg font-black font-['Outfit'] text-white">
                Código-Fonte do ESP32 (Arduino C++ / .ino)
              </h2>
            </div>
          </div>

          <button
            id="btn-copy-arduino-code"
            type="button"
            onClick={handleCopyCode}
            className="flex min-h-[44px] items-center gap-2 rounded-xl bg-white hover:bg-gray-200 text-black px-4 py-2 text-xs font-bold uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 stroke-[3]" />
                <span>Código Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copiar Código Arduino</span>
              </>
            )}
          </button>
        </div>

        {/* Dynamic Config Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 text-xs">
          <div>
            <label className="block text-gray-400 font-bold uppercase tracking-wider mb-1.5 text-[10px]">
              Nome da Rede Wi-Fi (SSID):
            </label>
            <input
              type="text"
              value={wifiSSID}
              onChange={(e) => setWifiSSID(e.target.value)}
              className="w-full min-h-[44px] rounded-2xl bg-gray-950 border border-gray-800 px-3.5 py-2 text-base sm:text-xs text-gray-200 font-mono focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-400 font-bold uppercase tracking-wider mb-1.5 text-[10px]">
              Senha do Wi-Fi:
            </label>
            <input
              type="text"
              value={wifiPass}
              onChange={(e) => setWifiPass(e.target.value)}
              className="w-full min-h-[44px] rounded-2xl bg-gray-950 border border-gray-800 px-3.5 py-2 text-base sm:text-xs text-gray-200 font-mono focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-400 font-bold uppercase tracking-wider mb-1.5 text-[10px]">
              URL Base do Servidor GymFlow:
            </label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="w-full min-h-[44px] rounded-2xl bg-gray-950 border border-gray-800 px-3.5 py-2 text-base sm:text-xs text-gray-200 font-mono focus:border-cyan-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Code Snippet Viewer */}
        <div className="relative rounded-2xl bg-black border border-gray-800 p-5 max-h-96 overflow-y-auto font-mono text-xs text-gray-300 leading-relaxed selection:bg-cyan-400 selection:text-black">
          <pre className="overflow-x-auto whitespace-pre">
            <code>{arduinoCode}</code>
          </pre>
        </div>

      </div>

    </div>
  );
};
