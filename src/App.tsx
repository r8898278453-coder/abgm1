import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { AuditView } from './components/AuditView';
import { GoogleProfileView } from './components/GoogleProfileView';
import { LocalSeoView } from './components/LocalSeoView';
import { CompetitorsView } from './components/CompetitorsView';
import { ReviewsView } from './components/ReviewsView';
import { ContentStudioView } from './components/ContentStudioView';
import { CalendarView } from './components/CalendarView';
import { CampaignsView } from './components/CampaignsView';
import { LeadsCrmView } from './components/LeadsCrmView';
import { WebsiteBuilderView } from './components/WebsiteBuilderView';
import { TelegramBotView } from './components/TelegramBotView';
import { AutonomousEngineView, ApprovalRules } from './components/AutonomousEngineView';
import { TrustSafetyView } from './components/TrustSafetyView';
import { AgencyView } from './components/AgencyView';
import { MobileAppView } from './components/MobileAppView';
import { IntegrationsView } from './components/IntegrationsView';
import { BillingAdminView } from './components/BillingAdminView';
import { KnowledgeBaseView, DocumentItem, FaqItem } from './components/KnowledgeBaseView';
import { OnboardingModal } from './components/OnboardingModal';
import { AskAiModal } from './components/AskAiModal';
import { ResetSystemModal } from './components/ResetSystemModal';
import { AuthScreen } from './components/AuthScreen';
import { CreateCompanyModal } from './components/CreateCompanyModal';
import { Sparkles, Building2, Loader2, AlertTriangle, ArrowRight } from 'lucide-react';

import {
  getStoredUser,
  clearStoredSession,
  fetchUserCompanies,
  fetchCompanyData,
  saveCompanyData,
  fetchCompanyLeads,
  getStoredActiveCompanyId,
  setStoredActiveCompanyId,
  checkAuthSession,
  fetchCompanyReviews,
  createReviewApi,
  replyToReviewApi,
  deleteReviewApi,
  fetchCompanyPosts,
  createContentPostApi,
  updatePostStatusApi,
  deleteContentPostApi,
} from './services/authService';

import {
  initialBusiness,
  initialAuditItems,
  initialReviews,
  initialKeywords,
  initialCompetitors,
  initialPosts,
  initialCampaigns,
  initialLeads,
  initialAutonomousActions,
  initialGrowthScore,
  freshBlankBusiness,
  freshBlankGrowthScore,
} from './data/initialData';

import {
  UserRole,
  ViewMode,
  NavigationTab,
  BusinessProfile,
  AuditItem,
  ReviewItem,
  LeadItem,
  ContentPost,
  AutonomousAction,
  GrowthScore,
  AuthUser,
  CompanyRecord,
  KeywordRank,
  CompetitorData,
  Campaign,
} from './types';

export default function App() {
  // Authentication & Multi-Company States
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(() => getStoredActiveCompanyId());
  const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState<boolean>(false);
  const [loadingCompanies, setLoadingCompanies] = useState<boolean>(false);

  // Global System Controls
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [userRole, setUserRole] = useState<UserRole>('owner');
  const [viewMode, setViewMode] = useState<ViewMode>('web');
  const [isAutopilotOn, setIsAutopilotOn] = useState<boolean>(true);
  const [isEmergencyPaused, setIsEmergencyPaused] = useState<boolean>(false);
  const [notificationsCount, setNotificationsCount] = useState<number>(3);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isAskAiOpen, setIsAskAiOpen] = useState<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [isLiveMode, setIsLiveMode] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Core Data States - initialized with empty states and loaded cleanly from server
  const [business, setBusiness] = useState<BusinessProfile>(freshBlankBusiness);
  const [growthScore, setGrowthScore] = useState<GrowthScore>(freshBlankGrowthScore);
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [keywords, setKeywords] = useState<KeywordRank[]>([]);
  const [competitors, setCompetitors] = useState<CompetitorData[]>([]);
  const [contentPosts, setContentPosts] = useState<ContentPost[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [actions, setActions] = useState<AutonomousAction[]>([]);
  const [knowledgeDocs, setKnowledgeDocs] = useState<DocumentItem[]>([]);
  const [knowledgeFaqs, setKnowledgeFaqs] = useState<FaqItem[]>([]);
  const [approvalSettings, setApprovalSettings] = useState<ApprovalRules>({
    googlePosts: 'approval',
    reviewReplies: 'approval',
    socialPosts: 'auto',
    promotionalOffers: 'approval',
    profileEdits: 'approval',
    analyticsReports: 'auto',
  });
  const [isHolidayPaused, setIsHolidayPaused] = useState<boolean>(false);
  const [isLoadingCompanyData, setIsLoadingCompanyData] = useState<boolean>(true);

  // References for debounced auto-save & concurrency management
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);
  const activeCompanyIdRef = useRef<string | null>(activeCompanyId);

  useEffect(() => {
    activeCompanyIdRef.current = activeCompanyId;
  }, [activeCompanyId]);

  // Scoped localStorage key helper
  const getCompanyStorageKey = useCallback((companyId: string | null) => {
    return companyId ? `localpulse_app_state_${companyId}` : 'localpulse_app_state_guest';
  }, []);

  // Verify auth session on mount
  useEffect(() => {
    checkAuthSession().then((verifiedUser) => {
      if (verifiedUser) {
        setUser(verifiedUser);
        if (verifiedUser.role) setUserRole(verifiedUser.role);
      }
    });
  }, []);

  // Fetch companies when user is logged in
  useEffect(() => {
    if (!user) {
      setIsLoadingCompanyData(false);
      return;
    }
    setLoadingCompanies(true);
    fetchUserCompanies()
      .then((userCompanies) => {
        setCompanies(userCompanies);
        if (userCompanies.length > 0) {
          const storedId = getStoredActiveCompanyId();
          const targetCompany = userCompanies.find((c) => c.id === storedId) || userCompanies[0];
          setActiveCompanyId(targetCompany.id);
          setStoredActiveCompanyId(targetCompany.id);
          setIsLiveMode(true);
          loadCompanyData(targetCompany);
        } else {
          setActiveCompanyId(null);
          setIsLoadingCompanyData(false);
          // When no companies exist yet, provide sample demo data in preview mode
          setBusiness(initialBusiness);
          setGrowthScore(initialGrowthScore);
          setAuditItems(initialAuditItems);
          setReviews(initialReviews);
          setKeywords(initialKeywords);
          setCompetitors(initialCompetitors);
          setContentPosts(initialPosts);
          setCampaigns(initialCampaigns);
          setLeads(initialLeads);
          setActions(initialAutonomousActions);
          setIsLiveMode(false);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch user companies:', err);
        setIsLoadingCompanyData(false);
      })
      .finally(() => setLoadingCompanies(false));
  }, [user]);

  // Load isolated company data: Network-first with company-scoped localStorage fallback
  const loadCompanyData = async (comp: CompanyRecord) => {
    setIsLoadingCompanyData(true);
    isInitialLoadRef.current = true;

    // Clear any pending debounced auto-save from previous company
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    setSaveStatus('idle');

    setBusiness((prev) => ({
      ...prev,
      id: comp.id,
      name: comp.name,
      category: comp.category,
      city: comp.city,
      phone: comp.phone || prev.phone,
      website: comp.website || prev.website,
    }));

    const scopedStorageKey = getCompanyStorageKey(comp.id);

    try {
      // Prioritize live network request
      const [payload, companyReviews, companyPosts, companyLeads] = await Promise.all([
        fetchCompanyData(comp.id),
        fetchCompanyReviews(comp.id).catch((err) => {
          console.warn('Failed to load company reviews from MySQL:', err);
          return null;
        }),
        fetchCompanyPosts(comp.id).catch((err) => {
          console.warn('Failed to load company posts from MySQL:', err);
          return null;
        }),
        fetchCompanyLeads(comp.id).catch((err) => {
          console.warn('Failed to load company leads from MySQL:', err);
          return null;
        }),
      ]);

      const loadedGrowthScore = payload?.growth_score || freshBlankGrowthScore;
      const loadedAuditItems = Array.isArray(payload?.audit_items) ? payload.audit_items : [];
      const loadedKeywords = Array.isArray(payload?.keywords) ? payload.keywords : [];
      const loadedCompetitors = Array.isArray(payload?.competitors) ? payload.competitors : [];
      const loadedCampaigns = Array.isArray(payload?.campaigns) ? payload.campaigns : [];
      const loadedActions = Array.isArray(payload?.autonomous_actions) ? payload.autonomous_actions : [];

      let finalReviews: ReviewItem[] = [];
      if (companyReviews && Array.isArray(companyReviews) && companyReviews.length > 0) {
        finalReviews = companyReviews;
      } else if (payload && Array.isArray(payload.reviews)) {
        finalReviews = payload.reviews;
      }

      let finalPosts: ContentPost[] = [];
      if (companyPosts && Array.isArray(companyPosts) && companyPosts.length > 0) {
        finalPosts = companyPosts;
      } else if (payload && Array.isArray(payload.posts)) {
        finalPosts = payload.posts;
      }

      let finalLeads: LeadItem[] = [];
      if (companyLeads && Array.isArray(companyLeads) && companyLeads.length > 0) {
        finalLeads = companyLeads;
      } else if (payload && Array.isArray(payload.leads)) {
        finalLeads = payload.leads;
      }

      if (payload?.business) {
        setBusiness((prev) => ({
          ...prev,
          ...payload.business,
          id: comp.id,
          name: comp.name,
          category: comp.category,
          city: comp.city,
          phone: comp.phone || payload.business.phone || prev.phone,
          website: comp.website || payload.business.website || prev.website,
          brandKit: {
            ...prev.brandKit,
            ...(payload.business.brandKit || {}),
          },
        }));
      }

      setGrowthScore(loadedGrowthScore);
      setAuditItems(loadedAuditItems);
      setKeywords(loadedKeywords);
      setCompetitors(loadedCompetitors);
      setCampaigns(loadedCampaigns);
      setActions(loadedActions);
      setReviews(finalReviews);
      setContentPosts(finalPosts);
      setLeads(finalLeads);

      if (Array.isArray(payload?.knowledge_base?.documents)) {
        setKnowledgeDocs(payload.knowledge_base.documents);
      }
      if (Array.isArray(payload?.knowledge_base?.faqs)) {
        setKnowledgeFaqs(payload.knowledge_base.faqs);
      }
      if (payload?.engine_settings?.approvalSettings) {
        setApprovalSettings(payload.engine_settings.approvalSettings);
      }
      if (typeof payload?.engine_settings?.isHolidayPaused === 'boolean') {
        setIsHolidayPaused(payload.engine_settings.isHolidayPaused);
      }

      // Cache live server data into company-scoped localStorage
      try {
        localStorage.setItem(
          scopedStorageKey,
          JSON.stringify({
            business: {
              ...comp,
            },
            growthScore: loadedGrowthScore,
            auditItems: loadedAuditItems,
            keywords: loadedKeywords,
            competitors: loadedCompetitors,
            campaigns: loadedCampaigns,
            actions: loadedActions,
            reviews: finalReviews,
            contentPosts: finalPosts,
            leads: finalLeads,
            savedAt: Date.now(),
          })
        );
      } catch (storageErr) {
        console.warn('Failed to cache server data to company-scoped localStorage:', storageErr);
      }
    } catch (networkErr) {
      console.warn(`Network load failed for company ${comp.id}, falling back to company-scoped offline cache:`, networkErr);
      // Offline fallback: ONLY use company-scoped localStorage if the network call fails
      try {
        const cachedRaw = localStorage.getItem(scopedStorageKey);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached.business) setBusiness(cached.business);
          if (cached.growthScore) setGrowthScore(cached.growthScore);
          if (cached.auditItems) setAuditItems(cached.auditItems);
          if (cached.keywords) setKeywords(cached.keywords);
          if (cached.competitors) setCompetitors(cached.competitors);
          if (cached.campaigns) setCampaigns(cached.campaigns);
          if (cached.actions) setActions(cached.actions);
          if (cached.reviews) setReviews(cached.reviews);
          if (cached.contentPosts) setContentPosts(cached.contentPosts);
          if (cached.leads) setLeads(cached.leads);
        }
      } catch (cacheErr) {
        console.error('Failed to parse offline cache for company:', cacheErr);
      }
    } finally {
      setIsLoadingCompanyData(false);
      // Settle initial load before allowing auto-save to fire
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 600);
    }
  };

  // Switch company handler - cleanly resets timers and loads fresh company data
  const handleSelectCompany = (companyId: string) => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    const comp = companies.find((c) => c.id === companyId);
    if (!comp) return;
    setActiveCompanyId(companyId);
    setStoredActiveCompanyId(companyId);
    setIsLiveMode(true);
    loadCompanyData(comp);
  };

  // New company created handler
  const handleCompanyCreated = (newComp: CompanyRecord) => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    setCompanies((prev) => [...prev, newComp]);
    setActiveCompanyId(newComp.id);
    setStoredActiveCompanyId(newComp.id);
    setIsCreateCompanyOpen(false);
    setIsLiveMode(true);
    loadCompanyData(newComp);
  };

  // User Logout
  const handleLogout = () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    clearStoredSession();
    setUser(null);
    setCompanies([]);
    setActiveCompanyId(null);
    setIsLoadingCompanyData(false);
    isInitialLoadRef.current = true;
    setBusiness(freshBlankBusiness);
    setGrowthScore(freshBlankGrowthScore);
    setAuditItems([]);
    setReviews([]);
    setKeywords([]);
    setCompetitors([]);
    setContentPosts([]);
    setCampaigns([]);
    setLeads([]);
    setActions([]);
  };

  // Debounced auto-save (1.5s delay) for changes to growth score, audit items, keywords, competitors, campaigns, and autonomous actions
  useEffect(() => {
    if (!activeCompanyId || isLoadingCompanyData || isInitialLoadRef.current || !isLiveMode) {
      return;
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    const companyIdToSave = activeCompanyId;

    autoSaveTimerRef.current = setTimeout(async () => {
      // Guard against company having switched during the debounce window
      if (activeCompanyIdRef.current !== companyIdToSave) {
        return;
      }

      const payload = {
        business,
        growth_score: growthScore,
        audit_items: auditItems,
        keywords,
        competitors,
        campaigns,
        autonomous_actions: actions,
        knowledge_base: {
          documents: knowledgeDocs,
          faqs: knowledgeFaqs,
        },
        engine_settings: {
          approvalSettings,
          isAutopilotOn,
          isHolidayPaused,
        },
      };

      setSaveStatus('saving');
      try {
        await saveCompanyData(companyIdToSave, payload);
        setSaveStatus('saved');
        // Update company-scoped localStorage cache
        const scopedStorageKey = getCompanyStorageKey(companyIdToSave);
        localStorage.setItem(
          scopedStorageKey,
          JSON.stringify({
            business,
            growthScore,
            auditItems,
            keywords,
            competitors,
            campaigns,
            actions,
            reviews,
            contentPosts,
            leads,
            savedAt: Date.now(),
          })
        );
        setTimeout(() => {
          setSaveStatus((current) => (current === 'saved' ? 'idle' : current));
        }, 2000);
      } catch (err) {
        console.warn(`Auto-save failed for company ${companyIdToSave}:`, err);
        setSaveStatus('idle');
      }
    }, 1500);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [
    growthScore,
    auditItems,
    keywords,
    competitors,
    campaigns,
    actions,
    activeCompanyId,
    isLoadingCompanyData,
    isLiveMode,
    business,
    reviews,
    contentPosts,
    leads,
    getCompanyStorageKey,
  ]);

  // Factory reset to clean slate for real business onboarding
  const handleFactoryReset = () => {
    setBusiness(freshBlankBusiness);
    setReviews([]);
    setLeads([]);
    setContentPosts([]);
    setCampaigns([]);
    setActions([]);
    setIsLiveMode(true);
    setIsOnboardingOpen(true);
  };

  // Reload Master Blueprint Demo Data for end-to-end testing
  const handleLoadDemoData = () => {
    setBusiness(initialBusiness);
    setReviews(initialReviews);
    setLeads(initialLeads);
    setContentPosts(initialPosts);
    setCampaigns(initialCampaigns);
    setActions(initialAutonomousActions);
    setAuditItems(initialAuditItems);
    setIsLiveMode(false);
  };

  const handleImportData = (imported: any) => {
    if (imported.business) setBusiness(imported.business);
    if (imported.reviews) setReviews(imported.reviews);
    if (imported.leads) setLeads(imported.leads);
    if (imported.posts) setContentPosts(imported.posts);
    if (imported.contentPosts) setContentPosts(imported.contentPosts);
    if (imported.campaigns) setCampaigns(imported.campaigns);
    if (imported.actions) setActions(imported.actions);
    if (imported.auditItems) setAuditItems(imported.auditItems);
    if (typeof imported.isLiveMode === 'boolean') setIsLiveMode(imported.isLiveMode);
  };

  // Handlers for state updates
  const handleFixAuditItem = (id: string) => {
    setAuditItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'pass' as const, resolved: true } : item))
    );
  };

  const handleQuickApproveReviews = () => {
    const defaultReply = 'Thank you for choosing Apex Tech Care! We appreciate your trust in our repair lab.';
    const unreplied = reviews.filter((r) => !r.replied);
    setReviews((prev) =>
      prev.map((r) =>
        !r.replied
          ? {
              ...r,
              replied: true,
              replyText: defaultReply,
              replyDate: 'Just now',
            }
          : r
      )
    );
    unreplied.forEach(async (r) => {
      try {
        await replyToReviewApi(r.id, defaultReply, activeCompanyId || undefined);
      } catch (err) {
        console.error('Failed to quick-approve review in MySQL:', err);
      }
    });
  };

  const handleAddReviewReply = async (reviewId: string, replyText: string) => {
    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? {
              ...r,
              replied: true,
              replyText,
              replyDate: 'Just now',
            }
          : r
      )
    );
    try {
      await replyToReviewApi(reviewId, replyText, activeCompanyId || undefined);
    } catch (err) {
      console.error('Failed to save review reply to MySQL:', err);
    }
  };

  const handleAddNewReview = async (review: Partial<ReviewItem>) => {
    if (review.id && !review.id.startsWith('temp_') && !review.id.startsWith('rev_')) {
      setReviews((prev) => [review as ReviewItem, ...prev.filter((r) => r.id !== review.id)]);
      return;
    }

    const tempId = `rev_${Date.now()}`;
    const rating = review.rating || 5;
    const sentiment: 'positive' | 'neutral' | 'negative' =
      review.sentiment || (rating >= 4 ? 'positive' : rating === 3 ? 'neutral' : 'negative');
    const fullReview: ReviewItem = {
      id: tempId,
      author: review.author || 'Anonymous Customer',
      rating,
      sentiment,
      content: review.content || '',
      relativeTime: review.relativeTime || 'Just now',
      date: review.date || new Date().toISOString().split('T')[0],
      replied: false,
      isOperationalIssue: !!review.isOperationalIssue,
      topic: review.topic || 'Customer Feedback',
      source: review.source || 'google',
    };
    setReviews((prev) => [fullReview, ...prev]);
    try {
      const created = await createReviewApi({
        ...fullReview,
        companyId: activeCompanyId || undefined,
      });
      if (created && created.id) {
        setReviews((prev) => prev.map((r) => (r.id === tempId ? created : r)));
      }
    } catch (err) {
      console.error('Failed to create review in MySQL:', err);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
  };

  const handleAddNewPost = async (post: ContentPost) => {
    if (post.id && !post.id.startsWith('temp_') && !post.id.startsWith('post_')) {
      setContentPosts((prev) => [post, ...prev.filter((p) => p.id !== post.id)]);
      return;
    }

    setContentPosts((prev) => [post, ...prev]);
    try {
      const created = await createContentPostApi({
        ...post,
        companyId: activeCompanyId || undefined,
      });
      if (created && created.id) {
        setContentPosts((prev) => prev.map((p) => (p.id === post.id ? created : p)));
      }
    } catch (err) {
      console.error('Failed to save post to MySQL:', err);
    }
  };

  const handlePublishPost = async (postId: string) => {
    setContentPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, status: 'published' as const } : p))
    );
  };

  const handleDeletePost = async (postId: string) => {
    setContentPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleUpdateLeadStage = (leadId: string, stage: LeadItem['stage']) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, stage } : l))
    );
  };

  const handleAddKeyword = (newKwText: string) => {
    if (!newKwText.trim()) return;
    const kwItem: KeywordRank = {
      id: `kw_${Date.now()}`,
      keyword: newKwText.trim(),
      rank: Math.floor(Math.random() * 4) + 2,
      previousRank: Math.floor(Math.random() * 4) + 4,
      searchVolume: `${Math.floor(Math.random() * 800) + 200}/mo`,
      gridRankings: {
        vashi: Math.floor(Math.random() * 3) + 1,
        nerul: Math.floor(Math.random() * 5) + 2,
        sanpada: Math.floor(Math.random() * 3) + 1,
        belapur: Math.floor(Math.random() * 5) + 2,
      },
    };
    setKeywords((prev) => [kwItem, ...prev]);
  };

  const handleDeleteKeyword = (kwId: string) => {
    setKeywords((prev) => prev.filter((k) => k.id !== kwId));
  };

  const handleApproveAction = (actionId: string) => {
    const targetAction = actions.find((a) => a.id === actionId);
    setActions((prev) =>
      prev.map((a) => (a.id === actionId ? { ...a, status: 'approved' as const } : a))
    );

    // If review reply action, mark pending reviews as replied
    if (targetAction && (targetAction.action.toLowerCase().includes('review') || targetAction.agent.includes('Review'))) {
      setReviews((prev) =>
        prev.map((r) =>
          r.status === 'pending'
            ? { ...r, status: 'replied', replyText: r.replyText || 'Thank you for choosing our services! We appreciate your trust.' }
            : r
        )
      );
    }
    // If content action, promote scheduled post to published
    if (targetAction && (targetAction.action.toLowerCase().includes('post') || targetAction.agent.includes('Content'))) {
      setContentPosts((prev) =>
        prev.map((p, idx) => (idx === 0 && p.status === 'scheduled' ? { ...p, status: 'published' } : p))
      );
    }
  };

  // Switch to Telegram view if ViewMode is set to telegram
  const renderedTab = viewMode === 'telegram' ? 'telegram' : activeTab;

  // Check if URL indicates an active password reset flow
  const isResetPasswordUrl = typeof window !== 'undefined' && (
    window.location.pathname.includes('reset-password') ||
    new URLSearchParams(window.location.search).has('token')
  );

  // Render AuthScreen Barrier if not signed in or actively performing password reset
  if (!user || isResetPasswordUrl) {
    return <AuthScreen onAuthenticated={(u) => setUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Header Navigation */}
      <Header
        business={business}
        activeRole={userRole}
        setActiveRole={setUserRole}
        viewMode={viewMode}
        setViewMode={setViewMode}
        isAutopilotOn={isAutopilotOn}
        setIsAutopilotOn={setIsAutopilotOn}
        notificationsCount={notificationsCount}
        onClearNotifications={() => setNotificationsCount(0)}
        isEmergencyPaused={isEmergencyPaused}
        setIsEmergencyPaused={setIsEmergencyPaused}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
        isLiveMode={isLiveMode}
        onOpenResetModal={() => setIsResetModalOpen(true)}
        saveStatus={saveStatus}
        user={user}
        companies={companies}
        activeCompanyId={activeCompanyId || undefined}
        onSelectCompany={handleSelectCompany}
        onOpenCreateCompany={() => setIsCreateCompanyOpen(true)}
        onLogout={handleLogout}
      />


      {/* Main View Shell with Bento Spacing */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-3 sm:px-6 py-6 gap-6 items-start">
        {/* Left Navigation Sidebar */}
        <Sidebar
          currentTab={renderedTab as any}
          setCurrentTab={(tab) => {
            setActiveTab(tab as any);
            if (viewMode === 'telegram' && tab !== 'telegram') {
              setViewMode('web');
            }
          }}
          unansweredReviewsCount={(reviews || []).filter((r) => !r.replied).length}
          criticalIssuesCount={(auditItems || []).filter((a) => a.severity === 'critical' && a.status !== 'pass').length}
          newLeadsCount={(leads || []).filter((l) => l.stage === 'new').length}
          isAutopilotOn={isAutopilotOn}
        />

        {/* Content Area */}
        <main className="flex-1 min-w-0">
          {/* Emergency Alert Banner if activated */}
          {isEmergencyPaused && (
            <div className="mb-6 bg-rose-50 border border-rose-200 rounded-3xl p-5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🛑</span>
                <div>
                  <div className="font-bold text-rose-900 text-sm">Automations Paused via Emergency Stop</div>
                  <div className="text-xs text-rose-700">Scheduled social posts, review replies & WhatsApp broadcasts are temporarily halted.</div>
                </div>
              </div>
              <button
                onClick={() => setIsEmergencyPaused(false)}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-2xl transition shadow-xs"
              >
                Resume All
              </button>
            </div>
          )}

          {/* Sample Data Demo Banner */}
          {!isLiveMode && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-amber-900 text-sm">Sample Data Active</div>
                  <div className="text-xs text-amber-700">
                    Sample data — not yet your real business. All shown metrics and reviews are demonstration fixtures.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setIsCreateCompanyOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Set Up Real Business</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Loading Skeleton during real company data fetch */}
          {isLoadingCompanyData ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Loading Company Workspace</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Fetching live metrics, audit checklists, keywords, and CRM leads securely from server...
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Active View Router */}
              {viewMode === 'mobile' ? (
                <MobileAppView
                  business={business}
                  growthScore={growthScore}
                  auditItems={auditItems}
                  reviews={reviews}
                  posts={contentPosts}
                  leads={leads}
                  onOpenTelegram={() => setViewMode('telegram')}
                  onNavigateToTab={(tab) => {
                    setActiveTab(tab);
                    setViewMode('web');
                  }}
                  isAutopilotOn={isAutopilotOn}
                />
              ) : (
                <>
                  {renderedTab === 'dashboard' && (
                    <DashboardView
                      business={business}
                      growthScore={growthScore}
                      auditItems={auditItems}
                      reviews={reviews}
                      posts={contentPosts}
                      leads={leads}
                      onNavigate={setActiveTab}
                      onQuickApproveReviews={handleQuickApproveReviews}
                      onPublishPost={handlePublishPost}
                      unansweredReviews={(reviews || []).filter((r) => !r.replied).length}
                      newLeadsCount={(leads || []).filter((l) => l.stage === 'new').length}
                    />
                  )}

                  {renderedTab === 'audit' && (
                    <AuditView
                      auditItems={auditItems}
                      growthScore={growthScore}
                      business={business}
                      onResolveItem={handleFixAuditItem}
                      onFixItem={handleFixAuditItem}
                      onNavigate={setActiveTab}
                    />
                  )}

                  {(renderedTab === 'google_profile' || renderedTab === 'google') && (
                    <GoogleProfileView
                      business={business}
                      companyId={activeCompanyId || undefined}
                      onUpdateBusiness={setBusiness}
                      onNavigate={setActiveTab}
                    />
                  )}

                  {(renderedTab === 'local_seo' || renderedTab === 'seo') && (
                    <LocalSeoView
                      keywords={keywords}
                      onAddKeyword={handleAddKeyword}
                      onDeleteKeyword={handleDeleteKeyword}
                      city={business.city}
                      category={business.category}
                    />
                  )}

                  {renderedTab === 'competitors' && (
                    <CompetitorsView
                      competitors={competitors}
                      onNavigate={setActiveTab}
                      onUpdateCompetitors={setCompetitors}
                    />
                  )}

                  {renderedTab === 'reviews' && (
                    <ReviewsView
                      reviews={reviews}
                      business={business}
                      companyId={activeCompanyId || undefined}
                      onAddReply={handleAddReviewReply}
                      onAddNewReview={handleAddNewReview}
                      onDeleteReview={handleDeleteReview}
                      onRefreshReviews={() => {
                        const comp = companies.find((c) => c.id === activeCompanyId);
                        if (comp) loadCompanyData(comp);
                      }}
                    />
                  )}

                  {renderedTab === 'content' && (
                    <ContentStudioView
                      business={business}
                      posts={contentPosts}
                      companyId={activeCompanyId || undefined}
                      onAddNewPost={handleAddNewPost}
                      onPublishPost={handlePublishPost}
                      onDeletePost={handleDeletePost}
                      onNavigate={setActiveTab}
                      onUpdateBusiness={setBusiness}
                    />
                  )}

                  {renderedTab === 'calendar' && (
                    <CalendarView
                      posts={contentPosts}
                      companyId={activeCompanyId || undefined}
                      onNavigate={setActiveTab}
                      onUpdatePostStatus={handlePublishPost}
                      onDeletePost={handleDeletePost}
                      onAddNewPost={handleAddNewPost}
                    />
                  )}

                  {renderedTab === 'campaigns' && (
                    <CampaignsView
                      campaigns={campaigns}
                      posts={contentPosts}
                      companyId={activeCompanyId || undefined}
                      onUpdateCampaigns={setCampaigns}
                      onAddNewPost={handleAddNewPost}
                      onPublishPost={handlePublishPost}
                      onDeletePost={handleDeletePost}
                    />
                  )}

              {renderedTab === 'leads' && (
                <LeadsCrmView
                  leads={leads}
                  companyId={activeCompanyId || undefined}
                  onLeadAdded={(newLead) => setLeads((prev) => [newLead, ...prev.filter((l) => l.id !== newLead.id)])}
                  onUpdateLeadStage={handleUpdateLeadStage}
                />
              )}

              {renderedTab === 'website' && (
                <WebsiteBuilderView
                  business={business}
                />
              )}

              {renderedTab === 'telegram' && (
                <TelegramBotView
                  business={business}
                  onNavigate={setActiveTab}
                />
              )}

              {renderedTab === 'autonomous' && (
                <AutonomousEngineView
                  actions={actions}
                  isAutopilotOn={isAutopilotOn}
                  setIsAutopilotOn={setIsAutopilotOn}
                  isEmergencyPaused={isEmergencyPaused}
                  setIsEmergencyPaused={setIsEmergencyPaused}
                  onApproveAction={handleApproveAction}
                  approvalSettings={approvalSettings}
                  onUpdateApprovalSettings={setApprovalSettings}
                />
              )}

              {(renderedTab === 'safety' || renderedTab === 'ai_control') && (
                <TrustSafetyView
                  isEmergencyPaused={isEmergencyPaused}
                  setIsEmergencyPaused={setIsEmergencyPaused}
                  isHolidayPaused={isHolidayPaused}
                  setIsHolidayPaused={setIsHolidayPaused}
                />
              )}

              {renderedTab === 'agency' && (
                <AgencyView
                  business={business}
                  onNavigate={setActiveTab}
                  companies={companies}
                  activeCompanyId={activeCompanyId || undefined}
                  onSelectCompany={handleSelectCompany}
                  onOpenCreateCompany={() => setIsCreateCompanyOpen(true)}
                />
              )}

              {renderedTab === 'integrations' && (
                <IntegrationsView
                  business={business}
                  companyId={activeCompanyId || 'comp_aaditech_main'}
                  onUpdateBusiness={setBusiness}
                />
              )}

              {renderedTab === 'billing' && (
                <BillingAdminView
                  business={business}
                />
              )}

              {renderedTab === 'knowledge' && (
                <KnowledgeBaseView
                  business={business}
                  documents={knowledgeDocs}
                  faqs={knowledgeFaqs}
                  onUpdateDocuments={setKnowledgeDocs}
                  onUpdateFaqs={setKnowledgeFaqs}
                />
              )}
            </>
          )}
            </>
          )}
        </main>
      </div>

      {/* 5-Minute Onboarding & Setup Wizard (Section 3 & 72) */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        business={business}
        onComplete={(updated) => setBusiness(updated)}
      />

      {/* Floating 24/7 Ask AI Copilot (Section 24 & 66) */}
      <aside aria-label="Ask AI Copilot Floating Action" className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsAskAiOpen(true)}
          className="group flex items-center gap-2.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105 border border-indigo-400/30"
        >
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
          </div>
          <span className="font-bold text-xs sm:text-sm tracking-wide">Ask AI Copilot</span>
          <span className="hidden sm:inline-block bg-indigo-800/80 text-[10px] font-mono px-2 py-0.5 rounded-full text-indigo-200 border border-indigo-700">
            24/7
          </span>
        </button>
      </aside>

      <AskAiModal
        isOpen={isAskAiOpen}
        onClose={() => setIsAskAiOpen(false)}
        business={business}
      />

      {/* First Company Setup Wizard if zero companies exist */}
      <CreateCompanyModal
        isOpen={companies.length === 0 && !loadingCompanies}
        isFirstCompany={true}
        onCompanyCreated={handleCompanyCreated}
      />

      {/* Add New Company Modal triggered from Header dropdown */}
      <CreateCompanyModal
        isOpen={isCreateCompanyOpen}
        isFirstCompany={false}
        onClose={() => setIsCreateCompanyOpen(false)}
        onCompanyCreated={handleCompanyCreated}
      />

      {/* Complete System Reset & Mode Controller (Section 83) */}
      <ResetSystemModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        isLiveMode={isLiveMode}
        onFactoryReset={handleFactoryReset}
        onLoadDemoData={handleLoadDemoData}
        onImportData={handleImportData}
        currentState={{
          business,
          reviews,
          leads,
          posts: contentPosts,
          campaigns,
          actions,
          auditItems,
          growthScore,
        }}
      />
    </div>
  );
}
