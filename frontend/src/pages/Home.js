import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Smartphone, ShieldCheck, Zap, Database, Search,
    ChevronRight, UserPlus, LogIn,
    Cpu, Menu, X, Moon, Sun, User, ArrowUp, ArrowLeft, Activity
} from 'lucide-react';

const Home = () => {
    const [menuAberto, setMenuAberto] = useState(false);
    const [activeSection, setActiveSection] = useState('inicio');
    const [abaAtiva, setAbaAtiva] = useState(0);
    const navigate = useNavigate();

    const categorias = [
        {
            id: "HW_ENG_N01",
            titulo: "Hardware & Microengenharia",
            color: "blue", // A cor base do sistema
            icon: <Cpu size={28} strokeWidth={2.5} />,
            desc: "Análise e reparo em nível de componente, reconstrução de trilhas e microeletrônica avançada.",
            servicos: [
                "Troca de Telas (Original/OLED) // Calibração Tátil",
                "Substituição de Baterias Certificadas // Ciclo Zero",
                "Micro-Soldagem em Placa-mãe // Reballing IC",
                "Limpeza Ultrassônica // Desoxidação Química Nível 3"
            ]
        },
        {
            id: "SW_SYS_N02",
            titulo: "Software & Core Systems",
            color: "emerald", // O verde de "Sistema Saudável"
            icon: <Database size={28} strokeWidth={2.5} />,
            desc: "Restauração de integridade do sistema operacional, otimização de kernel e segurança de dados.",
            servicos: [
                "Recuperação de Sistema (iOS/Android) // Flash FW",
                "Otimização de Performance // Limpeza de Cache de Sistema",
                "Backup e Migração de Dados Segura // Criptografia ponta a ponta",
                "Remoção de Malware & Spyware // Auditoria de Permissões"
            ]
        },
        {
            id: "CONS_TECH_N03",
            titulo: "Consultoria & Perícia Digital",
            color: "amber", // O amarelo de "Alerta/Atenção Técnica"
            icon: <Search size={28} strokeWidth={2.5} />,
            desc: "Emissão de laudos técnicos para seguradoras, perícia em dispositivos e consultoria de upgrade.",
            servicos: [
                "Laudo Técnico Especializado // Certificação de Danos",
                "Consultoria para Upgrade de Componentes // Análise de Viabilidade",
                "Recuperação de Aparelhos Molhados // Protocolo de Secagem Rápida",
                "Perícia Digital // Recuperação Forense de Dados"
            ]
        }
    ];

    // Reutilizando a lógica de persistência que criamos para o Admin
    const [isDark, setIsDark] = useState(() => {
        return localStorage.getItem('sgat_theme') === 'dark';
    });

    const toggleTheme = () => {
        const newTheme = !isDark;
        setIsDark(newTheme);
        localStorage.setItem('sgat_theme', newTheme ? 'dark' : 'light');
        document.documentElement.classList.toggle('dark', newTheme);
    };

    const mudarAba = (aba) => {
        setActiveSection(aba);
        setMenuAberto(false); // Fecha o menu automaticamente
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Garante que a nova seção comece do topo
    };

    return (
        <div className="min-h-screen bg-white dark:bg-[#020617] w-full max-w-[100vw] overflow-x-hidden flex flex-col transition-colors duration-500 font-sans">
            {/* --- NAVBAR --- */}
            <nav className="fixed top-0 w-full z-50 bg-white/70 dark:bg-[#020617]/70 backdrop-blur-xl border-b border-slate-50 dark:border-slate-800 transition-colors">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

                    {/* LOGO AREA - Agora reseta para a Home/Início */}
                    <div
                        className="flex items-center gap-2 group cursor-pointer"
                        onClick={() => mudarAba('inicio')}
                    >
                        <div className="w-10 h-10 bg-slate-900 dark:bg-blue-600 rounded-xl flex items-center justify-center text-white transition-all group-hover:bg-blue-600 dark:group-hover:bg-blue-500 shadow-lg">
                            <Cpu size={22} />
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-xl font-black tracking-tighter uppercase dark:text-white">
                                SGAT<span className="text-blue-600 dark:text-blue-400">.</span>
                            </span>
                            <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Systems Analyst</span>
                        </div>
                    </div>
                    {/* --- MENU MOBILE DROPDOWN (ESTILO TERMINAL) --- */}
                    {menuAberto && (
                        <div className="md:hidden absolute top-20 left-0 w-full bg-white dark:bg-[#020617] border-b border-slate-100 dark:border-slate-800 p-8 flex flex-col gap-6 animate-in slide-in-from-top duration-300 z-40">
                            <div className="flex flex-col gap-4">
                                <button
                                    onClick={() => mudarAba('servicos')}
                                    className={`text-left text-3xl font-black uppercase italic tracking-tighter ${activeSection === 'servicos' ? 'text-blue-600' : 'text-slate-900 dark:text-white'}`}
                                >
                                    Serviços
                                </button>
                                <button
                                    onClick={() => mudarAba('sobre')}
                                    className={`text-left text-3xl font-black uppercase italic tracking-tighter ${activeSection === 'sobre' ? 'text-blue-600' : 'text-slate-900 dark:text-white'}`}
                                >
                                    Sobre
                                </button>
                            </div>

                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    onClick={() => { navigate('/login'); setMenuAberto(false); }}
                                    className="w-full flex items-center justify-center gap-3 py-5 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-2xl active:scale-95 transition-all"
                                >
                                    <LogIn size={20} /> Acessar Sistema
                                </button>
                            </div>

                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center mt-4">
                                SGAT // Terminal_Mobile_v1.0
                            </p>
                        </div>
                    )}

                    {/* --- MENU DESKTOP --- */}
                    <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-500 dark:text-slate-400">
                        {/* Botão Serviços */}
                        <button
                            onClick={() => mudarAba('servicos')}
                            className={`transition-colors uppercase tracking-widest text-[11px] ${activeSection === 'servicos' ? 'text-blue-600 dark:text-blue-400' : 'hover:text-blue-600 dark:hover:text-blue-400'}`}
                        >
                            Serviços
                        </button>

                        {/* Botão Sobre */}
                        <button
                            onClick={() => mudarAba('sobre')}
                            className={`transition-colors uppercase tracking-widest text-[11px] ${activeSection === 'sobre' ? 'text-blue-600 dark:text-blue-400' : 'hover:text-blue-600 dark:hover:text-blue-400'}`}
                        >
                            Sobre
                        </button>

                        {/* BOTÃO DARK MODE SWITCH */}
                        <button onClick={toggleTheme} className="p-2 text-slate-400 hover:text-blue-500 transition-all">
                            {isDark ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        <button
                            onClick={() => navigate('/login')}
                            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-blue-600 text-white rounded-full hover:bg-blue-600 dark:hover:bg-blue-500 shadow-xl transition-all active:scale-95"
                        >
                            <LogIn size={18} /> Acessar Sistema
                        </button>
                    </div>

                    {/* --- BOTÃO MOBILE --- */}
                    <div className="md:hidden flex items-center gap-4">
                        <button onClick={toggleTheme} className="text-slate-400">
                            {isDark ? <Sun size={24} /> : <Moon size={24} />}
                        </button>
                        <button
                            onClick={() => setMenuAberto(!menuAberto)}
                            className="text-slate-900 dark:text-white p-2"
                        >
                            {menuAberto ? <X size={28} /> : <Menu size={28} />}
                        </button>
                    </div>
                </div>
            </nav>

            {/* --- ÁREA DE CONTEÚDO DINÂMICO --- */}
            <main className="flex-grow">

                {/* SEÇÃO INICIAL (HERO + STATUS WIDGET) */}
                {activeSection === 'inicio' && (
                    <div className="flex flex-col animate-in fade-in zoom-in-95 duration-700">

                        {/* 1. HERO SECTION */}
                        <section className="pt-40 pb-16 px-6 bg-white dark:bg-[#020617] transition-colors">
                            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                                {/* Texto e Call to Action */}
                                <div className="animate-in fade-in slide-in-from-left-8 duration-1000 delay-150">
                                    <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 inline-block border border-blue-100 dark:border-blue-800">
                                        Especialista em Apple & Android // System Analyst
                                    </span>
                                    <h1 className="text-6xl md:text-8xl font-black text-slate-900 dark:text-white tracking-tighter leading-[0.85] mb-8 uppercase italic">
                                        Seu dispositivo em <br />
                                        <span className="text-blue-600 dark:text-blue-500 underline decoration-blue-600/20 underline-offset-8">mãos experientes.</span>
                                    </h1>
                                    <p className="text-lg text-slate-500 dark:text-slate-400 font-medium max-w-lg mb-10 leading-relaxed italic">
                                        Reparos avançados com laudo técnico detalhado, peças genuínas e a agilidade que sua rotina exige. Deixe seu smartphone com quem entende de sistemas.
                                    </p>

                                    <button
                                        onClick={() => navigate('/register')}
                                        className="px-10 py-6 bg-slate-900 dark:bg-blue-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-600 dark:hover:bg-white dark:hover:text-blue-600 transition-all shadow-2xl shadow-blue-500/20 group active:scale-95"
                                    >
                                        <UserPlus size={20} strokeWidth={3} /> Criar Conta Agora <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>

                                {/* Preview Visual */}
                                <div className="relative animate-in fade-in zoom-in duration-1000 delay-300">
                                    <div className="absolute -inset-10 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-[100px] hidden dark:block"></div>
                                    <div className="relative bg-slate-900 dark:bg-slate-950 rounded-[3rem] p-4 shadow-2xl border-4 border-slate-100 dark:border-slate-800 md:rotate-2 hover:rotate-0 transition-transform duration-700 overflow-hidden group max-w-[90vw] mx-auto">
                                        <div className="bg-white dark:bg-[#020617] rounded-[3rem] p-12 aspect-square flex flex-col justify-center items-center text-center border-2 border-slate-100 dark:border-slate-800 shadow-inner">
                                            <div className="relative">
                                                <Smartphone size={100} className="text-blue-600 dark:text-blue-500 mb-6 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
                                                <Zap size={30} className="absolute -top-2 -right-2 text-amber-500 animate-pulse" fill="currentColor" />
                                            </div>
                                            <h4 className="font-black text-2xl text-slate-900 dark:text-white uppercase tracking-tighter italic">SGAT Dashboard</h4>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.3em] mt-3">Live Reparo // Status_01</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 2. LAB MONITOR WIDGET (O "Fechamento" da Home) */}
                        <section className="py-12 px-6">
                            <div className="max-w-7xl mx-auto">
                                <div
                                    onClick={() => mudarAba('sobre')}
                                    className="group cursor-pointer bg-slate-900 dark:bg-blue-900 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-8 hover:scale-[1.01] transition-all shadow-2xl border border-white/5"
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                                            <Activity size={32} className="animate-pulse" />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-black uppercase italic tracking-tighter text-2xl leading-none">Lab_Monitor: Ativo</h3>
                                            <p className="text-white/50 font-mono text-[10px] uppercase tracking-[0.2em] mt-2">Zona Sul // São Paulo // Node_01</p>
                                        </div>
                                    </div>

                                    {/* Stats Internos do Widget */}
                                    <div className="flex gap-12 border-l border-white/10 pl-12 hidden md:flex">
                                        <div className="text-center md:text-left">
                                            <p className="text-white font-black text-3xl tracking-tighter">100%</p>
                                            <p className="text-white/40 text-[9px] font-black uppercase tracking-widest">Integridade</p>
                                        </div>
                                        <div className="text-center md:text-left">
                                            <p className="text-white font-black text-3xl tracking-tighter">+1k</p>
                                            <p className="text-white/40 text-[9px] font-black uppercase tracking-widest">Labs_Done</p>
                                        </div>
                                    </div>

                                    {/* Botão de Ação do Widget */}
                                    <div className="flex items-center gap-4 px-8 py-5 bg-white text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest group-hover:bg-slate-100 transition-colors shadow-lg">
                                        Conhecer Engenharia <ChevronRight size={16} />
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                )}
                {/* SEÇÃO DE SERVIÇOS (REVELADA PELO MENU) */}
                {activeSection === 'servicos' && (
                    <main className="w-full flex flex-col items-center pt-32 md:pt-40 pb-24 px-4 md:px-8 box-border animate-in fade-in duration-700">
                        <div className="w-full md:max-w-7xl flex flex-col">

                            {/* HEADER DA SEÇÃO */}
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20">
                                <div className="max-w-2xl">
                                    <button
                                        onClick={() => mudarAba('inicio')}
                                        className="inline-flex items-center gap-3 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-black mb-8 group"
                                    >
                                        <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-2xl shadow-inner group-hover:scale-110 transition-transform">
                                            <ArrowLeft size={20} strokeWidth={3} />
                                        </div>
                                        <span className="uppercase tracking-[0.4em] text-[10px] italic text-slate-500">SYS_Return</span>
                                    </button>
                                    <h2 className="text-5xl md:text-7xl font-black text-slate-950 dark:text-white tracking-tighter leading-none uppercase italic">
                                        Catálogo de <span className="text-blue-600 dark:text-blue-500">Engenharia.</span>
                                    </h2>
                                    <p className="text-lg text-slate-500 dark:text-slate-400 font-medium max-w-xl italic mt-6 leading-relaxed">
                                        Protocolos de reparo avançado, microeletrônica e otimização sistêmica executados por analistas certificados na Zona Sul.
                                    </p>
                                </div>
                                <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">
                                    Lab_Status: <span className="text-emerald-500">OPERACIONAL</span> // {new Date().toLocaleDateString()}
                                </div>
                            </div>

                            {/* --- SELETOR DE CATEGORIAS (ABAS DINÂMICAS) --- */}
                            <div className="bg-slate-50 dark:bg-slate-950 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-4 md:p-6 mb-12 shadow-inner">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                                    {categorias.map((cat, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setAbaAtiva(i)}
                                            className={`
                    flex items-center gap-4 p-6 rounded-3xl text-left transition-all relative overflow-hidden
                    ${abaAtiva === i
                                                    ? 'bg-white dark:bg-slate-900 shadow-xl scale-[1.02] ring-1 ring-slate-200 dark:ring-slate-700'
                                                    : 'bg-transparent hover:bg-white/50 dark:hover:bg-white/5'}
                `}
                                        >
                                            {/* ÍCONE DINÂMICO */}
                                            <div className={`
                    p-4 rounded-2xl shadow-inner transition-all duration-500
                    ${abaAtiva === i
                                                    ? (cat.color === 'blue' ? 'bg-blue-600 text-white shadow-blue-500/40 shadow-lg' :
                                                        cat.color === 'emerald' ? 'bg-emerald-500 text-white shadow-emerald-500/40 shadow-lg' :
                                                            'bg-amber-500 text-white shadow-amber-500/40 shadow-lg')
                                                    : 'bg-slate-100 dark:bg-slate-900 text-slate-400'}
                `}>
                                                {cat.icon}
                                            </div>

                                            <div className="flex-1">
                                                <h4 className={`
                        font-black uppercase tracking-tighter italic text-base transition-colors
                        ${abaAtiva === i
                                                        ? (cat.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                                                            cat.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' :
                                                                'text-amber-600 dark:text-amber-400')
                                                        : 'text-slate-600 dark:text-slate-400'}
                    `}>
                                                    {cat.titulo}
                                                </h4>
                                                <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                                    {cat.id}
                                                </p>
                                            </div>

                                            {/* BARRA LATERAL INDICADORA */}
                                            {abaAtiva === i && (
                                                <div className={`
                        absolute left-0 top-0 bottom-0 w-1.5 animate-in slide-in-from-left duration-300
                        ${cat.color === 'blue' ? 'bg-blue-600' :
                                                        cat.color === 'emerald' ? 'bg-emerald-500' :
                                                            'bg-amber-500'}
                    `}></div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* PAINEL DE DETALHES (RENDERIZAÇÃO DINÂMICA) */}
                            {categorias.map((cat, i) => (abaAtiva === i && (
                                <div key={i} className="animate-in fade-in zoom-in-95 duration-500 grid grid-cols-1 lg:grid-cols-12 gap-10 bg-white dark:bg-slate-900 p-10 md:p-16 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-2xl shadow-blue-500/5">

                                    {/* DESCRIÇÃO TÉCNICA */}
                                    <div className="lg:col-span-5 space-y-8">
                                        <div className="flex items-center gap-6">
                                            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                                                {cat.icon}
                                            </div>
                                            <div>
                                                <h3 className="text-3xl font-black text-slate-950 dark:text-white uppercase tracking-tighter italic leading-none">{cat.titulo}</h3>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol_ID: {cat.id}</span>
                                            </div>
                                        </div>
                                        <p className="text-lg text-slate-600 dark:text-slate-300 font-medium italic leading-relaxed border-l-4 border-slate-100 dark:border-slate-800 pl-6">
                                            {cat.desc}
                                        </p>

                                        <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                                            <div className="flex items-center gap-3 text-emerald-500 text-xs font-black uppercase tracking-widest">
                                                <ShieldCheck size={16} /> Peças Homologadas // SGAT Supply Chain
                                            </div>
                                            <div className="flex items-center gap-3 text-amber-500 text-xs font-black uppercase tracking-widest">
                                                <Zap size={16} fill="currentColor" /> Reparo Express // Lead_Time: 2H-24H
                                            </div>
                                        </div>
                                    </div>

                                    {/* LISTA DE SERVIÇOS ESPECÍFICOS - DINÂMICA POR CORES */}
                                    <div className="lg:col-span-7 space-y-4">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">
                                            Procedimentos Disponíveis
                                        </p>

                                        {cat.servicos.map((s, idx) => (
                                            <div
                                                key={idx}
                                                className={`
                bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 
                flex items-center justify-between group transition-all hover:translate-x-2
                ${cat.color === 'blue' ? 'hover:border-blue-500/50' : ''}
                ${cat.color === 'emerald' ? 'hover:border-emerald-500/50' : ''}
                ${cat.color === 'amber' ? 'hover:border-amber-500/50' : ''}
            `}
                                            >
                                                <div className="flex items-center gap-5">
                                                    <span className={`
                    font-mono text-xs font-black transition-colors
                    ${cat.color === 'blue' ? 'group-hover:text-blue-500 text-slate-300 dark:text-slate-700' : ''}
                    ${cat.color === 'emerald' ? 'group-hover:text-emerald-500 text-slate-300 dark:text-slate-700' : ''}
                    ${cat.color === 'amber' ? 'group-hover:text-amber-500 text-slate-300 dark:text-slate-700' : ''}
                `}>
                                                        {(idx + 1).toString().padStart(2, '0')}
                                                    </span>

                                                    <p className={`
                    text-sm font-bold uppercase tracking-tight transition-colors text-slate-700 dark:text-slate-200
                    ${cat.color === 'blue' ? 'group-hover:text-blue-500' : ''}
                    ${cat.color === 'emerald' ? 'group-hover:text-emerald-500' : ''}
                    ${cat.color === 'amber' ? 'group-hover:text-amber-500' : ''}
                `}>
                                                        {s}
                                                    </p>
                                                </div>

                                                <ChevronRight
                                                    size={18}
                                                    className={`
                    transition-all text-slate-300 dark:text-slate-700
                    ${cat.color === 'blue' ? 'group-hover:text-blue-500' : ''}
                    ${cat.color === 'emerald' ? 'group-hover:text-emerald-500' : ''}
                    ${cat.color === 'amber' ? 'group-hover:text-amber-500' : ''}
                `}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )))}
                        </div>
                    </main>
                )}

            </main>

            {/* --- SEÇÃO SOBRE: O DOSSIÊ DE ENGENHARIA --- */}
            {activeSection === 'sobre' && (
                <main className="pt-32 pb-24 px-6 animate-in slide-in-from-right-8 duration-1000">
                    <div className="max-w-6xl mx-auto">

                        {/* 1. HEADER DE IMPACTO: O MANIFESTO */}
                        <div className="mb-24 relative">
                            <div className="absolute -top-10 -left-10 text-[120px] font-black text-slate-100 dark:text-white/5 select-none -z-10">
                                ABOUT_US
                            </div>
                            <span className="text-blue-600 dark:text-blue-500 font-black uppercase text-[10px] tracking-[0.5em] mb-4 block">
                                Protocolo de Excelência // Zona Sul SP
                            </span>
                            <h2 className="text-6xl md:text-8xl font-black text-slate-950 dark:text-white tracking-tighter leading-[0.85] uppercase italic mb-8">
                                Não é apenas <br />
                                <span className="text-blue-600 underline decoration-blue-600/20">reparo.</span> <br />
                                É engenharia.
                            </h2>
                            <p className="text-xl md:text-2xl text-slate-500 dark:text-slate-400 max-w-3xl font-medium italic leading-relaxed">
                                Na SGAT, tratamos cada dispositivo como um ecossistema. Unimos a precisão da **Análise de Sistemas** com a delicadeza da microeletrônica para entregar performance, não apenas conserto.
                            </p>
                        </div>

                        {/* 2. BENTO GRID: OS PILARES DE CONFIANÇA */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-20">

                            {/* Card Liderança Técnica */}
                            <div className="md:col-span-8 bg-slate-900 dark:bg-blue-700 rounded-[3.5rem] p-12 text-white relative overflow-hidden group shadow-2xl">
                                <Cpu className="absolute -right-16 -bottom-16 text-white/10 group-hover:rotate-45 transition-transform duration-1000" size={300} />
                                <div className="relative z-10">
                                    <h4 className="text-3xl font-black uppercase italic mb-6">Visão de Analista</h4>
                                    <p className="text-slate-300 dark:text-blue-100 text-lg leading-relaxed max-w-xl italic">
                                        Fundada por Lucas, Systems Analyst, a SGAT aplica metodologias de **debug de software** no diagnóstico de hardware. Isso significa que identificamos a causa raiz, evitando que o problema retorne.
                                    </p>
                                </div>
                            </div>

                            {/* Card Status Real-time */}
                            <div className="md:col-span-4 bg-slate-100 dark:bg-slate-900 rounded-[3.5rem] p-10 border border-slate-200 dark:border-slate-800 flex flex-col justify-between group">
                                <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                    <Activity className="text-emerald-500" size={28} />
                                </div>
                                <div>
                                    <h4 className="text-xl font-black uppercase italic dark:text-white mb-2">99.8% Success</h4>
                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-tight">Taxa de recuperação em dispositivos condenados por terceiros.</p>
                                </div>
                            </div>

                            {/* Card Rastreabilidade */}
                            <div className="md:col-span-4 bg-blue-50 dark:bg-slate-950 rounded-[3.5rem] p-10 border border-blue-100 dark:border-slate-800 group">
                                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-6">
                                    <ShieldCheck size={28} />
                                </div>
                                <h4 className="text-xl font-black uppercase italic dark:text-white mb-3">Garantia Sistêmica</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium italic">Todo serviço gera um Token Único de autenticidade e histórico de manutenção.</p>
                            </div>

                            {/* Card Entrega Express */}
                            <div className="md:col-span-8 bg-white dark:bg-slate-900 rounded-[3.5rem] p-12 border-2 border-slate-50 dark:border-slate-800 flex flex-col md:flex-row items-center gap-10 group shadow-sm">
                                <div className="text-center md:text-left">
                                    <h4 className="text-3xl font-black uppercase italic dark:text-white mb-4">Logística SUL_SP</h4>
                                    <p className="text-slate-500 dark:text-slate-400 font-medium italic mb-6">Operação otimizada na Zona Sul para coletas e entregas em tempo recorde.</p>
                                    <div className="flex gap-4">
                                        <span className="px-4 py-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Moema</span>
                                        <span className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest">Itaim</span>
                                        <span className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest">Morumbi</span>
                                    </div>
                                </div>
                                <div className="hidden lg:block w-32 h-32 bg-blue-600/10 rounded-full animate-pulse flex items-center justify-center text-blue-600">
                                    <Zap size={48} fill="currentColor" />
                                </div>
                            </div>
                        </div>

                        {/* 3. CTA FINAL: O CONVITE AO SISTEMA */}
                        <div className="bg-slate-950 rounded-[4rem] p-12 md:p-20 text-center relative overflow-hidden">
                            <div className="relative z-10">
                                <h3 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase italic mb-8">
                                    Pronto para o próximo <br /> <span className="text-blue-500">nível de suporte?</span>
                                </h3>
                                <p className="text-slate-400 max-w-xl mx-auto mb-12 font-medium italic">
                                    Crie sua conta no SGAT e experimente a transparência de acompanhar seu reparo em tempo real, com laudos técnicos direto no seu dashboard.
                                </p>
                                <button
                                    onClick={() => navigate('/register')}
                                    className="px-12 py-6 bg-blue-600 text-white rounded-full font-black uppercase tracking-widest hover:bg-white hover:text-blue-600 transition-all shadow-2xl active:scale-95"
                                >
                                    Iniciar Protocolo de Reparo
                                </button>
                            </div>
                            {/* Brilho decorativo de fundo */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-500/10 blur-[120px]"></div>
                        </div>

                    </div>
                </main>
            )}

            {/* --- FOOTER (PERSISTENTE) --- */}
            <footer className="py-20 px-6 bg-white dark:bg-[#020617] border-t border-slate-100 dark:border-slate-800 transition-colors mt-auto">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-12">

                        {/* BRANDING */}
                        <div className="flex flex-col items-center md:items-start">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-slate-900 dark:bg-blue-600 rounded-lg flex items-center justify-center text-white">
                                    <Cpu size={16} />
                                </div>
                                <span className="text-lg font-black tracking-tighter uppercase dark:text-white">
                                    SGAT<span className="text-blue-600">.</span>
                                </span>
                            </div>
                            <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.5em]">
                                © 2026 SGAT • DESENVOLVIDO POR LUCAS
                            </p>
                        </div>

                        {/* LINKS RÁPIDOS */}
                        <div className="flex gap-12 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                            <div className="flex flex-col gap-3">
                                <span className="text-slate-900 dark:text-slate-200">Localização</span>
                                <span className="opacity-70">SÃO PAULO, SP</span>
                                <span className="opacity-70">ZONA SUL</span>
                            </div>
                            <div className="flex flex-col gap-3">
                                <span className="text-slate-900 dark:text-slate-200">Contato</span>
                                <a href="#" className="hover:text-blue-600 transition-colors">WhatsApp</a>
                                <a href="#" className="hover:text-blue-600 transition-colors">Instagram</a>
                            </div>
                        </div>

                        {/* BACK TO TOP */}
                        <button
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            className="p-4 bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white rounded-full hover:bg-blue-600 hover:text-white transition-all active:scale-90 shadow-lg"
                            title="Voltar ao topo"
                        >
                            <ArrowUp size={20} />
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;