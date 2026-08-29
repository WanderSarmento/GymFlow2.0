import React, { useState, useEffect } from 'react';
import { X, Database, Check, Copy, Download, ExternalLink, RefreshCw, CheckCircle2, AlertCircle, Sparkles, Terminal, Shield, Key, Server, Cpu } from 'lucide-react';
import { SUPABASE_SQL_SCHEMA } from '../data/supabaseSchema';
import { getSupabaseCredentials, updateSupabaseCredentials, testSupabaseConnection, isSupabaseConfigured } from '../lib/supabase';
import { SupabaseConfigStatus } from '../types';

interface SupabaseIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseIntegrationModal: React.FC<SupabaseIntegrationModalProps> = ({
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'sql' | 'credentials' | 'guide'>('sql');

  // Supabase credentials input
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');

  // Status & live testing
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<SupabaseConfigStatus | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const creds = getSupabaseCredentials();
      setSupabaseUrl(creds.url || '');
      setSupabaseAnonKey(creds.anonKey || '');
      setTestResult(null);
      setSaveSuccess(false);

      // Auto test if already configured
      if (creds.url && creds.anonKey) {
        testSupabaseConnection().then(setTestResult);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopySQL = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadSQL = () => {
    const element = document.createElement('a');
    const file = new Blob([SUPABASE_SQL_SCHEMA], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'gymflow-supabase-schema.sql';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testSupabaseConnection(supabaseUrl.trim(), supabaseAnonKey.trim());
      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        isConfigured: false,
        hasAnonKey: Boolean(supabaseAnonKey),
        status: 'error',
        message: err?.message || 'Falha ao testar conexão'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = () => {
    updateSupabaseCredentials(supabaseUrl.trim(), supabaseAnonKey.trim());
    setSaveSuccess(true);
    handleTestConnection();
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl p-6 sm:p-8 text-zinc-100 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Ambient Glow */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 shadow-inner">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase">
                  Banco de Dados PostgreSQL
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                  testResult?.status === 'connected'
                    ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${testResult?.status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                  {testResult?.status === 'connected' ? 'Supabase Conectado' : 'Aguardando Configuração'}
                </span>
              </div>
              <h2 className="text-xl font-black font-['Outfit'] text-white">
                Integração Supabase & Tabelas SQL
              </h2>
            </div>
          </div>

          <button
            id="close-supabase-modal-btn"
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-900 hover:text-white transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sub-Tabs */}
        <div className="flex items-center gap-2 mb-4 shrink-0 border-b border-zinc-800/60 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('sql')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'sql'
                ? 'bg-emerald-400 text-black shadow-md font-black'
                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Terminal className="h-4 w-4" />
            <span>Script SQL das Tabelas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('credentials')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'credentials'
                ? 'bg-emerald-400 text-black shadow-md font-black'
                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Key className="h-4 w-4" />
            <span>Conectar Supabase (URL / Chaves)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-emerald-400 text-black shadow-md font-black'
                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>Guia Passo a Passo</span>
          </button>
        </div>

        {/* TAB 1: SQL SCHEMA VIEWER */}
        {activeTab === 'sql' && (
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span>Schema pronto com <strong>6 tabelas</strong>, <strong>RLS Policies</strong> e <strong>Funções de Catraca</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="copy-sql-btn"
                  type="button"
                  onClick={handleCopySQL}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-400 border border-emerald-400/30 text-xs font-bold transition-all cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Copiado com Sucesso!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copiar SQL Completo</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSQL}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-bold transition-all cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Baixar .sql</span>
                </button>
              </div>
            </div>

            {/* SQL Code Box */}
            <div className="flex-1 min-h-0 rounded-2xl bg-zinc-900 border border-zinc-800 p-4 font-mono text-xs text-emerald-300/90 overflow-y-auto relative selection:bg-emerald-500 selection:text-black">
              <pre className="whitespace-pre leading-relaxed">
                {SUPABASE_SQL_SCHEMA}
              </pre>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-zinc-900/60 p-3 border border-zinc-800/80 text-xs text-zinc-400">
              <span>💡 Dica: Cole este script diretamente no <strong>SQL Editor</strong> do seu dashboard no Supabase e clique em <strong>Run</strong>.</span>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline flex items-center gap-1 font-bold shrink-0"
              >
                Abrir Supabase <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* TAB 2: CREDENTIALS & CONNECTION CONFIG */}
        {activeTab === 'credentials' && (
          <div className="flex-1 flex flex-col min-h-0 space-y-4 overflow-y-auto pr-1">
            <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-4 text-xs text-zinc-300 leading-relaxed">
              Você pode conectar o aplicativo diretamente ao seu banco de dados Supabase preenchendo as variáveis abaixo ou declarando-as no arquivo <strong>.env</strong> (conforme modelo em <strong>.env.example</strong>).
            </div>

            {testResult && (
              <div className={`p-4 rounded-2xl border flex items-start gap-3 text-xs leading-relaxed ${
                testResult.status === 'connected'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : testResult.status === 'not_configured'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                {testResult.status === 'connected' ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
                )}
                <div>
                  <h4 className="font-bold text-sm mb-0.5">
                    {testResult.status === 'connected' ? 'Status: Conexão Estabelecida!' : 'Status: Erro na Conexão'}
                  </h4>
                  <p>{testResult.message}</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Project URL (SUPABASE_URL)
                </label>
                <input
                  type="url"
                  placeholder="https://xyzprojectid.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-emerald-400 focus:outline-none transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Anon / Public Key (SUPABASE_ANON_KEY)
                </label>
                <textarea
                  rows={3}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-xs text-white placeholder-zinc-500 focus:border-emerald-400 focus:outline-none transition-colors font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !supabaseUrl || !supabaseAnonKey}
                className="flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" />
                    <span>Testando Conexão...</span>
                  </>
                ) : (
                  <>
                    <Server className="h-4 w-4 text-emerald-400" />
                    <span>Testar Conexão</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSaveConfig}
                className="flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold text-xs transition-all shadow-lg shadow-emerald-400/20 active:scale-[0.99] cursor-pointer"
              >
                {saveSuccess ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Salvo no Navegador!</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Salvar & Ativar Supabase</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: STEP-BY-STEP GUIDE */}
        {activeTab === 'guide' && (
          <div className="flex-1 min-h-0 space-y-4 overflow-y-auto pr-1 text-xs text-zinc-300">
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-400/20 text-emerald-400 font-bold shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm mb-1">Crie seu Projeto no Supabase</h4>
                  <p className="text-zinc-400 leading-relaxed">
                    Acesse <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline">supabase.com</a> e crie um novo projeto gratuito na região mais próxima (ex: São Paulo - sa-east-1).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-400/20 text-emerald-400 font-bold shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm mb-1">Execute o Script SQL Completo</h4>
                  <p className="text-zinc-400 leading-relaxed">
                    No painel do Supabase, clique no menu lateral em <strong>SQL Editor</strong> &gt; <strong>New Query</strong>, cole o script gerado na aba "Script SQL das Tabelas" e execute (Run). Isso criará as tabelas de academias, logs de catraca, avisos e funções atômicas de contagem.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-400/20 text-emerald-400 font-bold shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm mb-1">Copie a URL e Chave Anônima</h4>
                  <p className="text-zinc-400 leading-relaxed">
                    Vá em <strong>Project Settings</strong> &gt; <strong>API</strong> e copie a <code>Project URL</code> e a <code>anon public key</code>. Insira na aba de conexão ou no seu <code>.env</code>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-400/20 text-emerald-400 font-bold shrink-0">
                  4
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm mb-1">Catracas ESP32 Sincronizadas</h4>
                  <p className="text-zinc-400 leading-relaxed">
                    O código C++ dos microcontroladores ESP32 continuará disparando eventos via API REST/HTTP, gravando em tempo real na tabela <code>access_logs</code> e atualizando a coluna <code>current_count</code> da academia.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
