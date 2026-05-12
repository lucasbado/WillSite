import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, LogIn, Cpu, ShieldCheck } from 'lucide-react';
import api from './api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/login', { email, password });
      sessionStorage.setItem('token', response.data.access_token);
      sessionStorage.setItem('role', response.data.role);
      sessionStorage.setItem('user_name', response.data.user_name);

      if (response.data.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/cliente/dashboard');
      }
    } catch (err) {
      setError('E-mail ou senha incorretos. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-white flex font-sans overflow-hidden">
      
      {/* BOTÃO VOLTAR À HOME (Padrão SGAT) */}
      <button
        onClick={() => navigate('/')}
        className="fixed top-8 left-8 flex items-center gap-3 text-slate-400 hover:text-slate-800 font-bold transition-all group z-50 no-print"
      >
        <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 group-hover:bg-slate-100 group-hover:shadow-md transition-all active:scale-95">
          <ArrowLeft size={24} />
        </div>
        <div className="flex flex-col items-start leading-none">
          <span className="text-[10px] uppercase tracking-[0.2em] opacity-60">Voltar para</span>
          <span className="text-sm uppercase tracking-widest text-slate-900">Página Inicial</span>
        </div>
      </button>

      {/* LADO ESQUERDO: FORMULÁRIO */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 md:p-16 animate-in fade-in slide-in-from-left-6 duration-700">
        <div className="w-full max-w-sm">
          
          {/* LOGO NO TOQUE FINAL */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
              <Cpu size={26} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-2xl font-black tracking-tighter text-slate-900 uppercase">
                SGAT<span className="text-blue-600">.</span>
              </span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                Systems Analyst
              </span>
            </div>
          </div>

          <div className="mb-10">
            <h2 className="text-4xl font-black text-slate-800 tracking-tighter leading-tight">Acesse sua conta</h2>
            <p className="text-slate-400 font-medium mt-2">Bem-vindo de volta! Insira suas credenciais abaixo.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl mb-6 text-sm font-bold flex items-center gap-3 animate-shake">
              <ShieldCheck size={18} /> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Corporativo</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input
                  type="email"
                  placeholder="exemplo@sgat.com"
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl p-4 pl-12 transition-all font-bold text-slate-700 outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sua Senha</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl p-4 pl-12 transition-all font-bold text-slate-700 outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-blue-600 transition-all shadow-xl shadow-blue-100 active:scale-95 mt-8"
            >
              <LogIn size={22} /> Entrar no Sistema
            </button>
          </form>

          <p className="mt-10 text-center text-sm font-bold text-slate-400">
            Ainda não tem conta? <button onClick={() => navigate('/register')} className="text-blue-600 hover:underline">Cadastre-se aqui</button>
          </p>
        </div>
      </div>

      {/* LADO DIREITO: IMPACTO VISUAL (Somente visível em telas grandes) */}
      <div className="hidden lg:flex w-[55%] bg-slate-900 relative items-center justify-center p-20">
        {/* Círculos de Background Decorativos */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px]"></div>
        
        <div className="relative z-10 max-w-md text-center">
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-10 rounded-[3rem] shadow-2xl">
                <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-8 shadow-2xl shadow-blue-600/40">
                    <Cpu size={40} />
                </div>
                <h3 className="text-3xl font-black text-white tracking-tighter mb-4 leading-none">
                    Gerenciamento Inteligente para Reparos Avançados.
                </h3>
                <p className="text-slate-400 font-medium">
                    Centralize suas ordens de serviço, controle de estoque e laudos técnicos em uma única plataforma robusta e elegante.
                </p>
            </div>
            
            <div className="mt-12 flex justify-center gap-8 opacity-40">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white font-black text-xs italic">S</div>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white font-black text-xs italic">G</div>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white font-black text-xs italic">A</div>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white font-black text-xs italic">T</div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Login;