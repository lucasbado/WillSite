from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import check_password_hash, generate_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from ..models import User, db, WorkOrder
from sqlalchemy import func
from ..utils import enviar_notificacao_status
import random
import os
from itsdangerous import URLSafeTimedSerializer
from flask_mail import Message
from .. import mail

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data.get("email")).first()

    if user and check_password_hash(user.password_hash, data.get("password")):
        # Adicionamos o "role" no identity para facilitar no Front-end e Chatbot
        access_token = create_access_token(
            identity=str(user.id), additional_claims={"role": user.role}
        )
        return (
            jsonify(
                {
                    "access_token": access_token,
                    "role": user.role,
                    "user_name": user.username,
                    "user_id": user.id,
                }
            ),
            200,
        )

    return jsonify({"msg": "E-mail ou senha inválidos"}), 401

@auth_bp.route('/perfil', methods=['GET'])
@jwt_required()
def obter_perfil():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"msg": "Usuário não encontrado"}), 404
        
    return jsonify({
        "nome_completo": user.nome_completo,
        "email": user.email,
        "cpf": user.cpf,
        "cep": user.cep,
        "endereco": user.endereco,
        "telefone": user.telefone,
        "role": user.role
    }), 200

# Rota para atualizar os dados do perfil (PATCH)
@auth_bp.route('/perfil/atualizar', methods=['PATCH'])
@jwt_required()
def atualizar_perfil():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.get_json()

    if not user:
        return jsonify({"msg": "Usuário não encontrado"}), 404

    # Atualiza apenas campos permitidos (nome, email, cep, endereço)
    # Mantemos o valor atual se o campo não for enviado no JSON
    user.nome_completo = data.get('nome_completo', user.nome_completo)
    user.email = data.get('email', user.email)
    user.cep = data.get('cep', user.cep)
    user.endereco = data.get('endereco', user.endereco)
    user.telefone = data.get('telefone', user.telefone) 

    try:
        db.session.commit()
        return jsonify({"msg": "Perfil atualizado com sucesso!"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Erro ao atualizar dados no banco"}), 500

@auth_bp.route('/admin/clientes', methods=['GET'])
@jwt_required()
def listar_clientes_admin():
    # Apenas admin pode ver a lista completa
    # Usamos um join para contar as OS de cada usuário automaticamente
    usuarios = db.session.query(
        User, 
        func.count(WorkOrder.id).label('total_os')
    ).outerjoin(WorkOrder).group_by(User.id).all()

    lista_clientes = []
    for user, total_os in usuarios:
        if user.role != 'admin':
            lista_clientes.append({
                "id": user.id,
                "nome": user.nome_completo,
                "email": user.email,
                "cpf": user.cpf,
                "telefone": user.telefone, # No seu caso, o username é o telefone/contato
                "total_os": total_os,
                "endereco": f"{user.endereco}, CEP: {user.cep}" if user.endereco else "Não informado",
                "cep": user.cep
            })
            
    return jsonify(lista_clientes), 200

@auth_bp.route('/admin/cliente/<int:user_id>', methods=['GET'])
@jwt_required()
def detalhes_cliente_admin(user_id):
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({"msg": "Acesso negado"}), 403

    user = User.query.get_or_404(user_id)
    ordens = WorkOrder.query.filter_by(client_id=user_id).order_by(WorkOrder.created_at.desc()).all()

    historico_completo = []
    for o in ordens:
        # Puxamos as peças de CADA ordem de serviço
        pecas_da_os = []
        for item in o.items_used:
            pecas_da_os.append({
                "nome": item.inventory_item.nome,
                "quantidade": item.quantidade
            })

        historico_completo.append({
            "id": o.id,
            "modelo": o.device_model,
            "status": o.status,
            "problema": o.problem_description,
            "laudo_tecnico": o.laudo_tecnico, # Agora o laudo vai junto
            "data": o.created_at.strftime('%d/%m/%Y'),
            "pecas": pecas_da_os, # Agora 'pecas' está definido aqui!
            "deletada": o.deletada
        })

    return jsonify({
        "info": {
            "nome": user.nome_completo,
            "email": user.email,
            "telefone": user.telefone,
            "cpf": user.cpf,
            "endereco": user.endereco,
            "cep": user.cep
        },
        "historico": historico_completo
    }), 200


@auth_bp.route('/verificar-cpf/<string:cpf>', methods=['GET'])
def verificar_cpf(cpf):
    # Remove qualquer máscara que possa ter vindo na URL
    cpf_limpo = ''.join(filter(str.isdigit, cpf))
    
    user = User.query.filter_by(cpf=cpf_limpo).first()
    
    if user:
        return jsonify({
            "existe": True, 
            "msg": "Este CPF já possui um cadastro ativo."
        }), 200
    
    return jsonify({"existe": False}), 200

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    # Verifique se os nomes batem com o models.py
    novo_usuario = User(
        username=data.get("username"),  # Em vez de 'name'
        nome_completo=data.get("nome_completo"),
        email=data.get("email"),
        cpf=data.get("cpf"),
        cep=data.get("cep"),
        endereco=data.get("endereco"),
        role="cliente",
        telefone=data.get("telefone"),
    )
    novo_usuario.set_password(data.get("password"))

    db.session.add(novo_usuario)
    db.session.commit()

    return jsonify({"msg": "Usuário criado!"}), 201


# --- NOVA ROTA: LISTAR TODOS OS USUÁRIOS (Para o User Management) ---
@auth_bp.route('/admin/usuarios', methods=['GET'])
@jwt_required()
def listar_todos_usuarios():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({"msg": "Acesso negado"}), 403

    # Busca todos os usuários
    usuarios = User.query.all()
    
    lista = []
    for u in usuarios:
        lista.append({
            "id": u.id,
            "nome_completo": u.nome_completo,
            "email": u.email,
            "cpf": u.cpf,
            "role": u.role,
            "telefone": u.telefone  # Ou u.telefone se você tiver esse campo
        })
    return jsonify(lista), 200

# --- NOVA ROTA: REGISTRAR USUÁRIO PELO ADMIN ---
@auth_bp.route('/admin/usuarios/registrar', methods=['POST'])
@jwt_required()
def registrar_usuario_admin():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({"msg": "Acesso negado"}), 403

    data = request.get_json()

    # Validações básicas
    if not data.get('email') or not data.get('password') or not data.get('nome_completo') or not data.get('cpf'):
        return jsonify({"msg": "Campos obrigatórios ausentes"}), 400

    # Verifica se já existe
    if User.query.filter_by(email=data['email']).first():
        return jsonify({"msg": "Este e-mail já está cadastrado"}), 400

    if User.query.filter_by(cpf=data['cpf']).first():
        return jsonify({"msg": "Este CPF já está cadastrado"}), 400

    try:
        novo_usuario = User(
            username=data.get("username", data.get("nome_completo").split()[0] + str(random.randint(100, 999))),
            nome_completo=data.get("nome_completo"),
            email=data.get("email"),
            cpf=data.get("cpf"),
            role=data.get("role", "cliente"),
            telefone=data.get("telefone"),
            cep=data.get("cep"),
            endereco=data.get("endereco")
        )
        novo_usuario.set_password(data.get("password"))

        db.session.add(novo_usuario)
        db.session.commit()

        return jsonify({"msg": "Usuário criado com sucesso!"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": f"Erro ao criar usuário: {str(e)}"}), 500


# --- NOVA ROTA: DELETAR USUÁRIO ---
@auth_bp.route('/admin/usuarios/<int:user_id>', methods=['DELETE'], strict_slashes=False)
@jwt_required()
def deletar_usuario_admin(user_id):
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({"msg": "Acesso negado"}), 403

    user = User.query.get_or_404(user_id)
    
    # Impede que o admin delete a si mesmo
    if str(user.id) == get_jwt_identity():
        return jsonify({"msg": "Você não pode deletar sua própria conta"}), 400

    try:
        # Nota: Se houver OS vinculadas, você pode ter erro de IntegrityError
        # O ideal é que o banco esteja configurado com ON DELETE CASCADE
        db.session.delete(user)
        db.session.commit()
        return jsonify({"msg": "Usuário removido com sucesso"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Erro: Este usuário possui ordens de serviço vinculadas."}), 400


# --- RECUPERAÇÃO DE SENHA ---

@auth_bp.route('/forgot-password', methods=['POST'], strict_slashes=False)
def forgot_password():
    data = request.get_json()
    email = data.get('email')

    user = User.query.filter_by(email=email).first()
    if not user:
        # Por segurança, retornamos 200 mesmo se o e-mail não existir
        # para evitar "email harvesting"
        return jsonify({"msg": "Se este e-mail estiver cadastrado, um link de recuperação será enviado."}), 200

    # Gera token seguro válido por 1 hora (3600s)
    s = URLSafeTimedSerializer(current_app.config["JWT_SECRET_KEY"])
    token = s.dumps(user.email, salt='password-reset-salt')

    # URL do frontend (idealmente viria de env var)
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    reset_url = f"{frontend_url}/reset-password?token={token}"

    try:
        msg = Message(
            "Recuperação de Senha - SGAT",
            sender=current_app.config.get("MAIL_DEFAULT_SENDER"),
            recipients=[user.email],
            body=f"Olá {user.nome_completo},\n\nPara redefinir sua senha, clique no link abaixo:\n{reset_url}\n\nEste link expira em 1 hora.\n\nSe você não solicitou isso, ignore este e-mail."
        )
        mail.send(msg)
        return jsonify({"msg": "Link de recuperação enviado para o seu e-mail."}), 200
    except Exception as e:
        print(f"Erro ao enviar e-mail: {e}")
        return jsonify({"msg": "Erro ao enviar e-mail de recuperação. Tente novamente mais tarde."}), 500


@auth_bp.route('/reset-password', methods=['POST'], strict_slashes=False)
def reset_password():
    data = request.get_json()
    token = data.get('token')
    new_password = data.get('password')

    if not token or not new_password:
        return jsonify({"msg": "Dados ausentes"}), 400

    s = URLSafeTimedSerializer(current_app.config["JWT_SECRET_KEY"])
    try:
        # Valida o token e extrai o e-mail
        email = s.loads(token, salt='password-reset-salt', max_age=3600)
    except Exception:
        return jsonify({"msg": "O link de recuperação é inválido ou expirou."}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"msg": "Usuário não encontrado."}), 404

    try:
        user.set_password(new_password)
        db.session.commit()
        return jsonify({"msg": "Senha atualizada com sucesso! Faça login novamente."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Erro ao atualizar senha no banco de dados."}), 500

