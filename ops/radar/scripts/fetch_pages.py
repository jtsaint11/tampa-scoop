import sys,re,subprocess,hashlib
from bs4 import BeautifulSoup
import os
OUT=os.environ.get('OUT','/work/bots/tampa-newsletter/radar/research/tmp/')
from concurrent.futures import ThreadPoolExecutor
def go(u):
    fn=OUT+re.sub(r'[^a-z0-9]+','-',u.lower().split('://',1)[-1])[:90]+'.txt'
    try:
        h=subprocess.run(['curl','-sL','--max-time','25','-A','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36','-H','Accept-Language: en-US',u],capture_output=True,timeout=30).stdout.decode('utf8','ignore')
    except Exception as e: h=''
    s=BeautifulSoup(h,'html.parser')
    for t in s(['script','style','nav','footer','header','noscript','svg','form']): t.decompose()
    title=s.title.get_text(strip=True) if s.title else ''
    metas=[]
    for m in s.find_all('meta'):
        k=m.get('property') or m.get('name') or ''
        if k in ('article:published_time','og:description','description','article:modified_time','parsely-pub-date','date'): metas.append(f'{k}: {m.get("content")}')
    txt='\n'.join(l.strip() for l in s.get_text('\n').splitlines() if len(l.strip())>2)
    open(fn,'w').write(f'URL: {u}\nTITLE: {title}\n'+'\n'.join(metas)+'\n\n'+txt)
    return len(txt),u,fn
urls=[l.strip() for l in open(sys.argv[1]) if l.strip()]
with ThreadPoolExecutor(10) as ex:
    for n,u,fn in ex.map(go,urls): print(n,u,fn.split('/')[-1])
