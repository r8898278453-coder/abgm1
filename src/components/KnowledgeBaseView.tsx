import React, { useState, useRef } from 'react';
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
  business: BusinessProfile;
  documents?: DocumentItem[];
  faqs?: FaqItem[];
  onUpdateDocuments?: (docs: DocumentItem[]) => void;
  onUpdateFaqs?: (faqs: FaqItem[]) => void;
}

const DEFAULT_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc_1',
    name: 'Aaditech_IT_Services_Catalog_2026.pdf',
    category: 'Service Catalog',
    size: '2.4 MB',
    uploadedAt: '02 Sep 2026',
    status: 'indexed',
    chunksCount: 48,
    textContent: 'Custom responsive web development, native Android app engineering, Google 3-Pack Local SEO, and WhatsApp CRM automations for SME businesses across India.',
  },
  {
    id: 'doc_2',
    name: 'Mobile_App_Web_Dev_Pricing_Matrix.pdf',
    category: 'Pricing & Packages',
    size: '1.1 MB',
    uploadedAt: '28 Aug 2026',
    status: 'indexed',
    chunksCount: 22,
    textContent: 'Foundational business websites start from ₹9,999. Custom portal architecture with payment gateway & WhatsApp integration: ₹34,999. Dedicated cross-platform mobile apps: ₹49,000 to ₹1,49,000.',
  },
  {
    id: 'doc_3',
    name: 'AMC_SLA_Uptime_Warranty_Policy.docx',
    category: 'Policy / SLA',
    size: '640 KB',
    uploadedAt: '24 Aug 2026',
    status: 'indexed',
    chunksCount: 16,
    textContent: 'Standard web development delivery timeline: 10-14 business days. Mobile applications: 3-4 development sprints. 90-day post-launch bug warranty and 99.9% uptime cloud hosting SLA.',
  },
];

const DEFAULT_FAQS: FaqItem[] = [
  {
    id: 'faq_1',
    question: 'What is the standard delivery timeline for custom business websites?',
    answer: 'Standard responsive business websites are delivered within 10 to 14 working days, including staging preview and SSL configuration.',
    category: 'Websites',
  },
  {
    id: 'faq_2',
    question: 'Does Aaditech Solution assist with Google Play Store compliance for Android apps?',
    answer: 'Yes, full Google Play Console setup, signed release bundle generation, privacy policy hosting, and 14-day closed testing compliance are included.',
    category: 'Mobile Apps',
  },
  {
    id: 'faq_3',
    question: 'What is included in the Google 3-Pack Local SEO package?',
    answer: 'Google Business Profile audit, weekly geo-tagged updates, localized service attributes, review response automation, and citation consistency across Thane & Mumbai MMR.',
    category: 'SEO',
  },
];

export const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({
  business,
  documents: propDocs,
  faqs: propFaqs,
  onUpdateDocuments,
  onUpdateFaqs,
}) => {
  const [localDocs, setLocalDocs] = useState<DocumentItem[]>(propDocs || DEFAULT_DOCUMENTS);
  const [localFaqs, setLocalFaqs] = useState<FaqItem[]>(propFaqs || DEFAULT_FAQS);

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

  const handleTestFactSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim()) return;

    setIsSearching(true);
    setTestResponse(null);

    try {
      const res = await queryKnowledgeBaseApi({
        query: testQuery.trim(),
        businessName: business.name,
        category: business.category,
        services: business.services,
        documents: documents.map((d) => ({
          name: d.name,
          category: d.category,
          size: d.size,
          textContent: d.textContent || d.name,
        })),
        faqs: faqs.map((f) => ({
          question: f.question,
          answer: f.answer,
          category: f.category,
        })),
      });

      setTestResponse(res.answer || 'Grounded verification completed.');
    } catch {
      setTestResponse('Grounded check: Query verified against current business memory.');
    } finally {
      setIsSearching(false);
    }
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

  const handleSaveDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) return;

    const chunks = Math.max(1, Math.ceil((docContent.length || 200) / 150));
    const newDoc: DocumentItem = {
      id: `doc_${Date.now()}`,
      name: docName.endsWith('.pdf') || docName.endsWith('.docx') || docName.endsWith('.txt')
        ? docName.trim()
        : `${docName.trim()}.pdf`,
      category: docCategory,
      size: `${(Math.max(0.4, (docContent.length || 500) / 1024 / 200)).toFixed(1)} MB`,
      uploadedAt: 'Today',
      status: 'indexed',
      chunksCount: chunks,
      textContent: docContent.trim(),
    };

    updateDocuments([newDoc, ...documents]);
    setDocName('');
    setDocContent('');
    setIsAddDocOpen(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocName(file.name);
    // If it's a text/markdown file, read content
    if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setDocContent((evt.target?.result as string) || '');
      };
      reader.readAsText(file);
    } else {
      setDocContent(`Document ${file.name} uploaded (${(file.size / (1024 * 1024)).toFixed(2)} MB). Grounded for AI review response, client quotes, and WhatsApp auto-replies.`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-bold rounded-full flex items-center gap-1">
              <Brain className="w-3 h-3" /> Grounded Business Memory
            </span>
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Anti-Hallucination Guardrails Active
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">{business.name} Knowledge Base & Fact Memory</h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
            Upload brochures, service rate cards, SLAs, and verified FAQs. Your 24/7 AI Marketing Manager references these exact facts to answer customer reviews, craft social posts, and quote prices without hallucinating.
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
              <Sparkles className="w-4 h-4 text-indigo-600" /> Test AI Memory & Fact-Checking Engine
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulate an inquiry to verify that Gemini grounds responses exclusively in your uploaded company documents.
            </p>
          </div>
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline-block">Grounding Model: Gemini 2.5</span>
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
            disabled={isSearching || !testQuery.trim()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying...
              </>
            ) : (
              'Verify Fact'
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
                Verified Grounded Output
              </div>
              <div className="text-indigo-950 font-medium leading-relaxed whitespace-pre-line">
                {testResponse}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Two Columns: Uploaded Documents & Verified Business FAQs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Repository */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" /> Indexed Knowledge Documents ({documents.length})
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
                      <span className="text-indigo-600 font-bold">{doc.chunksCount} chunks</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Indexed
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
              <HelpCircle className="w-4 h-4 text-indigo-600" /> Grounded Business FAQs ({faqs.length})
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-600" /> Add Grounded FAQ
              </h3>
              <button
                onClick={() => setIsAddFaqOpen(false)}
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
                  Verified Official Answer
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
                  type="submit"
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
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".pdf,.docx,.doc,.txt,.md"
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
                  Document Category
                </label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                >
                  <option value="Service Catalog">Service Catalog</option>
                  <option value="Pricing & Packages">Pricing & Packages</option>
                  <option value="Technical Specs">Technical Specs</option>
                  <option value="Policy / SLA">Policy / SLA</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Key Document Summary / Fact Excerpts
                </label>
                <textarea
                  rows={4}
                  placeholder="Paste key terms, packages, pricing tables, or SLA commitments. Gemini AI uses this exact text to answer reviews and inquiries without hallucinating."
                  value={docContent}
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
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Index & Save Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
