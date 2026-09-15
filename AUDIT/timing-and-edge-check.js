async page => {
  const result = {};
  const base = await page.context().storageState();
  async function scenario(time, changes, run) {
    const state = JSON.parse(JSON.stringify(base));
    const values = Object.fromEntries(state.origins[0].localStorage.map(x => [x.name, x.value]));
    for (const [name, value] of Object.entries(changes)) values[name] = JSON.stringify(value);
    state.origins[0].localStorage = Object.entries(values).map(([name, value]) => ({name, value}));
    const c = await page.context().browser().newContext({storageState: state, timezoneId:'America/New_York'});
    const p = await c.newPage(); p.setDefaultTimeout(8000);
    await p.clock.install({time:new Date(time)});
    await p.goto('http://127.0.0.1:5173/');
    const value = await run(p);
    await c.close();
    return value;
  }
  const profile = {name:'Timing Audit',budget:'standard',dietaryNeeds:[],foodSources:['home','packed'],familyPrep:true};
  const event = {id:810,type:'practice',title:'Morning session',date:'2026-09-14',startTime:'14:00',endTime:'15:00',intensity:'high',location:'home',travelMinutes:0};
  const changes = {'nourally-schedule':[], 'nourally-profile':profile};
  result.lunch = await scenario('2026-09-14T11:45:00-04:00', changes, p => p.locator('.action-hero').innerText());
  result.recovery = await scenario('2026-09-14T15:10:00-04:00', {...changes,'nourally-schedule':[event]}, p => p.locator('.action-hero').innerText());
  result.recoveryWithNext = await scenario('2026-09-14T15:10:00-04:00', {...changes,'nourally-schedule':[event,{...event,id:811,title:'Evening practice',startTime:'18:00',endTime:'19:30'}]}, p => p.locator('.action-hero').innerText());
  result.during = await scenario('2026-09-14T14:30:00-04:00', {...changes,'nourally-schedule':[event]}, p => p.locator('.action-hero').innerText());
  const school = JSON.parse(base.origins[0].localStorage.find(x=>x.name==='nourally-school-schedule').value);
  result.noAccess = await scenario('2026-09-14T11:45:00-04:00', {...changes,'nourally-profile':{...profile,foodSources:['home']},'nourally-school-schedule':{...school,foodAccess:{...school.foodAccess,cafeteria:false}}}, async p => {
    const hero=await p.locator('.action-hero').innerText();
    await p.getByRole('button',{name:'Food',exact:true}).click();
    await p.getByRole('button',{name:'Meals',exact:true}).click();
    return {hero,meals:await p.locator('.food-meals-card').innerText()};
  });
  result.ingredientIdentity = await scenario('2026-09-14T16:00:00-04:00', {...changes,'nourally-profile':{...profile,dietaryNeeds:['nutFree']},'nourally-schedule':[{...event,startTime:'17:00',endTime:'18:00'}],'nourally-groceries':{budgetAmount:50,goal:'school-week',items:[],purchases:[],pantry:[{id:'x',name:'Peanut butter',catalogId:'',quantity:1},{id:'y',name:'Whole-grain bread',catalogId:'bread',quantity:1},{id:'z',name:'Bananas',catalogId:'bananas',quantity:1}]}}, async p => {
    await p.getByRole('button',{name:'Food',exact:true}).click();
    await p.getByRole('button',{name:'Meals',exact:true}).click();
    await p.getByRole('button',{name:'Show more options',exact:true}).click();
    return await p.locator('.swap-tray').innerText();
  });
  result.midnight = await scenario('2026-09-14T23:59:50-04:00', changes, async p => {
    await p.clock.runFor(70000);
    const water=await p.locator('.water-title h2').innerText();
    await p.getByRole('button',{name:'History',exact:true}).click();
    return {water,history:await p.locator('.history-list').innerText()};
  });
  result.notificationDenied = await scenario('2026-09-14T18:00:00-04:00', changes, async p => {
    await p.evaluate(()=>{window.Notification=class {static permission='denied';static async requestPermission(){return 'denied';}};});
    await p.getByRole('button',{name:'Turn on',exact:true}).click();
    return await p.locator('.reminder-status').innerText();
  });
  return result;
}
