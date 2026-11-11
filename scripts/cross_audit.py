import json,re,difflib,unicodedata
from pathlib import Path
R=Path(__file__).resolve().parents[1]
c=json.loads((R/'data/corpus.json').read_text())
def norm(s):return ''.join(c.lower() for c in unicodedata.normalize('NFKD',s) if c.isalnum())
def split(q):
 p=re.split(r'\(([ABCDE])\)',q['text']);return norm(re.sub(r'^\s*\d+[.)]','',p[0])),{p[i]:norm(p[i+1]) for i in range(1,len(p)-1,2)}
verified=0;errors=[];unmatched=[]
for year in [2014,2016,2017,2018,2019]:
 es=[e for e in c['exams'] if e['year']==year];base=next(e for e in es if e['id'].endswith('-1'))
 for e in es:
  if e==base:continue
  for q in e['questions']:
   stem,opts=split(q);b=max(base['questions'],key=lambda b:difflib.SequenceMatcher(None,stem,split(b)[0]).ratio());other,bo=split(b);ratio=difflib.SequenceMatcher(None,stem,other).ratio();v=bo.get(b['correct']);ls=[l for l,x in opts.items() if x==v]
   if ratio>.97 and len(ls)==1:
    verified+=1
    if ls[0]!=q['correct']:errors.append((q['id'],q['correct'],ls[0],b['id']))
   else:unmatched.append((q['id'],ratio,ls))
print('Verified variant answers:',verified,'MISMATCHES:',errors,'Not text-verifiable:',unmatched)
(R/'data/cross-audit.json').write_text(json.dumps({'verified':verified,'mismatches':errors,'not_text_verifiable':unmatched},indent=2))
assert not errors
