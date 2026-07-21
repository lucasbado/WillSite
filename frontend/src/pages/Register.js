import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    UserPlus, MapPin, User, Info, ShieldAlert, ArrowLeft, Cpu, CheckCircle2,
    AtSign, Activity
} from 'lucide-react';
import { IMaskInput } from 'react-imask';
import api from './api';
import notify from '../utils/notifications';

// COMPONENTE AUXILIAR (Fora do Register para evitar perda de foco no re-render)
const InputGroup = ({ label, icon: Icon, children, error, hint }) => (
    <div className="space-y-2">
        <div className="flex justify-between items-center ml-1">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                {Icon && <Icon size={12} className="text-blue-500" />}
                {label}
            </label>
            {hint && (
                <div className="group relative">
                    <Info size={14} className="text-slate-300 hover:text-blue-500 cursor-help transition-colors" />
                    <div className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-slate-800 text-white text-[10px] font-bold rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[60]">
                        {hint}
                    </div>
                </div>
            )}
        </div>
        <div className="relative">
            {children}
        </div>
        {error && <p className="text-[10px] text-red-500 font-black flex items-center gap-1 uppercase ml-1 animate-pulse"><ShieldAlert size={12} /> {error}</p>}
    </div>
);

const Register = () => {
    const [formData, setFormData] = useState({
        username: '', password: '', nome_completo: '',
        email: '', cpf: '', cep: '', endereco: '', telefone: ''
    });
    const [erroCPF, setErroCPF] = useState('');
    const [loading, setLoading] = useState(false);
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

        // VALIDAÇÃO DE FORMATO DE E-MAIL
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            notify.warning("Formato de e-mail inválido. Use o padrão: nome@exemplo.com");
            return;
        }

        if (erroCPF) {
            notify.warning("Corrija o CPF antes de prosseguir.");
            return;
        }
        setLoading(true);
        try {
            const response = await api.post('/auth/register', formData);
            // Redireciona para a página de confirmação para uma melhor UX
            navigate('/confirmar-email');
        } catch (err) {
            notify.error(err.response?.data?.msg || "Erro no cadastro.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans">

            {/* BOTÃO VOLTAR */}
            <button
                onClick={() => navigate('/')}
                className="fixed top-8 left-8 flex items-center gap-3 text-slate-400 hover:text-slate-800 font-bold transition-all group z-[100]"
            >
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 group-hover:bg-slate-100 transition-all active:scale-95">
                    <ArrowLeft size={24} />
                </div>
                <div className="flex flex-col items-start leading-none">
                    <span className="text-[10px] uppercase tracking-[0.2em] opacity-60 text-slate-400">Voltar para</span>
                    <span className="text-sm uppercase tracking-widest text-slate-900">Página Inicial</span>
                </div>
            </button>

            {/* FORMULÁRIO (Scrollável) */}
            <div className="w-full lg:w-[60%] overflow-y-auto h-screen p-6 md:p-12 lg:p-20 pt-32 lg:pt-20 relative z-20">
                <div className="max-w-3xl mx-auto">

                    {/* LOGO */}
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
                            <Cpu size={26} strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-2xl font-black tracking-tighter text-slate-900 uppercase">SGAT<span className="text-blue-600">.</span></span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Systems Analyst</span>
                        </div>
                    </div>

                    <div className="mb-12">
                        <h2 className="text-5xl font-black text-slate-800 tracking-tighter leading-none mb-4 uppercase italic">Crie sua conta.</h2>
                        <p className="text-slate-400 font-medium text-lg italic">Junte-se à nossa plataforma de gestão técnica profissional.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8 pb-20 relative z-30">

                        {/* SEÇÃO 01: QUEM É VOCÊ */}
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
                            <div className="flex items-center gap-2 text-blue-600 font-black text-[11px] uppercase tracking-[0.2em] mb-2">
                                <User size={16} /> Quem é você?
                            </div>

                            <InputGroup label="Nome Completo">
                                <input
                                    required
                                    placeholder="Ex: João da Silva Santos"
                                    className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl p-4 transition-all font-bold text-slate-700 outline-none placeholder:text-slate-300"
                                    value={formData.nome_completo}
                                    onChange={e => setFormData({ ...formData, nome_completo: e.target.value })}
                                />
                            </InputGroup>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputGroup label="CPF" error={erroCPF}>
                                    <IMaskInput
                                        mask="000.000.000-00"
                                        placeholder="000.000.000-00"
                                        className={`w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 transition-all font-bold outline-none placeholder:text-slate-300 ${erroCPF ? 'border-red-200 text-red-600 focus:border-red-500' : 'focus:border-blue-500 text-slate-700'}`}
                                        value={formData.cpf}
                                        onAccept={(value) => validarCPFNoBanco(value.replace(/\D/g, ''))}
                                        required
                                    />
                                </InputGroup>
                                <InputGroup label="E-mail Pessoal">
                                    <input
                                        type="email"
                                        required
                                        placeholder="joao@exemplo.com"
                                        className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl p-4 transition-all font-bold text-slate-700 outline-none placeholder:text-slate-300"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </InputGroup>
                            </div>
                        </div>

                        {/* SEÇÃO 02: ONDE TE ENCONTRAMOS */}
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
                            <div className="flex items-center gap-2 text-emerald-600 font-black text-[11px] uppercase tracking-[0.2em] mb-2">
                                <MapPin size={16} /> Onde te encontramos?
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputGroup label="CEP">
                                    <IMaskInput
                                        mask="00000-000"
                                        placeholder="00000-000"
                                        className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl p-4 transition-all font-bold text-slate-700 outline-none placeholder:text-slate-300"
                                        value={formData.cep}
                                        onAccept={(value) => handleCEP(value.replace(/\D/g, ''))}
                                        required
                                    />
                                </InputGroup>
                                <InputGroup label="WhatsApp / Celular" hint="Número principal para notificações de status.">
                                    <IMaskInput
                                        mask="(00) 00000-0000"
                                        placeholder="(00) 00000-0000"
                                        className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl p-4 transition-all font-bold text-emerald-700 outline-none placeholder:text-slate-300"
                                        value={formData.telefone}
                                        onAccept={(value) => setFormData({ ...formData, telefone: value })}
                                        required
                                    />
                                </InputGroup>
                            </div>

                            <InputGroup label="Endereço Completo">
                                <input
                                    required
                                    placeholder="Rua, Número, Bairro, Cidade - UF"
                                    className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl p-4 transition-all font-bold text-slate-700 outline-none placeholder:text-slate-300"
                                    value={formData.endereco}
                                    onChange={e => setFormData({ ...formData, endereco: e.target.value })}
                                />
                            </InputGroup>
                        </div>

                        {/* SEÇÃO 03: SEGURANÇA */}
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
                            <div className="flex items-center gap-2 text-purple-600 font-black text-[11px] uppercase tracking-[0.2em] mb-2">
                                <ShieldAlert size={16} /> Segurança do Acesso
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputGroup label="Nome de Usuário" hint="Como você quer ser chamado no sistema.">
                                    <input
                                        required
                                        placeholder="Ex: joaosilva"
                                        className="w-full bg-slate-50 border-2 border-transparent focus:border-purple-500 focus:bg-white rounded-2xl p-4 transition-all font-bold text-slate-700 outline-none placeholder:text-slate-300"
                                        value={formData.username}
                                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    />
                                </InputGroup>
                                <InputGroup label="Sua Senha">
                                    <input
                                        required
                                        type="password"
                                        placeholder="••••••••"
                                        className="w-full bg-slate-50 border-2 border-transparent focus:border-purple-500 focus:bg-white rounded-2xl p-4 transition-all font-bold text-slate-700 outline-none placeholder:text-slate-300"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </InputGroup>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-xl hover:bg-blue-600 transition-all shadow-2xl shadow-blue-100 active:scale-95 uppercase flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <UserPlus size={24} /> Criar minha conta
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {/* PAINEL LATERAL DIREITO (Destaque Visual) */}
            <div className="hidden lg:flex lg:w-[40%] bg-slate-900 relative items-center justify-center p-12 overflow-hidden z-10">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-emerald-600/5"></div>

                {/* Efeito Visual Tech */}
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-emerald-600/5 rounded-full blur-[100px]"></div>

                <div className="relative z-10 max-w-sm w-full space-y-8 animate-in fade-in zoom-in duration-1000">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[3.5rem] shadow-3xl">
                        <CheckCircle2 size={50} className="text-blue-500 mb-6" />
                        <h3 className="text-3xl font-black text-white tracking-tighter mb-4 leading-none uppercase italic">Acesso Prioritário ao Ecossistema.</h3>
                        <p className="text-slate-400 font-medium text-sm leading-relaxed mb-8">
                            Ao criar sua conta, você habilita o rastreamento em tempo real de seus dispositivos e o acesso ao histórico técnico digital.
                        </p>

                        <div className="space-y-4">
                            {[
                                { icon: Activity, text: 'Rastreamento em Tempo Real' },
                                { icon: ShieldAlert, text: 'Laudos Digitais Autênticos' },
                                { icon: AtSign, text: 'Notificações via WhatsApp' }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3 text-[10px] text-white font-black uppercase tracking-widest">
                                    <div className="p-2 bg-white/5 rounded-lg">
                                        <item.icon size={14} className="text-blue-400" />
                                    </div>
                                    {item.text}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 bg-blue-600 rounded-[2rem] text-white shadow-2xl shadow-blue-600/20 rotate-1">
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">Dica do Analista:</p>
                        <p className="text-xs font-bold leading-tight">
                            "Mantenha seu e-mail e WhatsApp sempre atualizados para receber os alertas de conclusão do reparo em tempo real."
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
