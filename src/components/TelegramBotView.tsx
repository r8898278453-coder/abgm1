import React, { useEffect, useRef, useState } from 'react';
import type { BusinessProfile } from '../types';
import { apiRequest, getStoredToken, sendTelegramNotifyApi } from '../services/authService';
import { chatWithMarketingAgent } from '../services/aiService';
import { validateTelegramOperations, confirmedManualTelegram } from '../../shared/telegramOperations';
import { formatPlatformDateTime } from '../../shared/platformTime';
import { DailyWorkReport } from './DailyWorkReport';
import { NotificationStatus } from './NotificationStatus';
import { ActionHistory } from './ActionHistory';
interface Props {
    business: BusinessProfile;
    companyId?: string;
    onNavigate: (tab: any) => void;
}
export const TelegramBotView: React.FC<Props> = props => props.companyId ? <Operations key={props.companyId} {...props} companyId={props.companyId}/> : <p>Select an authorized client to inspect Telegram operations.</p>;
const Operations: React.FC<Props & {
    companyId: string;
}> = ({ business, companyId, onNavigate }) => {
    const [metadata, setMetadata] = useState<any>(null), [configError, setConfigError] = useState(''), [configBusy, setConfigBusy] = useState(false), [message, setMessage] = useState(`Test Alert from ${business.name}: Please confirm receipt of this test notification.`), [sending, setSending] = useState(false), [uncertain, setUncertain] = useState(false), [feedback, setFeedback] = useState('');
    const [question, setQuestion] = useState(''), [discussion, setDiscussion] = useState<{
        kind: string;
        text: string;
    }[]>([]), [thinking, setThinking] = useState(false);
    const request = useRef<AbortController | null>(null), alive = useRef(true), sequence = useRef(0), work = useRef<HTMLElement | null>(null);
    const load = async () => { request.current?.abort(); const controller = new AbortController(); request.current = controller; const token = getStoredToken(); const current = () => !controller.signal.aborted && getStoredToken() === token; setMetadata(null); setConfigError(''); setConfigBusy(true); try {
        const r = await apiRequest<any>(`/api/companies/${encodeURIComponent(companyId)}/telegram-operations`, { signal: controller.signal });
        if (!current())
            return;
        if (!r.success)
            throw new Error();
        setMetadata({ value: validateTelegramOperations(r, companyId), token });
    }
    catch {
        if (current())
            setConfigError('Telegram configuration evidence unavailable. Reload before sending.');
    }
    finally {
        if (current())
            setConfigBusy(false);
    } };
    useEffect(() => { alive.current = true; void load(); return () => { alive.current = false; sequence.current++; request.current?.abort(); }; }, []);
    const snapshot = metadata?.token === getStoredToken() ? metadata.value : null;
    const send = async (e: React.FormEvent) => { e.preventDefault(); if (sending || uncertain || !snapshot?.canNotify || !message.trim())
        return; const token = getStoredToken(), epoch = sequence.current, text = message.trim(); setSending(true); setFeedback(''); const current = () => alive.current && sequence.current === epoch && getStoredToken() === token; try {
        const result = await sendTelegramNotifyApi(companyId, text);
        if (!current())
            return;
        if (confirmedManualTelegram(result, companyId))
            setFeedback('Telegram accepted the test alert. Recipient receipt has not been verified. This manual attempt is not stored in scheduled history.');
        else {
            setUncertain(true);
            setFeedback('Telegram acceptance unconfirmed. Check the destination before another send. Automatic resend is disabled.');
        }
    }
    catch {
        if (current()) {
            setUncertain(true);
            setFeedback('Telegram acceptance unconfirmed. Check the destination before another send. Automatic resend is disabled.');
        }
    }
    finally {
        if (current())
            setSending(false);
    } };
    const ask = async () => { if (thinking || !question.trim())
        return; const text = question.trim(), token = getStoredToken(), epoch = sequence.current; setQuestion(''); setDiscussion(old => [...old, { kind: 'Question', text }]); setThinking(true); const current = () => alive.current && sequence.current === epoch && getStoredToken() === token; try {
        const reply = await chatWithMarketingAgent(text, { companyId, businessName: business.name, category: business.category, location: business.address });
        if (current())
            setDiscussion(old => [...old, { kind: 'Assistant suggestion', text: reply }]);
    }
    catch {
        if (current())
            setDiscussion(old => [...old, { kind: 'Unavailable', text: 'Assistant unavailable. Your request was not completed and no publishing action was started.' }]);
    }
    finally {
        if (current())
            setThinking(false);
    } };
    return <section aria-label="Telegram operations" className="space-y-5 pb-12"><h1 className="text-2xl font-bold">Telegram operations · {business.name}</h1><p>This console shows saved platform evidence. It is not a synced Telegram inbox. Inbound Telegram commands and assistant-triggered changes are not enabled here.</p>
 <section aria-label="Telegram configuration" className="border rounded-xl p-4 space-y-2"><h2>Client Telegram configuration</h2><button disabled={configBusy} onClick={() => void load()}>Reload Telegram configuration</button>{configError && <p role="alert">{configError}</p>}{snapshot && <><p>Saved configuration: {snapshot.integration.state}. Checked {formatPlatformDateTime(snapshot.checkedAtMs)}.</p><p>Stored transport enabled: {snapshot.integration.transportEnabled ? 'Yes' : 'No'}. Current permission to test: {snapshot.canNotify ? 'Available' : 'Unavailable'}.</p>{snapshot.integration.botId && <p>Stored bot ID: {snapshot.integration.botId}</p>}{snapshot.integration.destinationFingerprint && <p>Saved destination fingerprint: <code>{snapshot.integration.destinationFingerprint}</code></p>}<p>Bot identity and current destination reachability have not been verified by this read. A fingerprint identifies the saved destination; it is not delivery evidence.</p>{snapshot.emergencyStopped && <p role="alert">Emergency stop is active. Sending is unavailable.</p>}</>}<button onClick={() => onNavigate('integrations')}>Review client integrations</button></section>
 <section aria-label="Manual Telegram alert" className="border rounded-xl p-4 space-y-2"><h2>Manual client test alert</h2><p>Sends only to this client’s saved bot and destination, with current execution permission. API acceptance does not establish recipient delivery or read status.</p><form onSubmit={send}><input aria-label="Telegram test alert" placeholder="Type a test alert message to deliver to Telegram..." value={message} maxLength={4096} onChange={e => setMessage(e.target.value)} className="border rounded p-2 w-full"/><button disabled={sending || uncertain || !snapshot?.canNotify || !message.trim()}>Send Test Alert</button></form>{feedback && <p role="status">{feedback}</p>}{uncertain && <p>Further test sends are blocked in this view. Investigate the destination and saved configuration. Reloading configuration does not resolve the unconfirmed attempt.</p>}<p>Manual test attempts do not yet have a durable dispatch journal. Scheduled attempts below have their separate saved records.</p></section>
 <section ref={work} aria-label="Recorded operations"><h2>What the platform recorded</h2><p>Daily counts, current backlog and saved action history come from their canonical modules. Missing records or unavailable readers do not mean zero work or success.</p><DailyWorkReport key={companyId} companyId={companyId}/><NotificationStatus key={'notifications:' + companyId} companyId={companyId}/><ActionHistory key={'actions:' + companyId} companyId={companyId}/></section>
 <section aria-label="Marketing discussion" className="border rounded-xl p-4 space-y-2"><h2>Marketing discussion</h2><p>Suggestions are a local assistant discussion, not Telegram messages or execution confirmations. Review and submit changes in the relevant platform module.</p><button onClick={() => work.current?.scrollIntoView({ behavior: 'smooth' })}>What happened today?</button><button onClick={() => onNavigate('dashboard')}>Open dashboard</button><button onClick={() => onNavigate('leads')}>Open CRM</button><button onClick={() => onNavigate('content')}>Review content</button><div aria-live="polite">{discussion.map((item, i) => <p key={i}><strong>{item.kind}:</strong> <span>{item.text}</span></p>)}</div><input aria-label="Marketing discussion question" placeholder="Ask a marketing question; suggestions do not execute actions." maxLength={4000} value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === 'Enter')
        void ask(); }}/><button disabled={thinking || !question.trim()} onClick={() => void ask()}>Ask assistant</button>{thinking && <p role="status">Loading suggestion…</p>}</section>
 </section>;
};
