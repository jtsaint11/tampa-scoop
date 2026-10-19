import asyncio,sys,re,json
sys.path.insert(0,'/work')
from sdk.tools.utils_tools import web_search
import os
OUT=os.environ.get('OUT','/work/bots/tampa-newsletter/radar/research/tmp/')
async def one(i,q,sem):
    async with sem:
        try:
            r=await web_search(q,detail="detailed")
            t=r.search_response
        except Exception as e:
            t='ERR '+str(e)
        fn=OUT+re.sub(r'[^a-z0-9]+','-',q.lower())[:80]+'.md'
        open(fn,'w').write('# '+q+'\n\n'+t)
        return q,len(t)
async def main():
    qs=[l.strip() for l in open(sys.argv[1]) if l.strip()]
    sem=asyncio.Semaphore(8)
    for q,n in await asyncio.gather(*[one(i,q,sem) for i,q in enumerate(qs)]): print(n,q)
asyncio.run(main())
