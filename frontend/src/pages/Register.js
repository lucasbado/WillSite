import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    UserPlus, MapPin, CreditCard, Mail, Lock,
    User, Phone, Info, ShieldAlert, ArrowLeft, Cpu, CheckCircle2
} from 'lucide-react';
import { IMaskInput } from 'react-imask';
import api from './api';
import axios from 'axios';

const Register = () => {
    const [formData, setFormData] = useState({
        username: '', password: '', nome_completo: '',
        email: '', cpf: '', cep: '', endereco: '', telefone: ''
    });
    const [erroCPF, setErroCPF] = useState('');
    const navigate = useNavigate();

    const handleCEP = async (valorLimpo) => {
        setFormData(prev => ({ ...prev, cep: valorLimpo }));
        if (valorLimpo.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${valorLimpo}/json/`);
                const data = await res.json();
                if (!data.erro) {
                    setFormData(prev => ({
                        ...prev,
                        endereco: `${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`
                    }));
                }
            } catch (err) { console.error("Erro CEP"); }
        }
    };

    const validarCPFNoBanco = async (cpfLimpo) => {
        setFormData(prev => ({ ...prev, cpf: cpfLimpo }));
        if (cpfLimpo.length === 11) {
            try {
                const res = await api.get(`/auth/verificar-cpf/${cpfLimpo}`);
                if (res.data.existe) setErroCPF(res.data.msg);
                else setErroCPF('');
            } catch (err) { console.error("Erro CPF"); }
        } else { setErroCPF(''); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/api/auth/register', formData);
            navigate('/login');
        } catch (err) { alert(err.response?.data?.msg || "Erro no cadastro."); }
    };

    return (
        <div className="min-h-screen bg-white flex font-sans overflow-hidden">

            {/* BOTÃO VOLTAR */}
            <button
                onClick={() => navigate('/')}
                className="fixed top-8 left-8 flex items-center gap-3 text-slate-400 hover:text-slate-800 font-bold transition-all group z-50"
            >
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 group-hover:bg-slate-100 transition-all active:scale-95">
                    <ArrowLeft size={24} />
                </div>
                <div className="flex flex-col items-start leading-none">
                    <span className="text-[10px] uppercase tracking-[0.2em] opacity-60 text-slate-400">Voltar para</span>
                    <span className="text-sm uppercase tracking-widest text-slate-900">Página Inicial</span>
                </div>
            </button>

            {/* LADO ESQUERDO: FORMULÁRIO (Scrollável) */}
            <div className="w-full lg:w-[60%] overflow-y-auto h-screen p-8 md:p-20 pt-32 lg:pt-20 animate-in fade-in slide-in-from-left-6 duration-700">
                <div className="max-w-2xl mx-auto">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
                            <Cpu size={26} strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-2xl font-black tracking-tighter text-slate-900 uppercase">SGAT<span className="text-blue-600">.</span></span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Systems Analyst</span>
                        </div>
                    </div>

                    <div className="mb-12">
                        <h2 className="text-5xl font-black text-slate-800 tracking-tighter leading-none mb-4">Crie sua conta.</h2>
                        <p className="text-slate-400 font-medium text-lg italic">Junte-se à nossa plataforma de gestão técnica.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-10">
                        {/* SEÇÃO IDENTIFICAÇÃO */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-blue-500 font-black text-xs uppercase tracking-[0.2em] mb-4">
                                <User size={16} /> Identificação Pessoal
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome Completo</label>
                                    <input required className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl p-4 transition-all font-bold text-slate-700 outline-none" onChange={e => setFormData({ ...formData, nome_completo: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">CPF</label>
                                    <IMaskInput
                                        mask="000.000.000-00"
                                        className={`w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 transition-all font-bold outline-none ${erroCPF ? 'focus:border-red-500 text-red-600' : 'focus:border-blue-500 text-slate-700'}`}
                                        onAccept={(value) => validarCPFNoBanco(value.replace(/\D/g, ''))}
                                        required
                                    />
                                    {erroCPF && <p className="text-[10px] text-red-500 font-black mt-1 flex items-center gap-1 uppercase"><ShieldAlert size={12} /> {erroCPF}</p>}
                                </div>
                            </div>
                        </div>

                        {/* SEÇÃO ENDEREÇO */}
                        <div className="space-y-6 pt-6 border-t border-slate-100">
                            <div className="flex items-center gap-2 text-emerald-500 font-black text-xs uppercase tracking-[0.2em] mb-4">
                                <MapPin size={16} /> Endereço & Contato
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">CEP</label>
                                    <IMaskInput mask="00000-000" className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl p-4 transition-all font-bold text-slate-700 outline-none" onAccept={(value) => handleCEP(value.replace(/\D/g, ''))} required />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Endereço (Rua, Número, Bairro)</label>
                                    <input required className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl p-4 transition-all font-bold text-slate-700 outline-none" value={formData.endereco} onChange={e => setFormData({ ...formData, endereco: e.target.value })} />
                                </div>
                                <div className="md:col-span-3 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Celular / WhatsApp</label>
                                    <IMaskInput mask="(00) 00000-0000" className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl p-4 transition-all font-bold text-emerald-700 outline-none" onAccept={(value) => setFormData({ ...formData, telefone: value })} required />
                                </div>
                                <div className="flex items-start gap-2 bg-amber-50 p-3 rounded-xl border border-amber-100">
                                    <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-amber-700 font-bold leading-tight">
                                        DICA: Coloque um número alternativo para contato enquanto seu celular estiver no conserto!
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* SEÇÃO LOGIN */}
                        <div className="space-y-6 pt-6 border-t border-slate-100">
                            <div className="flex items-center gap-2 text-purple-500 font-black text-xs uppercase tracking-[0.2em] mb-4">
                                <Lock size={16} /> Credenciais de Acesso
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
                                <input required placeholder="E-mail" type="email" className="w-full bg-slate-50 border-2 border-transparent focus:border-purple-500 focus:bg-white rounded-2xl p-4 transition-all font-bold text-slate-700 outline-none" onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                <div className="grid grid-cols-2 gap-3">
                                    <input required placeholder="Usuário" className="w-full bg-slate-50 border-2 border-transparent focus:border-purple-500 focus:bg-white rounded-2xl p-4 transition-all font-bold text-slate-700 outline-none" onChange={e => setFormData({ ...formData, username: e.target.value })} />
                                    <div className="flex items-start gap-2 bg-amber-50 p-3 rounded-xl border border-amber-100">
                                        <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-amber-700 font-bold leading-tight">
                                            DICA: Usuario é como o "apelido" que o sistema vai usar para te reconhecer. Pode ser seu nome, ou algo criativo!
                                        </p>
                                    </div>
                                    <input required placeholder="Senha" type="password" className="w-full bg-slate-50 border-2 border-transparent focus:border-purple-500 focus:bg-white rounded-2xl p-4 transition-all font-bold text-slate-700 outline-none" onChange={e => setFormData({ ...formData, password: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-xl hover:bg-blue-600 transition shadow-2xl shadow-blue-100 active:scale-95 uppercase flex items-center justify-center gap-3">
                            <UserPlus size={24} /> Criar minha conta
                        </button>
                    </form>
                </div>
            </div>

            {/* LADO DIREITO: MENSAGEM */}
            <div className="hidden lg:flex lg:w-[40%] bg-slate-900 relative items-center justify-center p-12">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-emerald-600/5"></div>
                <div className="relative z-10 max-w-sm">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[3rem] shadow-3xl">
                        <CheckCircle2 size={50} className="text-blue-500 mb-6" />
                        <h3 className="text-3xl font-black text-white tracking-tighter mb-4 leading-none">Você está a um passo da melhor experiência técnica.</h3>
                        <ul className="space-y-4">
                            {['Acompanhamento em Tempo Real', 'Histórico de Laudos Digitais', 'Agendamento Prioritário'].map((text, i) => (
                                <li key={i} className="flex items-center gap-3 text-slate-400 font-bold text-sm uppercase tracking-tighter">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div> {text}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;