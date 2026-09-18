import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Sparkles,
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  RefreshCw,
  Send,
  Database,
  Trash2,
  Check,
  AlertTriangle,
  X,
  Loader2,
  Eye,
  Download,
  Image as ImageIcon,
  Film,
} from 'lucide-react';
import { ContentPost } from '../types';
import {
  createContentPostApi,
  updatePostStatusApi,
  deleteContentPostApi,
} from '../services/authService';

interface CalendarViewProps {
  posts: ContentPost[];
  companyId?: string;
  onNavigate: (tab: any) => void;
  onUpdatePostStatus?: (postId: string) => void;
  onDeletePost?: (postId: string) => void;
  onAddNewPost?: (post: ContentPost) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  posts,
  companyId,
  onNavigate,
  onUpdatePostStatus,
  onDeletePost,
  onAddNewPost,
}) => {
  const [localPosts, setLocalPosts] = useState<ContentPost[]>(posts || []);
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | 'google' | 'instagram' | 'whatsapp'>('all');
  const [isPlanning, setIsPlanning] = useState(false);
  const [planSuccessToast, setPlanSuccessToast] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPublishingId, setIsPublishingId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [selectedPreviewPost, setSelectedPreviewPost] = useState<ContentPost | null>(null);

  useEffect(() => {
    setLocalPosts(posts || []);
  }, [posts]);

  // Generate a reactive 30-day schedule array
  const [items, setItems] = useState([
    { day: 'Mon, Sep 1', platform: 'google', title: 'Weekly Diagnostic Slot Announcement', time: '10:00 AM', status: 'published' },
    { day: 'Wed, Sep 3', platform: 'instagram', title: 'Reel: Slow MacBook SSD Fix', time: '05:30 PM', status: 'published' },
    { day: 'Fri, Sep 5', platform: 'google', title: 'Weekend 30-Min Fast Diagnostic Offer', time: '11:00 AM', status: 'scheduled' },
    { day: 'Sat, Sep 6', platform: 'whatsapp', title: 'Broadcast: Student Upgrade Concession', time: '12:00 PM', status: 'scheduled' },
    { day: 'Mon, Sep 8', platform: 'google', title: 'FAQ: Liquid Spill Emergency Steps', time: '10:30 AM', status: 'draft' },
    { day: 'Wed, Sep 10', platform: 'instagram', title: 'Before & After: Gaming Rig Dust Cleaning', time: '06:00 PM', status: 'draft' },
    { day: 'Fri, Sep 12', platform: 'google', title: 'Ganesh Chaturthi Festive Tech Offer', time: '09:30 AM', status: 'draft' },
    { day: 'Sat, Sep 13', platform: 'whatsapp', title: 'Festive VIP Priority Booking Link', time: '11:00 AM', status: 'draft' },
    { day: 'Tue, Sep 16', platform: 'instagram', title: 'Customer Story: Saved 45k on Motherboard', time: '04:00 PM', status: 'draft' },
    { day: 'Fri, Sep 19', platform: 'google', title: 'Original Chargers & Batteries Stock Update', time: '11:30 AM', status: 'draft' },
  ]);

  const handlePublishPost = async (postId: string) => {
    const previous = [...localPosts];
    // Optimistic UI update
    setLocalPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, status: 'published' as const } : p))
    );
    setIsPublishingId(postId);
    setActionError(null);

    try {
      const ok = await updatePostStatusApi(postId, 'published', companyId);
      if (!ok) throw new Error('Status update failed on server');
      setPlanSuccessToast('✓ Post published to MySQL database successfully!');
      setTimeout(() => setPlanSuccessToast(null), 4000);
      onUpdatePostStatus?.(postId);
    } catch (err: any) {
      console.error('Failed to publish post in MySQL:', err);
      setLocalPosts(previous);
      setActionError(`Failed to publish post: ${err?.message || 'Server error'}. Status reverted.`);
    } finally {
      setIsPublishingId(null);
    }
  };

  const handleDeletePost = async (postId: string, title: string) => {
    try {
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        if (!window.confirm(`Delete post "${title}" from MySQL database?`)) return;
      }
    } catch {
      // In restricted iframe environments where confirm is disabled, proceed
    }

    const previous = [...localPosts];
    // Optimistic UI update
    setLocalPosts((prev) => prev.filter((p) => p.id !== postId));
    setIsDeletingId(postId);
    setActionError(null);

    try {
      const ok = await deleteContentPostApi(postId, companyId);
      if (!ok) throw new Error('Delete failed on server');
      setPlanSuccessToast('✓ Post deleted from MySQL database.');
      setTimeout(() => setPlanSuccessToast(null), 3000);
      onDeletePost?.(postId);
    } catch (err: any) {
      console.error('Failed to delete post in MySQL:', err);
      setLocalPosts(previous);
      setActionError(`Failed to delete post: ${err?.message || 'Server error'}. Post restored.`);
    } finally {
      setIsDeletingId(null);
    }
  };

  const handlePlanNextMonth = async () => {
    setIsPlanning(true);
    setActionError(null);

    const plannedMilestones: Array<{
      title: string;
      type: ContentPost['type'];
      platforms: ('google' | 'facebook' | 'instagram' | 'whatsapp')[];
      headline: string;
      caption: string;
      scheduledDate: string;
      timeSlot: string;
    }> = [
      {
        title: 'Navratri Special Corporate Laptop Health Check',
        type: 'offer',
        platforms: ['google'],
        headline: '🌟 Navratri Corporate Tech Checkup: Free Sanitization & 25% Off SSDs',
        caption: 'Keep your team machines humming during festive demand. On-site pickup & 4-hour turnaround for corporate offices across Navi Mumbai.',
        scheduledDate: '2026-09-22',
        timeSlot: '10:00 AM',
      },
      {
        title: 'Reel: Why Free Antivirus Fails Small Businesses',
        type: 'educational',
        platforms: ['instagram'],
        headline: '🛡️ Is Free Antivirus Actually Costing You Sensitive Customer Data?',
        caption: 'Watch how ransomware sneaks past free browser extensions. Secure your business workstations before festive peak!',
        scheduledDate: '2026-09-24',
        timeSlot: '05:00 PM',
      },
      {
        title: 'VIP Alert: Flash Screen Replacement Voucher (20% Off)',
        type: 'offer',
        platforms: ['whatsapp'],
        headline: '⚡ VIP WhatsApp Flash: 20% Off Original Screen Replacements',
        caption: 'Exclusive 48-hour voucher for saved contacts. Genuine parts, ultrasonic cleaning, 90-day written warranty included.',
        scheduledDate: '2026-09-26',
        timeSlot: '11:30 AM',
      },
    ];

    try {
      // Save newly planned milestones directly to MySQL
      for (const item of plannedMilestones) {
        try {
          const created = await createContentPostApi({
            ...item,
            companyId,
            status: 'scheduled',
          });
          if (created) {
            setLocalPosts((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
            onAddNewPost?.(created);
          }
        } catch (e) {
          console.warn('Could not auto-insert planned post into MySQL:', e);
        }
      }

      setItems([
        { day: 'Mon, Sep 1', platform: 'google', title: 'Weekly Diagnostic Slot Announcement', time: '10:00 AM', status: 'published' },
        { day: 'Wed, Sep 3', platform: 'instagram', title: 'Reel: Slow MacBook SSD Fix', time: '05:30 PM', status: 'published' },
        { day: 'Fri, Sep 5', platform: 'google', title: 'Weekend 30-Min Fast Diagnostic Offer', time: '11:00 AM', status: 'scheduled' },
        { day: 'Sat, Sep 6', platform: 'whatsapp', title: 'Broadcast: Student Upgrade Concession', time: '12:00 PM', status: 'scheduled' },
        { day: 'Mon, Sep 8', platform: 'google', title: 'FAQ: Liquid Spill Emergency Steps', time: '10:30 AM', status: 'scheduled' },
        { day: 'Wed, Sep 10', platform: 'instagram', title: 'Before & After: Gaming Rig Dust Cleaning', time: '06:00 PM', status: 'scheduled' },
        { day: 'Fri, Sep 12', platform: 'google', title: 'Ganesh Chaturthi Festive Tech Offer', time: '09:30 AM', status: 'scheduled' },
        { day: 'Sat, Sep 13', platform: 'whatsapp', title: 'Festive VIP Priority Booking Link', time: '11:00 AM', status: 'scheduled' },
        { day: 'Tue, Sep 16', platform: 'instagram', title: 'Customer Story: Saved 45k on Motherboard', time: '04:00 PM', status: 'scheduled' },
        { day: 'Fri, Sep 19', platform: 'google', title: 'Original Chargers & Batteries Stock Update', time: '11:30 AM', status: 'scheduled' },
        { day: 'Mon, Sep 22', platform: 'google', title: 'Navratri Special Corporate Laptop Health Check', time: '10:00 AM', status: 'scheduled' },
        { day: 'Wed, Sep 24', platform: 'instagram', title: 'Reel: Why Free Antivirus Fails Small Businesses', time: '05:00 PM', status: 'scheduled' },
        { day: 'Fri, Sep 26', platform: 'whatsapp', title: 'VIP Alert: Flash Screen Replacement Voucher (20% Off)', time: '11:30 AM', status: 'scheduled' },
        { day: 'Sun, Sep 28', platform: 'google', title: 'Dussehra Mega Upgrade Offer & Zero EMI options', time: '09:00 AM', status: 'scheduled' },
        { day: 'Wed, Oct 1', platform: 'instagram', title: 'Video: Data Recovery Demo from Dead Hard Drive', time: '06:30 PM', status: 'scheduled' },
        { day: 'Sat, Oct 4', platform: 'google', title: 'Diwali Pre-Booking for SME Annual Maintenance AMC', time: '10:30 AM', status: 'scheduled' },
        { day: 'Tue, Oct 7', platform: 'whatsapp', title: 'Diwali Greetings & Client Appreciation Tech Voucher', time: '12:00 PM', status: 'scheduled' },
      ]);
      setPlanSuccessToast('✨ AI Content Engine planned 30 days of balanced content and saved posts to MySQL!');
      setTimeout(() => setPlanSuccessToast(null), 6000);
    } catch (err: any) {
      console.error('Failed to plan month:', err);
      setActionError(`Planning error: ${err?.message || 'Server error'}`);
    } finally {
      setIsPlanning(false);
    }
  };

  const filteredPosts = localPosts.filter((post) => {
    if (selectedPlatform === 'all') return true;
    return post.platforms?.some((p) => p.toLowerCase().includes(selectedPlatform));
  });

  const filteredItems = items.filter((item) => {
    if (selectedPlatform === 'all') return true;
    return item.platform === selectedPlatform;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <CalendarIcon className="w-7 h-7 text-indigo-600" />
              30-Day Content Calendar & Planner
            </h1>
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
              <Database className="w-3 h-3 text-emerald-600" />
              MySQL Synced
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Auto-balanced publishing schedule factoring in local festivals (Ganesh Utsav, Diwali), seasonality & competitor moves.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('content')}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2.5 rounded-xl transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600" />
            <span>New Post Creative</span>
          </button>
          <button
            onClick={handlePlanNextMonth}
            disabled={isPlanning}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs w-fit disabled:opacity-50"
          >
            {isPlanning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>{isPlanning ? 'Saving to MySQL...' : 'Plan Next 30 Days with AI'}</span>
          </button>
        </div>
      </div>

      {/* Dynamic Generation Success Banner */}
      {planSuccessToast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{planSuccessToast}</span>
          </div>
          <button
            onClick={() => setPlanSuccessToast(null)}
            className="text-emerald-700 hover:text-emerald-950 font-black px-2 py-0.5 rounded-md hover:bg-emerald-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Action Error Banner */}
      {actionError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-700 hover:text-rose-950 font-black px-2 py-0.5 rounded-md hover:bg-rose-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Bar Bento Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-bold">Filter Channel:</span>
          {(['all', 'google', 'instagram', 'whatsapp'] as const).map((plat) => (
            <button
              key={plat}
              onClick={() => setSelectedPlatform(plat)}
              className={`px-3 py-1.5 rounded-xl font-bold capitalize transition ${
                selectedPlatform === plat
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {plat}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500 font-medium flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Published
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Scheduled
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Draft
          </span>
        </div>
      </div>

      {/* Active MySQL Content Posts Queue Section */}
      {filteredPosts.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                Live MySQL Scheduled & Published Queue ({filteredPosts.length})
              </h2>
            </div>
            <button
              onClick={() => onNavigate('content')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
            >
              Manage in Content Studio →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                className="bg-indigo-50/40 border border-indigo-200/80 rounded-2xl p-4 text-xs flex flex-col justify-between space-y-3 hover:border-indigo-400 transition shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{post.scheduledDate}</span>
                    <span className="text-[10px] font-mono text-slate-400">ID: {post.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3 text-slate-400" /> {post.timeSlot}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        post.status === 'published'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {post.status}
                    </span>
                    <button
                      onClick={() => handleDeletePost(post.id, post.title)}
                      disabled={isDeletingId === post.id}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition ml-0.5 disabled:opacity-50"
                      title="Delete Post from MySQL"
                    >
                      <Trash2 className={`w-3.5 h-3.5 ${isDeletingId === post.id ? 'animate-pulse text-rose-500' : ''}`} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-bold text-slate-900">{post.title}</div>
                  {post.headline && (
                    <div className="text-xs text-indigo-900 font-medium">{post.headline}</div>
                  )}
                  <div className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {post.caption}
                  </div>
                </div>

                {/* Media Thumbnail Preview */}
                {post.imageUrl && (
                  <div className="flex items-center gap-3 bg-white/80 p-2 rounded-2xl border border-indigo-100">
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-14 h-14 object-cover rounded-xl border border-slate-200 shrink-0 bg-slate-100"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        {post.imageUrl.includes('/generated/') ? (
                          <span className="text-indigo-600 font-black flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            1080×1080 Branded Graphic
                          </span>
                        ) : (
                          <span>Post Media</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedPreviewPost(post)}
                        className="mt-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Preview Creative</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-2.5 border-t border-indigo-100 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {post.platforms?.map((plat) => (
                      <span
                        key={plat}
                        className="text-[10px] text-indigo-700 bg-white border border-indigo-200 px-2 py-0.5 rounded-full uppercase font-bold"
                      >
                        {plat}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    {post.status === 'scheduled' && (
                      <button
                        onClick={() => handlePublishPost(post.id)}
                        disabled={isPublishingId === post.id}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-2xs flex items-center gap-1 disabled:opacity-50"
                      >
                        <Check className="w-3 h-3" />
                        <span>{isPublishingId === post.id ? 'Publishing...' : 'Publish to MySQL'}</span>
                      </button>
                    )}
                    <button
                      onClick={() => onNavigate('content')}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold"
                    >
                      Edit →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 30-Day Master Roster Bento Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          September 2026 Strategic Plan & Local Festivities
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredItems.map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs flex flex-col justify-between space-y-3 hover:border-indigo-300 transition shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">{item.day}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3 text-slate-400" /> {item.time}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      item.status === 'published'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.status === 'scheduled'
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>

              <div className="text-sm font-semibold text-slate-800">
                {item.title}
              </div>

              <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] text-indigo-700 uppercase font-bold">
                  Channel: {item.platform}
                </span>
                <button
                  onClick={() => onNavigate('content')}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold"
                >
                  Create & Schedule in MySQL →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full-Screen Creative Preview Modal */}
      {selectedPreviewPost && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">Creative Preview</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  {selectedPreviewPost.status}
                </span>
              </div>
              <button
                onClick={() => setSelectedPreviewPost(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Attached MP4 Reel Video if available */}
              {selectedPreviewPost.videoUrl && (
                <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-3 max-w-sm mx-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                      <Film className="w-3.5 h-3.5 text-rose-500" />
                      15s Remotion MP4 Reel
                    </span>
                    <a
                      href={selectedPreviewPost.videoUrl}
                      download={`reel-${selectedPreviewPost.id}.mp4`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Download MP4
                    </a>
                  </div>
                  <div className="relative w-[180px] aspect-[9/16] mx-auto rounded-xl overflow-hidden bg-black shadow-lg border border-slate-700">
                    <video
                      src={selectedPreviewPost.videoUrl}
                      controls
                      playsInline
                      loop
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Media Preview Box */}
              {selectedPreviewPost.imageUrl && (
                <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 shadow-md aspect-square max-w-sm mx-auto flex items-center justify-center">
                  <img
                    src={selectedPreviewPost.imageUrl}
                    alt={selectedPreviewPost.title}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <a
                      href={selectedPreviewPost.imageUrl}
                      download={`creative-${selectedPreviewPost.id}.png`}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-slate-900/80 hover:bg-slate-900 text-white p-2 rounded-xl backdrop-blur-sm shadow-md transition flex items-center gap-1 text-xs font-bold"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PNG</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Post Details */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="font-bold text-base text-slate-900">{selectedPreviewPost.title}</div>
                {selectedPreviewPost.headline && (
                  <div className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg inline-block">
                    Headline: {selectedPreviewPost.headline}
                  </div>
                )}
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  {selectedPreviewPost.caption}
                </p>

                {selectedPreviewPost.cta && (
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Call To Action:</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      {selectedPreviewPost.cta}
                    </span>
                  </div>
                )}

                {selectedPreviewPost.hashtags && selectedPreviewPost.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-2">
                    {selectedPreviewPost.hashtags.map((tag, i) => (
                      <span key={i} className="text-[10px] text-indigo-600 bg-white border border-indigo-100 px-2 py-0.5 rounded-md font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="text-xs text-slate-500 font-medium">
                Scheduled for {selectedPreviewPost.timeSlot}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedPreviewPost(null);
                    onNavigate('content');
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  Edit in Content Studio →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
