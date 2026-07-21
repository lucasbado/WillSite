import React, { useEffect, useState } from 'react';
import {
    Package, Plus, Minus, Trash2, Search, ArrowLeft,
    Edit3, X, Cpu, Smartphone, LayoutGrid, AlertCircle,
    Tag, Zap, Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import notify from '../utils/notifications';

const GestaoEstoque = () => {
    const navigate = useNavigate();
    const [estoque, setEstoque] = useState([]);
    const [listaModelos, setListaModelos] = useState([]);

    // ESTADOS DE FILTRO (Versão 1)
    const [filtroTexto, setFiltroTexto] = useState('');
    const [filtroMarca, setFiltroMarca] = useState('Todas');
    const [filtroCategoria, setFiltroCategoria] = useState('Todas');
    const [filtroMarcaModelo, setFiltroMarcaModelo] = useState('Universal');

    // ESTADOS DO MODAL (Versão 2)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedItemId, setSelectedItemId] = useState(null);
    const [formData, setFormData] = useState({
        nome: '',
        descricao: '',
        quantidade: 0,
        minimo: 5,
        modelo_compativel: '',
        categoria: '',
        preco_custo: 0.00, // Valor padrão fixo
        preco_venda: 0.00  // Valor padrão fixo
    });

    const categoriasCidinho = ["Hardware", "Acessório", "Insumo", "Software", "Outros"];
    const marcasCidinho = ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'Realme', 'Outras'];

    // Lógica de Ícones Inteligentes (Versão 1)
    const getIconByPeca = (nome) => {
        const n = nome.toLowerCase();
        if (n.includes('tela') || n.includes('display') || n.includes('touch')) return <Smartphone size={20} className="text-blue-500" />;
        if (n.includes('bateria') || n.includes('battery') || n.includes('carga')) return <Zap size={20} className="text-amber-500" />;
        if (n.includes('carcaça') || n.includes('tampa') || n.includes('botão')) return <LayoutGrid size={20} className="text-slate-500" />;
        return <Cpu size={20} className="text-purple-500" />;
    };

    const carregarDados = async () => {
        try {
            const [resEstoque, resModelos] = await Promise.all([
                api.get('/estoque/'),
                api.get('/devices/listar')
            ]);
            setEstoque(resEstoque.data);
            setListaModelos(resModelos.data);
        } catch (err) { console.error("Erro Cidinho:", err); }
    };

    useEffect(() => { carregarDados(); }, []);

    // FILTRAGEM (Versão 1)
    const estoqueFiltrado = estoque.filter(item => {
        const texto = filtroTexto.toLowerCase();
        const matchesTexto = (item.nome || '').toLowerCase().includes(texto) ||
            (item.modelo_compativel || '').toLowerCase().includes(texto);
        const matchesMarca = filtroMarca === 'Todas' || (item.modelo_compativel || '').toLowerCase().includes(filtroMarca.toLowerCase());
        const matchesCategoria = filtroCategoria === 'Todas' || item.categoria === filtroCategoria;
        return matchesTexto && matchesMarca && matchesCategoria;
    });

    const handleSalvar = async (e) => {
        e.preventDefault();
        try {
            // Log para você conferir no console se o preço está indo antes de enviar
            console.log("Enviando dados:", formData);

            if (isEditMode) {
                // Enviamos o formData completo para a rota PATCH
                await api.patch(`/estoque/editar/${selectedItemId}`, formData);
            } else {
                // Enviamos o formData completo para a rota POST
                await api.post('/estoque/adicionar', formData);
            }
            fecharModal();
            carregarDados();
            notify.success("Sistema atualizado com sucesso!");
        } catch (err) {
            console.error(err);
            notify.error("Erro na operação.");
        }
    };

    const handleAjustarQtd = async (id, operacao) => {
        try {
            const res = await api.patch(`/estoque/ajustar-quantidade/${id}`, { operacao });
            setEstoque(prev => prev.map(item => item.id === id ? { ...item, quantidade: res.data.nova_quantidade } : item));
        } catch (err) { carregarDados(); }
    };

    const handleDeletar = async (id) => {
        const confirmar = await notify.confirm("Remover Item", "Deseja remover este item permanentemente?");
        if (confirmar) {
            try {
                await api.delete(`/estoque/${id}`);
                carregarDados();
                notify.success("Item removido.");
            } catch (err) { notify.error("Erro ao deletar."); }
        }
    };

    const abrirModalEdicao = (item) => {
        setIsEditMode(true);
        setSelectedItemId(item.id);
        setFormData({
            nome: item.nome || '',
            descricao: item.descricao || '',
            quantidade: item.quantidade || 0,
            minimo: item.minimo || 5,
            modelo_compativel: item.modelo_compativel || '',
            categoria: item.categoria || '',
            preco_custo: item.preco_custo || 0,
            preco_venda: item.preco_venda || 0
        });
        setIsModalOpen(true);
    };

    const fecharModal = () => {
        setIsModalOpen(false);
        setIsEditMode(false);
        setSelectedItemId(null);
        setFormData({ nome: '', descricao: '', quantidade: 0, minimo: 5, modelo_compativel: '', categoria: '', preco_custo: 0.00, preco_venda: 0.00 });

    };

    const registrarPerdaTecnica = async (item) => {
        const qtd = await notify.prompt(`Baixa de Estoque`, `Quantas unidades de "${item.nome}" foram perdidas?`, "1", "number");
        if (!qtd) return;

        const motivo = await notify.prompt("Motivo da Perda", "Descreva o ocorrido (ex: Quebra na montagem):", "Quebra Técnica");
        if (!motivo) return;

        try {
            await api.post(`/estoque/registrar-perda/${item.id}`, {
                quantidade: parseInt(qtd),
                motivo: motivo
            });
            notify.success("Prejuízo registrado. Estoque atualizado.");
            carregarDados(); // Recarrega a lista de estoque
        } catch (err) {
            notify.error("Erro ao registrar perda.");
        }
    };

    return (
        /* --- ESTRUTURA PRINCIPAL --- */
        <div className="h-screen overflow-y-auto bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-100 font-sans modern-scroll-v">

            {/* 1. EFEITO DE PROFUNDIDADE (Glows que se adaptam ao tema) */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden" >
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 dark:bg-blue-600/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/5 dark:bg-emerald-600/5 rounded-full blur-[120px]"></div>
            </div>

            {/* --- HEADER RESPONSIVO --- */}
            <div className="bg-white/80 dark:bg-[#020617]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-sm transition-all" >
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 md:h-24 flex items-center justify-between">
                    <div className="flex items-center gap-3 md:gap-6">
                        <button
                            onClick={() => navigate('/admin/dashboard')}
                            className="p-2 md:p-3 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white dark:hover:bg-blue-600 transition-all active:scale-90 border border-transparent dark:border-slate-800"
                        >
                            <ArrowLeft size={24} strokeWidth={3} />
                        </button>
                        <div>
                            <h2 className="text-xl md:text-3xl font-black text-slate-800 dark:text-slate-50 tracking-tighter uppercase italic leading-none">
                                Estoque<span className="text-blue-600 dark:text-blue-500">Cidinho</span>
                            </h2>
                            <p className="hidden md:block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                                System Hardware & Inventory
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-slate-900 dark:bg-blue-600 text-white p-3 md:px-8 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase flex items-center gap-2 shadow-xl shadow-slate-900/20 dark:shadow-blue-900/20 hover:scale-105 active:scale-95 transition-all"
                    >
                        <Plus size={18} strokeWidth={3} /> <span className="hidden md:inline">Adicionar Item</span>
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6 md:pt-10 relative z-10">

                {/* --- TERMINAL DE COMANDO (FILTROS) --- */}
                <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-blue-900/20 mb-8 md:mb-12 relative overflow-hidden border border-slate-200 dark:border-blue-500/20 transition-all">

                    {/* Detalhe estético de "Grid de Engenharia" */}
                    <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>

                    <div className="relative z-10 space-y-6">
                        {/* 1. INPUT DE BUSCA ESTILO TERMINAL */}
                        <div className="relative group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-500 animate-pulse"></div>
                                <Search className="text-slate-400 dark:text-blue-500/50 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors" size={18} />
                            </div>
                            <input
                                placeholder="SCANNING INVENTORY..."
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-5 pl-16 pr-6 text-xs font-mono font-black text-slate-700 dark:text-blue-400 placeholder:text-slate-300 dark:placeholder:text-slate-700 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all uppercase tracking-widest shadow-inner"
                                value={filtroTexto}
                                onChange={(e) => setFiltroTexto(e.target.value)}
                            />
                        </div>

                        {/* 2. CHIPS DE MARCAS (Toggle Logic) */}
                        <div className="space-y-3">
                            <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] italic px-1">Manufacturer / Vendor</p>
                            {/* ADICIONE modern-scroll-h AQUI */}
                            <div className="flex gap-2 overflow-x-auto pb-4 modern-scroll-h snap-x">
                                {marcasCidinho.map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setFiltroMarca(filtroMarca === m ? 'Todas' : m)}
                                        className={`snap-start px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shrink-0 border-2 ${filtroMarca === m
                                            ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/20 scale-105'
                                            : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-blue-400/50'
                                            }`}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 3. SELETOR DE CATEGORIA (Módulos) */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {categoriasCidinho.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setFiltroCategoria(filtroCategoria === c ? 'Todas' : c)}
                                    className={`py-3 rounded-xl text-[8px] font-black uppercase tracking-tighter border-2 transition-all ${filtroCategoria === c
                                        ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-900/20'
                                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600'
                                        }`}
                                >
                                    MOD_{c.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        {/* 4. SELETOR DE MODELOS (Toggle no Input de Busca) */}
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                            <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] italic mb-3 px-1">Model Compatibility Scan</p>
                            {/* ADICIONE modern-scroll-h AQUI TAMBÉM */}
                            <div className="flex gap-2 overflow-x-auto pb-4 modern-scroll-h">
                                {[...new Set(estoque.map(i => i.modelo_compativel))].filter(Boolean).map(mod => (
                                    <button
                                        key={mod}
                                        onClick={() => setFiltroTexto(filtroTexto === mod ? '' : mod)}
                                        className={`px-4 py-2 rounded-lg text-[9px] font-bold border transition-all shrink-0 ${filtroTexto === mod
                                            ? 'bg-blue-600/10 dark:bg-blue-500/20 border-blue-500 text-blue-600 dark:text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                                            }`}
                                    >
                                        {mod}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- LISTA/TABELA COM ESTÉTICA TECH --- */}
                <div className="md:bg-white dark:md:bg-slate-950 md:rounded-[3rem] md:border-4 border-slate-100 md:border-slate-900 dark:md:border-slate-800 md:shadow-2xl overflow-hidden transition-all duration-300">
                    {/* VISÃO DESKTOP: TABLE TECH */}
                    <div className="hidden md:block max-h-[700px] overflow-y-auto modern-scroll-v">
                        <table className="w-full border-collapse sticky-header">
                            <thead>
                                <tr className="text-left bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                                    <th className="px-8 py-6 text-[10px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-[0.3em] italic">Component_ID / Node</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-[0.3em] italic text-center">Units_Available</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-[0.3em] italic text-center">Unit_Value</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-[0.3em] italic text-center">Operational_Status</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-[0.3em] italic text-right">System_Access</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                                {estoqueFiltrado.map(item => {
                                    const isLow = item.quantidade <= item.minimo;
                                    return (
                                        <tr key={item.id} className="hover:bg-blue-600/5 transition-all group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-6">
                                                    {/* Ícone Dinâmico: bg-slate-900 | Dark: bg-slate-950 */}
                                                    <div className={`p-4 rounded-2xl border-2 transition-all ${isLow
                                                        ? 'bg-red-500/10 border-red-500/50 text-red-500 animate-pulse'
                                                        : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-blue-600 dark:text-blue-400'}`}>
                                                        {getIconByPeca(item.nome)}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-800 dark:text-slate-100 text-lg uppercase tracking-tighter leading-none mb-2 italic">
                                                            {item.nome}
                                                        </p>
                                                        <div className="flex gap-2">
                                                            <span className="text-[9px] font-black bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded uppercase tracking-wider">
                                                                {item.modelo_compativel || 'Universal'}
                                                            </span>
                                                            <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-2 py-0.5 rounded uppercase font-mono">
                                                                {item.categoria || 'Generic'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                {/* Controle de Qtd: bg-slate-50 | Dark: bg-slate-900/50 */}
                                                <div className="flex items-center justify-center gap-6 bg-slate-50 dark:bg-slate-900/50 w-fit mx-auto p-2 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
                                                    <button onClick={() => handleAjustarQtd(item.id, 'subtrai')} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all active:scale-90"><Minus size={16} strokeWidth={3} /></button>
                                                    <span className={`text-2xl font-black font-mono w-10 text-center ${isLow ? 'text-red-600 dark:text-red-500' : 'text-slate-800 dark:text-blue-400'}`}>{item.quantidade}</span>
                                                    <button onClick={() => handleAjustarQtd(item.id, 'soma')} className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all active:scale-90"><Plus size={16} strokeWidth={3} /></button>
                                                </div>
                                            </td>
                                            {/* No tbody, adicione a célula: */}
                                            <td className="px-8 py-6 text-center">
                                                <p className="text-lg font-black text-emerald-600 dark:text-emerald-500 font-mono tracking-tighter">
                                                    R$ {item.preco_venda?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>
                                                <p className="text-[8px] font-bold text-slate-400 uppercase">Valor de Saída</p>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border-2 ${isLow
                                                    ? 'bg-red-500/10 border-red-500/50 text-red-600 dark:text-red-500'
                                                    : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-500'}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${isLow ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`}></div>
                                                    {isLow ? 'Reposição' : 'Em Estoque'}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex justify-end gap-3">
                                                    <button onClick={() => abrirModalEdicao(item)} className="p-3 bg-white dark:bg-slate-900 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-100 dark:border-slate-800 rounded-xl transition-all shadow-sm"><Edit3 size={18} /></button>
                                                    <button onClick={() => handleDeletar(item.id)} className="p-3 bg-white dark:bg-slate-900 text-slate-400 hover:text-red-600 dark:hover:text-red-500 border border-slate-100 dark:border-slate-800 rounded-xl transition-all shadow-sm"><Trash2 size={18} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* VISÃO MOBILE: COMMAND MODULES (Cards Brutalistas) */}
                    <div className="md:hidden space-y-6 px-1 pb-24">
                        {estoqueFiltrado.map(item => {
                            const isLow = item.quantidade <= item.minimo;
                            return (
                                <div key={item.id} className={`bg-white dark:bg-slate-950 p-6 rounded-[2.5rem] border-4 transition-all shadow-xl ${isLow
                                    ? 'border-red-600 dark:border-red-500 shadow-red-900/10'
                                    : 'border-slate-900 dark:border-slate-800 shadow-blue-900/5'}`}>

                                    <div className="flex items-start justify-between mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-4 rounded-2xl border-2 ${isLow
                                                ? 'bg-red-500/10 border-red-500/50 text-red-500'
                                                : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-blue-600 dark:text-blue-400'}`}>
                                                {getIconByPeca(item.nome)}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter italic text-lg leading-none mb-1">{item.nome}</h4>
                                                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{item.modelo_compativel || 'Universal_Node'}</p>
                                            </div>
                                            {/* Dentro do card mobile, logo abaixo do nome do item */}
                                            <div className="mt-2 mb-4">
                                                <span className="text-xl font-black text-emerald-600 dark:text-emerald-500 font-mono italic">
                                                    R$ {item.preco_venda?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                        <button onClick={() => abrirModalEdicao(item)} className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-400"><Edit3 size={18} /></button>
                                    </div>

                                    {/* INTERFACE DE CONTROLE (JOYSTICK TECH) */}
                                    <div className="grid grid-cols-3 items-center bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-slate-100 dark:border-slate-800 overflow-hidden shadow-inner">
                                        <button
                                            onClick={() => handleAjustarQtd(item.id, 'subtrai')}
                                            className="h-16 flex items-center justify-center hover:bg-red-500/10 text-slate-400 active:text-red-500 transition-all border-r border-slate-100 dark:border-slate-800"
                                        >
                                            <Minus size={24} strokeWidth={3} />
                                        </button>

                                        <div className="flex flex-col items-center justify-center">
                                            <span className="text-[8px] font-black text-blue-600/50 dark:text-blue-500/50 uppercase tracking-widest mb-1">Stock_Val</span>
                                            <span className={`text-2xl font-mono font-black ${isLow ? 'text-red-600 dark:text-red-500 animate-pulse' : 'text-slate-800 dark:text-blue-400'}`}>
                                                {item.quantidade}
                                            </span>
                                        </div>

                                        <button
                                            onClick={() => handleAjustarQtd(item.id, 'soma')}
                                            className="h-16 flex items-center justify-center hover:bg-emerald-500/10 text-slate-400 active:text-emerald-500 transition-all border-l border-slate-100 dark:border-slate-800"
                                        >
                                            <Plus size={24} strokeWidth={3} />
                                        </button>
                                    </div>


                                    {isLow && (
                                        <div className="mt-4 py-2 bg-red-600/10 border border-red-600/30 rounded-xl flex items-center justify-center gap-2">
                                            <AlertCircle size={12} className="text-red-600 dark:text-red-500" />
                                            <span className="text-[9px] font-black text-red-600 dark:text-red-500 uppercase italic animate-pulse">Critical: Resupply Required</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>


            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-xl flex items-end md:items-center justify-center p-0 md:p-6 z-[100] animate-in fade-in duration-300">

                    {/* Container Principal: bg-white | Dark: bg-slate-900 */}
                    <div className="bg-white dark:bg-slate-900 rounded-t-[3rem] md:rounded-[4rem] max-w-4xl w-full h-[92vh] md:h-auto flex flex-col md:flex-row overflow-hidden shadow-3xl border border-transparent dark:border-slate-800 transition-all duration-300">

                        {/* 1. Lateral Informativa (Sempre Dark conforme seu padrão) */}
                        <div className="w-full md:w-1/3 bg-slate-950 p-8 md:p-12 flex flex-col justify-between text-white relative shrink-0">
                            <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px]"></div>

                            <div className="relative z-10 flex justify-between items-center md:block">
                                <div className="text-left">
                                    <Tag size={window.innerWidth < 768 ? 32 : 48} className="mb-4 md:mb-8 text-blue-500" />
                                    <h3 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic leading-none">
                                        {isEditMode ? 'Editar' : 'Novo'} Item
                                    </h3>
                                    <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2 md:mt-4">
                                        Logística de Insumos
                                    </p>
                                </div>
                                <button onClick={fecharModal} className="md:hidden text-slate-500 hover:text-white p-2 transition-colors">
                                    <X size={32} />
                                </button>
                            </div>
                        </div>

                        {/* 2. Formulário (Scrollable) */}
                        <div className="w-full md:w-2/3 p-8 md:p-12 md:p-16 relative overflow-y-auto modern-scroll-v bg-white dark:bg-slate-900 transition-colors">
                            {/* Botão fechar desktop */}
                            <button onClick={fecharModal} className="hidden md:block absolute top-10 right-10 text-slate-300 dark:text-slate-600 hover:text-slate-900 dark:hover:text-slate-100 transition-all">
                                <X size={32} />
                            </button>

                            <h2 className="hidden md:block text-3xl font-black text-slate-800 dark:text-slate-50 tracking-tighter mb-10 uppercase italic leading-none">
                                Dados do Componente
                            </h2>

                            <form onSubmit={handleSalvar} className="space-y-6 md:space-y-8 pb-12 md:pb-0">
                                {/* Nome do Item */}
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nome da Peça</label>
                                    <input
                                        required
                                        className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent dark:border-slate-800 focus:border-blue-600 dark:focus:border-blue-500 rounded-2xl p-4 md:p-5 font-bold text-slate-700 dark:text-slate-200 transition-all outline-none shadow-inner"
                                        value={formData.nome}
                                        onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                    />
                                </div>

                                {/* Categorias */}
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Categoria</label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {categoriasCidinho.map(cat => (
                                            <button
                                                key={cat} type="button"
                                                onClick={() => setFormData({ ...formData, categoria: cat })}
                                                className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2 ${formData.categoria === cat
                                                    ? 'bg-blue-600 border-blue-600 dark:border-blue-500 text-white shadow-lg shadow-blue-900/20'
                                                    : 'bg-slate-50 dark:bg-slate-950 border-transparent dark:border-slate-800 text-slate-400 dark:text-slate-500'
                                                    }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* --- SELETOR DE COMPATIBILIDADE --- */}
                                <div className="space-y-4 bg-slate-50/50 dark:bg-slate-950 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 transition-colors">
                                    <label className="text-[10px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Smartphone size={16} /> Ecossistema de Compatibilidade
                                    </label>

                                    {/* Seleção de Marca */}
                                    <div className="flex gap-2 overflow-x-auto pb-2 modern-scroll-h">
                                        {['Apple', 'Samsung', 'Motorola', 'Xiaomi', 'Universal'].map(marca => (
                                            <button
                                                key={marca} type="button"
                                                onClick={() => setFiltroMarcaModelo(marca)}
                                                className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase transition-all whitespace-nowrap border-2 ${filtroMarcaModelo === marca
                                                    ? 'bg-slate-900 dark:bg-blue-600 border-slate-900 dark:border-blue-500 text-white'
                                                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400'
                                                    }`}
                                            >
                                                {marca}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Grid de Modelos */}
                                    <div className="relative group">


                                        {/* Máscaras de Gradiente para suavizar a entrada/saída */}
                                        <div className="absolute top-0 left-0 right-0 h-6 z-10 pointer-events-none bg-gradient-to-b from-slate-50 dark:from-slate-950 to-transparent opacity-100" />
                                        <div className="absolute bottom-0 left-0 right-0 h-6 z-10 pointer-events-none bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent opacity-100" />

                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-52 overflow-y-auto p-2 pr-3 modern-scroll-v">
                                            {listaModelos
                                                .filter(m => filtroMarcaModelo === 'Universal' || m.marca === filtroMarcaModelo)
                                                .map(m => {
                                                    const isSelected = formData.modelo_compativel === `${m.marca} ${m.modelo}`;
                                                    return (
                                                        <button
                                                            key={m.id}
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, modelo_compativel: `${m.marca} ${m.modelo}` })}
                                                            className={`p-4 rounded-2xl border-2 text-left transition-all duration-300 ${isSelected
                                                                ? 'border-blue-600 bg-blue-50/30 dark:bg-blue-500/10 shadow-md scale-[1.02]'
                                                                : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-blue-200 dark:hover:border-blue-900'
                                                                }`}
                                                        >
                                                            <div className="flex flex-col">
                                                                <span className={`text-[7px] font-black uppercase tracking-widest ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}>
                                                                    {m.marca}
                                                                </span>
                                                                <span className={`text-[11px] font-bold uppercase ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                                                                    {m.modelo}
                                                                </span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                        </div>
                                    </div>

                                    {/* Input de Fallback */}
                                    <div className="pt-2">
                                        <input
                                            placeholder="DIGITAR MODELO CUSTOMIZADO..."
                                            className="w-full bg-transparent border-b-2 border-slate-100 dark:border-slate-800 p-2 text-[11px] font-bold text-slate-500 outline-none focus:border-blue-500 transition-all uppercase placeholder:text-slate-300 dark:placeholder:text-slate-700"
                                            value={formData.modelo_compativel}
                                            onChange={e => setFormData({ ...formData, modelo_compativel: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Seção de Valores Financeiros */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/30 dark:bg-blue-900/10 p-6 rounded-[2rem] border border-blue-100 dark:border-blue-800/30">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Custo de Compra (R$)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full bg-white dark:bg-slate-950 border-none rounded-2xl p-4 font-black text-slate-700 dark:text-slate-300 outline-none shadow-inner"
                                            value={formData.preco_custo || ''}
                                            onChange={e => {
                                                const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                                setFormData({ ...formData, preco_custo: val });
                                            }}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest ml-1">Preço de Venda (R$)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full bg-white dark:bg-slate-950 border-2 border-blue-500/20 focus:border-blue-500 rounded-2xl p-4 font-black text-blue-600 dark:text-blue-400 outline-none shadow-inner"
                                            value={formData.preco_venda || ''}
                                            onChange={e => {
                                                const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                                setFormData({ ...formData, preco_venda: val });
                                            }}
                                        />
                                    </div>

                                    {/* Indicador de Margem de Lucro */}
                                    <div className="md:col-span-2 flex justify-between items-center px-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase italic">Markup Estimado:</span>
                                        <span className={`text-sm font-black ${(formData.preco_venda - formData.preco_custo) > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {formData.preco_custo > 0
                                                ? (((formData.preco_venda - formData.preco_custo) / formData.preco_custo) * 100).toFixed(0)
                                                : 0}% de lucro
                                        </span>
                                    </div>


                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Qtd Atual</label>
                                        <input
                                            type="number"
                                            className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl p-4 md:p-5 font-black text-xl text-slate-800 dark:text-blue-400 outline-none shadow-inner"
                                            value={formData.quantidade}
                                            onChange={e => setFormData({ ...formData, quantidade: parseInt(e.target.value) })}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Min. Alerta</label>
                                        <input
                                            type="number"
                                            className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl p-4 md:p-5 font-black text-xl text-slate-800 dark:text-red-500 outline-none shadow-inner"
                                            value={formData.minimo}
                                            onChange={e => setFormData({ ...formData, minimo: parseInt(e.target.value) })}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Botão de Ação */}
                                <button type="submit" className="w-full bg-slate-900 dark:bg-blue-600 text-white py-5 md:py-6 rounded-2xl md:rounded-[2rem] font-black text-base md:text-xl hover:bg-blue-600 dark:hover:bg-blue-500 transition-all shadow-xl dark:shadow-blue-900/20 active:scale-95 uppercase tracking-widest">
                                    {isEditMode ? 'Salvar Alterações' : 'Cadastrar Item'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div >
            )}
        </div >
    );
};

export default GestaoEstoque;