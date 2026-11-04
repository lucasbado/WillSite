import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Minus, Trash2, Search, ArrowLeft, Edit3, Copy, Cpu, Smartphone, LayoutGrid, AlertCircle, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import LoadNotice from '../components/LoadNotice';
import { requestError } from '../utils/requestError';
import notify from '../utils/notifications';
import QuoteCatalog from '../components/QuoteCatalog';
import InventoryItemForm from '../components/InventoryItemForm';

const GestaoEstoque = () => {
    const navigate = useNavigate();
    const [estoque, setEstoque] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [listaModelos, setListaModelos] = useState([]);

    // ESTADOS DE FILTRO (Versão 1)
    const [filtroTexto, setFiltroTexto] = useState('');
    const [filtroMarca, setFiltroMarca] = useState('Todas');
    const [filtroCategoria, setFiltroCategoria] = useState('Todas');

    const [editor, setEditor] = useState(null);
    const categoriasCidinho = ['Hardware', 'Acessório', 'Insumo', 'Software', 'Outros'];

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
        setLoading(true);
        try {
            const [resEstoque, resModelos] = await Promise.all([
                api.get('/estoque/'),
                api.get('/devices/listar')
            ]);
            setEstoque(resEstoque.data);
            setLoadError('');
            setListaModelos(resModelos.data);
        } catch (err) { setLoadError(requestError(err, 'Não foi possível carregar o estoque.')); }
        finally { setLoading(false); }
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

    const salvarItem = async payload => {
        if (editor.editing) await api.patch(`/estoque/editar/${editor.initial.id}`, payload);
        else await api.post('/estoque/adicionar', payload);
        await carregarDados();
        notify.success(editor.editing ? 'Peça atualizada.' : 'Peça cadastrada.');
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

    const abrirModalEdicao = item => setEditor({ editing: true, initial: item });
    const duplicarItem = item => setEditor({ editing: false, initial: {
        ...item, nome: `${item.nome} (cópia)`.slice(0, 100), quantidade: ''
    } });
    const fecharModal = useCallback(() => setEditor(null), []);
    const modelosSugeridos = [...new Set([
        ...listaModelos.map(item => item.modelo.toLowerCase().startsWith(item.marca.toLowerCase()) ? item.modelo : `${item.marca} ${item.modelo}`),
        ...estoque.map(item => item.modelo_compativel)
    ].filter(item => item && !['geral', 'universal'].includes(item.toLowerCase())))].sort();
    useEffect(() => {
        if (!loading && window.location.hash === '#orcamentos') document.getElementById('orcamentos')?.scrollIntoView();
    }, [loading]);

    return (
        /* --- ESTRUTURA PRINCIPAL --- */
        <div className="h-screen overflow-y-auto bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-100 font-sans modern-scroll-v">
            <LoadNotice error={loadError} loading={loading} onRetry={carregarDados} />

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
                        onClick={() => setEditor({ editing: false })}
                        className="bg-slate-900 dark:bg-blue-600 text-white p-3 md:px-8 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase flex items-center gap-2 shadow-xl shadow-slate-900/20 dark:shadow-blue-900/20 hover:scale-105 active:scale-95 transition-all"
                    >
                        <Plus size={18} strokeWidth={3} /> <span>Cadastrar peça</span>
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
                                placeholder="Buscar peça ou modelo"
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-5 pl-16 pr-6 text-xs font-mono font-black text-slate-700 dark:text-blue-400 placeholder:text-slate-300 dark:placeholder:text-slate-700 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all uppercase tracking-widest shadow-inner"
                                value={filtroTexto}
                                onChange={(e) => setFiltroTexto(e.target.value)}
                            />
                        </div>

                        {/* 2. CHIPS DE MARCAS (Toggle Logic) */}
                        <div className="space-y-3">
                            <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] italic px-1">Filtrar por marca</p>
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
                            <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] italic mb-3 px-1">Filtrar por modelo</p>
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
                                    <th className="px-8 py-6 text-[10px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-[0.3em] italic">Peça / Modelo</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-[0.3em] italic text-center">Quantidade</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-[0.3em] italic text-center">Preço de venda</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-[0.3em] italic text-center">Situação</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-[0.3em] italic text-right">Ações</th>
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
                                                    <button type="button" onClick={() => duplicarItem(item)} aria-label={`Duplicar ${item.nome}`} title="Duplicar peça" className="p-3 bg-white dark:bg-slate-900 text-slate-400 hover:text-blue-600 rounded-xl"><Copy size={18} /></button>
                                                    <button aria-label={`Editar ${item.nome}`} onClick={() => abrirModalEdicao(item)} className="p-3 bg-white dark:bg-slate-900 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-100 dark:border-slate-800 rounded-xl transition-all shadow-sm"><Edit3 size={18} /></button>
                                                    <button aria-label={`Remover ${item.nome}`} onClick={() => handleDeletar(item.id)} className="p-3 bg-white dark:bg-slate-900 text-slate-400 hover:text-red-600 dark:hover:text-red-500 border border-slate-100 dark:border-slate-800 rounded-xl transition-all shadow-sm"><Trash2 size={18} /></button>
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
                                        <button type="button" onClick={() => duplicarItem(item)} aria-label={`Duplicar ${item.nome}`} title="Duplicar peça" className="p-3 bg-white dark:bg-slate-900 text-slate-400 hover:text-blue-600 rounded-xl"><Copy size={18} /></button>
                                                    <button aria-label={`Editar ${item.nome}`} onClick={() => abrirModalEdicao(item)} className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-400"><Edit3 size={18} /></button>
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
                                            <span className="text-[9px] font-black text-red-600 dark:text-red-500 uppercase italic animate-pulse">Estoque baixo: repor peça</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <QuoteCatalog inventory={estoque} onEditPart={abrirModalEdicao} />
            </div>


            {editor && <InventoryItemForm initial={editor.initial} editing={editor.editing}
                models={modelosSugeridos} onSave={salvarItem} onClose={fecharModal} />}
        </div >
    );
};

export default GestaoEstoque;
