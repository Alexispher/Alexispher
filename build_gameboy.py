import urllib.request
import os

def main():
    # URL do gráfico de contribuições
    url = "https://ghchart.rshah.org/3a4818/Alexispher"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})

    try:
        print("Baixando gráfico...")
        with urllib.request.urlopen(req) as response:
            full_svg = response.read().decode('utf-8')
            
        # Extrai apenas a parte interna do gráfico, ignorando o cabeçalho XML
        start = full_svg.find('<svg')
        end = full_svg.rfind('</svg>') + 6
        chart = full_svg[start:end]
        
        # Limpa o que for duplicado para garantir que o tamanho fique pequeno
        chart = chart.replace('<?xml version="1.0" standalone="no"?>', '')

        print("Lendo o template do Gameboy...")
        with open("gameboy_template.svg", "r", encoding="utf-8") as f:
            template = f.read()

        # Insere o gráfico na posição correta
        final_svg = template.replace("", f'<g transform="translate(85, 140) scale(0.30)">{chart}</g>')

        with open("gameboy_contrib.svg", "w", encoding="utf-8") as f:
            f.write(final_svg)
            
        print("SUCESSO: gameboy_contrib.svg gerado e otimizado!")

    except Exception as e:
        print(f"ERRO: {e}")
        exit(1)

if __name__ == "__main__":
    main()
