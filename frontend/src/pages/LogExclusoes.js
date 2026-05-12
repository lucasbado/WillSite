import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ShieldAlert, ArrowLeft, UserX, UserCheck, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from './api';

const LogExclusoes = () => {
    const [excluidas, setExcluidas] = useState([]);
    const [filtro, setFiltro] = useState('');
    const navigate = useNavigate();

    const carregarLog = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const res = await api.get('http://localhost:5000/api/os/admin/excluidas', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setExcluidas(res.data);
        } catch (err) {
            console.error("Erro ao carregar log", err);
        }
    };

    useEffect(() => { carregarLog(); }, []);

    // Filtragem simples por nome ou modelo
    const logFiltrado = excluidas.filter(os => 
        os.cliente.toLowerCase().includes(filtro.toLowerCase()) || 
        os.modelo.toLowerCase().includes(filtro.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => navigate('/admin/dashboard')} className="p-2 hover:bg-slate-200 rounded-full transition">
                        <ArrowLeft size={24} className="text-slate-600" />
                    </button>
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                            <ShieldAlert className="text-red-500" size={32} /> Log de Exclusões
                        </h2>
                        <p className="text-slate-500 font-medium">Histórico de auditoria para prevençao de perdas.</p>
                    </div>
                </div>

                {/* Busca */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex items-center gap-3">
                    <Search className="text-slate-400" size={20} />
                    <input 
                        placeholder="Buscar por cliente ou aparelho..." 
                        className="flex-1 outline-none text-slate-600"
                        value={filtro}
                        onChange={(e) => setFiltro(e.target.value)}
                    />
                </div>

                {/* Tabela de Log */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50/50 border-b">
                            <tr className="text-left text-slate-400 text-[10px] uppercase font-black tracking-widest">
                                <th className="px-8 py-5 text-center w-20">ID</th>
                                <th className="px-8 py-5">Cliente / Aparelho</th>
                                <th className="px-8 py-5">Problema Relatado</th>
                                <th className="px-8 py-5 text-center">Excluído por</th>
                                <th className="px-8 py-5 text-right">Data de Abertura</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {logFiltrado.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center text-slate-400 italic">
                                        Nenhum registro de exclusão encontrado.
                                    </td>
                                </tr>
                            ) : (
                                logFiltrado.map(os => (
                                    <tr key={os.id} className="hover:bg-red-50/30 transition">
                                        <td className="px-8 py-5 text-center font-mono text-slate-400">#{os.id}</td>
                                        <td className="px-8 py-5">
                                            <p className="font-bold text-slate-700">{os.cliente}</p>
                                            <p className="text-sm text-slate-500 font-medium">{os.modelo}</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="text-sm text-slate-400 truncate max-w-[200px]">{os.problema}</p>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                                                os.excluida_por === 'admin' 
                                                ? 'bg-slate-100 text-slate-600' 
                                                : 'bg-red-100 text-red-600'
                                            }`}>
                                                {os.excluida_por === 'admin' ? <UserCheck size={12}/> : <UserX size={12}/>}
                                                {os.excluida_por}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right text-sm text-slate-500 font-bold">
                                            {os.data_abertura}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default LogExclusoes;