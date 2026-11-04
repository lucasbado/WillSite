"""Ping externo ao Render. Execute em uma máquina que permaneça ligada."""
import argparse
import logging
import os
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


def ping(url, timeout):
    request = Request(url, headers={"User-Agent": "WillSite-Healthcheck/1.0", "Cache-Control": "no-cache"})
    try:
        with urlopen(request, timeout=timeout) as response:
            if response.status != 200:
                logging.warning("Healthcheck retornou HTTP %s", response.status)
                return False
        logging.info("Healthcheck OK")
        return True
    except (HTTPError, URLError, TimeoutError, OSError) as error:
        logging.warning("Falha no healthcheck: %s", error)
        return False


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default=os.getenv("KEEP_ALIVE_URL"), help="URL pública terminando em /healthz")
    parser.add_argument("--interval", type=int, default=600, help="Intervalo em segundos (padrão: 600)")
    parser.add_argument("--timeout", type=int, default=75, help="Timeout para permitir partida a frio")
    parser.add_argument("--once", action="store_true", help="Executa uma vez e devolve código de saída")
    args = parser.parse_args()
    url = urlsplit(args.url or "")
    if url.scheme not in {"http", "https"} or not url.hostname or url.username or url.password or url.query or url.fragment:
        parser.error("Informe --url ou KEEP_ALIVE_URL com uma URL HTTP(S) sem credenciais ou parâmetros")
    if not 1 <= args.interval < 900 or not 1 <= args.timeout <= 120:
        parser.error("Use intervalo de 1 a 899 segundos e timeout de 1 a 120 segundos")
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    try:
        while True:
            success = ping(args.url, args.timeout)
            if args.once:
                return 0 if success else 1
            time.sleep(args.interval)
    except KeyboardInterrupt:
        logging.info("Healthcheck encerrado")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
