import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  Mail, 
  KeyRound, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw, 
  User, 
  Phone, 
  MapPin, 
  Users, 
  Copy, 
  Check, 
  ExternalLink,
  ChevronRight,
  Shield,
  Palette
} from 'lucide-react';
import { AuthUser, LoginCredentials, PasswordResetRequest, GymProfile, CreateGymInput, GymThemeColor } from '../types';
import { loginUser, requestPasswordRecovery, resetPasswordWithCode, registerGym } from '../services/api';
import { THEME_COLOR_CONFIG } from '../data/gymData';

interface GymLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AuthUser) => void;
  onGymCreated?: (gym: GymProfile) => void;
  onOpenRegisterModal?: () => void;
  currentGym?: GymProfile;
  availableGyms?: GymProfile[];
  initialMode?: 'login' | 'register';
}

type AuthMode = 'login' | 'register' | 'forgot_request' | 'forgot_reset' | 'register_success';

const EMOJI_OPTIONS = ['⚡', '🔥', '💪', '🌿', '🏋️', '🥊', '🏆', '💎', '🚀', '⭐', '🎯', '✨'];
const THEME_OPTIONS: GymThemeColor[] = ['cyan', 'emerald', 'amber', 'violet', 'rose', 'blue'];

export const GymLoginModal: React.FC<GymLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onGymCreated,
  onOpenRegisterModal,
  currentGym,
  availableGyms = [],
  initialMode = 'login'
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Login Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Registration Form States
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regPhone, setRegPhone] = useState('');
  
  const [regGymName, setRegGymName] = useState('');
  const [regSlug, setRegSlug] = useState('');
  const [regCity, setRegCity] = useState('São Paulo');
  const [regNeighborhood, setRegNeighborhood] = useState('Centro');
  const [regMaxCapacity, setRegMaxCapacity] = useState<number>(80);
  const [regThemeColor, setRegThemeColor] = useState<GymThemeColor>('cyan');
  const [regLogoEmoji, setRegLogoEmoji] = useState('⚡');
  const [regSlogan, setRegSlogan] = useState('Monitoramento em Tempo Real');

  // Recovery States
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Success / Created Result
  const [createdGymInfo, setCreatedGymInfo] = useState<{
    gym: GymProfile;
    user?: AuthUser;
    apiKey?: string;
    publicUrl?: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewCodeNotice, setPreviewCodeNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setPreviewCodeNotice(null);
  };

  const handleSlugAutoFill = (name: string) => {
    setRegGymName(name);
    const generatedSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!regSlug || regSlug === generatedSlug.slice(0, -1)) {
      setRegSlug(generatedSlug);
    }
  };

  // 1. SUBMIT LOGIN
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Por favor, informe o e-mail e a senha de acesso.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginUser({
        email: email.trim(),
        password: password.trim(),
        gymSlug: currentGym?.slug
      });

      if (res.success && res.user) {
        setSuccessMessage(res.message || 'Login efetuado com sucesso!');
        setTimeout(() => {
          onLoginSuccess(res.user!);
          onClose();
        }, 600);
      } else {
        setErrorMessage(res.message || 'Falha ao autenticar. Verifique suas credenciais.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro de rede ao processar login.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. SUBMIT SELF-SERVICE REGISTRATION
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!regOwnerName.trim()) {
      setErrorMessage('Por favor, informe o nome do gestor/responsável.');
      return;
    }
    if (!regEmail.trim()) {
      setErrorMessage('Por favor, informe o e-mail de acesso da academia.');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setErrorMessage('A senha de acesso deve ter pelo menos 6 caracteres.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMessage('A confirmação de senha não confere com a senha digitada.');
      return;
    }
    if (!regGymName.trim()) {
      setErrorMessage('Por favor, informe o nome da sua academia.');
      return;
    }
    if (!regSlug.trim()) {
      setErrorMessage('Defina uma URL/Slug para o link da sua academia.');
      return;
    }

    setIsLoading(true);
    try {
      const payload: CreateGymInput = {
        name: regGymName.trim(),
        slug: regSlug.trim().toLowerCase(),
        slogan: regSlogan.trim() || 'Monitoramento em Tempo Real',
        city: regCity.trim() || 'São Paulo',
        neighborhood: regNeighborhood.trim() || 'Unidade Principal',
        contactPhone: regPhone.trim(),
        maxCapacity: Number(regMaxCapacity) || 80,
        initialCount: Math.min(10, Number(regMaxCapacity) || 80),
        ownerName: regOwnerName.trim(),
        ownerEmail: regEmail.trim().toLowerCase(),
        ownerPassword: regPassword.trim(),
        themeColor: regThemeColor,
        logoEmoji: regLogoEmoji,
        operatingHours: {
          weekdays: { open: '06:00', close: '23:00', isOpen: true },
          saturday: { open: '07:00', close: '17:00', isOpen: true },
          sunday: { open: '08:00', close: '14:00', isOpen: true }
        }
      };

      const res = await registerGym(payload);

      if (res.success && res.gym) {
        setCreatedGymInfo({
          gym: res.gym,
          user: res.user,
          apiKey: res.apiKey,
          publicUrl: res.publicStudentUrl || `/gym/${res.gym.slug}`
        });

        if (onGymCreated) {
          onGymCreated(res.gym);
        }
        if (res.user) {
          onLoginSuccess(res.user);
        }

        setMode('register_success');
      } else {
        setErrorMessage(res.message || 'Erro ao registrar academia. Tente outro nome ou slug.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro de conexão ao cadastrar academia.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. SUBMIT FORGOT PASSWORD - REQUEST
  const handleForgotRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!email.trim()) {
      setErrorMessage('Informe o e-mail cadastrado da sua academia.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await requestPasswordRecovery(email.trim());
      if (res.success) {
        setSuccessMessage(res.message);
        if (res.previewCode) {
          setPreviewCodeNotice(`Código gerado para teste: ${res.previewCode}`);
          setRecoveryCode(res.previewCode);
        }
        setMode('forgot_reset');
      } else {
        setErrorMessage(res.message || 'E-mail não localizado.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao enviar código.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. SUBMIT FORGOT PASSWORD - RESET WITH CODE
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!recoveryCode.trim()) {
      setErrorMessage('Digite o código de 6 dígitos recebido.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('As senhas digitadas não coincidem.');
      return;
    }

    setIsLoading(true);
    try {
      const payload: PasswordResetRequest = {
        email: email.trim(),
        code: recoveryCode.trim(),
        newPassword: newPassword.trim()
      };
      const res = await resetPasswordWithCode(payload);
      if (res.success) {
        setSuccessMessage(res.message);
        setPassword(newPassword);
        setTimeout(() => {
          setMode('login');
          setRecoveryCode('');
          setNewPassword('');
          setConfirmPassword('');
        }, 1200);
      } else {
        setErrorMessage(res.message || 'Código inválido ou expirado.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao redefinir senha.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick preset helper
  const handleUsePreset = (presetEmail: string, presetPassword = 'password123') => {
    setEmail(presetEmail);
    setPassword(presetPassword);
    resetMessages();
  };

  const handleCopy = (text: string, type: 'link' | 'key') => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`relative w-full rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl p-6 sm:p-8 text-zinc-100 overflow-hidden flex flex-col max-h-[92vh] ${
        mode === 'register' ? 'max-w-2xl' : 'max-w-md'
      }`}>
        
        {/* Ambient Glows */}
        <div className="absolute -top-28 -left-28 w-56 h-56 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-28 -right-28 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 shadow-inner">
              {mode === 'login' && <Lock className="h-5 w-5" />}
              {mode === 'register' && <Building2 className="h-5 w-5" />}
              {mode === 'register_success' && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
              {(mode === 'forgot_request' || mode === 'forgot_reset') && <KeyRound className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black tracking-widest text-cyan-400 uppercase">
                  GymFlow SaaS
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
                <span className="text-[10px] font-bold text-zinc-400">
                  {mode === 'register' ? 'Novo Cadastro' : 'Portal de Acesso'}
                </span>
              </div>
              <h2 className="text-xl font-black font-['Outfit'] text-white">
                {mode === 'login' && 'Entrar na Academia'}
                {mode === 'register' && 'Cadastrar Nova Academia'}
                {mode === 'register_success' && 'Cadastro Concluído!'}
                {mode === 'forgot_request' && 'Recuperar Senha'}
                {mode === 'forgot_reset' && 'Nova Senha de Acesso'}
              </h2>
            </div>
          </div>

          <button
            id="close-login-modal-btn"
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-900 hover:text-white transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher: Login / Cadastre-se */}
        {mode !== 'register_success' && mode !== 'forgot_reset' && (
          <div className="flex items-center gap-1 p-1 bg-zinc-900/90 rounded-2xl border border-zinc-800 mb-4 shrink-0">
            <button
              id="switch-tab-login-btn"
              type="button"
              onClick={() => {
                resetMessages();
                setMode('login');
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'login' || mode === 'forgot_request'
                  ? 'bg-cyan-400 text-black shadow-md font-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Já Tenho Conta (Entrar)</span>
            </button>

            <button
              id="switch-tab-register-btn"
              type="button"
              onClick={() => {
                resetMessages();
                setMode('register');
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-cyan-400 text-black shadow-md font-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Cadastrar Academia</span>
            </button>
          </div>
        )}

        {/* Error / Success Notifications */}
        {errorMessage && (
          <div className="mb-4 flex items-start gap-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-400 shrink-0 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 flex items-start gap-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3.5 text-xs text-emerald-400 shrink-0 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{successMessage}</span>
          </div>
        )}

        {previewCodeNotice && (
          <div className="mb-4 flex items-center justify-between rounded-2xl bg-cyan-500/10 border border-cyan-500/30 p-3 text-xs text-cyan-300 shrink-0">
            <span className="font-mono font-bold">{previewCodeNotice}</span>
            <span className="text-[10px] bg-cyan-400 text-black px-2 py-0.5 rounded-full font-bold">Auto-preenchido</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1: LOGIN FORM */}
        {/* ========================================================= */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 overflow-y-auto pr-1">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                E-mail do Gestor / Recepção
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="login-email-input"
                  type="email"
                  required
                  placeholder="gestor@suaacademia.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Senha de Acesso
                </label>
                <button
                  type="button"
                  onClick={() => {
                    resetMessages();
                    setMode('forgot_request');
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline font-semibold cursor-pointer"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 pl-10 pr-11 py-3 text-sm text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-cyan-400 focus:ring-0 focus:ring-offset-0"
                />
                <span>Lembrar meus dados</span>
              </label>

              <span className="text-[11px] text-zinc-500 flex items-center gap-1 font-mono">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Sessão Segura
              </span>
            </div>

            <button
              id="submit-login-btn"
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-sm transition-all shadow-lg shadow-cyan-400/20 active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Acessar Painel da Academia</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {/* Quick Demo Credentials */}
            <div className="mt-4 pt-3 border-t border-zinc-900">
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                Acesso Rápido de Teste (1-Clique):
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleUsePreset('ricardo@ironpeak.com')}
                  className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300 hover:text-cyan-400 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>🏋️‍♂️ Iron Peak</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUsePreset('mariana@zenith.com')}
                  className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300 hover:text-violet-400 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>🧘‍♀️ Zenith Fitness</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUsePreset('admin@gymflow.com', 'admin123')}
                  className="px-2.5 py-1.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-500/40 text-[11px] text-indigo-300 hover:text-white transition-colors flex items-center gap-1 cursor-pointer font-semibold shadow-sm"
                >
                  <span>👑 Master SaaS Admin</span>
                </button>
              </div>
            </div>

            <div className="pt-1 text-center">
              <p className="text-xs text-zinc-400">
                Ainda não tem cadastro?{' '}
                <button
                  type="button"
                  onClick={() => {
                    resetMessages();
                    setMode('register');
                  }}
                  className="text-cyan-400 hover:underline font-bold cursor-pointer"
                >
                  Cadastre sua academia aqui
                </button>
              </p>
            </div>
          </form>
        )}

        {/* ========================================================= */}
        {/* TAB 2: SELF-SERVICE REGISTRATION FORM */}
        {/* ========================================================= */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4 overflow-y-auto pr-1">
            <div className="rounded-2xl bg-cyan-500/10 border border-cyan-500/20 p-3 text-xs text-cyan-300 flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-cyan-400" />
              <span>Cadastre sua unidade e receba instantaneamente a chave das catracas ESP32 e o link do aluno.</span>
            </div>

            {/* SEÇÃO 1: DADOS DO RESPONSÁVEL / CONTA */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-1.5">
                <User className="h-4 w-4 text-cyan-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300">
                  1. Dados da Sua Conta (Gestor)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                    Seu Nome Completo *
                  </label>
                  <input
                    id="register-owner-name-input"
                    type="text"
                    required
                    placeholder="Ex: Carlos Silva"
                    value={regOwnerName}
                    onChange={(e) => setRegOwnerName(e.target.value)}
                    className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                    E-mail de Login *
                  </label>
                  <input
                    id="register-email-input"
                    type="email"
                    required
                    placeholder="gestor@suaacademia.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                    Senha de Acesso (mín. 6 dígitos) *
                  </label>
                  <div className="relative">
                    <input
                      id="register-password-input"
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 px-3.5 pr-10 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none transition-colors font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 cursor-pointer"
                    >
                      {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                    Confirmar Senha *
                  </label>
                  <input
                    id="register-confirm-password-input"
                    type="password"
                    required
                    placeholder="Repita a senha"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none transition-colors font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                  Telefone / WhatsApp da Academia
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <Phone className="h-3.5 w-3.5" />
                  </div>
                  <input
                    type="text"
                    placeholder="(11) 99999-8888"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 pl-9 pr-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: DADOS DA ACADEMIA */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-1.5">
                <Building2 className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300">
                  2. Dados da Academia & Catracas
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                    Nome da Academia *
                  </label>
                  <input
                    id="register-gym-name-input"
                    type="text"
                    required
                    placeholder="Ex: Apex Fitness Club"
                    value={regGymName}
                    onChange={(e) => handleSlugAutoFill(e.target.value)}
                    className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                    Link do Aluno (Slug) *
                  </label>
                  <div className="relative">
                    <input
                      id="register-gym-slug-input"
                      type="text"
                      required
                      placeholder="apex-fitness"
                      value={regSlug}
                      onChange={(e) => setRegSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs font-mono text-cyan-400 placeholder-zinc-500 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1 truncate">
                    Preview: <span className="text-zinc-400">gymflow.app/gym/{regSlug || 'sua-academia'}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                    Cidade / UF
                  </label>
                  <input
                    type="text"
                    placeholder="São Paulo - SP"
                    value={regCity}
                    onChange={(e) => setRegCity(e.target.value)}
                    className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                    Bairro / Unidade
                  </label>
                  <input
                    type="text"
                    placeholder="Moema / Jardins"
                    value={regNeighborhood}
                    onChange={(e) => setRegNeighborhood(e.target.value)}
                    className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                    Lotação Máxima
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={1000}
                    value={regMaxCapacity}
                    onChange={(e) => setRegMaxCapacity(Number(e.target.value))}
                    className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Personalização Visual Rápida */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1.5 flex items-center gap-1">
                    <Palette className="h-3 w-3 text-cyan-400" />
                    Cor do Tema
                  </label>
                  <div className="flex items-center gap-2">
                    {THEME_OPTIONS.map((theme) => {
                      const cfg = THEME_COLOR_CONFIG[theme];
                      const isSelected = regThemeColor === theme;
                      return (
                        <button
                          key={theme}
                          type="button"
                          onClick={() => setRegThemeColor(theme)}
                          className={`w-7 h-7 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? `${cfg.border} scale-110 shadow-lg ring-2 ring-white/20 bg-zinc-800`
                              : 'border-zinc-800 opacity-60 hover:opacity-100 bg-zinc-900'
                          }`}
                        >
                          <span className={`w-3 h-3 rounded-full ${cfg.primary.split(' ')[0]}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1.5">
                    Ícone da Marca
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {EMOJI_OPTIONS.slice(0, 7).map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setRegLogoEmoji(emoji)}
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-sm transition-all cursor-pointer ${
                          regLogoEmoji === emoji
                            ? 'bg-zinc-800 border border-cyan-400 scale-110 shadow'
                            : 'bg-zinc-900 border border-zinc-800 hover:bg-zinc-800'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3">
              <button
                id="submit-register-gym-btn"
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-black font-black text-sm transition-all shadow-lg shadow-cyan-400/20 active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Cadastrando Academia & Gerando Acessos...</span>
                  </>
                ) : (
                  <>
                    <Building2 className="h-4 w-4" />
                    <span>Concluir Cadastro & Acessar Painel</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>

            <div className="text-center pt-1">
              <p className="text-xs text-zinc-400">
                Já possui uma academia cadastrada?{' '}
                <button
                  type="button"
                  onClick={() => {
                    resetMessages();
                    setMode('login');
                  }}
                  className="text-cyan-400 hover:underline font-bold cursor-pointer"
                >
                  Faça login aqui
                </button>
              </p>
            </div>
          </form>
        )}

        {/* ========================================================= */}
        {/* SUCCESS STATE AFTER REGISTRATION */}
        {/* ========================================================= */}
        {mode === 'register_success' && createdGymInfo && (
          <div className="space-y-4 overflow-y-auto pr-1">
            <div className="text-center py-3">
              <div className="w-14 h-14 rounded-3xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 flex items-center justify-center mx-auto mb-2 shadow-lg">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-black text-white font-['Outfit']">
                Parabéns! Sua Academia está Pronta
              </h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
                A unidade <strong className="text-white">{createdGymInfo.gym.name}</strong> foi registrada e você já está autenticado como gestor.
              </p>
            </div>

            <div className="space-y-3">
              {/* Public Student Link */}
              <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase">
                    Link Público para seus Alunos
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(`${window.location.origin}${createdGymInfo.publicUrl}`, 'link')}
                    className="flex items-center gap-1 text-xs text-cyan-400 hover:underline font-bold cursor-pointer"
                  >
                    {copiedLink ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedLink ? 'Copiado!' : 'Copiar Link'}
                  </button>
                </div>
                <div className="flex items-center gap-2 bg-black/50 p-2.5 rounded-xl border border-zinc-800 font-mono text-xs text-cyan-300">
                  <span className="truncate">{window.location.origin}{createdGymInfo.publicUrl}</span>
                </div>
              </div>

              {/* API Key */}
              {createdGymInfo.apiKey && (
                <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase">
                      Chave de API das Catracas ESP32
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(createdGymInfo.apiKey!, 'key')}
                      className="flex items-center gap-1 text-xs text-emerald-400 hover:underline font-bold cursor-pointer"
                    >
                      {copiedKey ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedKey ? 'Copiada!' : 'Copiar Chave'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 bg-black/50 p-2.5 rounded-xl border border-zinc-800 font-mono text-xs text-emerald-400">
                    <span className="truncate">{createdGymInfo.apiKey}</span>
                  </div>
                </div>
              )}
            </div>

            <button
              id="finish-and-open-dashboard-btn"
              type="button"
              onClick={onClose}
              className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-sm transition-all shadow-lg shadow-cyan-400/20 active:scale-[0.99] cursor-pointer mt-2"
            >
              <span>Ir para o Painel da Academia</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: FORGOT PASSWORD - REQUEST CODE */}
        {/* ========================================================= */}
        {mode === 'forgot_request' && (
          <form onSubmit={handleForgotRequestSubmit} className="space-y-4 overflow-y-auto pr-1">
            <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-3.5 text-xs text-zinc-300 leading-relaxed">
              Informe o e-mail cadastrado na criação da academia. Enviaremos um código de 6 dígitos para redefinir sua senha com segurança.
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                E-mail Cadastrado
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="ex: gestor@suaacademia.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-sm transition-all shadow-lg shadow-cyan-400/20 active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Enviando código...</span>
                </>
              ) : (
                <>
                  <span>Enviar Código de Recuperação</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                resetMessages();
                setMode('login');
              }}
              className="w-full py-2 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer text-center font-semibold"
            >
              ← Voltar para o Login
            </button>
          </form>
        )}

        {/* ========================================================= */}
        {/* TAB 4: FORGOT PASSWORD - RESET WITH CODE */}
        {/* ========================================================= */}
        {mode === 'forgot_reset' && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4 overflow-y-auto pr-1">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Código de 6 Dígitos
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  maxLength={8}
                  placeholder="123456"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                  className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-center text-lg font-mono font-bold tracking-widest text-cyan-400 placeholder-zinc-600 focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Enviado para: <strong className="text-zinc-300">{email}</strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Nova Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 pl-10 pr-11 py-3 text-sm text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none transition-colors font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold text-sm transition-all shadow-lg shadow-emerald-400/20 active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Salvando nova senha...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Atualizar Senha & Acessar</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                resetMessages();
                setMode('login');
              }}
              className="w-full py-2 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer text-center font-semibold"
            >
              ← Cancelar e voltar ao Login
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
