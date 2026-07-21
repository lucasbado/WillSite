import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from './api';
import {
    ArrowLeft, Phone, Mail, MapPin, Smartphone,
    Clock, CheckCircle2, X, Printer, Cpu, ShieldCheck, Hash, Calendar, ChevronRight, Award
} from 'lucide-react';
import { IMaskInput } from 'react-imask';
const DetalhesCliente = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [dados, setDados] = useState(null);
    const [selectedOS, setSelectedOS] = useState(null);
    const [loading, setLoading] = useState(true);


    const fetchDados = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/auth/admin/cliente/${id}`);
            setDados(res.data);
        } catch (err) {
            console.error("Erro ao buscar ficha", err);
        } finally {
            setLoading(false);
        }
    };


    const abrirDetalhesOS = async (osId) => {
        try {
            const res = await api.get(`/os/detalhes/${osId}`);
            setSelectedOS(res.data);
        } catch (err) {
            alert("Erro ao carregar ordem.");
        }
    };
    const verDetalhes = async (id) => {
        try {
            const res = await api.get(`/os/detalhes/${id}`);
            // O link já vem pronto dentro de res.data.cliente_info.whatsapp_link
            setSelectedOS(res.data);
        } catch (err) {
            alert("Erro ao carregar detalhes");
        }
    };

    useEffect(() => { fetchDados(); }, [id]);


    return (
        <div className="min-h-screen bg-white dark:bg-[#020617] flex flex-col lg:flex-row font-sans overflow-x-hidden transition-colors duration-300">

            {/* --- LADO ESQUERDO / TOPO: PERFIL --- */}
            {/* Light: bg-slate-50 | Dark: bg-slate-950 (conforme seu padrão de Inputs/Busca para áreas internas) */}
            <div className="w-full lg:w-[35%] bg-slate-50 dark:bg-slate-950 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800/50 flex flex-col p-8 md:p-12 relative overflow-hidden print:hidden shrink-0 transition-colors">

                {/* Efeito Visual de Fundo (Blur) no Dark Mode */}
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-600/10 dark:bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>

                {/* Botão Voltar */}
                <button
                    onClick={() => navigate('/admin/clientes')}
                    className="flex items-center gap-3 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold transition-all group mb-8 lg:mb-12 relative z-10"
                >
                    {/* Cards e Modais Light: white | Dark: slate-900 */}
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-800 transition-colors">
                        <ArrowLeft size={20} />
                    </div>
                    <span className="text-[10px] uppercase tracking-widest font-black">Voltar</span>
                </button>

                <div className="relative z-10 flex flex-col items-center text-center">
                    {/* Avatar: bg-slate-900 | No Dark: slate-900 com borda tech */}
                    <div className="w-24 h-24 lg:w-32 lg:h-32 bg-slate-900 dark:bg-slate-900 rounded-[2rem] lg:rounded-[2.5rem] flex items-center justify-center text-white dark:text-slate-50 text-4xl lg:text-5xl font-black mb-6 shadow-2xl shadow-slate-200 dark:shadow-none uppercase border-4 border-transparent dark:border-slate-800 transition-all">
                        {dados?.info.nome.charAt(0)}
                    </div>

                    {/* Títulos: text-slate-900 | Dark: text-slate-50 */}
                    <h2 className="text-2xl lg:text-3xl font-black text-slate-800 dark:text-slate-50 tracking-tighter leading-tight mb-2 uppercase italic">
                        {dados?.info.nome}
                    </h2>

                    {/* --- DESTAQUE CLIENTE VIP (Sincronizado com o novo Backend) --- */}
                    {(() => {
                        // Buscamos o valor nas duas possíveis localizações do JSON
                        const total = dados?.cliente_info?.total_os ?? dados?.total_os ?? 0;

                        if (Number(total) >= 5) {
                            return (
                                <div className="animate-in fade-in zoom-in duration-700">
                                    <span className="inline-flex items-center gap-2 bg-blue-600 dark:bg-blue-500 text-white text-[10px] font-black px-5 py-2 rounded-full uppercase tracking-[0.2em] mb-8 lg:mb-10 shadow-xl shadow-blue-900/20 dark:shadow-none border border-blue-400/30">
                                        <Award size={14} className="text-yellow-400" strokeWidth={3} />
                                        Cliente VIP Cidinho
                                    </span>
                                </div>
                            );
                        }
                        return null;
                    })()}

                    {/* Grid de Contatos: Cards bg-white | Dark: bg-slate-900 */}
                    <div className="w-full space-y-3 lg:space-y-4">

                        {/* Item Contato */}
                        <div className="bg-white dark:bg-slate-900 p-4 lg:p-5 rounded-2xl lg:rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/50 flex items-center gap-4 transition-all">
                            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl transition-colors">
                                <Phone size={18} />
                            </div>
                            <div className="text-left">
                                <p className="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">Contato</p>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{dados?.info.telefone || "N/I"}</p>
                            </div>
                        </div>

                        {/* Item E-mail */}
                        <div className="bg-white dark:bg-slate-900 p-4 lg:p-5 rounded-2xl lg:rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/50 flex items-center gap-4 transition-all">
                            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl transition-colors">
                                <Mail size={18} />
                            </div>
                            <div className="text-left">
                                <p className="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">E-mail</p>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate max-w-[150px] md:max-w-full">{dados?.info.email}</p>
                            </div>
                        </div>

                        {/* Item Localização */}
                        <div className="bg-white dark:bg-slate-900 p-5 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800/50 text-left transition-all">
                            <div className="flex items-center gap-2 mb-2 text-slate-400 dark:text-slate-500 font-black text-[8px] uppercase tracking-widest transition-colors">
                                <MapPin size={12} /> Localização
                            </div>
                            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 leading-relaxed uppercase italic transition-colors">
                                {dados?.info.endereco}
                            </p>
                            <p className="text-blue-600 dark:text-blue-500 font-black text-[9px] mt-2 tracking-widest transition-colors">
                                CEP: {dados?.info.cep}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- LADO DIREITO: HISTÓRICO (65% Desktop) --- */}
            <div className="w-full lg:w-[65%] lg:h-screen overflow-y-auto p-6 md:p-16 bg-white dark:bg-slate-900 transition-colors duration-300 custom-scrollbar">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center justify-between mb-8 lg:mb-12">
                        <div>
                            {/* Títulos: text-slate-800 | Dark: text-slate-50 */}
                            <h3 className="text-2xl lg:text-4xl font-black text-slate-800 dark:text-slate-50 tracking-tighter uppercase italic">
                                Histórico
                            </h3>
                            {/* Texto de Apoio: slate-400 | Dark: slate-500 */}
                            <p className="text-slate-400 dark:text-slate-500 text-xs lg:text-sm font-medium">
                                Ordens e laudos técnicos
                            </p>
                        </div>

                        {/* Contador: bg-slate-50 | Dark: bg-slate-950 */}
                        <div className="bg-slate-50 dark:bg-slate-950 p-3 lg:p-4 rounded-2xl lg:rounded-3xl border border-slate-100 dark:border-slate-800 text-center min-w-[80px] shadow-inner">
                            <p className="text-[8px] lg:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total</p>
                            <p className="text-xl lg:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">
                                {dados?.historico?.length || 0}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4 lg:space-y-6 pb-12">
                        {loading ? (
                            /* SKELETONS DARK */
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="h-24 bg-slate-50 dark:bg-slate-950/50 rounded-[2rem] animate-pulse border-2 border-dashed border-slate-100 dark:border-slate-800" />
                            ))
                        ) : dados?.historico?.length > 0 ? (
                            dados.historico.map(os => (
                                <div
                                    key={os.id}
                                    onClick={() => abrirDetalhesOS(os.id)}
                                    // Card OS: bg-white | Dark: bg-slate-950
                                    className="group bg-white dark:bg-slate-950 p-5 lg:p-8 rounded-[1.5rem] lg:rounded-[2.5rem] border-2 border-slate-50 dark:border-slate-800/50 hover:border-blue-600 dark:hover:border-blue-500 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                                >
                                    <div className="flex items-center gap-4 lg:gap-6">
                                        {/* Ícone de Status com transparência no Dark Mode */}
                                        <div className={`w-12 h-12 lg:w-16 lg:h-16 rounded-xl lg:rounded-2xl flex items-center justify-center transition-colors ${os.status === 'Concluído'
                                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 dark:text-emerald-400'
                                            : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                            }`}>
                                            {os.status === 'Concluído' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 mb-1 text-slate-400 dark:text-slate-600 font-black text-[8px] uppercase tracking-widest">
                                                #{os.id} • {os.data}
                                            </div>
                                            <h4 className="text-base lg:text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-500 transition-colors">
                                                {os.modelo}
                                            </h4>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center md:flex-col md:items-end gap-2">
                                        {/* Badge de Status: Emerald-900/20 (Sucesso) | Blue-500 (Destaque) */}
                                        <span className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${os.status === 'Concluído'
                                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                            }`}>
                                            {os.status}
                                        </span>
                                        <ChevronRight size={16} className="text-slate-300 dark:text-slate-700 md:hidden" />
                                    </div>
                                </div>
                            ))
                        ) : (
                            /* EMPTY STATE */
                            <div className="py-20 text-center text-slate-300 dark:text-slate-700 italic uppercase font-black text-[10px] tracking-widest">
                                Sem registros.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- MODAL E PRINTÁVEL --- */}
            {selectedOS && (
                <>
                    {/* Backdrop: bg-slate-900/80 | Dark: bg-slate-950/90 */}
                    <div className="fixed inset-0 bg-slate-900/80 dark:bg-slate-950/90 backdrop-blur-xl flex items-end md:items-center justify-center p-0 md:p-6 z-[100] print:hidden animate-in fade-in duration-300">

                        {/* Container: bg-white | Dark: bg-slate-900 */}
                        <div className="bg-white dark:bg-slate-900 rounded-t-[3rem] md:rounded-[3rem] max-w-2xl w-full p-8 md:p-12 shadow-2xl relative border-t-4 md:border-4 border-slate-900 dark:border-slate-800 animate-in slide-in-from-bottom-10 md:zoom-in duration-500 max-h-[90vh] overflow-y-auto transition-colors duration-300">

                            {/* Botão Fechar */}
                            <button
                                onClick={() => setSelectedOS(null)}
                                className="absolute top-6 right-6 md:top-10 md:right-10 text-slate-300 dark:text-slate-600 hover:text-slate-900 dark:hover:text-slate-100 transition-colors p-2"
                            >
                                <X size={window.innerWidth < 768 ? 28 : 40} />
                            </button>

                            {/* Header do Relatório */}
                            <div className="flex items-center gap-4 mb-8 md:mb-10">
                                {/* Destaque Tech: blue-600 | Dark: blue-500 */}
                                <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-600 dark:bg-blue-500 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-900/20">
                                    <Smartphone size={window.innerWidth < 768 ? 22 : 28} />
                                </div>
                                <div>
                                    <h3 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-50 tracking-tighter leading-none uppercase italic">
                                        Relatório OS
                                    </h3>
                                    <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[9px] md:text-[10px] tracking-widest mt-1">
                                        Status: <span className="text-blue-600 dark:text-blue-400">{selectedOS.os_info.status}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Grid de Informações */}
                            <div className="space-y-4 md:space-y-6 mb-10 md:mb-12">
                                {/* Equipamento: bg-slate-50 | Dark: bg-slate-950 */}
                                <div className="bg-slate-50 dark:bg-slate-950 p-5 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-800 transition-colors">
                                    <p className="text-[9px] font-black text-blue-600 dark:text-blue-500 uppercase mb-1 md:mb-2 tracking-widest">Equipamento</p>
                                    <p className="text-lg md:text-xl font-black text-slate-700 dark:text-slate-200 tracking-tight uppercase italic">
                                        {selectedOS.os_info.modelo}
                                    </p>
                                </div>

                                {/* Problema: bg-slate-50 | Dark: bg-slate-950 */}
                                <div className="bg-slate-50 dark:bg-slate-950 p-5 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-800 italic transition-colors">
                                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1 md:mb-2 tracking-widest">Problema Relatado</p>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                                        "{selectedOS.os_info.problema}"
                                    </p>
                                </div>

                                {/* BOTÃO WHATSAPP: emerald-600 | Dark: bg-emerald-900/20 text-emerald-400 */}
                                {selectedOS.cliente_info?.whatsapp_link && (
                                    <a
                                        href={selectedOS.cliente_info.whatsapp_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full bg-emerald-600 dark:bg-emerald-900/20 text-white dark:text-emerald-400 border-2 border-transparent dark:border-emerald-500/20 py-5 md:py-6 rounded-2xl md:rounded-[2rem] font-black text-base md:text-lg flex items-center justify-center gap-3 hover:bg-emerald-700 dark:hover:bg-emerald-900/40 transition-all shadow-xl dark:shadow-none active:scale-95 uppercase italic tracking-tight"
                                    >
                                        <Phone size={20} /> Notificar no Whats
                                    </a>
                                )}
                            </div>

                            {/* Ação secundária: Imprimir */}
                            <button
                                onClick={() => window.print()}
                                className="w-full bg-slate-900 dark:bg-slate-950 text-white py-5 md:py-6 rounded-2xl md:rounded-[2rem] font-black text-sm md:text-xl flex items-center justify-center gap-3 hover:bg-blue-600 dark:hover:bg-blue-500 transition-all shadow-xl dark:shadow-none border border-transparent dark:border-slate-800 active:scale-95 uppercase"
                            >
                                <Printer size={22} /> Imprimir Comprovante
                            </button>
                        </div>
                    </div>



                    {/* --- ÁREA DE IMPRESSÃO (Cidinho TECHNICAL STANDARD) --- */}
                    <div id="print-area-wrapper" className="hidden print:block bg-white text-slate-900 p-12">
                        <div className="flex justify-between items-start mb-12 border-b-8 border-slate-900 pb-8">
                            <div>
                                <h3 className="text-4xl font-black tracking-tighter uppercase leading-none italic">Cidinho - Assistência Técnica</h3>
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
                                    {selectedOS.cliente_info?.nome || "CONSUMIDOR FINAL"}
                                </p>

                                <div className="flex items-center gap-1 text-base font-black font-mono text-slate-800 tracking-tighter italic">
                                    <span>CPF:</span>
                                    <IMaskInput
                                        mask="000.000.000-00"
                                        value={selectedOS.cliente_info?.cpf || ""}
                                        readOnly
                                        className="bg-transparent border-none outline-none w-full font-mono"
                                    />
                                </div>

                                <div className="flex gap-6 mt-2">
                                    <div className="flex items-center gap-1 text-sm font-black text-slate-600 uppercase font-mono">
                                        <span>TEL:</span>
                                        <IMaskInput
                                            mask="(00) 00000-0000"
                                            value={selectedOS.cliente_info?.telefone || ""}
                                            readOnly
                                            className="bg-transparent border-none outline-none w-[140px]"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1 text-sm font-black text-slate-600 uppercase font-mono">
                                        <span>CEP:</span>
                                        <IMaskInput
                                            mask="00000-000"
                                            value={selectedOS.cliente_info?.cep || ""}
                                            readOnly
                                            className="bg-transparent border-none outline-none w-[100px]"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="text-right border-r-8 border-emerald-500 pr-8">
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Equipamento Vinculado</p>
                                <p className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">{selectedOS.os_info?.modelo || "N/A"}</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 border-4 border-slate-900 p-10 rounded-[3rem] mb-12 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5"><Cpu size={100} /></div>
                            <p className="text-[11px] font-black text-slate-900 uppercase tracking-[0.4em] mb-4 border-b-2 border-slate-200 pb-3 italic">Laudo Técnico / Procedimentos</p>
                            <p className="text-slate-800 leading-relaxed font-black text-lg whitespace-pre-wrap uppercase italic">{selectedOS.os_info?.laudo_tecnico || "Mão de obra técnica especializada."}</p>
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
                                    {selectedOS.pecas_utilizadas?.map((p, i) => (
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
                                    Cidinho Technical Solutions
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

export default DetalhesCliente;