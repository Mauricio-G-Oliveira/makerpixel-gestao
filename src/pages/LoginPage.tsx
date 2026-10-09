import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { Logo } from '../brand/Logo';
import { AuthService } from '../services/authService';
import { User, AuthSession } from '../types/auth';
import { AuditService } from '../services/auditService';

interface LoginPageProps {
  onLoginSuccess: (session: AuthSession) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@makerpixeltech.com');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const session = await AuthService.login(email, password, rememberMe);
      AuditService.log('LOGIN', 'Usuário realizou login com sucesso', session.user);
      onLoginSuccess(session);
    } catch (err: any) {
      setError(err.message || 'Falha na autenticação');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
    setLoading(true);
    try {
      const session = await AuthService.login(demoEmail, demoPass, rememberMe);
      AuditService.log('LOGIN', `Login rápido como ${session.user.role}`, session.user);
      onLoginSuccess(session);
    } catch (err: any) {
      setError(err.message || 'Falha na autenticação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Background Cyber Glow & Gradients inspired by MakerPixel Tech photos */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-600/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/15 blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#00a3e0_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800/80 hover:border-cyan-500/30 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10 transition-all duration-300">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <Logo size="lg" variant="light" showBadge />
          <h2 className="text-xl font-bold text-white mt-5 tracking-tight">
            Acesso ao Sistema
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Gestão Financeira & Integração Contábil com o SCI Único
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl font-medium animate-in fade-in">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              E-mail ou Usuário
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@empresa.com"
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Senha
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-11 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all placeholder:text-slate-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-cyan-500"
              />
              <span>Lembrar-me</span>
            </label>
            <span className="text-cyan-400/80 hover:text-cyan-300 cursor-pointer">
              Esqueceu a senha?
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 mt-2 bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Entrar no Sistema</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Access Buttons */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Acesso Rápido Demo
            </span>
            <span className="text-[10px] text-cyan-400 font-mono">Stageflow Auth</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@makerpixeltech.com', 'admin123')}
              className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 text-left transition-colors"
            >
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Admin</span>
              </div>
              <div className="text-[10px] text-slate-500 truncate">admin@makerpixeltech.com</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('contador@makerpixeltech.com', 'conta123')}
              className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-sky-500/40 text-left transition-colors"
            >
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>Contador</span>
              </div>
              <div className="text-[10px] text-slate-500 truncate">contador@makerpixeltech.com</div>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="mt-6 text-center text-xs text-slate-500 z-10">
        <span>© 2026 MakerPixel Techsystem • Tubarão (SC)</span>
      </div>
    </div>
  );
};
