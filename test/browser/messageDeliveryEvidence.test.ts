import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { emptyDeliveryCounts, messageEvidence } from '../../shared/messageEvidence';
const fixture = '/__delivery_fixture.tsx', vite = await createServer({ plugins: [{ name: 'delivery-fixture', resolveId(id) { if (id === fixture)
                return id; }, load(id) { if (id === fixture)
                return `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{MessageDeliveryReportPanel}from'/src/components/MessageDeliveryReportPanel.tsx';function App(){const[c,set]=useState('A');window.switchClient=set;return <MessageDeliveryReportPanel companyId={c}/>;}createRoot(document.getElementById('root')).render(<App/>);`; } }], server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await vite.listen();
let browser: any, release: (() => void) | undefined;
try {
    const origin = `http://127.0.0.1:${(vite.httpServer!.address() as any).port}`;
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: true });
    const key = 'a'.repeat(64), counts = emptyDeliveryCounts();
    counts.AWAITING_RECEIPT = 1;
    let invalid = false, hold = false, signal: (() => void) | undefined, writes = 0;
    const evidence = messageEvidence({ status: 'API_ACCEPTED', delivery: 'UNOBSERVED', conflicting: false, providerId: 'provider', senderBound: true, identityCount: 1 });
    await context.route('**/*', async (route) => { const url = new URL(route.request().url()); if (url.origin !== origin) {
        await route.abort();
        return;
    } if (url.pathname === '/') {
        await route.fulfill({ contentType: 'text/html', body: await vite.transformIndexHtml('/', `<div id="root"></div><script type="module" src="${fixture}"></script>`) });
        return;
    } if (!url.pathname.startsWith('/api/')) {
        await route.continue();
        return;
    } if (route.request().method() !== 'GET')
        writes++; const company = url.pathname.split('/')[3]; let result: any; if (url.pathname.endsWith('/delivery-report')) {
        if (hold) {
            signal?.();
            await new Promise<void>(r => release = r);
        }
        result = { report: { date: url.searchParams.get('date'), timeZone: 'Asia/Kolkata', cohort: 'CREATED_REQUESTS_CURRENT_EVIDENCE', checkedAtMs: 1700000000000, totalRequests: invalid ? 2 : 1, counts, readOnly: true, historicalSnapshot: false, requestsTruncated: false, requests: [{ requestKey: key, evidence }], receiptObservations: { recorded: 0, providerOutsideSelectedDay: 0, currentlyUnmatched: 0 }, currentBacklog: { unknown: 0, inProgress: 0 } } };
    }
    else if (url.pathname.endsWith('/receipts'))
        result = { receiptEvidence: { evidence, receiptCount: 0, receipts: [], truncated: false, checkedAtMs: 1700000000000, readOnly: true } };
    else
        result = { dispatch: { status: 'API_ACCEPTED', providerId: 'provider', senderBound: true, providerIdentityCount: 1, delivery: 'UNOBSERVED', receiptCount: 0, conflicting: false } }; await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, companyId: company, ...result }) }).catch(() => { }); });
    const page = await context.newPage();
    await page.goto(origin);
    await page.getByLabel('Delivery report date').fill('2026-11-15');
    await page.getByRole('button', { name: 'Load delivery evidence' }).click();
    await page.getByText('Provider accepted; delivery receipt not observed: 1', { exact: true }).waitFor();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export delivery counts CSV' }).click();
    assert.equal((await download).suggestedFilename(), 'delivery-evidence-2026-11-15.csv');
    await page.getByRole('button', { name: 'Inspect request ' + key, exact: true }).click();
    await page.getByText('Stored state: API_ACCEPTED', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Inspect receipt evidence' }).click();
    await page.getByText('No matching receipt events observed.', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: /resend/i }).count(), 0);
    invalid = true;
    await page.getByRole('button', { name: 'Load delivery evidence' }).click();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Export delivery counts CSV' }).count(), 0);
    invalid = false;
    hold = true;
    const started = new Promise<void>(r => signal = r);
    await page.getByRole('button', { name: 'Load delivery evidence' }).click();
    await started;
    await page.evaluate(() => (window as any).switchClient('B'));
    release?.();
    await page.waitForTimeout(50);
    assert.equal(await page.getByRole('button', { name: 'Export delivery counts CSV' }).count(), 0);
    assert.equal(writes, 0);
    console.log('Delivery browser: current IST cohort, exact counts CSV, unobserved drilldown, read-only timeline, corrupt-total export refusal, late-client fence and zero writes passed.');
}
finally {
    release?.();
    if (browser)
        await browser.close();
    await vite.close();
}
