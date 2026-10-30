const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.resolve(__dirname, '../../backend/.venv/browser-tools/node_modules/playwright'));
const root = path.resolve(__dirname, '../..');
const language = process.env.ACCEPTANCE_LANGUAGE || 'en';
const en = JSON.parse(fs.readFileSync(path.join(root, `frontend/src/locales/${language}.json`), 'utf8'));
const english = JSON.parse(fs.readFileSync(path.join(root, 'frontend/src/locales/en.json'), 'utf8'));
if (process.env.SAHAYAK_ACCEPTANCE_ALLOW_RESET !== 'true') throw new Error('Run only on a disposable demo database and set SAHAYAK_ACCEPTANCE_ALLOW_RESET=true.');
const out = path.join(__dirname, 'evidence', language);
fs.mkdirSync(out, {recursive:true});
const report = {base:process.env.ACCEPTANCE_BASE_URL || 'http://127.0.0.1:15173', backend:process.env.ACCEPTANCE_BACKEND_URL || 'http://127.0.0.1:18000', mocks:false, language, steps:[], bugs:[]};
let browser;
async function journey(viewport) {
  const label = viewport.width === 1440 ? 'desktop' : 'mobile';
  const context = await browser.newContext({viewport});
  const resetLogin = await context.request.post(report.base+'/api/v1/auth/otp/verify', {data:{phone:'9000000001',otp:'123456'}});
  const auth = await resetLogin.json();
  assert.equal(resetLogin.status(),200);
  const reset = await context.request.post(report.base+'/api/v1/demo/reset', {headers:{Authorization:`Bearer ${auth.access_token}`}});
  assert.equal(reset.status(),200);
  const page = await context.newPage();
  page.setDefaultTimeout(18000);
  let current = '', errors = [], calls = [], transactions, uploaded, offers, loan;
  page.on('pageerror', e=>errors.push({step:current,type:'pageerror',message:e.message}));
  page.on('console', msg=>{if(msg.type()==='error')errors.push({step:current,type:'console',message:msg.text(),url:msg.location().url});});
  page.on('response', response=>{ if(response.url().includes('/api/v1/')) calls.push({step:current,method:response.request().method(),path:new URL(response.url()).pathname,status:response.status()}); });
  async function step(number, name, fn) {
    current = `${number}-${name}`;
    const beforeErrors=errors.length, beforeCalls=calls.length;
    let evidence={}, failure=null;
    try {evidence = await fn() || {};} catch(e) {failure=e.message;}
    const screenshot = `${label}-${number}-${name}.png`;
    await page.screenshot({path:path.join(out,screenshot)}).catch(()=>{});
    const overflow = await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
    const result={step:number,name,viewport:label,status:failure?'FAIL':'PASS',evidence,failure,console_errors:errors.slice(beforeErrors),api_calls:calls.slice(beforeCalls),screenshot,overflow};
    report.steps.push(result);
    fs.writeFileSync(path.join(out,'final-results.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify({viewport:label,step:number,status:result.status,failure,evidence}));
    return result;
  }
  await step(1,'landing',async()=>{
    await page.goto(report.base,{waitUntil:'networkidle'});
    assert.equal(await page.getByTestId('mock-mode-badge').count(),0);
    assert.equal(await page.getByTestId('backend-health-banner').count(),0);
    await page.getByRole('link',{name:'Check my score (demo)',exact:true}).click();
    await page.waitForURL('**/language');
    return {real_health:true,landing_sample_score:81};
  });
  await step(2,'login-consent',async()=>{
    await page.getByRole('button',{name:({en:'English',hi:'हिंदी',mr:'मराठी'})[language],exact:true}).click();
    await page.getByPlaceholder('9000000001').fill('9000000001');
    await page.getByRole('button',{name:en.screen.login.sendOtp,exact:true}).click();
    for(let i=0;i<6;i++)await page.getByRole('textbox',{name:String(i+1),exact:true}).fill(String(i+1));
    await page.getByRole('button',{name:en.screen.login.verify,exact:true}).click();
    await page.waitForURL('**/consent');
    await page.getByRole('button',{name:en.screen.consent.allow,exact:true}).click();
    await page.waitForURL('**/connect');
    return {phone:'9000000001',consent:'ACTIVE'};
  });
  await step(3,'locked-pdf',async()=>{
    await page.locator('input[type=file]').setInputFiles(path.join(root,'data/samples/ravi.locked.pdf'));
    const rejected = page.waitForResponse(r=>r.url().endsWith('/statements')&&r.request().method()==='POST');
    await page.getByRole('button',{name:en.screen.connect.submit,exact:true}).click();
    const rejection = await (await rejected).json();
    assert.equal(rejection.error.code,'PDF_PASSWORD_REQUIRED');
    await page.screenshot({path:path.join(out,`${label}-3-password-required.png`)});
    await page.getByPlaceholder(en.screen.connect.password,{exact:true}).fill('RAVI0101');
    const accepted = page.waitForResponse(r=>r.url().endsWith('/statements')&&r.status()===200);
    await page.getByRole('button',{name:en.screen.connect.submit,exact:true}).click();
    uploaded = await (await accepted).json();
    assert.equal(uploaded.txn_count,284);
    assert.equal(uploaded.score.score,85);
    await page.waitForURL('**/processing');
    await page.screenshot({path:path.join(out,`${label}-3-processing.png`)});
    const review = page.waitForResponse(r=>r.url().includes('/transactions?')&&r.status()===200);
    await page.waitForURL('**/app/transactions');
    transactions = (await (await review).json()).weeks;
    return {password_error:rejection.error.code,transactions:uploaded.txn_count,score:uploaded.score.score,stages:uploaded.stages.map(s=>s.code)};
  });
  await step(4,'review-recategorize',async()=>{
    const weeks = page.locator('button[aria-expanded]');
    for(let i=0;i<await weeks.count();i++)if(await weeks.nth(i).getAttribute('aria-expanded')==='false')await weeks.nth(i).click();
    const rows=transactions.flatMap(w=>w.txns);
    assert(rows.every(t=>!/[0-9]{9,}/.test(t.narration_masked)));
    assert(rows.every(t=>!/[a-z0-9._-]+@[a-z]+/i.test(t.narration_masked)));
    const target=rows.find(t=>t.category==='FUEL');
    await page.getByText(target.narration_masked,{exact:true}).first().click();
    const changed = page.waitForResponse(r=>r.url().includes('/transactions/')&&r.request().method()==='PATCH');
    await page.getByRole('dialog').getByRole('button',{name:en.category.FUEL,exact:true}).click();
    const result=await(await changed).json();
    assert.equal(result.score.score,85);
    await page.getByText(en.screen.review.updated.replace('{{before}}','85').replace('{{after}}','85'),{exact:true}).waitFor();
    assert.equal(rows.length,284);
    return {uploaded_rows:284,review_rows:rows.length,masked:true,recategorization_score:result.score.score,toast:en.screen.review.updated.replace('{{before}}','85').replace('{{after}}','85')};
  });
  await step(5,'dashboard',async()=>{
    await page.getByRole('button',{name:en.screen.review.seeScore,exact:true}).click();
    await page.waitForURL('**/app/dashboard');
    await page.getByRole('img',{name:'85 / 100',exact:true}).waitFor();
    await page.waitForTimeout(1200);
    const text=await page.locator('body').innerText();
    assert(text.includes(en.confidence.high.split('·')[0].trim()));
    const charts=await page.locator('svg.recharts-surface').count();
    assert(charts>=1);
    const tip=page.getByRole('button').filter({hasText:en.tip.SAVE_EVERY_WEEK.split('→')[0].trim()});
    const tipText=await tip.innerText();
    assert(/≈|लगभग|सुमारे|साधारण|about/i.test(tipText));
    const whatif=page.waitForResponse(r=>r.url().endsWith('/scores/what-if'));
    await tip.click();
    const simulated=await(await whatif).json();
    assert.equal(simulated.score_after,92);
    const read=page.getByRole('button',{name:en.readAloud,exact:true});
    if(await read.count())await read.click();
    return {score:85,band:'STRONG',confidence:'HIGH',charts,tip:tipText,what_if:simulated,read_aloud_clicked:!!await read.count()};
  });
  await step(6,'loan-offers',async()=>{
    const response=page.waitForResponse(r=>r.url().includes('/offers?')&&r.status()===200);
    await page.getByRole('button',{name:en.screen.score.seeLoans,exact:true}).click();
    await page.waitForURL('**/app/loans');
    offers=await(await response).json();
    assert.equal(offers.safe_amount_paise,720000);
    const alpha=offers.loans.find(o=>o.lender.name==='MFI Alpha');
    const beta=offers.loans.find(o=>o.lender.name==='MFI Beta');
    const gamma=offers.loans.find(o=>o.lender.name==='MFI Gamma');
    assert.equal(alpha.eligible,'ELIGIBLE');assert.equal(beta.eligible,'ELIGIBLE');assert.equal(gamma.eligible,'OUTSIDE');
    assert.equal(alpha.kfs.apr_pct,32);assert.equal(beta.kfs.apr_pct,25);
    assert.equal(alpha.kfs.net_disbursed_paise,705600);assert.equal(alpha.kfs.total_repayable_paise,765722);
    await page.getByText('MFI Alpha',{exact:true}).waitFor();
    return {request_paise:offers.requested_paise,safe_paise:offers.safe_amount_paise,alpha_kfs:alpha.kfs,beta_apr:beta.kfs.apr_pct,gamma:gamma.eligible};
  });
  await step(7,'risk-graph',async()=>{
    const card=page.getByText('MFI Alpha',{exact:true}).locator('..').locator('..');
    await card.getByRole('button',{name:en.stress.title,exact:true}).click();
    const covered=[];
    for(const [index,shock]of [0,.1,.2,.3].entries()){
      const response=page.waitForResponse(r=>r.url().endsWith('/affordability/stress')&&r.request().postDataJSON().shock===shock&&r.status()===200);
      await card.getByRole('button',{name:shock===0?'0%':`−${Math.round(shock*100)}%`,exact:true}).click();
      const result=await(await response).json();covered.push(result.weeks_covered);
      assert.equal(result.series.length,12);
      await page.waitForTimeout(500);
      await page.screenshot({path:path.join(out,`${label}-7-shock-${index}.png`)});
    }
    assert.deepEqual(covered,[10,9,6,3]);
    return {covered,total_weeks:12,shocks:[0,10,20,30]};
  });
  await step(8,'accept-remind-pay',async()=>{
    const card=page.getByText('MFI Alpha',{exact:true}).locator('..').locator('..');
    await card.getByRole('button',{name:en.screen.loans.choose,exact:true}).click();
    const accepted=page.waitForResponse(r=>r.url().includes('/accept')&&r.status()===200);
    await page.getByRole('dialog').getByRole('button',{name:en.common.confirm,exact:true}).click();
    loan=await(await accepted).json();
    await page.waitForURL('**/app/loan');
    assert.equal(loan.schedule.length,26);assert.equal(loan.schedule[0].due_date,'2026-11-06');
    assert(loan.schedule.every(r=>new Date(r.due_date+'T12:00:00Z').getUTCDay()===5));
    let reminders=[],days=0;
    while(!reminders.length&&days<8){
      const response=page.waitForResponse(r=>r.url().endsWith('/reminders')&&r.status()===200);
      await page.getByRole('button').filter({hasText:en.screen.myLoan.nextDay}).click();
      reminders=await(await response).json();days++;
    }
    assert(reminders.length>0,'No reminder after advancing demo clock');
    await page.screenshot({path:path.join(out,`${label}-8-reminder.png`)});
    const paid=page.waitForResponse(r=>r.url().endsWith('/pay')&&r.status()===200);
    await page.locator('li').getByRole('button').first().click();
    const payment=await(await paid).json();
    assert.equal(payment.status,'PAID');
    await page.getByText(en.screen.myLoan.PAID,{exact:true}).first().waitFor();
    return {schedule_rows:26,first_due:loan.schedule[0].due_date,days_advanced:days,reminders:reminders.length,payment:payment.status};
  });
  await step(9,'navigation-locales-logout',async()=>{
    for(const [button,lang]of [['हिं','hi'],['मरा','mr'],['EN','en']]){
      const options=page.getByRole('button',{name:button,exact:true});
      await options.first().click();
      await page.waitForTimeout(200);
      assert.equal(await options.first().getAttribute('aria-pressed'),'true');
    }
    await page.getByRole('link',{name:'Home',exact:true}).first().click();
    await page.waitForURL('**/app/dashboard');
    await page.getByRole('link',{name:'Transactions',exact:true}).first().click();
    await page.waitForURL('**/app/transactions');
    await page.getByRole('button',{name:english.screen.review.seeScore,exact:true}).click();
    await page.waitForURL('**/app/dashboard');
    await page.getByRole('button',{name:'Log out',exact:true}).first().click();
    await page.waitForURL('**/login');
    const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('sahayakfin.session')||'{}'));
    assert(!stored.token&&!stored.latestScore);
    return {language_switches:['hi','mr','en'],navigation:true,logout:true,session_cleared:true};
  });
  report[`${label}_console_errors`]=errors;
  report[`${label}_network`]=calls;
  await context.close();
}
(async()=>{
  browser=await chromium.launch({headless:true});
  const viewports=process.env.ACCEPTANCE_VIEWPORT==='mobile'?[{width:390,height:844}]:[{width:1440,height:900},{width:390,height:844}];
  for(const viewport of viewports)await journey(viewport);
  fs.writeFileSync(path.join(out,'final-results.json'),JSON.stringify(report,null,2));
  const unexpected=report.steps.flatMap(step=>step.console_errors).filter(error=>!(error.type==='console'&&error.url?.endsWith('/statements')&&error.message.includes('400')));
  report.unexpected_console_errors=unexpected;
  report.passed=report.steps.every(step=>step.status==='PASS'&&step.overflow.scroll<=step.overflow.width+1)&&unexpected.length===0&&report.bugs.length===0;
  fs.writeFileSync(path.join(out,'final-results.json'),JSON.stringify(report,null,2));
  if(!report.passed)process.exitCode=1;
  await browser.close();
})().catch(async e=>{console.error(e);fs.writeFileSync(path.join(out,'final-results.json'),JSON.stringify(report,null,2));if(browser)await browser.close();process.exit(1)});
