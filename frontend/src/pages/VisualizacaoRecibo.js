import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Smartphone, Printer, Cpu, CheckCircle2 } from 'lucide-react';
import { IMaskInput } from 'react-imask';
import api from './api';
import { Helmet } from 'react-helmet-async';

const VisualizacaoRecibo = () => {
    const { osId } = useParams();
    const [dados, setDados] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOS = async () => {
            try {
                // Rota que criamos para detalhes da OS
                const res = await api.get(`/os/detalhes-publico/${osId}`);
                setDados(res.data);
            } catch (err) {
                console.error("Erro ao carregar recibo");
            } finally {
                setLoading(false);
            }
        };
        fetchOS();
    }, [osId]);

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white">
            <Cpu className="animate-spin text-blue-600 mb-4" size={40} />
            <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Carregando Documento Técnico...</p>
        </div>
    );

    if (!dados) return <div className="p-10 text-center font-black">OS NÃO ENCONTRADA</div>;



    return (
        <>
            <Helmet>
                <title>{`Recibo OS #${dados?.os_info?.id || osId} - SGAT`}</title>

                <meta property="og:title" content={`SGAT - Recibo de ${dados?.cliente_info?.nome || 'Cliente'}`} />
                <meta property="og:description" content={`Laudo técnico do aparelho ${dados?.os_info?.modelo || 'em manutenção'}.`} />

                {/* A imagem precisa ser um link completo e público para o WhatsApp ler */}
                <meta property="og:image" content="https://fidel-unvictorious-vicenta.ngrok-free.dev/logo-sgat.png" />
            </Helmet>
            <div className="min-h-screen bg-slate-50 md:p-12">
                {/* Botão de Impressão Flutuante (Escondido na hora de imprimir) */}
                <div className="max-w-4xl mx-auto mb-6 flex justify-end print:hidden px-4">
                    <button
                        onClick={() => window.print()}
                        className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl hover:bg-blue-600 transition-all active:scale-95 uppercase text-xs tracking-widest"
                    >
                        <Printer size={20} /> Imprimir Via do Cliente
                    </button>
                </div>

                {/* --- ÁREA DE IMPRESSÃO (SGAT TECHNICAL STANDARD) --- */}
                <div id="recibo-cliente" className="max-w-4xl mx-auto bg-white shadow-2xl md:rounded-[3rem] p-8 md:p-16 border border-slate-100 print:shadow-none print:border-none print:p-0">
                    <div className="flex justify-between items-start mb-12 border-b-8 border-slate-900 pb-8">
                        <div>
                            <h3 className="text-4xl font-black tracking-tighter uppercase leading-none italic">SGAT - Assistência Técnica</h3>
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
                                {dados.cliente_info?.nome || "CONSUMIDOR FINAL"}
                            </p>

                            <div className="flex items-center gap-1 text-base font-black font-mono text-slate-800 tracking-tighter italic">
                                <span>CPF:</span>
                                <IMaskInput
                                    mask="000.000.000-00"
                                    value={dados.cliente_info?.cpf || ""}
                                    readOnly
                                    className="bg-transparent border-none outline-none w-full font-mono"
                                />
                            </div>

                            <div className="flex gap-6 mt-2">
                                <div className="flex items-center gap-1 text-sm font-black text-slate-600 uppercase font-mono">
                                    <span>TEL:</span>
                                    <IMaskInput
                                        mask="(00) 00000-0000"
                                        value={dados.cliente_info?.telefone || ""}
                                        readOnly
                                        className="bg-transparent border-none outline-none w-[140px]"
                                    />
                                </div>
                                <div className="flex items-center gap-1 text-sm font-black text-slate-600 uppercase font-mono">
                                    <span>CEP:</span>
                                    <IMaskInput
                                        mask="00000-000"
                                        value={dados.cliente_info?.cep || ""}
                                        readOnly
                                        className="bg-transparent border-none outline-none w-[100px]"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="text-right border-r-8 border-emerald-500 pr-8">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Equipamento Vinculado</p>
                            <p className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">{dados.os_info?.modelo || "N/A"}</p>
                        </div>
                    </div>

                    <div className="bg-slate-50 border-4 border-slate-900 p-10 rounded-[3rem] mb-12 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5"><Cpu size={100} /></div>
                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-[0.4em] mb-4 border-b-2 border-slate-200 pb-3 italic">Laudo Técnico / Procedimentos</p>
                        <p className="text-slate-800 leading-relaxed font-black text-lg whitespace-pre-wrap uppercase italic">{dados.os_info?.laudo_tecnico || "Mão de obra técnica especializada."}</p>
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
                                {dados.pecas_utilizadas?.map((p, i) => (
                                    <tr key={i} className="bg-white">
                                        <td className="px-8 py-5 font-black text-slate-800 uppercase text-base italic">{p.nome}</td>
                                        <td className="px-8 py-5 text-right font-black text-3xl text-slate-900 tracking-tighter">x{p.quantidade}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className=" print:flex print-footer-watermark flex-col items-center justify-center w-full">
                        {/* Linha técnica separadora (opcional, para design industrial) */}
                        <div className="w-1/2 h-px bg-slate-200 mb-4 opacity-50"></div>

                        <div className="flex flex-col items-center gap-1">
                            <p className="text-[10px] font-black uppercase text-slate-300 tracking-[0.4em] italic leading-none">
                                SGAT Technical Solutions
                            </p>
                            <div className="flex items-center gap-4 mt-1">
                                <span className="text-[9px] font-black text-slate-200 uppercase tracking-widest">Command Center São Paulo, SP</span>
                                <span className="text-[9px] font-black text-slate-200 uppercase tracking-widest">VIA CLIENTE</span>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default VisualizacaoRecibo;