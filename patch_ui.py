import re

with open('www/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# 1. Add global box-sizing and overflow fix
if '* { box-sizing: border-box; }' not in css:
    prepend = '''* { box-sizing: border-box; }
html, body { overflow-x: hidden; scroll-behavior: smooth; }

'''
    css = prepend + css

# 2. Enhance .card
css = re.sub(
    r'\.card\s*\{[^}]*\}',
    '''.card {
    background-color: var(--card-bg);
    padding: 20px;
    border-radius: 16px;
    margin-bottom: 15px;
    border: 1px solid var(--border-color);
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    transition: transform 0.2s, box-shadow 0.2s;
}
.card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(0,0,0,0.2);
}''',
    css
)

css = re.sub(
    r'\[data-theme="light"\] \.card\s*\{[^}]*\}',
    '''[data-theme="light"] .card {
    box-shadow: 0 8px 24px rgba(0,0,0,0.06);
}
[data-theme="light"] .card:hover {
    box-shadow: 0 12px 32px rgba(0,0,0,0.1);
}''',
    css
)

# 3. Enhance .header
css = re.sub(
    r'\.header\s*\{[^}]*\}',
    '''.header {
    background-color: var(--header-bg);
    padding: 15px 25px;
    font-size: 20px;
    font-weight: 700;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
    letter-spacing: -0.5px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    position: sticky;
    top: 0;
    z-index: 1000;
}''',
    css
)

with open('www/style.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("CSS updated successfully")
