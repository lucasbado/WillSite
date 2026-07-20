import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Lock, CheckCircle, Cpu, ShieldAlert } from 'lucide-react';
import api from './api';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState({ type: '', msg: '' });
    const navigate = useNavigate();

    const handleReset = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setStatus({ type: 'error', msg: 'As senhas não coincidem.' });
            return;
        }

        try {
            const response = await api.post('/auth/reset-password', { token, password });
            setStatus({ type: 'success', msg: response.data.msg });
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setStatus({ type: 'error', msg: err.response?.data?.msg || 'Falha ao redefinir senha.' });
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100">

                <div className="flex items-center gap-3 mb-10 justify-center">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                        <Cpu size={22} />
                    </div>
                    <span className="text-xl font-black tracking-tighter text-slate-900 uppercase">
                        SGAT<span className="text-blue-600">.</span>
                    </span>
                </div>

                <h2 className="text-3xl font-black text-slate-800 tracking-tighter text-center mb-2">Nova Senha</h2>
                <p className="text-slate-400 text-center text-sm font-medium mb-8">Insira sua nova senha de acesso abaixo.</p>

                {status.msg && (
                    <div className={`p-4 rounded-2xl mb-6 text-sm font-bold flex items-center gap-3 animate-in fade-in zoom-in duration-300 ${
                        status.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                    }`}>
                        {status.type === 'success' ? <CheckCircle size={18} /> : <ShieldAlert size={18} />}
                        {status.msg}
                    </div>
                )}

                <form onSubmit={handleReset} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                            <input
                                type="password"
                                placeholder="••••••••"
                                className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl p-4 pl-12 transition-all font-bold text-slate-700 outline-none"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                            <input
                                type="password"
                                placeholder="••••••••"
                                className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl p-4 pl-12 transition-all font-bold text-slate-700 outline-none"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-blue-600 transition-all shadow-xl shadow-blue-100 active:scale-95 mt-4"
                    >
                        Atualizar Senha
                    </button>
                </form>

                <button
                    onClick={() => navigate('/login')}
                    className="w-full mt-6 flex items-center justify-center gap-2 text-slate-400 hover:text-slate-800 font-bold transition-all text-sm"
                >
                    <ArrowLeft size={16} /> Voltar para o login
                </button>
            </div>
        </div>
    );
};

export default ResetPassword;
