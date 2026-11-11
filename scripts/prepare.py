"""Derive lossless question crops and a provenance manifest from official PDFs.
Database creation/import is exclusively implemented by the Rust application.
"""
import pathlib, json, re, subprocess, csv, io, warnings
warnings.filterwarnings('ignore')
import pymupdf as fitz
import numpy as npx
import os
os.environ["OMP_THREAD_LIMIT"]="1"
R=pathlib.Path(__file__).resolve().parents[1]
OUT=R/'web/assets';OUT.mkdir(parents=True,exist_ok=True)
MANUAL={2000:'B C A D B A E C C B D C B B C D C A B C C B C C D'.replace(' ',''),2001:'ABEEBABCBBCBDEACDBBDCCCDC',2002:'DCCBCCBECDDCEADBDECBB BEBE'.replace(' ',''),2003:'DDCCCCAEDBAEEBDADCBDCCBCB',2004:'BCEDA ECCCABBDDCCCDBDCBDCE'.replace(' ','')}
for y,k in MANUAL.items(): assert len(k)==25,(y,len(k))
def open_doc(path=None):
 d=fitz.open(path) if path else fitz.open()
 for p in d:
  if path and 'Archimede2004' in str(path) and 'testo_triennio' in str(path):
   p.set_rotation(270);p.remove_rotation();continue
  if p.rotation:p.remove_rotation()
  dirs=[ln['dir'] for b in p.get_text('dict')['blocks'] for ln in b.get('lines',[])]
  if dirs and sum(abs(d[1])>.8 for d in dirs)>len(dirs)*.6:
   p.set_rotation(270 if sum(d[1] for d in dirs)>0 else 90);p.remove_rotation()
 return d
def regions(doc,pages):
 for pi in pages:
  p=doc[pi];w,h=p.rect.width,p.rect.height
  if w>h:
   starts=[]
   for b in p.get_text('dict')['blocks']:
    for ln in b.get('lines',[]):
     t=''.join(sp['text'] for sp in ln['spans'])
     if re.match(r'^\s*(?:Problema\s+)?\(?\d{1,2}[.)]',t) and w*.4<ln['bbox'][0]<w*.6:starts.append(ln['bbox'][0])
   split=min(starts)-4 if starts else w/2
   yield pi,fitz.Rect(15,8,split,h-10)
   yield pi,fitz.Rect(split,8,w-15,h-10)
  else: yield pi,fitz.Rect(20,10,w-20,h-15)
def lines(page,rect,ocr=False):
 if ocr:
  pix=page.get_pixmap(matrix=fitz.Matrix(3,3),clip=rect)
  res=subprocess.run(['tesseract','stdin','stdout','--psm','6','tsv'],input=pix.tobytes('png'),capture_output=True,check=True)
  groups={}
  for w in csv.DictReader(io.StringIO(res.stdout.decode()),delimiter='\t'):
   if not w['text'].strip():continue
   key=(w['block_num'],w['par_num'],w['line_num']);x=rect.x0+int(w['left'])/3;y=rect.y0+int(w['top'])/3
   g=groups.setdefault(key,[x,y,'']);g[0]=min(g[0],x);g[1]=min(g[1],y);g[2]+=' '+w['text']
  return [(x,y,t.strip()) for x,y,t in groups.values()]
 out=[]
 for b in page.get_text('dict',clip=rect)['blocks']:
  for l in b.get('lines',[]):
   t=''.join(s['text'] for s in l['spans'])
   y=l['bbox'][1]
   if re.match(r'^\s*\d{1,2}[.)]',t) and 0<=y-b['bbox'][1]<16:y=b['bbox'][1]
   out.append((l['bbox'][0],y,t))
 return out
def question_parts(doc,pages,ocr=False):
 regs=list(regions(doc,pages));cands=[]
 if ocr:
  regs=[]
  for pi in pages:
   w,h=doc[pi].rect.width,doc[pi].rect.height
   regs.extend([(pi,fitz.Rect(15,8,404.5,h-10)),(pi,fitz.Rect(404.5,8,w-15,h-10))])
 for ri,(pi,rect) in enumerate(regs):
  ls=lines(doc[pi],rect,ocr)
  found=[]
  for x,y,t in ls:
   m=re.match(r'^\s*(\d{1,2})[.)]\s*(.*)',t)
   if m:
    found.append((x,y,int(m[1]),t))
  if found:
   margin=min(a[0] for a in found)
   for x,y,n,t in sorted(found,key=lambda a:a[1]):
    if x<=margin+6:cands.append((ri,y,n,t))
 # Select the final monotonically increasing sequence, bypassing numbered instructions.
 seq=[]
 for c in cands:
  if c[2]==1: seq=[c]
  elif seq and c[2]==seq[-1][2]+1:seq.append(c)
 parts=[]
 for idx,(ri,y,n,t) in enumerate(seq):
  endri,endy=(seq[idx+1][0],seq[idx+1][1]) if idx+1<len(seq) else (len(regs)-1,regs[-1][1].y1)
  clips=[];text=''
  for rj in range(ri,endri+1):
   pi,rect=regs[rj];
   clip=fitz.Rect(rect);clip.y0=max(rect.y0,y-3) if rj==ri else rect.y0
   clip.y1=min(rect.y1,endy-3) if rj==endri and idx+1<len(seq) else rect.y1
   if clip.height<2:continue
   clips.append((pi,clip));text+=doc[pi].get_text(clip=clip)+'\n'
  parts.append((n,clips,text))
 return parts

def key_map(doc,pages):
 out={}
 full='\n'.join(doc[p].get_text() for p in pages)
 grid=re.search(r'(?m)(?:^[ABCDE][ \t]*\n){20,25}',full)
 if grid:return dict(enumerate(re.findall('[ABCDE]',grid[0]),1))
 for pi,rect in regions(doc,pages):
  t=doc[pi].get_text(clip=rect)
  for m in re.finditer(r'(?m)^\s*(\d{1,2})[.)]?\s+([ABCDE])\s*[.)]?\s*$',t):out.setdefault(int(m[1]),m[2])
  for m in re.finditer(r'(?:Problema\s+|\()?([0-9]{1,2})[.)]\s*La risposta[^\n]{0,45}?\(([ABCDE])\)',t):out.setdefault(int(m[1]),m[2])
  if not out:
   for line in t.splitlines():
    k=re.sub(r'\s','',line)
    if re.fullmatch('[ABCDE]{16,25}',k):out={i+1:v for i,v in enumerate(k)};break
 return out

def topic(t):
 t=t.lower()
 for name,words in [('Geometria',['triangol','quadrato','circonferenz','rettangol','area','cubo','lati','raggio','angol']),('Combinatoria e probabilità',['probabil','modi','anagramm','caramell','combinaz','pallin','dadi','monet']),('Teoria dei numeri',['divisib','primi','interi','cifra','resto','potenze','quadrati']),('Logica',['cavalier','furfant','verit','mente','afferma'])]:
  if any(w in t for w in words):return name
 return 'Algebra'
exams=[];issues=[]
for entry in json.loads((R/'data/downloads.json').read_text()):
 if 'error' in entry:issues.append(entry);continue
 folder=R/entry['folder'];year=int(re.search(r'(199\d|20\d\d)',folder.name)[1])
 files=[p for p in folder.glob('*.pdf') if '._' not in p.name]
 tests=[p for p in files if ('tri' in p.name.lower() or 'GiochiArchimede20' in p.name) and not any(w in p.name.lower() for w in ['sol','risp','sotri','griglie'])]
 sols=[p for p in files if ('tri' in p.name.lower() or 'soluzioni2011' in p.name) and ('sol' in p.name.lower() or 'sotri' in p.name)]
 answers=[p for p in files if 'tri' in p.name.lower() and ('risp' in p.name.lower() or 'griglie' in p.name.lower())]
 sol=sols[0] if sols else None;answer=answers[0] if answers else sol
 for test in sorted(tests):
  doc=open_doc(test)
  if year in [2010,2011]:groups=[list(range(len(doc)-2,len(doc)))]
  elif 'online' in test.name:groups=[[i] for i in range(0,len(doc),2)]
  elif doc[0].rect.width<doc[0].rect.height and year==2020:groups=[[i] for i in range(len(doc))]
  else:groups=[list(range(i,min(i+2,len(doc)))) for i in range(0,len(doc),2)]
  for gi,pages in enumerate(groups):
   variant=gi+1
   if year==2014:variant=int(re.search(r'(\d)\.pdf$',test.name)[1])
   online='online' in test.name
   kind='online' if online else ('recupero' if 'rec' in folder.name.lower() else 'gara')
   eid=f'{year}-{kind}-{variant}'
   text='\n'.join(doc[p].get_text() for p in pages)
   code=re.search(r'(?:CODICE PROVA:?|VERSIONE)\s*\n?\s*(\w+)',text)
   label=(code[1] if code else str(variant))
   if year in [2020,2021] and not online:
    first=doc[pages[0]].get_text().splitlines()[0]
    if re.fullmatch(r'\d{4}',first.strip()):label=first.strip()
   parts=question_parts(doc,pages,ocr=year==2004)
   if year in MANUAL:keys=dict(enumerate(MANUAL[year],1))
   elif online:keys=key_map(doc,[pages[0]+1])
   elif answer:
    adoc=open_doc(answer)
    if year==2011:
     aps=[i for i,p in enumerate(adoc) if 'triennio' in p.get_text().lower()];keys=key_map(adoc,aps)
    elif year in [2020,2021]:keys=key_map(adoc,[gi])
    elif answers:
     # Grids are two columns per page, each column is a distinct shuffled version.
     ar=list(regions(adoc,range(len(adoc))))
     if year==2014:
      st='\n'.join(p.get_text() for p in adoc)
      sec=re.split(r'Griglia delle risposte corrette - Testo \d',st)[variant]
      keys={int(m[1]):m[2] for m in re.finditer(r'(?m)^\s*(\d{1,2})\s+([ABCDE])\s*$',sec)}
     else:
      pi,rect=ar[gi] if gi<len(ar) else ar[0]
      tmp=fitz.open();np=tmp.new_page(width=rect.width,height=rect.height);np.show_pdf_page(np.rect,adoc,pi,clip=rect);keys=key_map(tmp,[0])
    else:keys=key_map(adoc,range(len(adoc)))
   else:keys={}
   if year==2025:
    # The official solution booklet has a question followed by its answer.
    sd=open_doc(sol);keys={}
    st='\n'.join(p.get_text() for p in sd)
    keys=dict(enumerate(re.findall(r'Risposta corretta:\s*\(([ABCDE])\)',st),1))
   if not keys and sol and year not in MANUAL:
    sd=open_doc(sol);keys=key_map(sd,range(len(sd)))
   count=len(parts)
   missing=[n for n,_,_ in parts if n not in keys]
   if count not in [12,16,20,25] or missing:
    issues.append({'id':eid,'count':count,'keys':len(keys),'missing':missing});print('CHECK',issues[-1],flush=True)
   qs=[]
   for n,clips,qt in parts:
    imgs=[]
    for ci,(pi,clip) in enumerate(clips):
     dest=OUT/f'{eid}-q{n}-{ci}.png'
     pix=doc[pi].get_pixmap(matrix=fitz.Matrix(2.8,2.8),clip=clip)
     arr=npx.frombuffer(pix.samples,dtype=npx.uint8).reshape(pix.height,pix.width,pix.n)
     rows=npx.flatnonzero(npx.any(arr<240,axis=(1,2)))
     if not len(rows):continue
     tightened=fitz.Rect(clip);tightened.y0=max(clip.y0,clip.y0+float(rows[0])/2.8-4);tightened.y1=min(clip.y1,clip.y0+float(rows[-1])/2.8+5)
     doc[pi].get_pixmap(matrix=fitz.Matrix(2.8,2.8),clip=tightened).save(dest)
     imgs.append('/assets/'+dest.name)
    qs.append({'id':f'{eid}-q{n}','number':n,'images':imgs,'text':qt,'topic':topic(qt),'correct':keys.get(n),'source_page':clips[0][0]+1 if clips else 1})
   minutes=120
   if re.search(r'100\s*minuti',text):minutes=100
   elif re.search(r'90\s*minuti|1 ora e mezza|un.ora e mezza',text):minutes=90
   elif year in [2020,2021]:minutes=60 if not online else 40
   exams.append({'id':eid,'year':year,'variant':label,'kind':kind,'title':f'Archimede {year}'+(' · Recupero' if kind=='recupero' else ' · Online' if online else '')+f' · v{label}','minutes':minutes,'source_url':entry['url'],'pdf':'/'+str(test.relative_to(R)),'solution_pdf':'/'+str(sol.relative_to(R)) if sol else None,'questions':qs})
   print(eid,count,len(keys),flush=True)
# A portrait PDF can contain several answer-grid columns: use explicit version
# headings in reading order rather than assuming one version per physical page.
for e in exams:
 if e['year'] not in [2016,2017,2018,2019,2022,2023,2024]:continue
 folder=(R/e['pdf'].lstrip('/')).parent
 ap=next((p for p in folder.glob('*.pdf') if '._' not in p.name and 'tri' in p.name.lower() and 'risp' in p.name.lower()),None)
 if not ap:continue
 ad=open_doc(ap);full='\n'.join(p.get_text() for p in ad)
 sections=re.split(r'RISPOSTE ESATTE[^\n]*',full)
 variant=int(e['id'].rsplit('-',1)[1])
 section=sections[variant]
 keys={int(m[1]):m[2] for m in re.finditer(r'(?m)^\s*(\d{1,2})[.)]\s+([ABCDE])\s*$',section)}
 for q in e['questions']:
  if q['number'] not in keys:issues.append({'id':q['id'],'reason':'missing version-specific answer'})
  else:q['correct']=keys[q['number']]
# 2015 publishes commented answers for T1 only. Derive shuffled-version keys
# by matching the exact problem stem and the correct option value to T1.
import difflib,unicodedata
def norm(s):
 s=unicodedata.normalize('NFKD',s)
 return ''.join(c.lower() for c in s if c.isalnum())
def split_options(q):
 pieces=re.split(r'\(([ABCDE])\)',q['text'])
 stem=norm(re.sub(r'^\s*\d+[.)]','',pieces[0]))
 opts={pieces[i]:norm(pieces[i+1]) for i in range(1,len(pieces)-1,2)}
 return stem,opts
base=next(e for e in exams if e['id']=='2015-gara-1')
audit=[]
for e in exams:
 if e['year']!=2015 or e['id']==base['id']:continue
 for q in e['questions']:
  stem,opts=split_options(q)
  matched=max(base['questions'],key=lambda b:difflib.SequenceMatcher(None,stem,split_options(b)[0]).ratio())
  other,bo=split_options(matched)
  similarity=difflib.SequenceMatcher(None,stem,other).ratio()
  value=bo.get(matched['correct'])
  letters=[letter for letter,v in opts.items() if v==value]
  if 'Una griglia' in q['text']:
   # The five graphical options have the same order in all four PDFs; visually verified.
   letters=['C']
  if similarity<.97 or len(letters)!=1:
   issues.append({'id':q['id'],'reason':'2015 option mapping requires review','similarity':similarity,'matching':letters})
  else:
   q['correct']=letters[0]
   audit.append({'question':q['id'],'canonical':matched['id'],'correct':q['correct'],'stem_similarity':similarity})
(R/'data/key-audit-2015.json').write_text(json.dumps(audit,indent=2))
(R/'data/corpus.json').write_text(json.dumps({'exams':exams,'issues':issues},ensure_ascii=False))
print('TOTAL',len(exams),sum(len(e['questions']) for e in exams),'ISSUES',issues)

import sys
subprocess.run([sys.executable,str(R/"scripts/repair2001.py")],check=True)
