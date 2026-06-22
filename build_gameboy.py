import urllib.request
import os

def main():
    print("Iniciando script...")
    url = "https://ghchart.rshah.org/3a4818/Alexispher"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})

    try:
        print("Baixando dados do Github...")
        with urllib.request.urlopen(req) as response:
            full_svg = response.read().decode('utf-8')
            print("Gráfico baixado!")
            
        start = full_svg.find('<svg')
        end = full_svg.rfind('</svg>') + 6
        chart = full_svg[start:end]
        
        print("Verificando template...")
        if not os.path.exists("gameboy_template.svg"):
            print("ERRO: O arquivo gameboy_template.svg NÃO EXISTE na raiz!")
            return

        with open("gameboy_template.svg", "r", encoding="utf-8") as f:
            template = f.read()

        print("Montando o SVG final...")
        final_svg = template.replace("", f'<g transform="translate(85, 140) scale(0.30)">{chart}</g>')

        with open("gameboy_contrib.svg", "w", encoding="utf-8") as f:
            f.write(final_svg)
            
        print("Sucesso! Arquivo gameboy_contrib.svg criado.")

    except Exception as e:
        print(f"ERRO: {e}")
        exit(1)

if __name__ == "__main__":
    main()
