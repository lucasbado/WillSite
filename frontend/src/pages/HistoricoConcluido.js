import React, { useEffect, useState } from 'react';
import {
    CheckCircle2, ArrowLeft, X, Printer, Package,
    Smartphone, User, Search, Calendar, ChevronRight, Cpu
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import { IMaskInput } from 'react-imask';

const HistoricoConcluidos = () => {
    const [concluidas, setConcluidas] = useState([]);
    const [detalhesOS, setDetalhesOS] = useState(null);
    const [filtro, setFiltro] = useState('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const carregarConcluidos = async () => {
        setLoading(true);
        try {
            const res = await api.get('/os/admin/concluidas');
            setConcluidas(res.data);
        } catch (err) {
            console.error("Erro ao carregar concluídos", err);
        } finally {
            // Delay tático para suavizar a transição visual e mostrar o design brutalista
            setTimeout(() => setLoading(false), 600);
        }
    };

    const verDetalhes = async (id) => {
        try {
            const res = await api.get(`/os/detalhes/${id}`);
            setDetalhesOS(res.data);
        } catch (err) { alert("Erro ao carregar detalhes."); }
    };

    useEffect(() => { carregarConcluidos(); }, []);

    const listaFiltrada = concluidas.filter(os =>
        os.cliente.toLowerCase().includes(filtro.toLowerCase()) ||
        os.modelo.toLowerCase().includes(filtro.toLowerCase())
    );

    return (
        /* 1. TRAVAMOS O BODY: h-screen impede o scroll da página inteira. flex-col organiza topo e corpo. */
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-[#020617] font-sans transition-colors duration-500 flex flex-col">

            {/* --- HEADER DASHBOARD (Fixo no topo através do flex-none) --- */}
            <div className="flex-none bg-white/80 dark:bg-[#020617]/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 z-30 shadow-sm print:hidden">
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 md:h-24 flex items-center justify-between">
                    <div className="flex items-center gap-4 md:gap-6">
                        <button
                            onClick={() => navigate('/admin/dashboard')}
                            className="p-3 bg-slate-50 dark:bg-slate-900 hover:bg-slate-900 hover:text-white dark:hover:bg-blue-600 rounded-2xl transition-all active:scale-95 text-slate-600 dark:text-slate-400 border border-transparent dark:border-slate-800"
                        >
                            <ArrowLeft size={24} strokeWidth={3} />
                        </button>
                        <div>
                            <h2 className="text-xl md:text-3xl font-black text-slate-800 dark:text-slate-50 tracking-tighter leading-none uppercase italic">
                                Arquivo <span className="text-blue-600 dark:text-blue-500">de OS</span>
                            </h2>
                            <p className="hidden md:block text-blue-600 dark:text-blue-500 font-black text-[10px] uppercase tracking-[0.2em] mt-1">Histórico de Sucesso SGAT</p>
                        </div>
                    </div>

                    {/* Busca: bg-slate-50 | Dark: bg-slate-950 */}
                    <div className="relative hidden md:block w-80 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 group-focus-within:text-emerald-500 transition-colors" size={18} />
                        <input
                            placeholder="Buscar no histórico..."
                            className="w-full bg-slate-50 dark:bg-slate-950 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold border-2 border-transparent dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 transition-all outline-none text-slate-800 dark:text-slate-200"
                            value={filtro}
                            onChange={(e) => setFiltro(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Área de conteúdo que permite o scroll e utiliza sua classe do index.css */}
            <main className="flex-1 overflow-y-auto modern-scroll-v print:hidden">
                <div className="max-w-5xl mx-auto px-4 md:px-6 pt-8 md:pt-12">
                    
                    {/* SUBHEADER INFORMATIVO */}
                    <div className="flex items-center justify-between mb-8 px-2 md:px-0">
                        <h3 className="text-[10px] md:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-emerald-500" /> Serviços Finalizados
                        </h3>
                        {!loading && (
                            <span className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 px-4 py-1.5 rounded-full border border-slate-100 dark:border-slate-800 animate-in fade-in">
                                Total: {listaFiltrada.length}
                            </span>
                        )}
                    </div>

                    {/* LISTAGEM DE CARDS */}
                    <div className="grid gap-4 md:gap-6 pb-20">
                        {loading ? (
                            /* --- SKELETON LOADING BRUTALISTA --- */
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between animate-pulse">
                                    <div className="flex items-center gap-6">
                                        <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-100 dark:bg-slate-800 rounded-3xl"></div>
                                        <div className="space-y-3">
                                            <div className="h-2 w-20 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
                                            <div className="h-5 w-32 md:w-48 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : listaFiltrada.length === 0 ? (
                            /* --- ESTADO VAZIO --- */
                            <div className="bg-white dark:bg-slate-900 p-12 md:p-20 rounded-[3rem] md:rounded-[4rem] text-center border-4 border-dashed border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in transition-colors">
                                <Search size={48} className="text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                                <p className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest text-[10px] italic">
                                    Nenhum registro encontrado no arquivo.
                                </p>
                            </div>
                        ) : (
                            /* --- LISTA REAL COM ANIMAÇÃO --- */
                            <div className="space-y-4 md:space-y-6">
                                {listaFiltrada.map((os, index) => (
                                    <div
                                        key={os.id}
                                        onClick={() => verDetalhes(os.id)}
                                        style={{ animationDelay: `${index * 50}ms` }}
                                        className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl dark:hover:shadow-emerald-900/10 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between group overflow-hidden relative animate-in fade-in slide-in-from-bottom-2"
                                    >
                                        {/* Linha Lateral Brutalista (Ativada no Hover) */}
                                        <div className="absolute left-0 top-0 bottom-0 w-2 bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                        <div className="flex items-center gap-4 md:gap-6">
                                            {/* Ícone: bg-emerald-50 | Dark: bg-emerald-900/20 */}
                                            <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 dark:text-emerald-400 p-4 md:p-5 rounded-2xl md:rounded-3xl transition-transform duration-500 group-hover:rotate-[10deg] shadow-inner shrink-0">
                                                <Smartphone size={window.innerWidth < 768 ? 24 : 32} />
                                            </div>

                                            <div className="flex flex-col">
                                                <p className="text-[9px] md:text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em] mb-1">
                                                    OS #{os.id}
                                                </p>
                                                <h3 className="text-base md:text-xl font-black text-slate-800 dark:text-slate-100 tracking-tighter leading-tight uppercase group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors italic">
                                                    {os.modelo}
                                                </h3>
                                                <p className="text-xs md:text-sm text-slate-400 dark:text-slate-500 font-bold flex items-center gap-1 mt-1">
                                                    <User size={14} className="opacity-50 text-emerald-500" /> {os.cliente}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between md:justify-end gap-6 md:gap-10 mt-6 md:mt-0 px-2 md:px-4 border-t md:border-t-0 border-slate-50 dark:border-slate-800 pt-4 md:pt-0">
                                            <div className="text-left md:text-right">
                                                <p className="text-[8px] md:text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest mb-1">Finalização</p>
                                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-black justify-start md:justify-end">
                                                    <Calendar size={14} className="text-emerald-500" />
                                                    <span className="text-xs md:text-sm tracking-tighter">{os.data_finalizacao}</span>
                                                </div>
                                            </div>

                                            {/* Botão de Seta Brutalista */}
                                            <div className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 rounded-2xl group-hover:bg-emerald-500 dark:group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-xl active:scale-90">
                                                <ChevronRight size={20} strokeWidth={3} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* --- MODAL DE DETALHES / VISUALIZAÇÃO DE RELATÓRIO --- */}
            {detalhesOS && (
                <>
                    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-end md:items-center justify-center p-0 md:p-6 z-[100] print:hidden animate-in fade-in duration-300">

                        {/* Container Principal: Full screen mobile | Centralizado Desktop */}
                        <div className="bg-white dark:bg-slate-900 rounded-t-[3rem] md:rounded-[4rem] max-w-4xl w-full h-[90vh] md:h-auto flex flex-col md:flex-row overflow-hidden shadow-3xl border border-transparent dark:border-slate-800 transition-all">

                            {/* 1. Lado Escuro: Resumo Visual (Sidebar no Desktop | Header no Mobile) */}
                            <div className="w-full md:w-1/3 bg-slate-950 p-8 md:p-12 flex flex-col justify-between relative overflow-hidden text-white shrink-0">
                                <div className="absolute -top-20 -left-20 w-64 h-64 bg-emerald-600/20 rounded-full blur-[80px]"></div>

                                <div className="relative z-10 flex justify-between items-start md:block">
                                    <div>
                                        <div className="w-14 h-14 md:w-16 md:h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mb-4 md:mb-8 shadow-xl shadow-emerald-500/20 transition-transform hover:scale-105">
                                            <CheckCircle2 size={32} strokeWidth={3} />
                                        </div>
                                        <h3 className="text-2xl md:text-4xl font-black tracking-tighter uppercase leading-none mb-2 md:mb-4 italic">
                                            Serviço <br className="hidden md:block" /> Finalizado
                                        </h3>
                                        <p className="text-emerald-400 font-black uppercase text-[8px] md:text-[10px] tracking-[0.3em]">
                                            ID Gerencial: #{detalhesOS.os_info?.id}
                                        </p>
                                    </div>
                                    {/* Botão fechar mobile dentro da parte dark */}
                                    <button onClick={() => setDetalhesOS(null)} className="md:hidden text-slate-500 hover:text-white p-2">
                                        <X size={32} />
                                    </button>
                                </div>

                                <div className="relative z-10 bg-white/5 p-6 md:p-8 rounded-[2rem] border border-white/10 mt-6 md:mt-0">
                                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Informações Técnicas</p>
                                    <div className="space-y-3 md:space-y-4 text-[10px] md:text-xs font-black text-slate-200 uppercase tracking-tight">
                                        <div className="flex justify-between border-b border-white/5 pb-2">
                                            <span className="opacity-50">Técnico:</span>
                                            <span>Lucas SGAT</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="opacity-50">Peças:</span>
                                            <span>{detalhesOS.pecas_utilizadas?.length || 0} itens</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Lado Claro/Dark: Detalhes e Ação */}
                            <div className="w-full md:w-2/3 p-8 md:p-16 relative overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900 transition-colors">
                                {/* Botão fechar desktop */}
                                <button onClick={() => setDetalhesOS(null)} className="hidden md:block absolute top-10 right-10 text-slate-300 dark:text-slate-600 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                                    <X size={32} />
                                </button>

                                <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-50 tracking-tighter mb-8 md:mb-10 uppercase italic leading-none">
                                    Revisão do Relatório
                                </h2>

                                <div className="space-y-6 md:space-y-8 pb-10 md:pb-0">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-slate-50 dark:bg-slate-950 p-5 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-800 transition-colors">
                                            <p className="text-[9px] md:text-[10px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-widest mb-1">Cliente</p>
                                            <p className="font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">
                                                {detalhesOS.cliente_info?.nome}
                                            </p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-950 p-5 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-800 transition-colors">
                                            <p className="text-[9px] md:text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-1">Equipamento</p>
                                            <p className="font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">
                                                {detalhesOS.os_info?.modelo}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-950 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 transition-colors">
                                        <p className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Laudo de Solução</p>
                                        <p className="text-slate-700 dark:text-slate-300 font-bold italic leading-relaxed text-sm md:text-base">
                                            "{detalhesOS.os_info?.laudo_tecnico || "Reparo realizado com sucesso conforme padrões SGAT."}"
                                        </p>
                                    </div>

                                    {/* Botão de Impressão (High-Tech) */}
                                    <button
                                        onClick={() => window.print()}
                                        className="w-full bg-slate-900 dark:bg-blue-600 text-white py-5 md:py-7 rounded-2xl md:rounded-[2.5rem] font-black text-base md:text-xl flex items-center justify-center gap-4 hover:bg-blue-600 dark:hover:bg-blue-500 transition-all shadow-xl dark:shadow-blue-900/20 active:scale-95 uppercase italic tracking-tight"
                                    >
                                        <Printer size={28} strokeWidth={2.5} /> IMPRIMIR RELATÓRIO
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- ÁREA DE IMPRESSÃO (SGAT TECHNICAL STANDARD) --- */}
                    <div id="print-area-wrapper" className="hidden print:block bg-white text-slate-900 p-12">
                        <div className="flex justify-between items-start mb-12 border-b-8 border-slate-900 pb-8">
                            <div>
                                <h3 className="text-4xl font-black tracking-tighter uppercase leading-none italic">SGAT - Assistência Técnica</h3>
                                <p className="text-slate-600 font-bold uppercase text-sm tracking-[0.3em] mt-3">Recibo de Prestação de Serviços Técnicos</p>
                            </div>
                            <div className="text-right">
                                <p className="font-black text-2xl tracking-tighter uppercase bg-slate-900 text-white px-4 py-1 inline-block">Recibo Avulso</p>
                                <p className="text-sm font-bold mt-2 uppercase font-mono">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-12 mb-12">
                            <div className="border-l-8 border-blue-600 pl-8 space-y-2">
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Responsável Legal</p>
                                <p className="text-2xl font-black text-slate-900 uppercase leading-none">
                                    {detalhesOS.cliente_info?.nome || "CONSUMIDOR FINAL"}
                                </p>

                                <div className="flex items-center gap-1 text-base font-black font-mono text-slate-800 tracking-tighter italic">
                                    <span>CPF:</span>
                                    <IMaskInput
                                        mask="000.000.000-00"
                                        value={detalhesOS.cliente_info?.cpf || ""}
                                        readOnly
                                        className="bg-transparent border-none outline-none w-full font-mono"
                                    />
                                </div>

                                <div className="flex gap-6 mt-2">
                                    <div className="flex items-center gap-1 text-sm font-black text-slate-600 uppercase font-mono">
                                        <span>TEL:</span>
                                        <IMaskInput
                                            mask="(00) 00000-0000"
                                            value={detalhesOS.cliente_info?.telefone || ""}
                                            readOnly
                                            className="bg-transparent border-none outline-none w-[140px]"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1 text-sm font-black text-slate-600 uppercase font-mono">
                                        <span>CEP:</span>
                                        <IMaskInput
                                            mask="00000-000"
                                            value={detalhesOS.cliente_info?.cep || ""}
                                            readOnly
                                            className="bg-transparent border-none outline-none w-[100px]"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="text-right border-r-8 border-emerald-500 pr-8">
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Equipamento Vinculado</p>
                                <p className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">{detalhesOS.os_info?.modelo || "N/A"}</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 border-4 border-slate-900 p-10 rounded-[3rem] mb-12 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5"><Cpu size={100} /></div>
                            <p className="text-[11px] font-black text-slate-900 uppercase tracking-[0.4em] mb-4 border-b-2 border-slate-200 pb-3 italic">Laudo Técnico / Procedimentos</p>
                            <p className="text-slate-800 leading-relaxed font-black text-lg whitespace-pre-wrap uppercase italic">{detalhesOS.os_info?.laudo_tecnico || "Mão de obra técnica especializada."}</p>
                        </div>

                        <div className="mb-16">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-5 ml-6 italic">Insumos & Componentes Aplicados</p>
                            <table className="w-full text-left ounded-[2.5rem] ">
                                <thead>
                                    <tr className="bg-slate-900 text-white font-mono">
                                        <th className="px-8 py-5 font-black uppercase text-sm tracking-widest">Descrição do Material</th>
                                        <th className="px-8 py-5 text-right font-black uppercase text-sm tracking-tighter">Qtd</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y-2 divide-slate-100">
                                    {detalhesOS.pecas_utilizadas?.map((p, i) => (
                                        <tr key={i} className="bg-white">
                                            <td className="px-8 py-5 font-black text-slate-800 uppercase text-base italic">{p.nome}</td>
                                            <td className="px-8 py-5 text-right font-black text-3xl text-slate-900 tracking-tighter">x{p.quantidade}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* --- BLOCO DE ASSINATURAS (PROTEGIDO CONTRA QUEBRA) --- */}
                        <div className="mt-20 print:mt-32 grid grid-cols-2 gap-32 print:break-inside-avoid">
                            {/* Campo: Técnico */}
                            <div className="flex flex-col items-center">
                                {/* Espaço extra para a rubrica/assinatura manual */}
                                <div className="h-50 w-full bg-transparent"></div>
                                <div className="w-full border-t-4 border-slate-900 mb-4 shadow-sm"></div>
                                <div className="flex flex-col items-center leading-none">
                                    <p className="text-[12px] font-black uppercase text-slate-400 tracking-[0.5em] italic text-center">
                                        Técnico Responsável
                                    </p>
                                </div>
                            </div>

                            {/* Campo: Cliente */}
                            <div className="flex flex-col items-center">
                                {/* Espaço extra para a rubrica/assinatura manual */}
                                <div className="h-50 w-full bg-transparent"></div>
                                <div className="w-full border-t-4 border-slate-900 mb-4 shadow-sm"></div>
                                <div className="flex flex-col items-center leading-none">
                                    <p className="text-[12px] font-black uppercase text-slate-400 tracking-[0.5em] italic text-center">
                                        Titular Responsável
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="hidden print:flex print-footer-watermark flex-col items-center justify-center w-full">
                            {/* Linha técnica separadora (opcional, para design industrial) */}
                            <div className="w-1/2 h-px bg-slate-200 mb-4 opacity-50"></div>

                            <div className="flex flex-col items-center gap-1">
                                <p className="text-[7px] font-black uppercase text-slate-300 tracking-[0.4em] italic leading-none">
                                    SGAT Technical Solutions
                                </p>
                                <div className="flex items-center gap-4 mt-1">
                                    <span className="text-[7px] font-black text-slate-200 uppercase tracking-widest">Command Center São Paulo, SP</span>

                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default HistoricoConcluidos;