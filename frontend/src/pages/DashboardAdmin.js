import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import {
    LayoutDashboard, Package, Users,
    CalendarCheck, X, Search, LogOut, ShieldAlert,
    Settings, ClipboardList, Receipt, Cpu, ChevronRight, Menu, FileText,
    Clock, AlertCircle, CheckCircle2, Calendar, Smartphone, ChevronLeft,
    Sparkles, MonitorCheckIcon, AlertTriangle, Zap, ShieldCheck,
    Table
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from './api';
import notify from '../utils/notifications';
import html2pdf from 'html2pdf.js';
import { QRCodeSVG } from 'qrcode.react';


const DashboardAdmin = () => {
    // ... seus estados atuais ...
    const [tab, setTab] = useState(localStorage.getItem('sgat_tab_preference') || 'lista');
    const [todasOS, setTodasOS] = useState([]);
    const [estoque, setEstoque] = useState([]);
    const [selectedOS, setSelectedOS] = useState(null);
    const [horariosOcupados, setHorariosOcupados] = useState({});
    const [dataAgendamento, setDataAgendamento] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [showConcluirModal, setShowConcluirModal] = useState(false);
    const [pecasSugeridas, setPecasSugeridas] = useState([]);
    const [pecasEscolhidas, setPecasEscolhidas] = useState([]);
    const [dataReferencia, setDataReferencia] = useState(new Date());
    const [laudo, setLaudo] = useState('');
    const [whatsLinkPending, setWhatsLinkPending] = useState(null);
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [horaSelecionada, setHoraSelecionada] = useState('');
    const [semanaOffset, setSemanaOffset] = useState(0); // 0 = Hoje, -1 = Semana passada, +1 = Próxima
    const [busca, setBusca] = useState('');
    const [abrirSeletorData, setAbrirSeletorData] = useState(false);

    const fecharHandshakeESair = () => {
        setShowVerifyModal(false); // Fecha o modal de senha
        setSelectedOS(null);       // Limpa a OS selecionada (isso mata o modal de gestão)
        setInputCode('');          // Limpa o que foi digitado por segurança
    };

    // Estados para campos financeiros customizáveis
    const [valorMaoObra, setValorMaoObra] = useState('');
    const [custoOperacional, setCustoOperacional] = useState('');
    const [descontoAplicado, setDescontoAplicado] = useState('');

    const scrollRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [inputCode, setInputCode] = useState('');




    useEffect(() => {
        const el = scrollRef.current;
        if (el) {
            const onWheel = (e) => {
                // Se não houver deslocamento vertical, ignora
                if (e.deltaY === 0) return;

                // Impede o scroll vertical da página inteira
                e.preventDefault();

                // Converte o movimento Y em movimento X (Horizontal)
                el.scrollTo({
                    left: el.scrollLeft + e.deltaY * 3, // Multiplicador de velocidade (ajuste a gosto)
                    behavior: 'auto' // 'auto' é mais responsivo para scroll de mouse que 'smooth'
                });
            };

            // Adiciona o listener com { passive: false } para o preventDefault funcionar
            el.addEventListener("wheel", onWheel, { passive: false });

            return () => el.removeEventListener("wheel", onWheel);
        }
    }, []);

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };

    const handleMouseLeave = () => setIsDragging(false);
    const handleMouseUp = () => setIsDragging(false);

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 2; // Multiplicador de velocidade
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    // const confirmarEnvioCodigo = async (minutos = 30) => {
    //     const confirm = window.confirm(`Deseja gerar o código e notificar o cliente? O token expirará em ${minutos} minutos.`);
    //     if (!confirm) return;

    //     try {
    //         setLoading(true);
    //         const res = await api.post(`/os/${selectedOS.id}/pronto`, {
    //             expira_em: minutos
    //         });

    //         if (res.data.whatsapp_link) window.open(res.data.whatsapp_link, '_blank');

    //         alert("Código enviado e cronômetro iniciado!");
    //         carregarDados();
    //     } catch (err) {
    //         alert("Erro ao processar envio.");
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    const handleGerarCodigo = async (osId) => {
        try {
            await api.post(`/os/${osId}/pronto`, { expira_em: 30 });

            // ESSENCIAL: Recarregar a lista para o React "enxergar" a nova data de expiração
            await carregarDados();

            notify.success("Código gerado com sucesso!");
        } catch (err) {
            console.error("Erro ao gerar código");
        }
    };

    useEffect(() => {
        // Verifique se a OS selecionada REALMENTE tem o campo de expiração vindo do banco
        if (!selectedOS?.code_expires_at) {
            console.log("Aguardando data de expiração...");
            return;
        }

        const interval = setInterval(() => {
            const agora = new Date().getTime();
            // Converter a string do banco para timestamp do JS
            const expiracao = new Date(selectedOS.code_expires_at).getTime();
            const diff = expiracao - agora;

            if (diff <= 0) {
                setTempoRestante("EXPIRADO");
                clearInterval(interval);
            } else {
                const minutos = Math.floor(diff / (1000 * 60));
                const segundos = Math.floor((diff % (1000 * 60)) / 1000);
                setTempoRestante(`${minutos}:${segundos < 10 ? '0' : ''}${segundos}`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [selectedOS]);




    const calcularAlertaEntrada = (dataISO) => {
        if (!dataISO) return null;

        // Converte a string (Ex: 2026-03-12T14:30) para objeto Date
        const dataAgendada = new Date(dataISO);
        const agora = new Date();

        const diffMs = dataAgendada - agora;
        const diffHoras = diffMs / (1000 * 60 * 60);

        if (diffMs < 0) {
            return { label: "CLIENTE ATRASADO", cor: "bg-red-600", pulse: false };
        }
        if (diffHoras <= 2) {
            return { label: "CLIENTE A CAMINHO", cor: "bg-amber-500", pulse: true };
        }
        return { label: "AGENDADO", cor: "bg-blue-500", pulse: false };
    };

    const gerarLaudoAutomatico = () => {
        // Mapeamento de termos técnicos por ID ou Nome de peça
        const termosTecnicos = {
            'Tela': 'Substituição de conjunto frontal original com calibração de touch.',
            'Bateria': 'Troca de célula de energia por componente de alta densidade e teste de ciclos.',
            'Conector': 'Reparo no barramento de carga e desoxidação dos contatos internos.',
            'Câmera': 'Substituição de módulo óptico e limpeza de sensores infravermelhos.',
            'Tampa': 'Substituição de painel traseiro com vedação IP68 original.'
        };

        let rascunho = `Procedimento realizado para sanar o defeito: ${selectedOS.problema}.\n\n`;

        // Filtra as peças que foram marcadas e pega os nomes
        const pecasNomes = pecasSugeridas
            .filter(p => pecasEscolhidas.includes(p.id))
            .map(p => p.nome);

        if (pecasNomes.length > 0) {
            rascunho += "Ações executadas:\n";
            pecasNomes.forEach(nome => {
                // Tenta achar um termo técnico, se não, usa um padrão
                const termo = Object.entries(termosTecnicos).find(([key]) => nome.includes(key))?.[1]
                    || `Instalação de novo componente: ${nome}.`;
                rascunho += `• ${termo}\n`;
            });
            rascunho += "\nTestes de pós-reparo concluídos com sucesso.";
        }

        setLaudo(rascunho.toUpperCase()); // Mantendo seu padrão de caixa alta brutalista
    };

    const verificarAtraso = (dataISO, hora) => {
        if (!dataISO || !hora) return false;

        const [h, m] = hora.split(':');
        const dataAgendada = new Date(dataISO);
        dataAgendada.setHours(parseInt(h), parseInt(m), 0);

        return dataAgendada < new Date(); // Retorna true se já passou da hora
    };
    // Garanta que o estado inicial seja um objeto
    const [escalaSemanal, setEscalaSemanal] = useState({});

    const calcularStatusInteligente = (dataISO, hora) => {
        if (!dataISO || !hora) return { nivel: 'normal', label: 'Agendado' };

        // Criamos o objeto da data agendada
        const [h, m] = hora.split(':');
        const dataAgendada = new Date(dataISO + 'T00:00:00');
        dataAgendada.setHours(parseInt(h), parseInt(m), 0);

        const agora = new Date();
        const diffEmMs = dataAgendada - agora;
        const diffEmHoras = diffEmMs / (1000 * 60 * 60);

        // 1. ATRASO CRÍTICO: Data anterior a hoje (independente da hora)
        const hojeAmanha = new Date();
        hojeAmanha.setHours(0, 0, 0, 0);
        const dataAgendadaZero = new Date(dataAgendada);
        dataAgendadaZero.setHours(0, 0, 0, 0);

        if (dataAgendadaZero < hojeAmanha) {
            return { nivel: 'critico', label: 'Atraso Crítico (Dias)', cor: 'bg-red-600', border: 'border-red-600' };
        }

        // 2. ATRASO DE HOJE: Hora já passou
        if (diffEmMs < 0) {
            return { nivel: 'atrasado', label: 'Hora Excedida', cor: 'bg-orange-500', border: 'border-orange-500' };
        }

        // 3. URGÊNCIA: É hoje e falta menos de 2 horas
        if (diffEmHoras > 0 && diffEmHoras <= 2) {
            return { nivel: 'urgente', label: 'Entrega Próxima', cor: 'bg-amber-400', border: 'border-amber-400' };
        }

        return { nivel: 'ok', label: 'No Prazo', cor: 'bg-blue-600', border: 'border-blue-200' };
    };

    const diasDoMes = useMemo(() => {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        // Aplicamos o offset (multiplicamos por 7 dias ou usamos um valor fixo)
        const dataInicial = new Date(hoje);
        dataInicial.setDate(hoje.getDate() + (semanaOffset * 7));

        const QUANTIDADE_DIAS = 14;

        return Array.from({ length: QUANTIDADE_DIAS }).map((_, index) => {
            const data = new Date(dataInicial);
            data.setDate(dataInicial.getDate() + index);

            const dataISO = data.toISOString().split('T')[0];
            const eHoje = dataISO === new Date().toISOString().split('T')[0];

            return {
                nome: data.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
                diaNumero: data.getDate(),
                mesNome: data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
                dataISO: dataISO,
                dataFormatted: data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                eHoje: eHoje
            };
        });
    }, [semanaOffset]);

    const mudarMes = (offset) => {
        const novaData = new Date(dataReferencia);
        novaData.setMonth(novaData.getMonth() + offset);
        setDataReferencia(novaData);
    };

    const ordensFiltradas = todasOS.filter(os => {
        const termo = busca.toLowerCase();
        return (
            os.cliente?.toLowerCase().includes(termo) ||
            os.id.toString().includes(termo) ||
            os.modelo?.toLowerCase().includes(termo)
        );
    });


    const resumoAlertas = useMemo(() => {
        let atrasadas = 0;
        let urgentes = 0;

        // Varremos a escala semanal em busca de problemas
        Object.keys(escalaSemanal).forEach(dataISO => {
            escalaSemanal[dataISO].forEach(job => {
                if (job.status !== 'Concluído') {
                    const status = calcularStatusInteligente(dataISO, job.hora);
                    if (status.nivel === 'critico' || status.nivel === 'atrasado') atrasadas++;
                    if (status.nivel === 'urgente') urgentes++;
                }
            });
        });

        return { atrasadas, urgentes };
    }, [escalaSemanal]);

    const slotsHorarios = [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30',
        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
    ];




    // Busca a contagem de agendamentos no banco para a data selecionada
    const buscarOcupacao = useCallback(async (data) => {
        if (!data) return;
        try {
            const res = await api.get(`/os/admin/ocupacao?data=${data}`);
            setHorariosOcupados(res.data); // Espera um objeto: { "09:00": 3, "10:30": 1 }
        } catch (err) {
            console.error("Erro ao buscar ocupação");
        }
    }, []);

    useEffect(() => {
        if (dataAgendamento) buscarOcupacao(dataAgendamento);
    }, [dataAgendamento, buscarOcupacao]);

    // Lógica de Validação de Horários (Regras de Negócio)
    const renderSlots = () => {
        if (!dataAgendamento) return <p className="text-[10px] font-bold text-slate-400 italic p-4">Selecione uma data primeiro...</p>;

        const dataObj = new Date(dataAgendamento + 'T00:00:00');
        const diaSemana = dataObj.getDay(); // 0 = Domingo, 6 = Sábado
        const verificarAtraso = (dataISO, hora) => {
            if (!dataISO || !hora) return false;

            const [h, m] = hora.split(':');
            const dataAgendada = new Date(dataISO);
            dataAgendada.setHours(parseInt(h), parseInt(m), 0);

            return dataAgendada < new Date(); // Retorna true se já passou da hora
        };

        // Regra 1: Domingo não abre
        if (diaSemana === 0) {
            return <div className="col-span-3 p-4 bg-red-50 rounded-2xl border border-red-100 text-red-500 font-bold text-xs text-center uppercase">Fechado aos Domingos</div>;
        }

        return (
            <div className="grid grid-cols-3 gap-2">
                {slotsHorarios.map(hora => {
                    const contagem = horariosOcupados[hora] || 0;
                    const isCheio = contagem >= 3;

                    // Regra 2: Sábado até às 16h
                    const horaInt = parseInt(hora.split(':')[0]);
                    const isSabadoTarde = diaSemana === 6 && horaInt >= 16;

                    const desabilitado = isCheio || isSabadoTarde;

                    return (
                        <button
                            key={hora}
                            type="button"
                            disabled={desabilitado}
                            onClick={() => setHoraSelecionada(hora)}
                            className={`p-2 rounded-xl text-[11px] font-black transition-all border-2 flex flex-col items-center ${horaSelecionada === hora
                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                                : desabilitado
                                    ? 'bg-slate-100 border-slate-100 text-slate-300 cursor-not-allowed opacity-50'
                                    : 'bg-white border-slate-100 text-slate-600 hover:border-blue-400'
                                }`}
                        >
                            {hora}
                            {isCheio && <span className="text-[7px] text-red-500 uppercase leading-none mt-0.5">Lotado</span>}
                            {isSabadoTarde && <span className="text-[7px] text-slate-400 uppercase leading-none mt-0.5">Off</span>}
                        </button>
                    );
                })}
            </div>
        );
    };

    // Funções de carregamento (mantendo sua lógica de API)
    const carregarDados = async () => {
        try {
            setLoading(true); // Inicia o carregamento
            const [resOS, resEstoque, resEscala] = await Promise.all([
                api.get('/os/admin/listar'),
                api.get('/estoque/'),
                api.get('/os/admin/escala-mensal')
            ]);

            setTodasOS(resOS.data);
            setEstoque(resEstoque.data);

            const escalaOrdenada = Object.keys(resEscala.data).reduce((acc, dataISO) => {
                acc[dataISO] = resEscala.data[dataISO].sort((a, b) => {
                    if (a.status === 'Pendente' && b.status === 'Concluído') return -1;
                    return a.hora.localeCompare(b.hora);
                });
                return acc;
            }, {});

            setEscalaSemanal(escalaOrdenada);
        } catch (err) {
            if (err.response?.status === 401) navigate('/login');
        } finally {
            // Pequeno delay opcional de 500ms para evitar o "flash" se a rede for rápida demais
            setTimeout(() => setLoading(false), 500);
        }
    };

    useEffect(() => { carregarDados(); }, []);


    const pollingRef = useRef(null); // Ref para guardar o ID do intervalo

    useEffect(() => {
        // 1. Limpa qualquer resquício de intervalo anterior antes de começar
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }

        // 2. Só inicia se o modal estiver aberto
        if (showVerifyModal && selectedOS) {
            console.log("📡 Iniciando Polling Único para OS:", selectedOS.id);

            pollingRef.current = setInterval(async () => {
                try {
                    const res = await api.get(`/os/${selectedOS.id}/status`);

                    // Se o status mudar no banco, para tudo
                    if (res.data.status === "Concluído") {
                        clearInterval(pollingRef.current);
                        pollingRef.current = null;

                        setShowVerifyModal(false);
                        notify.success("Entrega confirmada!");
                        carregarDados(); // Atualiza sua lista
                    }
                } catch (err) {
                    // Se der erro (ex: 404), não deixa o loop infinito travar o browser
                    console.error("Erro no polling:", err);
                }
            }, 5000); // 5 segundos reduz o ruído no console sem perder a sensação de "tempo real"
        }

        // 3. Cleanup: Quando o modal fecha ou o componente morre, MATAMOS o loop
        return () => {
            if (pollingRef.current) {
                console.log("🛑 Polling finalizado.");
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
        };
    }, [showVerifyModal]); // O polling SÓ depende do modal abrir/fechar

    const handleAgendar = async () => {
        if (!dataAgendamento || !horaSelecionada || !selectedOS) {
            notify.warning("Por favor, selecione a data e o horário.");
            return;
        }

        try {
            setLoading(true);
            const dataFormatada = `${dataAgendamento} ${horaSelecionada}`;

            const res = await api.patch(`/os/admin/agendar/${selectedOS.id}`, {
                data_entrega: dataFormatada
            });

            // ✅ AQUI ESTÁ O TRUQUE:
            // Atualiza o objeto que está sendo exibido no Modal com o novo status
            setSelectedOS(prev => ({
                ...prev,
                status: "Em Manutenção", // Garanta que o texto seja IGUAL ao do isEmReparo
                data_agendada_admin: dataFormatada
            }));

            if (res.data.whatsapp_link) {
                window.open(res.data.whatsapp_link, '_blank');
            }

            notify.success("Serviço agendado e status atualizado!");
            carregarDados(); // Atualiza a lista de fundo também

        } catch (err) {
            notify.error("Erro ao agendar.");
        } finally {
            setLoading(false);
        }
    };
    const fecharEResetar = () => {
        setShowConcluirModal(false);
        setSelectedOS(null);
        setLaudo('');
        setPecasEscolhidas([]);
        setWhatsLinkPending(null);
        setValorMaoObra('');
        setCustoOperacional('');
        setDescontoAplicado('');
        carregarDados();
    };

    const fecharTudo = () => {
        setSelectedOS(null);
        setShowVerifyModal(false);
        setShowConcluirModal(false);
        setAbrirSeletorData(false);
        setInputCode(''); // Limpa o campo da senha
    };

    const prepararConclusao = async () => {
        try {
            // Usando a rota correta: /estoque/filtrar-por-modelo?modelo=NOME
            const res = await api.get(`/estoque/filtrar-por-modelo?modelo=${selectedOS.modelo}`);

            setPecasSugeridas(res.data);
            setShowConcluirModal(true);
        } catch (err) {
            console.error("Erro ao filtrar peças:", err);
        }
    };

    const [tempoRestante, setTempoRestante] = useState("");

    useEffect(() => {
        if (!selectedOS?.code_expires_at) return;

        const interval = setInterval(() => {
            const agora = new Date();
            const expiracao = new Date(selectedOS.code_expires_at);
            const diff = expiracao - agora;

            if (diff <= 0) {
                setTempoRestante("EXPIRADO");
                clearInterval(interval);
            } else {
                const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const segundos = Math.floor((diff % (1000 * 60)) / 1000);
                setTempoRestante(`${minutos}:${segundos < 10 ? '0' : ''}${segundos}`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [selectedOS]);

    const [itensSemEstoque, setItensSemEstoque] = useState([]);

    // No seu useEffect ou onde você gerencia as peças escolhidas
    useEffect(() => {
        // Filtra das sugestões quais escolhidas estão com estoque zerado
        const semStock = pecasSugeridas.filter(p =>
            pecasEscolhidas.includes(p.id) && (p.quantidade || 0) <= 0
        );
        setItensSemEstoque(semStock);
    }, [pecasEscolhidas, pecasSugeridas]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                // Se o modal de senha estiver aberto, ele fecha tudo
                if (showVerifyModal) {
                    setShowVerifyModal(false);
                    setSelectedOS(null);
                    setInputCode('');
                }
                // Se for o modal de conclusão de peças
                else if (showConcluirModal) {
                    setShowConcluirModal(false);
                }
                // Se for apenas o seletor de OS aberto
                else if (selectedOS) {
                    setSelectedOS(null);
                    setAbrirSeletorData(false);
                }
            }
        };



        // Adiciona o "ouvinte" ao carregar o componente
        window.addEventListener('keydown', handleKeyDown);

        // Limpa o "ouvinte" ao fechar o componente (importante para performance!)
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [showVerifyModal, showConcluirModal, selectedOS]); // Dependências para o React enxergar os estados atuais


    const registrarPerdaRapida = async (peca) => {
        const motivo = window.prompt(`Motivo da perda para ${peca.nome}:`, "Quebra técnica na bancada");

        if (motivo) {
            try {
                // Chamamos a rota que criamos no SQL e Python
                await api.post(`/estoque/registrar-perda/${peca.id}`, {
                    quantidade: 1, // Geralmente é a peça da mão
                    motivo: motivo
                });

                notify.success("Perda registrada e estoque atualizado!");

                // ATUALIZAÇÃO EM TEMPO REAL:
                // Recarregamos as peças sugeridas para o erro sumir da tela
                const res = await api.get(`/estoque/filtrar-por-modelo?modelo=${selectedOS.modelo}`);
                setPecasSugeridas(res.data);

            } catch (err) {
                console.error(err);
                notify.error("Erro ao processar baixa.");
            }
        }
    };

    const handleFinalizarComCodigo = async () => {
        // Validação básica de segurança
        if (!selectedOS || !selectedOS.id) {
            notify.error("Erro: ID da OS não encontrado.");
            return;
        }

        setLoading(true);
        try {
            // 1. PASSO FINANCEIRO: Envia os custos para a rota de conclusão total
            // Certifique-se que o baseURL do seu 'api.js' não tenha um '/api' sobrando
            await api.patch(`/os/admin/concluir-total/${selectedOS.id}`, {
                laudo: laudo.toUpperCase(),
                valor_mao_obra: parseFloat(valorMaoObra) || 0,
                custo_operacional: parseFloat(custoOperacional) || 0,
                desconto_aplicado: parseFloat(descontoAplicado) || 0,
                itens_ids: pecasEscolhidas // IDs das peças selecionadas no seu checklist
            });

            // 2. PASSO DE NOTIFICAÇÃO: Gera o QR e avisa o cliente
            await api.post(`/os/${selectedOS.id}/pronto`);

            notify.success("Reparo finalizado e cliente notificado!");

            // Reset de estados e fechamento
            setShowConcluirModal(false);
            setLaudo("");
            setValorMaoObra(0);
            setCustoOperacional(0);
            setDescontoAplicado(0);

            // Atualiza a lista principal
            if (typeof carregarDados === 'function') carregarDados();
            else window.location.reload();

        } catch (err) {
            console.error("Erro na finalização:", err);
            notify.error(err.response?.data?.msg || "Erro ao processar finalização técnica.");
        } finally {
            setLoading(false);
        }
    };

    const handleFinalDelivery = async (isBypass = false) => {
        // 1. Garante que o loading comece para evitar cliques múltiplos
        setLoading(true);

        const token = localStorage.getItem('token');

        try {
            // 2. Verifica se existe uma OS selecionada antes de disparar
            if (!selectedOS?.id) {
                throw new Error("Nenhuma Ordem de Serviço selecionada.");
            }

            const res = await api.post(`/os/${selectedOS.id}/finalizar`,
                {
                    // Se for bypass, enviamos null ou vazio no código, 
                    // mas garantimos que is_bypass vá como true
                    codigo_digitado: isBypass ? "" : inputCode,
                    is_bypass: isBypass
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            notify.success("Entrega validada! OS encerrada.");

            // 3. Executa o reset da interface
            if (typeof fecharHandshakeESair === 'function') {
                fecharHandshakeESair();
            }

            // 4. Recarrega os dados globais do dashboard
            carregarDados();

        } catch (err) {
            console.error("Erro na entrega:", err);
            const msgErro = err.response?.data?.msg || err.message || "Erro na validação.";

            // Correção da string template que estava com chaves simples no seu código
            notify.error(msgErro);
        } finally {
            setLoading(false);
        }
    };

    const handleConcluir = async () => {
        if (!selectedOS || !laudo) {
            notify.warning("O laudo técnico é obrigatório.");
            return;
        }

        try {
            setLoading(true);

            const element = document.getElementById('print-area-wrapper');
            if (!element) {
                throw new Error("Template de impressão não encontrado no DOM.");
            }

            const opt = {
                margin: 10,
                filename: `Cidinho_OS_${selectedOS.id}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 3, useCORS: true, letterRendering: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            const pdfBase64 = await html2pdf().set(opt).from(element).outputPdf('datauristring');

            const res = await api.patch(`/os/admin/concluir/${selectedOS.id}`, {
                laudo: laudo,
                itens_ids: pecasEscolhidas,
                pdf_anexo: pdfBase64,
                valor_mao_obra: valorMaoObra ? parseFloat(valorMaoObra) : 0,
                custo_operacional: custoOperacional ? parseFloat(custoOperacional) : 0,
                desconto_aplicado: descontoAplicado ? parseFloat(descontoAplicado) : 0
            });


            // Se o link vier, ele seta o estado que "limpa" o formulário e mostra o botão
            if (res.data.whatsapp_link) {
                setWhatsLinkPending(res.data.whatsapp_link);
            } else {
                notify.success("Sucesso!");
                fecharEResetar();
            }

        } catch (err) {
            console.error("Erro ao concluir:", err);
            notify.error("Falha técnica na conclusão. Verifique o console.");
        } finally {
            setLoading(false);
        }
    };



    const handleProntoImediato = async (os) => {
        try {
            const res = await api.post(`/os/${os.id}/pronto`, { expira_em: 30 });

            // ATENÇÃO AQUI: Atualiza o estado global e o local do modal
            await carregarDados();

            // Se o seu backend retornar a OS atualizada no res.data, use ela:
            if (res.data.os_atualizada) {
                setSelectedOS(res.data.os_atualizada);
            }

            notify.success("Status: PRONTO PARA RETIRADA.");
        } catch (err) {
            notify.error("Erro ao processar.");
        }
    };
    const handleLogOut = () => {
        sessionStorage.clear();
        navigate('/login');
    };
    if (loading && todasOS.length === 0) { // Só mostra o Full Loading na primeira carga
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center font-sans">
                <div className="relative">
                    {/* Círculo pulsante de fundo */}
                    <div className="absolute inset-0 bg-blue-600/20 rounded-full blur-3xl animate-pulse"></div>

                    <div className="relative bg-slate-800 p-8 rounded-[2.5rem] border border-white/10 shadow-2xl flex flex-col items-center">
                        <Cpu className="text-blue-500 animate-spin mb-6" size={60} strokeWidth={2.5} />

                        <div className="flex flex-col items-center leading-none">
                            <span className="text-2xl font-black text-white tracking-tighter uppercase italic">
                                Cidinho<span className="text-blue-500">.</span>
                            </span>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2">
                                Sincronizando Nodes
                            </span>
                        </div>
                    </div>
                </div>

                {/* Barra de progresso fake para estética brutalista */}
                <div className="mt-8 w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 animate-progress-loading"></div>
                </div>
            </div>
        );
    }
    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 font-sans overflow-hidden relative">

            {/* --- BOTÃO HAMBÚRGUER (Aparece apenas < LG) --- */}
            <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden fixed top-6 left-6 z-50 bg-slate-900 text-white p-3 rounded-2xl shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
            >
                <Menu size={24} strokeWidth={2.5} />
            </button>

            {/* --- BACKDROP (Escurece o fundo no mobile ao abrir) --- */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* --- SIDEBAR (Adaptada para Mobile e Desktop) --- */}
            <aside className={`
            fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white p-8 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out
            lg:relative lg:translate-x-0 
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>

                {/* LOGO AREA (Com botão fechar no mobile) */}
                <div className="flex items-center justify-between mb-12 px-2">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-900/40 rotate-3">
                            <Cpu size={28} strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-2xl font-black tracking-tighter uppercase italic">Cidinho<span className="text-blue-500">.</span></span>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Command Center</span>
                        </div>
                    </div>

                    {/* Botão fechar (Só aparece mobile) */}
                    <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-500 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                {/* NAV LINKS (Mantendo seu estilo brutalista) */}

                <nav className="space-y-3 flex-1">
                    <button className="flex items-center gap-4 w-full bg-white/10 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border border-white/5">
                        <LayoutDashboard size={20} className="text-blue-500" /> Dashboard
                    </button>
                    <button onClick={() => navigate('/admin/clientes')} className="flex items-center gap-4 w-full p-4 text-slate-400 hover:bg-white/5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
                        <Users size={20} /> Clientes
                    </button>
                    <button onClick={() => navigate('/admin/estoque')} className="flex items-center gap-4 w-full p-4 text-slate-400 hover:bg-white/5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
                        <Package size={20} /> Inventário
                    </button>
                    <button onClick={() => navigate('/admin/dashboard/financeiro')} className="flex items-center gap-4 w-full p-4 text-slate-400 hover:bg-white/5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
                        <MonitorCheckIcon size={20} /> Financeiro
                    </button>
                    <button onClick={() => navigate('/admin/recibos')} className="flex items-center gap-4 w-full p-4 text-slate-400 hover:bg-white/5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
                        <Receipt size={20} /> Recibos
                    </button>
                    <button onClick={() => navigate('/admin/concluidos')} className="flex items-center gap-4 w-full p-4 text-slate-400 hover:bg-white/5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
                        <CalendarCheck size={20} /> Histórico
                    </button>
                </nav>

                <div className="pt-8 border-t border-white/5 space-y-2">
                    <button onClick={() => navigate('/admin/configuracoes')} className="flex items-center gap-4 w-full p-4 text-slate-500 hover:text-white transition-colors font-black text-[10px] uppercase tracking-widest">
                        <Settings size={18} /> Settings
                    </button>
                    <button onClick={handleLogOut} className="flex items-center gap-4 w-full p-4 text-red-400/60 hover:text-red-400 transition-colors font-black text-[10px] uppercase tracking-widest">
                        <LogOut size={18} /> Encerrar Sessão
                    </button>
                </div>
            </aside>

            {/* --- CONTEÚDO PRINCIPAL --- */}
            <main className="flex-1 h-full overflow-y-auto bg-slate-50 dark:bg-[#020617] p-6 lg:p-12 pt-28 lg:pt-12 modern-scroll-v transition-colors duration-300">

                <header className="flex flex-col gap-6 mb-8 lg:mb-12">
                    <div>
                        {/* Títulos: text-slate-900 | Dark: text-slate-50 */}
                        <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight leading-none">
                            Visão Geral
                        </h2>
                        {/* Texto de Apoio: text-slate-400 | Dark: text-slate-500 */}
                        <p className="text-slate-400 dark:text-slate-500 text-sm font-medium mt-1">
                            Status da operação em tempo real.
                        </p>
                    </div>

                    {/* BUSCA: Inputs bg-slate-50 | Dark: bg-slate-950 */}
                    <div className="w-full lg:w-72 relative group">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                            <Search className="text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-500 transition-colors" size={18} />
                        </div>
                        <input
                            value={busca} // <-- VINCULA AO ESTADO
                            onChange={(e) => setBusca(e.target.value)} // <-- ATUALIZA O ESTADO
                            placeholder="Buscar OS ou Cliente..."
                            className="w-full bg-white dark:bg-slate-950 border-none pl-12 pr-5 py-4 rounded-2xl shadow-sm dark:shadow-none text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                        />
                        {/* Botão de limpar busca opcional */}
                        {busca && (
                            <button
                                onClick={() => setBusca('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </header>

                {/* KPI CARDS: Cards bg-white | Dark: bg-slate-900 */}
                <div className="flex lg:grid lg:grid-cols-3 gap-4 lg:gap-8 overflow-x-auto pb-4 lg:pb-0 mb-8 snap-x no-scrollbar ">

                    {/* Card Fila */}
                    <div className="min-w-[240px] flex-1 bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800/50 flex items-center justify-between snap-center transition-all">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Fila Técnica</p>
                            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-slate-50">{todasOS.length}</h3>
                        </div>
                        {/* Destaque Tech Blue */}
                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center transition-colors">
                            <ClipboardList size={24} />
                        </div>
                    </div>

                    {/* Card Estoque */}
                    <div className="min-w-[240px] flex-1 bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800/50 flex items-center justify-between snap-center transition-all">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Itens Estoque</p>
                            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-slate-50">
                                {estoque.reduce((t, i) => t + i.quantidade, 0)}
                            </h3>
                        </div>
                        {/* Sucesso/Hover Emerald */}
                        <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center transition-colors">
                            <Package size={24} />
                        </div>
                    </div>

                    {/* Card Alertas */}
                    <div className="min-w-[240px] flex-1 bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800/50 flex items-center justify-between border-l-4 border-l-amber-400 dark:border-l-amber-500 snap-center transition-all">
                        <div>
                            <p className="text-[10px] font-bold text-amber-500 dark:text-amber-500 uppercase tracking-widest mb-1">Alertas</p>
                            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-slate-50">
                                {estoque.filter(i => i.quantidade <= i.minimo).length}
                            </h3>
                        </div>
                        {/* Aviso/Urgente Amber */}
                        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 text-amber-500 dark:text-amber-500 rounded-2xl flex items-center justify-center transition-colors">
                            <AlertCircle size={24} />
                        </div>
                    </div>
                </div>

                {/* ALERTAS CRÍTICOS */}
                {(resumoAlertas.atrasadas > 0 || resumoAlertas.urgentes > 0) && (
                    <div className="space-y-3 mb-8">
                        {resumoAlertas.atrasadas > 0 && (
                            // Alerta Crítico: red-600 | Dark: red-500
                            <div className="bg-red-600 dark:bg-red-500 p-5 rounded-2xl text-white flex items-center gap-4 shadow-lg shadow-red-200 dark:shadow-none animate-pulse">
                                <ShieldAlert size={28} />
                                <div>
                                    <h4 className="font-bold text-sm leading-none">{resumoAlertas.atrasadas} OS ATRASADAS</h4>
                                    <p className="text-[10px] opacity-80 uppercase font-black mt-1">Ação Requerida no Command Center</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TABS SELECTOR: Estilo "Floating Pill" */}
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800/50 overflow-hidden mb-12 transition-all duration-300">
                    <div className="p-4 lg:p-8 flex flex-col gap-6">
                        <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
                            <div className="text-center lg:text-left">
                                {/* Títulos: text-slate-900 | Dark: text-slate-50 */}
                                <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-50 uppercase tracking-tight">
                                    {tab === 'lista' ? 'Backlog de Reparos' : 'Escala Semanal'}
                                </h3>
                                {/* Texto de Apoio: text-slate-400 | Dark: text-slate-500 */}
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                                    Nível de Operação: Estável
                                </p>
                            </div>

                            {/* Switch Moderno: Fundo bg-slate-100 | Dark: bg-slate-950 */}
                            <div className="w-full lg:w-auto bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl flex gap-1 transition-colors">
                                <button
                                    onClick={() => setTab('lista')}
                                    className={`flex-1 lg:px-8 py-3 rounded-xl font-bold text-xs transition-all ${tab === 'lista'
                                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-500 shadow-sm'
                                        : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                >
                                    LISTA
                                </button>
                                <button
                                    onClick={() => setTab('agenda')}
                                    className={`flex-1 lg:px-8 py-3 rounded-xl font-bold text-xs transition-all ${tab === 'agenda'
                                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-500 shadow-sm'
                                        : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                >
                                    AGENDA
                                </button>
                            </div>
                        </div>

                        {/* CONTROLES DE AGENDA */}
                        {tab === 'agenda' && (
                            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-2 animate-in fade-in zoom-in duration-300 border border-transparent dark:border-slate-800/30">
                                <button
                                    onClick={() => setSemanaOffset(p => p - 1)}
                                    className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-slate-600 dark:text-slate-400 hover:text-blue-500 active:scale-90 transition-all border border-transparent dark:border-slate-700/50"
                                >
                                    <ChevronLeft size={20} />
                                </button>

                                <div className="text-center">
                                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase block leading-none mb-1 tracking-widest">
                                        Período
                                    </span>
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        Semana {semanaOffset === 0 ? 'Atual' : semanaOffset > 0 ? `+${semanaOffset}` : semanaOffset}
                                    </span>
                                </div>

                                <button
                                    onClick={() => setSemanaOffset(p => p + 1)}
                                    className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-slate-600 dark:text-slate-400 hover:text-blue-500 active:scale-90 transition-all border border-transparent dark:border-slate-700/50"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* CONTEÚDO DINÂMICO BASEADO NA TAB */}
                    <div className="w-full">
                        {tab === 'lista' ? (
                            <div className="w-full animate-in fade-in duration-500">

                                {/* --- VISÃO DESKTOP: TABELA --- */}
                                <div className="hidden md:block overflow-x-auto custom-scroll-table rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 shadow-sm transition-colors duration-300 pb-4">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            {/* Header: bg-slate-50 | Dark: bg-slate-950/50 */}
                                            <tr className="text-left bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800/50">
                                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">ID / Tracking</th>
                                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Cliente / Device</th>
                                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] text-center">Cronograma</th>
                                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Estado Técnico</th>
                                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] text-right">Ação Comando</th>
                                            </tr>
                                        </thead>
                                        {/* Troque todasOS.map por ordensFiltradas.map */}
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                            {ordensFiltradas.map(os => {
                                                // LÓGICA DE STATUS EXPANDIDA
                                                let statusReal;

                                                if (os.status === 'Agendado') {
                                                    statusReal = calcularStatusInteligente(os.data_iso, os.hora);
                                                } else if (os.status === 'Pronto para Retirada') {
                                                    statusReal = {
                                                        label: 'PRONTO PARA RETIRADA',
                                                        cor: 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]',
                                                        nivel: 'ready',
                                                        border: 'border-cyan-400'
                                                    };
                                                } else if (os.status === 'Concluído') {
                                                    statusReal = {
                                                        label: 'FINALIZADO',
                                                        cor: 'bg-slate-500',
                                                        nivel: 'concluido',
                                                        border: 'border-slate-600'
                                                    };
                                                } else {
                                                    statusReal = {
                                                        label: os.status,
                                                        cor: 'bg-blue-500',
                                                        nivel: 'normal',
                                                        border: 'border-blue-600'
                                                    };
                                                }

                                                return (
                                                    <tr key={os.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-all group">
                                                        {/* ID / Tracking */}
                                                        <td className="px-8 py-6">
                                                            <div className="flex flex-col">
                                                                <span className="font-mono text-[11px] font-black text-slate-900 dark:text-slate-300 bg-slate-100 dark:bg-slate-950 px-2 py-1 rounded-lg w-fit border border-transparent dark:border-slate-800">
                                                                    #{os.id}
                                                                </span>
                                                                {statusReal.nivel === 'critico' && (
                                                                    <span className="text-[8px] font-black text-red-600 dark:text-red-500 uppercase mt-1 animate-pulse italic">Atraso Crítico</span>
                                                                )}
                                                                {statusReal.nivel === 'ready' && (
                                                                    <span className="text-[8px] font-black text-cyan-600 dark:text-cyan-400 uppercase mt-1 italic">Aguardando Cliente</span>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Cliente / Device */}
                                                        <td className="px-8 py-6">
                                                            <p className="font-black text-slate-800 dark:text-slate-100 text-lg leading-none mb-1.5 uppercase tracking-tighter italic group-hover:text-blue-600 dark:group-hover:text-blue-500 transition-colors">
                                                                {os.cliente}
                                                            </p>
                                                            <div className="flex items-center gap-2">
                                                                <span className="p-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md">
                                                                    <Smartphone size={10} />
                                                                </span>
                                                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{os.modelo}</span>
                                                            </div>
                                                        </td>

                                                        {/* Cronograma (Onde mostramos a data de retirada agendada) */}
                                                        <td className="px-8 py-6 text-center">
                                                            <div className={`inline-flex flex-col items-center px-5 py-3 rounded-[2rem] border transition-all ${(os.status === 'Agendado' || os.status === 'Pronto para Retirada')
                                                                ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 shadow-sm'
                                                                : 'bg-slate-50 dark:bg-slate-950/50 border-transparent dark:border-slate-800'
                                                                }`}>
                                                                <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase leading-none mb-2 flex items-center gap-1 italic tracking-widest">
                                                                    <CalendarCheck size={12} /> {os.status === 'Pronto para Retirada' ? 'RETIRADA' : 'DEADLINE'}
                                                                </span>
                                                                <div className="flex flex-col items-center">
                                                                    <span className="text-sm font-black text-slate-800 dark:text-slate-200 tracking-tighter">
                                                                        {os.data_entrega_formatada || 'Definir'}
                                                                    </span>
                                                                    <div className={`flex items-center gap-1 mt-1 px-3 py-0.5 rounded-full shadow-lg ${statusReal.nivel === 'ready' ? 'bg-cyan-500 shadow-cyan-200' : 'bg-blue-600 shadow-blue-200'
                                                                        } text-white`}>
                                                                        <Clock size={10} strokeWidth={3} />
                                                                        <span className="text-[10px] font-black tracking-tighter italic">{os.hora || '--:--'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Estado Técnico (Status) */}
                                                        <td className="px-8 py-6">
                                                            <div className="flex flex-col items-start gap-2">
                                                                <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${os.status === 'Concluído'
                                                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                                                                    : `${statusReal.cor} text-white border-transparent`
                                                                    }`}>
                                                                    {statusReal.label}
                                                                </span>
                                                                {(os.status === 'Agendado' || os.status === 'Pronto para Retirada') && (
                                                                    <div className="flex items-center gap-1 text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase italic ml-1">
                                                                        <div className={`w-1.5 h-1.5 rounded-full ${statusReal.cor} animate-ping`}></div>
                                                                        Signal_Active
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Ação Comando */}
                                                        <td className="px-8 py-6 text-right">
                                                            <div className="flex flex-col items-end gap-2">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation(); // Evita borbulhamento de eventos
                                                                        setSelectedOS(os);

                                                                        if (statusReal.nivel === 'ready') {
                                                                            // Se estiver pronto, abre SÓ o de senha
                                                                            setShowVerifyModal(true);
                                                                            setAbrirSeletorData(false); // Garante que o calendário suma
                                                                        } else {
                                                                            // Se não, abre o fluxo normal de gestão
                                                                            setShowVerifyModal(false);
                                                                        }
                                                                    }}
                                                                    className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 flex items-center gap-3 ml-auto ${statusReal.nivel === 'critico'
                                                                        ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-900/20'
                                                                        : statusReal.nivel === 'ready'
                                                                            ? 'bg-cyan-600 text-white hover:bg-cyan-500 shadow-cyan-900/30 animate-pulse-slow'
                                                                            : 'bg-slate-900 dark:bg-slate-950 text-white hover:bg-blue-600 border border-transparent dark:border-slate-800'
                                                                        }`}
                                                                >
                                                                    {/* O texto já muda dinamicamente conforme sua lógica */}
                                                                    {statusReal.nivel === 'ready' ? (
                                                                        <>
                                                                            <ShieldCheck size={16} className="animate-bounce" /> ENTREGAR AGORA
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            GERENCIAR <ChevronRight size={16} />
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>

                                    </table>
                                </div>
                                {/* Troque todasOS.map por ordensFiltradas.map */}
                                <div className="grid grid-cols-1 gap-6 md:hidden px-4 pb-20">
                                    {ordensFiltradas.map(os => {
                                        const statusReal = os.status === 'Agendado'
                                            ? calcularStatusInteligente(os.data_iso, os.hora)
                                            : { label: os.status, cor: 'bg-emerald-500', nivel: 'concluido' };

                                        return (
                                            <div key={os.id} className={`
                bg-white dark:bg-slate-900 rounded-[2.5rem] border-4 p-6 shadow-xl active:scale-[0.98] transition-all 
                ${statusReal.nivel === 'critico'
                                                    ? 'border-red-600 dark:border-red-500 shadow-red-900/10'
                                                    : 'border-slate-900 dark:border-slate-800'}
            `}>

                                                {/* Header: ID e Status */}
                                                <div className="flex justify-between items-start mb-4">
                                                    <span className="font-mono text-[10px] font-black bg-slate-900 dark:bg-slate-950 text-white dark:text-slate-200 px-3 py-1 rounded-lg border border-transparent dark:border-slate-800">
                                                        #{os.id}
                                                    </span>
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${os.status === 'Concluído'
                                                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                                        : `${statusReal.cor} text-white`
                                                        }`}>
                                                        {statusReal.label}
                                                    </span>
                                                </div>

                                                {/* Corpo: Cliente e Aparelho */}
                                                <div className="mb-6">
                                                    <h4 className="text-2xl font-black text-slate-900 dark:text-slate-50 uppercase italic tracking-tighter leading-none mb-1">
                                                        {os.cliente}
                                                    </h4>
                                                    <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                                                        <Smartphone size={14} strokeWidth={3} />
                                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{os.modelo}</span>
                                                    </div>
                                                </div>

                                                {/* Footer: Cronograma e Botão */}
                                                <div className="flex items-center justify-between pt-4 border-t-2 border-slate-50 dark:border-slate-800/50">
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1">Entrega / Deadline</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                                                                {os.data_entrega_formatada || os.data_prometida_cliente}
                                                            </span>
                                                            <span className="bg-blue-600 dark:bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-md font-black italic shadow-lg shadow-blue-900/20">
                                                                {os.hora}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => setSelectedOS(os)}
                                                        className="bg-slate-900 dark:bg-slate-950 text-white p-4 rounded-2xl shadow-lg active:bg-blue-600 dark:active:bg-blue-500 border border-transparent dark:border-slate-800 transition-colors"
                                                    >
                                                        <ChevronRight size={20} />
                                                    </button>

                                                </div>

                                            </div>
                                        );
                                    })}
                                </div>
                                {ordensFiltradas.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                        <Search size={48} className="text-slate-300 mb-4" />
                                        <p className="text-slate-400 font-black uppercase tracking-widest italic">Nenhum registro encontrado</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* --- CONTAINER DA ESCALA COM SNAP SCROLL --- */
                            <div className="flex gap-6 overflow-x-auto pb-8 pt-4 px-2 snap-x snap-mandatory modern-scroll-h">
                                {diasDoMes.map((dia) => (
                                    <div
                                        key={dia.dataISO}
                                        className={`flex-none w-[300px] md:w-[350px] snap-center flex flex-col gap-4 transition-all duration-500 ${dia.eHoje ? 'opacity-100 scale-100' : 'opacity-80 hover:opacity-100 scale-[0.98]'
                                            }`}
                                    >
                                        {/* HEADER DO DIA: Brutalista e Informativo */}
                                        <div className={`p-5 rounded-[2rem] border-4 flex items-center justify-between transition-all ${dia.eHoje
                                                ? 'bg-blue-600 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]'
                                                : 'bg-white dark:bg-slate-900 border-slate-800 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]'
                                            }`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl border-2 border-slate-900 flex flex-col items-center justify-center font-black ${dia.eHoje ? 'bg-white text-blue-600' : 'bg-slate-900 text-white'
                                                    }`}>
                                                    <span className="text-[9px] uppercase leading-none opacity-70">{dia.mesNome}</span>
                                                    <span className="text-lg leading-none">{dia.diaNumero}</span>
                                                </div>
                                                <div>
                                                    <h4 className={`font-black uppercase italic text-sm tracking-tighter ${dia.eHoje ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                                                        {dia.nome} {dia.eHoje && "• HOJE"}
                                                    </h4>
                                                    <p className={`text-[9px] font-bold uppercase opacity-60 ${dia.eHoje ? 'text-white' : ''}`}>
                                                        {escalaSemanal[dia.dataISO]?.length || 0} Reparos
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* LISTA DE CARDS: Espaço vertical fixo com scroll interno se necessário */}
                                        <div className={`flex flex-col gap-4 p-3 rounded-[2.5rem] min-h-[500px] border-2 border-transparent transition-colors ${dia.eHoje ? 'bg-blue-50/20 dark:bg-blue-900/10 border-blue-500/20' : 'bg-slate-50/50 dark:bg-slate-900/30 modern-scroll-v h'
                                            }`}>
                                            {escalaSemanal[dia.dataISO]?.length > 0 ? (
                                                escalaSemanal[dia.dataISO].map((job) => {
                                                    const statusTempo = job.status !== 'Concluído'
                                                        ? calcularStatusInteligente(dia.dataISO, job.hora)
                                                        : { nivel: 'concluido', label: 'Finalizado', cor: 'bg-emerald-500' };

                                                    return (
                                                        <div
                                                            key={job.id}
                                                            onClick={() => setSelectedOS(job)}
                                                            className="group bg-white dark:bg-slate-900 p-5 rounded-[2rem] border-2 border-slate-900 dark:border-slate-800 transition-all hover:-translate-y-1 active:scale-95 cursor-pointer relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
                                                        >
                                                            {/* Indicador de Prioridade */}
                                                            <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${statusTempo.cor}`}></div>

                                                            <div className="flex justify-between items-start mb-3">
                                                                <div className="flex items-center gap-2 px-2 py-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                                                                    <Clock size={10} className={statusTempo.nivel === 'critico' ? 'text-red-500 animate-pulse' : 'text-slate-400'} />
                                                                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{job.hora}</span>
                                                                </div>
                                                                <span className="text-[9px] font-black text-slate-400 font-mono">#{job.id}</span>
                                                            </div>

                                                            <h5 className="text-md font-black text-slate-900 dark:text-slate-50 uppercase tracking-tighter leading-none mb-1 group-hover:text-blue-600 transition-colors">
                                                                {job.modelo}
                                                            </h5>
                                                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase truncate italic">
                                                                {job.cliente}
                                                            </p>

                                                            {/* Badge de Status no Card */}
                                                            <div className="mt-3 flex justify-end">
                                                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-md text-white uppercase ${statusTempo.cor}`}>
                                                                    {statusTempo.label}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 opacity-30 italic">
                                                    <Calendar size={40} strokeWidth={1} className="mb-2" />
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">Sem Agenda</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {selectedOS && !showConcluirModal && !showVerifyModal && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-0 md:p-6 z-[100] animate-in fade-in zoom-in duration-300">

                    {/* Container Principal: bg-white | Dark: bg-slate-900 */}
                    <div className="bg-white dark:bg-slate-900 md:rounded-[4rem] w-full h-full md:h-auto max-w-4xl flex flex-col md:flex-row overflow-y-auto md:overflow-hidden shadow-3xl border border-transparent dark:border-slate-800">

                        {/* 1. Lateral Informativa (Sempre escura conforme seu padrão Sidebar) */}
                        <div className="w-full md:w-1/3 bg-slate-950 p-8 md:p-12 flex flex-col justify-between relative overflow-hidden text-white shrink-0">
                            <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px]"></div>

                            <div className="relative z-10 flex justify-between items-start md:block">
                                <div>
                                    {/* Destaque Tech: blue-500 */}
                                    <Cpu size={40} className="mb-4 md:mb-8 text-blue-500" />
                                    <h3 className="text-3xl font-black tracking-tighter uppercase leading-none mb-2 italic">OS #{selectedOS.id}</h3>
                                    <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em]">Status: {selectedOS.status}</p>
                                </div>
                                <button onClick={() => setSelectedOS(null)} className="md:hidden text-slate-500 hover:text-white p-2 transition-colors">
                                    <X size={32} />
                                </button>
                            </div>

                            <div className="relative z-10 mt-8 md:mt-0">
                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Relato Cliente</p>
                                <p className="text-sm font-medium italic text-slate-300 leading-relaxed max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                                    "{selectedOS.problema || 'Nenhuma descrição.'}"
                                </p>
                            </div>
                        </div>

                        {/* 2. Área de Ação (Conteúdo principal) */}
                        <div className="w-full md:w-2/3 p-8 md:p-16 relative bg-white dark:bg-slate-900 transition-colors duration-300">
                            {/* Botão fechar desktop */}
                            <button onClick={() => setSelectedOS(null)} className="hidden md:block absolute top-10 right-10 text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 transition-colors">
                                <X size={32} />
                            </button>

                            {/* Título: text-slate-800 | Dark: text-slate-50 */}
                            <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-50 tracking-tighter mb-8 md:mb-10 uppercase italic">
                                Gestão Técnica
                            </h2>

                            <div className="space-y-8 md:space-y-10 pb-10 md:pb-0">
                                {/* Bloco de Agendamento: Design de Slots Técnicos */}
                                <div className="space-y-6 bg-slate-50 dark:bg-slate-950 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 dark:border-slate-800/50 transition-colors animate-in fade-in duration-500">

                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <Calendar size={16} /> Agendamento de Saída
                                        </h4>
                                        <div className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                                            <span className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase">Status: Operacional</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                                        {/* OPÇÃO 1: PRONTO IMEDIATO */}
                                        <button
                                            onClick={prepararConclusao}
                                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-black uppercase italic text-xs transition-all"
                                        >
                                            <CheckCircle2 size={16} /> PRONTO / FATURAR
                                        </button>

                                        {/* OPÇÃO 2: AGENDAR (Abre o seletor que você já tinha) */}
                                        <button
                                            onClick={() => {
                                                setShowConcluirModal(false); // Fecha este modal
                                                // Aqui você pode disparar um estado que abre apenas o seletor de data
                                                setAbrirSeletorData(true);
                                            }}
                                            className="flex flex-col items-center justify-center p-6 bg-slate-900 dark:bg-slate-800 text-white rounded-3xl border border-white/5 hover:border-blue-500 transition-all group"
                                        >
                                            <Calendar size={24} className="mb-2 group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Agendar Retirada</span>
                                            <span className="text-[8px] opacity-70 mt-1 uppercase">Define data na agenda</span>
                                        </button>
                                    </div>

                                    {abrirSeletorData && (
                                        <div className="space-y-6 bg-slate-50 dark:bg-slate-950 p-6 md:p-8 rounded-[2rem] border border-blue-500/30 animate-in slide-in-from-top duration-500">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-[10px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                                    <Calendar size={16} /> Definir Cronograma de Saída
                                                </h4>
                                                <button
                                                    onClick={() => setAbrirSeletorData(false)}
                                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>

                                            {/* MINI CALENDÁRIO DESLIZANTE (Agora com Drag Humano) */}
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1 tracking-widest">
                                                    1. Selecionar Data
                                                </label>
                                                <div
                                                    ref={scrollRef}
                                                    onMouseDown={handleMouseDown}
                                                    onMouseLeave={handleMouseLeave}
                                                    onMouseUp={handleMouseUp}
                                                    onMouseMove={handleMouseMove}
                                                    className="flex gap-2 overflow-x-auto no-scrollbar pb-4 snap-x select-none scroll-smooth cursor-grab active:cursor-grabbing"
                                                >
                                                    {Array.from({ length: 14 }).map((_, i) => {
                                                        const date = new Date();
                                                        date.setDate(date.getDate() + i);
                                                        const diaSemana = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
                                                        const diaMes = date.getDate();
                                                        const isDomingo = date.getDay() === 0;
                                                        const isSelected = dataAgendamento === date.toISOString().split('T')[0];

                                                        if (isDomingo) return null;

                                                        return (
                                                            <button
                                                                key={i}
                                                                type="button"
                                                                onClick={() => !isDragging && setDataAgendamento(date.toISOString().split('T')[0])}
                                                                className={`
        flex flex-col items-center min-w-[70px] py-4 rounded-2xl border-2 
        transition-all duration-300 snap-center pointer-events-auto select-none
        relative group/date
        ${isSelected
                                                                        ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-105 z-10'
                                                                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-blue-500/50 hover:scale-102 hover:shadow-lg'
                                                                    }
    `}
                                                            >
                                                                {/* Efeito de Brilho Interno no Hover (Apenas se não selecionado) */}
                                                                {!isSelected && (
                                                                    <div className="absolute inset-0 rounded-2xl bg-blue-500/0 group-hover/date:bg-blue-500/5 transition-colors duration-300" />
                                                                )}

                                                                <span className={`
        text-[8px] font-black uppercase mb-1 tracking-widest transition-colors
        ${isSelected ? 'text-blue-100' : 'text-slate-500 group-hover/date:text-blue-400'}
    `}>
                                                                    {diaSemana}
                                                                </span>

                                                                <span className="text-xl font-black tracking-tighter italic leading-none">
                                                                    {diaMes}
                                                                </span>

                                                                {/* Indicador de "Hoje" (Opcional: Um pontinho ciano se for a data atual) */}
                                                                {date.toDateString() === new Date().toDateString() && !isSelected && (
                                                                    <div className="absolute bottom-1 w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            {/* SLOTS DE HORA (Grid Compacto para Admin) */}
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1 tracking-widest">2. Definir Horário de Retirada</label>
                                                <div className="grid grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar p-1">
                                                    {Array.from({ length: 11 }).map((_, i) => {
                                                        const hora = i + 9;
                                                        const isSabado = new Date(dataAgendamento + 'T00:00:00').getDay() === 0; // Verifica se é sábado
                                                        const isFinalDia = isSabado ? hora > 16 : hora > 19;
                                                        const slotValue = `${hora}:00`;
                                                        const isSelectedHora = horaSelecionada === slotValue; // Supondo que você tenha esse state

                                                        if (isFinalDia) return null;

                                                        return (
                                                            <button
                                                                key={hora}
                                                                type="button"
                                                                onClick={() => setHoraSelecionada(slotValue)}
                                                                className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${isSelectedHora
                                                                    ? 'bg-slate-900 border-slate-900 dark:bg-blue-500 dark:border-blue-400 text-white'
                                                                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-blue-500'
                                                                    }`}
                                                            >
                                                                {slotValue}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            {/* OPÇÃO 2: AGENDAR (Abre o seletor que você já tinha) */}
                                            <button
                                                onClick={handleAgendar}
                                                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em]"
                                            >
                                                Confirmar e Agendar
                                            </button>
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>
                    </div>

                </div>

            )}
            {/* --- TEMPLATE OCULTO COMPATÍVEL COM PDF --- */}
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                <div
                    id="print-area-wrapper"
                    style={{
                        width: '700px',
                        padding: '40px',
                        backgroundColor: '#ffffff',
                        color: '#1e293b', // Slate 800 em HEX
                        fontFamily: 'sans-serif'
                    }}
                >
                    {selectedOS && (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '4px solid #0f172a', paddingBottom: '20px', marginBottom: '30px' }}>
                                <div>
                                    <h3 style={{ fontSize: '24px', fontWeight: '900', margin: 0, textTransform: 'uppercase', fontStyle: 'italic' }}>
                                        Cidinho <span style={{ color: '#2563eb' }}>.</span>
                                    </h3>
                                    <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px' }}>
                                        Relatório Técnico de Saída
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ margin: 0, fontWeight: '900', fontSize: '18px' }}>OS #{selectedOS.id}</p>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>{new Date().toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div style={{ marginBottom: '30px' }}>
                                <p style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '5px' }}>Identificação</p>
                                <p style={{ fontSize: '20px', fontWeight: '900', margin: 0, textTransform: 'uppercase' }}>{selectedOS.cliente}</p>
                                <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#2563eb', margin: 0 }}>{selectedOS.modelo}</p>
                            </div>

                            <div style={{ backgroundColor: '#f8fafc', padding: '25px', borderRadius: '20px', border: '1px solid #e2e8f0', marginBottom: '30px' }}>
                                <p style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px' }}>Laudo de Solução</p>
                                <p style={{ fontSize: '14px', fontWeight: 'bold', fontStyle: 'italic', margin: 0, color: '#334155' }}>
                                    "{laudo || "Reparo realizado com sucesso."}"
                                </p>
                            </div>

                            {/* Tabela de Peças Simples (Opcional) */}
                            {pecasEscolhidas.length > 0 && (
                                <div style={{ marginBottom: '30px' }}>
                                    <p style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px' }}>
                                        Componentes Aplicados
                                    </p>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                                                <th style={{ padding: '8px 0', fontSize: '12px' }}>Item</th>
                                                <th style={{ padding: '8px 0', fontSize: '12px', textAlign: 'right' }}>Qtd</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td style={{ padding: '8px 0', fontSize: '12px', color: '#64748b' }}>
                                                    Insumos de inventário vinculados à OS
                                                </td>
                                                <td style={{ padding: '8px 0', fontSize: '12px', textAlign: 'right', fontWeight: 'bold' }}>
                                                    {pecasEscolhidas.length}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'space-between' }}>
                                <div style={{ borderTop: '2px solid #0f172a', width: '200px', textAlign: 'center', paddingTop: '10px' }}>
                                    <p style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }}>Técnico Responsável</p>
                                </div>
                                <div style={{ borderTop: '2px solid #0f172a', width: '200px', textAlign: 'center', paddingTop: '10px' }}>
                                    <p style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }}>Assinatura Cliente</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {showVerifyModal && (
                <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">

                    <div className="bg-slate-900 border border-cyan-500/30 p-8 md:p-12 rounded-[3rem] max-w-sm w-full text-center relative shadow-2xl shadow-cyan-900/20">

                        {/* 1. BOTÃO FECHAR (X) - CANTO SUPERIOR DIREITO */}
                        <button
                            onClick={fecharHandshakeESair}
                            className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors p-2 z-[210]"
                        >
                            <X size={24} />
                        </button>

                        {/* Ícone de Segurança com Pulso Ciano */}
                        <div className="relative mb-8">
                            <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full scale-150 animate-pulse" />
                            <ShieldCheck size={56} className="text-cyan-500 mx-auto relative z-10" />
                        </div>

                        <h3 className="text-white font-black uppercase tracking-tighter text-2xl mb-2 italic leading-none">
                            Protocolo de Saída
                        </h3>
                        <p className="text-slate-500 text-[9px] uppercase tracking-[0.3em] mb-10 font-mono">
                            Handshake_Security_Check
                        </p>

                        {/* Campo de Senha */}
                        <div className="space-y-4 mb-8">
                            <label className="text-[9px] font-black text-cyan-500/50 uppercase tracking-widest block">Código do Cliente</label>
                            <input
                                type="text"
                                maxLength="4"
                                value={inputCode}
                                onChange={(e) => setInputCode(e.target.value)}
                                className="w-full bg-black border-b-2 border-slate-800 rounded-2xl py-5 text-center text-4xl font-black text-cyan-400 tracking-[0.5em] focus:border-cyan-500 outline-none transition-all placeholder:text-slate-800"
                                placeholder="----"
                                autoFocus
                            />
                        </div>
                        {/* O QR CODE DINÂMICO */}
                        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">

                            {/* Só renderiza o QR se o selectedOS existir para evitar o crash */}
                            {selectedOS && (
                                <div className="flex flex-col items-center p-6 bg-white rounded-3xl">
                                    {/* 1. Criamos a const APENAS se selectedOS existir */}
                                    {(() => {
                                        const qrData = JSON.stringify({
                                            os_id: selectedOS.id,
                                            token: selectedOS.verification_code
                                        });

                                        return (
                                            <QRCodeSVG
                                                value={qrData}
                                                size={200}
                                                level="H" // Alta tolerância a erros
                                                includeMargin={true}
                                            />
                                        );
                                    })()}

                                    <p className="mt-4 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                                        Escaneie para confirmar entrega
                                    </p>
                                </div>
                            )}

                            {/* EXIBIÇÃO DO CÓDIGO E TIMER */}
                            <div className="text-center space-y-2 mb-8">
                                <div className="flex items-center justify-center gap-2 text-cyan-500/40">
                                    <Clock size={14} className={tempoRestante === "EXPIRADO" ? "text-red-500" : "animate-pulse"} />
                                    <span className={`text-sm font-black font-mono ${tempoRestante === "EXPIRADO" ? "text-red-500" : ""}`}>
                                        {tempoRestante}
                                    </span>
                                </div>
                            </div>
                        </div>
                        {console.log("Dados da OS no Modal:", selectedOS)}

                        <div className="flex flex-col gap-4">
                            {/* Botão de Confirmação Principal */}
                            <button
                                onClick={() => handleFinalDelivery(false)}
                                className="w-full bg-cyan-600 py-5 rounded-2xl text-white font-black uppercase tracking-[0.2em] text-[11px] hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-900/40 active:scale-95"
                            >
                                AUTORIZAR ENTREGA
                            </button>

                            {/* Botão de Bypass Discreto */}
                            <button
                                onClick={() => {
                                    if (window.confirm("Liberar sem código? Requer registro de assinatura manual.")) handleFinalDelivery(true);
                                }}
                                className="py-2 text-[8px] text-slate-600 uppercase font-black tracking-widest hover:text-red-500 transition-colors border border-transparent hover:border-red-500/20 rounded-xl"
                            >
                                Bypass_Admin_Override
                            </button>
                        </div>

                        {/* Texto de Rodapé Informativo */}
                        <p className="mt-8 text-[7px] font-mono text-slate-700 uppercase tracking-widest">
                            Ollie_OS // Security_Module_v2.1
                        </p>
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-20 hover:opacity-50 transition-opacity">

                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter italic">Pressione <kbd className="px-1.5 py-0.5 rounded border border-slate-500 font-mono text-[8px] text-slate-400 uppercase">Esc</kbd> para abortar</span>
                        </div>
                    </div>
                </div>
            )}

            {/* O Modal de Conclusão Inteligente */}
            {showConcluirModal && (
                <div className="fixed inset-0 bg-slate-900/90 dark:bg-[#020617]/95 backdrop-blur-2xl flex items-end md:items-center justify-center p-0 md:p-6 z-[60] animate-in zoom-in duration-300 transition-colors">

                    {/* Container: Full height no mobile, Centralizado no Desktop */}
                    <div className="bg-white dark:bg-slate-900 rounded-t-[3rem] md:rounded-[4rem] max-w-2xl w-full h-[95vh] md:h-auto p-8 md:p-16 shadow-3xl overflow-y-auto custom-scrollbar border border-transparent dark:border-slate-800 transition-all">

                        {/* --- TELA 02: SUCESSO & WHATSAPP --- */}
                        {whatsLinkPending ? (
                            <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 py-10">
                                <div className="w-20 h-20 md:w-24 md:h-24 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-100 dark:shadow-none rotate-3">
                                    <CheckCircle2 size={48} strokeWidth={2.5} />
                                </div>

                                <div>
                                    <h3 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-slate-50 tracking-tighter uppercase italic leading-none mb-4">
                                        Relatório <span className="text-emerald-600 dark:text-emerald-500">Pronto!</span>
                                    </h3>
                                    <p className="text-slate-400 dark:text-slate-500 font-bold text-xs md:text-sm uppercase tracking-widest leading-relaxed">
                                        O PDF foi anexado ao e-mail do cliente. <br className="hidden md:block" />
                                        Deseja enviar a notificação via WhatsApp agora?
                                    </p>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <button
                                        onClick={() => {
                                            window.open(whatsLinkPending, '_blank');
                                            fecharEResetar();
                                        }}
                                        className="w-full bg-emerald-600 dark:bg-emerald-600 text-white py-6 md:py-8 rounded-[2rem] md:rounded-[2.5rem] font-black text-xl md:text-2xl hover:bg-slate-900 dark:hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-200 dark:shadow-none flex items-center justify-center gap-4 group active:scale-[0.98] uppercase italic tracking-tighter"
                                    >
                                        <Smartphone size={32} strokeWidth={2.5} className="group-hover:animate-bounce" />
                                        Enviar p/ WhatsApp
                                    </button>

                                    <button
                                        onClick={fecharEResetar}
                                        className="text-slate-400 dark:text-slate-600 font-black uppercase text-[10px] tracking-[0.4em] hover:text-slate-800 dark:hover:text-slate-300 transition-colors py-4"
                                    >
                                        Finalizar sem enviar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /*/* --- TELA 01: FORMULÁRIO TÉCNICO (CHECK-OUT INTELIGENTE) --- */
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 md:mb-10">
                                    <div>
                                        <h3 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-slate-50 tracking-tighter uppercase italic leading-none">
                                            Check-out <span className="text-blue-600 dark:text-blue-500">Técnico</span>
                                        </h3>
                                        <p className="text-slate-400 dark:text-slate-500 font-bold text-xs md:text-sm mt-2 italic">
                                            Finalizando hardware: <span className="text-slate-900 dark:text-slate-300 font-black underline decoration-blue-500/50">{selectedOS.modelo}</span>
                                        </p>
                                    </div>

                                    {/* Resumo Dinâmico de Peças */}
                                    <div className="bg-blue-600 dark:bg-blue-600 px-6 py-3 rounded-2xl md:rounded-3xl text-white shadow-xl shadow-blue-500/20 self-start md:self-auto transition-all">
                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-70">Total em Componentes</p>
                                        <p className="text-xl font-black italic tracking-tighter">
                                            R$ {pecasSugeridas
                                                .filter(p => pecasEscolhidas.includes(p.id))
                                                .reduce((acc, p) => acc + (p.preco_venda || 0), 0)
                                                .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>

                                {/* SELEÇÃO DE INVENTÁRIO COM MÉTRICAS */}
                                <div className="mb-8">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-4 block flex items-center gap-2">
                                        <Package size={14} className="text-blue-500" /> Seleção de Componentes do Inventário
                                    </label>

                                    <div className="space-y-3">
                                        {pecasSugeridas.map(peca => {
                                            const isSelected = pecasEscolhidas.includes(peca.id);
                                            const temEstoque = (peca.quantidade || 0) > 0;
                                            const precoDisplay = (peca.preco_venda || 0).toLocaleString('pt-BR', {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2
                                            });

                                            return (
                                                <div key={peca.id} className="group/container relative">
                                                    <button
                                                        type="button"
                                                        onClick={() => isSelected
                                                            ? setPecasEscolhidas(pecasEscolhidas.filter(id => id !== peca.id))
                                                            : setPecasEscolhidas([...pecasEscolhidas, peca.id])}
                                                        className={`w-full flex justify-between items-center p-5 md:p-6 rounded-[2rem] border-2 transition-all duration-300 ${isSelected
                                                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-600/10 shadow-lg'
                                                            : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                                            } ${!temEstoque && !isSelected ? 'opacity-50' : ''}`}
                                                    >
                                                        {/* LADO ESQUERDO: INFO PRINCIPAL */}
                                                        <div className="flex items-center gap-4">
                                                            {/* BOTÃO DE PERDA INTEGRADO (Ação Secundária) */}
                                                            <div
                                                                onClick={(e) => {
                                                                    e.stopPropagation(); // Crucial para não selecionar a peça
                                                                    registrarPerdaRapida(peca);
                                                                }}
                                                                className="p-3 bg-red-500/10 hover:bg-red-600 text-red-600 hover:text-white rounded-2xl transition-all active:scale-90 border border-red-500/20 group-hover/container:border-red-500/50"
                                                            >
                                                                <AlertTriangle size={16} strokeWidth={3} />
                                                            </div>

                                                            <div className="text-left">
                                                                <p className="font-black text-xs md:text-sm uppercase tracking-tighter leading-none dark:text-slate-100">
                                                                    {peca.nome}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-2">
                                                                    <span className={`text-[7px] md:text-[8px] font-black px-2 py-0.5 rounded-md uppercase ${!temEstoque
                                                                        ? 'bg-red-600 text-white'
                                                                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                                                                        }`}>
                                                                        STK: {peca.quantidade}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* LADO DIREITO: VALOR E STATUS */}
                                                        <div className="flex items-center gap-4">
                                                            <div className="text-right">
                                                                <p className="font-black text-sm md:text-lg italic tracking-tighter text-slate-900 dark:text-slate-100">
                                                                    R$ {precoDisplay}
                                                                </p>
                                                                <p className="text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">VLR_UNIT</p>
                                                            </div>

                                                            {/* INDICADOR DE SELEÇÃO MINIMALISTA */}
                                                            <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all ${isSelected
                                                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-900/30'
                                                                : 'border-slate-200 dark:border-slate-700 text-transparent'
                                                                }`}>
                                                                <CheckCircle2 size={14} strokeWidth={4} />
                                                            </div>
                                                        </div>
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* ÁREA TÉCNICA FINAL */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">

                                    {/* COLUNA ESQUERDA: LAUDO TÉCNICO */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between px-2">
                                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                <FileText size={14} className="text-blue-500" /> Laudo Final de Reparo
                                            </label>

                                            <button
                                                type="button"
                                                onClick={gerarLaudoAutomatico}
                                                className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500 text-blue-600 hover:text-white px-3 py-1.5 rounded-full border border-blue-500/20 transition-all text-[9px] font-black uppercase tracking-tighter group active:scale-95"
                                            >
                                                <Sparkles size={12} className="group-hover:animate-spin" /> IA_AUTO_FILL
                                            </button>
                                        </div>

                                        <div className="relative group">
                                            <textarea
                                                required
                                                className="w-full p-6 bg-slate-50 dark:bg-slate-950 border-2 border-transparent dark:border-slate-800 focus:border-blue-500 rounded-[2rem] font-black text-slate-700 dark:text-slate-200 italic outline-none transition-all text-xs md:text-sm shadow-inner min-h-[220px] resize-none uppercase leading-relaxed"
                                                placeholder="DESCREVA OS PROCEDIMENTOS REALIZADOS..."
                                                value={laudo}
                                                onChange={(e) => setLaudo(e.target.value.toUpperCase())}
                                            />

                                            {/* Contador de Chars */}
                                            <div className="absolute right-6 bottom-6 flex items-center gap-2 opacity-30 group-focus-within:opacity-100 transition-opacity">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Chars: {laudo.length}</span>
                                                <div className={`w-1.5 h-1.5 rounded-full ${laudo.length > 20 ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* COLUNA DIREITA: STATUS DE INVENTÁRIO / ALERTAS */}
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 px-2">
                                            <Zap size={14} className="text-amber-500" /> Verificação de Saída de Peças
                                        </label>

                                        {itensSemEstoque.length > 0 ? (
                                            /* ALERTA CRÍTICO DE ESTOQUE */
                                            <div className="bg-red-500/10 border-2 border-red-500/50 p-6 rounded-[2.5rem] animate-in zoom-in duration-300 relative overflow-hidden h-full">
                                                <div className="absolute top-0 right-0 p-4 opacity-10 text-red-500">
                                                    <AlertTriangle size={60} />
                                                </div>

                                                <h4 className="text-red-600 dark:text-red-500 font-black uppercase italic tracking-tighter text-lg leading-none mb-2">
                                                    Falha de Inventário
                                                </h4>
                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-6">
                                                    O sistema bloqueou a finalização devido a itens sem saldo físico:
                                                </p>

                                                <div className="space-y-3">
                                                    {itensSemEstoque.map(p => (
                                                        <div key={p.id} className="flex justify-between items-center bg-white dark:bg-slate-950 p-4 rounded-2xl border border-red-500/20 group hover:border-red-500 transition-all shadow-sm">
                                                            <div className="flex flex-col">
                                                                <span className="text-[11px] font-black uppercase italic text-slate-700 dark:text-slate-300">{p.nome}</span>
                                                                <span className="text-[8px] font-bold text-red-500 uppercase mt-1">Status: Esgotado</span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => registrarPerdaRapida(p)}
                                                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg shadow-red-900/20 active:scale-95 transition-all"
                                                            >
                                                                Lançar Perda
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="mt-6 pt-4 border-t border-red-500/20">
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase italic leading-relaxed">
                                                        "Dê baixa na perda ou remova o item da lista para prosseguir com o faturamento."
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            /* TELA LIMPA / SUCESSO */
                                            <div className="bg-emerald-500/5 border-2 border-emerald-500/20 p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center h-full min-h-[220px]">
                                                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                                                    <ShieldCheck size={32} />
                                                </div>
                                                <h4 className="text-emerald-600 font-black uppercase italic tracking-tighter text-lg leading-none mb-2">Estoque Ok</h4>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Todos os componentes selecionados possuem saldo disponível.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* CONFIGURAÇÃO FINANCEIRA CUSTOMIZÁVEL */}
                                <div className="bg-slate-50 dark:bg-slate-950/50 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 dark:border-slate-800/50 transition-colors animate-in fade-in duration-500">
                                    <div className="flex items-center justify-between mb-6">
                                        <h4 className="text-[10px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <MonitorCheckIcon size={16} /> Configuração Financeira Personalizada
                                        </h4>
                                        <div className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                                            <span className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase">Opcional</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* VALOR MÃO DE OBRA */}
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                                                Valor Mão de Obra (R$)
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    className="w-full p-4 bg-white dark:bg-slate-900 border-2 border-transparent dark:border-slate-800 focus:border-blue-500 rounded-2xl font-black text-slate-700 dark:text-slate-200 outline-none transition-all text-sm shadow-sm"
                                                    placeholder="0,00"
                                                    value={valorMaoObra}
                                                    onChange={(e) => setValorMaoObra(e.target.value)}
                                                />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">R$</div>
                                            </div>
                                        </div>

                                        {/* CUSTO OPERACIONAL */}
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                                                Custo Operacional (R$)
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    className="w-full p-4 bg-white dark:bg-slate-900 border-2 border-transparent dark:border-slate-800 focus:border-blue-500 rounded-2xl font-black text-slate-700 dark:text-slate-200 outline-none transition-all text-sm shadow-sm"
                                                    placeholder="0,00"
                                                    value={custoOperacional}
                                                    onChange={(e) => setCustoOperacional(e.target.value)}
                                                />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">R$</div>
                                            </div>
                                        </div>

                                        {/* DESCONTO APLICADO */}
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                                                Desconto Aplicado (R$)
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    className="w-full p-4 bg-white dark:bg-slate-900 border-2 border-transparent dark:border-slate-800 focus:border-blue-500 rounded-2xl font-black text-slate-700 dark:text-slate-200 outline-none transition-all text-sm shadow-sm"
                                                    placeholder="0,00"
                                                    value={descontoAplicado}
                                                    onChange={(e) => setDescontoAplicado(e.target.value)}
                                                />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">R$</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* RESUMO FINANCEIRO CALCULADO */}
                                    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                                Resumo do Faturamento
                                            </span>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase">Peças:</p>
                                                    <p className="text-lg font-black text-slate-900 dark:text-slate-100">
                                                        R$ {pecasSugeridas
                                                            .filter(p => pecasEscolhidas.includes(p.id))
                                                            .reduce((acc, p) => acc + (p.preco_venda || 0), 0)
                                                            .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase">Total:</p>
                                                    <p className="text-xl font-black text-blue-600 dark:text-blue-400">
                                                        R$ {(pecasSugeridas
                                                            .filter(p => pecasEscolhidas.includes(p.id))
                                                            .reduce((acc, p) => acc + (p.preco_venda || 0), 0) +
                                                            (parseFloat(valorMaoObra) || 0) +
                                                            (parseFloat(custoOperacional) || 0) -
                                                            (parseFloat(descontoAplicado) || 0))
                                                            .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row gap-4 md:gap-6 mt-8 md:mt-12">
                                    <button
                                        onClick={() => setShowConcluirModal(false)}
                                        className="order-2 md:order-1 flex-1 py-4 md:py-6 rounded-2xl font-black text-slate-400 dark:text-slate-600 hover:text-slate-900 dark:hover:text-slate-300 transition-all uppercase tracking-widest text-[10px]"
                                    >
                                        Cancelar
                                    </button>


                                    <button
                                        type="button" // Mude para button se não estiver dentro de um <form> que você queira usar o onSubmit
                                        onClick={handleFinalizarComCodigo}
                                        disabled={loading || !laudo} // Bloqueia se não tiver laudo (boa prática de Analyst)
                                        className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 uppercase italic"
                                    >
                                        {loading ? (
                                            <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                <ShieldCheck size={24} /> FINALIZAR REPARO & NOTIFICAR
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            )}
        </div >
    );
};

export default DashboardAdmin;