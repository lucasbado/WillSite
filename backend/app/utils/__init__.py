from flask_mail import Message
from threading import Thread
from flask import current_app
import urllib.parse
import os


def send_async_email(app, msg):
    """Função interna para disparar o e-mail em background com log detalhado"""
    with app.app_context():
        try:
            from .. import mail
            mail.send(msg)
            print(f"SGAT LOG: E-mail enviado com sucesso para {msg.recipients}")
        except Exception as e:
            import traceback
            print("SGAT ERROR: Falha crítica no envio de e-mail.")
            print(f"Detalhe do erro: {str(e)}")
            traceback.print_exc()


def enviar_notificacao_status(
    email_destinatario, nome_cliente, os_id, modelo, status, laudo=None, pdf_blob=None
):
    msg = Message(
        subject=f"SGAT - Atualização: OS #{os_id} [{status}]",
        recipients=[email_destinatario],
        # Garante que use o e-mail configurado no seu .env
        sender=current_app.config.get("MAIL_DEFAULT_SENDER")
        or current_app.config.get("MAIL_USERNAME"),
    )
    base_url = "https://fidel-unvictorious-vicenta.ngrok-free.dev"
    link_publico = f"{base_url}/cliente/os/{os_id}"

    colors = {
        "Concluído": "#10b981",
        "Agendado": "#2563eb",
        "Pendente": "#f59e0b",
        "default": "#64748b",
    }
    status_color = colors.get(status, colors["default"])

    # O seu template HTML excelente aqui...
    msg.html = f"""
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="padding: 40px 10px; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 32px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                
                <div style="background: #0f172a; padding: 40px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -1.5px; font-style: italic; text-transform: uppercase;">
                        SGAT<span style="color: #2563eb;">.</span>
                    </h1>
                    <p style="color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; margin-top: 8px; font-weight: 700;">Hardware & System Engineering</p>
                </div>

                <div style="padding: 40px;">
                    <p style="font-size: 16px; color: #1e293b; margin-bottom: 24px;">Olá, <strong>{nome_cliente}</strong>.</p>
                    <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 32px;">
                        Houve uma atualização no processamento técnico do seu dispositivo <strong>{modelo}</strong> (OS #{os_id}).
                    </p>

                   
                    <div style="background-color: #f8fafc; border-radius: 24px; padding: 32px; border: 1px solid #f1f5f9; text-align: center; margin-bottom: 32px;">
                        <p style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 1.5px; margin: 0 0 12px 0;">Estado Atual do Serviço</p>
                        <div style="display: inline-block; padding: 8px 24px; border-radius: 100px; background-color: {status_color}15; color: {status_color}; font-size: 18px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase; border: 1px solid {status_color}30;">
                            {status}
                        </div>
                    </div>

               
                    {f'''
                    <div style="border-left: 4px solid {status_color}; background-color: #ffffff; padding: 20px; border-radius: 0 16px 16px 0; margin-bottom: 32px; border-top: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;">
                        <p style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; margin: 0 0 8px 0;">Relatório de Execução</p>
                        <p style="font-size: 14px; color: #334155; line-height: 1.6; font-style: italic; margin: 0;">"{laudo}"</p>
                    </div>
                    ''' if laudo else ''}

                    <div style="text-align: center; border-top: 1px solid #f1f5f9; padding-top: 32px; margin-top: 32px;">
                        <p style="font-size: 12px; color: #94a3b8; line-height: 1.6; margin-bottom: 20px;">
                            Para ver detalhes, orçamentos ou o laudo completo, acesse seu painel:
                        </p>
                        <a href="{link_publico}" 
                           style="display: inline-block; padding: 16px 32px; background-color: #0f172a; color: #ffffff; text-decoration: none; border-radius: 16px; font-size: 14px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.2);">
                            Acessar Dashboard
                        </a>
                    </div>
                </div>

              
                <div style="background: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #f1f5f9;">
                    <p style="font-size: 10px; color: #cbd5e1; text-transform: uppercase; letter-spacing: 1px; margin: 0;">
                        SGAT Systems Analyst Lucas • São Paulo, SP
                    </p>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 24px;">
                <p style="font-size: 11px; color: #cbd5e1;">Este é um e-mail automático. Por favor, não responda.</p>
            </div>
        </div>
    </body>
    </html>
    """
    # Lógica de Anexo
    if pdf_blob:
        try:
            msg.attach(f"Recibo_SGAT_OS_{os_id}.pdf", "application/pdf", pdf_blob)
            print(f"SGAT LOG: PDF anexado à OS #{os_id}")
        except Exception as e:
            print(f"SGAT ERROR: Falha ao anexar PDF: {e}")

    app = current_app._get_current_object()
    Thread(target=send_async_email, args=(app, msg)).start()


def enviar_email_verificacao(user, token):
    """
    Envia o e-mail de ativação de conta de forma assíncrona.
    """
    frontend_url = os.getenv("FRONTEND_URL", "https://cidinho.onrender.com")
    verify_url = f"{frontend_url}/verify-email?token={token}"

    msg = Message(
        subject="Ative sua conta no SGAT",
        recipients=[user.email],
        sender=current_app.config.get("MAIL_DEFAULT_SENDER")
        or current_app.config.get("MAIL_USERNAME"),
    )

    msg.html = f"""
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: sans-serif;">
        <div style="padding: 40px 10px; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 32px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <div style="background: #0f172a; padding: 40px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -1.5px; font-style: italic; text-transform: uppercase;">
                        SGAT<span style="color: #2563eb;">.</span>
                    </h1>
                </div>
                <div style="padding: 40px; text-align: center;">
                    <h2 style="color: #1e293b; margin-top: 0; font-size: 20px;">Bem-vindo, {user.nome_completo}!</h2>
                    <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin-bottom: 32px;">
                        Sua conta no SGAT foi criada com sucesso. Para começar a usar o sistema, por favor ative sua conta clicando no botão abaixo.
                    </p>
                    <div style="margin-bottom: 32px;">
                        <a href="{verify_url}" 
                           style="display: inline-block; padding: 16px 32px; background-color: #0f172a; color: #ffffff; text-decoration: none; border-radius: 16px; font-size: 14px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.2);">
                            Ativar Minha Conta
                        </a>
                    </div>
                    <p style="color: #94a3b8; font-size: 11px;">
                        Este link é válido por 24 horas. Se você não solicitou este cadastro, ignore este e-mail.
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

    # PARA TESTE: Envio síncrono (sem Thread) para forçar o erro aparecer nos logs/tela
    from .. import mail
    try:
        mail.send(msg)
        print(f"SGAT DEBUG: E-mail enviado com SUCESSO para {user.email}")
    except Exception as e:
        print(f"SGAT DEBUG ERROR: Falha ao enviar e-mail síncrono: {str(e)}")
        raise e # Força o erro 500 para vermos a mensagem técnica


def gerar_link_whatsapp(telefone, nome_cliente, os_id, modelo, status, laudo=None):
    if not telefone:
        return ""

    # 1. Limpeza radical: mantém apenas números
    phone_clean = "".join(filter(str.isdigit, str(telefone)))

    # 2. Lógica de Normalização (Brasil)
    # 10 dígitos: DDD + Número antigo (sem 9) -> Adiciona 55
    # 11 dígitos: DDD + Número com 9 -> Adiciona 55
    if len(phone_clean) <= 11:
        phone_clean = f"55{phone_clean}"

    # 3. Se tiver 12 ou 13 dígitos, verificamos se o DDI 55 já está lá.
    # Se tiver 13 e não começar com 55, algo está muito errado com o dado.
    elif len(phone_clean) == 13 and not phone_clean.startswith("55"):
        # Caso raro de número internacional ou erro de input,
        # aqui você pode optar por logar um erro.
        pass

    # --- MONTAGEM DA MENSAGEM ---
    base_url = "https://fidel-unvictorious-vicenta.ngrok-free.dev"
    link_recibo = f"{base_url}/cliente/os/{os_id}"

    msg_corpo = (
        f"🚀 *SGAT - INFORMATIVO*\n\n"
        f"Olá, *{nome_cliente}*!\n"
        f"O status do seu *{modelo}* é:\n"
        f"👉 *{status.upper()}*\n\n"
        f"🔗 *RECIBO DIGITAL:*\n{link_recibo}"
    )

    msg_encoded = urllib.parse.quote(msg_corpo)

    # O PULO DO GATO: wa.me é melhor para Mobile Deep Linking
    return f"https://wa.me/{phone_clean}?text={msg_encoded}"


def notificar_cliente_multicanal(os_servico, status, laudo=None, pdf_blob=None):
    """
    Dispara notificações por e-mail (Assíncrono) e gera o link de WhatsApp.
    """
    cliente = os_servico.client

    # 1. Dispara o E-mail que já está funcionando (Thread separada)
    enviar_notificacao_status(
        email_destinatario=cliente.email,
        nome_cliente=cliente.nome_completo,
        os_id=os_servico.id,
        modelo=os_servico.device_model,
        status=status,
        laudo=laudo,
        pdf_blob=pdf_blob,
    )

    # 2. Retorna o link do WhatsApp para o Admin usar se quiser reforçar
    return gerar_link_whatsapp(
        telefone=cliente.telefone,
        nome_cliente=cliente.nome_completo,
        os_id=os_servico.id,
        modelo=os_servico.device_model,
        status=status,
        laudo=laudo,
    )

    # def enviar_whatsapp_automatico(telefone, mensagem):
    #     from twilio.rest import Client
    #     client = Client(ACCOUNT_SID, AUTH_TOKEN)
    #     client.messages.create(
    #         from_='whatsapp:+14155238886', # Seu número oficial
    #         body=mensagem,
    #         to=f'whatsapp:+{telefone}'
    #     )
