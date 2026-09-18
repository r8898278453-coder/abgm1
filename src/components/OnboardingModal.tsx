import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  MapPin,
  Palette,
  Plug,
  Zap,
  ArrowRight,
  ShieldCheck,
  X,
  Building,
  Target,
} from 'lucide-react';
import { BusinessProfile } from '../types';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: BusinessProfile;
  onComplete: (updated: BusinessProfile) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  business,
  onComplete,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [formData, setFormData] = useState({
    name: business.name,
    category: business.category,
    city: business.city,
    phone: business.phone,
    website: business.website,
    brandTone: business.brandKit?.brandTone || 'Professional & Tech-forward',
    preferredLanguage: business.brandKit?.preferredLanguage || 'English',
    targetAudience: business.brandKit?.targetAudience || '',
  });

  const [isAuditing, setIsAuditing] = useState(false);
  const [auditComplete, setAuditComplete] = useState(false);

  if (!isOpen) return null;

  const handleNextStep = () => {
    if (step === 3) {
      // Step 3 to 4: Trigger 5-Minute Instant Value Audit (Section 72)
      setIsAuditing(true);
      setTimeout(() => {
        setIsAuditing(false);
        setAuditComplete(true);
        setStep(4);
      }, 1200);
    } else if (step < 4) {
      setStep((prev) => (prev + 1) as any);
    } else {
      // Finish onboarding
      onComplete({
        ...business,
        name: formData.name,
        category: formData.category,
        city: formData.city,
        phone: formData.phone,
        website: formData.website,
        brandKit: {
          ...business.brandKit,
          brandTone: formData.brandTone,
          preferredLanguage: formData.preferredLanguage,
          targetAudience: formData.targetAudience.trim(),
        },
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-[10px] font-bold rounded-full">
                Step {step} of 4 • 5-Minute Setup Wizard
              </span>
            </div>
            <h2 className="text-lg font-black tracking-tight">
              {step === 1 && '1. Business Identity & Profile'}
              {step === 2 && '2. Brand Tone & Language Preferences'}
              {step === 3 && '3. Connected Accounts Verification'}
              {step === 4 && '4. Instant First-Value Growth Audit Ready!'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5 flex">
          <div
            className="bg-indigo-600 h-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-slate-600">
                Confirm your core business information. This sets up the Google Profile and local citation anchors.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Business Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">City / Region</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Official Website</label>
                  <input
                    type="text"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-slate-600">
                Configure your Brand Kit (Section 19). The AI will write in this voice across all reviews, posts, and WhatsApp responses.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Brand Voice Tone</label>
                  <select
                    value={formData.brandTone}
                    onChange={(e) => setFormData({ ...formData, brandTone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-medium"
                  >
                    <option value="Professional & Tech-forward">Professional & Tech-forward</option>
                    <option value="Friendly & Approachable">Friendly & Approachable</option>
                    <option value="Corporate & Authoritative">Corporate & Authoritative</option>
                    <option value="Warm & Consultative">Warm & Consultative</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Preferred Language</label>
                  <select
                    value={formData.preferredLanguage}
                    onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-medium"
                  >
                    <option value="English">English</option>
                    <option value="Hinglish">Hinglish (Hindi + English)</option>
                    <option value="Marathi">Marathi</option>
                    <option value="Hindi">Hindi</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Target Audience (Optional)</label>
                <input
                  type="text"
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  placeholder="e.g. Local families, pet owners, college students, corporate offices..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-medium placeholder-slate-400 text-sm"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-slate-600">
                Connected accounts currently authorized for autonomous publishing and review sync:
              </p>
              <div className="space-y-2">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <div>
                      <strong className="text-slate-900">Google Business Profile:</strong> Aaditech Solution (Verified)
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">Connected</span>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <div>
                      <strong className="text-slate-900">WhatsApp Business Platform:</strong> +91 98204 55120
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">Connected</span>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <div>
                      <strong className="text-slate-900">Telegram Bot Gateway:</strong> @AaditechManagerBot
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">Connected</span>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-950 text-sm">Initial Business Growth Score: 82/100</h4>
                  <p className="text-emerald-800 text-xs mt-1">
                    Google 3-Pack rank #1 in Thane West. Top 5 initial growth actions automatically prioritized.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <span>1. Google Review Auto-Replies Drafted</span>
                  <span className="text-emerald-600 font-bold">Ready (3 Pending)</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <span>2. Weekly B2B Post Creative Generated</span>
                  <span className="text-emerald-600 font-bold">Ready</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <span>3. High-Intent Lead Notification Active</span>
                  <span className="text-emerald-600 font-bold">WhatsApp + Telegram</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={() => setStep((prev) => Math.max(1, prev - 1) as any)}
            disabled={step === 1}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              step === 1 ? 'opacity-0 pointer-events-none' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Back
          </button>

          <button
            onClick={handleNextStep}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            {isAuditing ? (
              'Analyzing Business...'
            ) : step === 4 ? (
              'Enter Command Hub'
            ) : (
              <>
                Next Step <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
