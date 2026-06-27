import { test, expect } from '@playwright/test';

test('verify pentagon tilings visually', async ({ page }) => {
    await page.goto('http://localhost:8080/index.html');

    // Cairo
    await page.selectOption('#board-type', 'pentagon-cairo');
    await page.fill('#board-cols', '10');
    await page.fill('#board-rows', '10');
    await page.click('#start-button');
    await page.waitForSelector('canvas');
    await page.screenshot({ path: '/home/jules/verification/pentagon_cairo_new.png' });

    // Prismatic
    await page.click('#reset-button');
    await page.selectOption('#board-type', 'pentagon-prismatic');
    await page.click('#start-button');
    await page.waitForSelector('canvas');
    await page.screenshot({ path: '/home/jules/verification/pentagon_prismatic_new.png' });
});
