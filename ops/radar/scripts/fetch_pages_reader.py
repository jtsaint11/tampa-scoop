import sys,re,subprocess
from concurrent.futures import ThreadPoolExecutor
import os
OUT=os.environ.get('OUT','/work/bots/tampa-newsletter/radar/research/tmp/')
def go(u):
    fn=OUT+re.sub(r'[^a-z0-9]+','-',u.lower().split('://',1)[-1])[:90]+'.txt'
    t=subprocess.run(['curl','-s','--max-time','60','https://r.jina.ai/'+u],capture_output=True,timeout=70).stdout.decode('utf8','ignore')
    open(fn,'w').write(t); return len(t),u
urls=[l.strip() for l in open(sys.argv[1]) if l.strip()]
with ThreadPoolExecutor(6) as ex:
    for n,u in ex.map(go,urls): print(n,u)
