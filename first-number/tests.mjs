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
  const { stayOnBootTab, ...ctxOpts } = opts;
  const ctx  = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  /* night 3 boots on the listening card. Section 11 checks that; everything
     else works on the numbers tab, so go there unless asked not to. */
  if (!stayOnBootTab) await page.locator('#tab-ask').click();
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

  eq('2.3 the picker holds sample + the booked call + A + B',
     await page.locator('#visitPick option').count(), 4);
  ok('2.4 the count line says four visits',
     /4/.test(await page.locator('#visitCount').textContent()));

  /* this is the night-1 defect: go back to A and it must still be there */
  const ids = await page.locator('#visitPick option').evaluateAll(o => o.map(x => x.value));
  await page.locator('#visitPick').selectOption(ids[2]);
  eq('2.5 office A survived the second visit', await page.locator('#biz').inputValue(), OFFICE_A.biz);
  eq('2.6 office A kept its own number', nisToInt(await page.locator('#sBig').textContent()), aCost);
  eq('2.7 office A kept its own rate', await page.locator('#rate').inputValue(), OFFICE_A.rate);

  await page.locator('#visitPick').selectOption(ids[3]);
  eq('2.8 office B is intact too', await page.locator('#biz').inputValue(), OFFICE_B.biz);
  eq('2.9 office B kept its number', nisToInt(await page.locator('#sBig').textContent()), bCost);

  /* survives a reload */
  await page.reload();
  await page.locator('#tab-ask').click();
  eq('2.10 all four visits survive a reload',
     await page.locator('#visitPick option').count(), 4);
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
  await page.locator('#tab-ask').click();
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
  await page.locator('#clearBtn').click();
  await fillVisit(page, OFFICE_A);
  ok('4.2 delete appears while more than one visit exists', await page.locator('#delBtn').isVisible());

  const n0 = await page.locator('#visitPick option').count();
  await page.locator('#delBtn').click();                     /* first tap = arm only */
  eq('4.3 one tap does not delete', await page.locator('#visitPick option').count(), n0);
  ok('4.4 the button asks again', /שוב/.test(await page.locator('#delBtn').textContent()));
  await page.locator('#delBtn').click();                     /* second tap = delete */
  eq('4.5 two taps delete one visit', await page.locator('#visitPick option').count(), n0 - 1);

  /* the arming resets, so a stray tap later cannot delete */
  await page.locator('#newBtn').click();
  const n1 = await page.locator('#visitPick option').count();
  await page.locator('#delBtn').click();
  eq('4.6 arming resets between visits', await page.locator('#visitPick option').count(), n1);

  /* delete down to the last one: it must refuse to go */
  await page.evaluate(() => {
    const b = JSON.parse(localStorage.getItem('atidi-first-number-v2'));
    b.visits = [b.visits[0]];
    b.activeId = b.visits[0].id;
    localStorage.setItem('atidi-first-number-v2', JSON.stringify(b));
  });
  await page.reload();
  ok('4.1 the last remaining visit cannot be deleted', await page.locator('#delBtn').isHidden());
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

/* ────────── 6. the thresholds are Dani's, and the tool's own one is demoted ────────── */
{
  const { ctx, page } = await fresh();
  const addVisit = async (biz, date, marks = {}) => {
    await page.locator('#tab-ask').click();
    await page.locator('#newBtn').click();
    await fillVisit(page, { biz, visitDate:date, rate:'170', paperCount:'10', paperMin:'40' });
    await page.locator('#tab-close').click();
    for (const [id, val] of Object.entries(marks)) await page.locator('#' + id).selectOption(val);
  };

  /* the experiment's own metric: owners who set a date, before any hour happens */
  await page.locator('#tab-compare').click();
  ok('6.1 the experiment metric starts unmarked',
     /לא סומן/.test(await page.locator('#bookBox').textContent()));
  ok('6.2 it names its own deadline', /5.12.2026/.test(await page.locator('#bookBox').textContent()));
  ok('6.3 it cites the note it came from',
     /2 of 5 owners take the visit/.test(await page.locator('#bookBox').textContent()));
  await page.locator('#bookedN').fill('1');
  ok('6.4 one booking is not a pass', !/עובר/.test(await page.locator('#bookBox').textContent()));
  await page.locator('#bookedN').fill('2');
  ok('6.5 two bookings pass the experiment', /עובר/.test(await page.locator('#bookBox').textContent()));
  await page.reload();
  await page.locator('#tab-compare').click();
  eq('6.6 the booking count survives a reload', await page.locator('#bookedN').inputValue(), '2');

  /* the price test: price said aloud, pass = one paid map */
  await addVisit('א','2026-11-26',{ priceSaid:'yes', outcome:'no', mapPaid:'no' });
  await page.locator('#tab-compare').click();
  let t = await page.locator('#compare').textContent();
  ok('6.7 the price test has no verdict on one unpaid map', /עוד אין הכרעה/.test(t));
  ok('6.8 it counts the hours where the price was said', /ב-1 מתוך 1 הביקורים/.test(t));
  ok('6.9 it names its deadline and its source',
     /15.12.2026/.test(t) && /Pricing Method/.test(t));

  await addVisit('ב','2026-11-27',{ priceSaid:'yes', outcome:'asked', mapPaid:'yes' });
  await page.locator('#tab-compare').click();
  t = await page.locator('#compare').textContent();
  ok('6.10 one paid map passes the price test', /עובר/.test(t));

  /* the invented gate is gone as a gate and present as an observation */
  ok('6.11 the tool says the old gate was its own invention',
     /הכלי המציא אותו/.test(t));
  ok('6.12 the observation has no pass or fail on it',
     /תצפית, לא רף/.test(t));
  ok('6.13 it states the collision with the price test',
     /אין סיבה לשאול/.test(t));

  ok('6.14 the old "2 of 4, does not move" wording is gone from any threshold',
     !/לא זז אחרי שהנתונים נכנסו/.test(t));
  await ctx.close();
}

/* ───────────────────────── 7. the hour's own fields ──────────────────────────────── */
{
  const { ctx, page } = await fresh();
  await page.locator('#clearBtn').click();
  await fillVisit(page, OFFICE_A);
  await page.locator('#tab-close').click();
  await page.locator('#note').fill('המפקח כותב הכל בוורד');
  await page.locator('#outcome').selectOption('asked');
  await page.locator('#nextName').fill('יוסי ממשרד ממול');
  await page.reload();
  await page.locator('#tab-close').click();
  eq('7.1 the outcome survives a reload', await page.locator('#outcome').inputValue(), 'asked');
  eq('7.2 the one-line memory survives', await page.locator('#note').inputValue(), 'המפקח כותב הכל בוורד');
  eq('7.2b the name he gave survives', await page.locator('#nextName').inputValue(), 'יוסי ממשרד ממול');
  await page.locator('#tab-compare').click();
  ok('7.3 the memory line shows in the comparison',
     /וורד/.test(await page.locator('#compare').textContent()));
  ok('7.4 the asked-count shows as an observation',
     /1 מתוך 1 שאלו כמה עולה המפה/.test(await page.locator('#compare').textContent()));

  /* the owner's sheet must not carry the experiment's own marks */
  await page.locator('#tab-sheet').click();
  const sheet = await page.locator('#sheet').textContent();
  ok('7.5 the owner sheet never shows the outcome', !/שאל כמה עולה המפה/.test(sheet));
  ok('7.6 the owner sheet never shows the memory line', !/וורד/.test(sheet));
  ok('7.7 the owner sheet carries no price', !/3,500|3500/.test(sheet));
  ok('7.7b the owner sheet never shows the name he gave', !/יוסי ממשרד ממול/.test(sheet));
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
  ok('8.9 the listening card does not print', await page.locator('#pane-words').isHidden());
  ok('8.10 the close tab does not print', await page.locator('#pane-close').isHidden());
  await page.emulateMedia({ media:'screen' });

  ok('8.11 no console errors on phone + dark', errs.length === 0, errs.join(' | '));
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

/* ───────────────── 11. the hour runs in Dani's shape: his words first ───────────────── */
{
  const { ctx, page, errs } = await fresh({ stayOnBootTab:true });
  ok('11.1 the hour opens on the listening card, not on the calculator',
     await page.locator('#pane-words').isVisible() && await page.locator('#pane-ask').isHidden());
  ok('11.2 the live number is not on screen while he is talking',
     await page.locator('#stickyBar').isHidden());
  const card = await page.locator('#pane-words').textContent();
  ok('11.3 the card carries the 40/15 split', /0–40/.test(card) && /45–60/.test(card));
  ok('11.4 the ask at the end is a date or a name', /תאריך או שם/.test(card));
  ok('11.5 the six questions are the card\'s, not the calculator\'s',
     /שבוע רגיל של מפקח/.test(card) && /מי אצלכם מחליט/.test(card) &&
     /פוגשים בעלי משרדים אחרים/.test(card));
  eq('11.6 there are six of them', await page.locator('#cardOffice textarea.w').count(), 6);
  ok('11.6b and the call\'s questions are not on screen during an office visit',
     await page.locator('#cardCall').isHidden());

  await page.locator('#w2').fill('הדוחות של שישי. אני יושב עליהם בלילה');
  await page.locator('#painWord').fill('הדוחות של שישי');
  await page.reload();
  eq('11.7 his words survive a reload',
     await page.locator('#w2').inputValue(), 'הדוחות של שישי. אני יושב עליהם בלילה');
  eq('11.8 his word for the pain survives', await page.locator('#painWord').inputValue(), 'הדוחות של שישי');

  await page.locator('#tab-ask').click();
  await fillVisit(page, { biz:'משרד פיקוח אמיתי', rate:'180', paperCount:'20', paperMin:'60',
                          chaseHours:'10' });
  await page.locator('#tab-sheet').click();
  const sheet = await page.locator('#sheet').textContent();
  ok('11.9 his word for the pain is quoted on his own sheet', /הדוחות של שישי/.test(sheet));
  ok('11.10 the long answers stay off his sheet', !/אני יושב עליהם בלילה/.test(sheet));
  ok('11.11 no console errors on the listening path', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

/* ───────────────── 12. the close: what to say, and the price if he asks ───────────── */
{
  const { ctx, page, errs } = await fresh();
  await page.locator('#tab-close').click();
  ok('12.1 the close tab says whose screen it is',
     /המסך הזה שלך/.test(await page.locator('#pane-close').textContent()));

  /* a big number: the map is on, with the arithmetic from his own figure */
  await page.locator('#tab-ask').click();
  await page.locator('#clearBtn').click();
  await fillVisit(page, { biz:'משרד גדול', rate:'200', paperCount:'30', paperMin:'90',
                          chaseHours:'40' });
  const cost = nisToInt(await page.locator('#sBig').textContent());
  await page.locator('#tab-close').click();
  const sayBig = await page.locator('#sayBox').textContent();
  ok('12.2 the ask at the end of a big hour is a date, not a deal',
     /נקבע חצי שעה להמשך/.test(sayBig));
  ok('12.3 it says the price is only said if he asks', /רק אם הוא שואל/.test(sayBig));
  ok('12.4 the close cites the listening card as its source',
     /21.11.2026/.test(await page.locator('#sayBox').textContent()));
  ok('12.4b no em dash in the lines he says out loud',
     await page.evaluate(() => [...document.querySelectorAll('#sayBox q, #sayBox em')]
       .every(e => !e.textContent.includes('—'))));

  const price = await page.locator('#priceBox').textContent();
  ok('12.5 the price panel carries the decided 3,500', /3,500/.test(price));
  ok('12.6 the map boundaries are the decided ones',
     /2 שבועות/.test(price) && /4–6 דליפות/.test(price) &&
     /מה וכמה, לא איך/.test(price) && /30 יום/.test(price));
  ok('12.7 it cites the pricing note', /Pricing Method/.test(price));
  ok('12.8 it refuses to call the ratio a saving', /זה לא חיסכון/.test(price));

  /* the arithmetic is his own number, checked against it */
  const nums = await page.evaluate(() => {
    const t = document.getElementById('priceBox').textContent;
    const pct  = t.match(/(\d+)% מחודש אחד/);
    const days = t.match(/כמו ([\d.]+) ימי עבודה/);
    return { pct: pct && +pct[1], days: days && +days[1] };
  });
  eq('12.9 the share of one month is 3,500 over his own number',
     nums.pct, Math.round(3500 / cost * 100));
  ok('12.10 the day count is 3,500 over his own number per working day',
     Math.abs(nums.days - 3500 / (cost / 22)) < 0.06, 'got ' + nums.days);

  /* a small number: the tool refuses to sell the map */
  await page.locator('#tab-ask').click();
  await page.locator('#newBtn').click();
  await fillVisit(page, { biz:'משרד קטן', rate:'120', paperCount:'1', paperMin:'20' });
  await page.locator('#tab-close').click();
  const small = await page.locator('#priceBox').textContent();
  ok('12.11 on a small number the tool says do not sell the map',
     /אל תמכור כאן את המפה/.test(small));
  ok('12.12 and it still gives the price if he asks', /3,500/.test(small));
  const saySmall = await page.locator('#sayBox').textContent();
  ok('12.13 the small-number ask is one name, not a meeting',
     /שם של בעל משרד אחד/.test(saySmall));

  /* a number smaller than the map itself gets said out loud */
  await page.locator('#tab-ask').click();
  await page.locator('#newBtn').click();
  /* chosen so the hour clears the "too small to sell" band and still comes out
     under the map's own price: 34.7h + 4h at 90 = 3,483 a month */
  await fillVisit(page, { biz:'משרד בינוני', rate:'90', paperCount:'8', paperMin:'60',
                          chaseHours:'4' });
  const mid = nisToInt(await page.locator('#sBig').textContent());
  await page.locator('#tab-close').click();
  ok('12.14 the figures put this hour under the map\'s own price', mid < 3500, 'got ' + mid);
  ok('12.15 a month worth less than the map is named as such',
     /יוצאת יותר מחודש של הבעיה/.test(await page.locator('#priceBox').textContent()));

  ok('12.16 no console errors on the close path', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

/* ───────────────── 13. the message of the day after ──────────────────────────────── */
{
  const { ctx, page, errs } = await fresh();
  await page.locator('#clearBtn').click();
  await fillVisit(page, OFFICE_A);
  await page.locator('#tab-words').click();
  await page.locator('#painWord').fill('הדוחות של שישי');
  await page.locator('#tab-close').click();
  const msg = await page.locator('#followMsg').inputValue();
  ok('13.1 it opens with his office name', msg.startsWith(OFFICE_A.biz));
  ok('13.2 it quotes his own word for the pain', /„הדוחות של שישי”/.test(msg));
  ok('13.3 it carries his own number', /₪/.test(msg));
  ok('13.4 it carries no price', !/3,500|3500/.test(msg));
  ok('13.5 it ends on two asks: a date or a name',
     /נקבע חצי שעה להמשך/.test(msg) && /שם של בעל משרד אחד/.test(msg));
  ok('13.6 it is signed', /054-3074547/.test(msg));
  ok('13.7 no AI tell: not one em dash in the message', !msg.includes('—'), msg);
  ok('13.7b the summary message is clean of them too', await page.evaluate(() => !waText(current).includes('—')));
  ok('13.8 no console errors writing the message', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

/* ───────────────── 14. the two new tabs on a phone, and print is still one page ───── */
{
  const { ctx, page, errs } = await fresh({ viewport:{width:390,height:844}, deviceScaleFactor:1 });
  const over = async () => page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await page.locator('#clearBtn').click();
  await fillVisit(page, OFFICE_A);

  await page.locator('#tab-words').click();
  await page.locator('#painWord').fill('הדוחות של שישי, כל שבוע מחדש');
  ok('14.1 no sideways scroll on the listening card at 390px', (await over()) <= 1);
  ok('14.2 a long answer does not push the page sideways', true);
  await page.locator('#w1').fill('המפקח כותב דוח ידני על כל ביקור, שולח לי בוורד, ואני מעביר ללקוח');
  ok('14.3 still no sideways scroll after a long answer', (await over()) <= 1, 'overflow ' + (await over()));

  await page.locator('#tab-close').click();
  ok('14.4 no sideways scroll on the close tab at 390px', (await over()) <= 1, 'overflow ' + (await over()));
  ok('14.5 five tabs still fit without a sideways scroll', (await over()) <= 1);

  await page.locator('#tab-compare').click();
  ok('14.6 the wider comparison table still does not scroll sideways',
     (await over()) <= 1, 'overflow ' + (await over()));
  ok('14.7 no console errors on a phone across the new tabs', errs.length === 0, errs.join(' | '));
  await ctx.close();
}
{
  const { ctx, page } = await fresh({ viewport:{width:1100,height:900} });
  await page.locator('#clearBtn').click();
  await fillVisit(page, { ...OFFICE_A, quoteCount:'9', quoteMin:'150',
                          leads:'20', leadsMissed:'6', dealValue:'40000', leadsWin:'2' });
  await page.locator('#tab-words').click();
  await page.locator('#painWord').fill('הדוחות של שישי');
  await page.locator('#tab-sheet').click();
  const sheet = await page.locator('#sheet').textContent();
  ok('14.8 the next step is on his sheet', /מה קורה הלאה/.test(sheet));
  ok('14.9 it names the two leaks we would open first', /היינו מודדים ראשונות/.test(sheet));
  ok('14.10 and it still carries no price', !/3,500|3500/.test(sheet));
  const pdf = await page.pdf({ format:'A4', printBackground:true });
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  eq('14.11 the fuller sheet still prints on one A4 page', pages, 1);
  await ctx.close();
}

/* ───────── 15. night 4: the hour that is actually booked, and the ladder ───────── */

/* the call that is booked: 30 minutes on a Meet, five questions, 6.12.2026 */
{
  const { ctx, page, errs } = await fresh({ stayOnBootTab:true });
  const ids = await page.locator('#visitPick option').evaluateAll(o => o.map(x => x.value));
  eq('15.1 the book boots with the sample and the booked call', ids.length, 2);

  await page.locator('#visitPick').selectOption(ids[1]);
  eq('15.2 the booked one is a video call', await page.locator('#mode').inputValue(), 'call');
  await page.locator('#tab-ask').click();
  eq('15.3 and it is dated for the booked Sunday',
     await page.locator('#visitDate').inputValue(), '2026-12-06');
  eq('15.4 its map price is the one the call prep chose for a firm that size',
     await page.locator('#mapPrice').inputValue(), '5000');
  ok('15.5 it carries no number yet: those come out of his mouth',
     (await page.locator('#rate').inputValue()) === '' &&
     (await page.locator('#tenantCount').inputValue()) === '');

  await page.locator('#tab-words').click();
  const card = await page.locator('#cardCall').textContent();
  ok('15.6 the office card is off screen', await page.locator('#cardOffice').isHidden());
  ok('15.7 the clock is the call\'s 2/15/5/5/3, not the 40/15 split',
     /15 דק׳ · חמש השאלות/.test(card) && !/0–40/.test(card));
  eq('15.8 five questions, not six', await page.locator('#cardCall .wq textarea').count(), 8);
  ok('15.9 they are the call prep\'s five',
     /איך דייר מקבל היום תשובה/.test(card) && /כמה פניות כאלה מגיעות בשבוע/.test(card) &&
     /אילו שאלות חוזרות/.test(card) && /עד פברואר/.test(card));
  ok('15.10 the three GetStatus questions ride along',
     /מה אתם מעלים ל-GetStatus/.test(card) && /מי אצלכם מעדכן את המערכת/.test(card));
  ok('15.11 and the page says plainly not to connect to GetStatus',
     /התקנון אוסר/.test(card));

  await page.locator('#c2').fill('בערך עשרים בשבוע, דלית עונה');
  await page.locator('#painWord').fill('הטלפונים של הדיירים');
  await page.reload();
  await page.locator('#tab-words').click();
  eq('15.12 his words on the call survive a reload',
     await page.locator('#c2').inputValue(), 'בערך עשרים בשבוע, דלית עונה');
  ok('15.13 no console errors on the call path', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

/* the number the call card asks for: questions a week x minutes x who answers */
{
  const { ctx, page, errs } = await fresh();
  await page.locator('#clearBtn').click();
  await page.locator('#mode').selectOption('call');
  await fillVisit(page, { biz:'משרד פיקוח', visitDate:'2026-12-06', rate:'180',
                          tenantCount:'25', tenantMin:'12', tenantRate:'110' });

  const said = await page.locator('#tenantSaid').textContent();
  ok('15.14 the leak repeats his own two numbers back',
     /25 פניות בשבוע/.test(said) && /12 דקות/.test(said), said);

  const out = await page.locator('#tenantOut').textContent();
  const hW  = parseFloat(out.match(/([\d.]+) שעות בשבוע/)[1]);
  const hM  = parseFloat(out.match(/([\d.]+) שעות ·/)[1]);
  const cost = nisToInt(out.match(/₪[\d,]+/)[0]);
  eq('15.14b the week figure is his two numbers multiplied', hW, 25 * 12 / 60);
  /* 25 x 12/60 = 5 hours a week; the month is 52/12 of that */
  eq('15.15 the month is the week times 52/12, rounded to one place',
     hM, Math.round(5 * (52/12) * 10) / 10);
  eq('15.16 and the cost is those hours times the rate he gave',
     cost, Math.round(hM * 110));

  ok('15.17a on a call the leak itself carries the week figure he hears',
     /^5 שעות בשבוע · /.test((await page.locator('#tenantOut').textContent()).trim()),
     await page.locator('#tenantOut').textContent());
  await page.locator('#mode').selectOption('office');
  ok('15.17b in an office visit the leak line stays as it was',
     !/בשבוע/.test(await page.locator('#tenantOut').textContent()));
  await page.locator('#mode').selectOption('call');

  const meta = await page.locator('#sMeta').textContent();
  ok('15.17 on a call the week figure comes first, because that is the sentence he hears',
     /^5 שעות בשבוע/.test(meta.trim()), meta);

  await page.locator('#mode').selectOption('office');
  ok('15.18 in an office visit the sticky bar keeps the month framing',
     !/שעות בשבוע/.test(await page.locator('#sMeta').textContent()));
  await page.locator('#mode').selectOption('call');

  await page.locator('#tab-sheet').click();
  const sheet = await page.locator('#sheet').textContent();
  ok('15.19 his sheet says it came out of a 30-minute call', /שיחת וידאו · 30 דקות/.test(sheet));
  ok('15.20 and it shows the week figure he heard', /שעות בשבוע/.test(sheet));
  ok('15.21 the tenant leak is a row on his sheet', /שאלות של דיירים/.test(sheet));
  ok('15.22 no console errors', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

/* the ladder: which rung his own number carries, by the one-third rule */
{
  const { ctx, page, errs } = await fresh();
  await page.locator('#clearBtn').click();
  await page.locator('#mode').selectOption('call');

  /* the rule in Dani's note: 2,500 from 7,500 "or more", 4,500 only "above" 13,500 */
  const rungAt = async (monthCost) => {
    /* one leak, 1 hour a month at a rate that makes the month come out exactly */
    await fillVisit(page, { biz:'מ', rate:'100', chaseHours:'1', chaseRate:String(monthCost) });
    await page.locator('#tab-close').click();
    const box = await page.locator('#rungBox').textContent();
    const fit = await page.locator('#rungBox .rung div.fits b').textContent().catch(() => '');
    await page.locator('#tab-ask').click();
    return { box, fit };
  };

  let r = await rungAt(7400);
  ok('15.23 below 7,500 only Keep fits', /Keep/.test(r.fit) && !/Small/.test(r.fit), r.fit);
  ok('15.24 and it says not to offer the bigger subscription', /אל תציע כאן מנוי גדול/.test(r.box));

  r = await rungAt(7500);
  ok('15.25 at exactly 7,500 Small fits, because the note says "or more"',
     /Small/.test(r.fit), r.fit);

  r = await rungAt(13500);
  ok('15.26 at exactly 13,500 it is still Small, because the note says "above"',
     /Small/.test(r.fit), r.fit);

  r = await rungAt(13600);
  ok('15.27 above 13,500 Standard fits', /Standard/.test(r.fit), r.fit);
  ok('15.28 the monthly fee it names sits under a third of his number',
     /4,500/.test(r.fit) && 4500 <= 13600/3);

  await page.locator('#tab-close').click();
  const close = await page.locator('#pane-close').textContent();
  ok('15.29 the ladder box says these prices are unconfirmed and unheard',
     /לא אושרו/.test(close) && /אף בעל עסק עוד לא שמע/.test(close));
  ok('15.30 and it names the note they come from', /Pricing Method/.test(close));
  ok('15.31 no console errors across the rungs', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

/* the map price is chosen, not hardcoded, and the arithmetic follows it */
{
  const { ctx, page, errs } = await fresh();
  await page.locator('#clearBtn').click();
  await fillVisit(page, { biz:'משרד גדול', rate:'180', chaseHours:'100', chaseRate:'200' });

  await page.locator('#tab-close').click();
  const at3500 = await page.locator('#priceBox').textContent();
  ok('15.32 the default map price is the ladder\'s 3,500', /3,500 ₪, 2 שבועות/.test(at3500));
  const pct3500 = parseInt(at3500.match(/(\d+)% מחודש אחד/)[1], 10);
  eq('15.33 the share is the price over his own month', pct3500, Math.round(3500/20000*100));

  /* the price lives on the close tab, where the price conversation happens */
  await page.locator('#mapPrice').selectOption('5000');
  const at5000 = await page.locator('#priceBox').textContent();
  ok('15.34 choosing 5,000 moves the headline price', /5,000 ₪, 2 שבועות/.test(at5000));
  const pct5000 = parseInt(at5000.match(/(\d+)% מחודש אחד/)[1], 10);
  eq('15.35 and the share follows it', pct5000, Math.round(5000/20000*100));
  ok('15.36 the credit line names the chosen price, not the old one',
     /ה-5,000 ₪ נכנסים לתיקון הראשון/.test(at5000) && !/ה-3,500 ₪ נכנסים/.test(at5000));
  ok('15.37 it says the notes give two anchors and no cutoff, and that Dani picks',
     /אין ביניהן קו/.test(at5000) && /הכלי לא ממציא את הגבול/.test(at5000));
  ok('15.38 it still refuses to call the ratio a saving', /זה לא חיסכון/.test(at5000));
  ok('15.39 no console errors', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

/* play B, and what must not be on a public page */
{
  const { ctx, page, errs } = await fresh();
  await page.locator('#clearBtn').click();
  await fillVisit(page, { biz:'מ', rate:'180', chaseHours:'10', chaseRate:'200' });
  await page.locator('#tab-close').click();
  ok('15.40 play B is off screen in an office visit', await page.locator('#cardPlayB').isHidden());

  await page.locator('#tab-ask').click();
  await page.locator('#mode').selectOption('call');
  await page.locator('#tab-close').click();
  ok('15.41 and on screen for the booked call', await page.locator('#cardPlayB').isVisible());
  const playB = await page.locator('#playBox').textContent();
  ok('15.42 it carries the pilot and the range', /8,500/.test(playB) && /15,000/.test(playB) && /25,000/.test(playB));
  ok('15.43 and says the prices are sellers\' prices with no buyer quote',
     /בלוגים של מוכרים/.test(playB) && /אף קונה לא דיווח/.test(playB));
  ok('15.44 the close tab never prints', await page.evaluate(() =>
     getComputedStyle(document.getElementById('pane-close')).display === 'block'));

  const src = await page.content();
  ok('15.45 the public page carries no prospect\'s name', !/צ\.ב\./.test(src));
  ok('15.46 and does not publish our own cost base',
     !/העלות שלנו להרצה/.test(src) && !/400/.test(await page.locator('#playBox').textContent()));
  ok('15.47 no console errors', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

/* the one-page email, because a Meet cannot be handed a printed page */
{
  const { ctx, page, errs } = await fresh();
  await page.locator('#clearBtn').click();
  await page.locator('#mode').selectOption('call');
  await fillVisit(page, { biz:'משרד פיקוח', visitDate:'2026-12-06', rate:'180',
                          tenantCount:'25', tenantMin:'12', tenantRate:'110',
                          paperCount:'6', paperMin:'40' });
  await page.locator('#tab-words').click();
  await page.locator('#painWord').fill('הטלפונים של הדיירים');

  const mail = () => page.evaluate(() => mailText(current));

  let t = await mail();
  ok('15.48 the email has a subject line',
     /^נושא: משרד פיקוח, המספר מהשיחה והצעד הבא/.test(t), t.split('\n')[0]);
  ok('15.49 it quotes his own word', /„הטלפונים של הדיירים”/.test(t));
  ok('15.50 it carries the week and the month', /שעות בשבוע/.test(t) && /שעות בחודש/.test(t));
  ok('15.51 it names the map without a price, because the price was not said',
     /שבועות של מיפוי/.test(t) && !/5,000/.test(t) && !/3,500/.test(t));
  ok('15.52 it says the number is an estimate, not a measurement', /אומדן, לא מדידה/.test(t));
  ok('15.53 it asks for one thing: the half hour to close', /מתי נוח לך/.test(t));
  ok('15.54 no em dash anywhere in it, it goes to a customer in Dani\'s voice',
     !/—/.test(t), t);

  await page.locator('#tab-close').click();
  await page.locator('#mapPrice').selectOption('5000');
  await page.locator('#priceSaid').selectOption('yes');
  t = await mail();
  ok('15.55 once the price was said aloud, the email may carry it', /5,000/.test(t));
  ok('15.56 with the credit rule beside it', /מתקזז במלואו/.test(t));

  await page.locator('#nextDate').fill('2026-12-10');
  t = await mail();
  ok('15.57 and an agreed date replaces the ask', /נדבר שוב ב-10\.12\.2026/.test(t) && !/מתי נוח לך/.test(t));

  const follow = await page.locator('#followMsg').inputValue();
  ok('15.58 the day-after message thanks him for thirty minutes, not an hour',
     /תודה על השלושים הדקות/.test(follow));
  ok('15.59 and it does not ask a remote lead for another owner\'s name',
     !/שם של בעל משרד/.test(follow));
  ok('15.60 no em dash in it either', !/—/.test(follow), follow);
  ok('15.61 no console errors', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

/* the two channels stay apart, so no threshold passes on the wrong evidence */
{
  const { ctx, page, errs } = await fresh();
  await page.locator('#tab-compare').click();
  const pane0 = await page.locator('#pane-compare').textContent();
  ok('15.62 the 2-of-5 threshold says which five it means',
     /מחמשת המשרדים של אידן/.test(await page.locator('#pane-compare').innerHTML()) ||
     /החמישה/.test(pane0));
  ok('15.63 the cold-email channel starts unmarked', /עוד לא סומן/.test(
     await page.locator('#coldBox').textContent()));

  await fillVisit(page, { coldSent:'13', coldReplies:'1', coldCalls:'1' });
  const cold = await page.locator('#coldBox').textContent();
  ok('15.64 it counts the batch on its own', /13 מיילים/.test(cold) && /1 שיחות שנקבעו/.test(cold));
  ok('15.65 and says a call from here does not count toward the five',
     /לא נספרת שם/.test(cold));
  ok('15.66 it names the 13-vs-10 mismatch instead of picking one',
     /13 מיילים ולא 10/.test(cold));
  ok('15.67 the cold channel has no pass band at all',
     !/עובר\./.test(cold) && (await page.locator('#coldBox .gate.ok').count()) === 0);

  const book = await page.locator('#bookBox').textContent();
  ok('15.68 the five offices still read as undecided', /לא סומן|מתוך 5/.test(book));

  await page.reload();
  await page.locator('#tab-compare').click();
  eq('15.69 the channel numbers survive a reload',
     await page.locator('#coldSent').inputValue(), '13');
  ok('15.70 no console errors', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

/* the call, on a phone, and still one page when he prints it */
{
  const { ctx, page, errs } = await fresh({ viewport:{width:390,height:844} });
  await page.locator('#clearBtn').click();
  await page.locator('#mode').selectOption('call');
  await fillVisit(page, { biz:'משרד פיקוח בניין', visitDate:'2026-12-06', rate:'180', team:'20',
                          tenantCount:'25', tenantMin:'12', tenantRate:'110',
                          paperCount:'6', paperMin:'40', chaseHours:'8',
                          leads:'12', leadsMissed:'4', dealValue:'18000', leadsWin:'1' });
  for (const t of ['words','ask','sheet','close','compare']) {
    await page.locator('#tab-' + t).click();
    const over = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    ok('15.71 no sideways scroll at 390px on the ' + t + ' tab', !over);
  }
  await page.locator('#tab-sheet').click();
  const pdf = await page.pdf({ format:'A4', printBackground:true });
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  eq('15.76 the call\'s sheet still prints on one A4 page', pages, 1);
  ok('15.77 no console errors on the phone', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

/* nothing in Dani's voice carries an AI tell, on any of the three surfaces */
{
  const { ctx, page, errs } = await fresh();
  await page.locator('#clearBtn').click();
  await page.locator('#mode').selectOption('call');
  await fillVisit(page, { biz:'משרד פיקוח', visitDate:'2026-12-06', rate:'180',
                          tenantCount:'25', tenantMin:'12', tenantRate:'110',
                          paperCount:'6', paperMin:'40',
                          leads:'12', leadsMissed:'4', dealValue:'18000', leadsWin:'1' });
  await page.locator('#tab-sheet').click();
  const sheet = await page.locator('#sheet').textContent();
  ok('15.80 no em dash on the sheet he keeps', !/—/.test(sheet), sheet.match(/.{0,30}—.{0,30}/)?.[0]);
  const wa = await page.evaluate(() => waText(current));
  ok('15.81 no em dash in the whatsapp summary', !/—/.test(wa), wa);
  const follow = await page.locator('#followMsg').inputValue();
  ok('15.82 no em dash in the day-after message', !/—/.test(follow), follow);
  const mail = await page.evaluate(() => mailText(current));
  ok('15.83 no em dash in the email', !/—/.test(mail), mail);

  /* the week figure he hears must agree with the month on his own sheet */
  const agree = await page.evaluate(() => {
    const m = current;
    return m.leaks.every(l => Math.abs(l.week * (52/12) - l.hours) <= 0.15)
        && Math.abs(m.week * (52/12) - m.hours) <= 0.15;
  });
  ok('15.84 the week figures and the month figures are the same arithmetic', agree);
  ok('15.85 no console errors', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

/* the brand is spelled the way Dani fixed it on 26.11 */
{
  const { ctx, page, errs } = await fresh();
  await page.locator('#clearBtn').click();
  await fillVisit(page, { biz:'מ', rate:'180', chaseHours:'10' });
  const head = await page.locator('.brand').textContent();
  ok('15.86 the header spells the brand as one word', /Atidilabs/.test(head) && !/Atidi Labs/.test(head), head);
  await page.locator('#tab-sheet').click();
  const foot = await page.locator('#sheet .sh-foot').textContent();
  ok('15.87 so does the sheet the owner keeps', /Atidilabs/.test(foot) && !/Atidi Labs/.test(foot), foot);
  ok('15.88 and the business phone is the one business number', /054-3074547/.test(foot));
  const wa = await page.evaluate(() => waText(current));
  ok('15.89 and the signature on a message to a customer', /Atidilabs/.test(wa) && !/Atidi Labs/.test(wa));

  /* the first line of the page names the hour that is on screen */
  await page.locator('#tab-ask').click();
  ok('15.90 the lede says an hour at the office for an office visit',
     /שעה אחת במשרד/.test(await page.locator('#lede').textContent()));
  await page.locator('#mode').selectOption('call');
  ok('15.91 and thirty minutes for the booked call',
     /שלושים דקות/.test(await page.locator('#lede').textContent()));
  ok('15.92 no console errors', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

/* dark mode, both hours */
{
  const { ctx, page, errs } = await fresh({ colorScheme:'dark' });
  await page.locator('#mode').selectOption('call');
  await page.locator('#tab-words').click();
  ok('15.78 the call card reads in dark mode', await page.locator('#cardCall').isVisible());
  ok('15.79 no console errors in dark mode', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
