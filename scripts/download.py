import json, pathlib, requests, zipfile, io, concurrent.futures
ROOT=pathlib.Path(__file__).resolve().parents[1]
a=json.loads((ROOT/'data/archive.json').read_text())
urls=[u for u in a['links'] if u.endswith('.zip')]
def fetch(u):
 try:
  name=u.rsplit('/',1)[1]; folder=ROOT/'data/originals'/name[:-4]; folder.mkdir(parents=True,exist_ok=True)
  zpath=folder/'archive.zip'
  if not zpath.exists():
   r=requests.get(u,timeout=90); r.raise_for_status(); zpath.write_bytes(r.content)
  z=zipfile.ZipFile(zpath)
  for i,entry in enumerate(z.infolist()):
   if entry.filename.lower().endswith('.pdf'):
    dest=folder/(str(i)+'-'+pathlib.PurePosixPath(entry.filename).name)
    dest.write_bytes(z.read(entry))
  return {'url':u,'folder':str(folder.relative_to(ROOT)),'files':[p.name for p in folder.glob('*.pdf')]}
 except Exception as e: return {'url':u,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
 results=list(pool.map(fetch,urls))
(ROOT/'data/downloads.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
for r in results: print(r)
