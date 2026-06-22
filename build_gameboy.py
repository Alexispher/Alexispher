import urllib.request
import os

def main():
    url = "https://ghchart.rshah.org/3a4818/Alexispher"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})

    try:
        print("Baixando as contribuicoes...")
        with urllib.request.urlopen(req) as response:
            svg_chart = response.read().decode('utf-8')
            
        # Pega SÓ o que interessa (limpa o lixo que causou o arquivo de 182MB)
        if "<svg" in svg_chart and "</svg>" in svg_chart:
            svg_chart = svg_chart[svg_chart.index("<svg"):svg_chart.rindex("</svg>") + 6]
        else:
            raise ValueError("O grafico baixado nao e um SVG valido.")

        print("Lendo o template...")
        with open("gameboy_template.svg", "r", encoding="utf-8") as f:
            template = f.read()

        print("Gerando imagem...")
        # Usa um scale ligeiramente menor e centraliza
        chart_group = f'<g transform="translate(85, 140) scale(0.30)">{svg_chart}</g>'
        final_svg = template.replace("", chart_group)

        # Checa o tamanho antes de salvar na memoria (limite artificial de 2MB)
        tamanho_mb = len(final_svg.encode('utf-8')) / (1024 * 1024)
        print(f"Tamanho do arquivo gerado: {tamanho_mb:.2f} MB")
        
        if tamanho_mb > 10:
            raise ValueError(f"O arquivo SVG ficou grande demais ({tamanho_mb:.2f} MB)! Abortando.")

        with open("gameboy_contrib.svg", "w", encoding="utf-8") as f:
            f.write(final_svg)
            
        print("SUCESSO: gameboy_contrib.svg gerado!")

    except Exception as e:
        print(f"ERRO FATAL: {e}")
        exit(1)

if __name__ == "__main__":
    main()
