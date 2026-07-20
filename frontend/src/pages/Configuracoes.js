/* eslint-disable react/jsx-no-comment-textnodes */
import React, { useState, useEffect } from 'react';
import {
    Trash2, ArrowLeft, Users, Cpu, LayoutGrid, Search,
    UserMinus, Moon, Sun, Zap, Star, Clock, MessageCircle,
    Truck, X, Edit, ChevronRight, Database,
    PhoneCallIcon
} from 'lucide-react';
import api from './api';
import { useNavigate } from 'react-router-dom';

import { IMaskInput } from 'react-imask';

const Configuracoes = () => {
    const [tab, setTab] = useState('modelos');
    const [modelos, setModelos] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [novaMarca, setNovaMarca] = useState('');
    const [novoModelo, setNovoModelo] = useState('');
    const [estoque, setEstoque] = useState([]);
    const [filtro, setFiltro] = useState('');
    const navigate = useNavigate();
    const [fornecedores, setFornecedores] = useState([]);
    const [editandoFornecedor, setEditandoFornecedor] = useState(null); // Armazena o objeto do fornecedor selecionado
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [deletingId, setDeletingId] = useState(null); // <-- NOVO ESTADO: para feedback de loading

    const [sugestoes, setSugestoes] = useState([]);

    let searchTimer;

    const buscarSugestoes = async (termo) => {
        if (termo.length < 2) {
            setSugestoes([]);
            return;
        }

        try {
            // Note o caminho: /devices/sugestao
            const response = await api.get(`/devices/sugestao`, {
                params: { q: termo }
            });

            if (Array.isArray(response.data)) {
                setSugestoes(response.data);
            }
        } catch (error) {
            console.error("Erro na busca:", error);
            setSugestoes([]);
        }
    };

    const fetchData = async () => {
        try {
            const [resModelos, resUsuarios, resEstoque, resvendors] = await Promise.all([
                api.get('/devices/listar'),
                api.get('/auth/admin/usuarios'),
                api.get('/estoque/'),
                api.get('/vendors/')
            ]);

            setModelos(resModelos.data || []);
            setEstoque(resEstoque.data || []);
            setUsuarios(resUsuarios.data || []);

            // Verifica se resvendors.data é realmente um array antes de setar
            if (resvendors.data) {
                setFornecedores(resvendors.data);
                console.log("Fornecedores carregados:", resvendors.data);
            }
        } catch (err) {
            console.error("Erro ao carregar dados:", err);
        }
    };
    const [filtroMarca, setFiltroMarca] = useState(''); // Estado para o filtro de marcas
    // Filtra itens que estão com quantidade igual ou abaixo do mínimo
    const itensParaRepor = estoque.filter(item => item.quantidade <= item.minimo);

    const gerarMensagemCotacao = (VendedorNome) => {
        if (itensParaRepor.length === 0) return null;

        // Pegamos a hora atual para o cabeçalho
        const timestamp = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        let mensagem = `🚀 *SGAT // SOLICITAÇÃO DE COTAÇÃO* %0A`;
        mensagem += `_Ref: Protocolo_Supply_${timestamp}_ %0A%0A`;
        mensagem += `Olá *${VendedorNome}*, aqui é o Lucas da SGAT. %0A`;
        mensagem += `Gostaria de cotar os seguintes itens para reposição: %0A`;

        itensParaRepor.forEach(item => {
            // Negrito nos itens para facilitar a leitura do vendedor
            mensagem += `%0A• *${item.nome}* (${item.modelo_compativel})`;
        });

        mensagem += `%0A%0AConsegue me passar os valores e o prazo para entrega?`;
        return mensagem;
    };
    const [novoFornecedor, setNovoFornecedor] = useState({
        nome: '',
        whatsapp: '',
        prazo_entrega: ''
    });

    const [novoUsuario, setNovoUsuario] = useState({
        nome_completo: '',
        email: '',
        cpf: '',
        telefone: '',
        password: '',
        role: 'cliente'
    });

    const handleAdicionarUsuario = async (e) => {
        e.preventDefault();
        try {
            await api.post('/auth/admin/usuarios/registrar', novoUsuario);
            setNovoUsuario({ nome_completo: '', email: '', cpf: '', telefone: '', password: '', role: 'cliente' });
            fetchData();
            alert("Usuário cadastrado com sucesso!");
        } catch (err) {
            console.error("Erro ao cadastrar usuário:", err);
            alert(err.response?.data?.msg || "Falha no cadastro.");
        }
    };

    const handleDigitacaoModelo = (valor) => {
        setNovoModelo(valor);

        // Limpa o timer global para evitar múltiplas requisições (Debounce)
        clearTimeout(window.searchTimer);

        if (valor.length < 2) {
            setSugestoes([]);
            return;
        }

        window.searchTimer = setTimeout(async () => {
            try {
                console.log("Buscando termo:", valor); // Debug no console (F12)
                const response = await api.get(`/devices/sugestao`, {
                    params: { q: valor }
                });

                // LOG DE SEGURANÇA: Veja se os dados estão chegando
                console.log("Dados da API:", response.data);

                if (Array.isArray(response.data)) {
                    setSugestoes(response.data);
                }
            } catch (error) {
                console.error("Erro na busca de modelos:", error);
                setSugestoes([]);
            }
        }, 300);
    };

    const handleAdicionarFornecedor = async (e) => {
        e.preventDefault();
        try {
            await api.post('/vendors/adicionar', novoFornecedor);

            // Limpa o formulário após o sucesso
            setNovoFornecedor({ nome: '', whatsapp: '', prazo_entrega: '' });

            // Atualiza a lista de fornecedores na tela
            fetchData();

            alert("Fornecedor integrado com sucesso!");
        } catch (err) {
            console.error("Erro ao adicionar fornecedor:", err);
            alert("Erro ao integrar fornecedor. Verifique a conexão.");
        }
    };

    const handleEditarFornecedor = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/vendors/${editandoFornecedor.id}`, editandoFornecedor);
            setIsEditModalOpen(false);
            fetchData(); // Recarrega a lista do banco
            alert("Dados do fornecedor atualizados!");
        } catch (err) {
            console.error("Erro ao editar:", err);
            alert("Falha na atualização.");
        }
    };

    const handleDeletarFornecedor = async (id) => {
        if (window.confirm("Deseja desvincular este fornecedor?")) {
            setDeletingId(id); // <-- ATIVA O LOADING
            try {
                await api.delete(`/vendors/${id}`);
                fetchData(); // Atualiza a lista
            } catch (err) {
                alert("Erro ao remover fornecedor.");
            } finally {
                setDeletingId(null); // <-- DESLIGA O LOADING (no sucesso ou erro)
            }
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleAdicionarModelo = async (e) => {
        e.preventDefault();

        // Verificação de segurança: evita salvar campos vazios
        if (!novaMarca || !novoModelo) {
            alert("⚠️ Preencha todos os campos ou selecione uma sugestão.");
            return;
        }

        try {
            // Enviamos para a rota de criação de devices
            const response = await api.post('/devices/adicionar', {
                marca: novaMarca,
                modelo: novoModelo,
                // Se você tiver um estado para o código técnico, envie-o aqui
                codigo_tecnico: sugestoes.find(s => s.nome === novoModelo)?.codigo || ""
            });

            if (response.status === 201 || response.status === 200) {
                // Feedback visual de sucesso
                alert("✅ Modelo sincronizado com a Engine!");
                setNovaMarca('');
                setNovoModelo('');
                setSugestoes([]);
                fetchData(); // Atualiza a lista da direita
            }
        } catch (err) {
            console.error("Erro ao sincronizar modelo:", err);
            alert("❌ Erro ao salvar no banco de dados.");
        }
    };

    const handlePrepararEdicao = (modelo) => { 
        setNovaMarca(modelo.marca);
        setNovoModelo(modelo.modelo);
        // Rola para o topo para o usuário ver o formulário preenchido
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeletarModelo = async (id) => {
        if (window.confirm("Deseja remover este modelo da Engine?")) {
            try {
                await api.delete(`/devices/${id}`);
                fetchData();
            } catch (err) { alert("Erro ao deletar modelo."); }
        }
    };

    const handleDeletarUsuario = async (id, nome) => {
        if (window.confirm(`Deseja remover o acesso de ${nome}?`)) {
            try {
                await api.delete(`/auth/admin/usuarios/${id}`);
                fetchData();
            } catch (err) { alert("Erro ao remover usuário."); }
        }
    };

    // 1. Inicia o estado lendo do localStorage IMEDIATAMENTE
    const [isDark, setIsDark] = useState(() => {
        const savedTheme = localStorage.getItem('sgat_theme'); // Use um nome único
        if (savedTheme) {
            return savedTheme === 'dark';
        }
        // Se não houver salvo, checa preferência do sistema
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });
    // 2. Sempre que o estado isDark mudar, salva e aplica a classe no HTML
    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('sgat_theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('sgat_theme', 'light');
        }
    }, [isDark]); // Roda sempre que isDark alterar

    // 3. Função de toggle simplificada
    const toggleTheme = () => {
        setIsDark(prev => !prev);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#020617] transition-colors duration-500 font-sans pb-24 overflow-x-hidden">

            {/* --- HEADER ADAPTÁVEL --- */}
            <nav className="bg-white dark:bg-[#020617] border-b border-slate-100 dark:border-slate-800 sticky top-0 z-30 shadow-sm transition-colors">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:h-24 flex flex-col md:flex-row items-center justify-between gap-4">

                    {/* TÍTULO E VOLTAR */}
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <button
                            onClick={() => navigate('/admin/dashboard')}
                            className="p-3 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all text-slate-600 dark:text-slate-400 active:scale-90"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tighter leading-none uppercase italic">System Engine</h2>
                            <p className="text-slate-400 dark:text-slate-500 font-bold text-[9px] md:text-[10px] uppercase tracking-[0.2em] mt-1">Configurações Avançadas</p>
                        </div>
                    </div>

                    {/* SWITCH DE ABAS (Scroll Horizontal no Mobile) */}
                    <div className="w-full md:w-auto overflow-x-auto no-scrollbar pb-2 md:pb-0">
                        <div className="bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl flex gap-1 min-w-max">
                            {[
                                { id: 'modelos', label: 'Hardware', color: 'text-blue-600 dark:text-blue-400' },
                                { id: 'usuarios', label: 'Usuários', color: 'text-emerald-600 dark:text-emerald-400' },
                                { id: 'supply', label: 'Vendedores', color: 'text-amber-600 dark:text-amber-400' }
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setTab(item.id)}
                                    className={`px-5 md:px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${tab === item.id
                                        ? `bg-white dark:bg-slate-800 ${item.color} shadow-sm scale-105`
                                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
                                        }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </nav>

            {/* --- CONTEÚDO PRINCIPAL --- */}
            <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6 md:pt-10 space-y-6 md:space-y-8">

                {/* SWITCH DE TEMA (Otimizado p/ Mobile) */}
                <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all group hover:border-blue-500/30">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 md:p-4 rounded-2xl transition-all duration-500 ${isDark ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 rotate-[360deg]' : 'bg-slate-100 text-slate-400'}`}>
                                {isDark ? <Moon size={24} /> : <Sun size={24} />}
                            </div>
                            <div>
                                <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter italic leading-none text-sm md:text-base">Interface Visual</h4>
                                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 hidden sm:block">Otimização para telas OLED e baixa luz</p>
                                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 sm:hidden">Modo Escuro / Claro</p>
                            </div>
                        </div>

                        <button
                            onClick={toggleTheme}
                            className={`w-16 md:w-20 h-8 md:h-10 rounded-full p-1 transition-all duration-500 relative flex items-center ${isDark ? 'bg-blue-600' : 'bg-slate-200'}`}
                        >
                            <div className={`w-6 md:w-8 h-6 md:h-8 bg-white rounded-full shadow-md flex items-center justify-center transition-all duration-500 transform ${isDark ? 'translate-x-8 md:translate-x-10' : 'translate-x-0'}`}>
                                {isDark ? <Zap size={12} className="text-blue-600" /> : <Sun size={12} className="text-amber-500" />}
                            </div>
                        </button>
                    </div>

                </div>

                {tab === 'modelos' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* LADO ESQUERDO: FORM MODELO */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-slate-900 dark:bg-blue-950 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden border border-white/5">
                                <div className="absolute -top-10 -right-10 opacity-10"><Cpu size={150} /></div>
                                <h3 className="text-2xl font-black tracking-tighter uppercase italic mb-6">Novo Device</h3>

                                <form onSubmit={handleAdicionarModelo} className="space-y-4 relative z-10">
                                    {/* MODELO COM AUTOCOMPLETE INTELIGENTE */}
                                    <div className="space-y-2 relative">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 italic">Busca ou Nome Comercial</label>
                                        <div className="relative">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                                            <input
                                                placeholder="Ex: iPhone 13 Pro ou A2638"
                                                className="w-full p-4 pl-12 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-white transition-all placeholder:text-slate-700"
                                                value={novoModelo}
                                                onChange={e => handleDigitacaoModelo(e.target.value)}
                                                required
                                            />
                                        </div>

                                        {/* DROPDOWN DE SUGESTÕES - ALIMENTADO PELO SEU NOVO ENDPOINT */}
                                        {sugestoes.length > 0 && (
                                            <div className="absolute w-full mt-2 bg-slate-800 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 backdrop-blur-xl">
                                                {sugestoes.map((s) => (
                                                    <button
                                                        key={s.id}
                                                        type="button"
                                                        onClick={() => {
                                                            console.log("Selecionado:", s);
                                                            setNovoModelo(s.modelo); // Nome do campo no to_dict
                                                            setNovaMarca(s.marca);   // Nome do campo no to_dict
                                                            setSugestoes([]);        // Fecha o drop
                                                        }}
                                                        className="w-full p-4 text-left hover:bg-blue-600/30 border-b border-white/5 last:border-none flex justify-between items-center group transition-colors"
                                                    >
                                                        <div>
                                                            <p className="text-blue-400 font-bold text-xs uppercase">{s.modelo}</p>
                                                            <p className="text-[10px] text-slate-400 uppercase tracking-tighter">
                                                                {s.marca} <span className="text-slate-600">//</span> {s.codigo_tecnico}
                                                            </p>
                                                        </div>
                                                        <ChevronRight size={14} className="text-slate-700 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* FABRICANTE - PREENCHIDO AUTOMATICAMENTE OU MANUAL */}
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 italic">Fabricante</label>
                                        <input
                                            placeholder="Ex: Apple"
                                            className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-white transition-all placeholder:text-slate-600"
                                            value={novaMarca}
                                            onChange={e => setNovaMarca(e.target.value)}
                                            required
                                        />
                                    </div>

                                    {/* STATUS DE SINCRONIA (FEEDBACK VISUAL) */}
                                    <div className="flex items-center gap-2 ml-2 py-2">
                                        <div className={`w-2 h-2 rounded-full ${sugestoes.length === 0 && novoModelo.length > 3 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></div>
                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                            {sugestoes.length === 0 && novoModelo.length > 3 ? 'Pronto para Sincronizar' : 'Aguardando Entrada'}
                                        </span>
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full bg-blue-600 hover:bg-white hover:text-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-blue-900/20 active:scale-95 flex items-center justify-center gap-2 group"
                                    >
                                        <Database size={16} className="group-hover:animate-bounce" />
                                        Sincronizar com Engine
                                    </button>
                                </form>
                            </div>
                        </div>
                        {/* LADO DIREITO: GRID DE MARCAS EVOLUÍDO */}
                        <div className="lg:col-span-8 space-y-6 animate-in fade-in duration-700">

                            {/* SELETOR DE MARCAS (TABS VISUAIS) */}
                            <div className="flex flex-wrap gap-3 mb-8">
                                {['TODOS', 'Apple', 'Samsung', 'Motorola', 'Xiaomi', 'Google'].map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => setFiltroMarca(m === 'TODOS' ? '' : m)}
                                        className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-tighter transition-all 
                ${(filtroMarca === m || (m === 'TODOS' && !filtroMarca))
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105'
                                                : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800 hover:border-blue-500/50'}`}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>

                            {/* GRID DE MODELOS ESTILO "ENGINE CARDS" */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {modelos
                                    .filter(m => !filtroMarca || m.marca === filtroMarca)
                                    .map(m => (
                                        <div
                                            key={m.id}
                                            className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 hover:border-blue-500/30 transition-all group relative overflow-hidden shadow-sm"
                                        >
                                            {/* Marca d'água de fundo com a inicial da marca */}
                                            <span className="absolute -right-2 -bottom-4 text-7xl font-black text-slate-50 dark:text-slate-800/50 pointer-events-none group-hover:text-blue-500/10 transition-colors">
                                                {m.marca.charAt(0)}
                                            </span>

                                            <div className="relative z-10">
                                                <div className="flex justify-between items-start mb-4">
                                                    <span className="text-[8px] font-black text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg uppercase tracking-widest">
                                                        {m.marca}
                                                    </span>
                                                    <span className="text-[8px] font-mono text-slate-300 dark:text-slate-600">
                                                        #{m.id.toString().padStart(3, '0')}
                                                    </span>
                                                </div>

                                                <h4 className="text-lg font-black text-slate-800 dark:text-white uppercase italic tracking-tighter leading-none mb-1 group-hover:text-blue-500 transition-colors">
                                                    {m.modelo}
                                                </h4>

                                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                                    <Cpu size={10} /> {m.codigo_tecnico || 'N/A'}
                                                </p>

                                                {/* BOTÕES DE AÇÃO REAIS */}
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => handlePrepararEdicao(m)}
                                                        className="p-2.5 bg-white dark:bg-slate-800 text-slate-400 hover:text-blue-500 rounded-xl transition-all shadow-sm hover:scale-110"
                                                        title="Editar Modelo"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeletarModelo(m.id)}
                                                        className="p-2.5 bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-xl transition-all shadow-sm hover:scale-110"
                                                        title="Excluir Modelo"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>

                )}

                {tab === 'usuarios' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* LADO ESQUERDO: CADASTRO DE USUÁRIO */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-emerald-600 dark:bg-emerald-900/30 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden border border-white/5">
                                <div className="absolute -top-10 -right-10 opacity-10 rotate-12"><Users size={150} /></div>
                                <h3 className="text-2xl font-black tracking-tighter uppercase italic mb-6">Novo Usuário</h3>

                                <form onSubmit={handleAdicionarUsuario} className="space-y-4 relative z-10">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-emerald-100 uppercase tracking-widest ml-2">Nome Completo</label>
                                        <input
                                            placeholder="Ex: João Silva"
                                            className="w-full p-4 bg-white/10 border border-white/20 rounded-2xl outline-none focus:ring-2 focus:ring-white font-bold text-white transition-all"
                                            value={novoUsuario.nome_completo}
                                            onChange={(e) => setNovoUsuario({ ...novoUsuario, nome_completo: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-emerald-100 uppercase tracking-widest ml-2">E-mail</label>
                                        <input
                                            type="email"
                                            placeholder="joao@email.com"
                                            className="w-full p-4 bg-white/10 border border-white/20 rounded-2xl outline-none focus:ring-2 focus:ring-white font-bold text-white transition-all"
                                            value={novoUsuario.email}
                                            onChange={(e) => setNovoUsuario({ ...novoUsuario, email: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-emerald-100 uppercase tracking-widest ml-2">CPF</label>
                                            <IMaskInput
                                                mask="000.000.000-00"
                                                className="w-full p-4 bg-white/10 border border-white/20 rounded-2xl outline-none focus:ring-2 focus:ring-white font-bold text-white transition-all"
                                                value={novoUsuario.cpf}
                                                unmask={true}
                                                onAccept={(value) => setNovoUsuario({ ...novoUsuario, cpf: value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-emerald-100 uppercase tracking-widest ml-2">Cargo</label>
                                            <select
                                                className="w-full p-4 bg-white/10 border border-white/20 rounded-2xl outline-none focus:ring-2 focus:ring-white font-bold text-white transition-all appearance-none"
                                                value={novoUsuario.role}
                                                onChange={(e) => setNovoUsuario({ ...novoUsuario, role: e.target.value })}
                                            >
                                                <option value="cliente" className="text-slate-900">Cliente</option>
                                                <option value="tecnico" className="text-slate-900">Técnico</option>
                                                <option value="admin" className="text-slate-900">Administrador</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-emerald-100 uppercase tracking-widest ml-2">WhatsApp</label>
                                        <IMaskInput
                                            mask="(00) 00000-0000"
                                            className="w-full p-4 bg-white/10 border border-white/20 rounded-2xl outline-none focus:ring-2 focus:ring-white font-bold text-white transition-all"
                                            value={novoUsuario.telefone}
                                            unmask={true}
                                            onAccept={(value) => setNovoUsuario({ ...novoUsuario, telefone: value })}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-emerald-100 uppercase tracking-widest ml-2">Senha Inicial</label>
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            className="w-full p-4 bg-white/10 border border-white/20 rounded-2xl outline-none focus:ring-2 focus:ring-white font-bold text-white transition-all"
                                            value={novoUsuario.password}
                                            onChange={(e) => setNovoUsuario({ ...novoUsuario, password: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <button type="submit" className="w-full bg-white text-emerald-600 py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl hover:scale-[1.02] active:scale-95 mt-4">
                                        Cadastrar Usuário
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* LADO DIREITO: LISTAGEM DE USUÁRIOS */}
                        <div className="lg:col-span-8 animate-in fade-in duration-500">
                            <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">

                                {/* Header da Tabela */}
                                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 rounded-xl flex items-center justify-center">
                                            <Users size={20} />
                                        </div>
                                        <h3 className="font-black text-xl text-slate-800 dark:text-white tracking-tighter uppercase italic">User Management</h3>
                                    </div>

                                    <div className="relative w-full md:w-80">
                                        <Search className="absolute left-4 top-3.5 text-slate-300 dark:text-slate-600" size={18} />
                                        <input
                                            placeholder="Buscar usuário..."
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-transparent dark:border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                            value={filtro}
                                            onChange={e => setFiltro(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="text-left bg-slate-50/50 dark:bg-slate-950/50">
                                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Usuário</th>
                                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Contato</th>
                                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Permissão</th>
                                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Ação</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {usuarios.filter(u => u.nome_completo.toLowerCase().includes(filtro.toLowerCase())).map(u => (
                                                /* AQUI O HOVER ESMERALDA DINÂMICO */
                                                <tr key={u.id} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10 transition-all group">
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-4">
                                                            {/* O Avatar muda de cor no hover da linha (group-hover) */}
                                                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center font-black text-slate-400 dark:text-slate-500 uppercase group-hover:bg-white dark:group-hover:bg-slate-700 group-hover:text-emerald-500 transition-all duration-300 tracking-tighter">
                                                                {u.nome_completo.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-slate-800 dark:text-slate-200 text-lg leading-none mb-1 uppercase tracking-tighter group-hover:translate-x-1 transition-transform">
                                                                    {u.nome_completo}
                                                                </p>
                                                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1 uppercase tracking-widest">
                                                                    CPF: {u.cpf}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <div className="inline-flex flex-col items-center">
                                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1"> {u.email}</span>
                                                            <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase mt-1">{u.telefone || 'N/I'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-colors ${u.role === 'admin'
                                                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40'
                                                            }`}>
                                                            {u.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        {u.role !== 'admin' && (
                                                            <button
                                                                onClick={() => handleDeletarUsuario(u.id, u.nome_completo)}
                                                                className="bg-red-50 dark:bg-red-900/20 text-red-500 p-4 rounded-2xl hover:bg-red-500 dark:hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-95"
                                                            >
                                                                <UserMinus size={20} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'supply' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                        {/* LADO ESQUERDO: CADASTRO DE FORNECEDOR */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-amber-600 dark:bg-amber-900/30 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden border border-white/5">
                                <div className="absolute -top-10 -right-10 opacity-10 rotate-12"><Truck size={150} /></div>
                                <h3 className="text-2xl font-black tracking-tighter uppercase italic mb-6">Novo Vendedor</h3>

                                <form onSubmit={handleAdicionarFornecedor} className="space-y-4 relative z-10">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-amber-200 uppercase tracking-[0.2em] ml-2">Nome do Fornecedor</label>
                                        <input
                                            placeholder="Ex: Master Peças"
                                            className="w-full p-4 bg-white/10 border border-white/20 rounded-2xl outline-none focus:ring-2 focus:ring-white font-bold text-white transition-all placeholder:text-amber-200/50"
                                            value={novoFornecedor.nome}
                                            onChange={(e) => setNovoFornecedor({ ...novoFornecedor, nome: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2 group">
                                        <label className="text-[9px] font-black text-amber-200 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                            <PhoneCallIcon size={10} className="text-amber-400" /> WhatsApp de Cotação
                                        </label>

                                        <IMaskInput
                                            // Usamos um array de máscaras para dar flexibilidade ao processador do IMask
                                            mask={[
                                                { mask: '(00) 0000-0000' },
                                                { mask: '(00) 00000-0000' }
                                            ]}
                                            lazy={false}
                                            placeholderChar="_"
                                            className="w-full p-4 bg-white/10 border border-white/20 rounded-2xl outline-none focus:ring-2 focus:ring-amber-400 font-bold text-white transition-all"

                                            value={novoFornecedor.whatsapp}
                                            unmask={true}

                                            // FORÇA O IMASK A ACEITAR O PRIMEIRO DÍGITO IMEDIATAMENTE
                                            dispatch={(appended, dynamicMasked) => {
                                                const number = (dynamicMasked.value + appended).replace(/\D/g, '');
                                                if (number.length <= 10) {
                                                    return dynamicMasked.compiledMasks[0]; // Máscara de 8 dígitos
                                                }
                                                return dynamicMasked.compiledMasks[1]; // Máscara de 9 dígitos (padrão)
                                            }}

                                            onAccept={(value) => setNovoFornecedor({ ...novoFornecedor, whatsapp: value })}

                                            // BLINDAGEM MOBILE
                                            inputMode="tel"
                                            autoComplete="off"
                                            autoCorrect="off"
                                            required
                                        />

                                        <p className="text-[8px] font-bold text-amber-200/40 uppercase tracking-widest ml-2 italic">
                                            Formatado automaticamente para SYS_DB
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-amber-200 uppercase tracking-[0.2em] ml-2">Prazo de Entrega (Média)</label>
                                        <input
                                            placeholder="Ex: 2h via Motoboy"
                                            className="w-full p-4 bg-white/10 border border-white/20 rounded-2xl outline-none focus:ring-2 focus:ring-white font-bold text-white transition-all placeholder:text-amber-200/50"
                                            value={novoFornecedor.prazo_entrega}
                                            onChange={(e) => setNovoFornecedor({ ...novoFornecedor, prazo_entrega: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <button type="submit" className="w-full bg-white text-amber-600 py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl hover:scale-[1.02] active:scale-95">
                                        Integrar Fornecedor
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* LADO DIREITO: GRID DE FORNECEDORES REAIS */}
                        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Verificação robusta: se não for array ou estiver vazio, mostra o aviso */}
                            {Array.isArray(fornecedores) && fornecedores.length > 0 ? (
                                fornecedores.map((f) => (
                                    <div key={f.id} className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:border-amber-500/50 transition-all group relative animate-in fade-in zoom-in duration-300">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="w-14 h-14 bg-amber-500/10 text-amber-600 rounded-[1.5rem] flex items-center justify-center font-black text-xl shadow-inner uppercase">
                                                {f.nome.charAt(0)}
                                            </div>
                                            <div className="flex gap-1">
                                                {[...Array(f.rating || 5)].map((_, i) => (
                                                    <Star key={i} size={12} className="fill-amber-500 text-amber-500" />
                                                ))}
                                            </div>
                                        </div>

                                        <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase italic tracking-tighter leading-none mb-1">
                                            {f.nome}
                                        </h4>
                                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6 italic">
                                            Vendedor_ID_{f.id.toString().padStart(3, '0')} // Ativo
                                        </p>

                                        <div className="space-y-3 mb-8">
                                            <div className="flex items-center gap-3 text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase">
                                                <Clock size={14} className="text-amber-500" /> Lead_Time:
                                                <span className="text-slate-800 dark:text-slate-200 ml-1">{f.prazo_entrega}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    const msg = gerarMensagemCotacao(f.nome);
                                                    if (msg) {
                                                        // 1. Limpeza radical: remove qualquer coisa que não seja número
                                                        let foneLimpo = f.whatsapp.replace(/\D/g, '');

                                                        // 2. Lógica de Reparo de DDI (A Vacina)
                                                        // Se o número tem 10 ou 11 dígitos, ele está sem o 55 Brasil.
                                                        if (foneLimpo.length === 10 || foneLimpo.length === 11) {
                                                            foneLimpo = `55${foneLimpo}`;
                                                        }

                                                        // 3. Verificação de Segurança contra o "Bug do 11"
                                                        // Se o celular comeu o primeiro 1 e ficou com 12 dígitos começando com 5519...
                                                        // (Isso corrigiria se o dado já subiu errado pro banco)
                                                        if (foneLimpo.length === 12 && foneLimpo.startsWith('5519')) {
                                                            foneLimpo = foneLimpo.replace('551', '5511');
                                                        }

                                                        // 4. Disparo Seguro
                                                        const urlFinal = `https://wa.me/${foneLimpo}?text=${msg}`;
                                                        window.open(urlFinal, '_blank');
                                                    } else {
                                                        alert("Estoque em dia! Nenhuma peça abaixo do mínimo.");
                                                    }
                                                }}
                                                className="flex-1 py-4 bg-slate-900 dark:bg-slate-950 text-white rounded-2xl font-black uppercase text-[9px] tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all active:scale-95 shadow-lg relative overflow-hidden group"
                                            >
                                                <MessageCircle size={14} />
                                                {itensParaRepor.length > 0 ? `Cotar ${itensParaRepor.length} Itens` : "Consultar Catálogo"}
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setEditandoFornecedor(f);
                                                    setIsEditModalOpen(true);
                                                }}
                                                className="p-4 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-500 rounded-2xl transition-all active:scale-90"
                                            >
                                                <Edit size={18} /> {/* Importe o Edit do lucide-react */}
                                            </button>

                                            <button
                                                onClick={() => handleDeletarFornecedor(f.id)}
                                                disabled={deletingId === f.id} // <-- Desabilita durante a ação
                                                className="p-4 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-2xl transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {deletingId === f.id ? (
                                                    // Ícone de loading simples
                                                    <div className="w-[18px] h-[18px] border-2 border-red-500/50 border-t-red-500 rounded-full animate-spin"></div>
                                                ) : (
                                                    <Trash2 size={18} />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                /* AVISO DE VAZIO */
                                <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem]">
                                    <div className="bg-slate-100 dark:bg-slate-800/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                        <Truck size={30} />
                                    </div>
                                    <p className="text-slate-400 font-black uppercase italic tracking-widest text-xs">Nenhum fornecedor integrado ao sistema</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>
            {isEditModalOpen && editandoFornecedor && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] border border-slate-200 dark:border-slate-800 p-10 shadow-2xl animate-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-2xl font-black uppercase italic dark:text-white leading-none">Ajustar Vendor</h3>
                                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-2">ID_SINC: {editandoFornecedor.id}</p>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-red-500 transition-all"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleEditarFornecedor} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nome Comercial</label>
                                <input
                                    className="w-full p-5 bg-slate-50 dark:bg-slate-950 border-none rounded-[1.5rem] font-bold dark:text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                    value={editandoFornecedor.nome}
                                    onChange={(e) => setEditandoFornecedor({ ...editandoFornecedor, nome: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                                        WhatsApp de Contato
                                    </label>

                                    <IMaskInput
                                        // Usamos um array de máscaras para dar flexibilidade ao processador do IMask
                                        mask={[
                                            { mask: '(00) 0000-0000' },
                                            { mask: '(00) 00000-0000' }
                                        ]}
                                        lazy={false}
                                        placeholderChar="_"
                                        className="w-full p-4 bg-white/10 border border-white/20 rounded-2xl outline-none focus:ring-2 focus:ring-amber-400 font-bold text-white transition-all"

                                        value={editandoFornecedor.whatsapp}
                                        unmask={true}

                                        // FORÇA O IMASK A ACEITAR O PRIMEIRO DÍGITO IMEDIATAMENTE
                                        dispatch={(appended, dynamicMasked) => {
                                            const number = (dynamicMasked.value + appended).replace(/\D/g, '');
                                            if (number.length <= 10) {
                                                return dynamicMasked.compiledMasks[0]; // Máscara de 8 dígitos
                                            }
                                            return dynamicMasked.compiledMasks[1]; // Máscara de 9 dígitos (padrão)
                                        }}

                                        onAccept={(value) => setEditandoFornecedor({ ...editandoFornecedor, whatsapp: value })}

                                        // BLINDAGEM MOBILE
                                        inputMode="tel"
                                        autoComplete="off"
                                        autoCorrect="off"
                                        required
                                    />

                                    <p className="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em] ml-2 italic">
                                        ID_SYSTEM: Sync_Validated
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Prazo de Entrega</label>
                                    <input
                                        className="w-full p-5 bg-slate-50 dark:bg-slate-950 border-none rounded-[1.5rem] font-bold dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                                        value={editandoFornecedor.prazo_entrega}
                                        onChange={(e) => setEditandoFornecedor({ ...editandoFornecedor, prazo_entrega: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest transition-all shadow-xl shadow-amber-900/20 active:scale-95 mt-4">
                                Salvar Alterações
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>

    );
};

export default Configuracoes;