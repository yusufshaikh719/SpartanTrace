import { test, expect, type Page } from '@playwright/test';
import { backend } from './backend';
async function signIn(page:Page, name:string) {
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByLabel('SJSU email').fill(`${name}@sjsu.edu`);
 await page.getByLabel('Password').fill('correct-password');
 await page.getByRole('button',{name:'Sign in',exact:true}).last().click();
 await expect(page.getByRole('button',{name:'Account menu'})).toBeVisible();
}
async function signOut(page:Page) {
 await page.getByRole('button',{name:'Account menu'}).click();
 await page.getByRole('button',{name:'Sign out'}).click();
 await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();
}

test('setup and registration never invent an authenticated session',async ({page})=>{
 await page.goto('/');
 await expect(page.getByRole('alert')).toContainText('Connect Supabase');
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByLabel('SJSU email').fill('admin@sjsu.edu'); await page.getByLabel('Password').fill('anything');
 await page.getByRole('button',{name:'Sign in',exact:true}).last().click();
 await expect(page.getByRole('dialog')).toContainText('Connect Supabase');
 await expect(page.getByRole('button',{name:'Account menu'})).toHaveCount(0);
});

test('Finder and Looker complete posting, alert matching, claim, chat, approval and return through the UI',async ({browser})=>{
 const api=await backend();const context=await browser.newContext();await api.attach(context);const page=await context.newPage();
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('dialog',dialog=>dialog.accept());
 try {
 await page.goto('/');await signIn(page,'looker');
 await page.getByRole('button',{name:'Set match alert',exact:true}).click();
 await page.getByPlaceholder('Keywords (e.g. AirPods, Hydro Flask, keys)...').fill('blue bag');
 await page.getByRole('button',{name:'Add Alert'}).click();
 await expect(page.getByText('blue bag',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Close dialog'}).click(); await signOut(page);
 await signIn(page,'finder');await page.getByRole('button',{name:'Report Item',exact:true}).click();
 await page.getByLabel('Item title').fill('Blue campus backpack');
 await page.getByLabel('Category',{exact:true}).selectOption('Bags & Backpacks');
 await page.getByLabel('Location found').selectOption('Diaz Compean Student Union');
 await page.getByLabel('Description',{exact:true}).fill('A blue bag with black straps and books inside.');
 await page.getByRole('button',{name:'Publish to Registry'}).click();
 await expect(page.getByRole('alert')).toContainText('Upload a photo');
 await page.getByPlaceholder('Or paste direct image URL...').fill('https://example.com/bag.jpg');
 await page.getByRole('button',{name:'Publish to Registry'}).click();
 await expect(page.getByRole('heading',{name:'Blue campus backpack'})).toBeVisible();
 await page.getByRole('heading',{name:'Blue campus backpack'}).click();
 await page.getByRole('button',{name:'Edit Listing'}).click();
 await page.getByLabel('Item title').fill('Blue campus backpack updated');
 await page.getByLabel('Photo URL',{exact:true}).fill('https://example.com/updated-bag.jpg');
 await page.getByLabel('Description',{exact:true}).fill('A blue bag with black straps and a red notebook inside.');
 await page.getByRole('button',{name:'Save Edits'}).click();
 await expect(page.getByRole('heading',{name:'Blue campus backpack updated'}).last()).toBeVisible();
 await expect(page.getByRole('img',{name:'Blue campus backpack updated',exact:true}).last()).toHaveAttribute('src','https://example.com/updated-bag.jpg');
 await page.getByRole('button',{name:'Close dialog'}).click();
 await signOut(page);await signIn(page,'looker');
 await page.getByRole('button',{name:'Notifications',exact:true}).click();
 await expect(page.getByText('Possible item match')).toBeVisible();
 await page.getByText('Possible item match').click();
 await page.getByRole('button',{name:'Submit Ownership Claim'}).click();
 await page.getByLabel('Proof of ownership').fill('There is a red notebook and a yellow keyring inside.');
 await page.getByRole('button',{name:'Submit Claim & Open Chat'}).click();
 await expect(page.getByText('Ownership evidence:',{exact:false})).toBeVisible();
 await page.getByPlaceholder('Message finder...').fill('Can we meet at the library?');
 await page.locator('form').last().getByRole('button').click();
 await expect(page.getByText('Can we meet at the library?',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Close chat'}).click();
 // The listing detail is still open beneath the chat.
 await page.getByRole('button',{name:'Close dialog'}).click();
 await signOut(page);await signIn(page,'finder');
 await page.getByRole('heading',{name:'Blue campus backpack updated'}).click();
 await expect(page.getByText('Claims Received (1)')).toBeVisible();
 await expect(page.getByRole('button',{name:'Accept Claim'})).toBeDisabled();
 await page.getByRole('button',{name:'Review claims (Pending)'}).click();
 await expect(page.getByRole('button',{name:'Accept Claim'})).toBeEnabled();
 await page.getByRole('button',{name:'Accept Claim'}).click();
 await page.getByRole('button',{name:'Confirm item returned'}).click();
 await expect(page.getByText('This record is read-only.',{exact:false})).toBeVisible();
 await expect(page.getByRole('button',{name:'Edit Listing'})).toBeDisabled();
 await page.getByRole('button',{name:'Close dialog'}).click();
 await expect(page.getByRole('heading',{name:'Blue campus backpack updated'})).toHaveCount(0);
 await page.getByRole('button',{name:'My listings',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Blue campus backpack updated'}).last()).toBeVisible();
 await signOut(page);await signIn(page,'looker');
 await page.getByRole('button',{name:'My claims',exact:true}).click();
 await page.getByRole('heading',{name:'Blue campus backpack updated'}).click();
 await expect(page.getByRole('heading',{name:'Your claims'})).toBeVisible();
 await expect(page.getByText('Accepted ·',{exact:false})).toBeVisible();
 await page.screenshot({path:'test-results/returned-item.png',fullPage:true});
 expect(errors).toEqual([]);
 } finally {await context.close();await api.close();}
});

test('registration requires SJSU email and shows verification without logging in',async ({browser})=>{
 const api=await backend();const context=await browser.newContext();await api.attach(context);const page=await context.newPage();
 try {
 await page.goto('/');await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByRole('button',{name:'New here? Create an account'}).click();
 await page.getByLabel('Full name').fill('New Spartan');await page.getByLabel('SJSU email').fill('new@example.com');await page.getByLabel('Password').fill('correct-password');
 await page.getByRole('button',{name:'Register and verify email'}).click();await expect(page.getByRole('dialog').getByRole('alert')).toContainText('@sjsu.edu');
 await page.getByLabel('SJSU email').fill('new@sjsu.edu');await page.getByRole('button',{name:'Register and verify email'}).click();
 await expect(page.getByRole('status')).toContainText('Check your SJSU inbox');await expect(page.getByRole('button',{name:'Account menu'})).toHaveCount(0);
 } finally {await context.close();await api.close();}
});

test('reports, message/listing removal, account suspension/restoration and audit log work in the Admin UI',async ({browser})=>{
 const api=await backend();await api.seed();const context=await browser.newContext();await api.attach(context);const page=await context.newPage();
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('dialog',dialog=>dialog.accept(dialog.type()==='prompt'?'Reviewed misuse and supporting evidence':undefined));
 try {
 await page.goto('/');await signIn(page,'looker');
 await page.getByRole('heading',{name:'Silver laptop'}).click();
 await page.getByRole('button',{name:'Report violation or inaccurate listing'}).click();
 await page.getByRole('button',{name:'Submit Report'}).click();
 await expect(page.getByText('A reason is required before submitting a report.')).toBeVisible();
 await page.getByLabel('Reason',{exact:true}).fill('Misleading item description');await page.getByRole('button',{name:'Submit Report'}).click();
 await page.getByRole('button',{name:'Claims & Messages'}).click();
 await expect(page.getByText('This message should be reviewed by an administrator',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Report message'}).click({force:true});
 await page.getByLabel('Reason',{exact:true}).fill('Inappropriate message');await page.getByRole('button',{name:'Submit Report'}).click();
 await page.getByRole('button',{name:'Close chat'}).click();await signOut(page);await signIn(page,'admin');
 await page.getByRole('button',{name:'Account menu'}).click();await page.getByRole('button',{name:'Admin Panel'}).click();
 await expect(page.getByRole('button',{name:'Reports (2)'})).toBeVisible();
 await page.getByText('By looker • Inappropriate message',{exact:true}).click();
 await expect(page.getByText('Content owner: finder',{exact:true})).toBeVisible();
 await expect(page.getByText('Related listing: Silver laptop · Available')).toBeVisible();
 await page.getByRole('button',{name:'Confirm Violation'}).click();
 await expect(page.getByRole('alert')).toContainText('administrative reason');
 await page.getByPlaceholder('Administrative reason (required)...').fill('Message violates community rules');
 await page.getByRole('button',{name:'Confirm Violation'}).click();
 await expect(page.getByRole('button',{name:'Reports (1)'})).toBeVisible();
 await page.getByText('By looker • Inappropriate message',{exact:true}).click();
 await expect(page.getByRole('button',{name:'Content removed',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Listings',exact:true}).click();
 await page.getByRole('button',{name:'Remove',exact:true}).click();
 await expect(page.getByText('Silver laptop',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Accounts',exact:true}).click();
 const row=page.getByText('looker@sjsu.edu',{exact:true}).locator('../..');
 await row.getByRole('button',{name:'Suspend',exact:true}).click();
 await expect(row.getByText('Suspended',{exact:true})).toBeVisible();
 await row.getByRole('button',{name:'Restore',exact:true}).click();await expect(row.getByRole('button',{name:'Suspend',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Audit Log',exact:true}).click();
 for(const action of ['RESOLVE_REPORT','REMOVE_MESSAGE','REMOVE_LISTING','SUSPEND_USER','RESTORE_USER']) await expect(page.getByText(action+' on',{exact:false})).toBeVisible();
 await page.screenshot({path:'test-results/admin-audit.png',fullPage:true});expect(errors).toEqual([]);
 } finally {await context.close();await api.close();}
});

test('search, location/category/date filters, sorting and clearing work in the browser',async({browser})=>{
 const api=await backend();await api.seed();const context=await browser.newContext();await api.attach(context);const page=await context.newPage();
 try{
 await page.goto('/');await expect(page.getByRole('heading',{name:'Silver laptop'})).toBeVisible();
 const search=page.getByPlaceholder('Search item titles and descriptions...');await search.fill('nonexistent');
 await expect(page.getByRole('heading',{name:'No matching items found'})).toBeVisible();
 await page.getByRole('button',{name:'Clear search'}).click();await expect(page.getByRole('heading',{name:'Silver laptop'})).toBeVisible();
 await page.getByRole('combobox',{name:'Filter by campus location'}).selectOption('Engineering Building (ENG)');await expect(page.getByRole('heading',{name:'No matching items found'})).toBeVisible();
 await page.getByRole('combobox',{name:'Filter by campus location'}).selectOption('Duncan Hall (DH)');await expect(page.getByRole('heading',{name:'Silver laptop'})).toBeVisible();
 await page.getByRole('button',{name:/^Filters/}).click();await page.getByRole('button',{name:'Keys',exact:true}).click();
 await page.getByRole('button',{name:'Show 0 Items',exact:true}).click();await expect(page.getByRole('heading',{name:'No matching items found'})).toBeVisible();
 await page.getByRole('button',{name:/^Filters/}).click();await page.getByRole('button',{name:'All Categories',exact:true}).click();await page.getByRole('button',{name:'Today',exact:true}).click();
 await page.getByRole('button',{name:'Show 0 Items',exact:true}).click();await expect(page.getByRole('heading',{name:'No matching items found'})).toBeVisible();
 await page.getByRole('button',{name:/^Filters/}).click();await page.getByRole('button',{name:'Anytime',exact:true}).click();await page.getByRole('button',{name:'Newest',exact:true}).click();
 await page.getByRole('button',{name:'Show 1 Item',exact:true}).click();await expect(page.getByRole('heading',{name:'Silver laptop'})).toBeVisible();
 await page.getByRole('button',{name:'Table / Ledger View'}).click();await expect(page.getByText('Silver laptop',{exact:true})).toBeVisible();
 }finally{await context.close();await api.close();}
});

test('database settings keep migration errors visible after saving a trailing-slash URL', async ({ browser }) => {
 const api = await backend();
 const context = await browser.newContext();
 await api.attach(context);
 await context.route('https://test-project.supabase.co/rest/v1/rpc/app_version', route => route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ code: 'PGRST202', message: 'app_version is not installed' }) }));
 const page = await context.newPage();
 try {
  await page.goto('/');
  await page.getByRole('button', { name: 'Database connection', exact: true }).click();
  await page.getByPlaceholder('https://xyz.supabase.co').fill('https://test-project.supabase.co/');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('dialog',{name:'Database connection'}).getByRole('alert')).toContainText('Connection failed or schema is outdated');
  await expect(page.getByRole('heading', { name: 'Database Connection', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('spartantrace_supabase_url'))).toBe('https://test-project.supabase.co');
 } finally { await context.close(); await api.close(); }
});

test('five wrong passwords lock sign-in even when the next password is correct', async ({browser}) => {
 const api=await backend(); const context=await browser.newContext(); await api.attach(context); const page=await context.newPage();
 try {
  await page.goto('/'); await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.getByLabel('SJSU email').fill('looker@sjsu.edu'); await page.getByLabel('Password').fill('wrong-password');
  for (let attempt=0;attempt<5;attempt++) {
   await page.getByRole('button',{name:'Sign in',exact:true}).last().click();
   await expect(page.getByRole('dialog').getByRole('alert')).toContainText(attempt===4?'Account locked for 15 minutes':'Invalid login credentials');
  }
  await page.getByLabel('Password').fill('correct-password'); await page.getByRole('button',{name:'Sign in',exact:true}).last().click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Account locked for 15 minutes');
  await expect(page.getByRole('button',{name:'Account menu'})).toHaveCount(0);
 } finally {await context.close();await api.close();}
});

test('an authenticated session restores after reload and expires after 30 minutes without activity', async ({browser}) => {
 const api=await backend(); const context=await browser.newContext(); await api.attach(context); const page=await context.newPage();
 try {
  await page.clock.install(); await page.goto('/'); await signIn(page,'finder');
  await page.reload(); await expect(page.getByRole('button',{name:'Account menu'})).toBeVisible();
  await page.clock.fastForward(31*60*1000);
  await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'My listings',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Report Item',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
 } finally {await context.close();await api.close();}
});

test('a readable legacy database shows setup instructions rather than an empty working registry', async ({browser}) => {
 const api=await backend(); const context=await browser.newContext(); await api.attach(context);
 await context.route('https://test-project.supabase.co/rest/v1/rpc/app_version', route=>route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({code:'PGRST202',message:'Missing function'})}));
 const page=await context.newPage();
 try {
  await page.goto('/'); await expect(page.getByRole('alert')).toContainText('database setup is incomplete');
  await expect(page.getByRole('heading',{name:'Campus registry is clear'})).toHaveCount(0);
 } finally {await context.close();await api.close();}
});

test('mobile registry and sign-in fit a phone viewport', async ({browser}) => {
 const api=await backend();const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await api.attach(context);const page=await context.newPage();
 try {
  await page.goto('/');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await signIn(page,'looker');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({path:'test-results/mobile-registry.png',fullPage:true});
 } finally {await context.close();await api.close();}
});

test('uploaded photos persist through posting and replacement on an existing listing', async ({browser}) => {
 const api=await backend();const context=await browser.newContext();await api.attach(context);const page=await context.newPage();
 const original=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRhcAAAAASUVORK5CYII=','base64');
 const replacement=Buffer.concat([original,Buffer.from('replacement')]);
 const originalUrl=`data:image/png;base64,${original.toString('base64')}`;
 const replacementUrl=`data:image/png;base64,${replacement.toString('base64')}`;
 try {
  await page.goto('/');await signIn(page,'finder');await page.getByRole('button',{name:'Report Item',exact:true}).click();
  await page.getByLabel('Upload item photo').setInputFiles({name:'found.png',mimeType:'image/png',buffer:original});
  await expect(page.getByText('Photo attached',{exact:true})).toBeVisible();
  await page.getByLabel('Item title').fill('Found headphones');await page.getByLabel('Description',{exact:true}).fill('Black wireless headphones with a blue case');
  await page.getByRole('button',{name:'Publish to Registry'}).click();await page.getByRole('heading',{name:'Found headphones',exact:true}).click();
  await expect(page.getByRole('img',{name:'Found headphones',exact:true}).last()).toHaveAttribute('src',originalUrl);
  await page.getByRole('button',{name:'Edit Listing'}).click();
  await page.getByLabel('Replace photo',{exact:true}).setInputFiles({name:'replacement.png',mimeType:'image/png',buffer:replacement});
  await expect(page.getByLabel('Photo URL',{exact:true})).toHaveValue(replacementUrl);
  await page.getByRole('button',{name:'Save Edits'}).click();
  await expect(page.getByRole('img',{name:'Found headphones',exact:true}).last()).toHaveAttribute('src',replacementUrl);
  await page.getByRole('button',{name:'Close dialog'}).click();await page.reload();
  await expect(page.getByRole('img',{name:'Found headphones',exact:true})).toHaveAttribute('src',replacementUrl);
 } finally {await context.close();await api.close();}
});
