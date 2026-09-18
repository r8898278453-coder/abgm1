import React, { useState, useEffect, useCallback } from 'react';
import {
  Plug,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Globe,
  Radio,
  Key,
  X,
  Loader2,
  Trash2,
  HelpCircle,
  Check,
  MessageSquare,
  Send,
  CreditCard,
  IndianRupee,
  Copy,
} from 'lucide-react';
import { BusinessProfile } from '../types';
import {
  sendWhatsAppMessageApi,
  createRazorpayOrderApi,
  createPaymentLinkApi,
  WhatsAppSendResult,
} from '../services/authService';
import { API_BASE_URL } from '../config/apiConfig';

interface RequiredField {
  key: string;
  label: string;
  placeholder: string;
  secret: boolean;
  required: boolean;
}

interface IntegrationItem {
  id: string;
  name: string;
  category: 'Google' | 'Meta' | 'Messaging' | 'Platform' | 'Social';
  icon: string;
  description: string;
  docsUrl?: string;
  requiredFields: RequiredField[];
  connected: boolean;
  status: 'connected' | 'disconnected' | 'error';
  statusText: string;
  lastTestedAt?: string | null;
  lastError?: string | null;
  maskedCredentials?: Record<string, string>;
}

interface IntegrationsViewProps {
  business: BusinessProfile;
  companyId?: string;
  onUpdateBusiness?: (business: BusinessProfile) => void;
}

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({
  companyId = 'comp_aaditech_main',
}) => {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [activeModalItem, setActiveModalItem] = useState<IntegrationItem | null>(null);

  // Modal form states
  const [formCredentials, setFormCredentials] = useState<Record<string, string>>({});
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [savingConnection, setSavingConnection] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [systemTelegramActive, setSystemTelegramActive] = useState<boolean>(false);

  // WhatsApp Tester States
  const [isWaTestOpen, setIsWaTestOpen] = useState(false);
  const [waTestPhone, setWaTestPhone] = useState('8898278453');
  const [waTestMessage, setWaTestMessage] = useState('Namaste! This is a live test notification from Aaditech BGA via WhatsApp Cloud API.');
  const [waSending, setWaSending] = useState(false);
  const [waSendResult, setWaSendResult] = useState<WhatsAppSendResult | null>(null);

  // Razorpay Tester States
  const [isRzpTestOpen, setIsRzpTestOpen] = useState(false);
  const [rzpTestAmount, setRzpTestAmount] = useState<number>(799);
  const [rzpTestDescription, setRzpTestDescription] = useState('Growth Tier Monthly Subscription / Client Retainer');
  const [rzpCustomerName, setRzpCustomerName] = useState('Aaditech Client');
  const [rzpCustomerPhone, setRzpCustomerPhone] = useState('8898278453');
  const [rzpCreating, setRzpCreating] = useState(false);
  const [rzpResult, setRzpResult] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Fetch real integration statuses from backend
  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/integrations?companyId=${encodeURIComponent(companyId)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.integrations)) {
        setIntegrations(data.integrations);
        setSystemTelegramActive(Boolean(data.systemTelegramConfigured));
      }
    } catch (err) {
      console.warn('Failed to load integrations:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  // Open configuration modal
  const openConfigModal = (item: IntegrationItem) => {
    setActiveModalItem(item);
    setTestResult(null);

    // Prepopulate with existing non-secret or masked values
    const initialFields: Record<string, string> = {};
    item.requiredFields.forEach((field) => {
      initialFields[field.key] = item.maskedCredentials?.[field.key] || '';
    });
    setFormCredentials(initialFields);
  };

  // Close modal
  const closeModal = () => {
    setActiveModalItem(null);
    setTestResult(null);
    setFormCredentials({});
  };

  // Test credentials live against the real provider API
  const handleTestLive = async (itemToTest: IntegrationItem, credsToTest: Record<string, string>) => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/integrations/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: itemToTest.id,
          credentials: credsToTest,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: data.message || 'Verification successful! Live API responded correctly.',
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Connection failed. Please check credentials and permissions.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Network error attempting to contact verification endpoint.',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Save credentials to MySQL backend
  const handleSaveCredentials = async () => {
    if (!activeModalItem) return;

    setSavingConnection(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/integrations/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          provider: activeModalItem.id,
          credentials: formCredentials,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchIntegrations();
        closeModal();
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Failed to save credentials to database.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Error communicating with database server.',
      });
    } finally {
      setSavingConnection(false);
    }
  };

  // Disconnect / Delete integration
  const handleDisconnect = async (providerId: string) => {
    try {
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        if (!window.confirm('Are you sure you want to disconnect this integration and remove stored API credentials?')) {
          return;
        }
      }
    } catch {
      // Proceed safely in iframe
    }

    try {
      setSyncingId(providerId);
      const res = await fetch(`${API_BASE_URL}/api/integrations/${providerId}?companyId=${encodeURIComponent(companyId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        await fetchIntegrations();
      }
    } catch (err) {
      console.warn('Failed to disconnect:', err);
    } finally {
      setSyncingId(null);
    }
  };

  // Direct Live Sync / Ping
  const handleLivePing = async (item: IntegrationItem) => {
    setSyncingId(item.id);
    try {
      await handleTestLive(item, item.maskedCredentials || {});
      await fetchIntegrations();
    } finally {
      setSyncingId(null);
    }
  };

  // WhatsApp Test Handler
  const handleSendWhatsAppTest = async () => {
    if (!waTestPhone.trim()) return;
    setWaSending(true);
    setWaSendResult(null);
    try {
      const res = await sendWhatsAppMessageApi({
        to: waTestPhone,
        message: waTestMessage,
        companyId,
      });
      setWaSendResult(res);
    } catch (err: any) {
      setWaSendResult({
        success: false,
        error: err?.message || 'Error executing request',
      });
    } finally {
      setWaSending(false);
    }
  };

  // Razorpay Link Handler
  const handleGeneratePaymentLink = async () => {
    if (!rzpTestAmount || rzpTestAmount <= 0) return;
    setRzpCreating(true);
    setRzpResult(null);
    try {
      const res = await createPaymentLinkApi({
        amount: rzpTestAmount,
        description: rzpTestDescription,
        customerName: rzpCustomerName,
        customerPhone: rzpCustomerPhone,
        companyId,
      });
      setRzpResult(res);
    } catch (err: any) {
      setRzpResult({
        success: false,
        error: err?.message || 'Failed to create payment link',
      });
    } finally {
      setRzpCreating(false);
    }
  };

  // Razorpay Order Handler
  const handleCreateRazorpayOrder = async () => {
    if (!rzpTestAmount || rzpTestAmount <= 0) return;
    setRzpCreating(true);
    setRzpResult(null);
    try {
      const res = await createRazorpayOrderApi({
        amount: rzpTestAmount,
        currency: 'INR',
        notes: {
          purpose: rzpTestDescription,
          customer: rzpCustomerName,
          companyId,
        },
        companyId,
      });
      setRzpResult(res);
    } catch (err: any) {
      setRzpResult({
        success: false,
        error: err?.message || 'Failed to create Razorpay order',
      });
    } finally {
      setRzpCreating(false);
    }
  };

  const connectedCount = integrations.filter((i) => i.connected).length;

  return (
    <div className="space-y-6">
      {/* Top Banner with Honest Status */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-bold rounded-full flex items-center gap-1">
              <Plug className="w-3 h-3 text-indigo-400" /> Multi-Tenant API Hub
            </span>
            <span className="text-xs text-slate-300 font-semibold">
              {loading ? 'Checking...' : `${connectedCount} of ${integrations.length} Active`}
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">API Integrations & Webhook Connectors</h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
            Real credential management and live connection status. Each provider validates directly against its official API endpoint before activating.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchIntegrations}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Status
          </button>
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-4 py-2.5 rounded-2xl">
            <Radio className={`w-3.5 h-3.5 ${connectedCount > 0 ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
            <div className="text-left">
              <div className="text-xs font-bold text-white">
                {connectedCount > 0 ? 'Production Gateway Ready' : 'Setup Required'}
              </div>
              <div className="text-[10px] text-slate-400">
                {systemTelegramActive ? 'System Telegram Active' : 'Zero Fake Demo Fallbacks'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Real Integrations */}
      {loading && integrations.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Connecting to API Gateway & Verifying Credentials...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map((item) => (
            <div
              key={item.id}
              className={`bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between transition ${
                item.connected
                  ? 'border-emerald-200 hover:border-emerald-300'
                  : 'border-slate-200 hover:border-indigo-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-2xl border border-slate-200 shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm">{item.name}</h3>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md">
                          {item.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs">
                        {item.connected ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {item.statusText}
                          </span>
                        ) : item.status === 'error' ? (
                          <span className="text-rose-600 font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Authentication Error
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-slate-400" /> {item.statusText}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => openConfigModal(item)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                        item.connected
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      <Key className="w-3 h-3" />
                      {item.connected ? 'Manage Keys' : 'Configure API'}
                    </button>
                    {item.connected && (
                      <button
                        onClick={() => handleDisconnect(item.id)}
                        title="Disconnect and remove credentials"
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                  {item.description}
                </p>

                {/* Display masked credentials summary if configured */}
                {item.maskedCredentials && Object.keys(item.maskedCredentials).length > 0 && (
                  <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[11px] font-mono text-slate-600 space-y-1">
                    {Object.entries(item.maskedCredentials).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between">
                        <span className="text-slate-400">{k}:</span>
                        <span className="font-semibold text-slate-700">{v || '—'}</span>
                      </div>
                    ))}
                  </div>
                )}

                {item.lastError && (
                  <div className="mt-2 text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2">
                    <strong>Error:</strong> {item.lastError}
                  </div>
                )}
              </div>

              {/* Bottom Verification Details */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <span>Last Live Check:</span>
                  <strong className="text-slate-700 font-medium">
                    {item.lastTestedAt ? new Date(item.lastTestedAt).toLocaleTimeString() : 'Not Tested'}
                  </strong>
                </div>

                <div className="flex items-center gap-2">
                  {item.id === 'whatsapp_cloud' && (
                    <button
                      onClick={() => setIsWaTestOpen(true)}
                      className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 px-2.5 py-1 rounded-lg transition"
                    >
                      <MessageSquare className="w-3 h-3 text-emerald-600" />
                      Test Dispatch
                    </button>
                  )}

                  {item.id === 'razorpay_gateway' && (
                    <button
                      onClick={() => setIsRzpTestOpen(true)}
                      className="flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 px-2.5 py-1 rounded-lg transition"
                    >
                      <CreditCard className="w-3 h-3 text-indigo-600" />
                      Test Checkout / Link
                    </button>
                  )}

                  {item.connected && (
                    <button
                      onClick={() => handleLivePing(item)}
                      disabled={syncingId === item.id}
                      className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold transition"
                    >
                      <RefreshCw className={`w-3 h-3 ${syncingId === item.id ? 'animate-spin' : ''}`} />
                      {syncingId === item.id ? 'Verifying...' : 'Live Ping Test'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Real Architecture Disclosure Box */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-600">
        <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-900">Production Security & Direct API Credential Binding:</span>
          <p className="mt-1 leading-relaxed">
            API credentials are tied strictly to this company&apos;s workspace and stored securely in your database. Tokens are masked on the frontend, never logged in plaintext, and verified directly with official third-party servers (Meta Graph API, Google Cloud APIs, Telegram Bot Father, Razorpay).
          </p>
        </div>
      </div>

      {/* Configuration Modal */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl">
                  {activeModalItem.icon}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{activeModalItem.name}</h3>
                  <p className="text-xs text-slate-500">Enter your official API credentials to establish live sync.</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Official Docs Link */}
            {activeModalItem.docsUrl && (
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-indigo-900">
                  <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Need help getting keys?</span>
                </div>
                <a
                  href={activeModalItem.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-700 font-bold hover:underline flex items-center gap-1"
                >
                  Official Docs <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Dynamic Form Fields */}
            <div className="space-y-3.5">
              {activeModalItem.requiredFields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>
                      {field.label} {field.required && <span className="text-rose-500">*</span>}
                    </span>
                    {field.secret && (
                      <span className="text-[10px] text-slate-400 font-normal">Encrypted & Masked</span>
                    )}
                  </label>
                  <input
                    type={field.secret ? 'password' : 'text'}
                    value={formCredentials[field.key] || ''}
                    placeholder={field.placeholder}
                    onChange={(e) =>
                      setFormCredentials({
                        ...formCredentials,
                        [field.key]: e.target.value,
                      })
                    }
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono bg-white"
                  />
                </div>
              ))}
            </div>

            {/* Test Result Message Box */}
            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {testResult.success ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">{testResult.success ? 'API Verification Passed' : 'Verification Failed'}</div>
                  <div className="mt-0.5 text-[11px] leading-relaxed">{testResult.message}</div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
              <button
                type="button"
                onClick={() => handleTestLive(activeModalItem, formCredentials)}
                disabled={testingConnection}
                className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5"
              >
                {testingConnection ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                {testingConnection ? 'Verifying with API...' : 'Test Live Connection'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCredentials}
                  disabled={savingConnection}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  {savingConnection ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  {savingConnection ? 'Saving...' : 'Save & Activate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* WhatsApp Cloud API Live Tester Modal */}
      {isWaTestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xl text-emerald-600">
                  💬
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">WhatsApp Cloud API Dispatcher</h3>
                  <p className="text-xs text-slate-500">Test live outbound messaging via official Meta Graph API v21.0</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsWaTestOpen(false);
                  setWaSendResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-900 leading-relaxed">
              <strong>Enterprise Meta Cloud Protocol:</strong> Sends real-time messages directly to any customer WhatsApp number. If WhatsApp Cloud credentials are saved in your workspace, it executes in the background via Meta API; otherwise, it provides a 1-click wa.me instant link fallback.
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Recipient Phone Number *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">+91</span>
                  <input
                    type="text"
                    value={waTestPhone}
                    onChange={(e) => setWaTestPhone(e.target.value)}
                    placeholder="8898278453"
                    className="w-full text-xs pl-12 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-mono bg-white"
                  />
                </div>
                <p className="text-[10px] text-slate-400">10-digit mobile number. Country code (+91) is auto-formatted.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Message Text *</label>
                <textarea
                  rows={3}
                  value={waTestMessage}
                  onChange={(e) => setWaTestMessage(e.target.value)}
                  placeholder="Enter message text or quotation summary..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 bg-white leading-relaxed"
                />
              </div>
            </div>

            {waSendResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                  waSendResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {waSendResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                  )}
                  <span>
                    {waSendResult.success
                      ? waSendResult.method === 'meta_cloud_api'
                        ? 'Dispatched via Meta WhatsApp Cloud API!'
                        : 'WhatsApp Direct Link Ready'
                      : 'Dispatch Notice'}
                  </span>
                </div>

                <p className="text-[11px] leading-relaxed">{waSendResult.message || waSendResult.error}</p>

                {waSendResult.messageId && (
                  <div className="font-mono text-[10px] bg-white/80 p-1.5 rounded border border-emerald-200">
                    <strong>Meta Message ID:</strong> {waSendResult.messageId}
                  </div>
                )}

                {waSendResult.waLink && (
                  <a
                    href={waSendResult.waLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition"
                  >
                    Open in WhatsApp <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsWaTestOpen(false);
                  setWaSendResult(null);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSendWhatsAppTest}
                disabled={waSending || !waTestPhone.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                {waSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {waSending ? 'Dispatching...' : 'Send Live WhatsApp Message'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Razorpay Gateway Live Tester Modal */}
      {isRzpTestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl text-indigo-600">
                  💳
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Razorpay Payment Gateway & Link Hub</h3>
                  <p className="text-xs text-slate-500">Test live order generation, payment links & UPI collect</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsRzpTestOpen(false);
                  setRzpResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-900 leading-relaxed">
              <strong>Secure Multi-Tenant Gateway:</strong> Generates GST-compliant Razorpay Orders and Payment Links. Clients can pay via Google Pay, PhonePe, Paytm UPI, Credit/Debit Cards, or NetBanking.
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Amount (INR) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    min={1}
                    value={rzpTestAmount}
                    onChange={(e) => setRzpTestAmount(Number(e.target.value))}
                    className="w-full text-xs pl-7 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-mono font-bold bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Customer Phone</label>
                <input
                  type="text"
                  value={rzpCustomerPhone}
                  onChange={(e) => setRzpCustomerPhone(e.target.value)}
                  placeholder="8898278453"
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-mono bg-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Customer Name</label>
              <input
                type="text"
                value={rzpCustomerName}
                onChange={(e) => setRzpCustomerName(e.target.value)}
                placeholder="Client / Business Name"
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Description / Purpose</label>
              <input
                type="text"
                value={rzpTestDescription}
                onChange={(e) => setRzpTestDescription(e.target.value)}
                placeholder="e.g. Website Advance or Monthly Retainer"
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>

            {rzpResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs space-y-2.5 ${
                  rzpResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5">
                    {rzpResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                    )}
                    {rzpResult.success ? 'Payment Gateway Link Generated' : 'Generation Failed'}
                  </span>
                  {rzpResult.amount && (
                    <span className="font-mono font-bold px-2 py-0.5 bg-white/80 rounded border border-emerald-200">
                      ₹{rzpResult.amount}
                    </span>
                  )}
                </div>

                {rzpResult.order?.id && (
                  <div className="text-[11px] font-mono bg-white/80 p-2 rounded-lg border border-emerald-200 space-y-1">
                    <div><strong>Razorpay Order ID:</strong> {rzpResult.order.id}</div>
                    <div><strong>Key ID:</strong> {rzpResult.keyId} ({rzpResult.mode || 'test'})</div>
                  </div>
                )}

                {rzpResult.shortUrl && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] text-slate-600 font-medium">Customer Payment URL:</div>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={rzpResult.shortUrl}
                        className="w-full text-[11px] font-mono bg-white px-2.5 py-1.5 rounded-lg border border-slate-300 select-all"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(rzpResult.shortUrl);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2500);
                        }}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedLink ? 'Copied' : 'Copy'}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <a
                        href={rzpResult.shortUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:underline"
                      >
                        Open Checkout Page <ExternalLink className="w-3 h-3" />
                      </a>
                      {rzpCustomerPhone && (
                        <button
                          onClick={() => {
                            const waText = `Namaste ${rzpCustomerName}! Here is the secure payment link from Aaditech Solution for ${rzpTestDescription} (Amount: ₹${rzpTestAmount}):\n\n${rzpResult.shortUrl}\n\nThank you!`;
                            const waUrl = `https://wa.me/91${rzpCustomerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waText)}`;
                            window.open(waUrl, '_blank');
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline ml-3"
                        >
                          Send on WhatsApp 💬
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsRzpTestOpen(false);
                  setRzpResult(null);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCreateRazorpayOrder}
                  disabled={rzpCreating || rzpTestAmount <= 0}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                >
                  Create Order
                </button>
                <button
                  type="button"
                  onClick={handleGeneratePaymentLink}
                  disabled={rzpCreating || rzpTestAmount <= 0}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  {rzpCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                  {rzpCreating ? 'Generating...' : 'Generate Payment Link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
