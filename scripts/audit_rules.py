"""Apply edition-specific rules from official papers and dated notices.
Only instruction paragraphs are read: numbers in question bodies are not durations.
Run after prepare.py; it does not render images or alter questions/answer keys.
"""
from pathlib import Path
import json,re,subprocess,unicodedata
R=Path(__file__).resolve().parents[1]
ARCHIVE='https://olimpiadi.dm.unibo.it/le-gare/giochi-di-archimede/'
ONLINE='https://olimpiadi.dm.unibo.it/2021/11/28/orari-giochi-di-archimede-online/'
RECOVERY='https://old.liceofermibo.edu.it/circolari-studenti/nuova-data-per-i-giochi-di-archimede-olimpiadi-di-matematica-11-marzo-2021/?download=27377'
def extract_duration(text):
    text=unicodedata.normalize('NFKD',text).replace('’',"'").replace('`','')
    text=''.join(c for c in text if not unicodedata.combining(c))
    # A sentence must introduce the student's available time. Never scan arbitrary
    # minute values across a booklet: problems can mention unrelated 90/100 minutes.
    sentences=re.findall(r'(?:il\s+tempo(?:\s+totale)?\s+(?:che\s+hai\s+a\s+disposizione|a\s+tua\s+disposizione)|hai\s+a\s+tua\s+disposizione)[^\n]{0,180}',text,re.I)
    for sentence in sentences:
        if 'disposizione' not in sentence.lower():continue
        s=sentence.lower()
        m=re.search(r'\b(60|90|100|110|120)\s*minut',s)
        if m:return int(m[1]),sentence[:m.end()]
        if re.search(r"(?:un[' ]?ora|1\s+ora)\s+e\s+mezza",s):return 90,sentence.split('Buon')[0]
        if re.search(r'(?:due|2)\s+ore',s):return 120,sentence.split('Buon')[0]
    return None,None

def apply_rules():
    corpus=json.loads((R/'data/corpus.json').read_text())
    evidence={};exams={};changes=[]
    for e in corpus['exams']:
        year=e['year'];online=e['kind']=='online'
        if year==2020:
            # Keep historical question IDs stable, but identify the actual event.
            e['kind']='recupero'
            e['title']=f'Archimede 2020 · Recupero (11 marzo 2021) · v{e["variant"]}'
        profile=f'{year}-'+('online' if online else 'recupero' if e['kind']=='recupero' else 'gara')
        # First-page instruction locations in the exact published PDF.
        page=(5 if year==2010 else 7 if year==2011 else (int(e['id'].rsplit('-',1)[1])-1)*2+1 if 2015<=year<=2019 or (year==2021 and not online) else 1)
        pdf=R/e['pdf'].lstrip('/')
        pdftext=subprocess.run(['pdftotext','-f',str(page),'-l',str(page),'-layout',str(pdf),'-'],capture_output=True,text=True,check=True).stdout
        minutes,excerpt=extract_duration(pdftext)
        source_kind='official_exam_pdf';source_href=e['pdf']+f'#page={page}';source_label='Istruzioni nel testo ufficiale';notes=[]
        if year==2004:
            # The PDF font has broken text encoding; first-page instructions were
            # rendered and visually checked, explicitly stating 1 ora e mezza.
            minutes=90;excerpt='1 ora e mezza';notes.append('Durata verificata visivamente nelle istruzioni del PDF, con codifica dei font non estraibile.')
        if year==2021 and online:
            minutes=60;source_kind='organizer_notice';source_href=ONLINE;source_label='Comunicato ufficiale UMI del 28 novembre 2021';excerpt='60 minuti a disposizione per terminare e consegnare'
            notes.append('Il comunicato fa decorrere il tempo dal download del testo. Le fasce orarie storiche non sono applicate alla simulazione personale.')
            notes.append('Il comunicato documenta la durata; il punteggio 5/0/1 è allineato alle istruzioni cartacee della stessa edizione, indicate come seconda fonte.')
        if year==2020:
            minutes=60;source_kind='school_notice';source_href=RECOVERY;source_label='Circolare istituzionale n. 101 del Liceo Fermi, 25 febbraio 2021';excerpt='60 minuti';notes.append('Recupero dell’11 marzo 2021: 12 quesiti e 60 minuti documentati dalla circolare dell’istituto. Non usare i 90 minuti della gara di febbraio poi annullata.')
        if minutes is None:raise ValueError(f'No verified instruction duration for {e["id"]}: {pdf}')
        if e['minutes']!=minutes:changes.append({'id':e['id'],'previous_minutes':e['minutes'],'verified_minutes':minutes})
        e['minutes']=minutes
        if profile not in evidence:
            evidence[profile]={'year':year,'minutes':minutes,'questions':len(e['questions']),'source_kind':source_kind,'source_href':source_href,'source_label':source_label,'archive_url':e['source_url'],'instruction_pdf':e['pdf'],'instruction_page':page,'duration_evidence':excerpt,'notes':notes}
        no_communication=year>=2009 and not online and year!=2020
        # Source terminology differs by edition. Do not invent a historical ban.
        if source_kind=='official_exam_pdf':
            no_communication='comunicaz' in pdftext.lower()
        materials=['Non usare calcolatrici.']
        if no_communication:materials.append('Non usare strumenti di comunicazione.')
        if year==2020:materials.append('Non consultare testi o appunti personali, come indicato nella circolare.')
        if year in [2010,2011]:materials.append('Le istruzioni per gli insegnanti vietano tavole, testi e appunti personali; consentono fogli di brutta copia.')
        exams[e['id']]={'minutes':minutes,'question_count':len(e['questions']),'duration_verified':True,'scoring':{'correct':5,'wrong':0,'blank':1},'single_answer':True,'no_calculator':True,'no_communication':no_communication,'materials':materials,'source_href':source_href,'source_label':source_label,'source_kind':source_kind,'scoring_source_href':next(x['pdf']+'#page=1' for x in corpus['exams'] if x['id']=='2021-gara-1') if online else source_href,'evidence_id':profile,'notes':notes}
    report={'schema_version':1,'verified_on':'2026-11-12','scope':'Giochi di Archimede triennio: edizioni effettivamente pubblicate nell’archivio 1996–2025; non è una certificazione delle condizioni della futura gara 2026.','archive_url':ARCHIVE,'evidence':evidence,'exams':exams,'corrections':changes,'adaptations':['Il timer della simulazione non si interrompe in background.','Le selezioni digitali sono una brutta copia modificabile; la consegna finale fissa la griglia. La griglia cartacea ufficiale non ammette cancellature.','Le risposte multiple sono prevenute dall’interfaccia. Nel testo 2025 una risposta illeggibile, invalida o multipla vale zero.','I promemoria generali di metodo sono accessibili dopo la consegna; durante la prova sono disponibili solo fogli bianchi o brutta copia vuota.','Il materiale didattico digitale e il riepilogo immediato sono adattamenti di allenamento, non strumenti consentiti durante la gara reale.']}
    (R/'data/exam-rules.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    (R/'data/corpus.json').write_text(json.dumps(corpus,ensure_ascii=False))
    print(f'Verified rules for {len(exams)} exams in {len(evidence)} profiles; corrected {len(changes)} durations.')
    for p,v in evidence.items():print(p,v['minutes'],v['questions'],v['source_kind'])
    return report
if __name__=='__main__':apply_rules()
