"""Converte as cores do layout claro do HTML de rotina para o tema do Planner (azul-ardósia).
Neutros claros viram painéis escuros, neutros escuros viram texto claro; cores de dado (vermelho,
verde, azul...) ficam, só clareadas quando estão escuras demais para o fundo novo."""
import re, colorsys

def parse(c):
    c = c.strip().lower()
    if c in ('white',): return (255, 255, 255, None)
    if c in ('black',): return (0, 0, 0, None)
    if c.startswith('#'):
        h = c[1:]
        if len(h) == 3: h = ''.join(x * 2 for x in h)
        return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), None)
    m = re.match(r'rgba?\(([^)]*)\)', c)
    p = [x.strip() for x in m.group(1).split(',')]
    return (int(float(p[0])), int(float(p[1])), int(float(p[2])), float(p[3]) if len(p) > 3 else None)

def out(r, g, b, a):
    if a is None: return '#%02X%02X%02X' % (r, g, b)
    return 'rgba(%d,%d,%d,%s)' % (r, g, b, ('%.3f' % a).rstrip('0').rstrip('.'))

def hls(r, g, b): return colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
def rgb(h, l, s): r, g, b = colorsys.hls_to_rgb(h, max(0, min(1, l)), max(0, min(1, s))); return round(r * 255), round(g * 255), round(b * 255)
NH = 218 / 360  # matiz dos neutros do tema

def fundo(c):
    r, g, b, a = parse(c); h, l, s = hls(r, g, b)
    if a is not None and a < .2 and l < .5: return c            # sombras e véus escuros: ficam
    k = 1 if a is None else a
    if s < .25 or l > .93:                                     # neutros: véu sobre o painel (limpo, sem blocos escuros)
        if l >= .75: return 'rgba(255,255,255,%.3f)' % ((.03 + (1 - l) * .3) * k)
        if l < .3: return 'rgba(0,0,0,%.3f)' % (.16 * k)
        return 'rgba(255,255,255,%.3f)' % (.09 * k)
    if l > .78:                                                # fundos pastel → véu da mesma cor
        rr, gg, bb = rgb(h, .55, min(1, s + .2)); return 'rgba(%d,%d,%d,%.3f)' % (rr, gg, bb, .16 * k)
    return c

def borda(c):
    r, g, b, a = parse(c); h, l, s = hls(r, g, b)
    if s < .25 or l > .9: return 'rgba(255,255,255,%s)' % ('.10' if l >= .6 else '.22')
    if l > .75: rr, gg, bb = rgb(h, .6, min(1, s)); return 'rgba(%d,%d,%d,.35)' % (rr, gg, bb)
    return c

def texto(c):
    r, g, b, a = parse(c); h, l, s = hls(r, g, b)
    if s < .25:
        if l < .6: return out(*rgb(NH, .96 - l * .4, .3), a)
        return c
    if l < .45: return out(*rgb(h, .66, min(1, s)), a)
    return c

COR = r'#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\([^)]*\)|\bwhite\b|\bblack\b'
def valor(prop, v):
    prop = prop.strip().lower()
    if prop.startswith('--'): return v
    if prop in ('color', 'caret-color', '-webkit-text-fill-color'): f = texto
    elif prop.startswith('border') or prop.startswith('outline') or prop in ('stroke',): f = borda
    elif prop in ('fill',): f = texto
    elif prop.startswith('background') or prop in ('box-shadow',): f = fundo
    else: return v
    if prop == 'box-shadow': return v
    return re.sub(COR, lambda m: f(m.group(0)), v)

def css(text):
    def bloco(m):
        corpo = re.sub(r'([\w-]+)\s*:\s*([^;{}]+)', lambda d: d.group(1) + ':' + valor(d.group(1), d.group(2)), m.group(1))
        return '{' + corpo + '}'
    return re.sub(r'\{([^{}]*)\}', bloco, text)
