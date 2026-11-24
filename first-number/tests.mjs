/* first-number — browser checks.
 * Run from this folder:  node tests.mjs
 * Needs Playwright + Chromium on the machine; nothing is installed by this file.
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const URL  = 'file://' + join(HERE, 'index.html');

let pass = 0, fail = 0;
const ok  = (name, cond, extra='') => {
  if (cond) { pass++; }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '  — ' + extra : '')); }
};
const eq = (name, got, want) => ok(name, got === want, `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);

const nisToInt = s => parseInt(String(s).replace(/[^\d]/g, ''), 10);

const browser = await chromium.launch();

async function fresh(opts = {}) {
  const ctx  = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  return { ctx, page, errs };
}

/* fill one visit through the form, as Dani would */
async function fillVisit(page, v) {
  for (const [id, val] of Object.entries(v)) {
    const el = page.locator('#' + id);
    const tag = await el.evaluate(e => e.tagName + ':' + (e.type || ''));
    if (tag.startsWith('SELECT')) await el.selectOption(String(val));
    else { await el.fill(''); await el.fill(String(val)); }
  }
}

const OFFICE_A = { biz:'משרד א', visitDate:'2026-11-26', team:'8', rate:'180',
  paperCount:'20', paperMin:'60', chaseHours:'10' };
const OFFICE_B = { biz:'משרד ב', visitDate:'2026-11-30', team:'5', rate:'150',
  paperCount:'4', paperMin:'30', quoteCount:'10', quoteMin:'180' };

/* ───────────────────────── 1. night 1 behaviour still holds ───────────────────────── */
{
  const { ctx, page, errs } = await fresh();
  ok('1.1 loads with the sample visit', (await page.locator('#sampleBar').isVisible()));
  ok('1.2 sample number is live in the sticky bar',
     /₪/.test(await page.locator('#sBig').textContent()));
  await page.locator('#tab-sheet').click();
  ok('1.3 sheet renders for the sample', await page.locator('.sheet .hero .v').isVisible());

  /* the column adds up by hand: rows round first, then total */
  const sums = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#sheet tbody tr:not(.tot)')];
    const n = s => parseInt(s.replace(/[^\d]/g,''),10);
    const per = rows.map(r => {
      const c = r.querySelectorAll('td');
      return { hours: parseFloat(c[1].textContent), rate: n(c[2].textContent), cost: n(c[3].textContent) };
    });
    const tot = document.querySelector('#sheet tbody tr.tot').querySelectorAll('td');
    return { per, totHours: parseFloat(tot[1].textContent), totCost: n(tot[3].textContent) };
  });
  ok('1.4 every row: hours x rate = cost as printed',
     sums.per.every(r => Math.round(r.hours * r.rate) === r.cost));
  eq('1.5 the column equals the printed total',
     sums.per.reduce((s,r)=>s+r.cost,0), sums.totCost);
  ok('1.6 printed hours equal the sum of printed hours',
     Math.abs(sums.per.reduce((s,r)=>s+r.hours,0) - sums.totHours) < 0.051);

  await page.locator('#tab-ask').click();
  await page.locator('#biz').fill('משרד אמיתי');
  ok('1.8 the sample-data bar really leaves the screen once the visit is real',
     await page.locator('#sampleBar').isHidden());
  ok('1.7 no console errors on the sample path', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

/* ───────────────────────── 2. the book holds more than one visit ───────────────────── */
{
  const { ctx, page, errs } = await fresh();
  await page.locator('#clearBtn').click();                 /* real visit beside the sample */
  await fillVisit(page, OFFICE_A);
  const aCost = nisToInt(await page.locator('#sBig').textContent());
  ok('2.1 office A has a number', aCost > 0);

  await page.locator('#newBtn').click();
  await fillVisit(page, OFFICE_B);
  const bCost = nisToInt(await page.locator('#sBig').textContent());
  ok('2.2 office B has its own number', bCost > 0 && bCost !== aCost);

  eq('2.3 the picker holds sample + A + B',
     await page.locator('#visitPick option').count(), 3);
  ok('2.4 the count line says three visits',
     /3/.test(await page.locator('#visitCount').textContent()));

  /* this is the night-1 defect: go back to A and it must still be there */
  const ids = await page.locator('#visitPick option').evaluateAll(o => o.map(x => x.value));
  await page.locator('#visitPick').selectOption(ids[1]);
  eq('2.5 office A survived the second visit', await page.locator('#biz').inputValue(), OFFICE_A.biz);
  eq('2.6 office A kept its own number', nisToInt(await page.locator('#sBig').textContent()), aCost);
  eq('2.7 office A kept its own rate', await page.locator('#rate').inputValue(), OFFICE_A.rate);

  await page.locator('#visitPick').selectOption(ids[2]);
  eq('2.8 office B is intact too', await page.locator('#biz').inputValue(), OFFICE_B.biz);
  eq('2.9 office B kept its number', nisToInt(await page.locator('#sBig').textContent()), bCost);

  /* survives a reload */
  await page.reload();
  eq('2.10 all three visits survive a reload',
     await page.locator('#visitPick option').count(), 3);
  eq('2.11 the open visit is remembered', await page.locator('#biz').inputValue(), OFFICE_B.biz);
  ok('2.12 no console errors across two visits', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

/* ───────────────────────── 3. night 1's single visit is migrated, not lost ────────── */
{
  const { ctx, page, errs } = await fresh();
  await page.evaluate(() => {
    localStorage.clear();   /* drop the v2 book this load just wrote */
    localStorage.setItem('atidi-first-number-v1', JSON.stringify({
      biz:'משרד מליל אתמול', visitDate:'2026-11-23', team:'7', rate:'165',
      paperCount:'12', paperMin:'45', paperRate:'165', chaseHours:'8', chaseRate:'120',
      hpm:'182', cutSmall:'0.2', cutBig:'0.5', share:'50', showSave:false
    }));
  });
  await page.reload();
  eq('3.1 the v1 visit is the open visit', await page.locator('#biz').inputValue(), 'משרד מליל אתמול');
  eq('3.2 its answers came across', await page.locator('#paperCount').inputValue(), '12');
  ok('3.3 it has a number', nisToInt(await page.locator('#sBig').textContent()) > 0);
  ok('3.4 the v1 key is left untouched',
     await page.evaluate(() => !!localStorage.getItem('atidi-first-number-v1')));
  ok('3.5 a v2 book now exists',
     await page.evaluate(() => !!localStorage.getItem('atidi-first-number-v2')));
  ok('3.6 migrated visit is not treated as the sample', !(await page.locator('#sampleBar').isVisible()));
  ok('3.7 no console errors on the migration path', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

/* ───────────────────────── 4. nothing deletes a visit on its own ──────────────────── */
{
  const { ctx, page } = await fresh();
  ok('4.1 delete is hidden while there is one visit', await page.locator('#delBtn').isHidden());
  await page.locator('#clearBtn').click();
  await fillVisit(page, OFFICE_A);
  ok('4.2 delete appears once a second visit exists', await page.locator('#delBtn').isVisible());

  await page.locator('#delBtn').click();                     /* first tap = arm only */
  eq('4.3 one tap does not delete', await page.locator('#visitPick option').count(), 2);
  ok('4.4 the button asks again', /שוב/.test(await page.locator('#delBtn').textContent()));
  await page.locator('#delBtn').click();                     /* second tap = delete */
  eq('4.5 two taps delete one visit', await page.locator('#visitPick option').count(), 1);

  /* the arming resets, so a stray tap later cannot delete */
  await page.locator('#newBtn').click();
  await page.locator('#delBtn').click();
  eq('4.6 arming resets between visits', await page.locator('#visitPick option').count(), 2);
  await ctx.close();
}

/* ───────────────────────── 5. the comparison tells the truth ──────────────────────── */
{
  const { ctx, page, errs } = await fresh();
  await page.locator('#tab-compare').click();
  ok('5.1 empty state before any real visit',
     /עוד אין ביקור אמיתי/.test(await page.locator('#compare').textContent()));

  await page.locator('#tab-ask').click();
  await page.locator('#clearBtn').click();
  await fillVisit(page, OFFICE_A);
  await page.locator('#tab-compare').click();
  const one = await page.locator('#compare').textContent();
  ok('5.2 the sample is kept out of the table',
     !/דוגמה/.test(await page.locator('#compare tbody').textContent()));
  eq('5.3 one real visit = one row', await page.locator('#compare tbody tr').count(), 1);
  ok('5.4 one visit is not called a pattern', /ביקור אחד הוא לא תבנית/.test(one));

  await page.locator('#tab-ask').click();
  await page.locator('#newBtn').click();
  await fillVisit(page, OFFICE_B);
  await page.locator('#tab-compare').click();
  eq('5.5 two real visits = two rows', await page.locator('#compare tbody tr').count(), 2);
  const two = await page.locator('#compare').textContent();
  ok('5.6 the pattern line names a leak and a count',
     /הדליפה הגדולה ב-\d+ מתוך 2 הביקורים/.test(two));

  /* the averages are the printed per-visit numbers, not re-derived ones */
  const nums = await page.evaluate(() => {
    const n = s => parseInt(s.replace(/[^\d]/g,''),10);
    const rows = [...document.querySelectorAll('#compare tbody tr')]
      .map(r => n(r.querySelectorAll('td')[1].textContent));
    const box = document.querySelector('#compare .box p').textContent;
    const found = [...box.matchAll(/₪([\d,]+)/g)].map(m => n(m[1]));
    return { rows, found };
  });
  const lo = Math.min(...nums.rows), hi = Math.max(...nums.rows);
  const avg = Math.round(nums.rows.reduce((s,c)=>s+c,0)/nums.rows.length);
  eq('5.7 the range and the average match the rows', nums.found.join(','), [lo,hi,avg].join(','));

  ok('5.8 no console errors on the comparison', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

/* ───────────────────────── 6. the gate cannot be moved ───────────────────────────── */
{
  const { ctx, page } = await fresh();
  const addVisit = async (biz, date, outcome) => {
    await page.locator('#tab-ask').click();
    await page.locator('#newBtn').click();
    await fillVisit(page, { biz, visitDate:date, rate:'170', paperCount:'10', paperMin:'40' });
    await page.locator('#outcome').selectOption(outcome);
  };
  await page.locator('#tab-compare').click();
  await page.locator('#tab-ask').click();

  await addVisit('א','2026-11-26','no');
  await page.locator('#tab-compare').click();
  ok('6.1 one marked visit: no verdict yet',
     /עוד אין הכרעה/.test(await page.locator('#compare').textContent()));
  ok('6.2 the threshold is printed as it was set',
     /2 מתוך 4/.test(await page.locator('#compare').textContent()));

  await addVisit('ב','2026-11-27','asked');
  await addVisit('ג','2026-11-28','asked');
  await page.locator('#tab-compare').click();
  const t3 = await page.locator('#compare').textContent();
  ok('6.3 two asked out of three marked = pass', /עובר/.test(t3));
  ok('6.4 pass is shown with the real counts', /2 מתוך 3/.test(t3));

  await ctx.close();
}
{
  const { ctx, page } = await fresh();
  const addVisit = async (biz, date, outcome) => {
    await page.locator('#tab-ask').click();
    await page.locator('#newBtn').click();
    await fillVisit(page, { biz, visitDate:date, rate:'170', paperCount:'10', paperMin:'40' });
    await page.locator('#outcome').selectOption(outcome);
  };
  for (const [b,d] of [['א','2026-11-26'],['ב','2026-11-27'],['ג','2026-11-28'],['ד','2026-11-29']])
    await addVisit(b, d, 'no');
  await page.locator('#tab-compare').click();
  const t = await page.locator('#compare').textContent();
  ok('6.5 four marked, none asked = fail', /נכשל/.test(t));
  ok('6.6 the failure names the offer, not the tool', /הבעיה היא ההצעה/.test(t));
  await ctx.close();
}

/* ───────────────────────── 7. the hour's own fields ──────────────────────────────── */
{
  const { ctx, page } = await fresh();
  await page.locator('#clearBtn').click();
  await fillVisit(page, OFFICE_A);
  await page.locator('#note').fill('המפקח כותב הכל בוורד');
  await page.locator('#outcome').selectOption('asked');
  await page.reload();
  eq('7.1 the outcome survives a reload', await page.locator('#outcome').inputValue(), 'asked');
  eq('7.2 the one-line memory survives', await page.locator('#note').inputValue(), 'המפקח כותב הכל בוורד');
  await page.locator('#tab-compare').click();
  ok('7.3 the memory line shows in the comparison',
     /וורד/.test(await page.locator('#compare').textContent()));
  ok('7.4 the outcome shows in the comparison',
     /שאל כמה עולה המפה/.test(await page.locator('#compare').textContent()));

  /* the owner's sheet must not carry the experiment's own marks */
  await page.locator('#tab-sheet').click();
  const sheet = await page.locator('#sheet').textContent();
  ok('7.5 the owner sheet never shows the outcome', !/שאל כמה עולה המפה/.test(sheet));
  ok('7.6 the owner sheet never shows the memory line', !/וורד/.test(sheet));
  ok('7.7 the owner sheet carries no price', !/3,500|3500/.test(sheet));
  ok('7.8 the other offices are off the screen he turns around',
     await page.locator('#visitBar').isHidden());
  await page.locator('#tab-ask').click();
  ok('7.9 the visit bar comes back on his own tabs',
     await page.locator('#visitBar').isVisible());
  await ctx.close();
}

/* ───────────────────────── 8. phone, dark, print ─────────────────────────────────── */
{
  const { ctx, page, errs } = await fresh({ viewport:{width:390,height:844}, deviceScaleFactor:1,
                                            colorScheme:'dark' });
  await page.locator('#clearBtn').click();
  await fillVisit(page, OFFICE_A);
  const over = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok('8.1 no sideways scroll on the visit tab at 390px', over <= 1, 'overflow ' + over);
  ok('8.2 the visit bar is usable on a phone', await page.locator('#visitPick').isVisible());

  await page.locator('#tab-compare').click();
  const over2 = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok('8.3 no sideways scroll on the comparison at 390px', over2 <= 1, 'overflow ' + over2);

  await page.locator('#tab-sheet').click();
  const over3 = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok('8.4 no sideways scroll on the sheet at 390px', over3 <= 1, 'overflow ' + over3);
  ok('8.5 dark mode keeps the hero readable',
     await page.locator('.sheet .hero .v').isVisible());

  /* print: from any tab, what prints is the owner's sheet */
  await page.locator('#tab-compare').click();
  await page.emulateMedia({ media:'print' });
  ok('8.6 the comparison does not print', await page.locator('#pane-compare').isHidden());
  ok('8.7 the owner sheet prints from any tab', await page.locator('#sheet .sheet').isVisible());
  ok('8.8 the visit bar does not print', await page.locator('.visitbar').isHidden());
  await page.emulateMedia({ media:'screen' });

  ok('8.9 no console errors on phone + dark', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

/* ───────────────────────── 9. the sheet fits one A4 page ─────────────────────────── */
{
  const { ctx, page } = await fresh({ viewport:{width:1100,height:900} });
  await page.locator('#clearBtn').click();
  await fillVisit(page, { ...OFFICE_A, quoteCount:'9', quoteMin:'150',
                          leads:'20', leadsMissed:'6', dealValue:'40000', leadsWin:'2' });
  await page.locator('#tab-sheet').click();
  const pdf = await page.pdf({ format:'A4', printBackground:true });
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  eq('9.1 the full sheet still prints on one A4 page', pages, 1);
  await ctx.close();
}

/* ───────────────────── 10. arithmetic fuzz: 80 random visits ─────────────────────── */
{
  const { ctx, page } = await fresh();
  const bad = await page.evaluate(() => {
    const ri = (a,b) => a + Math.floor(Math.random()*(b-a+1));
    const faults = [];
    const set = (id,v) => { const e=document.getElementById(id); e.value=v;
      e.dispatchEvent(new Event('input',{bubbles:true})); };
    for (let i=0;i<80;i++){
      ['paperCount','paperMin','paperRate','quoteCount','quoteMin','quoteRate',
       'chaseHours','chaseRate','rate','team'].forEach(id => set(id,''));
      set('biz','fuzz '+i);
      set('rate', ri(80,400));
      set('paperCount', ri(0,40)); set('paperMin', ri(0,180));
      set('quoteCount', ri(0,30)); set('quoteMin', ri(0,300));
      set('chaseHours', ri(0,60));
      if (Math.random()<0.5) set('paperRate', ri(60,300));
      if (Math.random()<0.5) set('chaseRate', ri(60,300));
      document.getElementById('tab-sheet').click();
      const rows=[...document.querySelectorAll('#sheet tbody tr:not(.tot)')];
      if(!rows.length){ document.getElementById('tab-ask').click(); continue; }
      const n=s=>parseInt(s.replace(/[^\d]/g,''),10);
      let sumCost=0, sumHours=0;
      rows.forEach(r=>{
        const c=r.querySelectorAll('td');
        const hh=parseFloat(c[1].textContent), rr=n(c[2].textContent), cc=n(c[3].textContent);
        if(Math.round(hh*rr)!==cc) faults.push('row '+i+': '+hh+'x'+rr+'!='+cc);
        sumCost+=cc; sumHours+=hh;
      });
      const tot=document.querySelector('#sheet tbody tr.tot').querySelectorAll('td');
      const tc=n(tot[3].textContent), th=parseFloat(tot[1].textContent);
      if(tc!==sumCost) faults.push('total '+i+': '+sumCost+'!='+tc);
      if(Math.abs(th-sumHours)>0.051) faults.push('hours '+i+': '+sumHours+'!='+th);
      document.getElementById('tab-ask').click();
    }
    return faults;
  });
  ok('10.1 80 random visits: every row adds up as printed', bad.length === 0, bad.slice(0,3).join(' | '));
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
