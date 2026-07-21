import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Cpu, ArrowRight } from 'lucide-react';
import api from './api';

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [status, setStatus] = useState({ loading: true, success: false, msg: '' });
    const navigate = useNavigate();

    useEffect(() => {
        const verify = async () => {
            if (!token) {
                setStatus({ loading: false, success: false, msg: 'Token de verificação ausente.' });
                return;
            }

            try {
                const response = await api.post('/auth/verify-email', { token });
                setStatus({ loading: false, success: true, msg: response.data.msg });
            } catch (err) {
                setStatus({
                    loading: false,
                    success: false,
                    msg: err.response?.data?.msg || 'Falha ao verificar e-mail. O link pode ter expirado.'
                });
            }
        };
        verify();
    }, [token]);

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

                {status.loading ? (
                    <div className="flex flex-col items-center gap-4 py-8">
                        <Loader2 size={48} className="text-blue-600 animate-spin" />
                        <h2 className="text-2xl font-black text-slate-800 tracking-tighter">Validando seu acesso...</h2>
                        <p className="text-slate-400 font-medium">Estamos processando sua verificação em tempo real.</p>
                    </div>
                ) : (
                    <div className="animate-in fade-in zoom-in duration-500">
                        {status.success ? (
                            <CheckCircle size={64} className="text-emerald-500 mx-auto mb-6" />
                        ) : (
                            <XCircle size={64} className="text-red-500 mx-auto mb-6" />
                        )}

                        <h2 className="text-3xl font-black text-slate-800 tracking-tighter mb-2">
                            {status.success ? 'E-mail Verificado!' : 'Ops! Algo deu errado'}
                        </h2>
                        <p className="text-slate-400 font-medium mb-10">{status.msg}</p>

                        <button
                            onClick={() => navigate('/login')}
                            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-blue-600 transition-all shadow-xl shadow-blue-100 active:scale-95"
                        >
                            {status.success ? 'Ir para o Login' : 'Voltar ao Início'} <ArrowRight size={20} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerifyEmail;
