import urllib.request
import os

def main():
    # Cores nativas do Gameboy
    url = "https://ghchart.rshah.org/3a4818/Alexispher"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})

    try:
        print("Baixando as contribuicoes...")
        with urllib.request.urlopen(req) as response:
            svg_chart = response.read().decode('utf-8')
            
        if "<?xml" in svg_chart:
            svg_chart = svg_chart.split("?>")[1]

        print("Lendo o template...")
        if not os.path.exists("gameboy_template.svg"):
            raise FileNotFoundError("O arquivo 'gameboy_template.svg' nao foi encontrado no repositorio!")
            
        with open("gameboy_template.svg", "r", encoding="utf-8") as f:
            template = f.read()

        print("Gerando imagem...")
        # Incorpora o grafico na tela
        chart_group = f'<g transform="translate(85, 140) scale(0.31)">{svg_chart}</g>'
        final_svg = template.replace("", chart_group)

        with open("gameboy_contrib.svg", "w", encoding="utf-8") as f:
            f.write(final_svg)
            
        print("SUCESSO: gameboy_contrib.svg gerado!")

    except Exception as e:
        print(f"ERRO FATAL: {e}")
        exit(1) # Força o erro aparecer vermelho no Actions para podermos ler

if __name__ == "__main__":
    main()
