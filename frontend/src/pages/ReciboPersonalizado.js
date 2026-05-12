import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Printer, User, Smartphone, Package, Plus, Trash2, Search, ChevronDown, CheckCircle2, Monitor, MapPin, Phone, IdCard, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { IMaskInput } from 'react-imask';
import api from './api';

const ReciboPersonalizado = () => {
    const navigate = useNavigate();

    const [dbClientes, setDbClientes] = useState([]);
    const [dbPecas, setDbPecas] = useState([]);
    const [dbModelos, setDbModelos] = useState([]);

    const [recibo, setRecibo] = useState({
        cliente: '', documento: '', telefone: '', email: '', cep: '',
        aparelho: '', laudo: '',
        data: new Date().toISOString().split('T')[0],
        pecas: [{ nome: '', quantidade: 1 }]
    });
    const [erroCPF, setErroCPF] = useState('');
    const [statusCPF, setStatusCPF] = useState('ocioso'); // 'ocioso', 'encontrado', 'novo', 'invalido'

    const [showClientes, setShowClientes] = useState(false);
    const [showModelos, setShowModelos] = useState(false);
    const [activePecaIndex, setActivePecaIndex] = useState(null);

    const clienteRef = useRef(null);
    const modeloRef = useRef(null);
    const pecasRef = useRef(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [clientesRes, pecasRes, modelosRes] = await Promise.all([
                    api.get('/auth/admin/clientes'),
                    api.get('/estoque/'),
                    api.get('/devices/listar').catch(() => ({ data: [] }))
                ]);
                setDbClientes(clientesRes.data);
                setDbPecas(pecasRes.data);
                setDbModelos(modelosRes.data || []);
            } catch (err) {
                console.error("Erro ao carregar dados do SGAT:", err);
            }
        };
        fetchData();

        const handleClickOutside = (event) => {
            if (clienteRef.current && !clienteRef.current.contains(event.target)) setShowClientes(false);
            if (modeloRef.current && !modeloRef.current.contains(event.target)) setShowModelos(false);
            if (pecasRef.current && !pecasRef.current.contains(event.target)) setActivePecaIndex(null);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // FUNÇÃO ATUALIZADA: Puxa CPF e CEP automaticamente
    const handleClienteSelect = (c) => {
        setRecibo(prev => ({
            ...prev,
            cliente: c.nome,
            documento: c.cpf || '',
            telefone: c.telefone || '',
            email: c.email || '',
            cep: c.cep || ''
        }));
        setStatusCPF('encontrado'); // Selecionado da base, então existe!
        setShowClientes(false);
        setErroCPF('');
    };

    const handleCEP = async (valorLimpo) => {
        setRecibo(prev => ({ ...prev, cep: valorLimpo }));
        if (valorLimpo.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${valorLimpo}/json/`);
                const data = await res.json();
                if (!data.erro) {
                    setRecibo(prev => ({
                        ...prev,
                        endereco: `${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`
                    }));
                }
            } catch (err) { console.error("Erro CEP"); }
        }
    };

    const validarCPFNoBanco = async (cpfLimpo) => {
        // Se por algum motivo a função for chamada com menos de 11, trava aqui
        if (cpfLimpo.length < 11) {
            setStatusCPF('invalido');
            return;
        }

        try {
            const res = await api.get(`/auth/verificar-cpf/${cpfLimpo}`);
            if (res.data.existe) {
                setStatusCPF('encontrado');
            } else {
                setStatusCPF('novo');
            }
        } catch (err) {
            // Caso a API falhe ou o CPF seja rejeitado pelo back
            setStatusCPF('invalido');
        }
    };

    const atualizarPeca = (index, campo, valor) => {
        const novasPecas = [...recibo.pecas];
        novasPecas[index][campo] = valor;
        setRecibo({ ...recibo, pecas: novasPecas });
    };

    return (
        // Fundo da Página: bg-slate-50 | Dark: bg-[#020617]
        <div className="min-h-screen bg-slate-50 dark:bg-[#020617] font-sans no-print pb-20 transition-colors duration-300">

            {/* --- NAVBAR SUPERIOR --- */}
            <div className="bg-white dark:bg-[#020617]/80 dark:backdrop-blur-md border-b border-slate-100 dark:border-slate-800 sticky top-0 z-30 shadow-sm print:hidden">
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 md:h-24 flex items-center justify-between">
                    <div className="flex items-center gap-4 md:gap-6">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-3 bg-slate-50 dark:bg-slate-900 hover:bg-slate-900 hover:text-white dark:hover:bg-blue-600 rounded-2xl transition-all active:scale-95 text-slate-600 dark:text-slate-400 border border-transparent dark:border-slate-800"
                        >
                            <ArrowLeft size={24} strokeWidth={3} />
                        </button>
                        <div>
                            <h2 className="text-xl md:text-3xl font-black text-slate-800 dark:text-slate-50 tracking-tighter leading-none uppercase italic">
                                Recibo <span className="text-blue-600 dark:text-blue-500">Inteligente</span>
                            </h2>
                            <p className="hidden md:block text-blue-600 dark:text-blue-500 font-black text-[10px] uppercase tracking-[0.2em] mt-1">Geração de Documentos Técnicos</p>
                        </div>
                    </div>
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-900 dark:bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-200 dark:shadow-blue-900/20">
                        <Cpu size={24} />
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-6 pt-8 md:pt-12 print:hidden">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">

                    {/* COLUNA ESQUERDA: ENTRADA DE DADOS */}
                    <div className="lg:col-span-7 space-y-6 md:space-y-8 animate-in slide-in-from-left-4 duration-500">

                        {/* CARD CLIENTE */}
                        <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-6 md:space-y-8 relative transition-all" ref={clienteRef}>
                            <div className="flex items-center gap-2 text-blue-500 dark:text-blue-400 font-black text-[10px] md:text-xs uppercase tracking-[0.2em] ml-2">
                                <User size={18} /> Nome do Cliente
                            </div>

                            <div className="relative">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" size={22} />
                                <input
                                    type="text" placeholder="PESQUISAR CLIENTE..."
                                    className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-500 dark:focus:bg-slate-950 rounded-[1.5rem] md:rounded-3xl p-5 md:p-6 pl-16 transition-all font-black text-slate-800 dark:text-slate-200 outline-none shadow-inner uppercase tracking-tight text-sm md:text-base"
                                    value={recibo.cliente}
                                    onChange={(e) => { setRecibo({ ...recibo, cliente: e.target.value }); setShowClientes(true); }}
                                    onFocus={() => setShowClientes(true)}
                                />

                                {/* DROPDOWN DE CLIENTES */}
                                {showClientes && dbClientes.length > 0 && (
                                    <div className="absolute z-50 w-full mt-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-100 dark:border-slate-800 rounded-[2rem] shadow-2xl max-h-64 overflow-y-auto p-2 animate-in fade-in zoom-in duration-200 custom-scrollbar">
                                        {dbClientes.filter(c => c.nome.toLowerCase().includes(recibo.cliente.toLowerCase())).map(c => (
                                            <div
                                                key={c.id}
                                                onClick={() => handleClienteSelect(c)}
                                                className="flex items-center justify-between p-4 md:p-5 hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white rounded-2xl transition-all cursor-pointer group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    {/* Avatar Brutalista */}
                                                    <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-50 dark:bg-slate-800 group-hover:bg-white/20 rounded-2xl flex items-center justify-center font-black text-blue-600 dark:text-blue-400 group-hover:text-white text-lg md:text-xl uppercase transition-all duration-300 shadow-sm group-hover:rotate-3">
                                                        {c.nome.charAt(0)}
                                                    </div>

                                                    <div className="flex flex-col">
                                                        <p className="font-black text-slate-800 dark:text-slate-200 text-sm uppercase tracking-tighter leading-tight group-hover:text-white">
                                                            {c.nome}
                                                        </p>

                                                        {/* Metadados: CPF e CEP */}
                                                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 mt-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[7px] font-black bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-1.5 py-0.5 rounded-md group-hover:bg-white/20 group-hover:text-white">CPF</span>
                                                                <p className="text-[9px] md:text-[10px] text-slate-500 dark:text-slate-400 group-hover:text-white/80 font-black tracking-widest">
                                                                    {c.cpf || '---.---.---'}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[7px] font-black bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-1.5 py-0.5 rounded-md group-hover:bg-white/20 group-hover:text-white">CEP</span>
                                                                <p className="text-[9px] md:text-[10px] text-slate-500 dark:text-slate-400 group-hover:text-white/80 font-black tracking-widest">
                                                                    {c.cep || '00000-000'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <CheckCircle2 size={20} className="opacity-0 group-hover:opacity-100 text-white transition-opacity hidden md:block" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* GRID DE INPUTS ALINHADOS COM O DESIGN BRUTALISTA */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                                {/* CPF DINÂMICO SGAT */}
                                <div className={`group rounded-[2rem] p-5 border-2 transition-all flex items-center gap-4 
        ${statusCPF === 'encontrado' ? 'border-emerald-500 bg-white dark:bg-slate-900 shadow-emerald-100 dark:shadow-none' :
                                        statusCPF === 'novo' ? 'border-blue-500 bg-white dark:bg-slate-900 shadow-blue-100 dark:shadow-none' :
                                            statusCPF === 'invalido' ? 'border-red-500 bg-red-50 dark:bg-red-950/20' :
                                                'bg-slate-50 dark:bg-slate-950 border-transparent dark:border-slate-800 focus-within:border-slate-300 dark:focus-within:border-slate-600 focus-within:bg-white dark:focus-within:bg-slate-900 shadow-sm'}`}>

                                    {/* ÍCONE STATUS CPF */}
                                    <div className={`p-3 rounded-2xl transition-all duration-300
            ${statusCPF === 'encontrado' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rotate-3' :
                                            statusCPF === 'novo' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                                                statusCPF === 'invalido' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-shake' :
                                                    'bg-white dark:bg-slate-900 text-slate-400 group-focus-within:text-slate-600 dark:group-focus-within:text-slate-200'}`}>
                                        <IdCard size={20} strokeWidth={2.5} />
                                    </div>

                                    <div className="flex flex-col flex-1">
                                        <div className="flex items-center justify-between">
                                            <span className={`text-[9px] font-black uppercase tracking-widest mb-1 
                    ${statusCPF === 'encontrado' ? 'text-emerald-500' :
                                                    statusCPF === 'novo' ? 'text-blue-500' :
                                                        statusCPF === 'invalido' ? 'text-red-500' : 'text-slate-400'}`}>

                                                {statusCPF === 'encontrado' ? 'Cliente Identificado' :
                                                    statusCPF === 'novo' ? 'Não Cadastrado' :
                                                        statusCPF === 'invalido' && recibo.documento.length < 11 ? 'Aguardando CPF completo...' :
                                                            statusCPF === 'invalido' ? 'CPF Inválido' : 'Documento CPF'}
                                            </span>
                                        </div>

                                        <IMaskInput
                                            mask="000.000.000-00"
                                            placeholder="000.000.000-00"
                                            value={recibo.documento}
                                            className="w-full bg-transparent border-none p-0 font-black text-slate-800 dark:text-slate-100 outline-none text-sm placeholder:text-slate-300 dark:placeholder:text-slate-700"
                                            onAccept={(value) => {
                                                setRecibo(prev => ({ ...prev, documento: value }));
                                                if (value.length === 11) {
                                                    validarCPFNoBanco(value);
                                                } else if (value.length > 0 && value.length < 11) {
                                                    setStatusCPF('invalido');
                                                } else {
                                                    setStatusCPF('ocioso');
                                                }
                                            }}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* TELEFONE / WHATSAPP */}
                                <div className="group bg-slate-50 dark:bg-slate-950 rounded-[2rem] p-5 border-2 border-transparent dark:border-slate-800 focus-within:border-emerald-500 dark:focus-within:border-emerald-500 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all flex items-center gap-4 shadow-sm">
                                    <div className="p-3 bg-white dark:bg-slate-900 text-slate-400 group-focus-within:text-emerald-500 rounded-2xl transition-colors">
                                        <Phone size={20} strokeWidth={2.5} />
                                    </div>
                                    <div className="flex flex-col flex-1">
                                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">WhatsApp</span>
                                        <IMaskInput
                                            mask="(00) 00000-0000"
                                            placeholder="(00) 00000-0000"
                                            value={recibo.telefone}
                                            className="w-full bg-transparent border-none p-0 font-black text-slate-800 dark:text-slate-100 outline-none text-sm placeholder:text-slate-300 dark:placeholder:text-slate-700"
                                            onAccept={(v) => setRecibo({ ...recibo, telefone: v })}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* LOCALIZAÇÃO CEP */}
                                <div className="group bg-slate-50 dark:bg-slate-950 rounded-[2rem] p-5 border-2 border-transparent dark:border-slate-800 focus-within:border-orange-500 dark:focus-within:border-orange-500 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all flex items-center gap-4 shadow-sm">
                                    <div className="p-3 bg-white dark:bg-slate-900 text-slate-400 group-focus-within:text-orange-500 rounded-2xl transition-colors">
                                        <MapPin size={20} strokeWidth={2.5} />
                                    </div>
                                    <div className="flex flex-col flex-1">
                                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Localização CEP</span>
                                        <IMaskInput
                                            mask="00000-000"
                                            placeholder="00000-000"
                                            value={recibo.cep}
                                            className="w-full bg-transparent border-none p-0 font-black text-slate-800 dark:text-slate-100 outline-none text-sm placeholder:text-slate-300 dark:placeholder:text-slate-700"
                                            onAccept={(v) => handleCEP(v.replace(/\D/g, ''))}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* COLUNA ESQUERDA: ENTRADA DE DADOS */}
                        <div className="lg:col-span-7 space-y-6 md:space-y-8 animate-in slide-in-from-left-4 duration-500">

                            {/* CARD DISPOSITIVO */}
                            <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-6 transition-all" ref={modeloRef}>
                                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-[10px] md:text-xs uppercase tracking-[0.2em] ml-2">
                                    <Smartphone size={18} /> Especificação Técnica
                                </div>

                                <div className="relative group">
                                    <input
                                        type="text" placeholder="MODELO DO APARELHO..."
                                        className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950 rounded-2xl md:rounded-3xl p-5 md:p-6 transition-all font-black text-slate-800 dark:text-slate-200 outline-none shadow-inner uppercase italic text-sm md:text-base"
                                        value={recibo.aparelho}
                                        onChange={(e) => { setRecibo({ ...recibo, aparelho: e.target.value }); setShowModelos(true); }}
                                        onFocus={() => setShowModelos(true)}
                                    />
                                    <ChevronDown className={`absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 transition-transform ${showModelos ? 'rotate-180' : ''}`} size={24} />

                                    {/* DROPDOWN MODELOS */}
                                    {showModelos && (
                                        <div className="absolute z-50 w-full mt-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-100 dark:border-slate-800 rounded-[2rem] shadow-2xl max-h-48 overflow-y-auto p-2 animate-in zoom-in duration-200 custom-scrollbar">
                                            {dbModelos.filter(m => m.modelo.toLowerCase().includes(recibo.aparelho.toLowerCase())).map(m => (
                                                <div
                                                    key={m.id}
                                                    onClick={() => { setRecibo({ ...recibo, aparelho: m.modelo }); setShowModelos(false); }}
                                                    className="p-4 hover:bg-emerald-600 dark:hover:bg-emerald-500 hover:text-white rounded-2xl transition-all cursor-pointer font-black text-[10px] uppercase tracking-widest text-slate-700 dark:text-slate-300"
                                                >
                                                    {m.modelo}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <textarea
                                    placeholder="RELATÓRIO DETALHADO DOS SERVIÇOS..."
                                    rows="4"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500/50 font-bold text-slate-600 dark:text-slate-400 italic shadow-inner uppercase text-xs md:text-sm outline-none transition-all"
                                    value={recibo.laudo}
                                    onChange={(e) => setRecibo({ ...recibo, laudo: e.target.value })}
                                />
                            </div>

                            {/* CARD COMPONENTES */}
                            <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-6 transition-all" ref={pecasRef}>
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                                    <div className="flex items-center gap-2 text-orange-500 dark:text-orange-400 font-black text-[10px] md:text-xs uppercase tracking-[0.2em] ml-2">
                                        <Package size={18} /> Itens & Insumos
                                    </div>
                                    <button
                                        onClick={() => setRecibo({ ...recibo, pecas: [...recibo.pecas, { nome: '', quantidade: 1 }] })}
                                        className="w-full md:w-auto bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-6 py-3 rounded-2xl hover:bg-orange-600 dark:hover:bg-orange-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm border border-transparent dark:border-orange-500/20"
                                    >
                                        <Plus size={16} strokeWidth={3} /> Adicionar Item
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {recibo.pecas.map((peca, index) => (
                                        <div key={index} className="flex flex-col md:flex-row gap-3 md:gap-4 items-stretch md:items-center group animate-in slide-in-from-top-2">
                                            <div className="flex-1 relative">
                                                <input
                                                    type="text" placeholder="PESQUISAR COMPONENTE..."
                                                    className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl p-4 md:p-5 text-[11px] md:text-sm font-black text-slate-700 dark:text-slate-200 uppercase focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-orange-500 transition-all shadow-inner outline-none"
                                                    value={peca.nome}
                                                    onChange={(e) => { atualizarPeca(index, 'nome', e.target.value); setActivePecaIndex(index); }}
                                                    onFocus={() => setActivePecaIndex(index)}
                                                />

                                                {/* DROPDOWN COMPONENTES */}
                                                {activePecaIndex === index && (
                                                    <div className="absolute z-40 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] shadow-2xl max-h-56 overflow-y-auto p-2 animate-in fade-in duration-200 custom-scrollbar">
                                                        {dbPecas.filter(p => p.nome.toLowerCase().includes(peca.nome.toLowerCase())).map(p => (
                                                            <div
                                                                key={p.id}
                                                                onClick={() => { atualizarPeca(index, 'nome', p.nome); setActivePecaIndex(null); }}
                                                                className="flex flex-col p-4 hover:bg-orange-600 dark:hover:bg-orange-500 rounded-2xl transition-all cursor-pointer group/item"
                                                            >
                                                                <div className="flex justify-between items-center">
                                                                    <span className="font-black text-slate-700 dark:text-slate-300 text-xs uppercase group-hover/item:text-white">{p.nome}</span>
                                                                    <span className="text-[8px] md:text-[9px] font-black bg-orange-100 dark:bg-slate-800 text-orange-600 dark:text-orange-400 px-2 py-1 rounded-lg group-hover/item:bg-white/20 group-hover/item:text-white tracking-widest">STOCK: {p.quantidade}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="number"
                                                    className="flex-1 md:w-24 bg-slate-100 dark:bg-slate-950 border-none rounded-2xl p-4 md:p-5 text-sm font-black text-center text-slate-800 dark:text-slate-200 outline-none shadow-inner"
                                                    value={peca.quantidade}
                                                    onChange={(e) => atualizarPeca(index, 'quantidade', e.target.value)}
                                                />
                                                <button
                                                    onClick={() => setRecibo({ ...recibo, pecas: recibo.pecas.filter((_, i) => i !== index) })}
                                                    className="text-slate-300 dark:text-slate-600 hover:text-red-600 dark:hover:text-red-500 p-4 transition-colors bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-transparent dark:border-slate-800"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* COLUNA DIREITA: LIVE PREVIEW (Sincronizado) */}
                    <div className="lg:col-span-5">
                        {/* No mobile removemos o sticky para não quebrar o fluxo natural */}
                        <div className="md:sticky md:top-32 pb-20 lg:pb-0">
                            <div className="bg-slate-900 dark:bg-slate-950 rounded-[3rem] md:rounded-[4rem] p-8 md:p-12 shadow-3xl text-white relative overflow-hidden border border-white/5 animate-in fade-in zoom-in duration-500">

                                {/* EFEITO DE GLOW TECH */}
                                <div className="absolute -top-20 -right-20 p-10 opacity-10 blur-3xl bg-blue-600 w-64 h-64 rounded-full"></div>

                                <div className="relative z-10">
                                    <div className="text-center mb-8 md:mb-12 border-b border-white/10 pb-8 md:pb-10">
                                        <div className="flex items-center justify-center gap-3 mb-3">
                                            <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.8)]"></span>
                                            <p className="text-[10px] md:text-[11px] text-blue-400 font-black uppercase tracking-[0.5em] italic">Systems Monitor</p>
                                        </div>
                                        <h4 className="font-black text-3xl md:text-4xl tracking-tighter italic leading-none uppercase">
                                            Cidinho - Assistência técnica - Assistência técnica<span className="text-blue-600 dark:text-blue-500">PREVIEW</span>
                                        </h4>
                                    </div>

                                    <div className="space-y-6 md:space-y-8">
                                        {/* INFO TITULAR */}
                                        <div className="bg-white/5 p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border border-white/10 backdrop-blur-sm">
                                            <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 italic">ID Responsável</p>
                                            <p className="font-black text-2xl md:text-3xl uppercase tracking-tighter truncate leading-none mb-4">
                                                {recibo.cliente || "--- ---"}
                                            </p>
                                            <div className="flex items-center gap-3 text-blue-500 bg-blue-500/10 w-fit px-4 py-2 rounded-full border border-blue-500/20">
                                                <IdCard size={16} strokeWidth={3} />
                                                <IMaskInput
                                                    mask="000.000.000-00"
                                                    value={recibo.documento}
                                                    readOnly
                                                    className="text-xs font-black tracking-widest bg-transparent border-none outline-none w-[110px]"
                                                />
                                            </div>
                                        </div>

                                        {/* GRID CONTATO & LOCALIDADE */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                            <div className="bg-white/5 p-6 md:p-7 rounded-[2rem] md:rounded-[2.5rem] border border-white/10 group hover:border-emerald-500/50 transition-all">
                                                <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">WhatsApp</p>
                                                <div className="flex items-center gap-3 text-emerald-500">
                                                    <IMaskInput
                                                        mask="(00) 00000-0000"
                                                        value={recibo.telefone}
                                                        readOnly
                                                        className="text-sm font-black tracking-tight bg-transparent border-none outline-none w-full"
                                                    />
                                                </div>
                                            </div>
                                            <div className="bg-white/5 p-6 md:p-7 rounded-[2rem] md:rounded-[2.5rem] border border-white/10 group hover:border-orange-500/50 transition-all">
                                                <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">ZIP Code</p>
                                                <div className="flex items-center gap-3 text-orange-500">
                                                    <MapPin size={16} strokeWidth={3} />
                                                    <IMaskInput
                                                        mask="00000-000"
                                                        value={recibo.cep}
                                                        readOnly
                                                        className="text-sm font-black tracking-widest bg-transparent border-none outline-none w-full"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* HARDWARE PREVIEW */}
                                        <div className="bg-white/5 p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border border-white/10 border-l-4 border-l-blue-600">
                                            <div className="flex items-center justify-between mb-4">
                                                <p className="text-[10px] md:text-[11px] font-black text-blue-400 uppercase tracking-[0.2em] italic">
                                                    {recibo.aparelho || "Hardware Spec"}
                                                </p>
                                                <Smartphone size={18} className="text-blue-500" />
                                            </div>
                                            <p className="text-xs md:text-sm font-bold text-slate-400 italic leading-relaxed line-clamp-2 uppercase">
                                                {recibo.laudo || "Aguardando diagnóstico..."}
                                            </p>
                                        </div>

                                        {/* BOTÃO GERAR RECIBO (Destaque Total) */}
                                        <button
                                            onClick={() => window.print()}
                                            className="w-full bg-blue-600 dark:bg-blue-600 text-white py-6 md:py-8 rounded-[2.5rem] md:rounded-[3rem] font-black text-lg md:text-2xl flex items-center justify-center gap-4 hover:bg-emerald-600 transition-all shadow-3xl shadow-blue-900/60 dark:shadow-none active:scale-[0.98] uppercase italic"
                                        >
                                            <Printer size={window.innerWidth < 768 ? 24 : 32} strokeWidth={2.5} />
                                            Gerar Recibo
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- ÁREA DE IMPRESSÃO (SGAT TECHNICAL STANDARD) --- */}
            <div id="print-area-wrapper" className="hidden print:block bg-white text-slate-900 p-12">
                <div className="flex justify-between items-start mb-12 border-b-8 border-slate-900 pb-8">
                    <div>
                        <h3 className="text-4xl font-black tracking-tighter uppercase leading-none italic">Cidinho - Assistência técnica</h3>
                        <p className="text-slate-600 font-bold uppercase text-sm tracking-[0.3em] mt-3">Recibo de Prestação de Serviços Técnicos</p>
                    </div>
                    <div className="text-right">
                        <p className="font-black text-2xl tracking-tighter uppercase bg-slate-900 text-white px-4 py-1 inline-block">Recibo Avulso</p>
                        <p className="text-sm font-bold mt-2 uppercase font-mono">{new Date(recibo.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-12 mb-12">
                    <div className="border-l-8 border-blue-600 pl-8 space-y-2">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Responsável Legal</p>
                        <p className="text-2xl font-black text-slate-900 uppercase leading-none">
                            {recibo.cliente || "CONSUMIDOR FINAL"}
                        </p>

                        <div className="flex items-center gap-1 text-base font-black font-mono text-slate-800 tracking-tighter italic">
                            <span>CPF:</span>
                            <IMaskInput
                                mask="000.000.000-00"
                                value={recibo.documento || ""}
                                readOnly
                                className="bg-transparent border-none outline-none w-full font-mono"
                            />
                        </div>

                        <div className="flex gap-6 mt-2">
                            <div className="flex items-center gap-1 text-sm font-black text-slate-600 uppercase font-mono">
                                <span>TEL:</span>
                                <IMaskInput
                                    mask="(00) 00000-0000"
                                    value={recibo.telefone || ""}
                                    readOnly
                                    className="bg-transparent border-none outline-none w-[140px]"
                                />
                            </div>
                            <div className="flex items-center gap-1 text-sm font-black text-slate-600 uppercase font-mono">
                                <span>CEP:</span>
                                <IMaskInput
                                    mask="00000-000"
                                    value={recibo.cep || ""}
                                    readOnly
                                    className="bg-transparent border-none outline-none w-[100px]"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="text-right border-r-8 border-emerald-500 pr-8">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Equipamento Vinculado</p>
                        <p className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">{recibo.aparelho || "N/A"}</p>
                    </div>
                </div>

                <div className="bg-slate-50 border-4 border-slate-900 p-10 rounded-[3rem] mb-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5"><Cpu size={100} /></div>
                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-[0.4em] mb-4 border-b-2 border-slate-200 pb-3 italic">Laudo Técnico / Procedimentos</p>
                    <p className="text-slate-800 leading-relaxed font-black text-lg whitespace-pre-wrap uppercase italic">{recibo.laudo || "Mão de obra técnica especializada."}</p>
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
                            {recibo.pecas.filter(p => p.nome !== '').map((p, i) => (
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
                            Cidinho - Assistência técnica
                        </p>
                        <div className="flex items-center gap-4 mt-1">
                            <span className="text-[7px] font-black text-slate-200 uppercase tracking-widest">Command Center São Paulo, SP</span>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReciboPersonalizado;