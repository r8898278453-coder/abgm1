import {KnowledgeFactsView} from './KnowledgeFactsView';
import {formatPlatformDateTime} from '../../shared/platformTime';
import {websiteImportHistory,cancelWebsiteRun,sourceHistory,importRegisteredWebsite,WebsiteImportSetupError,listSources,uploadSource,sourceCommand,previewSource,downloadSource} from '../services/knowledgeSources';
import {SOURCE_MAX_BYTES,sourceExplanation,type KnowledgeSource,type KnowledgeChunk,type WebsiteImportRun} from '../../shared/knowledge';
import React, { useState, useRef, useEffect } from 'react';
import {
  Brain,
  FileText,
  Upload,
  CheckCircle2,
  Trash2,
  Search,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Plus,
  X,
  BookOpen,
  Layers,
  FileCheck,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { BusinessProfile } from '../types';
import { queryKnowledgeBaseApi } from '../services/aiService';

export interface DocumentItem {
  id: string;
  name: string;
  category: 'Service Catalog' | 'Pricing & Packages' | 'Technical Specs' | 'Policy / SLA' | 'General';
  size: string;
  uploadedAt: string;
  status: 'indexed' | 'indexing';
  chunksCount: number;
  textContent?: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface KnowledgeBaseViewProps {
  companyId?:string;
  business: BusinessProfile;
  documents?: DocumentItem[];
  faqs?: FaqItem[];
  onUpdateDocuments?: (docs: DocumentItem[]) => void;
  onUpdateFaqs?: (faqs: FaqItem[]) => void;
}

const DEFAULT_DOCUMENTS: DocumentItem[] = [];
const DEFAULT_FAQS: FaqItem[] = [];

export const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({
  business,companyId,
  documents: propDocs,
  faqs: propFaqs,
  onUpdateDocuments,
  onUpdateFaqs,
}) => {
  const mounted=useRef(true),querySequence=useRef(0),sourceSequence=useRef(0),previewSequence=useRef(0);const searchController=useRef<AbortController|null>(null);
  const [sources,setSources]=useState<KnowledgeSource[]>([]),[sourceError,setSourceError]=useState(''),[sourceBusy,setSourceBusy]=useState(false);
  const [preview,setPreview]=useState<{source:KnowledgeSource;chunks:KnowledgeChunk[]}|null>(null),[selectedFile,setSelectedFile]=useState<File|null>(null),[citations,setCitations]=useState<any[]>([]);
  useEffect(()=>{mounted.current=true;const controller=new AbortController(),sequence=++sourceSequence.current;if(companyId)listSources(companyId,controller.signal).then(rows=>{if(mounted.current&&sequence===sourceSequence.current)setSources(rows);}).catch(()=>{if(mounted.current)setSourceError('Saved sources unavailable. Reload to retry.');});return()=>{mounted.current=false;querySequence.current++;searchController.current?.abort();controller.abort();};},[companyId]);
  const sourceAction=async(source:KnowledgeSource,command:'approve'|'withdraw'|'retry'|'delete')=>{if(!companyId||sourceBusy)return;sourceSequence.current++;previewSequence.current++;setSourceBusy(true);setSourceError('');invalidateFactSearch();try{const rows=await sourceCommand(companyId,source,command);if(mounted.current){setSources(rows);setPreview(null);setTestResponse(null);setCitations([]);}}catch{if(mounted.current)setSourceError('Source change unconfirmed. Reload sources before retrying.');}finally{if(mounted.current)setSourceBusy(false);}};
  const openPreview=async(source:KnowledgeSource)=>{if(!companyId)return;const sequence=++previewSequence.current;try{const result=await previewSource(companyId,source.id);if(mounted.current&&sequence===previewSequence.current)setPreview(result);}catch{if(mounted.current)setSourceError('Source preview unavailable.');}};
  const historySequence=useRef(0);const [historySource,setHistorySource]=useState<string|null>(null),[historyEvents,setHistoryEvents]=useState<any[]>([]),[historyNext,setHistoryNext]=useState<string|null>(null),[historyError,setHistoryError]=useState('');
  useEffect(()=>{historySequence.current++;setHistorySource(null);setHistoryEvents([]);setHistoryNext(null);setHistoryError('');},[companyId]);
  const loadHistory=async(id:string,before?:string)=>{if(!companyId)return;const sequence=++historySequence.current;setHistorySource(id);setHistoryError('');if(before===undefined){setHistoryEvents([]);setHistoryNext(null);}try{const result=await sourceHistory(companyId,id,before);if(mounted.current&&sequence===historySequence.current){setHistoryEvents(current=>before===undefined?result.events:[...current,...result.events]);setHistoryNext(result.nextBeforeVersion);}}catch{if(mounted.current&&sequence===historySequence.current)setHistoryError('Source history unavailable. Reload to retry.');}};
  const runSequence=useRef(0);const [websiteRuns,setWebsiteRuns]=useState<WebsiteImportRun[]>([]),[runError,setRunError]=useState(''),[runsNext,setRunsNext]=useState<string|null>(null),[runBusy,setRunBusy]=useState(false);
  const loadWebsiteRuns=async(before?:string)=>{if(!companyId)return;const sequence=++runSequence.current;setRunError('');try{const result=await websiteImportHistory(companyId,before);if(mounted.current&&sequence===runSequence.current){setWebsiteRuns(current=>before?[...current,...result.runs]:result.runs);setRunsNext(result.nextBefore);}}catch{if(mounted.current&&sequence===runSequence.current)setRunError('Website run history unavailable. Reload to retry.');}};
  useEffect(()=>{setWebsiteRuns([]);setRunsNext(null);setRunError('');void loadWebsiteRuns();return()=>{runSequence.current++;};},[companyId]);
  const startWebsiteImport=async()=>{if(!companyId||sourceBusy||runBusy)return;sourceSequence.current++;previewSequence.current++;setSourceBusy(true);setSourceError('');invalidateFactSearch();try{const run=await importRegisteredWebsite(companyId);if(mounted.current){runSequence.current++;setWebsiteRuns(current=>[run,...current.filter(row=>row.id!==run.id)]);setPreview(null);setRunError('');}}catch(error){if(mounted.current)setSourceError(error instanceof WebsiteImportSetupError?error.message:'Website import unconfirmed. Reload website runs before retrying.');}finally{if(mounted.current)setSourceBusy(false);}};
  const stopWebsiteImport=async(id:string)=>{if(!companyId||runBusy||sourceBusy)return;runSequence.current++;setRunBusy(true);setRunError('');try{await cancelWebsiteRun(companyId,id);if(mounted.current)await loadWebsiteRuns();}catch{if(mounted.current)setRunError('Website cancellation unconfirmed. Reload runs before retrying.');}finally{if(mounted.current)setRunBusy(false);}};
  const [localDocs, setLocalDocs] = useState<DocumentItem[]>(propDocs || []);
  const [localFaqs, setLocalFaqs] = useState<FaqItem[]>(propFaqs || []);

  const documents = propDocs || localDocs;
  const faqs = propFaqs || localFaqs;

  const updateDocuments = (newDocs: DocumentItem[]) => {
    setLocalDocs(newDocs);
    onUpdateDocuments?.(newDocs);
  };

  const updateFaqs = (newFaqs: FaqItem[]) => {
    setLocalFaqs(newFaqs);
    onUpdateFaqs?.(newFaqs);
  };

  // Test Fact Search
  const [testQuery, setTestQuery] = useState('');
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const invalidateFactSearch=()=>{querySequence.current++;searchController.current?.abort();setIsSearching(false);setTestResponse(null);setCitations([]);};

  // Add FAQ Modal State
  const [isAddFaqOpen, setIsAddFaqOpen] = useState(false);
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqCategory, setFaqCategory] = useState('General');

  // Add Document Modal State
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [docName, setDocName] = useState('');
  const [docCategory, setDocCategory] = useState<DocumentItem['category']>('Service Catalog');
  const [docContent, setDocContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTestFactSearch=async(e:React.FormEvent)=>{
    e.preventDefault();if(!companyId||sourceBusy||!testQuery.trim())return;const sequence=++querySequence.current;searchController.current?.abort();const controller=new AbortController();searchController.current=controller;setIsSearching(true);setTestResponse(null);setCitations([]);
    try{const result=await queryKnowledgeBaseApi({companyId,query:testQuery.trim()},controller.signal);if(mounted.current&&sequence===querySequence.current){setTestResponse(result.answer+(result.sourceWindowTruncated?'\nSearch is limited to the newest 20 approved sources.':'')+(result.faqWindowTruncated?'\nSearch is limited to the first 200 saved FAQs.':''));setCitations(result.citations);}}
    catch{if(mounted.current&&sequence===querySequence.current)setTestResponse('Saved-source search unavailable. No facts were verified.');}
    finally{if(mounted.current&&sequence===querySequence.current)setIsSearching(false);}
  };

  const handleSaveFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqQuestion.trim() || !faqAnswer.trim()) return;

    const newFaq: FaqItem = {
      id: `faq_${Date.now()}`,
      question: faqQuestion.trim(),
      answer: faqAnswer.trim(),
      category: faqCategory.trim() || 'General',
    };

    updateFaqs([newFaq, ...faqs]);
    setFaqQuestion('');
    setFaqAnswer('');
    setIsAddFaqOpen(false);
  };

  const handleSaveDocument=async(e:React.FormEvent)=>{
    e.preventDefault();if(!companyId||sourceBusy)return;
    const file=selectedFile||new File([docContent],docName.toLowerCase().endsWith('.txt')||docName.toLowerCase().endsWith('.md')?docName:docName.replace(/\.[^.]+$/,'')+'.txt',{type:'text/plain'});
    if(!file.name.trim()||!file.size||file.size>SOURCE_MAX_BYTES){setSourceError('Provide a supported file or actual text, up to 2 MiB.');return;}
    sourceSequence.current++;setSourceBusy(true);setSourceError('');invalidateFactSearch();try{const rows=await uploadSource(companyId,file);if(mounted.current){setSources(rows);setSelectedFile(null);setDocName('');setDocContent('');setIsAddDocOpen(false);}}
    catch{if(mounted.current)setSourceError('Upload unconfirmed. Original form retained. Reload sources before retrying.');}
    finally{if(mounted.current)setSourceBusy(false);}
  };
  const handleFileSelect=(e:React.ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(!file)return;setSelectedFile(file);setDocName(file.name);setDocContent('');};

  return (
    <div className="space-y-6 pb-12">
      {/* Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-bold rounded-full flex items-center gap-1">
              <Brain className="w-3 h-3" /> Saved Business Memory
            </span>
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Source quotes and manual facts
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">{business.name} Knowledge Base & Fact Memory</h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
            Store client files privately and review source excerpts with citations. Approved files support this search. Reviewed structured facts also guide user-requested chat, review and marketing drafts; review outputs before sending or publishing. Saved FAQs remain manual business statements.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setIsAddDocOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition shadow-xs"
          >
            <Upload className="w-4 h-4" /> Upload Document / Policy
          </button>
        </div>
      </div>

      {/* Grounded Fact Search Tester */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" /> Search Saved Client Sources
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Search saved FAQs and approved extracted sources. Unsaved edits are excluded.
            </p>
          </div>
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline-block">Mode: source excerpts</span>
        </div>

        <form onSubmit={handleTestFactSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="Ask anything (e.g., 'What are our website delivery timelines?' or 'What is our starting price for app development?')"
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>
          <button
            type="submit"
            disabled={sourceBusy || isSearching || !testQuery.trim()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching...
              </>
            ) : (
              'Search Saved Sources'
            )}
          </button>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="text-slate-400 font-semibold self-center">Try:</span>
          {[
            'What is our starting website delivery timeframe?',
            'What is the price for custom mobile app development?',
            'Do we offer post-launch warranty or SLA support?',
          ].map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => setTestQuery(prompt)}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
            >
              {prompt}
            </button>
          ))}
        </div>

        {testResponse && (
          <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-2xl flex items-start gap-3 text-xs">
            <ShieldCheck className="w-5 h-5 text-indigo-700 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-indigo-950 uppercase tracking-wide text-[10px]">
                Saved Source Search Result
              </div>
              <div className="text-indigo-950 font-medium leading-relaxed whitespace-pre-line">
                {testResponse}
              </div>
            </div>
          </div>
        )}
      </div>

      <section className="bg-white border rounded-2xl p-5 space-y-3">
        <h2 className="font-bold">Private Source Files ({sources.length})</h2>
        <button disabled={sourceBusy} onClick={()=>{if(companyId&&!sourceBusy){invalidateFactSearch();const sequence=++sourceSequence.current;void listSources(companyId).then(rows=>{if(mounted.current&&sequence===sourceSequence.current){setSources(rows);setSourceError('');setTestResponse(null);setCitations([]);previewSequence.current++;setPreview(null);}}).catch(()=>{if(mounted.current)setSourceError('Saved sources unavailable.');});}}}>Reload sources</button>
        <button disabled={sourceBusy||runBusy||!companyId} onClick={()=>void startWebsiteImport()}>Import registered website</button>
        <section aria-label="Website import runs" className="border rounded-xl p-3 space-y-2">
          <h3 className="font-bold">Website import runs</h3>
          <p className="text-xs">Import is processed in the background by the server worker. Reload runs and sources for progress. Saved snapshots require extraction and approval before search.</p>
          <button disabled={sourceBusy||runBusy} onClick={()=>void loadWebsiteRuns()}>Reload website runs</button>
          {runError&&<p role="alert">{runError}</p>}
          {!runError&&!websiteRuns.length&&<p className="text-xs">No recorded website imports loaded.</p>}
          {websiteRuns.map(run=><div key={run.id} className="border-t pt-2 text-xs">
            <p>{run.websiteUrl} · Import {run.status} · attempt {run.attempts} · {formatPlatformDateTime(run.updatedAtMs)}</p>
            {run.errorCode&&<p>{run.errorCode}</p>}
            {run.outcome&&<><p>{run.outcome.status} · {run.outcome.sourceIds.length} saved sources · {run.outcome.reusedCount} unchanged snapshots reused{run.outcome.truncated?' · Page limit reached':''}. Static content completeness is unverified.</p>{run.outcome.failures.map((failure,index)=><p key={index}>{failure.url} · {failure.code}</p>)}</>}
            {['QUEUED','RUNNING','RETRY_WAIT'].includes(run.status)&&<button disabled={sourceBusy||runBusy} onClick={()=>void stopWebsiteImport(run.id)}>Cancel website import</button>}
          </div>)}
          {runsNext&&<button disabled={sourceBusy||runBusy} onClick={()=>void loadWebsiteRuns(runsNext)}>Load older website imports</button>}
        </section>
        <p className="text-xs text-slate-500">Text PDF extraction depends on server support; scanned PDFs need OCR. DOCX extracts body text. Uploads queue server-side extraction. Review text before approving use. Retrying queues a new run and clears approval. Deleting originals retains minimal lifecycle audit metadata.</p>
        {sourceError&&<p role="alert" className="text-rose-700">{sourceError}</p>}
        {sources.map(source=><div key={source.id} className="border rounded-xl p-3 text-sm">
          <strong>{source.filename}</strong>{source.sourceUrl&&<p className="text-xs">Snapshot: {source.sourceUrl} · {source.fetchedAtMs?formatPlatformDateTime(source.fetchedAtMs):'Fetch time unavailable'}</p>}<div>{source.state} · {source.byteSize} bytes · {source.approved?'Approved for search':'Not approved'}</div>{source.extractionJobId&&<p className="text-xs">Ingestion job: {source.ingestionJobStatus||'Status unavailable'}. Processing requires the server worker; reload sources for updated state.</p>}
          {source.code&&<p className="text-xs">{sourceExplanation(source.code)}</p>}
          <button onClick={()=>void loadHistory(source.id)} className="mr-3">Source history</button>
          <button disabled={sourceBusy} onClick={()=>void openPreview(source)} className="mr-3">Review extracted text</button>
          <button disabled={sourceBusy||['QUEUED','RUNNING','RETRY_WAIT'].includes(source.ingestionJobStatus||'')} onClick={()=>void sourceAction(source,'retry')} className="mr-3">Retry extraction</button>
          <button disabled={sourceBusy} onClick={()=>void sourceAction(source,'delete')} className="mr-3">Delete source</button>
          <button onClick={()=>{if(companyId)void downloadSource(companyId,source).catch(()=>{if(mounted.current)setSourceError('Download unavailable.');});}}>Download original</button>
        </div>)}
        {historySource&&<section aria-label="Source lifecycle history" className="border rounded-xl p-3"><h3>Source lifecycle history</h3><p className="text-xs">Recorded source transitions since this feature was enabled; older events are not backfilled. Deleting original bytes retains this minimal audit metadata.</p><button onClick={()=>void loadHistory(historySource)}>Reload source history</button>{historyError&&<p role="alert">{historyError}</p>}{!historyError&&!historyEvents.length&&<p>No recorded source events loaded.</p>}{historyEvents.map(event=><p key={event.id} className="text-xs">{event.event} · revision {event.sourceVersion} · {event.state} · {formatPlatformDateTime(event.recordedAtMs)}</p>)}{historyNext&&<button onClick={()=>void loadHistory(historySource,historyNext)}>Load older source events</button>}</section>}
        {citations.map(citation=><div key={citation.label} className="text-xs border-t pt-2">[{citation.label}] {citation.title} · version {citation.sourceVersion}{citation.page?` · page ${citation.page}`:''}{citation.sourceUrl&&<span> · {citation.sourceUrl}{citation.fetchedAtMs!=null?' · '+formatPlatformDateTime(citation.fetchedAtMs):''}</span>}</div>)}
      </section>
      {preview&&<section className="bg-slate-50 border p-5 rounded-xl space-y-3">
        <h3 className="font-bold">Extraction preview: {preview.source.filename}</h3>
        <pre className="whitespace-pre-wrap max-h-96 overflow-y-auto text-xs">{preview.chunks.map(chunk=>`${chunk.page?`Page ${chunk.page}: `:''}${chunk.text}`).join('\n\n')||'No extracted text available.'}</pre>
        <p className="text-xs">Approval permits source use; it does not independently verify business claims.</p>
        {preview.source.state==='EXTRACTED'&&!preview.source.approved&&<button disabled={sourceBusy} onClick={()=>void sourceAction(preview.source,'approve')}>Approve this extraction version</button>}
        {preview.source.approved&&<button disabled={sourceBusy} onClick={()=>void sourceAction(preview.source,'withdraw')}>Stop using this source</button>}
        <button onClick={()=>{previewSequence.current++;setPreview(null);}} className="ml-4">Close preview</button>
      </section>}
      {companyId&&<KnowledgeFactsView companyId={companyId} sources={sources} disabled={sourceBusy} onBusy={setSourceBusy} onChange={invalidateFactSearch}/>}
      <p className="text-xs text-slate-500">Legacy document and FAQ edits are workspace drafts until the workspace save status confirms them.</p>
      {/* Two Columns: Uploaded Documents & Verified Business FAQs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Repository */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" /> Legacy Profile Documents ({documents.length})
            </h3>
            <button
              onClick={() => setIsAddDocOpen(true)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Doc
            </button>
          </div>

          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 hover:border-indigo-300 transition shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 font-black text-[11px] flex-shrink-0 shadow-2xs">
                    {doc.name.endsWith('.pdf') ? 'PDF' : doc.name.endsWith('.docx') ? 'DOC' : 'TXT'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-slate-900 truncate">{doc.name}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="font-semibold text-slate-700">{doc.category}</span>
                      <span>•</span>
                      <span>{doc.size}</span>
                      <span>•</span>
                      <span className="text-indigo-600 font-bold">Legacy text; extraction unverified</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Legacy record
                  </span>
                  <button
                    onClick={() => updateDocuments(documents.filter((d) => d.id !== doc.id))}
                    title="Delete document"
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Verified FAQ Memory */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-600" /> Saved Business FAQs ({faqs.length})
            </h3>
            <button
              onClick={() => setIsAddFaqOpen(true)}
              className="text-xs text-indigo-600 font-bold hover:text-indigo-800 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add FAQ
            </button>
          </div>

          <div className="space-y-3">
            {faqs.map((faq) => (
              <div key={faq.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 shadow-2xs">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-xs text-slate-900">{faq.question}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md">
                      {faq.category}
                    </span>
                    <button
                      onClick={() => updateFaqs(faqs.filter((f) => f.id !== faq.id))}
                      className="text-slate-400 hover:text-rose-600 p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add FAQ Modal */}
      {isAddFaqOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="add-faq-title" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 id="add-faq-title" className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-600" /> Add Grounded FAQ
              </h3>
              <button
                onClick={() => setIsAddFaqOpen(false)}
                aria-label="Close FAQ editor"
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFaq} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={faqCategory}
                  onChange={(e) => setFaqCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                >
                  <option value="Websites">Websites</option>
                  <option value="Mobile Apps">Mobile Apps</option>
                  <option value="SEO">SEO & Google 3-Pack</option>
                  <option value="Pricing">Pricing & Payments</option>
                  <option value="Delivery / SLA">Delivery & SLA</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Question
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Do you provide support after launch?"
                  value={faqQuestion}
                  onChange={(e) => setFaqQuestion(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Manual Business Answer
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g., Yes, all custom software solutions include 90-day comprehensive post-launch warranty with bug resolution..."
                  value={faqAnswer}
                  onChange={(e) => setFaqAnswer(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddFaqOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={sourceBusy}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Save to AI Memory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Document Modal */}
      {isAddDocOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" /> Add Knowledge Document / Rate Card
              </h3>
              <button
                onClick={() => setIsAddDocOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDocument} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Choose File or Enter Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aaditech_Custom_Software_Rates_2026.pdf"
                    value={docName} disabled={selectedFile!==null}
                    onChange={(e) => setDocName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".pdf,.docx,.txt,.md"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" /> Browse
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pasted text (when no file is selected)
                </label>
                <textarea
                  rows={4}
                  placeholder="Paste actual text to store as a private UTF-8 source for review."
                  value={docContent}
                  disabled={selectedFile!==null}
                  onChange={(e) => setDocContent(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddDocOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={sourceBusy}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Upload & Extract Source
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
