import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Cpu, Code, ShieldCheck, LogIn } from 'lucide-react';

const Sobre = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white font-sans overflow-x-hidden">
            {/* --- NAVBAR ORGÂNICA --- */}
            <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-slate-50">

                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

                    {/* LOGO AREA */}
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigate('/home')}>
                        <div className="relative">
                            {/* O "Símbolo": Um hexágono ou quadrado rotacionado que remete a um chip/processador */}
                            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white transition-all duration-500 group-hover:bg-blue-600 group-hover:rotate-[10deg] shadow-lg">
                                <Cpu size={22} strokeWidth={2.5} />
                            </div>
                            {/* Detalhe de luz: um ponto que parece um LED de sistema */}
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
                        </div>

                        <div className="flex flex-col leading-none">
                            <span className="text-xl font-black tracking-tighter text-slate-900 uppercase">
                                SGAT<span className="text-blue-600">.</span>
                            </span>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                Systems Analyst
                            </span>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-500">
                        <a href="/home/servicos" className="hover:text-blue-600 transition-colors">Serviços</a>
                        <a href="/home/sobre" className="hover:text-blue-600 transition-colors">Sobre</a>
                        <button onClick={() => navigate('/login')} className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-full hover:bg-blue-600 transition-all active:scale-95 shadow-xl shadow-slate-200">
                            <LogIn size={18} /> Acessar Sistema
                        </button>
                    </div>
                </div>
            </nav>

            <div className="max-w-6xl mx-auto pt-26">
                <button onClick={() => navigate('/')} className="flex items-center gap-3 text-slate-400 hover:text-slate-800 font-bold mb-12 group transition-all">
                    <div className="p-3 bg-white rounded-2xl shadow-sm group-hover:bg-slate-100 transition-all"><ArrowLeft size={24} /></div>
                    <span className="uppercase tracking-widest text-sm">Voltar</span>
                </button>


                <div className="relative mb-20">
                    {/* <div className="absolute -left-20 -top-10 text-slate-50 font-black text-[12rem] leading-none z-0 select-none">LUCAS</div> */}
                    <div className="relative z-10">
                        <span className="text-blue-600 font-black uppercase text-xs tracking-[0.4em] mb-4 block">Systems Analyst & Tech Expert</span>
                        <h1 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter leading-none mb-12">SGAT <br /> <span className="text-slate-400">Experience.</span></h1>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
                    <div className="space-y-8">
                        <p className="text-xl text-slate-600 leading-relaxed font-medium italic">
                            "Minha missão é levar a seriedade da análise de sistemas para a bancada de reparos."
                        </p>
                        <p className="text-slate-500 leading-relaxed font-bold">
                            Como Systems Analyst, enxergo cada smartphone não apenas como um conjunto de peças, mas como um ecossistema complexo de hardware e software que deve operar em harmonia.
                        </p>
                        <p className="text-slate-500 leading-relaxed font-bold">
                            O SGAT nasceu da necessidade de transparência. Acredito que o cliente merece saber exatamente o que está acontecendo com seu dispositivo, através de dados, laudos e precisão técnica.
                        </p>
                    </div>

                    <div className="bg-slate-900 p-11 rounded-[3.5rem] text-white space-y-6 shadow-2xl shadow-blue-100 relative">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-600 rounded-2xl"><ShieldCheck size={24} /></div>
                            <h4 className="font-black text-lg uppercase tracking-widest">Compromisso</h4>
                        </div>
                        <div className="space-y-6">
                            <div className="border-l-2 border-blue-600 pl-6">
                                <p className="text-xs font-black text-slate-400 uppercase mb-1">Qualidade</p>
                                <p className="text-sm font-bold">Peças homologadas e testes de stress rigorosos.</p>
                            </div>
                            <div className="border-l-2 border-blue-600 pl-6">
                                <p className="text-xs font-black text-slate-400 uppercase mb-1">Transparência</p>
                                <p className="text-sm font-bold">Laudos técnicos digitais em tempo real.</p>
                            </div>
                            <div className="border-l-2 border-blue-600 pl-6">
                                <p className="text-xs font-black text-slate-400 uppercase mb-1">Inovação</p>
                                <p className="text-sm font-bold">Processos baseados em análise de dados.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    );
};

export default Sobre;