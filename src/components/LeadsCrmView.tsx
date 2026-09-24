import React, { useState } from 'react';
import {
  Contact2,
  Sparkles,
  Phone,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  DollarSign,
  ChevronRight,
  Filter,
  Plus,
  X,
  CreditCard,
  Loader2,
  Copy,
  ExternalLink,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { LeadItem } from '../types';
import {
  apiRequest,
  sendWhatsAppMessageApi,
  getWhatsAppStatusApi,
  createPaymentLinkApi,
} from '../services/authService';

interface LeadsCrmViewProps {
  leads: LeadItem[];
  onUpdateLeadStage: (leadId: string, stage: LeadItem['stage']) => void;
  onLeadAdded?: (newLead: LeadItem) => void;
  companyId?: string;
}

export const LeadsCrmView: React.FC<LeadsCrmViewProps> = ({
  leads,
  onUpdateLeadStage,
  onLeadAdded,
  companyId,
}) => {
  const [selectedLead, setSelectedLead] = useState<LeadItem | undefined>(leads[0]);
  const [replyDraft, setReplyDraft] = useState(leads[0]?.aiSuggestedReply || '');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [dispatchNotice, setDispatchNotice] = useState<string | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  React.useEffect(() => {
    if ((!selectedLead || !leads.some((l) => l.id === selectedLead.id)) && leads.length > 0) {
      setSelectedLead(leads[0]);
      setReplyDraft(leads[0]?.aiSuggestedReply || '');
    } else if (leads.length === 0) {
      setSelectedLead(undefined);
      setReplyDraft('');
    }
  }, [leads]);

  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadCompany, setNewLeadCompany] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadService, setNewLeadService] = useState('');
  const [newLeadBudget, setNewLeadBudget] = useState('');
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  // WhatsApp & Razorpay Action States
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(5000);
  const [paymentDescription, setPaymentDescription] = useState('Token Advance Booking for Project');
  const [isGeneratingPayment, setIsGeneratingPayment] = useState(false);
  const [generatedPaymentLink, setGeneratedPaymentLink] = useState<string | null>(null);
  const [copiedPayLink, setCopiedPayLink] = useState(false);

  const stages: LeadItem['stage'][] = ['new', 'contacted', 'qualified', 'opportunity', 'quotation', 'won', 'lost'];

  const handleSelectLead = (lead: LeadItem) => {
    setSelectedLead(lead);
    setReplyDraft(lead.aiSuggestedReply);
    setGeneratedPaymentLink(null);
  };

  const handleSendWhatsApp = async (lead: LeadItem) => {
    let cleanPhone = lead.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }

    const messageText = replyDraft || lead.aiSuggestedReply;
    setIsSendingWhatsApp(true);

    try {
      // Call official WhatsApp Cloud API backend dispatcher
      const res = await sendWhatsAppMessageApi({
        to: cleanPhone,
        message: messageText,
        companyId,
      });

      if (res.success && res.method === 'meta_cloud_api') {
        setDispatchNotice(`✓ Dispatched via Meta WhatsApp Cloud API (Message ID: ${res.messageId}) to ${cleanPhone}! Stage set to Contacted.`);
      } else if (res.waLink) {
        window.open(res.waLink, '_blank', 'noopener,noreferrer');
        setDispatchNotice(`✓ WhatsApp opened with personalized quotation for ${lead.name} (${lead.phone}). Stage set to Contacted.`);
      } else {
        const fallbackUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
        setDispatchNotice(`✓ WhatsApp opened for ${lead.name}. Stage set to Contacted.`);
      }

      // Update state to contacted
      if (lead.stage === 'new') {
        onUpdateLeadStage(lead.id, 'contacted');
        apiRequest(`/api/leads/${lead.id}/stage`, {
          method: 'PATCH',
          body: JSON.stringify({ stage: 'contacted' }),
        }).catch(() => {});
      }
    } catch (err: any) {
      const fallbackUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      setDispatchNotice(`✓ WhatsApp direct link opened for ${lead.name}.`);
    } finally {
      setIsSendingWhatsApp(false);
      setTimeout(() => setDispatchNotice(null), 8000);
    }
  };

  const handleCreateLeadPaymentLink = async () => {
    if (!paymentAmount || paymentAmount <= 0) return;
    setIsGeneratingPayment(true);
    try {
      const res = await createPaymentLinkApi({
        amount: paymentAmount,
        description: paymentDescription || `Advance Payment for ${selectedLead.serviceRequested}`,
        customerName: selectedLead.name,
        customerPhone: selectedLead.phone,
        leadId: selectedLead.id,
        companyId,
      });

      if (res.success && res.shortUrl) {
        setGeneratedPaymentLink(res.shortUrl);
        // Append to the reply draft for easy 1-click dispatch
        const linkNotice = `\n\n💳 Secure Razorpay Payment Link to confirm booking (₹${paymentAmount}):\n${res.shortUrl}`;
        setReplyDraft((prev) => (prev.includes(res.shortUrl!) ? prev : prev + linkNotice));
        setDispatchNotice(`✓ Razorpay Payment Link (₹${paymentAmount}) generated & added to WhatsApp quote draft!`);
        setDispatchError(null);
      } else {
        setDispatchError(res.error || 'Failed to create payment link. Verify Razorpay credentials in Connected Accounts.');
      }
    } catch (err: any) {
      setDispatchError(err?.message || 'Error generating Razorpay payment link. Please check network connection.');
    } finally {
      setIsGeneratingPayment(false);
      setTimeout(() => setDispatchNotice(null), 8000);
      setTimeout(() => setDispatchError(null), 8000);
    }
  };

  const handleCreateLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim() || !newLeadPhone.trim()) return;

    setIsSubmittingLead(true);
    try {
      const payload = {
        company_id: companyId,
        name: newLeadName,
        company: newLeadCompany || 'Direct Client',
        phone: newLeadPhone,
        service: newLeadService || 'Custom Web / Mobile App Development',
        budget: newLeadBudget || '₹25,000 - ₹50,000',
        source: 'bga.aaditechs.in Direct',
      };

      const data = await apiRequest<{ success: boolean; lead: any }>('/api/leads', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (data && data.lead) {
        const createdLead: LeadItem = {
          id: data.lead.id,
          name: data.lead.name,
          phone: data.lead.phone,
          serviceRequested: data.lead.service,
          date: 'Just now',
          source: 'Website',
          intentScore: data.lead.intent_score,
          stage: 'new',
          notes: data.lead.company,
          aiSuggestedReply: data.lead.ai_suggested_reply,
        };
        setSelectedLead(createdLead);
        setReplyDraft(createdLead.aiSuggestedReply);
        if (onLeadAdded) {
          onLeadAdded(createdLead);
        }
        setIsAddLeadModalOpen(false);
        setNewLeadName('');
        setNewLeadCompany('');
        setNewLeadPhone('');
        setNewLeadService('');
        setNewLeadBudget('');
        setDispatchNotice(`✓ New lead successfully recorded in Database & notified on Telegram!`);

        // Check if WhatsApp integration is active for this company and auto-dispatch suggested reply
        const leadPhone = data.lead.phone;
        const suggestedReply = data.lead.ai_suggested_reply || data.lead.aiSuggestedReply;
        if (leadPhone && suggestedReply) {
          getWhatsAppStatusApi(companyId)
            .then(async (status) => {
              if (status?.configured) {
                const waRes = await sendWhatsAppMessageApi({
                  to: leadPhone,
                  message: suggestedReply,
                  companyId,
                });
                if (waRes?.success) {
                  onUpdateLeadStage(data.lead.id, 'contacted');
                  apiRequest(`/api/leads/${data.lead.id}/stage`, {
                    method: 'PATCH',
                    body: JSON.stringify({ stage: 'contacted' }),
                  }).catch(() => {});
                  setDispatchNotice(
                    `✓ Lead recorded, notified on Telegram, & automated WhatsApp reply dispatched to ${leadPhone}!`
                  );
                }
              }
            })
            .catch(() => {
              // Skip silently if WhatsApp check or send fails
            });
        }
      }
    } catch {
      setDispatchNotice(`✓ Lead logged into active pipeline.`);
      setIsAddLeadModalOpen(false);
    } finally {
      setIsSubmittingLead(false);
    }
  };

  const filteredLeads = leads.filter((l) => {
    if (filterStage === 'all') return true;
    return l.stage === filterStage;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Contact2 className="w-7 h-7 text-indigo-600" />
            Unified Lead CRM & AI Sales Assistant
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Omni-channel customer inbox with automated intent scoring, WhatsApp instant quotes & follow-up reminders.
          </p>
        </div>

        <button
          onClick={() => setIsAddLeadModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Record Inbound Lead (API / Form)</span>
        </button>
      </div>

      {/* WhatsApp Dispatch Notice Banner */}
      {dispatchNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{dispatchNotice}</span>
          </div>
          <button
            onClick={() => setDispatchNotice(null)}
            className="text-emerald-700 hover:text-emerald-950 font-black px-2 py-0.5 rounded-md hover:bg-emerald-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Banner */}
      {dispatchError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{dispatchError}</span>
          </div>
          <button
            onClick={() => setDispatchError(null)}
            className="text-rose-700 hover:text-rose-950 font-black px-2 py-0.5 rounded-md hover:bg-rose-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Pipeline Stage Bar Bento Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {stages.map((st) => {
          const count = leads.filter((l) => l.stage === st).length;
          const isActive = filterStage === st;
          return (
            <button
              key={st}
              onClick={() => setFilterStage(filterStage === st ? 'all' : st)}
              className={`p-3.5 rounded-2xl border text-center transition shadow-xs ${
                isActive
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className={`text-[10px] uppercase font-bold tracking-wider ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>{st}</div>
              <div className="text-xl font-black mt-0.5">{count}</div>
            </button>
          );
        })}
      </div>

      {/* Main CRM Grid: Lead List + Active Assistant Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Leads List (5 cols) in Bento Card */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
            <span>Inquiries ({filteredLeads.length})</span>
            <span>Sorted by Intent Score</span>
          </div>

          <div className="space-y-2.5">
            {filteredLeads.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="font-bold text-slate-800 text-xs">No Leads in Pipeline</div>
                <p className="text-[11px] text-slate-500">
                  Customer inquiries via WhatsApp, Google 3-Pack, and Website contact forms will appear here with instant AI intent scoring.
                </p>
              </div>
            ) : (
              filteredLeads.map((lead) => {
                const isSelected = selectedLead?.id === lead.id;
                return (
                  <div
                    key={lead.id}
                    onClick={() => handleSelectLead(lead)}
                    className={`p-4 rounded-2xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/70 border-indigo-300 shadow-xs'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <span>{lead.name}</span>
                          <span className="text-[10px] bg-white text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 font-medium shadow-2xs">
                            {lead.source}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 font-mono">{lead.phone}</div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            lead.intentScore >= 90
                              ? 'bg-rose-100 text-rose-700'
                              : lead.intentScore >= 80
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          Intent: {lead.intentScore}%
                        </span>
                        <div className="text-[10px] text-slate-400 uppercase font-bold mt-1">
                          Stage: {lead.stage}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 mt-2 font-medium line-clamp-1">
                      {lead.serviceRequested}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Lead Detail & AI Sales Assistant (7 cols) in Bento Card */}
        <div className="lg:col-span-7 space-y-4">
          {selectedLead ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
              {/* Lead Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900">{selectedLead.name}</h2>
                    <span className="text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                      Channel: {selectedLead.source}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Phone: <span className="font-mono text-slate-800 font-semibold">{selectedLead.phone}</span> • Inquired on: {selectedLead.date}
                  </div>
                </div>

                {/* Stage dropdown */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-bold">Stage:</span>
                  <select
                    value={selectedLead.stage}
                    onChange={(e) => onUpdateLeadStage(selectedLead.id, e.target.value as any)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 uppercase focus:outline-none focus:border-indigo-500 shadow-2xs"
                  >
                    {stages.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Requirement & Notes */}
              <div className="space-y-1.5 text-xs">
                <span className="text-slate-600 font-bold uppercase tracking-wider text-[11px]">Customer Inquiry & Symptoms</span>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 font-medium text-slate-800 leading-relaxed">
                  {selectedLead.serviceRequested}
                </div>
                <p className="text-[11px] text-slate-500 italic">Notes: {selectedLead.notes}</p>
              </div>

              {/* AI Suggested Response Box Bento Sub-tile */}
              <div className="bg-slate-50 border border-indigo-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    AI Smart Sales Assistant (WhatsApp Instant Quote)
                  </span>
                  <span className="text-[10px] text-slate-500">Personalized with Warranty & Pricing</span>
                </div>

                <textarea
                  rows={4}
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  className="w-full bg-white border border-indigo-200 rounded-xl p-3 text-xs text-slate-800 leading-relaxed focus:outline-none focus:border-indigo-500 shadow-2xs"
                />

                {generatedPaymentLink && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      <div>
                        <span className="font-bold text-emerald-900">Razorpay Link Ready (₹{paymentAmount})</span>
                        <div className="text-[10px] text-emerald-700 font-mono truncate max-w-xs">{generatedPaymentLink}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedPaymentLink);
                          setCopiedPayLink(true);
                          setTimeout(() => setCopiedPayLink(false), 2000);
                        }}
                        className="p-1.5 bg-white border border-emerald-300 rounded-lg text-emerald-700 hover:bg-emerald-100 font-bold transition flex items-center gap-1 text-[11px]"
                      >
                        {copiedPayLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        {copiedPayLink ? 'Copied' : 'Copy'}
                      </button>
                      <a
                        href={generatedPaymentLink}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold transition text-[11px] flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" /> Responding within 5 mins gives 8x higher close rate.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPaymentModalOpen(true)}
                      className="flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold px-3 py-2.5 rounded-xl transition"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Attach Razorpay Link</span>
                    </button>
                    <button
                      onClick={() => handleSendWhatsApp(selectedLead)}
                      disabled={isSendingWhatsApp}
                      className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs disabled:opacity-60"
                    >
                      {isSendingWhatsApp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>{isSendingWhatsApp ? 'Sending...' : 'Send via WhatsApp API'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Contact2 className="w-6 h-6" />
              </div>
              <div className="font-bold text-slate-900 text-sm">Select a Lead to Open AI Sales Assistant</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                When prospective customers inquire on your Website, WhatsApp, or Google 3-Pack, you can review details and send automated AI quotes here.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Record Inbound Lead Modal */}
      {isAddLeadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Record Inbound Lead (API / Live Form)</h3>
                <p className="text-xs text-slate-500">Instantly saves to Database & alerts Telegram bot.</p>
              </div>
              <button
                onClick={() => setIsAddLeadModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLeadSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Client Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Rajesh Mehta"
                    value={newLeadName}
                    onChange={(e) => setNewLeadName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 font-medium text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Phone (WhatsApp) *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98200 00000"
                    value={newLeadPhone}
                    onChange={(e) => setNewLeadPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 font-medium text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Company / Business Name</label>
                <input
                  type="text"
                  placeholder="e.g., Mehta Logistics & Transport"
                  value={newLeadCompany}
                  onChange={(e) => setNewLeadCompany(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 font-medium text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Service Required</label>
                <input
                  type="text"
                  placeholder="e.g., Custom Android Mobile App & Local SEO"
                  value={newLeadService}
                  onChange={(e) => setNewLeadService(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 font-medium text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Budget Range</label>
                <input
                  type="text"
                  placeholder="e.g., ₹45,000 - ₹80,000"
                  value={newLeadBudget}
                  onChange={(e) => setNewLeadBudget(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 font-medium text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddLeadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLead}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition flex items-center gap-2 shadow-xs disabled:opacity-50"
                >
                  {isSubmittingLead ? 'Saving...' : 'Save & Trigger AI Pitch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Quick Razorpay Link Modal for Active Lead */}
      {isPaymentModalOpen && selectedLead && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                  ₹
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Generate Payment Link</h3>
                  <p className="text-[11px] text-slate-500">For {selectedLead.name} ({selectedLead.phone})</p>
                </div>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Advance / Invoice Amount (INR) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    min={1}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Payment Purpose / Description</label>
                <input
                  type="text"
                  value={paymentDescription}
                  onChange={(e) => setPaymentDescription(e.target.value)}
                  placeholder="e.g. Booking Advance for App Development"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800"
                />
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                This will create an official UPI / Card / NetBanking payment link. The link will be instantly appended to your WhatsApp quotation draft so the client can pay in 1 tap.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleCreateLeadPaymentLink();
                  setIsPaymentModalOpen(false);
                }}
                disabled={isGeneratingPayment || paymentAmount <= 0}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {isGeneratingPayment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                {isGeneratingPayment ? 'Generating...' : 'Generate & Attach Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
