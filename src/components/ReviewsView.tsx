import React, { useState, useEffect } from 'react';
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
  const [newSource, setNewSource] = useState<'google' | 'justdial' | 'direct'>('google');
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleDownloadSvg = () => {
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <rect width="400" height="400" rx="32" fill="#0f172a" />
  <circle cx="200" cy="70" r="28" fill="#4f46e5" />
  <text x="200" y="78" font-family="system-ui, sans-serif" font-size="24" fill="#ffffff" text-anchor="middle" font-weight="900">★</text>
  <text x="200" y="130" font-family="system-ui, sans-serif" font-size="20" fill="#ffffff" text-anchor="middle" font-weight="bold">${business.name}</text>
  <text x="200" y="155" font-family="system-ui, sans-serif" font-size="13" fill="#94a3b8" text-anchor="middle">Scan with any phone camera to Review on Google</text>
  <rect x="110" y="180" width="180" height="180" rx="16" fill="#ffffff" />
  <rect x="130" y="200" width="40" height="40" fill="#4f46e5" />
  <rect x="230" y="200" width="40" height="40" fill="#4f46e5" />
  <rect x="130" y="300" width="40" height="40" fill="#4f46e5" />
  <rect x="190" y="260" width="20" height="20" fill="#0f172a" />
  <rect x="230" y="300" width="25" height="25" fill="#0f172a" />
</svg>`;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${business.name.toLowerCase().replace(/\s+/g, '-')}-google-review-sticker.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const reviewLink = `https://g.page/r/${business.id}/review`;

  const handleGenerateReply = async (review: ReviewItem) => {
    setGeneratingForId(review.id);
    const reply = await generateReviewReply({
      reviewText: review.content,
      rating: review.rating,
      reviewerName: review.author,
      tone: selectedTone,
      language: selectedTone === 'Hinglish' ? 'Hinglish' : 'English',
      businessName: business.name,
    });
    setDraftReplies((prev) => ({ ...prev, [review.id]: reply }));
    setGeneratingForId(null);
  };

  const handlePublishReply = async (reviewId: string) => {
    const text = draftReplies[reviewId];
    if (!text || !text.trim()) return;

    const trimmedText = text.trim();
    const previousReviews = [...localReviews];

    // Optimistic UI update: instantly reflect reply in local state
    setLocalReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? {
              ...r,
              replied: true,
              replyText: trimmedText,
              replyDate: 'Just now',
            }
          : r
      )
    );

    // Clear draft text
    const updatedDrafts = { ...draftReplies };
    delete updatedDrafts[reviewId];
    setDraftReplies(updatedDrafts);

    setIsReplyingId(reviewId);
    setActionError(null);

    try {
      const ok = await replyToReviewApi(reviewId, trimmedText, companyId);
      if (!ok) {
        throw new Error('Server returned an error when saving reply');
      }
      setActionSuccess('✓ Review reply published & saved to MySQL database!');
      setTimeout(() => setActionSuccess(null), 4000);
      onAddReply(reviewId, trimmedText);
    } catch (err: any) {
      console.error('Failed to save review reply to MySQL:', err);
      // Roll back local state change and restore draft
      setLocalReviews(previousReviews);
      setDraftReplies((prev) => ({ ...prev, [reviewId]: text }));
      setActionError(`Failed to save review reply to MySQL: ${err?.message || 'Network error'}. Changes rolled back.`);
    } finally {
      setIsReplyingId(null);
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
      source: newSource,
      relativeTime: 'Just now',
      date: new Date().toISOString().split('T')[0],
      sentiment: newRating >= 4 ? 'positive' : newRating === 3 ? 'neutral' : 'negative',
      replied: false,
    };

    const tempId = `temp_rev_${Date.now()}`;
    const optimisticReview: ReviewItem = {
      id: tempId,
      author: reviewPayload.author!,
      rating: reviewPayload.rating!,
      content: reviewPayload.content!,
      date: reviewPayload.date!,
      relativeTime: 'Just now',
      sentiment: reviewPayload.sentiment!,
      topic: reviewPayload.topic!,
      isOperationalIssue: reviewPayload.isOperationalIssue!,
      replied: false,
      source: reviewPayload.source!,
    };

    const previousReviews = [...localReviews];
    // Optimistic insert into UI
    setLocalReviews((prev) => [optimisticReview, ...prev]);

    try {
      const created = await createReviewApi({
        ...reviewPayload,
        companyId,
      });

      if (!created || !created.id) {
        throw new Error('Server did not return a valid created review record');
      }

      // Replace optimistic review with server review with real MySQL ID
      setLocalReviews((prev) => prev.map((r) => (r.id === tempId ? created : r)));
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
      console.error('Failed to create review in MySQL:', err);
      // Roll back
      setLocalReviews(previousReviews);
      setActionError(`Failed to save review to MySQL: ${err?.message || 'Server error'}. Please try again.`);
    } finally {
      setSubmittingReview(false);
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
      // In restricted iframe environments, proceed safely
    }

    const previousReviews = [...localReviews];
    // Optimistic delete
    setLocalReviews((prev) => prev.filter((r) => r.id !== reviewId));
    setIsDeletingId(reviewId);
    setActionError(null);

    try {
      const ok = await deleteReviewApi(reviewId, companyId);
      if (!ok) {
        throw new Error('Failed to delete review on server');
      }
      setActionSuccess('✓ Review deleted from MySQL database successfully.');
      setTimeout(() => setActionSuccess(null), 3000);
      onDeleteReview?.(reviewId);
    } catch (err: any) {
      console.error('Failed to delete review from MySQL:', err);
      // Roll back
      setLocalReviews(previousReviews);
      setActionError(`Failed to delete review from MySQL: ${err?.message || 'Server error'}. Review restored.`);
    } finally {
      setIsDeletingId(null);
    }
  };

  const filteredReviews = localReviews.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'unanswered') return !r.replied;
    if (filter === 'negative') return r.rating <= 3;
    if (filter === 'positive') return r.rating >= 4;
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Action Error Banner */}
      {actionError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-xs animate-in fade-in">
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
              MySQL Live Sync
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Centralized multi-platform inbox with sentiment classification, 1-click compliant AI responses & QR generator.
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
                  {/* Generated clean SVG QR Representation */}
                  <svg className="w-40 h-40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100" height="100" fill="white" />
                    {/* Corner 1 */}
                    <rect x="10" y="10" width="25" height="25" fill="#0f172a" />
                    <rect x="15" y="15" width="15" height="15" fill="white" />
                    <rect x="18" y="18" width="9" height="9" fill="#4f46e5" />
                    {/* Corner 2 */}
                    <rect x="65" y="10" width="25" height="25" fill="#0f172a" />
                    <rect x="70" y="15" width="15" height="15" fill="white" />
                    <rect x="73" y="18" width="9" height="9" fill="#4f46e5" />
                    {/* Corner 3 */}
                    <rect x="10" y="65" width="25" height="25" fill="#0f172a" />
                    <rect x="15" y="70" width="15" height="15" fill="white" />
                    <rect x="18" y="73" width="9" height="9" fill="#4f46e5" />
                    {/* Pattern blocks */}
                    <rect x="42" y="12" width="6" height="12" fill="#0f172a" />
                    <rect x="52" y="18" width="6" height="8" fill="#4f46e5" />
                    <rect x="40" y="40" width="20" height="20" fill="#0f172a" />
                    <rect x="45" y="45" width="10" height="10" fill="#4f46e5" />
                    <rect x="68" y="45" width="18" height="6" fill="#0f172a" />
                    <rect x="72" y="55" width="12" height="12" fill="#4f46e5" />
                    <rect x="12" y="45" width="15" height="6" fill="#0f172a" />
                    <rect x="45" y="75" width="12" height="12" fill="#0f172a" />
                    <rect x="65" y="78" width="20" height="8" fill="#4f46e5" />
                  </svg>
                </div>
                <div className="font-black text-slate-900 text-sm">{business.name}</div>
                <p className="text-xs text-slate-500 mt-0.5">Scan to leave a Google Review</p>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setIsStandeeModalOpen(true)}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" /> Tabletop Stand PDF
                  </button>
                  <button
                    onClick={handleDownloadSvg}
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
                  Send compliant, one-touch review requests to customers right after a completed service.
                </p>

                {/* Direct Link */}
                <div className="space-y-1.5 text-xs">
                  <label className="text-slate-600 font-bold uppercase tracking-wider text-[11px]">Direct Google Review Shortlink</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={reviewLink}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-mono text-[11px]"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(reviewLink);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl border border-slate-200 flex items-center gap-1.5 font-bold shadow-2xs"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* WhatsApp Request Template */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-900 font-bold">
                    <span>WhatsApp Review Request Template</span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">High Conversion</span>
                  </div>
                  <p className="text-slate-600 italic bg-white p-3 rounded-xl border border-slate-200 text-[11px] leading-relaxed shadow-2xs">
                    "Hi [Customer Name]! 😊 Thank you for visiting Apex Tech Care today for your laptop service. Your satisfaction is our #1 priority. If you have 20 seconds, please share your experience on Google Maps here: {reviewLink} - Team Apex Tech"
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
                ≤ 3 Stars ({reviews.filter((r) => r.rating <= 3).length})
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
                    ? 'No reviews logged yet. Share your Google review QR Standee with customers to collect authentic 5-star customer reviews.'
                    : 'No reviews match the current filter selection.'}
                </p>
                {reviews.length === 0 && (
                  <button
                    onClick={() => setIsStandeeModalOpen(true)}
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
                        {'★'.repeat(review.rating)}
                        {'☆'.repeat(5 - review.rating)}
                        <span className="ml-1 text-slate-700">{review.rating}.0</span>
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
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Published Public Reply
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
                            {isReplyingId === review.id ? 'Publishing...' : 'Approve & Publish'}
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
                  <h4 className="font-black text-base text-slate-900 leading-tight">{business.name}</h4>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Premier Laptop & IT Solutions</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col items-center">
                  <div className="w-32 h-32 bg-slate-900 p-2 rounded-xl flex items-center justify-center shadow-inner">
                    <svg viewBox="0 0 100 100" className="w-full h-full text-white fill-current">
                      <rect x="10" y="10" width="30" height="30" fill="#ffffff" />
                      <rect x="15" y="15" width="20" height="20" fill="#0f172a" />
                      <rect x="20" y="20" width="10" height="10" fill="#4f46e5" />
                      <rect x="60" y="10" width="30" height="30" fill="#ffffff" />
                      <rect x="65" y="15" width="20" height="20" fill="#0f172a" />
                      <rect x="70" y="20" width="10" height="10" fill="#4f46e5" />
                      <rect x="10" y="60" width="30" height="30" fill="#ffffff" />
                      <rect x="15" y="65" width="20" height="20" fill="#0f172a" />
                      <rect x="20" y="70" width="10" height="10" fill="#4f46e5" />
                      <rect x="48" y="12" width="6" height="25" fill="#4f46e5" />
                      <rect x="42" y="42" width="16" height="16" fill="#ffffff" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 mt-2">Scan with Camera or Tap NFC</span>
                </div>

                <div className="text-[10px] text-slate-400 font-semibold">
                  Loved our fast service? Help our Navi Mumbai team with a 5★ review!
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
                onClick={() => window.print()}
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
                    <option value="direct">Direct Customer Feedback</option>
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
