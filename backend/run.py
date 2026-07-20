from app import create_app

app = create_app()

if __name__ == "__main__":
    # O host 0.0.0.0 é obrigatório para o ngrok enxergar o Flask
    app.run(host="0.0.0.0", port=5001, debug=True, use_reloader=True)
