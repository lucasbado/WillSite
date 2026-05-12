import React, { useEffect, useState, useRef } from 'react';
import {
    PlusCircle, ClipboardList, Clock, CheckCircle, X,
    Trash2, Package, Settings, LogOut, Smartphone,
    Calendar, AlertCircle, ChevronRight, Cpu, ShieldCheck, MessageCircle, Printer, ArrowLeft,
    ShieldAlert, Zap, Power, Usb, Camera, ChevronDown, CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

const DashboardCliente = () => {
    const navigate = useNavigate();
    const [historico, setHistorico] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [listaModelos, setListaModelos] = useState([]);
    const [formData, setFormData] = useState({ modelo: '', problema: '', data_entrega: '' });
    const [loading, setLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [cameraAtiva, setCameraAtiva] = useState(false);
    const [verDetalhesOS, setVerDetalhesOS] = useState(null);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scannerStatus, setScannerStatus] = useState("Aguardando leitura...");
    const scannerRef = useRef(null);

    const handleLogout = () => {
        sessionStorage.clear();
        navigate('/');
    };

    const fetchModelos = async () => {
        try {
            const res = await api.get('/devices/listar');
            setListaModelos(res.data);
        } catch (err) { console.error("Erro modelos:", err); }
    };

    const fetchHistorico = async () => {
        try {
            const res = await api.get('/os/meu-historico');
            setHistorico(res.data);
        } catch (err) { console.error("Erro histórico:", err); }
    };

    useEffect(() => { fetchHistorico(); fetchModelos(); }, []);

    const STATUS_WEIGHTS = {
        'pendente': 1,
        'aguardando agendamento': 1,
        'recebido': 1,
        'agendado': 2,
        'em manutenção': 2,
        'em manutencao': 2,
        'pronto para retirada': 3,
        'liberado': 3,
        'entregue': 4,      // Verifique se é este o nome no banco
        'finalizado': 4,    // Verifique se é este
        'concluído': 4,
        'Concluído': 4,
        'concluido': 4
    };

    // 2. Obtenha o peso do status atual da OS selecionada
    const currentStatus = verDetalhesOS?.status?.toLowerCase().trim() || '';
    const currentWeight = STATUS_WEIGHTS[currentStatus] || 0;

    // 3. Transforme em booleanos de "Caminho Percorrido"
    const isRecebido = currentWeight >= 1;
    const isEmReparo = currentWeight >= 2;
    const isPronto = currentWeight >= 3;
    const isEntregue = currentWeight >= 4;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/os/abrir', formData);
            setIsModalOpen(false);
            setFormData({ modelo: '', problema: '', data_entrega: '', valor_servico: 0 });
            fetchHistorico();
        } catch (err) { alert("Erro ao abrir OS."); }
        finally { setLoading(false); }
    };

    const onScanSuccess = async (decodedText) => {
        if (loading) return;
        setLoading(true);

        try {
            // 1. PARA O SCANNER PRIMEIRO DE TUDO (Antes da API)
            if (scannerRef.current && scannerRef.current.isScanning) {
                await scannerRef.current.stop();
                // Não dê .clear() aqui, deixe o useEffect do cleanup cuidar disso
            }

            const data = JSON.parse(decodedText);

            // 2. CHAMADA DE API
            const res = await api.post('/os/validar-qr-entrega', {
                os_id: data.os_id,
                token: data.token
            });

            alert("✅ Entrega Confirmada!");
            setIsScannerOpen(false);
            window.location.reload();

        } catch (err) {
            console.error("Erro no Processo:", err);

            // Se deu erro 405, mostre na tela mas NÃO feche o modal bruscamente
            setScannerStatus(err.response?.status === 405 ? "❌ ERRO 405: SERVIDOR RECUSOU" : "❌ QR INVÁLIDO");

            // 3. SE DEU ERRO, PRECISAMOS REINICIAR O SCANNER OU FECHAR COM SEGURANÇA
            setTimeout(() => setLoading(false), 2000);
        }
    };

    const handleExcluir = async (id) => {
        if (window.confirm("Deseja realmente cancelar esta solicitação?")) {
            try {
                await api.patch(`/os/excluir/${id}`);
                fetchHistorico();
                alert("Solicitação cancelada com sucesso.");
            } catch (err) {
                alert(err.response?.data?.msg || "Erro ao cancelar OS.");
            }
        }
    };

    useEffect(() => {
        if (isScannerOpen) {
            const html5QrCode = new Html5Qrcode("reader");
            scannerRef.current = html5QrCode;

            html5QrCode.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                onScanSuccess
            ).then(() => setCameraAtiva(true))
                .catch(err => setScannerStatus("Erro ao acessar câmera"));
        }

        return () => {
            if (scannerRef.current) {
                const fechar = async () => {
                    if (scannerRef.current.isScanning) {
                        await scannerRef.current.stop();
                    }
                    scannerRef.current.clear(); // Limpa o elemento HTML
                    scannerRef.current = null;
                };
                fechar();
            }
        }
    });


    return (
        // Fundo da Página: bg-slate-50 | Dark: bg-[#020617]
        <div className="h-screen overflow-y-auto bg-slate-50 dark:bg-[#020617] font-sans pb-20 transition-colors duration-500 modern-scroll-v">

            {/* --- NAVBAR SUPERIOR --- */}
            <nav className="bg-white/90 dark:bg-[#020617]/90 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 sticky top-0 z-50 w-full shadow-sm">
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-900 dark:bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
                            <Cpu size={22} strokeWidth={2.5} />
                        </div>
                        <span className="text-xl font-black tracking-tighter text-slate-800 dark:text-slate-50 uppercase">
                            SGAT<span className="text-blue-600 dark:text-blue-500">.</span>
                        </span>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        <button
                            onClick={() => navigate('/cliente/perfil')}
                            className="p-3 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl transition-all"
                        >
                            <Settings size={22} />
                        </button>
                        <button
                            onClick={handleLogout}
                            className="p-3 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all"
                        >
                            <LogOut size={22} />
                        </button>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-6 pt-8 md:pt-12">

                {/* --- WELCOME HEADER --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 md:mb-12">
                    <div>
                        <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-slate-50 tracking-tighter leading-none mb-3 italic uppercase">
                            Olá, {sessionStorage.getItem('user_name') || 'Cliente'}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm md:text-base">
                            Você tem <span className="text-blue-600 dark:text-blue-500 font-black">
                                {historico.filter(o => o.status !== 'Concluído').length} reparos
                            </span> ativos hoje.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="w-full md:w-auto bg-blue-600 dark:bg-blue-600 text-white px-8 py-5 rounded-[2rem] font-black text-base md:text-lg flex items-center justify-center gap-3 hover:bg-slate-900 dark:hover:bg-blue-500 transition-all shadow-2xl shadow-blue-100 dark:shadow-none active:scale-95 uppercase italic tracking-tight"
                    >
                        <PlusCircle size={24} /> NOVA SOLICITAÇÃO
                    </button>
                    <button
                        onClick={() => setIsScannerOpen(true)}
                        className="w-full md:w-auto bg-slate-900 dark:bg-cyan-600 text-white px-8 py-5 rounded-[2rem] font-black text-base md:text-lg flex items-center justify-center gap-3 hover:bg-cyan-500 transition-all shadow-2xl active:scale-95 uppercase italic tracking-tight border-2 border-cyan-400/20"
                    >
                        <Camera size={24} /> VALIDAR RETIRADA
                    </button>
                </div>

                {/* --- STATUS CARDS (GRID COM SCROLL HORIZONTAL NO MOBILE) --- */}
                <div className="flex overflow-x-auto md:grid md:grid-cols-3 gap-4 md:gap-6 mb-12 pb-4 md:pb-0 no-scrollbar snap-x snap-mandatory">

                    {/* CARD 1: TOTAL (Aparelhos) */}
                    <div className="min-w-[85%] md:min-w-0 snap-center bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm md:shadow-md flex items-center gap-5 md:gap-6 group hover:shadow-xl dark:hover:shadow-blue-900/10 transition-all shrink-0">
                        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 p-4 md:p-5 rounded-2xl md:rounded-3xl group-hover:scale-110 transition-transform shadow-inner">
                            <Smartphone size={28} strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest italic leading-none">Aparelhos</p>
                            <p className="text-3xl md:text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tighter leading-none mt-2 md:mt-1 italic">{historico.length}</p>
                        </div>
                    </div>

                    {/* CARD 2: EM ANÁLISE */}
                    <div className="min-w-[85%] md:min-w-0 snap-center bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm md:shadow-md flex items-center gap-5 md:gap-6 group hover:shadow-xl dark:hover:shadow-amber-900/10 transition-all shrink-0">
                        <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 p-4 md:p-5 rounded-2xl md:rounded-3xl group-hover:scale-110 transition-transform shadow-inner">
                            <Clock size={28} strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest italic leading-none">Em Análise</p>
                            <p className="text-3xl md:text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tighter leading-none mt-2 md:mt-1 italic">
                                {historico.filter(o => o.status === 'Pendente').length}
                            </p>
                        </div>
                    </div>

                    {/* CARD 3: PRONTOS (Destaque Emerald) */}
                    <div className="min-w-[85%] md:min-w-0 snap-center bg-emerald-600 dark:bg-emerald-600/90 p-6 md:p-8 rounded-[2.5rem] shadow-2xl shadow-emerald-200 dark:shadow-none flex items-center gap-5 md:gap-6 group hover:bg-slate-900 dark:hover:bg-emerald-500 transition-all shrink-0">
                        <div className="bg-white/20 text-white p-4 md:p-5 rounded-2xl md:rounded-3xl group-hover:scale-110 transition-transform shadow-inner">
                            <CheckCircle size={28} strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest italic leading-none">Prontos</p>
                            <p className="text-3xl md:text-4xl font-black text-white tracking-tighter leading-none mt-2 md:mt-1 italic">
                                {historico.filter(o => o.status === 'Concluído').length}
                            </p>
                        </div>
                    </div>
                </div>

                {/* --- REPAROS ATIVOS (O CORAÇÃO DO DASHBOARD) --- */}
                <div className="max-w-7xl mx-auto px-6 pb-24 md:pb-12">
                    <h3 className="text-[10px] md:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-6 ml-4 italic">
                        Seus Dispositivos
                    </h3>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {historico.length === 0 ? (
                            /* --- ESTADO VAZIO --- */
                            <div className="col-span-1 lg:col-span-2 bg-white dark:bg-slate-900 rounded-[3rem] p-12 md:p-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 animate-in fade-in duration-500">
                                <AlertCircle size={48} className="text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                                <p className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest text-xs">
                                    Nenhuma ordem de serviço encontrada.
                                </p>
                            </div>
                        ) : (
                            historico.map(os => (
                                <div
                                    key={os.id}
                                    className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl dark:hover:shadow-blue-900/10 transition-all group overflow-hidden relative"
                                >
                                    {/* Badge de Status: Emerald ou Blue */}
                                    <div className={`absolute top-6 right-6 md:top-8 md:right-8 px-4 py-1.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-colors ${os.status === 'Concluído'
                                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                        : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 animate-pulse'
                                        }`}>
                                        {os.status}
                                    </div>

                                    <div className="flex flex-col md:flex-row gap-6 items-start">
                                        {/* Ícone Dispositivo */}
                                        <div className={`p-5 rounded-[2rem] transition-colors ${os.status === 'Concluído'
                                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500'
                                            : 'bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-600'
                                            }`}>
                                            <Smartphone size={32} strokeWidth={2.5} />
                                        </div>

                                        <div className="flex-1 w-full">
                                            <h4 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter leading-none mb-1 uppercase italic">
                                                {os.modelo}
                                            </h4>
                                            <p className="text-slate-400 dark:text-slate-500 font-bold text-xs mb-6 flex items-center gap-2">
                                                <Calendar size={14} /> Aberta em {os.data_abertura}
                                            </p>

                                            {/* Timeline de Status */}
                                            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-800 mb-6">
                                                <div className="flex items-start gap-3">
                                                    <div className={`mt-1.5 w-3 h-3 rounded-full shrink-0 ${os.status === 'Concluído'
                                                        ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                                                        : 'bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)] animate-ping'
                                                        }`}></div>

                                                    <div className="flex flex-col">
                                                        <p className={`text-[10px] md:text-xs font-black uppercase tracking-tighter ${os.status === 'Concluído' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'
                                                            }`}>
                                                            {os.status === 'Concluído' ? 'Reparo Finalizado' : 'Manutenção Técnica em Curso'}
                                                        </p>
                                                        <p className="text-[10px] md:text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-1 leading-relaxed uppercase">
                                                            {os.status === 'Concluído'
                                                                ? `Retirada disponível: ${os.data_agendada_admin}`
                                                                : os.data_agendada_admin !== "Em análise técnica"
                                                                    ? `Previsão: ${os.data_agendada_admin}`
                                                                    : 'Aparelho em triagem no laboratório técnico.'
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Ações: Desktop e Mobile friendly */}
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => setVerDetalhesOS(os)}
                                                    className="flex-1 bg-slate-900 dark:bg-blue-600 text-white py-4 rounded-2xl md:rounded-3xl font-black text-[10px] md:text-xs uppercase tracking-[0.2em] hover:bg-blue-600 dark:hover:bg-blue-500 transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-lg shadow-slate-900/10 dark:shadow-blue-900/20"
                                                >
                                                    Ver Detalhes <ChevronRight size={16} strokeWidth={3} />
                                                </button>

                                                {os.status === 'Pendente' && (
                                                    <button
                                                        onClick={() => handleExcluir(os.id)}
                                                        className="p-4 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-2xl md:rounded-3xl hover:bg-red-600 dark:hover:bg-red-500 hover:text-white transition-all active:scale-90 border border-transparent dark:border-red-500/20"
                                                        title="Cancelar Solicitação"
                                                    >
                                                        <Trash2 size={20} strokeWidth={2.5} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* --- MODAL NOVA SOLICITAÇÃO (Refatorado para Split & Responsive) --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/80 dark:bg-slate-950/90 backdrop-blur-xl flex items-end md:items-center justify-center p-0 md:p-4 z-[100] animate-in fade-in duration-300">

                    {/* Container Principal */}
                    <div className="bg-white dark:bg-slate-900 rounded-t-[3rem] md:rounded-[3.5rem] max-w-2xl w-full flex flex-col md:flex-row overflow-hidden shadow-3xl border border-transparent dark:border-slate-800 h-[90vh] md:h-auto transition-all">

                        {/* 1. Lado Informativo (Sidebar) */}
                        <div className="w-full md:w-1/3 bg-blue-600 p-8 md:p-10 flex flex-row md:flex-col justify-between items-center md:items-start text-white shrink-0">
                            <div className="relative">
                                <Smartphone size={window.innerWidth < 768 ? 32 : 40} className="mb-0 md:mb-6 opacity-30 animate-pulse" />
                                <div className="absolute -inset-4 bg-white/20 blur-2xl rounded-full md:hidden"></div>
                            </div>

                            <div className="md:mt-4">
                                <h3 className="text-xl md:text-2xl font-black leading-none tracking-tighter uppercase italic">
                                    Rápido & <br className="hidden md:block" /> Seguro.
                                </h3>
                                <p className="hidden md:block text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mt-4 italic">
                                    SGAT Technical Support
                                </p>
                            </div>

                            {/* Botão fechar Mobile (dentro da parte azul) */}
                            <button onClick={() => setIsModalOpen(false)} className="md:hidden text-white/50 hover:text-white p-2">
                                <X size={28} strokeWidth={3} />
                            </button>
                        </div>

                        {/* 2. Lado do Formulário */}
                        <div className="w-full md:w-2/3 p-8 md:p-12 relative overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900">
                            {/* Botão fechar Desktop */}
                            <button onClick={() => setIsModalOpen(false)} className="hidden md:block absolute top-8 right-8 text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                <X size={28} strokeWidth={3} />
                            </button>

                            <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-50 tracking-tighter mb-8 uppercase italic leading-none">
                                Nova Solicitação
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8 pb-10 md:pb-0">
                                {/* Input Modelo com Sugestão Visual Tech */}
                                <div className="space-y-3 group relative">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                        <Cpu size={14} className="text-blue-500" /> Modelo do Dispositivo
                                    </label>

                                    <div className="relative">
                                        <input
                                            placeholder="EX: IPHONE 15 PRO..."
                                            className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-500 rounded-2xl p-5 md:p-6 font-black text-slate-700 dark:text-slate-200 outline-none transition-all shadow-inner uppercase italic text-sm tracking-tighter"
                                            value={formData.modelo}
                                            onChange={e => {
                                                setFormData({ ...formData, modelo: e.target.value });
                                                setShowSuggestions(true);
                                            }}
                                            onFocus={() => setShowSuggestions(true)}
                                        />

                                        {/* Ícone de Scanner Visual */}
                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity">
                                            <Smartphone size={20} className="text-blue-500" />
                                        </div>

                                        {/* PAINEL DE SUGESTÕES "HARDWARE SELECTOR" */}
                                        {showSuggestions && formData.modelo.length > 0 && (
                                            <div className="absolute z-[110] w-full mt-2 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                                                <div className="p-2 max-h-60 overflow-y-auto custom-scrollbar">
                                                    {listaModelos
                                                        .filter(m => m.modelo.toLowerCase().includes(formData.modelo.toLowerCase()))
                                                        .slice(0, 6) // Limita para não poluir
                                                        .map((m) => (
                                                            <button
                                                                key={m.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setFormData({ ...formData, modelo: m.modelo });
                                                                    setShowSuggestions(false);
                                                                }}
                                                                className="w-full flex items-center justify-between p-4 hover:bg-blue-600 group/item rounded-2xl transition-all mb-1"
                                                            >
                                                                <div className="flex flex-col items-start">
                                                                    <span className="text-[8px] font-black text-blue-500 group-hover/item:text-blue-200 uppercase tracking-widest mb-1">
                                                                        {m.marca}
                                                                    </span>
                                                                    <span className="text-sm font-black text-slate-700 dark:text-slate-200 group-hover/item:text-white uppercase italic tracking-tighter">
                                                                        {m.modelo}
                                                                    </span>
                                                                </div>
                                                                <div className="p-2 bg-slate-50 dark:bg-slate-800 group-hover/item:bg-white/20 rounded-xl text-slate-400 group-hover/item:text-white transition-colors">
                                                                    <ArrowLeft className="rotate-180" size={16} strokeWidth={3} />
                                                                </div>
                                                            </button>
                                                        ))
                                                    }

                                                    {/* Caso não encontre nada, incentiva o usuário a continuar digitando */}
                                                    {listaModelos.filter(m => m.modelo.toLowerCase().includes(formData.modelo.toLowerCase())).length === 0 && (
                                                        <div className="p-6 text-center">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase italic">
                                                                Modelo não listado? Continue digitando...
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Footer do Dropdown */}
                                                <div className="bg-slate-50 dark:bg-slate-950 px-6 py-3 border-t border-slate-100 dark:border-slate-800">
                                                    <p className="text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em]">
                                                        Database SGAT v2.6.3
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {/* Descrição do Problema com Tags de Diagnóstico Rápido */}
                                <div className="space-y-4 group animate-in fade-in slide-in-from-top-4 duration-500 delay-150">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                            <ShieldAlert size={14} className="text-blue-500" /> Sintomas do Defeito
                                        </label>
                                        <span className="text-[8px] font-black text-blue-500/50 uppercase tracking-widest hidden md:block italic">
                                            Input_Log_v2
                                        </span>
                                    </div>

                                    {/* CHIPS DE DIAGNÓSTICO RÁPIDO (Scroll Horizontal no Mobile) */}
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 snap-x">
                                        {[
                                            { label: 'Tela Quebrada', icon: <Smartphone size={12} /> },
                                            { label: 'Bateria Ruim', icon: <Zap size={12} /> },
                                            { label: 'Não Liga', icon: <Power size={12} /> },
                                            { label: 'Conector de Carga', icon: <Usb size={12} /> },
                                            { label: 'Câmera Falhando', icon: <Camera size={12} /> }
                                        ].map((tag) => (
                                            <button
                                                key={tag.label}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, problema: tag.label.toUpperCase() })}
                                                className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shrink-0 snap-center active:scale-95"
                                            >
                                                {tag.icon}
                                                {tag.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="relative">
                                        <textarea
                                            rows="4"
                                            placeholder="DESCREVA O QUE ESTÁ ACONTECENDO COM O APARELHO..."
                                            className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-500 rounded-[2rem] p-6 font-black text-slate-700 dark:text-slate-200 outline-none transition-all shadow-inner uppercase italic text-xs md:text-sm resize-none placeholder:text-slate-200 dark:placeholder:text-slate-800"
                                            value={formData.problema}
                                            onChange={e => setFormData({ ...formData, problema: e.target.value.toUpperCase() })}
                                            required
                                        />

                                        {/* Indicador Visual de Linhas de Código (Brutalismo) */}
                                        <div className="absolute left-0 top-6 bottom-6 w-1 bg-slate-100 dark:bg-slate-800 rounded-r-full"></div>
                                    </div>
                                </div>
                                {/* --- CALENDÁRIO DE AGENDAMENTO LOGÍSTICO --- */}
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                            <Calendar size={14} className="text-blue-500" /> Janela de Entrega na Loja
                                        </label>
                                        <span className="text-[9px] font-black text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full italic uppercase">
                                            Sistema_Agendamento_v1
                                        </span>
                                    </div>

                                    {/* GRID DE DIAS (Mini Calendário) */}
                                    <div className="bg-slate-50 dark:bg-slate-950 p-4 md:p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 snap-x">
                                            {Array.from({ length: 14 }).map((_, i) => {
                                                const date = new Date();
                                                date.setDate(date.getDate() + i);
                                                const diaSemana = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
                                                const diaMes = date.getDate();
                                                const isDomingo = date.getDay() === 0;
                                                const isSelected = formData.data_entrega_dia === date.toISOString().split('T')[0];

                                                if (isDomingo) return null;

                                                return (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({ ...formData, data_entrega_dia: date.toISOString().split('T')[0], data_entrega_hora: '' });
                                                        }}
                                                        className={`flex flex-col items-center min-w-[70px] py-4 rounded-2xl border-2 transition-all snap-center active:scale-90 ${isSelected
                                                            ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-900/20'
                                                            : 'bg-white dark:bg-slate-900 border-transparent dark:border-slate-800 text-slate-400'
                                                            }`}
                                                    >
                                                        <span className={`text-[10px] font-black uppercase mb-1 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                                            {diaSemana}
                                                        </span>
                                                        <span className="text-xl font-black tracking-tighter italic leading-none">
                                                            {diaMes}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* SLOTS DE HORA (Aparecem após selecionar o dia) */}
                                        {formData.data_entrega_dia && (
                                            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-2">
                                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 text-center italic">
                                                    {new Date(formData.data_entrega_dia).toLocaleDateString('pt-BR', { weekday: 'long' })}: Selecione o Horário
                                                </p>
                                                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                                                    {Array.from({ length: 11 }).map((_, i) => {
                                                        const hora = i + 9;
                                                        const isSabado = new Date(formData.data_entrega_dia + 'T00:00:00').getDay() === 6;
                                                        const isFinalDia = isSabado ? hora > 15 : hora > 18;
                                                        const isSelectedHora = formData.data_entrega_hora === `${hora}:00`;

                                                        if (isFinalDia) return null;

                                                        return (
                                                            <button
                                                                key={hora}
                                                                type="button"
                                                                onClick={() => setFormData({ ...formData, data_entrega_hora: `${hora}:00` })}
                                                                className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${isSelectedHora
                                                                    ? 'bg-slate-900 border-slate-900 dark:bg-blue-500 dark:border-blue-400 text-white shadow-lg'
                                                                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-blue-500'
                                                                    }`}
                                                            >
                                                                {hora}:00 HS
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* FEEDBACK FINAL */}
                                    {formData.data_entrega_dia && formData.data_entrega_hora && (
                                        <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-500/20 flex items-center gap-4 animate-in zoom-in">
                                            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
                                                <CheckCircle2 size={24} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Check-in Confirmado</p>
                                                <p className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase italic tracking-tighter">
                                                    {new Date(formData.data_entrega_dia + 'T00:00:00').toLocaleDateString('pt-BR')} às {formData.data_entrega_hora}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Botão de Submissão */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-slate-900 dark:bg-blue-600 text-white py-5 md:py-6 rounded-2xl md:rounded-[2rem] font-black text-base md:text-xl hover:bg-blue-600 dark:hover:bg-blue-500 transition-all shadow-xl shadow-blue-100 dark:shadow-none active:scale-95 flex items-center justify-center gap-3 uppercase italic tracking-tighter disabled:opacity-50"
                                >
                                    {loading ? (
                                        <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <PlusCircle size={24} /> ABRIR ORDEM DE SERVIÇO
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            {/* --- MODAL SCANNER DE RETIRADA --- */}
            {isScannerOpen && (
                <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-2xl z-[200] flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="max-w-md w-full text-center">
                        <h2 className="text-2xl font-black text-cyan-400 italic uppercase tracking-tighter mb-8 flex items-center justify-center gap-3">
                            <ShieldCheck size={32} /> Scanner de Retirada
                        </h2>

                        {/* O CONTAINER DA CÂMERA */}
                        <div className="relative group w-full max-w-[320px] mx-auto">
                            <div
                                id="reader"
                                className="w-full aspect-square rounded-[3rem] overflow-hidden border-4 border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.2)] bg-slate-900"
                            ></div>
                            {cameraAtiva && (
                                <div className="absolute inset-0 pointer-events-none z-20">
                                    {/* Linha Laser de Scan */}
                                    <div className="w-full h-[2px] bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.8)] absolute top-0 animate-scan-line"></div>

                                    {/* Cantos de Enquadramento */}
                                    <div className="absolute inset-12 border-2 border-cyan-500/20 rounded-3xl">
                                        <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg"></div>
                                        <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg"></div>
                                        <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg"></div>
                                        <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-cyan-400 rounded-br-lg"></div>
                                    </div>
                                </div>
                            )}
                            {/* Overlay de Scanner */}
                            <div className="absolute inset-0 border-2 border-cyan-500/50 rounded-[3rem] pointer-events-none animate-pulse"></div>
                        </div>


                        <div className="mt-10 p-6 bg-slate-900/50 rounded-3xl border border-slate-800">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 italic">Status_System_Link</p>
                            <p className="text-white font-bold uppercase italic tracking-tight">{scannerStatus}</p>
                        </div>

                        <button
                            onClick={() => setIsScannerOpen(false)}
                            className="mt-12 text-slate-500 hover:text-white font-black uppercase tracking-[0.4em] text-[10px] transition-colors"
                        >
                            [ Abortar Operação ]
                        </button>
                    </div>
                </div>
            )}

            {/* --- DETALHES DA OS (ESTEIRA DE STATUS TÉCNICA ATUALIZADA) --- */}
            {verDetalhesOS && (
                (
                        <div className="fixed inset-0 bg-slate-900/80 dark:bg-slate-950/90 backdrop-blur-xl flex items-end md:items-center justify-center p-0 md:p-4 z-[100] animate-in fade-in duration-300">

                            <div className="bg-white dark:bg-slate-900 rounded-t-[3rem] md:rounded-[4rem] max-w-xl w-full p-8 md:p-12 shadow-3xl relative animate-in slide-in-from-bottom-6 md:zoom-in duration-300 max-h-[92vh] overflow-y-auto border border-transparent dark:border-slate-800 transition-all custom-scrollbar">

                                {/* Botão Fechar */}
                                <button
                                    onClick={() => setVerDetalhesOS(null)}
                                    className="absolute top-8 right-8 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-all active:scale-90"
                                >
                                    <X size={window.innerWidth < 768 ? 28 : 32} strokeWidth={3} />
                                </button>

                                {/* Cabeçalho */}
                                <div className="mb-10 text-center md:text-left">
                                    <div className="flex flex-col md:flex-row items-center gap-4 mb-4 justify-center md:justify-start">
                                        <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shadow-inner">
                                            <Smartphone size={28} strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-50 tracking-tighter leading-none uppercase italic">
                                                OS #{verDetalhesOS.id}
                                            </h3>
                                            <p className="text-slate-400 dark:text-slate-500 font-black text-[10px] md:text-xs tracking-[0.2em] uppercase mt-1">
                                                {verDetalhesOS.modelo}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                {/* ESTEIRA DE STATUS (4 ESTÁGIOS) */}
                                <div className="mb-12 relative px-2">
                                    <div className="flex justify-between items-start w-full relative z-10">

                                        {/* Status 1: Recebido (Tamanho Fixo) */}
                                        <div className="flex flex-col items-center gap-3 shrink-0">
                                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-4 transition-all duration-500 
        ${isRecebido ? 'bg-blue-600 border-blue-200 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-300'}`}>
                                                <ClipboardList size={20} strokeWidth={3} />
                                            </div>
                                            <span className={`text-[7px] md:text-[9px] font-black uppercase tracking-tighter ${isRecebido ? 'text-blue-600' : 'text-slate-400'}`}>Recebido</span>
                                        </div>

                                        {/* Linha 1 (Flexível) */}
                                        <div className={`h-1.5 flex-1 mt-5 md:mt-6 transition-colors duration-700 
  ${currentWeight >= 2 ? 'bg-blue-600' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                        </div>

                                        {/* Status 2: Reparo (Tamanho Fixo) */}
                                        <div className="flex flex-col items-center gap-3 shrink-0">
                                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-4 transition-all duration-500 
        ${isEmReparo ? 'bg-blue-600 border-blue-200 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-300'}
        ${currentStatus === 'em manutenção' || currentStatus === 'em manutencao' ? 'animate-pulse' : ''}`}>
                                                <Cpu size={20} strokeWidth={3} />
                                            </div>
                                            <span className={`text-[7px] md:text-[9px] font-black uppercase tracking-tighter ${isEmReparo ? 'text-blue-600' : 'text-slate-400'}`}>Reparo</span>
                                        </div>

                                        {/* Linha 2 (Flexível) */}
                                        <div className={`h-1.5 flex-1 mt-5 md:mt-6 transition-colors duration-700 ${isPronto ? 'bg-emerald-500' : 'bg-slate-100 dark:bg-slate-800'}`}></div>

                                        {/* Status 3: Pronto (Tamanho Fixo) */}
                                        <div className="flex flex-col items-center gap-3 shrink-0">
                                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-4 transition-all duration-500 
                ${isPronto ? 'bg-emerald-500 border-emerald-200 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-300'}
                ${currentStatus === 'pronto para retirada' ? 'animate-bounce' : ''}`}>
                                                <Package size={20} strokeWidth={3} className={isPronto ? 'text-white' : 'text-slate-300'} />
                                            </div>
                                            <span className={`text-[7px] md:text-[9px] font-black uppercase tracking-tighter ${isPronto ? 'text-emerald-600' : 'text-slate-400'}`}>Liberado</span>
                                        </div>

                                        {/* Linha 3 (Flexível) */}
                                        <div className={`h-1.5 flex-1 mt-5 md:mt-6 transition-colors duration-700 ${isEntregue ? 'bg-emerald-500' : 'bg-slate-100 dark:bg-slate-800'}`}></div>

                                        {/* Status 4: Finalizado (Tamanho Fixo) */}
                                        <div className="flex flex-col items-center gap-3 shrink-0">
                                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-4 transition-all duration-500 
                ${isEntregue ? 'bg-blue-700 text-white border-blue-200 shadow-lg' : 'bg-white border-slate-100 text-slate-300'}`}>
                                                <ShieldCheck size={20} strokeWidth={3} className={isEntregue ? 'text-white' : 'text-slate-300'} />
                                            </div>
                                            <span className={`text-[7px] md:text-[9px] font-black uppercase tracking-tighter ${isEntregue ? 'text-blue-700 dark:text-blue-400' : 'text-slate-400'}`}>Entregue</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {/* GRID DE DATAS */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Entrada</p>
                                            <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">{verDetalhesOS.data_abertura}</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
                                            <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">Previsão</p>
                                            <p className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase">{verDetalhesOS.data_agendada_admin || 'ANALISANDO'}</p>
                                        </div>
                                    </div>

                                    {/* MENSAGEM DE AÇÃO CASO ESTEJA PRONTO */}
                                    {verDetalhesOS.status === 'Pronto para Retirada' && (
                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-[2rem] border-2 border-emerald-500/20 animate-pulse">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Zap size={20} className="text-emerald-600" />
                                                <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Ação Necessária</p>
                                            </div>
                                            <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100 italic">
                                                Seu aparelho está pronto! Dirija-se ao balcão e apresente o seu QR Code para validar a retirada.
                                            </p>
                                        </div>
                                    )}

                                    {/* LAUDO TÉCNICO */}
                                    {verDetalhesOS.status === 'Concluído' && (
                                        <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 text-left">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Laudo de Finalização:</p>
                                            <p className="text-slate-600 dark:text-slate-300 font-bold italic text-sm md:text-base">
                                                {verDetalhesOS.laudo_tecnico || "Reparo concluído com sucesso."}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* BOTÕES DE AÇÃO DINÂMICOS */}
                                <div className="flex flex-col gap-4 mt-10">
                                    {verDetalhesOS.status === 'Pronto para Retirada' && (
                                        <button
                                            onClick={() => {
                                                setVerDetalhesOS(null);
                                                setIsScannerOpen(true); // Abre o seu scanner novo
                                            }}
                                            className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-4 uppercase italic"
                                        >
                                            <Camera size={28} /> Abrir Scanner de Retirada
                                        </button>
                                    )}

                                    {verDetalhesOS.status === 'Concluído' && (
                                        <button
                                            onClick={() => window.open(`/cliente/os/${verDetalhesOS.id}`, '_blank')}
                                            className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-4 uppercase italic"
                                        >
                                            <Printer size={28} /> Gerar Recibo PDF
                                        </button>
                                    )}

                                    <button
                                        onClick={() => setVerDetalhesOS(null)}
                                        className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]"
                                    >
                                        Voltar ao Painel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
            )}
        </div>
    );
};

export default DashboardCliente;