import React, { useState, useEffect } from 'react';
import {
    TrendingUp, AlertTriangle, DollarSign, Package,
    ArrowLeft, BarChart3, PieChart, Activity,X,
    Layers, Zap, ArrowUpRight, ArrowDownRight, Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from './api';

const DashboardFinanceiro = () => {
    const navigate = useNavigate();
    const [estoque, setEstoque] = useState([]);
    const [stats, setStats] = useState({
        patrimonioTotal: 0,
        lucroPotencial: 0,
        pecasQuebradas: 0,
        valorDesperdicio: 0,
        volumeConsertos: 0,
        taxaSucesso: 0,
        rankingPerdas: [],
        receitaTotal: 0,
        custosOperacionais: 0,
        porMarca: [],
        perdasPorMotivo: []
    });

    const [isLossModalOpen, setIsLossModalOpen] = useState(false);
    const [lossData, setLossData] = useState({ item_id: '', quantidade: 1, motivo: '' });

    // Altere o useEffect no seu arquivo DashboardFinanceiro.js
    const registrarPerda = async (id) => {
        const motivo = window.prompt("Motivo da perda (ex: Quebra na montagem, Defeito de fábrica):");
        if (motivo) {
            try {
                await api.post(`/estoque/registrar-perda/${id}`, { motivo });
                carregarDadosFinanceiros(); // Atualiza a lista
                alert("Perda registrada no fluxo financeiro.");
            } catch (err) {
                alert("Erro ao registrar perda.");
            }
        }
    };

    const [loading, setLoading] = useState(true);

    const carregarDadosFinanceiros = async () => {
        try {
            setLoading(true);
            const [resStats, resEstoque] = await Promise.all([
                api.get('/os/admin/financeiro/stats'),
                api.get('/estoque/')
            ]);
            setStats(resStats.data);
            setEstoque(resEstoque.data);
        } catch (err) {
            console.error("Erro ao carregar métricas Cidinho:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarDadosFinanceiros();
    }, []);




    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-500/30">

            {/* BACKGROUND DE ENGENHARIA ADAPTATIVO */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-0 w-full h-full bg-slate-50 dark:bg-[#020617] transition-colors duration-500"></div>
                <div className="absolute top-0 left-0 w-full h-full opacity-20 dark:opacity-40 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]"></div>
            </div>

            {/* HEADER RESPONSIVO */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 pt-6 md:pt-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 md:mb-12">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-3 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-900 hover:text-white dark:hover:bg-blue-600 transition-all active:scale-90"
                        >
                            <ArrowLeft size={24} strokeWidth={3} />
                        </button>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic leading-none dark:text-slate-50">
                                Financial<span className="text-blue-600 dark:text-blue-500">Analytics</span>
                            </h2>
                            <p className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mt-1.5 md:mt-2">
                                Cidinho / Profit & Loss Management
                            </p>
                        </div>
                    </div>

                    {/* Badge visível apenas em telas maiores ou adaptada para mobile */}
                    <div className="flex items-center gap-2 w-fit bg-emerald-500/10 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-full border border-emerald-500/20">
                        <Activity size={14} className="animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Real-time Sincronizado</span>
                    </div>
                </div>

                {/* --- GRID DE CARDS PRINCIPAIS (SCROLL NO MOBILE) --- */}
                <div className="flex overflow-x-auto md:grid md:grid-cols-6 gap-4 md:gap-6 mb-12 pb-4 md:pb-0 no-scrollbar snap-x snap-mandatory">

                    {/* CARD: PATRIMÔNIO */}
                    <div className="min-w-[85%] md:min-w-0 snap-center bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden group shrink-0">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform duration-700 dark:text-white">
                            <Layers size={80} />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 italic">Patrimônio em Peças</p>
                        <h3 className="text-2xl md:text-3xl font-black tracking-tighter text-slate-800 dark:text-slate-100 italic leading-none">
                            R$ {stats.patrimonioTotal.toLocaleString('pt-BR')}
                        </h3>
                        <div className="mt-4 flex items-center gap-2 text-blue-500 dark:text-blue-400 font-black text-[9px] uppercase">
                            <Package size={14} /> {stats.volumeConsertos} SKUs ativos
                        </div>
                    </div>

                    {/* CARD: RECEITA TOTAL */}
                    <div className="min-w-[85%] md:min-w-0 snap-center bg-emerald-600 dark:bg-emerald-600 p-6 md:p-8 rounded-[2.5rem] border border-transparent shadow-2xl shadow-emerald-500/20 relative overflow-hidden group shrink-0">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <DollarSign size={80} className="text-white" />
                        </div>
                        <p className="text-[10px] font-black text-emerald-100/60 dark:text-white/60 uppercase tracking-widest mb-4 italic">Receita Total</p>
                        <h3 className="text-2xl md:text-3xl font-black tracking-tighter text-white italic leading-none">
                            R$ {stats.receitaTotal.toLocaleString('pt-BR')}
                        </h3>
                        <div className="mt-4 flex items-center gap-2 text-emerald-200 font-black text-[9px] uppercase">
                            <ArrowUpRight size={14} /> Faturamento Líquido
                        </div>
                    </div>

                    {/* CARD: LUCRO ESTIMADO (DESTAQUE BLUE) */}
                    <div className="min-w-[85%] md:min-w-0 snap-center bg-slate-900 dark:bg-blue-600 p-6 md:p-8 rounded-[2.5rem] border border-transparent shadow-2xl shadow-blue-500/20 relative overflow-hidden group shrink-0">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <TrendingUp size={80} className="text-white" />
                        </div>
                        <p className="text-[10px] font-black text-blue-100/60 dark:text-white/60 uppercase tracking-widest mb-4 italic">Margem Potencial</p>
                        <h3 className="text-2xl md:text-3xl font-black tracking-tighter text-white italic leading-none">
                            R$ {stats.lucroPotencial.toLocaleString('pt-BR')}
                        </h3>
                        <div className="mt-4 flex items-center gap-2 text-emerald-300 font-black text-[9px] uppercase">
                            <ArrowUpRight size={14} /> Mark-up: {stats.taxaSucesso}%
                        </div>
                    </div>

                    {/* CARD: CUSTOS OPERACIONAIS */}
                    <div className="min-w-[85%] md:min-w-0 snap-center bg-amber-600 dark:bg-amber-600 p-6 md:p-8 rounded-[2.5rem] border border-transparent shadow-2xl shadow-amber-500/20 relative overflow-hidden group shrink-0">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Activity size={80} className="text-white" />
                        </div>
                        <p className="text-[10px] font-black text-amber-100/60 dark:text-white/60 uppercase tracking-widest mb-4 italic">Custos Operacionais</p>
                        <h3 className="text-2xl md:text-3xl font-black tracking-tighter text-white italic leading-none">
                            R$ {stats.custosOperacionais.toLocaleString('pt-BR')}
                        </h3>
                        <div className="mt-4 flex items-center gap-2 text-amber-200 font-black text-[9px] uppercase">
                            <ArrowDownRight size={14} /> Despesas Fixas
                        </div>
                    </div>

                    {/* CARD: DESPERDÍCIO */}
                    <div className="min-w-[85%] md:min-w-0 snap-center bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] border border-red-500/20 dark:border-red-500/10 shadow-xl relative overflow-hidden group shrink-0">
                        <div className="absolute top-0 right-0 p-4 opacity-5 text-red-500">
                            <AlertTriangle size={80} />
                        </div>
                        <p className="text-[10px] font-black text-red-500/70 dark:text-red-500 uppercase tracking-widest mb-4 italic">Perda / Quebras</p>
                        <h3 className="text-2xl md:text-3xl font-black tracking-tighter text-slate-800 dark:text-slate-100 italic leading-none">
                            R$ {stats.valorDesperdicio.toLocaleString('pt-BR')}
                        </h3>
                        <div className="mt-4 flex items-center gap-2 text-red-500 font-black text-[9px] uppercase">
                            <ArrowDownRight size={14} /> {stats.pecasQuebradas} Falhas Técnicas
                        </div>
                    </div>

                    {/* CARD: TAXA DE SUCESSO */}
                    <div className="min-w-[85%] md:min-w-0 snap-center bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden group flex flex-col items-center justify-center shrink-0">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 italic">Eficiência</p>
                        <div className="relative inline-block">
                            <svg className="w-16 h-16 md:w-20 md:h-20">
                                <circle className="text-slate-100 dark:text-slate-800" strokeWidth="8" stroke="currentColor" fill="transparent" r="30" cx="40" cy="40" />
                                <circle className="text-blue-600 dark:text-blue-500 transition-all duration-1000 ease-out" strokeWidth="8" strokeDasharray={188.4} strokeDashoffset={188.4 - (188.4 * stats.taxaSucesso) / 100} strokeLinecap="round" stroke="currentColor" fill="transparent" r="30" cx="40" cy="40" />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-lg font-black dark:text-white">{stats.taxaSucesso}%</span>
                        </div>
                    </div>
                </div>

                {/* --- SEÇÃO DE RAMIFICAÇÃO FINANCEIRA --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-24 relative z-10">

                    {/* RAMIFICAÇÃO POR MARCA */}
                    <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-200 dark:border-slate-800 shadow-xl transition-all relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-purple-500/10 rounded-xl">
                                <BarChart3 className="text-purple-500" size={20} />
                            </div>
                            <h4 className="text-sm md:text-lg font-black uppercase italic tracking-tighter dark:text-slate-100">Ramificação por Marca</h4>
                        </div>

                        <div className="space-y-3">
                            {stats.porMarca && stats.porMarca.length > 0 ? (
                                stats.porMarca.map((marcaInfo, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-purple-500/30 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-purple-500 rounded-xl flex items-center justify-center font-black shadow-sm group-hover:scale-110 transition-transform">
                                                {i + 1}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black uppercase text-slate-700 dark:text-slate-200 leading-none mb-1">{marcaInfo.marca}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{marcaInfo.totalOS} serviços realizados</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-purple-500 italic">R$ {marcaInfo.receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase">Ticket médio: R$ {marcaInfo.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-10 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                                    <p className="text-[10px] font-black text-slate-400 uppercase italic">Nenhuma ramificação disponível</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* PERDAS POR TIPO */}
                    <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-200 dark:border-slate-800 shadow-xl transition-all relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-orange-500/10 rounded-xl">
                                <PieChart className="text-orange-500" size={20} />
                            </div>
                            <h4 className="text-sm md:text-lg font-black uppercase italic tracking-tighter dark:text-slate-100">Perdas por Categoria</h4>
                        </div>

                        <div className="space-y-3">
                            {stats.perdasPorMotivo && stats.perdasPorMotivo.length > 0 ? (
                                stats.perdasPorMotivo.map((perda, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-orange-500/30 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-orange-500 rounded-xl flex items-center justify-center font-black shadow-sm group-hover:scale-110 transition-transform">
                                                {i + 1}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black uppercase text-slate-700 dark:text-slate-200 leading-none mb-1">{perda.motivo}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{perda.quantidade} ocorrências</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-orange-500 italic">- R$ {perda.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase">Média: R$ {(perda.valorTotal / (perda.quantidade || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-10 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                                    <p className="text-[10px] font-black text-slate-400 uppercase italic">Nenhuma perda categorizada</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- SEÇÃO DE ANÁLISE DETALHADA (RELAÇÃO PERDA X PERFORMANCE) --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-24 relative z-10">

                    {/* LISTA DE DESPERDÍCIO (RANKING DE PERDAS REAIS) */}
                    <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-200 dark:border-slate-800 shadow-xl transition-all relative overflow-hidden">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-500/10 rounded-xl">
                                    <BarChart3 className="text-red-500" size={20} />
                                </div>
                                <h4 className="text-sm md:text-lg font-black uppercase italic tracking-tighter dark:text-slate-100">Ranking de Perdas</h4>
                            </div>

                            {/* BOTÃO PARA INSERIR PERDA */}
                            <button
                                onClick={() => setIsLossModalOpen(true)}
                                className="p-2 md:px-4 md:py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-red-900/20"
                            >
                                <Plus size={14} strokeWidth={3} />
                                <span className="hidden md:inline">Registrar Perda</span>
                            </button>
                        </div>

                        <div className="space-y-3">
                            {stats.rankingPerdas.length > 0 ? (
                                stats.rankingPerdas.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-red-500/30 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-red-500 rounded-xl flex items-center justify-center font-black shadow-sm group-hover:scale-110 transition-transform">
                                                {i + 1}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black uppercase text-slate-700 dark:text-slate-200 leading-none mb-1">{p.item}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{p.qtd} unidades perdidas</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-red-500 italic">- R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-10 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                                    <p className="text-[10px] font-black text-slate-400 uppercase italic">Nenhuma perda registrada</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* INSIGHTS DE VOLUME E OLLIE INTELLIGENCE */}
                    <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-200 dark:border-slate-800 relative overflow-hidden transition-all">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-emerald-500/10 rounded-xl">
                                <PieChart className="text-emerald-500" size={20} />
                            </div>
                            <h4 className="text-sm md:text-lg font-black uppercase italic tracking-tighter dark:text-slate-100">Volume de Hardware</h4>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-5 md:p-6 bg-blue-50 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-800/30 group hover:bg-blue-600 transition-all cursor-default">
                                <p className="text-[9px] font-black text-blue-600 dark:text-blue-400 group-hover:text-blue-100 uppercase mb-2 tracking-widest">Média de Ticket</p>
                                <p className="text-xl md:text-2xl font-black italic tracking-tighter dark:text-slate-100 group-hover:text-white">R$ 480,00</p>
                            </div>
                            <div className="p-5 md:p-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-3xl border border-emerald-100 dark:border-emerald-800/30 group hover:bg-emerald-600 transition-all cursor-default">
                                <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-100 uppercase mb-2 tracking-widest">Maior Lucro / Un</p>
                                <p className="text-xl md:text-2xl font-black italic tracking-tighter dark:text-slate-100 group-hover:text-white">R$ 320,00</p>
                            </div>
                        </div>

                        {/* INSIGHT DA OLLIE (OLLIE INTELLIGENCE) */}
                        <div className="mt-8 p-6 bg-slate-900 dark:bg-[#0f172a] rounded-[2rem] text-white flex items-start md:items-center gap-4 group cursor-pointer hover:bg-blue-700 transition-all border border-slate-800 shadow-2xl">
                            <div className="w-12 h-12 bg-blue-600 dark:bg-blue-500 rounded-2xl flex items-center justify-center shrink-0 shadow-lg group-hover:rotate-12 transition-transform">
                                <Zap size={24} className="text-yellow-400 fill-yellow-400" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase text-blue-400 tracking-[0.3em] mb-1">Insight da Ollie:</p>
                                <p className="text-[11px] md:text-xs font-bold leading-relaxed text-slate-300 group-hover:text-white transition-colors">
                                    "O custo de aquisição para telas de iPhone aumentou 12%. Sugiro verificar o fornecedor <span className="text-blue-400 underline">TechParts</span> ou ajustar a margem de saída."
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {isLossModalOpen && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black uppercase italic dark:text-white">Registrar Prejuízo</h3>
                            <button onClick={() => setIsLossModalOpen(false)} className="text-slate-400 hover:text-white"><X /></button>
                        </div>

                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                                await api.post(`/estoque/registrar-perda/${lossData.item_id}`, {
                                    quantidade: lossData.quantidade,
                                    motivo: lossData.motivo
                                });
                                setIsLossModalOpen(false);
                                carregarDadosFinanceiros(); // Atualiza o dash
                                alert("Perda contabilizada.");
                            } catch (err) { alert("Erro ao registrar."); }
                        }} className="space-y-4">

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ID do Item ou Nome</label>
                                <select
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl p-4 font-bold text-slate-700 dark:text-slate-200 outline-none"
                                    onChange={(e) => setLossData({ ...lossData, item_id: e.target.value })}
                                >
                                    <option value="">Selecione o Componente...</option>
                                    {/* Aqui você pode mapear sua lista de estoque para facilitar */}
                                    {estoque.map(item => (
                                        <option key={item.id} value={item.id}>{item.nome} ({item.modelo_compativel})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantidade</label>
                                    <input
                                        type="number"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl p-4 font-black text-red-500"
                                        value={lossData.quantidade}
                                        onChange={(e) => setLossData({ ...lossData, quantidade: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Motivo</label>
                                    <input
                                        placeholder="Quebra, Defeito..."
                                        className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl p-4 font-bold text-slate-200"
                                        onChange={(e) => setLossData({ ...lossData, motivo: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-red-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-red-700 transition-all">
                                Confirmar Perda
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default DashboardFinanceiro;