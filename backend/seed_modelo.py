# seed_modelos.py
from app import db, app
from app.models import DeviceModel

def seed_database():
    modelos = [
        # --- APPLE (Os queridinhos da assistência) ---
        {"marca": "Apple", "nome": "iPhone 15 Pro Max", "codigo": "A3106"},
        {"marca": "Apple", "nome": "iPhone 15 Pro", "codigo": "A3102"},
        {"marca": "Apple", "nome": "iPhone 15", "codigo": "A3090"},
        {"marca": "Apple", "nome": "iPhone 14 Pro Max", "codigo": "A2896"},
        {"marca": "Apple", "nome": "iPhone 14 Pro", "codigo": "A2890"},
        {"marca": "Apple", "nome": "iPhone 14 Plus", "codigo": "A2886"},
        {"marca": "Apple", "nome": "iPhone 14", "codigo": "A2882"},
        {"marca": "Apple", "nome": "iPhone 13 Pro Max", "codigo": "A2643"},
        {"marca": "Apple", "nome": "iPhone 13 Pro", "codigo": "A2636"},
        {"marca": "Apple", "nome": "iPhone 13", "codigo": "A2633"},
        {"marca": "Apple", "nome": "iPhone 13 mini", "codigo": "A2628"},
        {"marca": "Apple", "nome": "iPhone 12 Pro Max", "codigo": "A2411"},
        {"marca": "Apple", "nome": "iPhone 12 Pro", "codigo": "A2407"},
        {"marca": "Apple", "nome": "iPhone 12", "codigo": "A2403"},
        {"marca": "Apple", "nome": "iPhone 12 mini", "codigo": "A2399"},
        {"marca": "Apple", "nome": "iPhone 11 Pro Max", "codigo": "A2161"},
        {"marca": "Apple", "nome": "iPhone 11 Pro", "codigo": "A2160"},
        {"marca": "Apple", "nome": "iPhone 11", "codigo": "A2111"},
        {"marca": "Apple", "nome": "iPhone XS Max", "codigo": "A2101"},
        {"marca": "Apple", "nome": "iPhone XS", "codigo": "A2097"},
        {"marca": "Apple", "nome": "iPhone XR", "codigo": "A1984"},
        {"marca": "Apple", "nome": "iPhone X", "codigo": "A1865"},
        {"marca": "Apple", "nome": "iPhone 8 Plus", "codigo": "A1864"},
        {"marca": "Apple", "nome": "iPhone 8", "codigo": "A1863"},
        {"marca": "Apple", "nome": "iPhone 7 Plus", "codigo": "A1661"},
        {"marca": "Apple", "nome": "iPhone 7", "codigo": "A1660"},
        {"marca": "Apple", "nome": "iPhone SE (2022)", "codigo": "A2783"},
        {"marca": "Apple", "nome": "iPhone SE (2020)", "codigo": "A2296"},

        # --- SAMSUNG (Linha S, A e M - O volume do Brasil) ---
        {"marca": "Samsung", "nome": "Galaxy S24 Ultra", "codigo": "SM-S928"},
        {"marca": "Samsung", "nome": "Galaxy S24 Plus", "codigo": "SM-S926"},
        {"marca": "Samsung", "nome": "Galaxy S24", "codigo": "SM-S921"},
        {"marca": "Samsung", "nome": "Galaxy S23 Ultra", "codigo": "SM-S918"},
        {"marca": "Samsung", "nome": "Galaxy S23 Plus", "codigo": "SM-S916"},
        {"marca": "Samsung", "nome": "Galaxy S23", "codigo": "SM-S911"},
        {"marca": "Samsung", "nome": "Galaxy S23 FE", "codigo": "SM-S711"},
        {"marca": "Samsung", "nome": "Galaxy A55 5G", "codigo": "SM-A556"},
        {"marca": "Samsung", "nome": "Galaxy A54 5G", "codigo": "SM-A546"},
        {"marca": "Samsung", "nome": "Galaxy A35 5G", "codigo": "SM-A356"},
        {"marca": "Samsung", "nome": "Galaxy A34 5G", "codigo": "SM-A346"},
        {"marca": "Samsung", "nome": "Galaxy A25 5G", "codigo": "SM-A256"},
        {"marca": "Samsung", "nome": "Galaxy A15 5G", "codigo": "SM-A156"},
        {"marca": "Samsung", "nome": "Galaxy A15", "codigo": "SM-A155"},
        {"marca": "Samsung", "nome": "Galaxy A14", "codigo": "SM-A145"},
        {"marca": "Samsung", "nome": "Galaxy M55", "codigo": "SM-M556"},
        {"marca": "Samsung", "nome": "Galaxy M54 5G", "codigo": "SM-M546"},
        {"marca": "Samsung", "nome": "Galaxy M34 5G", "codigo": "SM-M346"},
        {"marca": "Samsung", "nome": "Galaxy M14", "codigo": "SM-M146"},
        {"marca": "Samsung", "nome": "Galaxy S22 Ultra", "codigo": "SM-S908"},
        {"marca": "Samsung", "nome": "Galaxy S22 Plus", "codigo": "SM-S906"},
        {"marca": "Samsung", "nome": "Galaxy S22", "codigo": "SM-S901"},
        {"marca": "Samsung", "nome": "Galaxy S21 Ultra", "codigo": "SM-G998"},
        {"marca": "Samsung", "nome": "Galaxy S21 Plus", "codigo": "SM-G996"},
        {"marca": "Samsung", "nome": "Galaxy S21 FE", "codigo": "SM-G990"},
        {"marca": "Samsung", "nome": "Galaxy S21", "codigo": "SM-G991"},
        {"marca": "Samsung", "nome": "Galaxy S20 FE", "codigo": "SM-G780"},
        {"marca": "Samsung", "nome": "Galaxy A05s", "codigo": "SM-A057"},
        {"marca": "Samsung", "nome": "Galaxy A05", "codigo": "SM-A055"},
        {"marca": "Samsung", "nome": "Galaxy A04e", "codigo": "SM-A042"},

        # --- MOTOROLA (Onde a tela quebra e a bateria incha) ---
        {"marca": "Motorola", "nome": "Edge 50 Ultra", "codigo": "XT2401"},
        {"marca": "Motorola", "nome": "Edge 50 Pro", "codigo": "XT2403"},
        {"marca": "Motorola", "nome": "Edge 50 Fusion", "codigo": "XT2405"},
        {"marca": "Motorola", "nome": "Moto G84 5G", "codigo": "XT2347"},
        {"marca": "Motorola", "nome": "Moto G54 5G", "codigo": "XT2343"},
        {"marca": "Motorola", "nome": "Moto G34 5G", "codigo": "XT2339"},
        {"marca": "Motorola", "nome": "Moto G24", "codigo": "XT2333"},
        {"marca": "Motorola", "nome": "Moto G24 Power", "codigo": "XT2335"},
        {"marca": "Motorola", "nome": "Edge 40 Neo", "codigo": "XT2307"},
        {"marca": "Motorola", "nome": "Edge 40", "codigo": "XT2303"},
        {"marca": "Motorola", "nome": "Moto G14", "codigo": "XT2341"},
        {"marca": "Motorola", "nome": "Moto G23", "codigo": "XT2233"},
        {"marca": "Motorola", "nome": "Moto G13", "codigo": "XT2231"},
        {"marca": "Motorola", "nome": "Moto E13", "codigo": "XT2321"},
        {"marca": "Motorola", "nome": "Moto E22", "codigo": "XT2239"},
        {"marca": "Motorola", "nome": "Moto G73 5G", "codigo": "XT2237"},
        {"marca": "Motorola", "nome": "Moto G53 5G", "codigo": "XT2335"},
        {"marca": "Motorola", "nome": "Moto G60", "codigo": "XT2135"},
        {"marca": "Motorola", "nome": "Moto G52", "codigo": "XT2221"},
        {"marca": "Motorola", "nome": "Moto G42", "codigo": "XT2231"},
        {"marca": "Motorola", "nome": "Moto G32", "codigo": "XT2235"},
        {"marca": "Motorola", "nome": "Moto G9 Play", "codigo": "XT2083"},

        # --- XIAOMI (Redmi e Poco - O terror do mercado cinza) ---
        {"marca": "Xiaomi", "nome": "Redmi Note 13 Pro 5G", "codigo": "23117RA68G"},
        {"marca": "Xiaomi", "nome": "Redmi Note 13 Pro", "codigo": "2312DRA50G"},
        {"marca": "Xiaomi", "nome": "Redmi Note 13 5G", "codigo": "23124RA7EO"},
        {"marca": "Xiaomi", "nome": "Redmi Note 13", "codigo": "23129RA5FL"},
        {"marca": "Xiaomi", "nome": "Redmi Note 12 Pro", "codigo": "22101316G"},
        {"marca": "Xiaomi", "nome": "Redmi Note 12 4G", "codigo": "23021RAA2Y"},
        {"marca": "Xiaomi", "nome": "Redmi 13C", "codigo": "23106RN0DA"},
        {"marca": "Xiaomi", "nome": "Redmi 12C", "codigo": "2212ARNC4L"},
        {"marca": "Xiaomi", "nome": "Poco X6 Pro", "codigo": "2311DRK48G"},
        {"marca": "Xiaomi", "nome": "Poco X6", "codigo": "23122PCD1G"},
        {"marca": "Xiaomi", "nome": "Poco M6 Pro", "codigo": "2312FPCA6G"},
        {"marca": "Xiaomi", "nome": "Poco M6", "codigo": "23124PC87G"},
        {"marca": "Xiaomi", "nome": "Xiaomi 13T Pro", "codigo": "23078PND5G"},
        {"marca": "Xiaomi", "nome": "Xiaomi 13T", "codigo": "2306EPN60G"},
        {"marca": "Xiaomi", "nome": "Xiaomi 13", "codigo": "2211133G"},
        {"marca": "Xiaomi", "nome": "Xiaomi 12 Lite", "codigo": "2203129G"},
        
        # --- GOOGLE PIXEL (Os queridinhos dos desenvolvedores) ---
        {"marca": "Google", "nome": "Pixel 8 Pro", "codigo": "GC3VE"},
        {"marca": "Google", "nome": "Pixel 8", "codigo": "GZPFO"},
        {"marca": "Google", "nome": "Pixel 7 Pro", "codigo": "GE2AE"},
        {"marca": "Google", "nome": "Pixel 7", "codigo": "GQML3"},
        {"marca": "Google", "nome": "Pixel 6a", "codigo": "GX7AS"},
        {"marca": "Google", "nome": "Pixel 6 Pro", "codigo": "GLU0G"},
        {"marca": "Google", "nome": "Pixel 6", "codigo": "GB7N6"},
        
        # --- REALME (A ascensão no Brasil) ---
        {"marca": "Realme", "nome": "Realme 11 Pro", "codigo": "RMX3771"},
        {"marca": "Realme", "nome": "Realme 11", "codigo": "RMX3761"},
        {"marca": "Realme", "nome": "Realme 10 Pro", "codigo": "RMX3661"},
        {"marca": "Realme", "nome": "Realme 10", "codigo": "RMX3630"},
        {"marca": "Realme", "nome": "Realme C55", "codigo": "RMX3710"},
        {"marca": "Realme", "nome": "Realme C53", "codigo": "RMX3762"},
        {"marca": "Realme", "nome": "Realme C51", "codigo": "RMX3830"},
        
        # --- ASUS (Os gamers) ---
        {"marca": "Asus", "nome": "ROG Phone 8", "codigo": "AI2401"},
        {"marca": "Asus", "nome": "ROG Phone 7", "codigo": "AI2205"},
        {"marca": "Asus", "nome": "Zenfone 10", "codigo": "AI2302"},
        {"marca": "Asus", "nome": "Zenfone 9", "codigo": "AI2202"},
        
        # --- OPPO (Crescendo no mercado) ---
        {"marca": "Oppo", "nome": "Reno 11", "codigo": "CPH2597"},
        {"marca": "Oppo", "nome": "Reno 10 Pro", "codigo": "CPH2525"},
        {"marca": "Oppo", "nome": "Reno 10", "codigo": "CPH2527"},
        {"marca": "Oppo", "nome": "A78", "codigo": "CPH2483"},
        {"marca": "Oppo", "nome": "A58", "codigo": "CPH2577"}
    ]

    with app.app_context():
        for m in modelos:
            # Evita duplicatas se rodar o script 2x
            existente = DeviceModel.query.filter_by(codigo_tecnico=m['codigo']).first()
            if not existente:
                novo = DeviceModel(
                    marca=m['marca'], 
                    nome_comercial=m['nome'], 
                    codigo_tecnico=m['codigo']
                )
                db.session.add(novo)
        
        db.session.commit()
        print(f"✅ Sucesso: {len(modelos)} modelos populados na Engine_Search!")

if __name__ == "__main__":
    seed_database()