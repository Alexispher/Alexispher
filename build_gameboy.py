import urllib.request
import os
import re

def main():
    print("Baixando gráfico de contribuições...")
    url = "https://ghchart.rshah.org/3a4818/Alexispher"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})

    try:
        with urllib.request.urlopen(req) as response:
            raw_data = response.read().decode('utf-8')
            
        # EXTRAÇÃO PRECISA: Pega apenas o grupo de retângulos (os quadrados das contribuições)
        # Isso remove todo o 'lixo' desnecessário que está inchando o seu arquivo
        match = re.search(r'<g[^>]*>.*?</g>', raw_data, re.DOTALL)
        if match:
            chart_content = match.group(0)
        else:
            raise ValueError("Não foi possível extrair o gráfico do SVG.")

        print("Lendo template...")
        with open("gameboy_template.svg", "r", encoding="utf-8") as f:
            template = f.read()

        print("Montando Gameboy limpo...")
        # Insere o gráfico limpo no template
        final_svg = template.replace("", f'<g transform="translate(95, 150) scale(0.28)">{chart_content}</g>')

        # Salva o arquivo final
        with open("gameboy_contrib.svg", "w", encoding="utf-8") as f:
            f.write(final_svg)
            
        # Verifica o tamanho final
        size_kb = os.path.getsize("gameboy_contrib.svg") / 1024
        print(f"SUCESSO! Tamanho do arquivo: {size_kb:.2f} KB")

    except Exception as e:
        print(f"ERRO: {e}")
        exit(1)

if __name__ == "__main__":
    main()
