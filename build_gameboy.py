import urllib.request

# Puxa o gráfico com a cor verde-escura dos pixels do Gameboy (#3a4818)
url = "https://ghchart.rshah.org/3a4818/Alexispher"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})

try:
    with urllib.request.urlopen(req) as response:
        svg_chart = response.read().decode('utf-8')
        
    # Remove a tag XML inicial do gráfico baixado para evitar conflitos no SVG final
    if "<?xml" in svg_chart:
        svg_chart = svg_chart.split("?>")[1]

    # Carrega o template do Gameboy
    with open("gameboy_template.svg", "r", encoding="utf-8") as f:
        template = f.read()

    # Incorpora o gráfico dentro da tela (usando scale para caber perfeitamente)
    chart_group = f'<g transform="translate(85, 140) scale(0.31)">{svg_chart}</g>'
    final_svg = template.replace("", chart_group)

    # Salva o resultado final!
    with open("gameboy_contrib.svg", "w", encoding="utf-8") as f:
        f.write(final_svg)
        
    print("Gameboy SVG gerado com sucesso!")
except Exception as e:
    print(f"Erro ao gerar o SVG: {e}")
