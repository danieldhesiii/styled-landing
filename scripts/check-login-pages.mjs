import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';

const browser = await chromium.launch({channel: 'chrome', headless: true});
try {
  const application = await browser.newPage();
  await application.goto('http://localhost:3100/suppliers/join');
  await application.locator('input[name="businessName"]').waitFor({state:'visible'});
  assert.equal(await application.locator('header a[href^="/login"], header a[href^="/design"]').count(),0);
  assert.equal(await application.locator('header').getByRole('link',{name:'Supplier log in',exact:true}).getAttribute('href'),'/portal/login');
  await application.close();
  const invitation = await browser.newPage();
  let postOrigin;
  await invitation.route('**/auth/invite', async route => {
    if(route.request().method()!=='POST')return route.continue();
    postOrigin=route.request().headers().origin;
    await route.fulfill({status:303,headers:{location:'/portal/login'},body:''});
  });
  await invitation.goto('http://localhost:3100/auth/invite?token_hash=browser-fixture&type=invite');
  await invitation.getByRole('button',{name:'Continue to supplier account'}).click();
  await invitation.waitForURL('**/portal/login');
  assert.equal(postOrigin,'http://localhost:3100','Invitation confirmation must preserve the browser origin without leaking its token query');
  await invitation.close();
  for (const path of ['/login', '/portal/login']) {
    const page = await browser.newPage();
    const response = await page.goto('http://localhost:3100' + path);
    assert.equal(response.status(), 200, path);
    await page.locator('input[type=email]').waitFor({state: 'visible'});
    await page.locator('input[type=password]').waitFor({state: 'visible'});
    if (path === '/portal/login') {
      assert.equal(await page.locator('a[href="/"], a[href="/design"], a[href^="/login"]').count(), 0);
      await page.getByRole('link', {name: 'Forgot your password?'}).click();
      await page.locator('input[type=email]').waitFor({state: 'visible'});
      assert.equal(await page.getByRole('link', {name: 'Back to log in'}).getAttribute('href'), '/portal/login');
      assert.equal(await page.locator('a[href="/"]').count(), 0);
    }
    await page.close();
  }
} finally {
  await browser.close();
}
