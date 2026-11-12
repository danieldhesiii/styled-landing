import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';

const browser = await chromium.launch({channel: 'chrome', headless: true});
try {
  for (const path of ['/login', '/portal/login']) {
    const page = await browser.newPage();
    const response = await page.goto('http://localhost:3100' + path);
    assert.equal(response.status(), 200, path);
    await page.locator('input[type=email]').waitFor({state: 'visible'});
    await page.locator('input[type=password]').waitFor({state: 'visible'});
    await page.close();
  }
} finally {
  await browser.close();
}
