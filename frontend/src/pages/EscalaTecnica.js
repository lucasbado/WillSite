import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, ChevronRight, Clock, User, ArrowLeft, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import LoadNotice from '../components/LoadNotice';
import { requestError } from '../utils/requestError';

const EscalaTecnica = () => {
    const navigate = useNavigate();
    const [escala, setEscala] = useState({});
    const [loading, setLoading] = useState(true);

    const [loadError, setLoadError] = useState('');
    const dias = useMemo(() => {
        const monday = new Date();
        monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
        return Array.from({ length: 6 }, (_, index) => {
            const date = new Date(monday);
            date.setDate(monday.getDate() + index);
            return { key: `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`,
                name: date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }),
                mes: date.getMonth() + 1, ano: date.getFullYear() };
        });
    }, []);
    const fetchEscala = useCallback(async () => {
        setLoading(true);
        try {
            const months = [...new Map(dias.map(day => [`${day.ano}-${day.mes}`, { mes: day.mes, ano: day.ano }])).values()];
            const responses = await Promise.all(months.map(params => api.get('/os/admin/escala-mensal', { params })));
            setEscala(Object.assign({}, ...responses.map(response => response.data)));
            setLoadError('');
        } catch (err) { setLoadError(requestError(err, 'Não foi possível carregar a agenda.')); }
        finally { setLoading(false); }
    }, [dias]);
    useEffect(() => { fetchEscala(); }, [fetchEscala]);

    return (
        <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
            {/* --- HEADER FIXO --- */}
            <header className="bg-slate-900 text-white p-8 shadow-2xl z-20">
                <div className="max-w-[1800px] mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate(-1)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all">
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <h2 className="text-3xl font-black tracking-tighter uppercase italic leading-none">Escala de Demanda</h2>
                            <p className="text-blue-500 font-bold text-[10px] uppercase tracking-[0.3em] mt-1 italic">Planejamento de Carga Técnica Cidinho</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/10">
                        <div className="flex flex-col items-end px-4">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Semana Atual</span>
                            <span className="text-sm font-bold">{new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                        </div>
                        <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-900/40"><Calendar size={20} /></div>
                    </div>
                </div>
            </header>

            {/* --- GRID DE COLUNAS (TELA CHEIA) --- */}
            <main className="flex-1 overflow-x-auto p-8 lg:p-12">
                <LoadNotice error={loadError} loading={loading} onRetry={fetchEscala} />
                <div className="flex gap-6 min-w-max h-full">
                    {dias.map((dia) => (
                        <div key={dia.key} className="w-80 flex flex-col gap-6">
                            {/* Header do Dia */}
                            <div className="flex items-center justify-between px-2">
                                <h3 className="font-black text-slate-800 uppercase tracking-tighter italic text-xl">{dia.name}</h3>
                                <span className="bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black">
                                    {escala[dia.key]?.length || 0} JOBS
                                </span>
                            </div>

                            {/* Container de Cards */}
                            <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2 pb-10">
                                {escala[dia.key]?.map((job) => (
                                    <div 
                                        key={job.id}
                                        className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all group cursor-pointer relative overflow-hidden"
                                    >
                                        {/* Status Line */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${job.status === 'Concluído' ? 'bg-emerald-500' : 'bg-blue-600'}`}></div>

                                        <div className="flex justify-between items-start mb-4">
                                            <span className="text-[9px] font-mono text-slate-300 font-bold">#{job.id}</span>
                                            <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                                                <Clock size={12} strokeWidth={3} />
                                                <span className="text-[10px] font-black uppercase">{job.hora}</span>
                                            </div>
                                        </div>

                                        <h4 className="text-lg font-black text-slate-800 leading-none mb-2 uppercase tracking-tighter">
                                            {job.modelo}
                                        </h4>
                                        
                                        <div className="flex items-center gap-2 text-slate-400 mb-6">
                                            <User size={12} />
                                            <span className="text-[11px] font-bold uppercase truncate">{job.cliente}</span>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${job.status === 'Concluído' ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                {job.status}
                                            </span>
                                            <div className="p-2 bg-slate-50 text-slate-300 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                <ChevronRight size={16} />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {(!loading && !loadError && (!escala[dia.key] || escala[dia.key].length === 0)) && (
                                    <div className="py-12 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-300 opacity-50">
                                        <Activity size={32} strokeWidth={1} className="mb-2" />
                                        <p className="text-[9px] font-black uppercase tracking-widest italic">Dia Livre</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default EscalaTecnica;