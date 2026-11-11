from pathlib import Path
p=Path(__file__).with_name('prepare.py');source=p.read_text()
exec(compile(source.split('exams=[];issues=[]')[0],str(p),'exec'))
c=json.loads((R/'data/corpus.json').read_text());exams=c['exams'];issues=[]
exec(compile(source[source.index('# A portrait PDF'):source.index("(R/'data/corpus.json').write_text")],str(p),'exec'))
assert not issues,issues
c['issues']=issues
(R/'data/corpus.json').write_text(json.dumps(c,ensure_ascii=False))
print('Updated version keys; no unresolved mappings. 2015 verified:',len(audit))
