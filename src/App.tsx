import {apiRequest} from './services/authService';
import {workspaceDraft} from './services/workspaceDraft';
import {canonicalJson} from '../shared/canonicalJson';
import {createWorkspaceSaver} from './services/workspaceSaver';
import {PublicationControls} from './components/PublicationControls';
import {DailyWorkReport} from './components/DailyWorkReport';
import { PublishingReview } from './components/PublishingReview';
import { NotificationStatus } from './components/NotificationStatus';
import { ActionHistory } from './components/ActionHistory';
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
  publishContentPostApi,
  deleteContentPostApi,
  scanKeywordRankApi,
  refreshAllKeywordRanksApi,
  updateLeadStageApi,
  ApiRequestError,
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
  const [isAutopilotOn, setIsAutopilotOn] = useState<boolean>(false);
  const [isEmergencyPaused, setIsEmergencyPaused] = useState<boolean>(false);
  const [notificationsCount, setNotificationsCount] = useState<number>(3);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isAskAiOpen, setIsAskAiOpen] = useState<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [isLiveMode, setIsLiveMode] = useState<boolean>(true);
  const [workspaceLoadState, setWorkspaceLoadState] = useState<'loading' | 'ready' | 'offline' | 'error'>('loading');
  const [cachedSnapshotAt, setCachedSnapshotAt] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

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
    socialPosts: 'approval',
    promotionalOffers: 'approval',
    profileEdits: 'approval',
    analyticsReports: 'auto',
  });
  const [isHolidayPaused, setIsHolidayPaused] = useState<boolean>(false);
  const [isLoadingCompanyData, setIsLoadingCompanyData] = useState<boolean>(true);

  // References for debounced auto-save & concurrency management
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);
  const workspaceBaselineRef=useRef<string|null>(null),workspaceDraftRef=useRef<string|null>(null);
  const [workspaceSaveEpoch,setWorkspaceSaveEpoch]=useState(0);
  const activeCompanyIdRef = useRef<string | null>(activeCompanyId);
  const workspaceLoadGenerationRef = useRef(0);
  const workspaceSaverRef=useRef<ReturnType<typeof createWorkspaceSaver>|null>(null);
  const [workspaceWritePaused,setWorkspaceWritePaused]=useState(false);

  useEffect(() => {
    activeCompanyIdRef.current = activeCompanyId;
  }, [activeCompanyId]);

  // Scoped localStorage key helper
  const getCompanyStorageKey = useCallback((companyId: string | null) => {
    return companyId && user?.id ? `localpulse_app_state_${user.id}_${companyId}` : 'localpulse_app_state_guest';
  }, [user?.id]);

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
          // When no companies exist yet, initialize with a clean slate in live mode and prompt company creation
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
          setIsLiveMode(true);
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
    setWorkspaceLoadState('loading');workspaceSaverRef.current=null;setWorkspaceWritePaused(false);
    setCachedSnapshotAt(null);
    const generation = ++workspaceLoadGenerationRef.current;
    activeCompanyIdRef.current = comp.id;
    const isCurrentLoad = () => workspaceLoadGenerationRef.current === generation && activeCompanyIdRef.current === comp.id;
    setIsLoadingCompanyData(true);
    isInitialLoadRef.current = true;workspaceBaselineRef.current=null;workspaceDraftRef.current=null;

    // Clear any pending debounced auto-save from previous company
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    setSaveStatus('idle');

    setKnowledgeDocs([]);
    setKnowledgeFaqs([]);
    setReviews([]);
    setContentPosts([]);
    setLeads([]);
    setAuditItems([]);
    setKeywords([]);
    setCompetitors([]);
    setCampaigns([]);
    setActions([]);
    setGrowthScore(freshBlankGrowthScore);
    setIsAutopilotOn(false);
    setIsHolidayPaused(false);
    setApprovalSettings({ googlePosts: 'approval', reviewReplies: 'approval', socialPosts: 'approval', promotionalOffers: 'approval', profileEdits: 'approval', analyticsReports: 'auto' });
    setBusiness({
      ...freshBlankBusiness,
      brandKit: { ...freshBlankBusiness.brandKit },
      connectedAccounts: { ...freshBlankBusiness.connectedAccounts },
      id: comp.id, name: comp.name, category: comp.category, city: comp.city,
      phone: comp.phone || '', website: comp.website || '',
    });

    const scopedStorageKey = getCompanyStorageKey(comp.id);

    try {
      // Prioritize live network request
      const [snapshot, companyReviews, companyPosts, companyLeads] = await Promise.all([
        fetchCompanyData(comp.id),
        fetchCompanyReviews(comp.id),
        fetchCompanyPosts(comp.id),
        fetchCompanyLeads(comp.id),
      ]);

      if (!isCurrentLoad()) return;
      const payload=snapshot.data;
      workspaceSaverRef.current=createWorkspaceSaver(snapshot.version,isCurrentLoad,(data,expected)=>saveCompanyData(comp.id,data,expected));
      setWorkspaceLoadState('ready');
      const loadedGrowthScore = payload?.growth_score || freshBlankGrowthScore;
      const loadedAuditItems = Array.isArray(payload?.audit_items) ? payload.audit_items : [];
      const loadedKeywords = Array.isArray(payload?.keywords) ? payload.keywords : [];
      const loadedCompetitors = Array.isArray(payload?.competitors) ? payload.competitors : [];
      const loadedCampaigns = Array.isArray(payload?.campaigns) ? payload.campaigns : [];
      const loadedActions = Array.isArray(payload?.autonomous_actions) ? payload.autonomous_actions : [];

      // Canonical row APIs own these collections, including successful empty results.
      const finalReviews=companyReviews,finalPosts=companyPosts,finalLeads=companyLeads;

      if (payload?.business) {
        setBusiness((prev) => ({
          ...prev,
          ...payload.business,
          id: comp.id,
          name: comp.name,
          category: comp.category,
          city: comp.city,
          phone: comp.phone || payload.business.phone || '',
          website: comp.website || payload.business.website || '',
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
            userId: user?.id, companyId: comp.id,
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
      if (!isCurrentLoad()) return;
      setWorkspaceLoadState('error');
      // An explicit access denial must never fall back to previously cached private data.
      const denied = networkErr instanceof ApiRequestError && [401, 403, 404].includes(networkErr.status);
      if (!denied) {
        try {
          const cached = JSON.parse(localStorage.getItem(scopedStorageKey) || 'null');
          if (cached?.userId === user?.id && cached?.companyId === comp.id &&
              typeof cached.savedAt === 'number' && Number.isFinite(cached.savedAt)) {
            setCachedSnapshotAt(cached.savedAt);
            setWorkspaceLoadState('offline');
          }
        } catch {
          // Invalid cache is not a successful load and cannot enable autosave.
        }
      }
    } finally {
      if (isCurrentLoad()) {
        setIsLoadingCompanyData(false);

      }
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
  const handleLogout = (clearSession = true) => {
    workspaceLoadGenerationRef.current++;workspaceSaverRef.current=null;setWorkspaceWritePaused(false);
    activeCompanyIdRef.current = null;
    setKnowledgeDocs([]);
    setKnowledgeFaqs([]);
    setIsAutopilotOn(false);
    setIsHolidayPaused(false);
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    if (clearSession) clearStoredSession();
    setUser(null);
    setCompanies([]);
    setActiveCompanyId(null);
    setIsLoadingCompanyData(false);
    isInitialLoadRef.current = true;workspaceBaselineRef.current=null;workspaceDraftRef.current=null;
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

  // A session change in another tab invalidates this tab's data and pending work.
  useEffect(() => {
    const onSessionStorage = (event: StorageEvent) => {
      if (event.storageArea === localStorage &&
          (event.key === null || (event.key === 'abga_auth_token' && event.oldValue !== event.newValue))) {
        handleLogout(false);
      }
    };
    window.addEventListener('storage', onSessionStorage);
    return () => window.removeEventListener('storage', onSessionStorage);
  }, []);

  // Debounced editable-profile saves; observed metrics never create profile writes.
  useEffect(() => {
    if (!activeCompanyId || isLoadingCompanyData || !isLiveMode || workspaceLoadState !== 'ready' || workspaceWritePaused) {
      return;
    }

    const payload=workspaceDraft({business,keywords,competitors,campaigns,knowledgeDocs,knowledgeFaqs,approvalSettings,isHolidayPaused});
    const fingerprint=canonicalJson(payload);workspaceDraftRef.current=fingerprint;
    if(isInitialLoadRef.current||workspaceBaselineRef.current===null){isInitialLoadRef.current=false;workspaceBaselineRef.current=fingerprint;return;}
    if(fingerprint===workspaceBaselineRef.current){if(!workspaceSaverRef.current?.pendingCount)setSaveStatus(current=>current==='saving'?'idle':current);return;}
    setSaveStatus('saving');

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    const companyIdToSave = activeCompanyId;
    const generationToSave = workspaceLoadGenerationRef.current;
    const isCurrentSave = () => activeCompanyIdRef.current === companyIdToSave &&
      workspaceLoadGenerationRef.current === generationToSave;

    autoSaveTimerRef.current = setTimeout(async () => {
      // Guard against company having switched during the debounce window
      if (!isCurrentSave()) {
        return;
      }



      setSaveStatus('saving');
      try {
        const saver=workspaceSaverRef.current;if(!saver)throw new Error('Workspace revision unavailable');
        await saver.enqueue(payload);
        if (!isCurrentSave()) return;
        workspaceBaselineRef.current=fingerprint;setWorkspaceSaveEpoch(epoch=>epoch+1);
        setSaveStatus(workspaceDraftRef.current===fingerprint?'saved':'saving');
        // Update company-scoped localStorage cache
        const scopedStorageKey = getCompanyStorageKey(companyIdToSave);
        try{localStorage.setItem(
          scopedStorageKey,
          JSON.stringify({
            userId: user?.id, companyId: companyIdToSave,
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
        );}catch{console.warn('Workspace saved; local cache unavailable.');}
        setTimeout(() => {
          if (isCurrentSave()) setSaveStatus((current) => (current === 'saved' ? 'idle' : current));
        }, 2000);
      } catch (err) {
        console.warn(`Auto-save failed for company ${companyIdToSave}:`, err);
        if (isCurrentSave()){setSaveStatus('error');setWorkspaceWritePaused(true);}
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
    workspaceLoadState,
    workspaceWritePaused,
    workspaceSaveEpoch,
    business,
    reviews,
    contentPosts,
    leads,
    getCompanyStorageKey,
    knowledgeDocs,
    knowledgeFaqs,
    approvalSettings,
    isAutopilotOn,
    isHolidayPaused,
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

  };

  // Callbacks mirror already acknowledged CRUD; the review view owns each request.
  const handleAddNewReview = (review: Partial<ReviewItem>) => {
    if(review.id)setReviews(prev=>[review as ReviewItem,...prev.filter(item=>item.id!==review.id)]);
  };
  const handleDeleteReview = (reviewId:string) => setReviews(prev=>prev.filter(review=>review.id!==reviewId));

  const handleAddNewPost = (post:ContentPost) => setContentPosts(previous=>[post,...previous.filter(item=>item.id!==post.id)]);

  const refreshPublishedPosts=async(_postId:string)=>{
    const company=activeCompanyId,generation=workspaceLoadGenerationRef.current;if(!company)return;
    try{const posts=await fetchCompanyPosts(company);if(activeCompanyIdRef.current===company&&workspaceLoadGenerationRef.current===generation)setContentPosts(posts);}
    catch{if(activeCompanyIdRef.current===company&&workspaceLoadGenerationRef.current===generation)setWorkspaceLoadState('error');}
  };
  const handlePublishPost = async (postId: string) => {
    const company=activeCompanyId;if(!company)return;
    const version=contentPosts.find(post=>post.id===postId)?.sourceVersion;
    const result=await publishContentPostApi(postId,company,undefined,version);
    if(activeCompanyIdRef.current!==company)return;
    if(!result.success)console.warn('Publishing not confirmed:',result.error || result.result?.message);
    await refreshPublishedPosts(postId);
  };

  const handleDeletePost = (postId:string) => setContentPosts(previous=>previous.filter(post=>post.id!==postId));

  const handleUpdateLeadStage=async(leadId:string,stage:LeadItem['stage'])=>{
    const company=activeCompanyId,generation=workspaceLoadGenerationRef.current;
    const expectedStage=leads.find(lead=>lead.id===leadId)?.stage;
    if(!company||!expectedStage)throw new Error('Reload the lead before updating.');
    const result=await updateLeadStageApi(leadId,stage,company,expectedStage);
    if(activeCompanyIdRef.current!==company||workspaceLoadGenerationRef.current!==generation)return;
    if(result.success!==true||result.lead?.id!==leadId||result.lead?.company_id!==company||result.lead.stage!==stage)throw new Error('Lead update unconfirmed. Refresh before retrying.');
    setLeads(previous=>previous.map(lead=>lead.id===leadId?{...lead,stage}:lead));
  };

  const handleAddKeyword=async(newKwText:string)=>{
    const company=activeCompanyId,generation=workspaceLoadGenerationRef.current,target=newKwText.trim();
    if(!company||!target)throw new Error('Select a workspace and keyword.');
    const result=await scanKeywordRankApi(company,target,business.city);
    if(activeCompanyIdRef.current!==company||workspaceLoadGenerationRef.current!==generation)return;
    if(result.success!==true||result.companyId!==company||!result.keyword||result.keyword.keyword.toLowerCase()!==target.toLowerCase())throw new Error('Rank scan acknowledgement unconfirmed. Reload workspace.');
    setKeywords(previous=>{const index=previous.findIndex(item=>item.keyword.toLowerCase()===target.toLowerCase());return index<0?[result.keyword,...previous]:previous.map((item,i)=>i===index?result.keyword:item);});
    if(!workspaceSaverRef.current?.observe(result.previousVersion,result.version))setWorkspaceWritePaused(true);
  };
  const handleRefreshAllKeywords=async()=>{
    const company=activeCompanyId,generation=workspaceLoadGenerationRef.current;if(!company)throw new Error('Select a workspace.');
    const result=await refreshAllKeywordRanksApi(company);
    if(activeCompanyIdRef.current!==company||workspaceLoadGenerationRef.current!==generation)return;
    if(result.success!==true||result.companyId!==company||!Array.isArray(result.keywords))throw new Error('Rank refresh unconfirmed.');
    setKeywords(result.keywords);if(!workspaceSaverRef.current?.observe(result.previousVersion,result.version))setWorkspaceWritePaused(true);
  };
  const handleScanSingleKeyword=handleAddKeyword;
  const handleAddCompetitorFromSerp=async(comp:{name:string;rating:number;reviewsCount:number})=>{
    const company=activeCompanyId,generation=workspaceLoadGenerationRef.current;if(!company)throw new Error('Select a workspace.');
    const data=await apiRequest<any>(`/api/companies/${encodeURIComponent(company)}/competitors`,{method:'POST',body:JSON.stringify({name:comp.name,refreshNow:false})});
    if(activeCompanyIdRef.current!==company||workspaceLoadGenerationRef.current!==generation)return;
    if(data.success!==true||data.companyId!==company||!Array.isArray(data.competitors))throw new Error('Competitor save unconfirmed.');
    setCompetitors(data.competitors);if(!workspaceSaverRef.current?.observe(data.previousVersion,data.version))setWorkspaceWritePaused(true);
  };

  const handleDeleteKeyword = async (kwId: string) => {
    const updatedKeywords = keywords.filter((k) => k.id !== kwId);
    setKeywords(updatedKeywords);

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
        setIsAutopilotOn={() => setActiveTab('autonomous')}
        notificationsCount={notificationsCount}
        onClearNotifications={() => setNotificationsCount(0)}
        isEmergencyPaused={isEmergencyPaused}
        setIsEmergencyPaused={() => setActiveTab('autonomous')}
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
                  <div className="text-xs text-rose-700">New work at protected execution boundaries is paused. In-flight requests may complete; direct channel coverage varies.</div>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('autonomous')}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-2xl transition shadow-xs"
              >
                Review execution controls
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
          ) : isLiveMode && activeCompanyId && workspaceLoadState !== 'ready' ? (
            <div role="status" className="bg-white border border-amber-200 rounded-2xl p-6 space-y-3">
              <h2 className="font-bold">Workspace unavailable — changes are paused</h2>
              <p>{workspaceLoadState === 'offline' && cachedSnapshotAt
                ? `A cached snapshot exists from ${new Date(cachedSnapshotAt).toLocaleString()}. Reconnect to view or edit this workspace.`
                : 'The workspace could not be loaded. Reconnect before making changes.'}</p>
              <button className="rounded-lg bg-indigo-600 text-white px-4 py-2" onClick={() => {
                const company = companies.find(c => c.id === activeCompanyId);
                if (company) void loadCompanyData(company);
              }}>Retry workspace load</button>
            </div>
          ) : (
            <>
              {workspaceWritePaused&&<div role="alert" className="border border-amber-300 rounded-xl p-3 mb-4">Workspace save unconfirmed or conflicting. Automatic saves are paused. Unsaved edits have not been confirmed. <button onClick={()=>{const company=companies.find(c=>c.id===activeCompanyId);if(company)void loadCompanyData(company);}}>Reload workspace before saving</button></div>}
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
                    <>
                    <DashboardView
                      business={business}
                      growthScore={growthScore}
                      auditItems={auditItems}
                      reviews={reviews}
                      posts={contentPosts}
                      leads={leads}
                      onNavigate={setActiveTab}

                      onPublishPost={handlePublishPost}
                      unansweredReviews={(reviews || []).filter((r) => !r.replied).length}
                      newLeadsCount={(leads || []).filter((l) => l.stage === 'new').length}
                    />
                    {activeCompanyId && <PublicationControls key={`${user?.id}:${activeCompanyId}`} companyId={activeCompanyId} />}
                    {activeCompanyId && <DailyWorkReport key={`${user?.id}:${activeCompanyId}`} companyId={activeCompanyId} />}
                    {activeCompanyId && <ActionHistory key={`${user?.id}:${activeCompanyId}`} companyId={activeCompanyId} />}
                    {activeCompanyId && <NotificationStatus key={`${user?.id}:${activeCompanyId}`} companyId={activeCompanyId} />}
                    {activeCompanyId && <PublishingReview key={`${user?.id}:${activeCompanyId}`} companyId={activeCompanyId} />}
                    </>
                  )}

                  {renderedTab === 'audit' && (
                    <AuditView
                      key={`${user?.id}:${activeCompanyId}`}
                      companyId={activeCompanyId || undefined}
                      growthScore={growthScore}
                      business={business}
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
                      key={`${user?.id}:${activeCompanyId}`}
                      keywords={keywords}
                      onAddKeyword={handleAddKeyword}
                      onDeleteKeyword={handleDeleteKeyword}
                      onRefreshAll={handleRefreshAllKeywords}
                      onScanSingle={handleScanSingleKeyword}
                      onAddCompetitor={handleAddCompetitorFromSerp}
                      city={business.city}
                      category={business.category}
                    />
                  )}

                  {renderedTab === 'competitors' && (
                    <CompetitorsView
                      key={`${user?.id}:${activeCompanyId}`}
                      competitors={competitors}
                      companyId={activeCompanyId || undefined}
                      onNavigate={setActiveTab}
                      onUpdateCompetitors={(items,ack)=>{
                        if(!ack||ack.companyId!==activeCompanyIdRef.current)return;
                        setCompetitors(items);
                        if(ack.revisionUnconfirmed||!workspaceSaverRef.current?.observe(ack.previousVersion,ack.version,ack.revisionDelta??1))setWorkspaceWritePaused(true);
                      }}
                    />
                  )}

                  {renderedTab === 'reviews' && (
                    <ReviewsView
                      key={`${user?.id}:${activeCompanyId}`}
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
                      key={`${user?.id}:${activeCompanyId}`}
                      business={business}
                      posts={contentPosts}
                      companyId={activeCompanyId || undefined}
                      onAddNewPost={handleAddNewPost}
                      onPublishPost={refreshPublishedPosts}
                      onRefreshPosts={refreshPublishedPosts}
                      onDeletePost={handleDeletePost}
                      onNavigate={setActiveTab}
                      onUpdateBusiness={setBusiness}
                    />
                  )}

                  {renderedTab === 'calendar' && (
                    <CalendarView
                      business={business}
                      key={`${user?.id}:${activeCompanyId}`}
                      posts={contentPosts}
                      companyId={activeCompanyId || undefined}
                      onNavigate={setActiveTab}
                      onUpdatePostStatus={refreshPublishedPosts}
                      onDeletePost={handleDeletePost}
                      onAddNewPost={handleAddNewPost}
                    />
                  )}

                  {renderedTab === 'campaigns' && (
                    <CampaignsView
                      key={`${user?.id}:${activeCompanyId}`}
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
                  key={`${user?.id}:${activeCompanyId}`}
                  leads={leads}
                  companyId={activeCompanyId || undefined}
                  onLeadAdded={(newLead) => setLeads((prev) => [newLead, ...prev.filter((l) => l.id !== newLead.id)])}
                  onUpdateLeadStage={handleUpdateLeadStage}
                />
              )}

              {renderedTab === 'website' && (
                <WebsiteBuilderView
                  key={`${user?.id}:${activeCompanyId}`}
                  business={business}
                />
              )}

              {renderedTab === 'telegram' && (
                <TelegramBotView
                  key={`${user?.id}:${activeCompanyId}`}
                  companyId={activeCompanyId || undefined}
                  business={business}
                  onNavigate={setActiveTab}
                />
              )}

              {renderedTab === 'autonomous' && (
                <AutonomousEngineView
                  key={`${user?.id}:${activeCompanyId}`}
                  companyId={activeCompanyId || undefined}
                  actions={actions}
                  isAutopilotOn={isAutopilotOn}
                  setIsAutopilotOn={setIsAutopilotOn}
                  isEmergencyPaused={isEmergencyPaused}
                  setIsEmergencyPaused={setIsEmergencyPaused}
                  approvalSettings={approvalSettings}
                  onUpdateApprovalSettings={setApprovalSettings}
                />
              )}

              {(renderedTab === 'safety' || renderedTab === 'ai_control') && (
                <TrustSafetyView key={`${user?.id}:${activeCompanyId}`} onNavigate={setActiveTab} isPlatformAdmin={!!user?.is_platform_admin} holidayDraft={isHolidayPaused} onHolidayDraftChange={setIsHolidayPaused}/>

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
                  key={`${user?.id}:${activeCompanyId}`}
                  business={business}
                  companyId={activeCompanyId || undefined}
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
        key={`${user?.id}:${activeCompanyId}:${isOnboardingOpen}`}
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
        key={`${user?.id}:${activeCompanyId}:${isAskAiOpen}`}
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
