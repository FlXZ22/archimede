const { chromium } = require('/home/metis/.local/share/codex-tools/lib/node_modules/@playwright/test');
const fs=require('fs'),assert=require('node:assert/strict'),{execFileSync}=require('child_process');
const root=require('path').resolve(__dirname,'..');
(async()=>{
 const corpus=JSON.parse(fs.readFileSync(root+'/data/corpus.json'));assert.equal(corpus.issues.length,0);assert.equal(new Set(corpus.exams.map(e=>e.year)).size,30);
 for(const e of corpus.exams){assert.ok([12,16,20,25].includes(e.questions.length),e.id);for(const q of e.questions){assert.match(q.correct,/^[A-E]$/);assert.ok(q.images.length>0,q.id);for(const f of q.images)assert.ok(fs.existsSync(root+'/web'+f),f)}}
 const browser=await chromium.launch({headless:true});const page=await browser.newPage({baseURL:"http://127.0.0.1:8787",viewport:{width:1440,height:1060}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const ids=[];
 try{
 await page.goto('http://127.0.0.1:8787');await page.locator('#start-official').waitFor();await page.screenshot({path:root+'/data/home-desktop.png',fullPage:true});
 const response=page.waitForResponse(r=>r.url().endsWith('/api/start')&&r.request().method()==='POST');await page.click('#start-official');const attempt=await(await response).json();ids.push(attempt.id);
 assert.equal(attempt.exam.questions.length,16);assert.ok(attempt.exam.questions.every(q=>!('correct'in q)));
 await page.locator('[data-answer="C"]').click();await page.locator('#save-status').filter({hasText:'salvati'}).waitFor();await page.locator('.scratch summary').click();await page.fill('#note','Sviluppo il quadrato e raccolgo i termini.');await page.click('#flag');
 await page.waitForTimeout(500);await page.reload();await page.click('#resume');await page.locator('.choice.selected').waitFor();assert.equal(await page.locator('.choice.selected').innerText(),'C');assert.equal(await page.inputValue('#note'),'Sviluppo il quadrato e raccolgo i termini.');assert.match(await page.locator('#flag').innerText(),/Segnato/);
 const official=corpus.exams.find(e=>e.id==='2025-gara-1');for(let i=1;i<3;i++){await page.locator('.jump summary').click();await page.click('[data-index="'+i+'"]');await page.click('[data-answer="'+official.questions[i].correct+'"]')}
 await page.locator('.jump summary').click();await page.click('[data-index="3"]');await page.click('[data-answer="'+(['A','B','C','D','E'].find(x=>x!==official.questions[3].correct))+'"]');
 await page.locator('#save-status').filter({hasText:'salvati'}).waitFor();await page.click('#submit');await page.click('#confirm-finish');await page.locator('.score-card').waitFor();assert.match(await page.locator('.score').innerText(),/27/);
 const result=await page.request.get('/api/attempt/'+attempt.id).then(r=>r.json());assert.equal(result.result.correct,3);assert.equal(result.result.wrong,1);assert.equal(result.result.blank,12);assert.equal(result.result.score,27);assert.equal(await page.locator('math').count()>0,true);
 await page.screenshot({path:root+'/data/results-desktop.png',fullPage:true});
 await page.click('[data-nav="archive"]');await page.selectOption('#year-filter','1996');assert.equal(await page.locator('.exam-item').count(),1);await page.click('[data-start="1996-gara-1"]');await page.locator('.question-image').waitFor();const oldId=await page.evaluate(()=>localStorage.getItem('archimede-active'));ids.push(oldId);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:root+'/data/exam-mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile overflow');
 await page.click('#submit');await page.click('#confirm-finish');await page.locator('.score-card').waitFor();
 await page.click('#new-home');await page.click('#mode-mix');await page.selectOption('#count','5');await page.click('#start-mix');await page.locator('.question-image').waitFor();const mixedId=await page.evaluate(()=>localStorage.getItem('archimede-active'));ids.push(mixedId);
 execFileSync('python',['-c',`import sqlite3,time; db=sqlite3.connect(${JSON.stringify(root+'/data/archimede.sqlite3')}); db.execute('UPDATE attempts SET deadline=? WHERE id=?',(int(time.time())-1,${JSON.stringify(mixedId)}));db.commit()`]);
 const late=await page.request.put('/api/attempt/'+mixedId,{data:{answers:{},notes:{},flags:[]}});assert.equal(late.status(),400);
 await page.reload();await page.click('#resume');await page.locator('.score-card').waitFor();const expired=await page.request.get('/api/attempt/'+mixedId).then(r=>r.json());assert.equal(expired.result.score,5);assert.equal(expired.result.blank,5);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({exams:corpus.exams.length,questions:corpus.exams.reduce((n,e)=>n+e.questions.length,0),years:30,checks:['corpus completeness','answers hidden until grading','answer/note/flag persistence','server scoring','MathML','archive filters','mobile layout','mixed test','expiry and late-write rejection','no JS errors']},null,2));
 }finally{await browser.close();if(ids.length)execFileSync('python',['-c',`import sqlite3,json;db=sqlite3.connect(${JSON.stringify(root+'/data/archimede.sqlite3')});db.executemany('DELETE FROM attempts WHERE id=?',[(i,) for i in json.loads(${JSON.stringify(JSON.stringify(ids))})]);db.commit()`])}
})().catch(e=>{console.error(e);process.exit(1)});
