import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  Video,
  Calendar,
  Share2,
  Copy,
  Check,
  Send,
  Wand2,
  Layers,
  Palette,
  Phone,
  Clock,
  Instagram,
  Facebook,
  Globe,
  CheckCircle2,
  Database,
  Trash2,
  ArrowRight,
  AlertTriangle,
  X,
  Loader2,
  Upload,
  Camera,
  Plus,
  RefreshCw,
  Eye,
  Download,
  Layout,
  ExternalLink,
  Film,
  Play,
} from 'lucide-react';
import { BusinessProfile, ContentPost, CompanyAsset, SocialTemplate } from '../types';
import { generateMarketingContent } from '../services/aiService';
import {
  createContentPostApi,
  updatePostStatusApi,
  deleteContentPostApi,
  uploadCompanyAssetApi,
  fetchCompanyAssetsApi,
  deleteCompanyAssetApi,
  fetchTemplatesApi,
  renderCreativeApi,
  startReelRenderApi,
  getReelRenderStatusApi,
  ReelRenderJobInfo,
} from '../services/authService';
import { TemplateSelector, FALLBACK_TEMPLATES } from './TemplateSelector';

interface ContentStudioViewProps {
  business: BusinessProfile;
  posts: ContentPost[];
  companyId?: string;
  onAddNewPost: (post: ContentPost) => void;
  onPublishPost?: (postId: string) => void;
  onDeletePost?: (postId: string) => void;
  onNavigate: (tab: any) => void;
  onUpdateBusiness?: (updated: BusinessProfile) => void;
}

export const ContentStudioView: React.FC<ContentStudioViewProps> = ({
  business,
  posts,
  companyId,
  onAddNewPost,
  onPublishPost,
  onDeletePost,
  onNavigate,
  onUpdateBusiness,
}) => {
  const [localPosts, setLocalPosts] = useState<ContentPost[]>(posts);
  const [contentType, setContentType] = useState<'offer' | 'festival' | 'service' | 'educational'>('offer');
  const [targetPlatform, setTargetPlatform] = useState<'google' | 'instagram' | 'whatsapp'>('google');
  const [language, setLanguage] = useState<
    'Hinglish' | 'English' | 'Hindi' | 'Marathi' | 'Gujarati' | 'Tamil' | 'Telugu' | 'Bengali' | 'Kannada' | 'Malayalam' | 'Punjabi'
  >('Hinglish');

  // Brand Kit Identity State
  const [primaryColor, setPrimaryColor] = useState(business.brandKit?.primaryColor || '#4f46e5');
  const [secondaryColor, setSecondaryColor] = useState(business.brandKit?.secondaryColor || '#06b6d4');
  const [brandTagline, setBrandTagline] = useState(business.brandKit?.tagline || '');
  const [brandTone, setBrandTone] = useState(business.brandKit?.brandTone || 'Professional');
  const [isSavingBrandKit, setIsSavingBrandKit] = useState(false);

  useEffect(() => {
    if (business.brandKit) {
      if (business.brandKit.primaryColor) setPrimaryColor(business.brandKit.primaryColor);
      if (business.brandKit.secondaryColor) setSecondaryColor(business.brandKit.secondaryColor);
      if (business.brandKit.tagline) setBrandTagline(business.brandKit.tagline);
      if (business.brandKit.brandTone) setBrandTone(business.brandKit.brandTone);
    }
  }, [business.brandKit]);
  const [customPrompt, setCustomPrompt] = useState(() => {
    if (business?.services && business.services.length > 0) {
      return `Special 20% Off on ${business.services[0]} - Limited Period`;
    }
    return `Special Promotion & Exclusive Offer for ${business.name || 'Our Valued Customers'}`;
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'copywriter' | 'creative' | 'reel' | 'posts' | 'assets'>('copywriter');
  const [scheduleSuccessToast, setScheduleSuccessToast] = useState<string | null>(null);
  const [postActionError, setPostActionError] = useState<string | null>(null);
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [isPublishingId, setIsPublishingId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [postFilter, setPostFilter] = useState<'all' | 'scheduled' | 'published'>('all');

  // Brand Media Asset Management State
  const effectiveCompanyId = companyId || business.id || 'comp_aaditech_main';
  const defaultStockFallback = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=600&q=80';
  const [assets, setAssets] = useState<CompanyAsset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);
  const [assetActionError, setAssetActionError] = useState<string | null>(null);
  const [assetSuccessMessage, setAssetSuccessMessage] = useState<string | null>(null);
  const [isDeletingAssetId, setIsDeletingAssetId] = useState<string | null>(null);

  // Real Branded Template Engine State (Satori + Resvg)
  const [templates, setTemplates] = useState<SocialTemplate[]>(FALLBACK_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('offer-bold-split');
  const [isRenderingCreative, setIsRenderingCreative] = useState(false);
  const [renderedTemplateName, setRenderedTemplateName] = useState<string>('Bold Dual Split');
  const [renderedPaletteName, setRenderedPaletteName] = useState<string>('Brand Core Identity');
  const [renderedPaletteColors, setRenderedPaletteColors] = useState<{
    primary: string;
    secondary: string;
    accent: string;
    text: string;
  } | null>(null);
  const [showManualTemplatePicker, setShowManualTemplatePicker] = useState<boolean>(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [previewPostModal, setPreviewPostModal] = useState<ContentPost | null>(null);

  // 15-Second Remotion Reel Video Rendering Engine State
  const [isRenderingReel, setIsRenderingReel] = useState(false);
  const [reelJob, setReelJob] = useState<ReelRenderJobInfo | null>(null);
  const [renderedReelUrl, setRenderedReelUrl] = useState<string | null>(null);
  const [reelRenderError, setReelRenderError] = useState<string | null>(null);
  const reelPollIntervalRef = React.useRef<any>(null);

  // Clean up reel poll interval on unmount
  useEffect(() => {
    return () => {
      if (reelPollIntervalRef.current) {
        clearInterval(reelPollIntervalRef.current);
      }
    };
  }, []);

  // Load server template definitions
  useEffect(() => {
    fetchTemplatesApi()
      .then((data) => {
        if (data && data.length > 0) {
          setTemplates(data);
        }
      })
      .catch((err) => console.warn('Failed to load server templates:', err));
  }, []);

  // Auto-sync template whenever contentType changes
  useEffect(() => {
    if (contentType === 'offer') setSelectedTemplateId('offer-bold-split');
    else if (contentType === 'festival') setSelectedTemplateId('festival-festive-burst');
    else if (contentType === 'service') setSelectedTemplateId('service-professional-split');
    else if (contentType === 'educational') setSelectedTemplateId('educational-bold-tips');
  }, [contentType]);

  const loadCompanyAssets = useCallback(async () => {
    if (!effectiveCompanyId) return;
    setIsLoadingAssets(true);
    try {
      const fetched = await fetchCompanyAssetsApi(effectiveCompanyId);
      setAssets(fetched);
    } catch (err: any) {
      console.warn('[loadCompanyAssets] Failed to load assets:', err?.message);
    } finally {
      setIsLoadingAssets(false);
    }
  }, [effectiveCompanyId]);

  useEffect(() => {
    loadCompanyAssets();
  }, [loadCompanyAssets]);

  const uploadedPhotos = assets.filter((a) => a.asset_type === 'photo');
  const uploadedLogo = assets.find((a) => a.asset_type === 'logo');
  const activeLogoUrl = uploadedLogo?.url || business.brandKit?.logoUrl || '/logo.png';

  // Automatically adopt the first real uploaded photo if current post is using stock fallback
  useEffect(() => {
    if (uploadedPhotos.length > 0) {
      setGeneratedPost((prev) => {
        if (!prev.imageUrl || prev.imageUrl === defaultStockFallback || prev.imageUrl.includes('unsplash.com')) {
          return { ...prev, imageUrl: uploadedPhotos[0].url };
        }
        return prev;
      });
    }
  }, [uploadedPhotos.length]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'logo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAssetActionError(null);
    setAssetSuccessMessage(null);

    // Client-side quick check
    if (file.size > 5 * 1024 * 1024) {
      setAssetActionError('File size exceeds 5MB limit. Please choose a smaller image.');
      e.target.value = '';
      return;
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.type)) {
      setAssetActionError('Invalid file format. Only JPEG, PNG, and WebP images are allowed.');
      e.target.value = '';
      return;
    }

    setIsUploadingAsset(true);
    try {
      const res = await uploadCompanyAssetApi(effectiveCompanyId, file, type, file.name);
      if (res?.asset) {
        setAssets((prev) => [res.asset, ...prev]);
        setAssetSuccessMessage(`${type === 'logo' ? 'Official Brand Logo' : 'Business photo'} uploaded successfully!`);
        if (type === 'photo') {
          setGeneratedPost((prev) => ({ ...prev, imageUrl: res.asset.url }));
        }
      }
    } catch (err: any) {
      setAssetActionError(err?.message || 'Failed to upload asset. Please try again.');
    } finally {
      setIsUploadingAsset(false);
      e.target.value = '';
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    try {
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        if (!window.confirm('Delete this asset from your brand media library?')) return;
      }
    } catch {
      // In restricted iframe environments, proceed safely
    }
    setIsDeletingAssetId(assetId);
    setAssetActionError(null);
    setAssetSuccessMessage(null);
    try {
      await deleteCompanyAssetApi(effectiveCompanyId, assetId);
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
      setAssetSuccessMessage('Asset deleted from library.');
      setGeneratedPost((prev) => {
        const deletedAsset = assets.find((a) => a.id === assetId);
        if (deletedAsset && prev.imageUrl === deletedAsset.url) {
          const remainingPhotos = uploadedPhotos.filter((p) => p.id !== assetId);
          return {
            ...prev,
            imageUrl: remainingPhotos.length > 0 ? remainingPhotos[0].url : defaultStockFallback,
          };
        }
        return prev;
      });
    } catch (err: any) {
      setAssetActionError(err?.message || 'Failed to delete asset.');
    } finally {
      setIsDeletingAssetId(null);
    }
  };

  // Sync with incoming props from parent
  useEffect(() => {
    setLocalPosts(posts);
  }, [posts]);

  // Sync with business changes to ensure per-tenant personalization
  useEffect(() => {
    if (business?.name) {
      const bizName = business.name || 'Our Store';
      const bizCategory = business.category || 'Services';
      const bizLocation = business.city || 'your area';
      const firstService = business.services?.[0] || bizCategory;
      const tag = bizName.replace(/[^a-zA-Z0-9]/g, '');
      const catTag = bizCategory.replace(/[^a-zA-Z0-9]/g, '');

      setCustomPrompt(`Special 20% Off on ${firstService} - Limited Period`);
      setGeneratedPost({
        title: `${firstService} Special`,
        headline: `⚡ Exclusive Offer on ${firstService} at ${bizName}!`,
        caption: `Looking for reliable, top-quality ${bizCategory.toLowerCase()} in ${bizLocation}? 🌟 Visit ${bizName} for premier service, trusted expertise, and dedicated support. Reach out today to claim our limited-time special offer!`,
        cta: 'Book Consultation on WhatsApp',
        hashtags: [`#${tag}`, `#${catTag}`, '#SpecialOffer', '#LocalBusiness', '#TrustedQuality'],
        imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=600&q=80',
        reelScript: [
          { scene: 'Scene 1 (0-4s)', visual: `Customer looking for trusted ${bizCategory}`, audio: `Need dependable ${bizCategory} in ${bizLocation}?` },
          { scene: 'Scene 2 (4-10s)', visual: `Professional team at ${bizName} providing high-quality service`, audio: `Here is why clients across ${bizLocation} trust ${bizName}.` },
          { scene: 'Scene 3 (10-15s)', visual: 'Delighted customer with contact options on screen', audio: 'Tap the link or message us on WhatsApp today!' },
        ],
      });
    }
  }, [business.id]);

  // Scheduling State
  const [scheduleDate, setScheduleDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    return tomorrow.toISOString().split('T')[0];
  });
  const [scheduleTimeSlot, setScheduleTimeSlot] = useState('11:00 AM');

  // Generated state
  const [generatedPost, setGeneratedPost] = useState<Partial<ContentPost>>(() => {
    const bizName = business.name || 'Our Store';
    const bizCategory = business.category || 'Services';
    const bizLocation = business.city || 'your area';
    const firstService = business.services?.[0] || bizCategory;
    const tag = bizName.replace(/[^a-zA-Z0-9]/g, '');
    const catTag = bizCategory.replace(/[^a-zA-Z0-9]/g, '');

    return {
      title: `${firstService} Special`,
      headline: `⚡ Exclusive Offer on ${firstService} at ${bizName}!`,
      caption: `Looking for reliable, top-quality ${bizCategory.toLowerCase()} in ${bizLocation}? 🌟 Visit ${bizName} for premier service, trusted expertise, and dedicated support. Reach out today to claim our limited-time special offer!`,
      cta: 'Book Consultation on WhatsApp',
      hashtags: [`#${tag}`, `#${catTag}`, '#SpecialOffer', '#LocalBusiness', '#TrustedQuality'],
      imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=600&q=80',
      reelScript: [
        { scene: 'Scene 1 (0-4s)', visual: `Customer looking for trusted ${bizCategory}`, audio: `Need dependable ${bizCategory} in ${bizLocation}?` },
        { scene: 'Scene 2 (4-10s)', visual: `Professional team at ${bizName} providing high-quality service`, audio: `Here is why clients across ${bizLocation} trust ${bizName}.` },
        { scene: 'Scene 3 (10-15s)', visual: 'Delighted customer with contact options on screen', audio: 'Tap the link or message us on WhatsApp today!' },
      ],
    };
  });

  const handleRenderCreative = async (templateIdToUse?: string, explicitPhotoUrl?: string, paletteIdToUse?: string) => {
    // When 'auto' or undefined is passed, the server-side combinatorial rotation engine picks an unused combo
    const isAuto = !templateIdToUse || templateIdToUse === 'auto';
    const tId = isAuto ? undefined : templateIdToUse;
    setIsRenderingCreative(true);
    setPostActionError(null);

    try {
      const activeTemplate = templates.find((t) => t.id === (tId || selectedTemplateId)) || FALLBACK_TEMPLATES.find((t) => t.id === (tId || selectedTemplateId));
      // Determine photo: explicitPhotoUrl > first uploaded photo > stock fallback
      const photoToUse =
        explicitPhotoUrl ||
        (generatedPost.imageUrl?.startsWith('/uploads/') && !generatedPost.imageUrl.includes('/generated/')
          ? generatedPost.imageUrl
          : uploadedPhotos[0]?.url);

      const res = await renderCreativeApi({
        templateId: tId,
        paletteId: paletteIdToUse,
        contentType,
        headline: generatedPost.headline || generatedPost.title || 'Exclusive Special Offer',
        caption: generatedPost.caption,
        ctaText: generatedPost.cta || 'Contact Us Today',
        companyId: effectiveCompanyId,
        companyName: business.name,
        photoUrl: photoToUse,
        logoUrl: activeLogoUrl,
        primaryColor,
        secondaryColor,
        tag: contentType.toUpperCase(),
      });

      if (res?.imageUrl) {
        if (res.templateId) setSelectedTemplateId(res.templateId);
        setRenderedTemplateName(res.templateName || activeTemplate?.name || 'Branded Template');
        if (res.paletteName) setRenderedPaletteName(res.paletteName);
        if (res.paletteColors) setRenderedPaletteColors(res.paletteColors);

        setGeneratedPost((prev) => ({
          ...prev,
          imageUrl: res.imageUrl,
        }));
        setScheduleSuccessToast(`✓ Fresh creative generated: "${res.templateName}" • "${res.paletteName || 'Dynamic Brand Theme'}"!`);
        setTimeout(() => setScheduleSuccessToast(null), 4000);
      }
    } catch (err: any) {
      console.error('Failed to render creative:', err);
      setPostActionError(`Creative rendering error: ${err?.message || 'Server error'}`);
    } finally {
      setIsRenderingCreative(false);
    }
  };

  const handleRenderReel = async () => {
    if (!generatedPost.reelScript || generatedPost.reelScript.length === 0) {
      setPostActionError('No reel script available to render. Please generate content first.');
      return;
    }

    if (reelPollIntervalRef.current) {
      clearInterval(reelPollIntervalRef.current);
      reelPollIntervalRef.current = null;
    }

    setIsRenderingReel(true);
    setReelRenderError(null);

    try {
      const res = await startReelRenderApi(generatedPost.reelScript, effectiveCompanyId);
      if (!res.success || !res.jobId) {
        throw new Error(res.error || 'Failed to dispatch reel rendering job');
      }

      const jobId = res.jobId;
      setReelJob({
        id: jobId,
        companyId: effectiveCompanyId,
        userId: '',
        status: 'rendering',
        progress: 5,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Poll every 2 seconds
      reelPollIntervalRef.current = setInterval(async () => {
        try {
          const statusRes = await getReelRenderStatusApi(jobId);
          if (statusRes.success && statusRes.job) {
            const currentJob = statusRes.job;
            setReelJob(currentJob);

            if (currentJob.status === 'completed') {
              if (reelPollIntervalRef.current) {
                clearInterval(reelPollIntervalRef.current);
                reelPollIntervalRef.current = null;
              }
              setIsRenderingReel(false);
              if (currentJob.videoUrl) {
                setRenderedReelUrl(currentJob.videoUrl);
                setScheduleSuccessToast('✓ 15-second viral local reel video rendered successfully!');
                setTimeout(() => setScheduleSuccessToast(null), 5000);
              }
            } else if (currentJob.status === 'failed') {
              if (reelPollIntervalRef.current) {
                clearInterval(reelPollIntervalRef.current);
                reelPollIntervalRef.current = null;
              }
              setIsRenderingReel(false);
              setReelRenderError(currentJob.error || 'Video rendering encountered an issue.');
            }
          }
        } catch (pollErr: any) {
          console.warn('Reel job poll warning:', pollErr);
        }
      }, 2000);
    } catch (err: any) {
      setIsRenderingReel(false);
      setReelRenderError(err?.message || 'Failed to start video rendering job.');
    }
  };

  const handleSaveBrandKit = async () => {
    setIsSavingBrandKit(true);
    setAssetActionError(null);
    setAssetSuccessMessage(null);
    try {
      const updatedBusiness: BusinessProfile = {
        ...business,
        brandKit: {
          ...business.brandKit,
          primaryColor,
          secondaryColor,
          tagline: brandTagline,
          brandTone,
          logoUrl: activeLogoUrl,
        },
      };
      onUpdateBusiness?.(updatedBusiness);
      setAssetSuccessMessage('✓ Brand Kit settings & colors saved successfully!');
      setTimeout(() => setAssetSuccessMessage(null), 4000);
      // Re-render creative with new brand colors
      handleRenderCreative(selectedTemplateId);
    } catch (err: any) {
      setAssetActionError(`Failed to save brand kit: ${err?.message || 'Error'}`);
    } finally {
      setIsSavingBrandKit(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    const result = await generateMarketingContent({
      businessName: business.name,
      category: business.category,
      contentType,
      platform: targetPlatform,
      offer: customPrompt,
      language,
      website: business.website || '',
      city: business.city || (business.serviceAreas && business.serviceAreas[0]) || '',
      targetAudience: business.brandKit?.targetAudience || '',
      brandTone: business.brandKit?.brandTone || '',
      tagline: business.brandKit?.tagline || '',
      preferredLanguage: business.brandKit?.preferredLanguage || language,
    });

    if (result) {
      const newHeadline = result.headline || generatedPost.headline;
      const newCaption = result.caption || generatedPost.caption;
      const newCta = result.callToAction || generatedPost.cta;

      setGeneratedPost((prev) => ({
        ...prev,
        headline: newHeadline,
        caption: newCaption,
        cta: newCta,
        hashtags: result.hashtags || prev.hashtags,
        reelScript: result.reelScript || prev.reelScript,
      }));

      // Automatically render fresh branded creative with auto-rotated theme and palette
      handleRenderCreative('auto');
      setRenderedReelUrl(null);
      setReelJob(null);
      setReelRenderError(null);
    }
    setIsGenerating(false);
  };

  const handleSchedulePost = async () => {
    setIsSavingPost(true);
    setPostActionError(null);

    const postPayload: Partial<ContentPost> = {
      title: generatedPost.title || 'New Marketing Creative',
      type: contentType,
      platforms: [targetPlatform],
      headline: generatedPost.headline || '',
      caption: generatedPost.caption || '',
      cta: generatedPost.cta || '',
      hashtags: generatedPost.hashtags || [],
      imageUrl: generatedPost.imageUrl || 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=600&q=80',
      videoUrl: renderedReelUrl || undefined,
      status: 'scheduled',
      scheduledDate: scheduleDate,
      timeSlot: scheduleTimeSlot,
      reelScript: generatedPost.reelScript,
    };

    const tempId = `temp_post_${Date.now()}`;
    const optimisticPost: ContentPost = {
      id: tempId,
      title: postPayload.title!,
      type: postPayload.type!,
      platforms: postPayload.platforms!,
      headline: postPayload.headline!,
      caption: postPayload.caption!,
      cta: postPayload.cta!,
      hashtags: postPayload.hashtags!,
      imageUrl: postPayload.imageUrl!,
      videoUrl: postPayload.videoUrl,
      status: 'scheduled',
      scheduledDate: postPayload.scheduledDate!,
      timeSlot: postPayload.timeSlot!,
      reelScript: postPayload.reelScript,
    };

    const previousPosts = [...localPosts];
    setLocalPosts((prev) => [optimisticPost, ...prev]);

    try {
      const created = await createContentPostApi({
        ...postPayload,
        companyId,
      });

      if (!created || !created.id) {
        throw new Error('Server did not return a valid post record');
      }

      setLocalPosts((prev) => prev.map((p) => (p.id === tempId ? created : p)));
      onAddNewPost(created);
      setScheduleSuccessToast(`✓ Post "${created.title}" scheduled & saved to MySQL database (ID: ${created.id})!`);
      setTimeout(() => setScheduleSuccessToast(null), 5000);
    } catch (err: any) {
      console.error('Failed to create content post in MySQL:', err);
      // Roll back
      setLocalPosts(previousPosts);
      setPostActionError(`Failed to save post to MySQL: ${err?.message || 'Server error'}. Changes rolled back.`);
    } finally {
      setIsSavingPost(false);
    }
  };

  const handlePublishPost = async (postId: string) => {
    const previousPosts = [...localPosts];
    // Optimistic status update
    setLocalPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, status: 'published' as const } : p))
    );
    setIsPublishingId(postId);
    setPostActionError(null);

    try {
      const ok = await updatePostStatusApi(postId, 'published', companyId);
      if (!ok) {
        throw new Error('Failed to update status on server');
      }
      setScheduleSuccessToast('✓ Post published to MySQL successfully!');
      setTimeout(() => setScheduleSuccessToast(null), 4000);
      onPublishPost?.(postId);
    } catch (err: any) {
      console.error('Failed to publish post to MySQL:', err);
      // Roll back
      setLocalPosts(previousPosts);
      setPostActionError(`Failed to publish post: ${err?.message || 'Server error'}. Status reverted.`);
    } finally {
      setIsPublishingId(null);
    }
  };

  const handleDeletePost = async (postId: string, postTitle: string) => {
    try {
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        if (!window.confirm(`Delete post "${postTitle}" from MySQL database?`)) return;
      }
    } catch {
      // In restricted iframe environments, proceed safely
    }

    const previousPosts = [...localPosts];
    // Optimistic deletion
    setLocalPosts((prev) => prev.filter((p) => p.id !== postId));
    setIsDeletingId(postId);
    setPostActionError(null);

    try {
      const ok = await deleteContentPostApi(postId, companyId);
      if (!ok) {
        throw new Error('Failed to delete post on server');
      }
      setScheduleSuccessToast('✓ Post deleted from MySQL database.');
      setTimeout(() => setScheduleSuccessToast(null), 3000);
      onDeletePost?.(postId);
    } catch (err: any) {
      console.error('Failed to delete post from MySQL:', err);
      // Roll back
      setLocalPosts(previousPosts);
      setPostActionError(`Failed to delete post from MySQL: ${err?.message || 'Server error'}. Post restored.`);
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Schedule Success Toast Banner */}
      {scheduleSuccessToast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{scheduleSuccessToast}</span>
          </div>
          <button
            onClick={() => setScheduleSuccessToast(null)}
            className="text-emerald-700 hover:text-emerald-950 font-black px-2 py-0.5 rounded-md hover:bg-emerald-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Action Error Banner with Rollback Notification */}
      {postActionError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{postActionError}</span>
          </div>
          <button
            onClick={() => setPostActionError(null)}
            className="text-rose-700 hover:text-rose-950 font-black px-2 py-0.5 rounded-md hover:bg-rose-100"
          >
            ✕
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-indigo-600" />
              AI Content Studio & Reel Engine
            </h1>
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
              <Database className="w-3 h-3 text-emerald-600" />
              MySQL Synced
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Autonomous multi-lingual copywriter, brand kit creative designer, and 15s video reel director.
          </p>
        </div>

        {/* Sub-Tabs Bento Pill */}
        <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl border border-slate-200 text-xs shadow-xs">
          <button
            onClick={() => setActiveTab('copywriter')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition ${
              activeTab === 'copywriter' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Copywriter
          </button>
          <button
            onClick={() => setActiveTab('creative')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition ${
              activeTab === 'creative' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Branded Creative
          </button>
          <button
            onClick={() => setActiveTab('reel')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition ${
              activeTab === 'reel' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Reel Script Engine
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
              activeTab === 'assets' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Brand Assets ({assets.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
              activeTab === 'posts' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-3 h-3" />
            <span>Posts Queue ({localPosts.length})</span>
          </button>
        </div>
      </div>

      {/* Content Body: Either Posts Queue or Main Studio Grid */}
      {activeTab === 'posts' ? (
        <div className="space-y-4">
          {/* Controls Bar in Bento Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Filter Posts:</span>
              <div className="flex items-center gap-1.5 text-xs">
                {(['all', 'scheduled', 'published'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setPostFilter(filter)}
                    className={`px-3 py-1 rounded-xl font-bold transition capitalize ${
                      postFilter === filter
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    {filter === 'all'
                      ? `All (${localPosts.length})`
                      : filter === 'scheduled'
                      ? `Scheduled (${localPosts.filter((p) => p.status === 'scheduled').length})`
                      : `Published (${localPosts.filter((p) => p.status === 'published').length})`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => onNavigate('calendar')}
                className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl font-bold border border-slate-200 transition flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Open Calendar View</span>
              </button>
              <button
                onClick={() => setActiveTab('copywriter')}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-xs flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Create New Post</span>
              </button>
            </div>
          </div>

          {/* Posts List */}
          {localPosts.filter((p) => postFilter === 'all' || p.status === postFilter).length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Database className="w-6 h-6" />
              </div>
              <div className="font-bold text-slate-900 text-sm">No Content Posts Found</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No posts match the current filter. Use the AI Copywriter or Branded Creative tabs to draft and schedule posts.
              </p>
              <button
                onClick={() => setActiveTab('copywriter')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-xs inline-flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate New AI Post
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {localPosts
                .filter((p) => postFilter === 'all' || p.status === postFilter)
                .map((post) => (
                  <div
                    key={post.id}
                    className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3 hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-black text-sm text-slate-900 line-clamp-1">{post.title}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>
                              {post.scheduledDate} • {post.timeSlot}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setPreviewPostModal(post)}
                            className="text-slate-400 hover:text-indigo-600 p-1 rounded-lg hover:bg-indigo-50 transition"
                            title="Preview Post Full Size"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                              post.status === 'published'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {post.status}
                          </span>
                          <button
                            onClick={() => handleDeletePost(post.id, post.title)}
                            disabled={isDeletingId === post.id}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition disabled:opacity-50"
                            title="Delete Post from MySQL"
                          >
                            <Trash2 className={`w-3.5 h-3.5 ${isDeletingId === post.id ? 'animate-pulse text-rose-500' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {/* Post Creative Thumbnail */}
                      {post.imageUrl && (
                        <div
                          onClick={() => setPreviewPostModal(post)}
                          className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 cursor-pointer group"
                        >
                          <img
                            src={post.imageUrl}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                          {post.imageUrl.includes('/generated/') ? (
                            <span className="absolute top-2 right-2 bg-indigo-600/90 backdrop-blur-xs text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              Branded Graphic
                            </span>
                          ) : (
                            <span className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-medium px-2 py-0.5 rounded-full shadow-xs">
                              Stock Photo
                            </span>
                          )}
                          {post.videoUrl && (
                            <span className="absolute top-2 left-2 bg-rose-600/90 backdrop-blur-xs text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1">
                              <Film className="w-2.5 h-2.5" />
                              15s Reel MP4
                            </span>
                          )}
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1 text-white text-xs font-bold">
                            <Eye className="w-4 h-4" />
                            <span>Preview</span>
                          </div>
                        </div>
                      )}

                      {post.headline && (
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-900 leading-snug">
                          {post.headline}
                        </div>
                      )}

                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        {post.caption}
                      </p>

                      <div className="flex flex-wrap gap-1">
                        {post.platforms?.map((plat) => (
                          <span
                            key={plat}
                            className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                          >
                            {plat}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-mono">ID: {post.id}</span>
                      {post.status === 'scheduled' && (
                        <button
                          onClick={() => handlePublishPost(post.id)}
                          disabled={isPublishingId === post.id}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isPublishingId === post.id ? 'Publishing...' : 'Publish to MySQL Now'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      ) : activeTab === 'assets' ? (
        /* Brand Assets & Media Library Tab */
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-600" />
                Brand Media & Business Photo Library
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Upload your official company logo and genuine photos of your clinic, shop, vehicles, staff, or work in progress.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs inline-flex items-center gap-2 transition disabled:opacity-50">
                {isUploadingAsset ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>{isUploadingAsset ? 'Uploading Image...' : 'Upload Business Photo'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={isUploadingAsset}
                  onChange={(e) => handleFileUpload(e, 'photo')}
                />
              </label>
            </div>
          </div>

          {/* Feedback Messages */}
          {assetActionError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-700 text-xs shadow-2xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-semibold">{assetActionError}</span>
              <button onClick={() => setAssetActionError(null)} className="ml-auto text-rose-500 hover:text-rose-800">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {assetSuccessMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-700 text-xs shadow-2xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">{assetSuccessMessage}</span>
              <button onClick={() => setAssetSuccessMessage(null)} className="ml-auto text-emerald-500 hover:text-emerald-800">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Asset Management Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Section A: Brand Logo */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Official Brand Logo</span>
                  <span className="text-[10px] text-slate-500 font-medium">JPEG, PNG, WebP</span>
                </div>
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center">
                  <img
                    src={activeLogoUrl}
                    alt="Brand Logo"
                    className="w-24 h-24 rounded-2xl object-cover border border-slate-200 shadow-sm bg-white p-1.5"
                  />
                  <div className="mt-3 font-bold text-xs text-slate-900">{business.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {uploadedLogo ? 'Custom Uploaded Logo' : 'Default Profile Logo'}
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="w-full cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2">
                  <Upload className="w-3.5 h-3.5 text-slate-600" />
                  <span>{isUploadingAsset ? 'Uploading...' : 'Upload New Logo'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={isUploadingAsset}
                    onChange={(e) => handleFileUpload(e, 'logo')}
                  />
                </label>
                <p className="text-[10px] text-slate-400 text-center">
                  Max 5MB. Automatically composites into all branded social templates.
                </p>
              </div>
            </div>

            {/* Section B: Business Photos */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Business Photo Library ({uploadedPhotos.length})
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Genuine photos of your staff, clinic, shop, work in progress, or products.
                  </p>
                </div>
                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-xl">
                  {uploadedPhotos.length === 0 ? '0 Photos (Using Stock Fallback)' : `${uploadedPhotos.length} Real Photos`}
                </span>
              </div>

              {/* Upload Drop/Click Area */}
              <label className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 hover:bg-indigo-50/70 p-6 rounded-2xl cursor-pointer flex flex-col items-center justify-center text-center transition group">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="mt-2 text-xs font-bold text-slate-800">
                  {isUploadingAsset ? 'Uploading Image...' : 'Click to Upload Real Business Photo'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Supports PNG, JPEG, WebP • Strict 5MB Limit • Stored per-tenant
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={isUploadingAsset}
                  onChange={(e) => handleFileUpload(e, 'photo')}
                />
              </label>

              {/* Photos Gallery */}
              {isLoadingAssets ? (
                <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  Loading business asset library...
                </div>
              ) : uploadedPhotos.length === 0 ? (
                <div className="p-8 border border-slate-100 rounded-2xl bg-slate-50/50 text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-slate-800">No Business Photos Uploaded Yet</div>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                    Generated posts currently fall back to generic stock photography. Upload 2-3 genuine photos of your business above to unlock personalized, authentic social creatives.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  {uploadedPhotos.map((photo) => {
                    const isSelectedForPost = generatedPost.imageUrl === photo.url;
                    return (
                      <div
                        key={photo.id}
                        className={`group relative rounded-2xl overflow-hidden border transition bg-slate-900 ${
                          isSelectedForPost ? 'border-indigo-600 ring-2 ring-indigo-500' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <img
                          src={photo.url}
                          alt={photo.label || 'Business asset'}
                          className="w-full aspect-square object-cover group-hover:scale-105 transition duration-300 opacity-90 group-hover:opacity-100"
                        />
                        {isSelectedForPost && (
                          <div className="absolute top-2 left-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                            <Check className="w-3 h-3" />
                            Active Post
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition p-2.5 flex flex-col justify-between">
                          <div className="flex justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAsset(photo.id);
                              }}
                              disabled={isDeletingAssetId === photo.id}
                              className="bg-rose-600 hover:bg-rose-700 text-white p-1.5 rounded-lg shadow-sm transition disabled:opacity-50"
                              title="Delete asset from disk and MySQL"
                            >
                              {isDeletingAssetId === photo.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <div>
                            <button
                              onClick={() => {
                                setGeneratedPost((prev) => ({ ...prev, imageUrl: photo.url }));
                                setAssetSuccessMessage('Photo applied to active post creative!');
                              }}
                              className="w-full bg-white/95 hover:bg-white text-slate-900 text-[10px] font-black py-1.5 px-2 rounded-xl transition shadow-xs text-center"
                            >
                              {isSelectedForPost ? 'Selected for Post' : 'Use in Post'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Section C: Brand Colors & Visual Identity (Brand Kit) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Palette className="w-4 h-4 text-indigo-600" />
                  Brand Colors & Identity Settings (Brand Kit)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  These colors, logo, and tagline are automatically composited into your server-rendered social graphics and posters.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveBrandKit}
                disabled={isSavingBrandKit}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs inline-flex items-center gap-2 transition disabled:opacity-50"
              >
                {isSavingBrandKit ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>{isSavingBrandKit ? 'Saving Brand Kit...' : 'Save Brand Kit & Re-Render'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Primary Color */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900">Primary Brand Color</label>
                  <span className="font-mono text-xs font-bold text-slate-600">{primaryColor}</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 uppercase focus:outline-none focus:border-indigo-500"
                    placeholder="#4F46E5"
                  />
                </div>
                {/* Presets */}
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Presets</div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: 'Indigo', hex: '#4f46e5' },
                      { name: 'Royal Blue', hex: '#2563eb' },
                      { name: 'Emerald', hex: '#059669' },
                      { name: 'Violet', hex: '#7c3aed' },
                      { name: 'Rose', hex: '#e11d48' },
                      { name: 'Amber', hex: '#d97706' },
                      { name: 'Cyan', hex: '#0891b2' },
                      { name: 'Slate', hex: '#0f172a' },
                    ].map((p) => (
                      <button
                        key={p.hex}
                        type="button"
                        onClick={() => setPrimaryColor(p.hex)}
                        className={`w-6 h-6 rounded-lg border-2 transition ${
                          primaryColor.toLowerCase() === p.hex.toLowerCase()
                            ? 'border-slate-900 scale-110 shadow-xs'
                            : 'border-white hover:scale-105'
                        }`}
                        style={{ backgroundColor: p.hex }}
                        title={`${p.name} (${p.hex})`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Secondary Accent Color */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900">Secondary / Accent Color</label>
                  <span className="font-mono text-xs font-bold text-slate-600">{secondaryColor}</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 uppercase focus:outline-none focus:border-indigo-500"
                    placeholder="#06B6D4"
                  />
                </div>
                {/* Presets */}
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Presets</div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: 'Cyan', hex: '#06b6d4' },
                      { name: 'Amber', hex: '#f59e0b' },
                      { name: 'Emerald', hex: '#10b981' },
                      { name: 'Rose', hex: '#f43f5e' },
                      { name: 'Purple', hex: '#a855f7' },
                      { name: 'Orange', hex: '#ea580c' },
                      { name: 'Teal', hex: '#14b8a6' },
                      { name: 'Yellow', hex: '#eab308' },
                    ].map((p) => (
                      <button
                        key={p.hex}
                        type="button"
                        onClick={() => setSecondaryColor(p.hex)}
                        className={`w-6 h-6 rounded-lg border-2 transition ${
                          secondaryColor.toLowerCase() === p.hex.toLowerCase()
                            ? 'border-slate-900 scale-110 shadow-xs'
                            : 'border-white hover:scale-105'
                        }`}
                        style={{ backgroundColor: p.hex }}
                        title={`${p.name} (${p.hex})`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Tagline & Live Brand Preview Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                <div>
                  <label className="text-xs font-bold text-slate-900 block mb-1.5">Brand Tagline</label>
                  <input
                    type="text"
                    value={brandTagline}
                    onChange={(e) => setBrandTagline(e.target.value)}
                    placeholder="e.g. Pune's Most Trusted Tech Diagnostics Lab"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Live Palette Swatch Preview */}
                <div
                  className="rounded-xl p-3 text-white flex items-center justify-between shadow-xs transition-colors"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={activeLogoUrl}
                      alt="Logo"
                      className="w-8 h-8 rounded-lg object-cover bg-white/90 p-0.5 border border-white/20"
                    />
                    <div>
                      <div className="font-black text-xs leading-tight">{business.name}</div>
                      <div className="text-[10px] text-white/80 line-clamp-1">{brandTagline || 'Authentic Local Services'}</div>
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-black px-2 py-0.5 rounded-md uppercase"
                    style={{ backgroundColor: secondaryColor, color: '#0f172a' }}
                  >
                    Accent
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Main Studio Grid */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input & Strategy Controls (5 Cols) in Bento Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-indigo-600" />
              Content Strategy Generator
            </h2>

            {/* Content Type */}
            <div className="space-y-1.5 text-xs">
              <label className="text-slate-600 font-bold">Content Objective</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'offer', label: '🔥 Offer / Discount' },
                  { id: 'festival', label: '🎉 Festival / Festive' },
                  { id: 'service', label: '🛠️ Service Showcase' },
                  { id: 'educational', label: '💡 Tech Advice / FAQ' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setContentType(item.id as any)}
                    className={`p-2.5 rounded-xl text-left font-bold border transition text-xs ${
                      contentType === item.id
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Language Selection (Section 16: English, Hindi, Hinglish, Marathi, Gujarati, Tamil, Telugu, Bengali, Kannada, Malayalam, Punjabi) */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <label className="text-slate-600 font-bold">Target Language</label>
                <span className="text-[10px] text-indigo-600 font-semibold">11 Indian Languages</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {(['Hinglish', 'English', 'Hindi', 'Marathi'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition border ${
                      language === lang
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
                {/* Additional Regional Languages */}
                <select
                  value={['Hinglish', 'English', 'Hindi', 'Marathi'].includes(language) ? '' : language}
                  onChange={(e) => {
                    if (e.target.value) setLanguage(e.target.value as any);
                  }}
                  className={`px-2.5 py-1 rounded-xl font-bold text-xs border bg-slate-50 text-slate-700 border-slate-200 focus:outline-none focus:border-indigo-500 ${
                    !['Hinglish', 'English', 'Hindi', 'Marathi'].includes(language) ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : ''
                  }`}
                >
                  <option value="">More Languages...</option>
                  <option value="Gujarati">Gujarati (ગુજરાતી)</option>
                  <option value="Tamil">Tamil (தமிழ்)</option>
                  <option value="Telugu">Telugu (తెలుగు)</option>
                  <option value="Bengali">Bengali (বাংলা)</option>
                  <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                  <option value="Malayalam">Malayalam (മലയാളം)</option>
                  <option value="Punjabi">Punjabi (ਪੰਜਾਬੀ)</option>
                </select>
              </div>
            </div>

            {/* Target Platform */}
            <div className="space-y-1.5 text-xs">
              <label className="text-slate-600 font-bold">Publishing Platform</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'google', label: 'Google Post' },
                  { id: 'instagram', label: 'Instagram' },
                  { id: 'whatsapp', label: 'WhatsApp' },
                ].map((plat) => (
                  <button
                    key={plat.id}
                    onClick={() => setTargetPlatform(plat.id as any)}
                    className={`p-2 rounded-xl text-center font-bold border transition text-xs ${
                      targetPlatform === plat.id
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {plat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Campaign Prompt or Offer */}
            <div className="space-y-1.5 text-xs">
              <label className="text-slate-600 font-bold">Offer or Campaign Hook</label>
              <textarea
                rows={3}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g. 20% discount on laptop screen replacement this Saturday..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl transition shadow-xs flex items-center justify-center gap-2 text-xs"
            >
              <Wand2 className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'AI Crafting Creative & Copy...' : 'Generate with LocalPulse AI'}</span>
            </button>
          </div>

          {/* Brand Kit Snapshot Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 text-xs space-y-3 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <span className="flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-indigo-600" />
                Active Brand Kit
              </span>
              <button
                onClick={() => setActiveTab('assets')}
                className="text-indigo-600 hover:text-indigo-800 font-bold text-[10px] flex items-center gap-1"
              >
                <Camera className="w-3 h-3" />
                <span>Media Library ({assets.length})</span>
              </button>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <img
                src={activeLogoUrl}
                alt="Logo"
                className="w-10 h-10 rounded-xl object-cover border border-slate-200 bg-white"
              />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900 truncate">{business.name}</div>
                <div className="text-[11px] text-slate-500">
                  {uploadedPhotos.length > 0 ? (
                    <span className="text-emerald-700 font-semibold">{uploadedPhotos.length} Real Photos in Library</span>
                  ) : (
                    <span className="text-amber-600 font-medium">Stock photo fallback active</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Output Preview (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {activeTab === 'copywriter' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Generated Platform Copy
                  </span>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full font-bold">
                    {language}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px]">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="bg-transparent border-none text-slate-700 font-medium focus:outline-none text-[11px]"
                    />
                    <select
                      value={scheduleTimeSlot}
                      onChange={(e) => setScheduleTimeSlot(e.target.value)}
                      className="bg-transparent border-none text-slate-700 font-medium focus:outline-none text-[11px]"
                    >
                      <option value="09:00 AM">09:00 AM</option>
                      <option value="11:00 AM">11:00 AM</option>
                      <option value="02:30 PM">02:30 PM</option>
                      <option value="06:00 PM">06:00 PM</option>
                      <option value="08:00 PM">08:00 PM</option>
                    </select>
                  </div>
                  <button
                    onClick={handleSchedulePost}
                    disabled={isSavingPost}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition shadow-xs whitespace-nowrap disabled:opacity-50"
                  >
                    {isSavingPost ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                    <span>{isSavingPost ? 'Saving to MySQL...' : 'Save to MySQL'}</span>
                  </button>
                </div>
              </div>

              {/* Branded Social Creative Card */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-3 shadow-sm border border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold tracking-wide">Branded Graphic Creative</span>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-md font-mono">
                      1080×1080 PNG
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium truncate max-w-[140px]">
                    Template: {renderedTemplateName}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  {/* Thumbnail */}
                  <div className="sm:col-span-4 relative aspect-square rounded-xl overflow-hidden bg-slate-950 border border-slate-800 group">
                    <img
                      src={generatedPost.imageUrl}
                      alt="Rendered Creative"
                      className="w-full h-full object-cover"
                    />
                    {isRenderingCreative && (
                      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-2 text-center">
                        <Loader2 className="w-5 h-5 text-indigo-400 animate-spin mb-1" />
                        <span className="text-[10px] font-bold text-white">Rendering...</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewPostModal({
                          id: 'current_draft',
                          title: generatedPost.title || 'Marketing Creative',
                          headline: generatedPost.headline,
                          caption: generatedPost.caption,
                          cta: generatedPost.cta,
                          hashtags: generatedPost.hashtags,
                          imageUrl: generatedPost.imageUrl,
                          status: 'scheduled',
                          type: contentType,
                          platforms: [targetPlatform],
                          scheduledDate: scheduleDate,
                          timeSlot: scheduleTimeSlot,
                        })
                      }
                      className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1 text-white text-[11px] font-bold"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Expand</span>
                    </button>
                  </div>

                  {/* Actions & Template Switcher */}
                  <div className="sm:col-span-8 space-y-2 text-xs">
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Generated server-side with real brand logos, palette colors, and local contact badge.
                    </p>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleRenderCreative()}
                        disabled={isRenderingCreative}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 text-[11px]"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRenderingCreative ? 'animate-spin' : ''}`} />
                        <span>{isRenderingCreative ? 'Rendering Creative...' : 'Re-render Graphic'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowTemplateModal(true)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition flex items-center gap-1.5 border border-slate-700 text-[11px]"
                      >
                        <Layout className="w-3.5 h-3.5 text-amber-400" />
                        <span>Pick Template (16)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('creative')}
                        className="px-2.5 py-1.5 text-indigo-400 hover:text-indigo-300 font-bold transition text-[11px] flex items-center gap-1"
                      >
                        <span>Full Studio</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Photo Source Selector Strip */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 font-bold flex items-center gap-1.5 text-[11px]">
                    <Camera className="w-3.5 h-3.5 text-indigo-600" />
                    Creative Image Source ({uploadedPhotos.length > 0 ? `${uploadedPhotos.length} Business Photos` : 'Stock Fallback'})
                  </span>
                  <button
                    onClick={() => setActiveTab('assets')}
                    className="text-indigo-600 hover:text-indigo-800 font-bold text-[10px] flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Manage Library
                  </button>
                </div>

                {uploadedPhotos.length > 0 ? (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
                    {uploadedPhotos.map((photo) => {
                      const isSelected = generatedPost.imageUrl === photo.url;
                      return (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() => setGeneratedPost((prev) => ({ ...prev, imageUrl: photo.url }))}
                          className={`relative shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 transition ${
                            isSelected ? 'border-indigo-600 ring-2 ring-indigo-400' : 'border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={photo.url} alt="asset" className="w-full h-full object-cover" />
                          {isSelected && (
                            <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center">
                              <Check className="w-4 h-4 text-white drop-shadow" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setGeneratedPost((prev) => ({ ...prev, imageUrl: defaultStockFallback }))}
                      className={`relative shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 transition ${
                        generatedPost.imageUrl === defaultStockFallback ? 'border-indigo-600 ring-2 ring-indigo-400' : 'border-slate-200 hover:border-slate-300 opacity-60'
                      }`}
                      title="Generic Stock Fallback"
                    >
                      <img src={defaultStockFallback} alt="Stock" className="w-full h-full object-cover" />
                      <span className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-white text-[8px] font-bold text-center py-0.5">
                        Stock
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[11px] text-slate-500 bg-white p-2 rounded-xl border border-slate-200">
                    <span>Using stock fallback photo. Upload genuine photos to personalize.</span>
                    <button
                      onClick={() => setActiveTab('assets')}
                      className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-bold text-[10px] shrink-0 ml-2"
                    >
                      Upload Photos
                    </button>
                  </div>
                )}
              </div>

              {/* Headline */}
              <div className="space-y-1 text-xs">
                <span className="text-slate-500 font-bold">Catchy Headline:</span>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 font-bold text-slate-900 text-sm">
                  {generatedPost.headline}
                </div>
              </div>

              {/* Caption */}
              <div className="space-y-1 text-xs">
                <span className="text-slate-500 font-bold">Post Caption:</span>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {generatedPost.caption}
                </div>
              </div>

              {/* CTA */}
              <div className="space-y-1 text-xs">
                <span className="text-slate-500 font-bold">Call to Action (CTA):</span>
                <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 px-3.5 py-2.5 rounded-xl font-bold flex items-center justify-between">
                  <span>{generatedPost.cta}</span>
                  <span className="text-[10px] text-indigo-600 font-semibold">Direct Link to WhatsApp</span>
                </div>
              </div>

              {/* Hashtags */}
              <div className="space-y-1 text-xs">
                <span className="text-slate-500 font-bold">Rank-Targeted Local Hashtags:</span>
                <div className="flex flex-wrap gap-1.5">
                  {generatedPost.hashtags?.map((tag, idx) => (
                    <span
                      key={idx}
                      className="bg-slate-50 text-indigo-700 px-2.5 py-1 rounded-xl border border-slate-200 text-[11px] font-bold"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'creative' && (
            /* Branded Creative Studio with Combinatorial Satori + Resvg Server Engine */
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
              {/* Header with Engine Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      Combinatorial Creative Engine
                    </h3>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                      1080×1080 PNG Ready
                    </span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> Auto Theme Rotation
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                    <span>Layout: <strong className="text-slate-800">{renderedTemplateName}</strong></span>
                    <span>•</span>
                    <span>Palette: <strong className="text-indigo-700">{renderedPaletteName}</strong></span>
                    {renderedPaletteColors && (
                      <div className="flex items-center gap-1 ml-1" title="Active Palette Colors">
                        <span className="w-3 h-3 rounded-full border border-slate-200 shadow-2xs" style={{ backgroundColor: renderedPaletteColors.primary }} />
                        <span className="w-3 h-3 rounded-full border border-slate-200 shadow-2xs" style={{ backgroundColor: renderedPaletteColors.secondary }} />
                        <span className="w-3 h-3 rounded-full border border-slate-200 shadow-2xs" style={{ backgroundColor: renderedPaletteColors.accent }} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleRenderCreative('auto')}
                    disabled={isRenderingCreative}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-bold transition shadow-xs hover:shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                    title="Intelligently rotates layout and harmonious color palette without repeating in the last 5 generations"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isRenderingCreative ? 'animate-spin' : ''}`} />
                    <span>{isRenderingCreative ? 'Rotating & Rendering...' : 'Generate Fresh Creative'}</span>
                  </button>

                  <a
                    href={generatedPost.imageUrl}
                    download={`creative-${business.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    title="Download High-Res 1080x1080 PNG"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PNG</span>
                  </a>
                </div>
              </div>

              {/* Main Visual Display */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left: Rendered Graphic Preview */}
                <div className="lg:col-span-6 space-y-3">
                  <div className="relative aspect-square max-w-md mx-auto rounded-3xl overflow-hidden shadow-xl border border-slate-200 bg-slate-950 flex items-center justify-center group">
                    <img
                      src={generatedPost.imageUrl}
                      alt="Brand Creative"
                      className="w-full h-full object-contain"
                    />

                    {isRenderingCreative && (
                      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center">
                        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-2" />
                        <span className="text-xs font-bold text-white">Satori Compositing Graphic...</span>
                        <span className="text-[10px] text-slate-400 mt-1">Applying brand colors, fonts & resolution</span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewPostModal({
                            id: 'creative_preview',
                            title: generatedPost.title || 'Branded Graphic',
                            headline: generatedPost.headline,
                            caption: generatedPost.caption,
                            cta: generatedPost.cta,
                            hashtags: generatedPost.hashtags,
                            imageUrl: generatedPost.imageUrl,
                            status: 'scheduled',
                            type: contentType,
                            platforms: [targetPlatform],
                            scheduledDate: scheduleDate,
                            timeSlot: scheduleTimeSlot,
                          })
                        }
                        className="bg-white text-slate-900 px-3.5 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 hover:bg-slate-50"
                      >
                        <Eye className="w-4 h-4 text-indigo-600" />
                        <span>Full Size</span>
                      </button>
                    </div>
                  </div>

                  {/* Photo Switcher Strip */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 font-bold flex items-center gap-1.5 text-[11px]">
                        <Camera className="w-3.5 h-3.5 text-indigo-600" />
                        Swap Image & Re-render ({uploadedPhotos.length} Photos in Library)
                      </span>
                      <button
                        onClick={() => setActiveTab('assets')}
                        className="text-indigo-600 hover:text-indigo-800 font-bold text-[10px] flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Upload New Photo
                      </button>
                    </div>

                    {uploadedPhotos.length > 0 ? (
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
                        {uploadedPhotos.map((photo) => {
                          const isSelected = generatedPost.imageUrl === photo.url;
                          return (
                            <button
                              key={photo.id}
                              type="button"
                              onClick={() => {
                                setGeneratedPost((prev) => ({ ...prev, imageUrl: photo.url }));
                                handleRenderCreative('auto', photo.url);
                              }}
                              className={`relative shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 transition ${
                                isSelected
                                  ? 'border-indigo-600 ring-2 ring-indigo-400'
                                  : 'border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100'
                              }`}
                              title={photo.label || 'Company Photo'}
                            >
                              <img src={photo.url} alt="asset" className="w-full h-full object-cover" />
                              {isSelected && (
                                <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center">
                                  <Check className="w-4 h-4 text-white drop-shadow" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-[11px] text-slate-500 bg-white p-2 rounded-xl border border-slate-200">
                        <span>Using placeholder fallback. Upload genuine photos in Brand Assets.</span>
                        <button
                          onClick={() => setActiveTab('assets')}
                          className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-bold text-[10px] shrink-0 ml-2"
                        >
                          Upload Photos
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Theme Rotation Engine Control & Manual Template Selector */}
                <div className="lg:col-span-6 space-y-4">
                  {/* Automated Theme Rotation Status Card */}
                  <div className="bg-gradient-to-br from-indigo-50/70 via-slate-50 to-purple-50/50 border border-indigo-100 rounded-3xl p-5 space-y-3.5 shadow-2xs">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-indigo-900 font-bold text-xs uppercase tracking-wider">
                          <Sparkles className="w-4 h-4 text-indigo-600" />
                          Combinatorial Theme Rotation
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          Automated variation system ensures your brand's daily posts never look repetitive. Generates thousands of distinct looks while strictly maintaining your logo, typography, and company messaging.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <div className="bg-white/80 rounded-2xl p-3 border border-indigo-50 shadow-2xs">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Layout</span>
                        <span className="text-xs font-bold text-slate-900 truncate block mt-0.5">{renderedTemplateName}</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">1 of 16 responsive skeletons</span>
                      </div>
                      <div className="bg-white/80 rounded-2xl p-3 border border-indigo-50 shadow-2xs">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Color Palette</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs font-bold text-indigo-700 truncate">{renderedPaletteName}</span>
                          {renderedPaletteColors && (
                            <span className="flex items-center gap-0.5 shrink-0">
                              <span className="w-2.5 h-2.5 rounded-full border border-slate-200" style={{ backgroundColor: renderedPaletteColors.primary }} />
                              <span className="w-2.5 h-2.5 rounded-full border border-slate-200" style={{ backgroundColor: renderedPaletteColors.secondary }} />
                              <span className="w-2.5 h-2.5 rounded-full border border-slate-200" style={{ backgroundColor: renderedPaletteColors.accent }} />
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">
                          {contentType === 'festival' ? 'Festive / Seasonal palette' : 'Math-shifted brand harmony'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => handleRenderCreative('auto')}
                        disabled={isRenderingCreative}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRenderingCreative ? 'animate-spin' : ''}`} />
                        <span>{isRenderingCreative ? 'Rotating Theme & Rendering...' : 'Rotate to Next Fresh Theme'}</span>
                      </button>
                      <p className="text-[10px] text-center text-slate-400 mt-1.5">
                        Guaranteed zero theme or palette repetition in any 5-generation window
                      </p>
                    </div>
                  </div>

                  {/* Manual Template Override Collapsible */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setShowManualTemplatePicker((prev) => !prev)}
                        className="flex items-center gap-2 text-xs font-bold text-slate-800 hover:text-indigo-600 transition"
                      >
                        <Layout className="w-4 h-4 text-indigo-600" />
                        <span>Advanced: Manual Layout Selector</span>
                        <span className="text-[10px] font-normal text-slate-400">
                          {showManualTemplatePicker ? '(Click to collapse)' : '(Click to expand 16 layouts)'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowTemplateModal(true)}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold"
                      >
                        Full Grid Modal
                      </button>
                    </div>

                    {showManualTemplatePicker && (
                      <div className="pt-2 border-t border-slate-100">
                        <TemplateSelector
                          templates={templates}
                          selectedTemplateId={selectedTemplateId}
                          contentType={contentType}
                          isRendering={isRenderingCreative}
                          onSelectTemplate={(tId) => {
                            setSelectedTemplateId(tId);
                            handleRenderCreative(tId);
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reel' && (
            /* AI Reel / Video Script Director & Remotion MP4 Video Engine */
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Film className="w-4 h-4 text-indigo-600" />
                      15-Second Viral Local Reel Engine
                    </h3>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                      Remotion MP4
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Generates a real 1080×1920 vertical MP4 video with Ken Burns motion, logo watermark, and synchronized subtitles.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {renderedReelUrl ? (
                    <span className="text-xs text-emerald-700 font-bold bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      MP4 Video Ready
                    </span>
                  ) : isRenderingReel ? (
                    <span className="text-xs text-indigo-700 font-bold bg-indigo-100 border border-indigo-200 px-3 py-1 rounded-full flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                      Rendering ({reelJob?.progress || 0}%)
                    </span>
                  ) : (
                    <span className="text-xs text-emerald-700 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      Script Ready
                    </span>
                  )}
                </div>
              </div>

              {/* Render Action Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleRenderReel}
                    disabled={isRenderingReel || !generatedPost.reelScript?.length}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition active:scale-[0.98]"
                  >
                    {isRenderingReel ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Rendering Video ({reelJob?.progress || 0}%)...
                      </>
                    ) : renderedReelUrl ? (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Re-render Video Reel
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-white" />
                        Render 15-Sec MP4 Video
                      </>
                    )}
                  </button>

                  <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                    15s • 1080×1920 (9:16) • H.264 • 30 FPS
                  </span>
                </div>

                {renderedReelUrl && (
                  <a
                    href={renderedReelUrl}
                    download={`reel_${(business.name || 'local_business').toLowerCase().replace(/[^a-z0-9]/g, '_')}.mp4`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download MP4
                  </a>
                )}
              </div>

              {/* Real-time Rendering Progress */}
              {isRenderingReel && (
                <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                      {(reelJob?.progress || 0) < 20
                        ? 'Preparing Remotion composition bundle...'
                        : (reelJob?.progress || 0) < 85
                        ? `Rendering 450 vertical video frames (${reelJob?.progress || 0}%)...`
                        : 'Encoding high-definition H.264 MP4 with ffmpeg...'}
                    </span>
                    <span className="font-mono">{reelJob?.progress || 0}%</span>
                  </div>

                  <div className="w-full bg-indigo-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${reelJob?.progress || 5}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-indigo-700/80">
                    Server-side headless browser is rendering your business video. Rendering usually takes 15–30 seconds.
                  </p>
                </div>
              )}

              {/* Error Display */}
              {reelRenderError && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start justify-between gap-3 text-red-800 text-xs">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Render Failed</p>
                      <p className="text-red-700 mt-0.5">{reelRenderError}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRenderReel}
                    className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-900 font-bold rounded-lg transition shrink-0"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Rendered Video Player Card */}
              {renderedReelUrl && (
                <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-800 space-y-4">
                  <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                    {/* 9:16 Vertical Video Preview Player */}
                    <div className="relative w-[220px] shrink-0 aspect-[9/16] rounded-2xl overflow-hidden bg-black shadow-2xl border border-slate-700">
                      <video
                        src={renderedReelUrl}
                        controls
                        playsInline
                        autoPlay
                        loop
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 space-y-4 text-center md:text-left">
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-md border border-emerald-800">
                          Ready for Publishing
                        </span>
                        <span className="text-xs text-slate-400 font-mono">1080 × 1920 (9:16)</span>
                        <span className="text-xs text-slate-400">• 15 Seconds</span>
                        {reelJob?.sizeBytes && (
                          <span className="text-xs text-slate-400 font-mono">
                            • {(reelJob.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="font-black text-white text-lg">
                          Rendered Viral Local Reel Video
                        </h4>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          Your vertical video has been generated with dynamic pan/zoom photo motion, brand color accents, business watermark, and highlighted subtitles. Ready for Instagram Reels, YouTube Shorts, and WhatsApp Status.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                        <a
                          href={renderedReelUrl}
                          download={`reel_${(business.name || 'local_business').toLowerCase().replace(/[^a-z0-9]/g, '_')}.mp4`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition active:scale-[0.98]"
                        >
                          <Download className="w-4 h-4" />
                          Download MP4 Video
                        </a>
                        <a
                          href={renderedReelUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open Fullscreen
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3-Scene Script Breakdown */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Scene-by-Scene Script Breakdown
                </h4>
                <div className="space-y-3">
                  {generatedPost.reelScript?.map((scene, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2 hover:border-indigo-200 transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-700 text-xs">{scene.scene}</span>
                        <span className="text-[10px] text-slate-500 font-medium">Pacing: High Energy</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold">Visual Prompt: </span>
                        <span className="text-slate-800">{scene.visual}</span>
                      </div>
                      <div>
                        <span className="text-indigo-600 font-bold">Spoken Voiceover: </span>
                        <span className="text-slate-900 font-medium italic">"{scene.audio}"</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Template Picker Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <Layout className="w-5 h-5 text-indigo-600" />
                  Select Brand Layout (16 Template Skeletons)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose a template design for your {contentType} post. Real logo and brand colors will be applied automatically.
                </p>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1">
              <TemplateSelector
                templates={templates}
                selectedTemplateId={selectedTemplateId}
                contentType={contentType}
                isRendering={isRenderingCreative}
                onSelectTemplate={(tId) => {
                  setSelectedTemplateId(tId);
                  handleRenderCreative(tId);
                  setShowTemplateModal(false);
                }}
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Current selection: <strong className="text-slate-900">{selectedTemplateId}</strong>
              </span>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post & Creative Full Preview Modal */}
      {previewPostModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                    previewPostModal.status === 'published'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {previewPostModal.status}
                </span>
                <h3 className="font-black text-slate-900 text-sm sm:text-base line-clamp-1">
                  {previewPostModal.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewPostModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Rendered MP4 Video Player if available */}
              {previewPostModal.videoUrl && (
                <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                      <Film className="w-3.5 h-3.5 text-rose-500" />
                      Attached 15-Second Remotion MP4 Reel
                    </span>
                    <a
                      href={previewPostModal.videoUrl}
                      download={`reel_${previewPostModal.id}.mp4`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Download MP4
                    </a>
                  </div>
                  <div className="relative w-[180px] sm:w-[200px] aspect-[9/16] mx-auto rounded-xl overflow-hidden bg-black shadow-lg border border-slate-700">
                    <video
                      src={previewPostModal.videoUrl}
                      controls
                      playsInline
                      loop
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Creative Graphic Display */}
              {previewPostModal.imageUrl && (
                <div className="relative aspect-square max-w-md mx-auto rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 shadow-md">
                  <img
                    src={previewPostModal.imageUrl}
                    alt={previewPostModal.title}
                    className="w-full h-full object-contain"
                  />
                  {previewPostModal.imageUrl.includes('/generated/') ? (
                    <span className="absolute top-3 left-3 bg-indigo-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      1080×1080 Branded Graphic
                    </span>
                  ) : (
                    <span className="absolute top-3 left-3 bg-slate-900/80 text-white text-[10px] font-medium px-2.5 py-1 rounded-full shadow-sm">
                      Stock Image
                    </span>
                  )}
                </div>
              )}

              {/* Headline */}
              {previewPostModal.headline && (
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Headline</div>
                  <div className="font-bold text-slate-900 text-sm">{previewPostModal.headline}</div>
                </div>
              )}

              {/* Caption */}
              {previewPostModal.caption && (
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Post Caption</div>
                  <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{previewPostModal.caption}</div>
                </div>
              )}

              {/* CTA & Platform tags */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                {previewPostModal.cta && (
                  <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 px-3 py-1.5 rounded-xl font-bold">
                    CTA: {previewPostModal.cta}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  {previewPostModal.platforms?.map((plat) => (
                    <span
                      key={plat}
                      className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase"
                    >
                      {plat}
                    </span>
                  ))}
                  {previewPostModal.scheduledDate && (
                    <span className="text-slate-500 text-[11px] ml-2">
                      📅 {previewPostModal.scheduledDate} {previewPostModal.timeSlot}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
              <a
                href={previewPostModal.imageUrl}
                download="social-creative.png"
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Creative PNG</span>
              </a>
              <button
                onClick={() => setPreviewPostModal(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
