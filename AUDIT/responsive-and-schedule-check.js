async page => {
  const r = {};
  page.setDefaultTimeout(8000);
  await page.getByLabel('Activity type').selectOption('workout');
  await page.getByLabel('Activity name').fill('Audit travel workout');
  await page.getByLabel('Starts',{exact:true}).fill('17:00');
  await page.getByLabel('Ends',{exact:true}).fill('18:30');
  await page.getByRole('button',{name:'low',exact:true}).click();
  await page.getByRole('button',{name:'Travel day',exact:true}).click();
  await page.getByLabel('Travel time',{exact:false}).fill('90');
  await page.getByRole('button',{name:'Add to calendar'}).click();
  r.workout = await page.locator('.agenda-events').innerText();
  await page.getByRole('button',{name:'Delete Audit travel workout',exact:true}).click();
  r.workoutDeleted = await page.getByRole('heading',{name:'Audit travel workout',exact:true}).count();
  await page.getByRole('button',{name:'Tuesday, September 15, 2026',exact:true}).click();
  await page.getByRole('button',{name:'Delete Early away game series',exact:true}).click();
  r.seriesDeleted = await page.getByRole('heading',{name:'Early away game',exact:true}).count();
  r.layouts=[];
  for (const width of [390,768,1024,1440]) {
    await page.setViewportSize({width,height:width===390?844:1000});
    for (const section of ['Today','Schedule','Weekly','History','Profile','Food']) {
      await page.getByRole('navigation',{name:'Nourally sections'}).getByRole('button',{name:section,exact:true}).click();
      await page.evaluate(()=>window.scrollTo(0,0));
      const m = await page.evaluate(()=>({
        width:innerWidth, docWidth:document.documentElement.scrollWidth,
        navHeight:document.querySelector('.app-nav')?.getBoundingClientRect().height,
        smallTargets:[...document.querySelectorAll('button')].filter(e=>!e.disabled && e.getBoundingClientRect().width>0 && (e.getBoundingClientRect().width<24||e.getBoundingClientRect().height<24)).map(e=>({name:e.getAttribute('aria-label')||e.textContent.trim(),width:Math.round(e.getBoundingClientRect().width),height:Math.round(e.getBoundingClientRect().height)})).slice(0,8),
        navStates:[...document.querySelectorAll('nav button')].map(e=>({text:e.textContent,current:e.getAttribute('aria-current'),selected:e.getAttribute('aria-selected')})),
      }));
      r.layouts.push({section,...m});
      if(width===390||width===1024) await page.screenshot({path:`AUDIT/evidence/${width}-${section.toLowerCase()}.png`,fullPage:false});
    }
  }
  await page.getByRole('navigation',{name:'Nourally sections'}).getByRole('button',{name:'Today',exact:true}).click();
  await page.keyboard.press('Tab');
  r.keyboardFocus=await page.evaluate(()=>({text:document.activeElement.textContent,outline:getComputedStyle(document.activeElement).outline}));
  return r;
}
