import { useEffect, useState, useRef } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import api from "./api";

const ScannerEntrega = () => {
    const [status, setStatus] = useState("SISTEMA PRONTO");
    const [cameraAtiva, setCameraAtiva] = useState(false);
    const [loading, setLoading] = useState(false);
    const scannerRef = useRef(null);

    // --- COLOQUE O USEEFFECT AQUI ---
    useEffect(() => {
        // Esta função corre quando o componente é montado
        console.log("Scanner montado.");

        return () => {
            // ESTA É A PARTE MAIS IMPORTANTE:
            // Quando fechas o modal ou mudas de página, isto mata o hardware.
            if (scannerRef.current) {
                if (scannerRef.current.isScanning) {
                    scannerRef.current.stop()
                        .then(() => {
                            scannerRef.current.clear();
                            console.log("Câmara desligada com sucesso.");
                        })
                        .catch(err => console.error("Erro ao limpar hardware:", err));
                } else {
                    scannerRef.current.clear();
                }
            }
        };
    }, []); // Array vazio significa: corre apenas uma vez ao abrir
    // Função para desligar a câmera com segurança
    const desligarCamera = async () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
                setCameraAtiva(false);
            } catch (err) {
                console.error("Erro ao desligar:", err);
            }
        }
    };

    useEffect(() => {
        // Cleanup total ao desmontar o componente
        return () => {
            desligarCamera();
        };
    }, []);

    const ligarCamera = async () => {
        if (loading) return;
        setLoading(true);
        setStatus("SOLICITANDO HARDWARE...");

        try {
            // Se já houver uma instância, limpamos
            if (scannerRef.current) {
                await desligarCamera();
            }

            scannerRef.current = new Html5Qrcode("reader");

            const config = {
                fps: 15, // Diminuir um pouco o FPS às vezes ajuda o processador do celular a focar melhor
                qrbox: { width: 250, height: 250 },
                // Adicione formatos explícitos para o motor não perder tempo tentando ler código de barras
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
            };

            // Se estiver usando o Html5Qrcode puro:
            await scannerRef.current.start(
                { facingMode: "environment" },
                config,
                onScanSuccess
            );

            const onScanSuccess = async (decodedText) => {
                // 1. Trava de segurança para não disparar mil vezes
                if (loading) return;

                try {
                    setLoading(true);
                    setStatus("🚀 PROCESSANDO...");
                    console.log("Conteúdo lido:", decodedText);

                    // 2. Mata o hardware na hora (evita o "congelamento")
                    if (scannerRef.current) {
                        await scannerRef.current.stop();
                        setCameraAtiva(false);
                    }

                    // 3. Lógica de Extração: 
                    // Se o QR for "https://.../validar-qr/8/ABC", pegamos a rota
                    // Se o QR for apenas "8/ABC", montamos a rota
                    let endpoint = "";
                    if (decodedText.includes('validar-qr')) {
                        // Extrai tudo a partir de /os/validar-qr...
                        endpoint = decodedText.split('/api')[1] || decodedText.split('.dev')[1];
                    } else {
                        // Fallback caso o QR tenha apenas os IDs
                        endpoint = `/os/validar-qr/${decodedText}`;
                    }

                    console.log("Chamando endpoint:", endpoint);

                    // 4. A CHAMADA QUE DEVE APARECER NO NETWORK
                    const res = await api.post(endpoint);

                    setStatus("✅ CONFIRMADO!");
                    alert("Entrega realizada com sucesso!");
                    window.location.reload();

                } catch (err) {
                    console.error("Erro detalhado:", err);
                    // Se cair aqui SEM log no Network, o erro é no JS acima (split, URL, etc)
                    setStatus("❌ QR INVÁLIDO OU ERRO DE CONEXÃO");
                } finally {
                    setLoading(false);
                }
            };

            setCameraAtiva(true);
            setStatus("SCANNER EM OPERAÇÃO");
        } catch (err) {
            console.error(err);
            setStatus("ERRO: CÂMERA OCUPADA OU NEGADA");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-6 text-white text-center">
            {/* Header Estilizado */}
            <div className="mb-8">
                <h2 className="text-2xl font-black italic text-cyan-400 uppercase tracking-tighter">
                    Security <span className="text-white">Handshake</span>
                </h2>
                <div className="h-1 w-20 bg-cyan-500 mx-auto mt-2 rounded-full animate-pulse"></div>
            </div>

            {/* Viewfinder Wrapper */}
            <div className="relative w-80 h-80 rounded-[3.5rem] overflow-hidden border-4 border-cyan-500/20 shadow-[0_0_60px_rgba(6,182,212,0.15)] bg-slate-900 mb-8 transition-all duration-500">

                {/* O Elemento de Vídeo */}
                <div id="reader" className="w-full h-full overflow-hidden [&>video]:object-cover"></div>

                {/* Overlay quando desligada */}
                {!cameraAtiva && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-md z-10 p-8">
                        <div className="w-16 h-16 border-2 border-cyan-500/30 rounded-full mb-6 flex items-center justify-center animate-spin-slow">
                            <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                        </div>
                        <button
                            onClick={ligarCamera}
                            disabled={loading}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white px-10 py-4 rounded-2xl font-black uppercase italic text-sm tracking-widest transition-all active:scale-95 shadow-xl shadow-cyan-900/40 disabled:opacity-50"
                        >
                            {loading ? "CARREGANDO..." : "ATIVAR SCANNER"}
                        </button>
                    </div>
                )}

                {/* Mira Visual (Só aparece quando ativa) */}
                {cameraAtiva && (
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-10 border-2 border-cyan-400/50 rounded-3xl animate-pulse">
                            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-cyan-400"></div>
                            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-cyan-400"></div>
                            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-cyan-400"></div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-cyan-400"></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Status Panel */}
            <div className="w-full max-w-xs bg-slate-900 border border-slate-800 p-5 rounded-[2rem] shadow-inner">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 italic">Console_System_V2.5</p>
                <p className={`text-sm font-black uppercase tracking-tight italic ${status.includes('❌') ? 'text-red-500' : 'text-cyan-400'}`}>
                    {status}
                </p>
            </div>

            {cameraAtiva && (
                <button
                    onClick={desligarCamera}
                    className="mt-6 text-[10px] text-slate-500 font-black uppercase tracking-widest hover:text-white transition-colors"
                >
                    [ Desativar Hardware ]
                </button>
            )}
        </div>
    );
};

export default ScannerEntrega;