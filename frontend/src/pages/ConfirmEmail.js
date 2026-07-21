import React from 'react';
import { MailCheck, ArrowRight, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ConfirmEmail = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100 text-center">

                <div className="flex items-center gap-3 mb-10 justify-center">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                        <Cpu size={22} />
                    </div>
                    <span className="text-xl font-black tracking-tighter text-slate-900 uppercase">
                        SGAT<span className="text-blue-600">.</span>
                    </span>
                </div>

                <div className="animate-in fade-in zoom-in duration-500">
                    <MailCheck size={64} className="text-emerald-500 mx-auto mb-6" />

                    <h2 className="text-3xl font-black text-slate-800 tracking-tighter mb-2">
                        Confirme seu E-mail
                    </h2>
                    <p className="text-slate-400 font-medium mb-10">
                        Enviamos um link de ativação para o seu endereço de e-mail. Por favor, verifique sua caixa de entrada (e spam) para continuar.
                    </p>

                    <button
                        onClick={() => navigate('/login')}
                        className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-blue-600 transition-all shadow-xl shadow-blue-100 active:scale-95"
                    >
                        Ir para o Login <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmEmail;