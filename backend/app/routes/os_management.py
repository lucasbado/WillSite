from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from ..models import (
    db,
    WorkOrder,
    InventoryItem,
    ConsumedItem,
    LaborConfig,
    OperationalCost,
    InventoryLoss,
    User,
)
from datetime import datetime, timedelta
import pytz
from sqlalchemy import cast, String, func
from ..utils import (
    enviar_notificacao_status,
    gerar_link_whatsapp,
    notificar_cliente_multicanal,
)
import base64
import pyqrcode
import random

os_bp = Blueprint("os", __name__)


@os_bp.route("/validar-qr-entrega", methods=["POST"], strict_slashes=False)
@jwt_required()
def confirmar_entrega_via_qr():
    data = request.get_json()
    os_id = data.get("os_id")
    token_recebido = str(data.get("token", ""))

    os_atual = WorkOrder.query.get_or_404(os_id)
    token_no_banco = str(os_atual.verification_code or "")

    if not token_no_banco or token_recebido != token_no_banco:
        return jsonify({"msg": "Token QR inválido ou expirado"}), 401

    # Unificando o status para o que o Financeiro Stats espera
    os_atual.status = "Concluído"
    os_atual.verification_code = None
    os_atual.code_expires_at = None
    os_atual.finished_at = datetime.utcnow()  # IMPORTANTE: Para relatórios de tempo

    db.session.commit()
    return jsonify({"msg": "Entrega confirmada com sucesso!"}), 200


@os_bp.route("/<int:os_id>/entregar", methods=["POST"])
@jwt_required()
def entregar_os_final(os_id):
    data = request.get_json()
    is_bypass = data.get("is_bypass", False)
    codigo_digitado = str(data.get("codigo_digitado", ""))

    os_atual = WorkOrder.query.get_or_404(os_id)
    claims = get_jwt()

    # LÓGICA DE BYPASS: Se for bypass, verifica se é admin
    if is_bypass:
        if claims.get("role") != "admin":
            return (
                jsonify(
                    {"msg": "Apenas administradores podem realizar o bypass de entrega"}
                ),
                403,
            )
        # Se for admin e bypass, ignora o código e segue
    else:
        # LÓGICA NORMAL: Valida o código QR/Token
        token_no_banco = str(os_atual.verification_code or "")
        if not token_no_banco or codigo_digitado != token_no_banco:
            return jsonify({"msg": "Código de validação incorreto"}), 401

    # Finalização comum para ambos os casos
    os_atual.status = "Concluído"  # Ajustado para o status que seu Financeiro espera
    os_atual.verification_code = None
    os_atual.code_expires_at = None
    os_atual.finished_at = datetime.utcnow()

    db.session.commit()
    return jsonify({"msg": "OS entregue e finalizada com sucesso!"}), 200


def finalizar_e_limpar(os):
    os.status = "Concluído"
    os.verification_code = None
    os.code_expires_at = None
    db.session.commit()
    return jsonify({"msg": "Entrega realizada!"}), 200


@os_bp.route("/<int:os_id>/finalizar", methods=["POST"])
@jwt_required()
def finalizar_os(os_id):
    # Proteção de Rota: Só admin pode finalizar
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"msg": "Acesso negado"}), 403

    data = request.get_json()
    itens_ids = data.get("itens_ids", [])
    valor_mao_obra = data.get(
        "valor_mao_obra", 0.0
    )  # NOVO: Recebe mão de obra customizada
    custo_operacional = data.get("custo_operacional", 0.0)  # NOVO: Custo operacional
    desconto = data.get("desconto", 0.0)  # NOVO: Desconto aplicado

    os_atual = WorkOrder.query.get_or_404(os_id)

    try:
        total_pecas = 0.0

        # Lógica de estoque
        for p_id in itens_ids:
            peca = InventoryItem.query.get(p_id)
            if peca:
                if peca.quantidade > 0:
                    peca.quantidade -= 1
                    # Usando 'preco_venda' que é o padrão definido no seu modelo de inventário
                    total_pecas += getattr(peca, "preco_venda", 0)

                    consumo = ConsumedItem(
                        work_order_id=os_id, inventory_item_id=peca.id, quantidade=1
                    )
                    db.session.add(consumo)
                else:
                    return (
                        jsonify({"msg": f"Estoque insuficiente para {peca.nome}"}),
                        400,
                    )

        # CÁLCULO FINANCEIRO COMPLETO
        total_final = total_pecas + valor_mao_obra + custo_operacional - desconto

        # Atualiza OS com dados financeiros
        os_atual.status = "Concluído"
        os_atual.laudo_tecnico = data.get("laudo", "")
        os_atual.finished_at = datetime.utcnow()
        os_atual.valor_mao_obra = valor_mao_obra
        os_atual.custo_operacional = custo_operacional
        os_atual.desconto_aplicado = desconto
        os_atual.total_price = total_final

        db.session.commit()

        return (
            jsonify(
                {
                    "msg": "OS finalizada com sucesso!",
                    "total_calculado": round(total_final, 2),
                    "detalhamento": {
                        "pecas": round(total_pecas, 2),
                        "mao_obra": round(valor_mao_obra, 2),
                        "custos_operacionais": round(custo_operacional, 2),
                        "desconto": round(desconto, 2),
                    },
                }
            ),
            200,
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": f"Erro ao processar finalização: {str(e)}"}), 500


@os_bp.route("/<int:os_id>/pronto", methods=["POST"])
@jwt_required()
def definir_pronto_retirada(os_id):
    os_atual = WorkOrder.query.get_or_404(os_id)

    token = str(random.randint(1000, 9999))
    os_atual.verification_code = token
    os_atual.code_expires_at = datetime.utcnow() + timedelta(minutes=30)
    os_atual.status = "Pronto para Retirada"

    print(f"DEBUG: Gerando código {token} para OS {os_id}")  # Adicione este print!

    db.session.commit()  # <--- OBRIGATÓRIO
    return jsonify({"msg": "Código gerado", "code": token}), 200


@os_bp.route("/validar-qr/<int:os_id>/<string:token>", methods=["POST"])
@jwt_required()
def validar_confirmacao_qr(os_id, token):
    os_atual = WorkOrder.query.get_or_404(os_id)

    # Valida se o token lido do QR é o mesmo que o Admin gerou
    if str(os_atual.verification_code) != str(token):
        return (
            jsonify({"msg": "Token inválido"}),
            401,
        )  # 401 é mais correto que 403 aqui

    os_atual.status = "Concluído"
    os_atual.verification_code = None
    db.session.commit()

    return jsonify({"msg": "OK"}), 200


@os_bp.route("/abrir", methods=["POST"])
@jwt_required()
def abrir_os():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user or not user.is_verified:
        return jsonify({"msg": "Sua conta ainda não foi verificada. Por favor, ative-a através do link enviado ao seu e-mail para abrir ordens de serviço."}), 403

    data = request.json

    # Captura a data que o cliente escolheu no calendário
    data_cliente_str = data.get("data_entrega")  # Nome que vem do front
    data_convertida = None

    if data_cliente_str:
        # Converte o formato do input datetime-local do navegador
        data_convertida = datetime.strptime(data_cliente_str, "%Y-%m-%dT%H:%M")

    nova_os = WorkOrder(
        client_id=user_id,
        device_model=data.get("modelo"),
        problem_description=data.get("problema"),
        data_agendamento_entrega=data_convertida,  # A data que ele vai levar
        status="Pendente",  # Status inicial correto
    )

    db.session.add(nova_os)
    db.session.commit()
    return jsonify({"msg": "OS aberta com sucesso"}), 201


@os_bp.route("/admin/ocupacao", methods=["GET"])
@jwt_required()
def obter_ocupacao():
    data_pesquisa = request.args.get("data")  # Ex: '2026-03-12'

    # 1. Fazemos a busca e guardamos em 'ordens' (para condizer com o loop abaixo)
    ordens = WorkOrder.query.filter(
        func.date(WorkOrder.data_agendamento_entrega) == data_pesquisa,
        WorkOrder.deletada
        == False,  # Use o padrão do seu modelo 'deletada' em vez de string 'Excluída'
    ).all()

    # 2. Criamos o dicionário de resultados
    resultado_ocupacao = {}

    for o in ordens:
        # Extrai a hora: '09:00'
        if o.data_agendamento_entrega:
            hora = o.data_agendamento_entrega.strftime("%H:%M")
            resultado_ocupacao[hora] = resultado_ocupacao.get(hora, 0) + 1

    return jsonify(resultado_ocupacao), 200


@os_bp.route("/detalhes/<int:os_id>", methods=["GET"])
@jwt_required()
def detalhes_os(os_id):
    os_servico = WorkOrder.query.get_or_404(os_id)
    cliente = os_servico.client

    # Geramos o link dinâmico
    link_wa = gerar_link_whatsapp(
        telefone=cliente.telefone,
        nome_cliente=cliente.nome_completo,
        os_id=os_servico.id,
        modelo=os_servico.device_model,
        status=os_servico.status,
        laudo=os_servico.laudo_tecnico,
    )

    total_servicos = WorkOrder.query.filter_by(
        client_id=cliente.id, deletada=False
    ).count()

    pecas = []
    for item in os_servico.items_used:
        pecas.append(
            {
                "nome": item.inventory_item.nome,
                "quantidade": item.quantidade,
                "preco": getattr(item.inventory_item, "preco_venda", 0),
            }
        )

    return (
        jsonify(
            {
                "os_info": {
                    "id": os_servico.id,
                    "status": os_servico.status,
                    "modelo": os_servico.device_model,
                    "problema": os_servico.problem_description,
                    "laudo_tecnico": os_servico.laudo_tecnico,
                    "data_abertura": os_servico.created_at.strftime("%d/%m/%Y %H:%M"),
                    "entrega_loja": (
                        os_servico.data_agendamento_entrega.strftime("%d/%m/%Y %H:%M")
                        if os_servico.data_agendamento_entrega
                        else "Não agendado"
                    ),
                },
                "cliente_info": {
                    "nome": cliente.nome_completo,
                    "cpf": cliente.cpf,
                    "email": cliente.email,
                    "total_os": total_servicos,
                    "endereco": cliente.endereco,
                    "cep": cliente.cep,
                    "whatsapp_link": link_wa,
                    "telefone": cliente.telefone,
                },
                "pecas_utilizadas": pecas,  # Enviando na raiz do objeto para facilitar o acesso
                "total_os": total_servicos,
            }
        ),
        200,
    )


# Helper para verificar se é admin
def admin_required():
    claims = get_jwt()
    if claims.get("role") != "admin":
        return False
    return True


@os_bp.route("/admin/notificar-conclusao/<int:os_id>", methods=["POST"])
@jwt_required()
def notificar_conclusao(os_id):
    # Verificação de Admin
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"msg": "Acesso negado"}), 403

    # 1. Busca a OS e o Cliente no banco de dados real
    os_servico = WorkOrder.query.get_or_404(os_id)
    cliente = os_servico.client  # O relacionamento 'client' que você já tem no modelo

    # 2. Captura o laudo enviado pelo front ou usa o da OS
    data = request.get_json()
    laudo_final = data.get("laudo", os_servico.laudo_tecnico)

    try:
        # 3. Chama a função que criamos no __init__.py
        # Importante: Como a função está no factory, o ideal é movê-la para um utils.py
        # ou importá-la do app se ela estiver acessível.
        from flask import current_app

        # Aqui chamamos a lógica de disparo
        enviar_notificacao_status(
            email_destinatario=cliente.email,
            nome_cliente=cliente.nome_completo,
            os_id=os_id,
            modelo=os_servico.device_model,
            status="Concluído",
            laudo=laudo_final,
        )

        return jsonify({"msg": "Notificação real enviada ao cliente!"}), 200
    except Exception as e:
        print(f"Erro no disparo de e-mail: {e}")
        return jsonify({"msg": "Erro ao disparar notificação"}), 500


@os_bp.route("/admin/agendar/<int:os_id>", methods=["PATCH"])
@jwt_required()
def agendar_os(os_id):
    # Import local para evitar erro de pacote ou circularidade
    try:
        from app.utils import enviar_notificacao_status
    except ImportError:
        # Tente este caso a estrutura seja diferente
        from ..utils import enviar_notificacao_status

    data = request.get_json()
    data_recebida = data.get("data_entrega")

    if not data_recebida:
        return jsonify({"msg": "Data e horário são obrigatórios"}), 400

    os_servico = WorkOrder.query.get_or_404(os_id)
    cliente = os_servico.client  # Certifique-se que o relacionamento existe no Model

    try:
        data_limpa = data_recebida.replace("T", " ")
        data_final = datetime.strptime(data_limpa, "%Y-%m-%d %H:%M")
        os_servico = WorkOrder.query.get_or_404(os_id)

        os_servico.scheduled_date = data_final
        os_servico.status = "Em Manutenção"
        db.session.commit()

        # O GATILHO:
        from ..utils import notificar_cliente_multicanal

        # Passamos o status "Agendado" e a data no laudo para o Whats
        msg_agendamento = f"Seu aparelho foi agendado para retirada/entrega em: {data_final.strftime('%d/%m/%Y às %H:%M')}."

        link_whats = notificar_cliente_multicanal(
            os_servico, "Em Manutenção", msg_agendamento
        )

        return (
            jsonify(
                {
                    "msg": "Agendado com sucesso!",
                    "whatsapp_link": link_whats,  # <--- Agora o link vai aqui também!
                }
            ),
            200,
        )
    except Exception as e:
        db.session.rollback()
        print(f"ERRO NO AGENDAMENTO: {e}")
        return jsonify({"msg": f"Erro interno: {str(e)}"}), 500

    except ValueError as e:
        db.session.rollback()
        return jsonify({"msg": f"Formato de data inválido: {str(e)}"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Erro interno ao processar agendamento"}), 500


@os_bp.route("/admin/listar", methods=["GET"])
@jwt_required()
def listar_todas_os():
    # Filtramos por deletada=False E status diferente de 'Concluído'
    ordens = (
        WorkOrder.query.filter(
            WorkOrder.deletada == False, WorkOrder.status != "Concluído"
        )
        .order_by(WorkOrder.data_agendamento_entrega.asc())
        .all()
    )

    return (
        jsonify(
            [
                {
                    "id": o.id,
                    "cliente": (
                        o.client.nome_completo if o.client else "Cliente não encontrado"
                    ),
                    "modelo": o.device_model,
                    "problema": o.problem_description,
                    "status": o.status,
                    # Data de Entrada
                    "data_entrada": (
                        o.data_agendamento_entrega.strftime("%d/%m %H:%M")
                        if o.data_agendamento_entrega
                        else "N/A"
                    ),
                    "data_prometida_cliente": (
                        o.data_agendamento_entrega.strftime("%d/%m %H:%M")
                        if o.data_agendamento_entrega
                        else "Não informada"
                    ),
                    # --- LÓGICA INTELIGENTE BLINDADA ---
                    "data_iso": (
                        o.scheduled_date.strftime("%Y-%m-%d")
                        if o.scheduled_date
                        else (
                            o.data_agendamento_entrega.strftime("%Y-%m-%d")
                            if o.data_agendamento_entrega
                            else None
                        )
                    ),
                    "hora": (
                        o.scheduled_date.strftime("%H:%M")
                        if o.scheduled_date
                        else (
                            o.data_agendamento_entrega.strftime("%H:%M")
                            if o.data_agendamento_entrega
                            else "--:--"
                        )
                    ),
                    "deadline": (
                        o.scheduled_date.strftime("%d/%m %H:%M")
                        if o.scheduled_date
                        else "Pendente"
                    ),
                    "data_entrega_formatada": (
                        o.scheduled_date.strftime("%d/%m")
                        if o.scheduled_date
                        else "A definir"
                    ),
                    # --- NOVOS CAMPOS DE SEGURANÇA (ADICIONE ESTE BLOCO) ---
                    "verification_code": o.verification_code,
                    "code_expires_at": (
                        o.code_expires_at.isoformat() if o.code_expires_at else None
                    ),
                    "ready_at": o.ready_at.isoformat() if o.ready_at else None,
                    # ------------------------------------------------------
                }
                for o in ordens
            ]
        ),
        200,
    )

    def calcular_status_tempo(data_agendada, status_atual):
        if status_atual == "Concluído":
            return "on_time"

        agora = datetime.now()  # Certifique-se de usar o timezone correto (-3h)

        # Se a data agendada já passou do 'agora' e não está concluída
        if data_agendada < agora:
            atraso = agora - data_agendada
            horas_atraso = atraso.total_seconds() // 3600
            return {"estado": "atrasada", "detalhe": f"{int(horas_atraso)}h de atraso"}

        # Se falta menos de 2 horas para o agendamento
        if data_agendada - agora < timedelta(hours=2):
            return {"estado": "urgente", "detalhe": "Entrega próxima"}

        return {"estado": "normal", "detalhe": "No prazo"}

    return (
        jsonify(
            [
                {
                    "id": o.id,
                    "cliente": o.client.nome_completo,
                    "modelo": o.device_model,
                    "problema": o.problem_description,
                    "status": o.status,
                    "deadline": (
                        o.data_agendamento_entrega.strftime("%d/%m %H:%M")
                        if o.data_agendamento_entrega
                        else "Não agendado"
                    ),
                    "data_agendada_admin": (
                        o.scheduled_date.strftime("%d/%m/%Y %H:%M")
                        if o.scheduled_date
                        else None
                    ),
                }
                for o in ordens
            ]
        ),
        200,
    )


@os_bp.route("/admin/escala-mensal", methods=["GET"])
@jwt_required()
def obter_escala_mensal():
    # Pega mês e ano da query ou usa o atual
    hoje = datetime.now()
    mes = int(request.args.get("mes", hoje.month))
    ano = int(request.args.get("ano", hoje.year))

    # Filtra as OS do mês específico
    agendamentos = (
        WorkOrder.query.filter(
            db.extract("month", WorkOrder.scheduled_date) == mes,
            db.extract("year", WorkOrder.scheduled_date) == ano,
            WorkOrder.deletada == False,
        )
        .order_by(WorkOrder.scheduled_date.asc())
        .all()
    )

    # Agrupamos por data ISO (YYYY-MM-DD) para o Front mapear fácil
    escala = {}
    for os in agendamentos:
        data_key = os.scheduled_date.strftime("%Y-%m-%d")
        if data_key not in escala:
            escala[data_key] = []

        escala[data_key].append(
            {
                "id": os.id,
                "cliente": os.client.nome_completo,
                "modelo": os.device_model,
                "hora": os.scheduled_date.strftime("%H:%M"),
                "status": os.status,
            }
        )

    return jsonify(escala), 200


@os_bp.route("/admin/calendario", methods=["GET"])
@jwt_required()
def obter_calendario():
    # Pegamos o mês e ano da query (ou o atual)
    mes = request.args.get("mes", datetime.now().month)
    ano = request.args.get("ano", datetime.now().year)

    # Buscamos OS que tenham scheduled_date (agendamento do admin)
    # e que não estejam deletadas
    agendamentos = WorkOrder.query.filter(
        db.extract("month", WorkOrder.scheduled_date) == mes,
        db.extract("year", WorkOrder.scheduled_date) == ano,
        WorkOrder.deletada == False,
    ).all()

    # Agrupamos por dia para facilitar o front
    agenda = {}
    for os in agendamentos:
        dia = os.scheduled_date.strftime("%Y-%m-%d")
        if dia not in agenda:
            agenda[dia] = []

        agenda[dia].append(
            {
                "id": os.id,
                "cliente": os.client.nome_completo,
                "modelo": os.device_model,
                "hora": os.scheduled_date.strftime("%H:%M"),
                "status": os.status,
            }
        )

    return jsonify(agenda), 200


@os_bp.route("/detalhes-publico/<int:os_id>", methods=["GET"])
def detalhes_os_publico(os_id):
    # Rota SEM @jwt_required para permitir acesso via link do WhatsApp
    os_servico = WorkOrder.query.get_or_404(os_id)
    cliente = os_servico.client

    pecas = []
    for item in os_servico.items_used:
        pecas.append(
            {
                "nome": item.inventory_item.nome,
                "quantidade": item.quantidade,
            }
        )

    return (
        jsonify(
            {
                "os_info": {
                    "id": os_servico.id,
                    "status": os_servico.status,
                    "modelo": os_servico.device_model,
                    "laudo_tecnico": os_servico.laudo_tecnico,
                    "data_abertura": os_servico.created_at.strftime("%d/%m/%Y"),
                },
                "cliente_info": {
                    "nome": cliente.nome_completo,
                    "modelo": os_servico.device_model,  # Repetimos aqui para o Helmet ler fácil
                },
                "pecas_utilizadas": pecas,
            }
        ),
        200,
    )


# Nova Rota: Histórico de Concluídos
@os_bp.route("/admin/concluidas", methods=["GET"])
@jwt_required()
def listar_os_concluidas():
    # Buscamos as ordens concluídas
    concluidas = (
        WorkOrder.query.filter_by(status="Concluído", deletada=False)
        .order_by(WorkOrder.finished_at.desc())
        .all()
    )

    resultado = []
    for o in concluidas:
        # Puxamos as peças de cada OS concluída
        lista_pecas = []
        for item in o.items_used:
            lista_pecas.append(
                {"nome": item.inventory_item.nome, "quantidade": item.quantidade}
            )

        resultado.append(
            {
                "id": o.id,
                "cliente": o.client.nome_completo,
                "modelo": o.device_model,
                "problema": o.problem_description,
                "laudo_tecnico": o.laudo_tecnico,
                "data_finalizacao": format_brazil_time(
                    o.finished_at
                ),  # Aquela função de -3h
                "pecas_utilizadas": lista_pecas,  # Nome que o seu modal do front espera
                "cliente_info": {  # Adicionado para o modal de detalhes não quebrar
                    "nome": o.client.nome_completo,
                    "cpf": o.client.cpf,
                    "email": o.client.email,
                    "endereco": o.client.endereco,
                    "cep": o.client.cep,
                },
            }
        )

    return jsonify(resultado), 200


@os_bp.route("/excluir/<int:os_id>", methods=["PATCH"])
@jwt_required()
def excluir_os(os_id):
    user_id = get_jwt_identity()
    user_role = get_jwt().get("role")
    os_servico = WorkOrder.query.get_or_404(os_id)

    if user_role == "admin":
        os_servico.deletada = True
        os_servico.excluida_por = "admin"
    else:
        # AJUSTE AQUI: Permitir se for o status inicial do sistema
        status_permitidos = ["Pendente", "Aguardando Agendamento"]

        if os_servico.status not in status_permitidos:
            return (
                jsonify(
                    {
                        "msg": "Não é possível excluir uma OS que já foi processada pelo Admin"
                    }
                ),
                400,
            )

        os_servico.deletada = True
        os_servico.excluida_por = "cliente"

    db.session.commit()
    return jsonify({"msg": "OS removida com sucesso"}), 200


@os_bp.route("/admin/financeiro/stats", methods=["GET"])
@jwt_required()
def obter_stats_financeiros():
    try:
        # 1. ESTOQUE (Blindagem simples)
        itens_estoque = InventoryItem.query.all()
        patrimonio_total = sum(
            (item.quantidade * (item.preco_custo or 0)) for item in itens_estoque
        )
        lucro_potencial_estoque = sum(
            (item.quantidade * ((item.preco_venda or 0) - (item.preco_custo or 0)))
            for item in itens_estoque
        )
        total_itens = sum(item.quantidade for item in itens_estoque)

        # 3. PREJUÍZOS (REGISTRADOS VIA MODAL)
        valor_desperdicio = (
            db.session.query(func.sum(InventoryLoss.valor_perda)).scalar() or 0.0
        )
        pecas_quebradas = (
            db.session.query(func.sum(InventoryLoss.quantidade)).scalar() or 0
        )

        # 4. RANKING DE PERDAS (PARA O DASHBOARD)
        ranking_query = (
            db.session.query(
                InventoryItem.nome,
                func.sum(InventoryLoss.quantidade).label("qtd"),
                func.sum(InventoryLoss.valor_perda).label("valor"),
            )
            .join(InventoryLoss, InventoryLoss.item_id == InventoryItem.id)
            .group_by(InventoryItem.id)
            .order_by(func.sum(InventoryLoss.valor_perda).desc())
            .limit(5)
            .all()
        )

        rankingPerdas = [
            {"nome": r.nome, "quantidade": int(r.qtd), "valor": float(r.valor)}
            for r in ranking_query
        ]

        # 5. OS CONCLUÍDAS (RECEITA REAL)
        # Filtramos apenas o que é REALMENTE receita
        receita_total = (
            db.session.query(func.sum(WorkOrder.total_price))
            .filter(
                WorkOrder.status.in_(["Concluído", "Entregue"]),
                WorkOrder.deletada == False,
            )
            .scalar()
            or 0
        )
        custos_operacionais_os = (
            db.session.query(func.sum(WorkOrder.custo_operacional))
            .filter(
                WorkOrder.status.in_(["Concluído", "Entregue"]),
                WorkOrder.deletada == False,
            )
            .scalar()
            or 0
        )
        volume_concluidas = (
            db.session.query(func.count(WorkOrder.id))
            .filter(
                WorkOrder.status.in_(["Concluído", "Entregue"]),
                WorkOrder.deletada == False,
            )
            .scalar()
            or 0
        )

        # 3. CUSTO DE PEÇAS E MARGEM REAL
        custo_total_pecas_vendidas = (
            db.session.query(
                func.sum(ConsumedItem.quantidade * InventoryItem.preco_custo)
            )
            .join(InventoryItem, ConsumedItem.inventory_item_id == InventoryItem.id)
            .join(WorkOrder, ConsumedItem.work_order_id == WorkOrder.id)
            .filter(
                WorkOrder.status.in_(["Concluído", "Entregue"]),
                WorkOrder.deletada == False,
            )
            .scalar()
            or 0
        )

        # 4. PERFORMANCE
        total_os = WorkOrder.query.filter_by(deletada=False).count()
        taxa_sucesso = (volume_concluidas / total_os * 100) if total_os > 0 else 100

        # 5. ESTATÍSTICAS POR MARCA (DINÂMICO)
        concluidas_list = WorkOrder.query.filter(
            WorkOrder.status == "Concluído", WorkOrder.deletada == False
        ).all()
        stats_marcas = {}
        for os in concluidas_list:
            # Tenta pegar a primeira palavra do modelo como marca (Ex: "iPhone 13" -> "iPhone")
            marca = os.device_model.split(" ")[0] if os.device_model else "Outros"
            if marca not in stats_marcas:
                stats_marcas[marca] = {"receita": 0, "total": 0}
            stats_marcas[marca]["receita"] += os.total_price or 0
            stats_marcas[marca]["total"] += 1

        porMarca = []
        for m_nome, m_val in stats_marcas.items():
            porMarca.append(
                {
                    "marca": m_nome,
                    "receitaTotal": float(m_val["receita"]),
                    "totalOS": m_val["total"],
                    "ticketMedio": (
                        float(m_val["receita"] / m_val["total"])
                        if m_val["total"] > 0
                        else 0
                    ),
                }
            )

        # 6. TENDÊNCIA MENSAL (RECEITA VS PREJUÍZO)
        tendencia = []
        agora = datetime.utcnow()
        for i in range(5, -1, -1):
            # Lógica de meses mais robusta
            data_base = agora - timedelta(days=i * 30)
            inicio_mes = data_base.replace(
                day=1, hour=0, minute=0, second=0, microsecond=0
            )
            proximo_mes = (inicio_mes + timedelta(days=32)).replace(day=1)
            fim_mes = proximo_mes - timedelta(seconds=1)

            receita_m = (
                db.session.query(func.sum(WorkOrder.total_price))
                .filter(
                    WorkOrder.finished_at.between(inicio_mes, fim_mes),
                    WorkOrder.deletada == False,
                )
                .scalar()
                or 0
            )

            perdas_m = (
                db.session.query(func.sum(InventoryLoss.valor_perda))
                .filter(InventoryLoss.created_at.between(inicio_mes, fim_mes))
                .scalar()
                or 0
            )

            tendencia.append(
                {
                    "mes": inicio_mes.strftime("%b").upper(),
                    "receita": float(receita_m),
                    "perdas": float(perdas_m),
                }
            )

        # 7. RETORNO (Garantindo que o JSON tenha as chaves que o React espera)
        return (
            jsonify(
                {
                    "patrimonioTotal": round(float(patrimonio_total), 2),
                    "receitaTotal": round(float(receita_total), 2),
                    "lucroPotencial": round(float(lucro_potencial_estoque), 2),
                    "lucroReal": round(
                        float(receita_total - custo_total_pecas_vendidas), 2
                    ),
                    "custosOperacionais": round(float(custos_operacionais_os), 2),
                    "volumeConsertos": int(volume_concluidas),
                    "taxaSucesso": round(float(taxa_sucesso), 1),
                    "valorDesperdicio": round(float(valor_desperdicio), 2),
                    "pecasQuebradas": int(pecas_quebradas),
                    "totalItens": int(total_itens),
                    "porMarca": porMarca,
                    "perdasPorMotivo": [],
                    "rankingPerdas": rankingPerdas,
                    "tendenciaMensal": tendencia,
                }
            ),
            200,
        )

    except Exception as e:
        # ISSO VAI MOSTRAR O ERRO NO SEU TERMINAL (Importante ler!)
        print(f"DEBUG FINANCEIRO - ERRO REAL: {str(e)}")
        return (
            jsonify({"msg": "Erro interno ao processar dashboard", "debug": str(e)}),
            500,
        )


# NOVAS ROTAS PARA CONFIGURAÇÕES FINANCEIRAS
@os_bp.route("/admin/labor-configs", methods=["GET"])
@jwt_required()
def get_labor_configs():
    """Retorna configurações de mão de obra"""
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"msg": "Acesso negado"}), 403

    configs = LaborConfig.query.filter_by(ativo=True).all()
    return (
        jsonify(
            [
                {
                    "id": c.id,
                    "marca": c.marca,
                    "tipo_servico": c.tipo_servico,
                    "valor_padrao": c.valor_padrao,
                    "tempo_estimado_min": c.tempo_estimado_min,
                }
                for c in configs
            ]
        ),
        200,
    )


@os_bp.route("/admin/labor-configs", methods=["POST"])
@jwt_required()
def create_labor_config():
    """Cria configuração de mão de obra"""
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"msg": "Acesso negado"}), 403

    data = request.get_json()
    try:
        config = LaborConfig(
            marca=data["marca"],
            tipo_servico=data["tipo_servico"],
            valor_padrao=data["valor_padrao"],
            tempo_estimado_min=data.get("tempo_estimado_min", 30),
        )
        db.session.add(config)
        db.session.commit()
        return jsonify({"msg": "Configuração criada com sucesso"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": f"Erro: {str(e)}"}), 400


@os_bp.route("/admin/operational-costs", methods=["GET"])
@jwt_required()
def get_operational_costs():
    """Retorna custos operacionais"""
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"msg": "Acesso negado"}), 403

    custos = OperationalCost.query.filter_by(ativo=True).all()
    custo_total_mensal = sum(c.valor_mensal for c in custos)

    return (
        jsonify(
            {
                "custos": [
                    {
                        "id": c.id,
                        "descricao": c.descricao,
                        "valor_mensal": c.valor_mensal,
                        "categoria": c.categoria,
                    }
                    for c in custos
                ],
                "total_mensal": round(custo_total_mensal, 2),
            }
        ),
        200,
    )


@os_bp.route("/meu-historico", methods=["GET"])
@jwt_required()
def historico_cliente():
    user_id = get_jwt_identity()
    minhas_ordens = WorkOrder.query.filter_by(client_id=user_id, deletada=False).all()

    return (
        jsonify(
            [
                {
                    "id": o.id,
                    "problema": o.problem_description,
                    "laudo_tecnico": o.laudo_tecnico,
                    "modelo": o.device_model,
                    "status": o.status,
                    "data_abertura": format_brazil_time(o.created_at),
                    "data_agendada_admin": (
                        o.scheduled_date.strftime("%d/%m/%Y %H:%M")
                        if o.scheduled_date
                        else "Em análise técnica"
                    ),
                    "pecas": [{"nome": p.inventory_item.nome} for p in o.items_used],
                    # 1. Data que o cliente marcou para LEVAR (Certifique-se que o nome da coluna é este)
                    "previsao_cliente": (
                        o.data_agendamento_entrega.strftime("%d/%m/%Y %H:%M")
                        if o.data_agendamento_entrega
                        else "Não informada"
                    ),
                    # 2. Data que o ADMIN marcou para RETIRADA (scheduled_date)
                    "data_agendada_admin": (
                        o.scheduled_date.strftime("%d/%m/%Y %H:%M")
                        if o.scheduled_date
                        else "Pendente"
                    ),
                }
                for o in minhas_ordens
            ]
        ),
        200,
    )


@os_bp.route("/admin/excluidas", methods=["GET"])
@jwt_required()
def listar_os_excluidas():
    # Pega apenas as que foram marcadas como deletadas
    excluidas = WorkOrder.query.filter_by(deletada=True).all()
    return (
        jsonify(
            [
                {
                    "id": o.id,
                    "cliente": o.client.username,  # <--- Verifique se é 'username', 'name' ou 'nome'
                    "modelo": o.device_model,
                    "status": o.status,
                    "data_abertura": o.created_at.strftime("%d/%m/%Y"),
                }
                for o in excluidas
            ]
        ),
        200,
    )


def format_brazil_time(dt):
    if not dt:
        return None
    # Subtrai 3 horas manualmente do valor que está no banco
    brazil_time = dt - timedelta(hours=3)
    return brazil_time.strftime("%d/%m/%Y %H:%M")


@os_bp.route("/<int:os_id>/status", methods=["GET"])
@jwt_required()
def check_status(os_id):
    """
    Rota de consulta rápida de status.
    Dica: Se o console estiver poluído, aumente o intervalo de polling no Frontend.
    """
    os_obj = WorkOrder.query.get_or_404(os_id)

    response = jsonify(
        {
            "os_id": os_id,
            "status": os_obj.status,
            "last_check": datetime.now().strftime("%H:%M:%S"),
        }
    )

    # Headers para garantir que o polling sempre pegue o dado mais atual sem cache agressivo
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return response, 200


@os_bp.route("/admin/concluir-total/<int:os_id>", methods=["PATCH"])
@jwt_required()
def concluir_os(os_id):
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"msg": "Acesso negado"}), 403

    data = request.get_json()
    print(f"Recebendo conclusão para OS {os_id}")
    itens_ids = data.get("itens_ids", [])
    laudo = data.get("laudo", "Reparo concluído conforme padrões SGAT.")
    pdf_base64 = data.get("pdf_anexo")
    valor_mao_obra = data.get("valor_mao_obra", 0.0)
    custo_operacional = data.get("custo_operacional", 0.0)
    desconto = data.get("desconto_aplicado", 0.0)

    os_atual = WorkOrder.query.get_or_404(os_id)

    try:
        total_pecas = 0

        # Lógica de estoque
        for p_id in itens_ids:
            peca = InventoryItem.query.get(p_id)
            if peca:
                if peca.quantidade > 0:
                    peca.quantidade -= 1
                    # Usando 'preco_venda' que é o padrão definido no seu modelo de inventário
                    total_pecas += getattr(peca, "preco_venda", 0)

                    consumo = ConsumedItem(
                        work_order_id=os_id, inventory_item_id=peca.id, quantidade=1
                    )
                    db.session.add(consumo)
                else:
                    return (
                        jsonify({"msg": f"Estoque insuficiente para {peca.nome}"}),
                        400,
                    )

        # CÁLCULO FINANCEIRO FINAL REAL
        total_final = (
            total_pecas
            + float(valor_mao_obra)
            + float(custo_operacional)
            - float(desconto)
        )

        os_atual.status = "Concluído"
        os_atual.laudo_tecnico = laudo
        os_atual.finished_at = datetime.utcnow()
        os_atual.valor_mao_obra = float(valor_mao_obra)
        os_atual.custo_operacional = float(custo_operacional)
        os_atual.desconto_aplicado = float(desconto)
        os_atual.total_price = total_final
        db.session.commit()

        # O SEGREDO AQUI: Notificamos e pegamos o link do Whats
        pdf_binary = None
        if pdf_base64 and "," in pdf_base64:
            # O React envia "data:application/pdf;base64,JVBERi..."
            # Precisamos apenas do que vem depois da vírgula
            try:
                header, encoded = pdf_base64.split(",", 1)
                pdf_binary = base64.b64decode(encoded)
            except Exception as e:
                print(f"Erro ao decodificar PDF: {e}")

        # Dispara as notificações (Multicanal)
        link_whats = notificar_cliente_multicanal(
            os_servico=os_atual,
            status="Concluído",
            laudo=laudo,
            pdf_blob=pdf_binary,  # Passa o binário para o e-mail
        )

        # Retornamos o link para o Frontend abrir
        return jsonify({"whatsapp_link": link_whats}), 200

    except Exception as e:
        # ISSO AQUI VAI TE MOSTRAR O ERRO REAL NO TERMINAL
        print(f"ERRO CRÍTICO NO BACKEND: {str(e)}")
        return jsonify({"msg": f"Erro interno: {str(e)}"}), 500
