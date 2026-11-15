import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
const fixture = '/__telegram_operations.tsx', vite = await createServer({ plugins: [{ name: 'telegram-operations-fixture', resolveId(id) { if (id === fixture)
                return id; }, load(id) { if (id === fixture)
                return `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{TelegramBotView}from'/src/components/TelegramBotView.tsx';function App(){const[c,set]=useState('A');window.switchClient=set;return <TelegramBotView companyId={c} business={{name:c==='A'?'Alpha':'Beta',category:'Services'}} onNavigate={tab=>window.selectedTab=tab}/>;}createRoot(document.getElementById('root')).render(<App/>);`; } }], server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await vite.listen();
let browser: any, release: (() => void) | undefined;
const activity = Object.fromEntries(['completedJobs', 'failedJobs', 'pausedJobs', 'approvedPosts', 'rescheduledPosts', 'admittedPosts', 'controlChanges', 'messageRequests', 'apiAcceptedMessages', 'websiteInquiries', 'inquiryAlertsAccepted', 'knowledgeStored', 'knowledgeExtractionsSettled', 'knowledgeExtractionsBlocked', 'knowledgeApprovals', 'knowledgeWithdrawals', 'knowledgeDeleted', 'websiteImportsQueued', 'websiteImportsCommitted', 'websiteImportsWithFailures', 'websiteImportsPaused', 'websiteImportsCancelled'].map(k => [k, k === 'completedJobs' ? 3 : 0]));
const backlog = Object.fromEntries(['waitingJobs', 'runningJobs', 'failedJobs', 'pendingApprovals', 'uncertainPublications', 'unconfirmedMessages', 'inquiryAlertsNotAttempted', 'inquiryAlertsUnconfirmed', 'knowledgeAwaitingApproval', 'knowledgeExtractionRunning', 'knowledgeExtractionBlocked', 'websiteImportsWaiting', 'websiteImportsRunning', 'websiteImportsFailed'].map(k => [k, 0]));
try {
    const origin = `http://127.0.0.1:${(vite.httpServer!.address() as any).port}`;
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({ serviceWorkers: 'block' });
    let sends = 0, chat = 0, ambiguous = false, hold = false, signal: (() => void) | undefined;
    const calls: string[] = [];
    await context.route('**/*', async (route) => {
        const u = new URL(route.request().url());
        if (u.origin !== origin) {
            await route.abort();
            return;
        }
        if (u.pathname === '/') {
            await route.fulfill({ contentType: 'text/html', body: await vite.transformIndexHtml('/', `<div id="root"></div><script type="module" src="${fixture}"></script>`) });
            return;
        }
        if (!u.pathname.startsWith('/api/')) {
            await route.continue();
            return;
        }
        calls.push(route.request().method() + ' ' + u.pathname);
        const company = u.pathname.split('/')[3];
        let body: any = { success: true, companyId: company };
        if (u.pathname.endsWith('/telegram-operations'))
            body = { ...body, readOnly: true, checkedAtMs: 1700000000000, canNotify: company === 'A', emergencyStopped: false, integration: { state: 'SAVED', transportEnabled: true, identityVerified: false, recipientDeliveryVerified: false, botId: '123', destinationFingerprint: 'a'.repeat(12) } };
        else if (u.pathname.endsWith('/daily-work-report'))
            body = { ...body, report: { date: u.searchParams.get('date'), timeZone: 'Asia/Kolkata', generatedAt: new Date().toISOString(), activity, backlog } };
        else if (u.pathname.endsWith('/notification-status'))
            body = { ...body, available: true, occurrences: [{ kind: 'daily_digest', dueAt: '2026-11-15T02:30:00Z', status: 'SENT', needsReview: false }], nextCursor: null };
        else if (u.pathname.endsWith('/job-actions'))
            body = { ...body, available: true, events: [], nextCursor: '0', latestRevision: '0' };
        else if (u.pathname === '/api/telegram/notify') {
            sends++;
            const input = route.request().postDataJSON();
            assert.equal(input.companyId, 'A');
            body = ambiguous ? { success: true } : { success: true, companyId: 'A', outcome: 'API_ACCEPTED', recipientDelivery: 'UNVERIFIED', persisted: false };
        }
        else if (u.pathname === '/api/ai/chat') {
            chat++;
            if (hold) {
                signal?.();
                await new Promise<void>(r => release = r);
            }
            body = { reply: 'PRIVATE_ALPHA_SUGGESTION' };
        }
        else
            throw new Error('Unexpected API ' + u.pathname);
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) }).catch(() => { });
    });
    const page = await context.newPage();
    await page.goto(origin);
    await page.getByText('Stored bot ID: 123', { exact: true }).waitFor();
    await page.getByLabel('Completed jobs', { exact: true }).filter({ hasText: '3' }).waitFor();
    await page.getByRole('button', { name: 'What happened today?', exact: true }).click();
    assert.equal(chat, 0);
    assert.equal(sends, 0);
    assert.equal(await page.getByText(/Online 24\/7|Autonomous Marketing Agent|Public reply verified/).count(), 0);
    await page.getByLabel('Telegram test alert').fill('PRIVATE_ALPHA_ALERT');
    await page.getByRole('button', { name: 'Send Test Alert', exact: true }).click();
    await page.getByText(/Telegram accepted the test alert/).waitFor();
    assert.equal(sends, 1);
    ambiguous = true;
    await page.getByRole('button', { name: 'Send Test Alert', exact: true }).click();
    await page.getByText('Telegram acceptance unconfirmed. Check the destination before another send. Automatic resend is disabled.', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Send Test Alert', exact: true }).isDisabled(), true);
    await page.getByRole('button', { name: 'Reload Telegram configuration', exact: true }).click();
    await page.getByText('Stored bot ID: 123', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Send Test Alert', exact: true }).isDisabled(), true);
    assert.equal(sends, 2);
    hold = true;
    await page.getByLabel('Marketing discussion question').fill('Discuss a private idea');
    const started = new Promise<void>(r => signal = r);
    await page.getByRole('button', { name: 'Ask assistant', exact: true }).click();
    await started;
    await page.evaluate(() => (window as any).switchClient('B'));
    await page.getByRole('heading', { name: 'Telegram operations · Beta' }).waitFor();
    release?.();
    await page.waitForTimeout(50);
    assert.equal(await page.getByText('PRIVATE_ALPHA_SUGGESTION', { exact: true }).count(), 0);
    assert.ok(!(await page.getByLabel('Telegram test alert').inputValue()).includes('PRIVATE_ALPHA_ALERT'));
    assert.equal(await page.getByRole('button', { name: 'Send Test Alert', exact: true }).isDisabled(), true);
    assert.ok(calls.filter(c => c.startsWith('POST')).every(c => c.endsWith('/api/ai/chat') || c.endsWith('/api/telegram/notify')));
    console.log('Telegram browser: saved/unverified identity, real report/history embedding, no AI for today, strict manual acceptance, ambiguous-send lock/reload fence, viewer controls and late-client discussion isolation passed with mocked HTTP.');
}
finally {
    release?.();
    if (browser)
        await browser.close();
    await vite.close();
}
