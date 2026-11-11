"""Restore the truncated 2001 Q13 figure and document missing official options.
Option values are verified against the contemporary paper reproduced by Istituto Bruni.
"""
from pathlib import Path
import json,pymupdf as f
R=Path(__file__).resolve().parents[1]
d=f.open(R/'data/originals/Archimede2001/7-testitriennio2001.pdf')
for p in d:
 if p.rotation:p.remove_rotation()
source=d[1]
# The diagram extends above the question's first line. Compose native PDF regions
# without including the preceding question's text.
canvas=f.open();page=canvas.new_page(width=380,height=108)
page.show_pdf_page(f.Rect(0,40,272,98),d,1,clip=f.Rect(42,158,314,216))
page.show_pdf_page(f.Rect(272,0,377,108),d,1,clip=f.Rect(314,115,419,223))
name='2001-gara-1-q13-fixed.png';page.get_pixmap(matrix=f.Matrix(2.8,2.8)).save(R/'web/assets'/name)
c=json.loads((R/'data/corpus.json').read_text())
q=next(q for e in c['exams'] for q in e['questions'] if q['id']=='2001-gara-1-q13')
q['images']=['/assets/'+name];q['topic']='Geometria'
q['text']+='\n(A) 2-sqrt(2) (B) sqrt(3)-sqrt(2) (C) 1/sqrt(2) (D) 1 (E) (sqrt(2)+sqrt(3))/2\n'
(R/'data/corpus.json').write_text(json.dumps(c,ensure_ascii=False))
(R/'data/supplement-2001.json').write_text(json.dumps({'question':q['id'],'reason':'The official PDF omits the answer options and its diagram extends above the question first line.','supplement_url':'https://www.istitutobruni.com/wp-content/uploads/2012/11/2001-Testo-e-Soluzioni-T.pdf','supplement_pdf':'data/originals/supplement-2001/bruni-2001.pdf','page':2,'options':{'A':'2-sqrt(2)','B':'sqrt(3)-sqrt(2)','C':'1/sqrt(2)','D':'1','E':'(sqrt(2)+sqrt(3))/2'},'correct':'D'},indent=2))
print('2001 Q13 repaired from verified source.')
