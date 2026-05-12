import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Cpu, Database, Search, Zap, CheckCircle, ChevronRight } from 'lucide-react';

const Servicos = () => {
    const navigate = useNavigate();
    const [abaAtiva, setAbaAtiva] = useState(0);

    const categorias = [
        {
            id: "HW_ENG_N01",
            titulo: "Hardware & Microengenharia",
            icon: <Cpu className="text-blue-500" size={28} strokeWidth={2.5} />,
            desc: "Análise e reparo em nível de componente, reconstrução de trilhas e microeletrônica avançada.",
            color: "blue",
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
            icon: <Database className="text-emerald-500" size={28} strokeWidth={2.5} />,
            desc: "Restauração de integridade do sistema operacional, otimização de kernel e segurança de dados.",
            color: "emerald",
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
            icon: <Search className="text-amber-500" size={28} strokeWidth={2.5} />,
            desc: "Emissão de laudos técnicos para seguradoras, perícia em dispositivos e consultoria de upgrade.",
            color: "amber",
            servicos: [
                "Laudo Técnico Especializado // Certificação de Danos",
                "Consultoria para Upgrade de Componentes // Análise de Viabilidade",
                "Recuperação de Aparelhos Molhados // Protocolo de Secagem Rápida",
                "Perícia Digital // Recuperação Forense de Dados"
            ]
        }
    ];

    return (
        /* BLINDAGEM TOTAL: relative, min-h-screen, w-screen, overflow-hidden. O bug morre aqui. */
        <div className="relative min-h-screen w-screen bg-white dark:bg-[#020617] overflow-hidden transition-colors duration-500 font-sans selection:bg-blue-500 selection:text-white">

            {/* Efeito de Fundo: Grid de Linhas de Circuito (Sutil) */}
            <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: 'linear-gradient(#4a5568 1px, transparent 1px), linear-gradient(90deg, #4a5568 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
            </div>

            {/* --- NAVBAR FIXA (ESTILO TERMINAL) --- */}
            <nav className="fixed top-0 left-0 right-0 w-full z-50 bg-white/80 dark:bg-[#020617]/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 h-20">
                <div className="max-w-7xl mx-auto px-5 md:px-8 h-full flex items-center justify-between">
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigate('/home')}>
                        <div className="w-10 h-10 bg-slate-900 dark:bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg relative">
                            <Cpu size={22} />
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-[#020617] animate-pulse"></div>
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-xl font-black tracking-tighter uppercase dark:text-white">SGAT<span className="text-blue-600 dark:text-blue-400">.</span></span>
                            <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Systems Analyst // Node_01</span>
                        </div>
                    </div>
                </div>
            </nav>

            {/* MAIN CONTENT CONTAINER */}
            <main className="w-full flex flex-col items-center pt-32 md:pt-40 pb-24 px-4 md:px-8 box-border">
                {/* Removemos o max-w-7xl da div imediata para ela não 'encolher' no mobile */}
                <div className="w-full md:max-w-7xl flex flex-col">

                    {/* VOLTAR & HEADER (DESIGN BRUTALISTA) */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20 animate-in fade-in duration-700">
                        <div className="max-w-2xl">
                            <button
                                onClick={() => navigate('/home')}
                                className="inline-flex items-center gap-3 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-black mb-8 group"
                            >
                                <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-2xl shadow-inner group-hover:scale-110 transition-transform">
                                    <ArrowLeft size={20} strokeWidth={3} />
                                </div>
                                <span className="uppercase tracking-[0.4em] text-[10px] italic">SYS_Return</span>
                            </button>
                            <h2 className="text-5xl md:text-7xl font-black text-slate-950 dark:text-white tracking-tighter leading-none uppercase italic">
                                Catálogo de <span className="text-blue-600 dark:text-blue-500">Engenharia.</span>
                            </h2>
                            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium max-w-xl italic mt-6leading-relaxed">
                                Protocolos de reparo avançado, microeletrônica e otimização sistêmica executados por analistas certificados.
                            </p>
                        </div>
                        <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">
                            Lab_Status: <span className="text-emerald-500">OPERACIONAL</span> // {new Date().toLocaleDateString()}
                        </div>
                    </div>

                    {/* --- NOVA ABORDAGEM: ABAS DE TERMINAL (ÓTIMO P/ MOBILE & IMPRESSIONA) --- */}
                    <div className="bg-slate-50 dark:bg-slate-950 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-4 md:p-6 mb-12 shadow-inner">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                            {categorias.map((cat, i) => (
                                <button
                                    key={i}
                                    onClick={() => setAbaAtiva(i)}
                                    className={`flex items-center gap-4 p-6 rounded-3xl text-left transition-all relative overflow-hidden ${abaAtiva === i ? 'bg-white dark:bg-slate-900 shadow-xl' : 'bg-transparent hover:bg-white/50 dark:hover:bg-white/5'}`}
                                >
                                    <div className={`p-4 rounded-2xl shadow-inner transition-colors ${abaAtiva === i ? 'bg-slate-900 dark:bg-slate-800' : 'bg-slate-100 dark:bg-slate-900'}`}>{cat.icon}</div>
                                    <div className="flex-1">
                                        <h4 className={`font-black uppercase tracking-tighter italic text-base ${abaAtiva === i ? 'text-slate-950 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>{cat.titulo}</h4>
                                        <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{cat.id}</p>
                                    </div>
                                    {abaAtiva === i && (
                                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-${cat.color}-500`}></div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* --- PAINEL DE DETALHES DA CATEGORIA (O QUE IMPRESSIONA) --- */}
                    {categorias.map((cat, i) => (abaAtiva === i && (
                        <div key={i} className="animate-in fade-in zoom-in duration-500 grid grid-cols-1 lg:grid-cols-12 gap-10 bg-white dark:bg-slate-900 p-10 md:p-16 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-2xl shadow-blue-500/5">

                            {/* LADO ESQUERDO: DESCRIÇÃO TÉCNICA */}
                            <div className="lg:col-span-5 space-y-8">
                                <div className="flex items-center gap-6">
                                    <div className={`w-16 h-16 bg-${cat.color}-50 dark:bg-${cat.color}-900/30 text-${cat.color}-500 rounded-2xl flex items-center justify-center shadow-inner`}>
                                        {cat.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-black text-slate-950 dark:text-white uppercase tracking-tighter italicleading-none">{cat.titulo}</h3>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol_ID: {cat.id}</span>
                                    </div>
                                </div>
                                <p className="text-lg text-slate-600 dark:text-slate-300 font-medium italic leading-relaxed border-l-4 border-slate-100 dark:border-slate-800 pl-6">
                                    {cat.desc}
                                </p>
                                <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                                    <div className="flex items-center gap-3 text-emerald-500 text-xs font-black uppercase tracking-widest">
                                        <CheckCircle size={16} /> Peças Homologadas // SGAT Supply Chain
                                    </div>
                                    <div className="flex items-center gap-3 text-amber-500 text-xs font-black uppercase tracking-widest">
                                        <Zap size={16} fill="currentColor" /> Reparo Express // Lead_Time: 2H a 24H
                                    </div>
                                </div>
                            </div>

                            {/* LADO DIREITO: LISTA DE PROTOCOLOS (SERVIÇOS) */}
                            <div className="lg:col-span-7 space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Protocolos de Intervenção Disponíveis</p>
                                {cat.servicos.map((s, idx) => (
                                    <div key={idx} className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:border-blue-500/50 transition-colors">
                                        <div className="flex items-center gap-5">
                                            <span className="font-mono text-sm text-slate-300 dark:text-slate-700 font-black">{(idx + 1).toString().padStart(2, '0')}</span>
                                            <p className="text-sm text-slate-700 dark:text-slate-200 font-bold uppercase tracking-tight group-hover:text-blue-500 transition-colors">
                                                {s}
                                            </p>
                                        </div>
                                        <ChevronRight size={18} className="text-slate-300 dark:text-slate-700 group-hover:text-blue-500 transition-colors" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )))}

                </div>
            </main>
        </div>
    );
};

export default Servicos;