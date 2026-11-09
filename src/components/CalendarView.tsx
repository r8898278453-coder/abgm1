import {nextMonthPlanDates,createContentDraftPlan,type PlanResult} from '../../shared/contentPlan';
import {generateMarketingContent} from '../services/aiService';
import React, { useState, useEffect,useRef } from 'react';
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
import { ContentPost,BusinessProfile } from '../types';
import {
  createContentPostApi,
  updatePostStatusApi,
  deleteContentPostApi,
  publishContentPostApi,
} from '../services/authService';

interface CalendarViewProps {
  posts: ContentPost[];
  business:BusinessProfile;
  companyId?: string;
  onNavigate: (tab: any) => void;
  onUpdatePostStatus?: (postId: string) => void;
  onDeletePost?: (postId: string) => void;
  onAddNewPost?: (post: ContentPost) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  posts,business,
  companyId,
  onNavigate,
  onUpdatePostStatus,
  onDeletePost,
  onAddNewPost,
}) => {
  const mounted=useRef(true),planRequest=useRef<AbortController|null>(null);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;planRequest.current?.abort();};},[]);
  const [planResults,setPlanResults]=useState<PlanResult[]>([]);
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

  const handlePublishPost = async (postId: string) => {
    const previousPostsVersion=localPosts.find(p=>p.id===postId)?.sourceVersion;
    if(!previousPostsVersion){setActionError('Reload the stored post before publishing.');return;}
    const previous = [...localPosts];
    // Optimistic UI state: set to publishing while state machine executes
    setLocalPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, status: 'publishing' as const } : p))
    );
    setIsPublishingId(postId);
    setActionError(null);

    try {
      const resp = await publishContentPostApi(postId, companyId,undefined,previousPostsVersion);
      if (resp.success && resp.result?.overallStatus === 'PUBLISHED') {
        setLocalPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, status: 'published' as const } : p))
        );
        setPlanSuccessToast(`✓ ${resp.result?.message || 'Post published and verified by provider.'}`);
        setTimeout(() => setPlanSuccessToast(null), 4000);
        onUpdatePostStatus?.(postId);
      } else if (resp.result?.overallStatus === 'UNKNOWN') {
        setLocalPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, status: 'unknown' as const } : p))
        );
        setActionError(`⚠️ Provider state unknown: ${resp.result?.message || 'Network timeout while publishing'}`);
      } else {
        const errorMsg = resp.result?.message || resp.error || 'Provider rejected publishing request';
        if(resp.result)setLocalPosts((prev)=>prev.map(p=>p.id===postId?{...p,status:(resp.result.finalPostStatus || 'failed') as ContentPost['status']}:p));
        else setLocalPosts(previous);
        setActionError(`Failed to publish post: ${errorMsg}`);
      }
    } catch (err: any) {
      if(!mounted.current)return;
      console.error('Failed to execute publishing job:', err);
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
    } catch {setActionError('Deletion confirmation unavailable. No post was deleted.');return;}

    setIsDeletingId(postId);
    setActionError(null);

    try {
      const ok = await deleteContentPostApi(postId, companyId);
      if(!mounted.current)return;
      if (!ok) throw new Error('Delete failed or retained publishing history; reload stored posts');
      setLocalPosts(previous=>previous.filter(post=>post.id!==postId));
      setPlanSuccessToast('✓ Post deleted from MySQL database.');
      setTimeout(() => setPlanSuccessToast(null), 3000);
      onDeletePost?.(postId);
    } catch (err: any) {
      if(!mounted.current)return;
      console.error('Failed to delete post in MySQL:', err);
      setActionError(`Failed to delete post: ${err?.message || 'Server error'}. Post restored.`);
    } finally {
      if(mounted.current)setIsDeletingId(null);
    }
  };

  const handlePlanNextMonth=async()=>{
    if(!companyId||isPlanning)return;
    const controller=new AbortController();planRequest.current=controller;setIsPlanning(true);setActionError(null);setPlanResults([]);
    const platform=selectedPlatform==='all'?'google':selectedPlatform;
    const dates=nextMonthPlanDates();
    try{
      const results=await createContentDraftPlan({dates,signal:controller.signal,
       generate:async(date,index)=>generateMarketingContent({companyId,businessName:business.name,category:business.category,city:business.city,website:business.website,contentType:'educational',platform,offer:`Draft ${index+1} for ${date}: explain an existing service or answer a customer question. Use only supplied business facts. Do not invent discounts, promises, warranties, testimonials or events.`,brandTone:business.brandKit?.brandTone,language:business.brandKit?.preferredLanguage},controller.signal),
       save:async(content,date)=>{
        const created=await createContentPostApi({companyId,title:(content.headline||'Educational draft').slice(0,255),type:'educational',platforms:[platform],caption:content.caption,headline:content.headline,cta:content.callToAction,hashtags:content.hashtags,reelScript:content.reelScript,status:'draft',scheduledDate:date,timeSlot:'11:00 AM'});
        if(!created)return false;
        if(mounted.current&&!controller.signal.aborted){setLocalPosts(prev=>[created,...prev.filter(post=>post.id!==created.id)]);onAddNewPost?.(created);}
        return true;
       }});
      if(!mounted.current)return;setPlanResults(results);
      const saved=results.filter(result=>result.status==='saved').length;setPlanSuccessToast(`${saved} of ${dates.length} AI drafts saved for review. No posts were scheduled or published.`);
      if(results.some(result=>result.status==='save_unconfirmed'))setActionError('A save was unconfirmed; later items were not started. Refresh stored posts before creating another plan.');
      else if(results.some(result=>result.status==='generation_failed'))setActionError('Some drafts could not be generated. Check individual results; saved drafts remain available.');
    }catch{if(mounted.current)setActionError('Draft planning unavailable. Refresh stored posts before retrying.');}
    finally{if(mounted.current)setIsPlanning(false);}
  };

  const filteredPosts = localPosts.filter((post) => {
    if (selectedPlatform === 'all') return true;
    return post.platforms?.some((p) => p.toLowerCase().includes(selectedPlatform));
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
              Loaded Post Records
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Review stored posts and create AI drafts using this client’s business context.
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
            disabled={isPlanning||!companyId||planResults.some(result=>result.status==='save_unconfirmed')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs w-fit disabled:opacity-50"
          >
            {isPlanning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>{isPlanning ? 'Saving to MySQL...' : 'Create 3 AI Drafts for Next Month'}</span>
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
                          : post.status === 'publishing'
                          ? 'bg-amber-100 text-amber-800 animate-pulse'
                          : post.status === 'failed'
                          ? 'bg-rose-100 text-rose-800'
                          : post.status === 'unknown'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {post.status}
                    </span>
                    <button
                      onClick={() => handleDeletePost(post.id, post.title)}
                      disabled={isDeletingId === post.id}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition ml-0.5 disabled:opacity-50"
                      title="Delete Post from MySQL" aria-label={`Delete stored post ${post.id}`}
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
                    {post.status !== 'published' && post.status !== 'publishing' && (
                      <button
                        onClick={() => handlePublishPost(post.id)}
                        disabled={isPublishingId === post.id}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-2xs flex items-center gap-1 disabled:opacity-50"
                      >
                        <Check className="w-3 h-3" />
                        <span>{isPublishingId === post.id ? 'Publishing...' : post.status === 'failed' || post.status === 'unknown' ? 'Retry Publish' : 'Publish Now'}</span>
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

      <section aria-label="Draft plan results" className="bg-white border border-slate-200 rounded-3xl p-6 space-y-3">
       <h2 className="font-bold">Next-month draft plan</h2><p className="text-sm text-slate-500">Creates up to three AI drafts for the 1st, 8th and 15th of next month (IST). Review business facts, dates and approvals before scheduling. Saved drafts are not provider delivery.</p>
       {planResults.length===0?<p>No plan created in this session.</p>:<ul>{planResults.map(result=><li key={result.date}>{result.date} IST — {result.status.replaceAll('_',' ')}</li>)}</ul>}
      </section>

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
