import React, { useEffect, useState } from 'react';
import { Users, Search, ArrowLeft, Mail, Phone, MapPin, Award, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from './api';

const ListaClientes = () => {
    const [clientes, setClientes] = useState([]);
    const [busca, setBusca] = useState('');
    const [loading, setLoading] = useState(true); // Estado de loading parcial
    const navigate = useNavigate();

    const carregarClientes = async () => {
        setLoading(true);
        try {
            const res = await api.get('/auth/admin/clientes');
            setClientes(res.data);
        } catch (err) {
            console.error("Erro ao carregar clientes", err);
        } finally {
            // Delay intencional de 600ms para a transição não ser brusca
            setTimeout(() => setLoading(false), 200);
        }
    };

    useEffect(() => { carregarClientes(); }, []);

    const clientesFiltrados = clientes.filter(c =>
        c.nome.toLowerCase().includes(busca.toLowerCase()) ||
        c.cpf.includes(busca)
    );

    return (
        // Fundo da Página: bg-slate-50 | Dark: bg-[#020617]
        <div className="min-h-screen bg-slate-50 dark:bg-[#020617] p-8 font-sans transition-colors duration-300">
            <div className="max-w-6xl mx-auto">

                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 animate-in fade-in duration-500">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => navigate('/admin/dashboard')}
                            // Botão Back: bg-white | Dark: bg-slate-900
                            className="p-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-slate-900 hover:text-white dark:hover:bg-blue-600 rounded-[1.5rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-all active:scale-90"
                        >
                            <ArrowLeft size={24} strokeWidth={3} />
                        </button>
                        <div>
                            {/* Título: text-slate-800 | Dark: text-slate-50 */}
                            <h2 className="text-4xl font-black text-slate-800 dark:text-slate-50 tracking-tighter uppercase italic leading-none">
                                Base de Clientes
                            </h2>
                            <p className="text-[10px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-[0.3em] mt-2">Database Index Cidinho</p>
                        </div>
                    </div>

                    {/* Busca: Inputs bg-slate-50 (no light usamos white aqui) | Dark: bg-slate-950 */}
                    <div className="relative w-full md:w-96 group">
                        <Search className="absolute left-5 top-5 text-slate-400 dark:text-slate-600 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-500 transition-colors" size={20} />
                        <input
                            placeholder="Buscar por nome ou CPF..."
                            className="w-full pl-14 pr-6 py-5 bg-white dark:bg-slate-950 border-2 border-transparent dark:border-slate-800 rounded-[2rem] outline-none focus:border-blue-600 dark:focus:border-blue-500 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                        />
                    </div>
                </div>

                {/* --- GRID DE CLIENTES / SKELETON --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {loading ? (
                        /* SKELETON DARK MODE */
                        Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col animate-pulse">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl"></div>
                                    <div className="space-y-3 flex-1">
                                        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-3/4"></div>
                                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full w-1/2"></div>
                                    </div>
                                </div>
                                <div className="space-y-4 flex-1">
                                    <div className="h-3 bg-slate-50 dark:bg-slate-800/50 rounded-full w-full"></div>
                                    <div className="h-3 bg-slate-50 dark:bg-slate-800/50 rounded-full w-5/6"></div>
                                </div>
                            </div>
                        ))
                    ) : (
                        /* CARDS REAIS: bg-white | Dark: bg-slate-900 */
                        clientesFiltrados.map(cliente => (
                            <div key={cliente.id} className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800/50 shadow-sm hover:shadow-2xl dark:hover:shadow-blue-900/10 hover:border-blue-500 transition-all group relative overflow-hidden animate-in fade-in zoom-in duration-500">

                                {/* VIP Badge: blue-600 | Dark: blue-500 */}
                                {cliente.total_os >= 5 && (
                                    <div className="absolute top-0 right-0 bg-blue-600 dark:bg-blue-500 text-white px-5 py-2 rounded-bl-3xl font-black text-[10px] uppercase tracking-widest italic shadow-lg">
                                        <Award size={12} className="inline mr-1" /> VIP
                                    </div>
                                )}

                                <div className="flex items-center gap-5 mb-8">
                                    {/* Iniciais: bg-slate-900 | Dark: bg-slate-950 */}
                                    <div className="w-16 h-16 bg-slate-900 dark:bg-slate-950 rounded-[1.8rem] flex items-center justify-center text-white font-black text-2xl uppercase shadow-xl group-hover:rotate-6 transition-transform border border-transparent dark:border-slate-800">
                                        {cliente.nome.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-800 dark:text-slate-100 text-xl tracking-tighter leading-none uppercase italic group-hover:text-blue-600 dark:group-hover:text-blue-500 transition-colors">
                                            {cliente.nome}
                                        </h3>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black mt-1 uppercase tracking-widest">{cliente.cpf}</p>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-8">
                                    {/* Info text: slate-500 | Dark: slate-400 */}
                                    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-bold text-xs truncate">
                                        <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg">
                                            <Mail size={14} className="text-blue-600 dark:text-blue-500" />
                                        </div>
                                        {cliente.email}
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-bold text-xs">
                                        <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg">
                                            <Phone size={14} className="text-blue-600 dark:text-blue-500" />
                                        </div>
                                        {cliente.telefone}
                                    </div>
                                </div>

                                <div className="pt-8 border-t border-slate-50 dark:border-slate-800/50 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em] mb-1 italic">Contagem de Serviços</span>
                                        <span className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-none tracking-tighter">{cliente.total_os}</span>
                                    </div>
                                    {/* Botão Ação: bg-slate-900 | Dark: bg-slate-950 ou blue-600 */}
                                    <button
                                        onClick={() => navigate(`/admin/cliente/${cliente.id}`)}
                                        className="bg-slate-900 dark:bg-slate-950 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 dark:hover:bg-blue-500 transition-all shadow-xl dark:shadow-none border border-transparent dark:border-slate-800 active:scale-95"
                                    >
                                        Ficha Completa
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* --- EMPTY STATE --- */}
                {!loading && clientesFiltrados.length === 0 && (
                    <div className="text-center py-32 bg-white dark:bg-slate-900 rounded-[4rem] border-4 border-dashed border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in duration-500">
                        <div className="p-8 bg-slate-50 dark:bg-slate-950 w-fit mx-auto rounded-full mb-6">
                            <Users size={64} className="text-slate-200 dark:text-slate-800" />
                        </div>
                        <p className="text-slate-400 dark:text-slate-600 font-black uppercase tracking-widest text-xs italic">Nenhum registro encontrado no sistema.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ListaClientes;