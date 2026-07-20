import sys
import os

# Adiciona o diretório atual ao path para importar o app
sys.path.append(os.getcwd())

from app import create_app

app = create_app()

print("\n--- DEBUG VENDORS ROUTES ---")
for rule in app.url_map.iter_rules():
    if "vendors" in str(rule):
        methods = ", ".join(sorted(list(rule.methods)))
        print(f"URL: {rule} | Methods: {methods} | Endpoint: {rule.endpoint} | Strict Slashes: {rule.strict_slashes}")
print("---------------------------\n")
