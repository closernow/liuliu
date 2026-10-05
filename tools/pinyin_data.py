# 普通话音节表和拆分规则（给 build_content.py 用）
# 规则跟课本：整体认读音节不拆拼（只能整个拖上去），声母不含 k
import re

SHENG_ALL = ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'h', 'j', 'q', 'x', 'zh', 'ch', 'sh', 'r', 'z', 'c', 's', 'y', 'w']
YUN_ALL = ['a', 'o', 'e', 'i', 'u', 'ü', 'ai', 'ei', 'ui', 'ao', 'ou', 'iu', 'ie', 'üe', 'er', 'an', 'en', 'in', 'un', 'ün', 'ang', 'eng', 'ing', 'ong']
WHOLE_ALL = ['zhi', 'chi', 'shi', 'ri', 'zi', 'ci', 'si', 'yi', 'wu', 'yu', 'ye', 'yue', 'yuan', 'yin', 'yun', 'ying']
MEDIAL = ['i', 'u', 'ü']
# 三拼音节：介母 + 后面的韵母，只有这些组合（ie üe ui iu 是独立韵母，不算三拼）
THREE = {('i', 'a'), ('u', 'a'), ('u', 'o'), ('i', 'ao'), ('u', 'ai'), ('i', 'an'), ('u', 'an'), ('ü', 'an'), ('i', 'ang'), ('u', 'ang'), ('i', 'ong')}
# 能单独成音节的韵母（不带声母）
ALONE = ['a', 'o', 'e', 'ai', 'ei', 'ao', 'ou', 'er', 'an', 'en', 'ang', 'eng']

# 合法音节（ü 写成 ü；j q x 后面的 u 在这里统一写成 ü）
_TABLE = """
ba bo bai bei bao ban ben bang beng bi bie biao bian bin bing bu
pa po pai pei pao pou pan pen pang peng pi pie piao pian pin ping pu
ma mo me mai mei mao mou man men mang meng mi mie miao miu mian min ming mu
fa fo fei fou fan fen fang feng fu
da de dai dei dao dou dan den dang deng dong di die diao diu dian ding du duo dui duan dun
ta te tai tao tou tan tang teng tong ti tie tiao tian ting tu tuo tui tuan tun
na ne nai nei nao nou nan nen nang neng nong ni nie niao niu nian nin niang ning nu nuo nuan nü nüe
la le lai lei lao lou lan lang leng long li lia lie liao liu lian lin liang ling lu luo luan lun lü lüe
ga ge gai gei gao gou gan gen gang geng gong gu gua guo guai gui guan gun guang
ha he hai hei hao hou han hen hang heng hong hu hua huo huai hui huan hun huang
ji jia jie jiao jiu jian jin jiang jing jiong jü jüe jüan jün
qi qia qie qiao qiu qian qin qiang qing qiong qü qüe qüan qün
xi xia xie xiao xiu xian xin xiang xing xiong xü xüe xüan xün
zha zhe zhai zhei zhao zhou zhan zhen zhang zheng zhong zhu zhua zhuo zhuai zhui zhuan zhun zhuang
cha che chai chao chou chan chen chang cheng chong chu chua chuo chuai chui chuan chun chuang
sha she shai shei shao shou shan shen shang sheng shu shua shuo shuai shui shuan shun shuang
re rao rou ran ren rang reng rong ru ruo rui ruan run
za ze zai zei zao zou zan zen zang zeng zong zu zuo zui zuan zun
ca ce cai cao cou can cen cang ceng cong cu cuo cui cuan cun
sa se sai sao sou san sen sang seng song su suo sui suan sun
ya yo yao you yan yang yong
wa wo wai wei wan wen wang weng
"""
VALID = set(_TABLE.split())

TONES = {'ā': ('a', 1), 'á': ('a', 2), 'ǎ': ('a', 3), 'à': ('a', 4), 'ē': ('e', 1), 'é': ('e', 2), 'ě': ('e', 3), 'è': ('e', 4),
         'ī': ('i', 1), 'í': ('i', 2), 'ǐ': ('i', 3), 'ì': ('i', 4), 'ō': ('o', 1), 'ó': ('o', 2), 'ǒ': ('o', 3), 'ò': ('o', 4),
         'ū': ('u', 1), 'ú': ('u', 2), 'ǔ': ('u', 3), 'ù': ('u', 4), 'ǖ': ('ü', 1), 'ǘ': ('ü', 2), 'ǚ': ('ü', 3), 'ǜ': ('ü', 4)}
MARK = {v: k for k, v in TONES.items()}

def untone(s):
    """'guā' -> ('gua', 1)；没有声调符号的是轻声 0"""
    tone, out = 0, ''
    for c in s:
        if c in TONES: b, tone = TONES[c]; out += b
        else: out += c
    return out, tone

def norm(syl):
    """j q x 后面的 u 其实是 ü"""
    for sh in ('j', 'q', 'x'):
        if syl.startswith(sh) and syl[1:2] == 'u': return sh + 'ü' + syl[2:]
    return syl

def display(syl):
    """显示：j q x y 后面的 ü 去掉两点"""
    if syl[:1] in ('j', 'q', 'x', 'y') and 'ü' in syl: return syl.replace('ü', 'u')
    return syl

def mark(syl, tone):
    s = display(syl)
    if tone == 0: return s
    if 'a' in s: i = s.index('a')
    elif 'e' in s: i = s.index('e')
    elif 'ou' in s: i = s.index('o')
    else: i = max(k for k, c in enumerate(s) if c in 'aoeiuü')
    return s[:i] + MARK[(s[i], tone)] + s[i + 1:]

def split(syl):
    """拆成课本里的零件：('whole', 'zhi') 或 (声母, [韵母零件...])"""
    if syl in WHOLE_ALL: return ('whole', syl)
    sh = next((x for x in sorted(SHENG_ALL, key=len, reverse=True) if syl.startswith(x)), '')
    rest = syl[len(sh):]
    if rest in YUN_ALL: return (sh, [rest])
    if (rest[:1], rest[1:]) in THREE: return (sh, [rest[:1], rest[1:]])
    raise ValueError(syl)

def file_key(syl, tone):
    return syl.replace('ü', 'v') + str(tone or 1)
