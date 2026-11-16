import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { EXCEPTION_KEYS, exceptionProjection } from '../../shared/agencyExceptions';
const fixture = '/__agency_exceptions.tsx', vite = await createServer({ plugins: [{ name: 'agency-exceptions-fixture', resolveId(id) { if (id === fixture)
                return id; }, load(id) { if (id === fixture)
                return `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{AgencySalesExceptions}from'/src/components/AgencySalesExceptions.tsx';function App(){const[a,set]=useState('agency');window.changeAgency=set;return <AgencySalesExceptions agencyId={a} onSelectClient={id=>window.openedClient=id}/>;}createRoot(document.getElementById('root')).render(<App/>);`; } }], server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await vite.listen();
let browser: any, release: (() => void) | undefined;
try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: true }), origin = `http://127.0.0.1:${(vite.httpServer!.address() as any).port}`;
    let fail = false, malformed = false, hold = false, writes = 0, signal: (() => void) | undefined;
    const backlog = Object.fromEntries(EXCEPTION_KEYS.map(k => [k, 0]));
    const clients = [{ companyId: 'A', operationStatus: 'ACTIVE', ...exceptionProjection({ ...backlog, unknownDispatches: 1,failedCaptureRuns:1,captureRecoveryNeeded:1,pendingCaptureRuns:4,captureActorRevoked:1 }) }, { companyId: 'B', operationStatus: 'ARCHIVED', ...exceptionProjection(backlog) }];
    await context.route('**/*', async (route) => { const u = new URL(route.request().url()); if (u.origin !== origin) {
        await route.abort();
        return;
    } if (u.pathname === '/') {
        await route.fulfill({ contentType: 'text/html', body: await vite.transformIndexHtml('/', `<div id="root"></div><script type="module" src="${fixture}"></script>`) });
        return;
    } if (!u.pathname.startsWith('/api/')) {
        await route.continue();
        return;
    } if (route.request().method() !== 'GET')
        writes++; if (hold) {
        signal?.();
        await new Promise<void>(r => release = r);
    } await route.fulfill({ status: fail ? 503 : 200, contentType: 'application/json', body: JSON.stringify({ success: !fail, overview: { agencyId: malformed ? 'foreign' : u.pathname.split('/')[3], modelVersion: 3, scope: 'CURRENT_AUTHORIZED_CLIENTS', timeZone: 'Asia/Kolkata', checkedAtMs: 1700000000000, definition: 'Current weighted backlog; not business health', clients } }) }).catch(() => { }); });
    const page = await context.newPage();
    await page.goto(origin);
    await page.getByText('Review priority: 13', { exact: true }).waitFor();
    await page.getByText('Retained failed capture runs: 1 · weight 2',{exact:true}).waitFor();
    await page.getByLabel('Exception type').selectOption('captureRecoveryNeeded');
    assert.equal(await page.getByRole('button', { name: 'Open client B', exact: true }).count(), 0);
    await page.getByLabel('Exception type').selectOption('unknownDispatches');
    assert.equal(await page.getByRole('button', { name: 'Open client B', exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Open client A', exact: true }).click();
    assert.equal(await page.evaluate(() => (window as any).openedClient), 'A');
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export authorized exception counts' }).click();
    const download = await pending;
    const fs = await import('node:fs/promises');
    const csv = await fs.readFile((await download.path())!, 'utf8');
    assert.match(csv, /"B","ARCHIVED"/);
    assert.match(csv, /unknownDispatches/);assert.match(csv,/captureActorRevoked/);assert.match(csv,/pendingCaptureRuns/);
    assert.equal(csv.includes('PRIVATE_CANARY'), false);
    await page.getByLabel('Search exception client').fill('missing');
    await page.getByText('No clients match these display filters.', { exact: true }).waitFor();
    fail = true;
    await page.getByRole('button', { name: 'Reload agency exceptions' }).click();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Export authorized exception counts' }).count(), 0);
    fail = false;
    malformed = true;
    await page.getByRole('button', { name: 'Reload agency exceptions' }).click();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Export authorized exception counts' }).count(), 0);
    malformed = false;
    hold = true;
    const started = new Promise<void>(r => signal = r);
    await page.getByRole('button', { name: 'Reload agency exceptions' }).click();
    await started;
    hold = false;
    await page.evaluate(() => (window as any).changeAgency('new-agency'));
    await page.getByText('Review priority: 13', { exact: true }).waitFor();
    release?.();
    await page.waitForTimeout(50);
    assert.equal(await page.getByLabel('Search exception client').inputValue(), '');
    assert.equal(writes, 0);
    console.log('Agency exceptions browser: current14-metric overview, weights/archived visibility, search/filter, full authorized CSV, client drilldown, failed/mismatched reload clearing, late-agency fence and zero writes passed.');
}
finally {
    release?.();
    if (browser)
        await browser.close();
    await vite.close();
}
