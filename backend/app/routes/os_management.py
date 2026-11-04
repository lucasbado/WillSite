from flask import Blueprint, request, jsonify, current_app
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
from ..security import accessible_order
from ..services.intake import intake_payload
from sqlalchemy.exc import IntegrityError
from ..services.delivery import (
    DeliveryError, code_payload, confirm_delivery, finish_repair, issue_code,
)

os_bp = Blueprint("os", __name__)


@os_bp.errorhandler(DeliveryError)
def delivery_error(error):
    db.session.rollback()
    return jsonify(msg=str(error)), error.status


def json_object():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise DeliveryError("Envie um objeto JSON válido")
    return data


@os_bp.route("/validar-qr-entrega", methods=["POST"], strict_slashes=False)
@jwt_required()
def confirmar_entrega_via_qr():
    data = json_object()
    os_id = data.get("os_id")
    if type(os_id) is not int or os_id <= 0:
        raise DeliveryError("Identificador da OS inválido")
    order = accessible_order(os_id, lock=True)
    confirm_delivery(order, data.get("token"))
    return jsonify(msg="Entrega confirmada com sucesso!"), 200


@os_bp.route("/<int:os_id>/entregar", methods=["POST"])
@jwt_required()
def entregar_os_final(os_id):
    data = json_object()
    order = accessible_order(os_id, lock=True)
    confirm_delivery(order, data.get("codigo_digitado"), data.get("is_bypass", False))
    return jsonify(msg="OS entregue e finalizada com sucesso!"), 200


@os_bp.route("/<int:os_id>/finalizar", methods=["POST"])
@os_bp.route("/admin/concluir-total/<int:os_id>", methods=["PATCH"])
@os_bp.route("/admin/concluir/<int:os_id>", methods=["PATCH"])
@jwt_required()
def finalizar_os(os_id):
    data = json_object()
    if "codigo_digitado" in data or "is_bypass" in data:
        raise DeliveryError("Confirme a retirada pela rota /entregar")
    pdf_binary = None
    if data.get("pdf_anexo"):
        try:
            pdf_binary = base64.b64decode(data["pdf_anexo"].split(",", 1)[1], validate=True)
        except (ValueError, IndexError, AttributeError):
            raise DeliveryError("Anexo PDF inválido") from None
    order = accessible_order(os_id, lock=True)
    finish_repair(order, data)
    # Falha de notificação não desfaz uma operação financeira já confirmada.
    link = ""
    notification_warning = None
    try:
        link = notificar_cliente_multicanal(order, order.status, order.laudo_tecnico, pdf_binary)
    except Exception:
        current_app.logger.exception("Falha ao preparar notificação da OS %s", os_id)
        notification_warning = "Reparo salvo, mas não foi possível preparar a notificação"
    return jsonify(msg="Reparo finalizado. Aguardando retirada", total_calculado=order.total_price,
                   os_atualizada=code_payload(order), whatsapp_link=link,
                   notification_warning=notification_warning), 200


@os_bp.route("/<int:os_id>/pronto", methods=["POST"])
@jwt_required()
def definir_pronto_retirada(os_id):
    data = json_object()
    order = accessible_order(os_id, lock=True)
    issue_code(order, data.get("expira_em", 30))
    db.session.commit()
    return jsonify(msg="Código gerado", code=order.verification_code,
                   os_atualizada=code_payload(order)), 200


@os_bp.route("/validar-qr/<int:os_id>/<string:token>", methods=["POST"])
@jwt_required()
def validar_confirmacao_qr(os_id, token):
    order = accessible_order(os_id, lock=True)
    confirm_delivery(order, token)
    return jsonify(msg="Entrega confirmada com sucesso!"), 200


@os_bp.route("/abrir", methods=["POST"])
@jwt_required()
def abrir_os():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user or not user.is_verified:
        return jsonify({"msg": "Sua conta ainda não foi verificada. Por favor, ative-a através do link enviado ao seu e-mail para abrir ordens de serviço."}), 403

    data = intake_payload(request.get_json(silent=True))
    key = data['intake_request_id']

    def existing_response():
        existing = WorkOrder.query.filter_by(client_id=user_id, intake_request_id=key).first() if key else None
        if not existing:
            return None
        if (existing.device_model != data['modelo'] or existing.problem_description != data['problema']
                or existing.data_agendamento_entrega != data['date']):
            raise DeliveryError('Esta solicitação já foi enviada com outros dados', 409)
        return jsonify(msg='Solicitação já recebida. Aguarde a confirmação da equipe.', os_id=existing.id,
                       agendamento_confirmado=False), 200

    previous = existing_response()
    if previous:
        return previous
    nova_os = WorkOrder(client_id=user_id, device_model=data['modelo'],
        problem_description=data['problema'], data_agendamento_entrega=data['date'],
        intake_request_id=key, status='Pendente')
    db.session.add(nova_os)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        previous = existing_response()
        if previous:
            return previous
        raise
    return jsonify(msg='Solicitação recebida. Aguarde a confirmação do horário pela equipe.',
                   os_id=nova_os.id, agendamento_confirmado=False), 201


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
    data = json_object()
    try:
        data_final = datetime.strptime(data.get("data_entrega", "").replace("T", " "), "%Y-%m-%d %H:%M")
    except (ValueError, AttributeError):
        raise DeliveryError("Data e horário inválidos") from None
    os_servico = accessible_order(os_id, lock=True)
    if os_servico.status in {"Concluído", "Entregue"}:
        raise DeliveryError("Esta OS já foi encerrada", 409)
    os_servico.scheduled_date = data_final
    # Agendar a retirada de um reparo pronto não pode reabrir o faturamento.
    if os_servico.status != "Pronto para Retirada":
        os_servico.status = "Em Manutenção"
    db.session.commit()
    link_whats = ""
    try:
        message = f"Seu aparelho foi agendado para retirada/entrega em: {data_final.strftime('%d/%m/%Y às %H:%M')}."
        link_whats = notificar_cliente_multicanal(os_servico, os_servico.status, message)
    except Exception:
        current_app.logger.exception("Falha ao preparar notificação de agendamento da OS %s", os_id)
    return jsonify(msg="Agendado com sucesso!", whatsapp_link=link_whats), 200


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
                    "telefone": o.client.telefone if o.client else None,
                    "scheduled_for": pytz.timezone("America/Sao_Paulo").localize(o.scheduled_date).isoformat() if o.scheduled_date else None,
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
                    "data_iso": o.scheduled_date.strftime("%Y-%m-%d") if o.scheduled_date else None,
                    "hora": o.scheduled_date.strftime("%H:%M") if o.scheduled_date else "--:--",
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
                        o.code_expires_at.isoformat() + "Z" if o.code_expires_at else None
                    ),
                    "ready_at": o.ready_at.isoformat() + "Z" if o.ready_at else None,
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
    # O recibo exige sessão do proprietário ou administrador.
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
        WorkOrder.query.filter(WorkOrder.status.in_(["Concluído", "Entregue"]), WorkOrder.deletada == False)
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
            WorkOrder.status.in_(["Concluído", "Entregue"]), WorkOrder.deletada == False
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

        costs_by_order = dict(
            db.session.query(ConsumedItem.work_order_id, func.sum(ConsumedItem.quantidade * InventoryItem.preco_custo))
            .join(InventoryItem, ConsumedItem.inventory_item_id == InventoryItem.id)
            .group_by(ConsumedItem.work_order_id).all()
        )
        margins = [(order.total_price or 0) - (order.custo_operacional or 0) - (costs_by_order.get(order.id) or 0)
                   for order in concluidas_list]
        losses_by_reason = (
            db.session.query(InventoryLoss.motivo, func.sum(InventoryLoss.quantidade), func.sum(InventoryLoss.valor_perda))
            .group_by(InventoryLoss.motivo).order_by(func.sum(InventoryLoss.valor_perda).desc()).all()
        )
        perdas_por_motivo = [{"motivo": reason or "Não informado", "quantidade": int(quantity or 0), "valorTotal": round(float(value or 0), 2)}
                            for reason, quantity, value in losses_by_reason]

        # 6. TENDÊNCIA MENSAL (RECEITA VS PREJUÍZO)
        tendencia = []
        agora = datetime.utcnow()
        for i in range(5, -1, -1):
            # Lógica de meses mais robusta
            month_index = agora.year * 12 + agora.month - 1 - i
            year, month = divmod(month_index, 12)
            inicio_mes = datetime(year, month + 1, 1)
            proximo_mes = (inicio_mes + timedelta(days=32)).replace(day=1)

            receita_m = (
                db.session.query(func.sum(WorkOrder.total_price))
                .filter(
                    WorkOrder.finished_at >= inicio_mes, WorkOrder.finished_at < proximo_mes,
                    WorkOrder.status.in_(["Concluído", "Entregue"]),
                    WorkOrder.deletada == False,
                )
                .scalar()
                or 0
            )

            perdas_m = (
                db.session.query(func.sum(InventoryLoss.valor_perda))
                .filter((InventoryLoss.created_at >= inicio_mes) & (InventoryLoss.created_at < proximo_mes))
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
                        float(receita_total - custo_total_pecas_vendidas - custos_operacionais_os), 2
                    ),
                    "custosOperacionais": round(float(custos_operacionais_os), 2),
                    "volumeConsertos": int(volume_concluidas),
                    "taxaSucesso": round(float(taxa_sucesso), 1),
                    "valorDesperdicio": round(float(valor_desperdicio), 2),
                    "pecasQuebradas": int(pecas_quebradas),
                    "totalItens": int(total_itens),
                    "porMarca": porMarca,
                    "perdasPorMotivo": perdas_por_motivo,
                    "skusAtivos": sum(1 for item in itens_estoque if item.quantidade > 0),
                    "ticketMedio": round(float(receita_total / volume_concluidas), 2) if volume_concluidas else 0,
                    "maiorMargemServico": round(float(max(margins)), 2) if margins else None,
                    "markupEstoque": round(float(lucro_potencial_estoque / patrimonio_total * 100), 1) if patrimonio_total else None,
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
            jsonify({"msg": "Não foi possível consultar os dados financeiros"}),
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
    minhas_ordens = WorkOrder.query.filter_by(client_id=user_id, deletada=False).order_by(WorkOrder.created_at.desc(), WorkOrder.id.desc()).all()

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
                    "scheduled_for": pytz.timezone("America/Sao_Paulo").localize(o.scheduled_date).isoformat() if o.scheduled_date else None,
                    "data_finalizacao": format_brazil_time(o.finished_at),
                    "total_price": o.total_price,
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
