import React from 'react';
import { Activity, ArrowUpRight, ArrowDownLeft, Lock, Sliders } from 'lucide-react';
import { AccessLog } from '../types';

interface AccessAuditLogsProps {
  accessLogs: AccessLog[];
}

export const AccessAuditLogs: React.FC<AccessAuditLogsProps> = ({ accessLogs }) => {
  return (
    <div id="reception-access-audit-logs" className="rounded-3xl border border-gray-800 bg-gray-900/30 p-6 sm:p-8 backdrop-blur-sm shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 border border-gray-800 text-cyan-400">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Auditoria e Telemetria
            </h3>
            <h2 className="text-lg font-black font-['Outfit'] text-white">
              Registro de Acessos em Tempo Real
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-gray-500">
          <span>Últimos registros</span>
        </div>
      </div>

      {/* Logs Table / List */}
      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
        {accessLogs.length === 0 ? (
          <p className="text-center py-6 text-xs text-gray-500">Nenhum evento registrado ainda.</p>
        ) : (
          accessLogs.map((log) => {
            const isEntry = log.type === 'entry';
            const isExit = log.type === 'exit';
            const isLock = log.type === 'lock' || log.type === 'unlock';

            return (
              <div
                key={log.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-2xl bg-gray-950/80 p-3.5 border border-gray-800/80 text-xs"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      isEntry
                        ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20'
                        : isExit
                        ? 'bg-gray-800 text-gray-300 border border-gray-700'
                        : isLock
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {isEntry ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : isExit ? (
                      <ArrowDownLeft className="h-4 w-4" />
                    ) : isLock ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <Sliders className="h-4 w-4" />
                    )}
                  </div>

                  <div>
                    <p className="font-bold text-white">{log.description}</p>
                    <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                      <span className="font-mono">{new Date(log.timestamp).toLocaleTimeString('pt-BR')}</span>
                      <span>•</span>
                      <span className="capitalize">
                        Origem: {log.source === 'esp32_button' ? 'Botão Físico ESP32' : log.source === 'reception_manual' ? 'Recepção' : 'Simulador'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="text-[11px] text-gray-400 font-mono">
                    Lotação: <strong className="text-white font-bold">{log.countAfter}</strong>
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      log.status === 'success'
                        ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20'
                        : log.status === 'blocked'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {log.status === 'success' ? 'Liberado' : log.status === 'blocked' ? 'Bloqueado' : 'Aviso'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
