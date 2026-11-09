import {reviewCollectionUrl} from '../../shared/reviewCollection';
import {createReviewQr,printReviewCard} from '../services/reviewQr';
import React, { useState, useEffect, useRef } from 'react';
import {
  Star,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Send,
  Copy,
  Check,
  Filter,
  ShieldAlert,
  Download,
  X,
  Printer,
  Plus,
  Trash2,
  Database,
  RefreshCw,
} from 'lucide-react';
import { ReviewItem, BusinessProfile } from '../types';
import { generateReviewReply } from '../services/aiService';
import { createReviewApi, replyToReviewApi, deleteReviewApi } from '../services/authService';

interface ReviewsViewProps {
  reviews: ReviewItem[];
  business: BusinessProfile;
  companyId?: string;
  onAddReply: (reviewId: string, replyText: string) => void;
  onAddNewReview?: (review: Partial<ReviewItem>) => void;
  onDeleteReview?: (reviewId: string) => void;
  onRefreshReviews?: () => void;
}

export const ReviewsView: React.FC<ReviewsViewProps> = ({
  reviews,
  business,
  companyId,
  onAddReply,
  onAddNewReview,
  onDeleteReview,
  onRefreshReviews,
}) => {
  const mounted=useRef(true);useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const [localReviews, setLocalReviews] = useState<ReviewItem[]>(reviews);
  const [filter, setFilter] = useState<'all' | 'unanswered' | 'negative' | 'positive'>('all');
  const [generatingForId, setGeneratingForId] = useState<string | null>(null);
  const [draftReplies, setDraftReplies] = useState<Record<string, string>>({});
  const [selectedTone, setSelectedTone] = useState<'Professional' | 'Friendly' | 'Short' | 'Hinglish'>('Friendly');
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'inbox' | 'collection'>('inbox');
  const [isStandeeModalOpen, setIsStandeeModalOpen] = useState(false);
  const [isAddReviewModalOpen, setIsAddReviewModalOpen] = useState(false);

  // Status & Feedback States
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isReplyingId, setIsReplyingId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Synchronize with external reviews when company switches or parent refreshes
  useEffect(() => {
    setLocalReviews(reviews);
  }, [reviews]);

  // New Review Form State
  const [newAuthor, setNewAuthor] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [newContent, setNewContent] = useState('');
  const [newTopic, setNewTopic] = useState('Customer Experience');
  const [newIsOperationalIssue, setNewIsOperationalIssue] = useState(false);
  const [newSource, setNewSource] = useState<'google' | 'justdial' | 'manual'>('manual');
  const [submittingReview, setSubmittingReview] = useState(false);

  const reviewLink=reviewCollectionUrl(business as any);
  const [qrResult,setQr]=useState<{image:string;svg:string;url:string}|null>(null),[qrError,setQrError]=useState('');
  const qr=qrResult?.url===reviewLink?qrResult:null;
  useEffect(()=>{let current=true;setQr(null);setQrError('');setCopiedLink(false);
    if(reviewLink)void createReviewQr(reviewLink).then(result=>{if(current)setQr({...result,url:reviewLink});}).catch(()=>{if(current)setQrError('QR generation unavailable. Use the configured link instead.');});
    return()=>{current=false;};
  },[reviewLink]);
  const handleDownloadSvg=()=>{
    if(!qr)return;const url=URL.createObjectURL(new Blob([qr.svg],{type:'image/svg+xml'}));const link=document.createElement('a');link.href=url;link.download='google-review-qr.svg';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const generationRequest=useRef<AbortController|null>(null);
  useEffect(()=>()=>generationRequest.current?.abort(),[]);
  const handleGenerateReply = async (review: ReviewItem) => {
    generationRequest.current?.abort();const controller=new AbortController();generationRequest.current=controller;
    setGeneratingForId(review.id);setActionError(null);
    try{
      const reply=await generateReviewReply({companyId,reviewText:review.content,rating:review.rating,reviewerName:review.author,tone:selectedTone,language:selectedTone==='Hinglish'?'Hinglish':'English',businessName:business.name},controller.signal);
      if(!controller.signal.aborted)setDraftReplies(prev=>({...prev,[review.id]:reply}));
    }catch{if(!controller.signal.aborted)setActionError('AI reply unavailable. Existing draft was kept; retry or write a reply manually.');}
    finally{if(!controller.signal.aborted)setGeneratingForId(null);}
  };

  const handlePublishReply = async (reviewId: string) => {
    const text = draftReplies[reviewId];
    if (!text || !text.trim()) return;

    const trimmedText = text.trim();
    setIsReplyingId(reviewId);
    setActionError(null);

    try {
      const ok = await replyToReviewApi(reviewId, trimmedText, companyId);
      if(!mounted.current)return;
      if (!ok) {
        throw new Error('Server returned an error when saving reply');
      }
      setLocalReviews(prev=>prev.map(review=>review.id===reviewId?{...review,replied:true,replyText:trimmedText,replyDate:'Just now'}:review));
      setDraftReplies(prev=>{const next={...prev};delete next[reviewId];return next;});
      setActionSuccess('Reply saved to workspace records. Publication on the review provider is not confirmed.');
      setTimeout(() => setActionSuccess(null), 4000);
      onAddReply(reviewId, trimmedText);
    } catch (err: any) {
      if(!mounted.current)return;
      console.error('Failed to save review reply to MySQL:', err);
      // Keep the editable draft when persistence is unconfirmed.
      setDraftReplies((prev) => ({ ...prev, [reviewId]: text }));
      setActionError(`Failed to save review reply to MySQL: ${err?.message || 'Network error'}. Draft kept.`);
    } finally {
      if(mounted.current)setIsReplyingId(null);
    }
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuthor.trim() || !newContent.trim()) return;

    setSubmittingReview(true);
    setActionError(null);

    const reviewPayload: Partial<ReviewItem> = {
      author: newAuthor.trim(),
      rating: newRating,
      content: newContent.trim(),
      topic: newTopic.trim() || 'Customer Experience',
      isOperationalIssue: newIsOperationalIssue,
      source: newSource || 'manual',
      relativeTime: null as any,
      date: null as any,
      sentiment: newRating >= 4 ? 'positive' : newRating === 3 ? 'neutral' : 'negative',
      replied: false,
    };

    try {
      const created = await createReviewApi({
        ...reviewPayload,
        companyId,
      });

      if(!mounted.current)return;
      if (!created || !created.id) {
        throw new Error('Server did not return a valid created review record');
      }

      // Add only the acknowledged saved record.
      setLocalReviews((prev) => [created,...prev.filter(review=>review.id!==created.id)]);
      onAddNewReview?.(created);

      setIsAddReviewModalOpen(false);
      setNewAuthor('');
      setNewContent('');
      setNewRating(5);
      setNewTopic('Customer Experience');
      setNewIsOperationalIssue(false);
      setActionSuccess(`✓ Review from "${created.author}" created & saved in MySQL (ID: ${created.id})!`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      if(!mounted.current)return;
      console.error('Failed to create review in MySQL:', err);
      // Keep form data available after failure.
      setActionError(`Failed to save review to MySQL: ${err?.message || 'Server error'}. Please try again.`);
    } finally {
      if(mounted.current)setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: string, authorName: string) => {
    try {
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        if (!window.confirm(`Delete review from "${authorName}"? This will permanently delete it from MySQL.`)) {
          return;
        }
      }
    } catch {
      setActionError('Deletion confirmation unavailable. No record was deleted.');return;
    }

    setIsDeletingId(reviewId);
    setActionError(null);

    try {
      const ok = await deleteReviewApi(reviewId, companyId);
      if(!mounted.current)return;
      if (!ok) {
        throw new Error('Failed to delete review on server');
      }
      setLocalReviews(prev=>prev.filter(review=>review.id!==reviewId));
      setActionSuccess('✓ Review deleted from MySQL database successfully.');
      setTimeout(() => setActionSuccess(null), 3000);
      onDeleteReview?.(reviewId);
    } catch (err: any) {
      if(!mounted.current)return;
      console.error('Failed to delete review from MySQL:', err);
      // Keep form data available after failure.
      setActionError(`Failed to delete review from MySQL: ${err?.message || 'Server error'}. Existing record kept.`);
    } finally {
      if(mounted.current)setIsDeletingId(null);
    }
  };

  const filteredReviews = localReviews.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'unanswered') return !r.replied;
    if (filter === 'negative') return r.rating!==null && r.rating>=1 && r.rating <= 3;
    if (filter === 'positive') return r.rating >= 4;
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Action Error Banner */}
      {actionError && (
        <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-500 hover:text-rose-800 p-1 rounded-lg hover:bg-rose-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Action Success Toast Banner */}
      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-500 hover:text-emerald-800 p-1 rounded-lg hover:bg-emerald-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Star className="w-7 h-7 text-amber-500 fill-amber-500" />
              Review Management & AI Reply Engine
            </h1>
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
              <Database className="w-3 h-3 text-emerald-600" />
              Loaded Review Records
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Centralized multi-platform inbox with sentiment classification, AI reply drafts for human review & QR generator.
          </p>
        </div>

        {/* View Toggle & Add Review in Bento Capsule */}
        <div className="flex items-center gap-2">
          {onRefreshReviews && (
            <button
              onClick={onRefreshReviews}
              title="Refresh from MySQL"
              className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-2xl border border-slate-200 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => setIsAddReviewModalOpen(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Review</span>
          </button>

          <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs text-xs">
            <button
              onClick={() => setActiveTab('inbox')}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                activeTab === 'inbox' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Review Inbox ({localReviews.length})
            </button>
            <button
              onClick={() => setActiveTab('collection')}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                activeTab === 'collection' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Collection QR & Links
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'collection' ? (
        /* REVIEW COLLECTION ENGINE BENTO */
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* QR Code preview Bento Tile */}
              <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <div className="w-48 h-48 bg-white p-3 rounded-2xl shadow-xs border border-slate-200 flex items-center justify-center mb-4">
                  {qr?<img src={qr.image} alt="Google review collection QR" className="w-40 h-40"/>:<p role="status" className="text-xs">{qrError|| (reviewLink?'Generating review QR…':'Configure a valid Google review link to create a QR.')}</p>}
                </div>
                <div className="font-black text-slate-900 text-sm">{business.name}</div>
                <p className="text-xs text-slate-500 mt-0.5">Scan to leave a Google Review</p>
                <div className="flex gap-2 mt-4">
                  <button
                    disabled={!qr} onClick={() => setIsStandeeModalOpen(true)}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" /> Tabletop Stand PDF
                  </button>
                  <button
                    disabled={!qr} onClick={handleDownloadSvg}
                    className="bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl border border-slate-200 transition"
                  >
                    Sticker SVG
                  </button>
                </div>
              </div>

              {/* Multi-channel outreach */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-base">Direct Customer Outreach Channels</h3>
                <p className="text-xs text-slate-500">
                  Prepare review links and request text to customers right after a completed service.
                </p>

                {/* Direct Link */}
                <div className="space-y-1.5 text-xs">
                  <label className="text-slate-600 font-bold uppercase tracking-wider text-[11px]">Direct Google Review Shortlink</label>
                  {reviewLink ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={reviewLink}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-mono text-[11px]"
                      />
                      <button
                        onClick={() => {
                          if(!navigator.clipboard){setActionError('Clipboard unavailable. Select and copy the link manually.');return;}
                          void navigator.clipboard.writeText(reviewLink).then(()=>{setCopiedLink(true);setTimeout(()=>setCopiedLink(false),2000);}).catch(()=>setActionError('Copy failed. Select and copy the link manually.'));
                        }}
                        className="bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl border border-slate-200 flex items-center gap-1.5 font-bold shadow-2xs"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800">
                      Configure a valid Google review URL or Place ID in Integrations. This does not verify provider authorization.
                    </div>
                  )}
                </div>

                {/* WhatsApp Request Template */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-900 font-bold">
                    <span>WhatsApp Review Request Template</span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">Editable template</span>
                  </div>
                  <p className="text-slate-600 italic bg-white p-3 rounded-xl border border-slate-200 text-[11px] leading-relaxed shadow-2xs">
                    "Hi [Customer Name]! 😊 Thank you for choosing {business.name || 'our business'}. Your satisfaction is our priority. If you have 20 seconds, please share your experience on Google Maps{reviewLink ? ` here: ${reviewLink}` : ''} — Team {business.name || 'our business'}"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* REVIEWS INBOX */
        <div className="space-y-4">
          {/* Controls Bar in Bento Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Tone Selector */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-bold">AI Reply Tone:</span>
              {(['Friendly', 'Professional', 'Short', 'Hinglish'] as const).map((tone) => (
                <button
                  key={tone}
                  onClick={() => setSelectedTone(tone)}
                  className={`px-3 py-1 rounded-xl font-bold transition ${
                    selectedTone === tone
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 text-xs">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-xl font-bold transition ${
                  filter === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200'
                }`}
              >
                All ({reviews.length})
              </button>
              <button
                onClick={() => setFilter('unanswered')}
                className={`px-3 py-1 rounded-xl font-bold transition ${
                  filter === 'unanswered' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200'
                }`}
              >
                Unanswered ({reviews.filter((r) => !r.replied).length})
              </button>
              <button
                onClick={() => setFilter('negative')}
                className={`px-3 py-1 rounded-xl font-bold transition ${
                  filter === 'negative' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200'
                }`}
              >
                ≤ 3 Stars ({reviews.filter((r) => r.rating!==null && r.rating>=1 && r.rating <= 3).length})
              </button>
            </div>
          </div>

          {/* Review items */}
          <div className="space-y-4">
            {filteredReviews.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                  <Star className="w-6 h-6" />
                </div>
                <div className="font-bold text-slate-900 text-sm">No Reviews Found</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {reviews.length === 0
                    ? 'No reviews logged yet. Share your Google review QR Standee with customers to collect honest customer reviews.'
                    : 'No reviews match the current filter selection.'}
                </p>
                {reviews.length === 0 && (
                  <button
                    disabled={!qr} onClick={() => setIsStandeeModalOpen(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-xs inline-flex items-center gap-2"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Review QR Standee
                  </button>
                )}
              </div>
            ) : (
              filteredReviews.map((review) => {
              const draft = draftReplies[review.id];
              const isGenerating = generatingForId === review.id;

              return (
                <div
                  key={review.id}
                  className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3 hover:shadow-md transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-xs">
                        {review.author[0]}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900">{review.author}</div>
                        <div className="text-[11px] text-slate-500">{review.relativeTime} • via Google Maps</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center text-amber-500 text-xs font-bold bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                        {review.rating===null?'Unrated':'★'.repeat(review.rating)}
                        {review.rating!==null&&'☆'.repeat(5 - review.rating)}
                        <span className="ml-1 text-slate-700">{review.rating===null?'Unavailable':`${review.rating}.0`}</span>
                      </div>
                      {review.isOperationalIssue && (
                        <span className="flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3 text-rose-600" /> Operational Issue
                        </span>
                      )}
                      <span className="text-[11px] text-slate-600 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-200 font-medium">
                        Topic: {review.topic}
                      </span>
                      <button
                        onClick={() => handleDeleteReview(review.id, review.author)}
                        disabled={isDeletingId === review.id}
                        title="Delete Review from MySQL"
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition ml-1 disabled:opacity-50"
                      >
                        <Trash2 className={`w-3.5 h-3.5 ${isDeletingId === review.id ? 'animate-pulse text-rose-500' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Review text */}
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200 italic">
                    "{review.content}"
                  </p>

                  {/* Existing reply or draft */}
                  {review.replied ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs space-y-1">
                      <div className="flex items-center justify-between text-emerald-800 font-bold text-[11px]">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Saved Reply Record
                        </span>
                        <span className="text-slate-500 font-normal">{review.replyDate}</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{review.replyText}</p>
                    </div>
                  ) : draft !== undefined ? (
                    <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          Reply Response ({selectedTone}) • MySQL Persistent
                        </span>
                        <button
                          onClick={() => handleGenerateReply(review)}
                          className="text-[11px] text-indigo-600 hover:text-indigo-700 font-bold"
                        >
                          Generate with AI
                        </button>
                      </div>
                      <textarea
                        rows={3}
                        value={draft}
                        placeholder="Type or edit your response to this review..."
                        onChange={(e) =>
                          setDraftReplies((prev) => ({ ...prev, [review.id]: e.target.value }))
                        }
                        className="w-full bg-white border border-indigo-200 rounded-xl p-3 text-xs text-slate-800 leading-relaxed focus:outline-none focus:border-indigo-500 shadow-2xs"
                      />
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
                          Auto-formatted: Polite, professional, and compliant.
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const copy = { ...draftReplies };
                              delete copy[review.id];
                              setDraftReplies(copy);
                            }}
                            className="text-xs text-slate-600 hover:text-slate-900 px-3 py-1 font-medium"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handlePublishReply(review.id)}
                            disabled={isReplyingId === review.id || !draft.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition shadow-xs disabled:opacity-50"
                          >
                            <Send className="w-3 h-3" />
                            {isReplyingId === review.id ? 'Saving...' : 'Save Reply Record'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-amber-700 font-semibold flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Pending response (&gt;48 hrs)
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDraftReplies((prev) => ({ ...prev, [review.id]: '' }))}
                          className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 font-bold text-xs rounded-xl transition"
                        >
                          Write Reply
                        </button>
                        <button
                          onClick={() => handleGenerateReply(review)}
                          disabled={isGenerating}
                          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{isGenerating ? 'Drafting...' : 'Generate AI Reply'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            }))}
          </div>
        </div>
      )}

      {/* Printable Tabletop Standee Modal */}
      {isStandeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-indigo-400" />
                <span className="font-bold text-sm">Tabletop Standee Preview</span>
              </div>
              <button
                onClick={() => setIsStandeeModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Standee Visual Card Ready to Print */}
            <div className="p-6 bg-slate-50 flex flex-col items-center text-center space-y-4">
              <div className="bg-white border-2 border-indigo-600 rounded-3xl p-6 shadow-md w-full max-w-xs space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-xs">
                  ★
                </div>
                <div>
                  <h4 className="font-black text-base text-slate-900 leading-tight">{business.name || 'Business'}</h4>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{business.category || 'Professional Services'}</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col items-center">
                  <div className="w-32 h-32 bg-slate-900 p-2 rounded-xl flex items-center justify-center shadow-inner">
                    {qr && <img src={qr.image} alt="Printable Google review QR" className="w-full h-full"/>}
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 mt-2">Scan with Camera or Tap NFC</span>
                </div>

                <div className="text-[10px] text-slate-400 font-semibold">
                  Thank you for your business! Please share your feedback on Google Maps.
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsStandeeModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                disabled={!qr} onClick={() => {if(qr)try{printReviewCard(qr.image,business.name||'Business');}catch{setActionError('Printing unavailable. Download the QR instead.');}}}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" /> Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Review Modal (Direct MySQL Persistence) */}
      {isAddReviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                <span className="font-bold text-sm">Log Customer Review to MySQL</span>
              </div>
              <button
                onClick={() => setIsAddReviewModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleCreateReview}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Customer / Reviewer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikramaditya Sharma"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Star Rating (1 - 5)</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setNewRating(star)}
                        className={`text-lg transition ${star <= newRating ? 'text-amber-500' : 'text-slate-200'}`}
                      >
                        ★
                      </button>
                    ))}
                    <span className="ml-2 font-bold text-slate-700 text-xs">{newRating}.0 Stars</span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Channel Source</label>
                  <select
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="google">Google Maps (GMB)</option>
                    <option value="justdial">JustDial / IndiaMART</option>
                    <option value="manual">Direct Customer Feedback</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Feedback Topic Category</label>
                <input
                  type="text"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="e.g. Turnaround Time, Screen Replacement, Staff Behavior"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Review Content / Message *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Write customer review text..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-indigo-500 font-medium leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  id="opIssue"
                  checked={newIsOperationalIssue}
                  onChange={(e) => setNewIsOperationalIssue(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <label htmlFor="opIssue" className="text-slate-700 font-medium cursor-pointer">
                  Flag as Operational Issue (Requires Manager Escalation)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddReviewModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>{submittingReview ? 'Saving to MySQL...' : 'Save to MySQL Database'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
