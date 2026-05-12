import React, { useState, useEffect } from 'react';
import {
    User, Mail, MapPin, Save, ArrowLeft, Phone,
    Info, Cpu, ShieldCheck, UserCircle, Moon, Sun
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { IMaskInput } from 'react-imask';
import api from './api';

const ConfiguracoesPerfil = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        nome_completo: '',
        email: '',
        cep: '',
        endereco: '',
        telefone: '',
        cpf: ''
    });
    const [loading, setLoading] = useState(false);

    // LÓGICA DE DARK MODE
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem('sgat_theme') === 'dark' ||
            (!('sgat_theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    });

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('sgat_theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('sgat_theme', 'light');
        }
    }, [darkMode]);

    useEffect(() => {
        const carregarDados = async () => {
            try {
                const res = await api.get('/auth/perfil');
                setFormData(res.data);
            } catch (err) { console.error("Erro perfil:", err); }
        };
        carregarDados();
    }, []);

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

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.patch('/auth/perfil/atualizar', formData);
            alert("Perfil atualizado com sucesso!");
        } catch (err) { alert("Erro ao atualizar."); }
        finally { setLoading(false); }
    };

    return (
        // Wrapper: No Mobile tiramos o 'overflow-hidden' para permitir o scroll natural da página caso prefira, 
        // mas mantemos a estrutura de transição.
        <div className="min-h-screen bg-white dark:bg-[#020617] flex flex-col lg:flex-row font-sans transition-colors duration-500 modern-scroll-v">

            {/* --- BARRA DE NAVEGAÇÃO MOBILE / DESKTOP --- */}
            {/* Usamos uma div de controle para os botões fixos no mobile para não poluir o conteúdo */}
            <div className="fixed top-0 left-0 right-0 h-20 md:h-0 z-50 flex items-center justify-between px-4 md:px-0 pointer-events-none">

                {/* BOTÃO VOLTAR */}
                <button
                    onClick={() => navigate(-1)}
                    className="pointer-events-auto flex items-center gap-3 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold transition-all group md:fixed md:top-8 md:left-8"
                >
                    <div className="p-3 md:p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-xl md:shadow-sm border border-slate-100 dark:border-slate-800 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-all active:scale-95">
                        <ArrowLeft size={window.innerWidth < 768 ? 20 : 24} strokeWidth={3} />
                    </div>
                    <div className="hidden md:flex flex-col items-start leading-none">
                        <span className="text-[10px] uppercase tracking-[0.2em] opacity-60">Voltar para</span>
                        <span className="text-sm uppercase tracking-widest text-slate-900 dark:text-slate-50 font-black">Dashboard</span>
                    </div>
                </button>

                {/* TOGGLE DARK MODE */}
                <button
                    onClick={() => setDarkMode(!darkMode)}
                    className="pointer-events-auto p-3 md:p-4 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-blue-400 rounded-2xl border-2 border-transparent dark:border-blue-500/20 shadow-xl transition-all active:scale-90 flex items-center gap-3 group md:fixed md:top-8 md:right-8"
                >
                    {darkMode ? <Sun size={20} className="animate-spin-slow" /> : <Moon size={20} />}
                    <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">
                        {darkMode ? 'Light_Mode' : 'Dark_Mode'}
                    </span>
                </button>
            </div>

            {/* --- LADO ESQUERDO: CONTEÚDO DO FORMULÁRIO --- */}
            <div className="w-full lg:w-[60%] overflow-y-auto h-screen p-6 md:p-20 pt-28 md:pt-32 lg:pt-20 animate-in fade-in slide-in-from-bottom-6 md:slide-in-from-left-6 duration-700 custom-scrollbar">
                <div className="max-w-2xl mx-auto">

                    {/* HEADER DO PERFIL */}
                    <div className="flex flex-col md:flex-row items-center md:items-center gap-4 md:gap-6 mb-10 md:mb-16 text-center md:text-left">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-900 dark:bg-blue-600 rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shadow-blue-900/40 dark:shadow-blue-500/20 rotate-3 md:rotate-0">
                            <UserCircle size={40} strokeWidth={2} />
                        </div>
                        <div className="flex flex-col leading-none">
                            <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-slate-50 uppercase italic leading-[0.8]">
                                Meu Perfil<span className="text-blue-600 dark:text-blue-500">.</span>
                            </h2>
                            <span className="text-[10px] md:text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] mt-3 md:mt-2">
                                Gerenciamento de Identidade
                            </span>
                        </div>
                    </div>

                    <form onSubmit={handleSave} className="space-y-10 md:space-y-12 pb-20">

                        {/* SEÇÃO: DADOS BÁSICOS */}
                        <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
                            <div className="flex items-center gap-3 text-blue-500 dark:text-blue-400 font-black text-[10px] md:text-xs uppercase tracking-[0.3em] ml-1">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <ShieldCheck size={18} />
                                </div>
                                Dados de Autenticação
                            </div>

                            <div className="space-y-2 group">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1 tracking-widest">Nome Completo</label>
                                <div className="relative">
                                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-700 group-focus-within:text-blue-500 transition-colors" size={20} />
                                    <input
                                        required
                                        placeholder="DIGITE SEU NOME..."
                                        className="w-full pl-14 p-5 md:pl-11 md:p-6 bg-slate-50 dark:bg-slate-950 border-2 border-transparent dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-950 rounded-[1.5rem] md:rounded-3xl font-black text-slate-700 dark:text-slate-200 outline-none transition-all shadow-inner text-sm md:text-base placeholder:text-slate-200 dark:placeholder:text-slate-800"
                                        value={formData.nome_completo}
                                        onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Grid de Contato: Empilha no mobile, 2 colunas no desktop */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 group">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1 tracking-widest">E-mail Corporativo</label>
                                    <div className="relative">
                                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-700 group-focus-within:text-blue-500 transition-colors" size={20} />
                                        <input
                                            required
                                            type="email"
                                            placeholder="EX@EMAIL.COM"
                                            className="w-full pl-14 p-5 md:pl-12 md:p-6 bg-slate-50 dark:bg-slate-950 border-2 border-transparent dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-950 rounded-[1.5rem] md:rounded-3xl font-black text-slate-700 dark:text-slate-200 outline-none transition-all shadow-inner text-sm md:text-base placeholder:text-slate-200 dark:placeholder:text-slate-800"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 group">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1 tracking-widest">WhatsApp / Celular</label>
                                    <div className="relative">
                                        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-400 dark:text-emerald-500 transition-colors" size={20} />
                                        <IMaskInput
                                            mask="(00) 00000-0000"
                                            className="w-full pl-14 p-5 md:pl-12 md:p-6 bg-slate-50 dark:bg-slate-950 border-2 border-transparent dark:border-emerald-500 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950 rounded-[1.5rem] md:rounded-3xl font-black text-emerald-700 dark:text-emerald-400 outline-none transition-all shadow-inner text-sm md:text-base"
                                            value={formData.telefone}
                                            onAccept={(v) => setFormData({ ...formData, telefone: v })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SEÇÃO: LOCALIZAÇÃO */}
                        <div className="space-y-6 md:space-y-8 pt-10 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                            <div className="flex items-center gap-3 text-orange-500 dark:text-orange-400 font-black text-[10px] md:text-xs uppercase tracking-[0.3em] ml-1">
                                <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                    <MapPin size={18} />
                                </div>
                               Endereço
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1 tracking-widest">CEP (Auto-Fill)</label>
                                    <IMaskInput
                                        mask="00000-000"
                                        placeholder="00000-000"
                                        className="w-full p-5 md:p-6 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-orange-500 focus:bg-white dark:focus:bg-slate-950 rounded-[1.5rem] md:rounded-3xl font-black text-slate-700 dark:text-slate-200 outline-none transition-all shadow-inner text-sm md:text-base placeholder:text-slate-200 dark:placeholder:text-slate-800"
                                        value={formData.cep}
                                        onAccept={(v) => handleCEP(v.replace(/\D/g, ''))}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1 tracking-widest">Documento CPF</label>
                                    <input
                                        className="w-full p-5 md:p-6 bg-slate-100 dark:bg-slate-900 border-none rounded-[1.5rem] md:rounded-3xl font-black text-slate-400 dark:text-slate-600 cursor-not-allowed text-sm md:text-base"
                                        value={formData.cpf}
                                        disabled
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1 tracking-widest">Endereço Completo</label>
                                <textarea
                                    rows="3"
                                    placeholder="RUA, NÚMERO, BAIRRO..."
                                    className="w-full p-5 md:p-6 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-orange-500 focus:bg-white dark:focus:bg-slate-950 rounded-[1.5rem] md:rounded-[2rem] font-black text-slate-700 dark:text-slate-200 outline-none transition-all resize-none shadow-inner text-sm md:text-base placeholder:text-slate-200 dark:placeholder:text-slate-800"
                                    value={formData.endereco}
                                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        {/* AVISO E BOTÃO */}
                        <div className="space-y-8 md:space-y-10 mt-10 md:mt-12">
                            {/* Alerta: bg-amber-50 | Dark: bg-amber-900/10 */}
                            <div className="flex items-start gap-4 bg-amber-50 dark:bg-amber-900/10 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-amber-100 dark:border-amber-900/20 transition-colors">
                                <Info size={24} className="text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-[10px] md:text-xs text-amber-900 dark:text-amber-200 font-black leading-relaxed uppercase tracking-tighter italic">
                                        Protocolo de Notificação
                                    </p>
                                    <p className="text-[9px] md:text-[11px] text-amber-800/70 dark:text-amber-200/60 font-medium leading-relaxed uppercase tracking-tight">
                                        Mantenha seu telefone atualizado! É através dele que o sistema SGAT notifica a conclusão dos seus reparos em tempo real.
                                    </p>
                                </div>
                            </div>

                            {/* Botão Salvar: bg-slate-900 | Dark: bg-blue-600 */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-slate-900 dark:bg-blue-600 text-white py-6 md:py-8 rounded-[2rem] md:rounded-[2.5rem] font-black text-lg md:text-2xl hover:bg-blue-600 dark:hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/10 dark:shadow-none flex items-center justify-center gap-4 active:scale-[0.97] group"
                            >
                                {loading ? (
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span className="tracking-[0.2em]">SINCRONIZANDO...</span>
                                    </div>
                                ) : (
                                    <>
                                        <Save size={28} className="group-hover:rotate-12 transition-transform" />
                                        <span className="tracking-tighter uppercase italic">Confirmar Alterações</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* LADO DIREITO: "IDENTITY CARD" PREVIEW (Apenas Desktop) */}
            <div className="hidden lg:flex w-[40%] bg-slate-950 relative items-center justify-center p-12 overflow-hidden border-l border-slate-900 shadow-2xl">
                {/* Glow Dinâmico */}
                <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]"></div>

                <div className="relative z-10 w-full max-w-sm">
                    {/* CARD VISUAL BRUTALISTA */}
                    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[4rem] p-12 shadow-3xl flex flex-col items-center text-center relative overflow-hidden group">
                        {/* Detalhe estético de linha técnica */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>

                        <div className="w-28 h-28 bg-blue-600 rounded-[2.5rem] flex items-center justify-center text-white text-5xl font-black mb-8 shadow-2xl shadow-blue-500/40 rotate-3 group-hover:rotate-0 transition-transform duration-500">
                            {formData.nome_completo ? formData.nome_completo.charAt(0) : <User size={40} />}
                        </div>

                        <h3 className="text-3xl font-black text-white tracking-tighter uppercase leading-none mb-3 italic">
                            {formData.nome_completo || "Usuário"}
                        </h3>
                        <p className="text-blue-500 font-black text-[10px] uppercase tracking-[0.4em] mb-10 flex items-center gap-2">
                            <ShieldCheck size={14} /> Cliente Verificado SGAT
                        </p>

                        <div className="w-full space-y-5 pt-10 border-t border-white/10">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Membro Desde</span>
                                <span className="text-xs font-bold text-slate-300 tracking-tighter">MARÇO 2026</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Status de Acesso</span>
                                <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-400 px-4 py-1.5 rounded-full border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                                    CONTA_ATIVA
                                </span>
                            </div>
                        </div>

                        <div className="mt-12 opacity-10 group-hover:opacity-30 transition-opacity">
                            <Cpu size={80} className="text-white animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfiguracoesPerfil;