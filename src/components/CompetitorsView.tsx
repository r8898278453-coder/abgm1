import {competitorVersion} from '../../shared/competitors';
import React, { useState, useEffect, useRef } from 'react';
import {
  Users2,
  Star,
  TrendingUp,
  Camera,
  Share2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Plus,
  X,
  Edit2,
  Trash2,
  RefreshCw,
  Clock,
  History,
  CheckCircle2,
  Database,
} from 'lucide-react';
import { CompetitorData } from '../types';
import { DataStatusBadge } from './DataStatusBadge';
import { apiRequest } from '../services/authService';

interface CompetitorsViewProps {
  competitors: CompetitorData[];
  companyId?: string;
  onNavigate: (tab: any) => void;
  onUpdateCompetitors?: (competitors: CompetitorData[], acknowledgement?: any) => void;
}

export const CompetitorsView: React.FC<CompetitorsViewProps> = ({
  competitors,
  companyId,
  onNavigate,
  onUpdateCompetitors,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [rating, setRating] = useState('');
  const [reviewsCount, setReviewsCount] = useState('');
  const [refreshNow, setRefreshNow] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refresh & History States
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [refreshingCompId, setRefreshingCompId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // History Inspector Modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedCompForHistory, setSelectedCompForHistory] = useState<CompetitorData | null>(null);
  const [observationHistory, setObservationHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const handleOpenAdd = () => {
    setEditingCompId(null);
    setName('');
    setRating('');
    setReviewsCount('');
    setRefreshNow(true);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (comp: CompetitorData) => {
    setEditingCompId(comp.id);
    editingVersion.current=competitorVersion(comp);
    setName(comp.name);
    setRating(comp.rating !== null && comp.rating !== undefined ? comp.rating.toString() : '');
    setReviewsCount(comp.reviewsCount !== null && comp.reviewsCount !== undefined ? comp.reviewsCount.toString() : '');
    setRefreshNow(false);
    setIsAddModalOpen(true);
  };

  const mounted=useRef(true),historySequence=useRef(0);
  const [historyError,setHistoryError]=useState(false);
  const [writeUnconfirmed,setWriteUnconfirmed]=useState(false);
  const editingVersion=useRef<string|null>(null);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;historySequence.current++;};},[]);
  const accept=(data:any)=>{
    if(!mounted.current)return false;
    if(data?.success!==true||data.companyId!==companyId||!Array.isArray(data.competitors))throw new Error('Competitor acknowledgement unconfirmed. Reload workspace.');
    onUpdateCompetitors?.(data.competitors,data);return true;
  };
  const handleSaveCompetitor=async(e:React.FormEvent)=>{
    e.preventDefault();if(!companyId||!name.trim()||writeUnconfirmed||isSubmitting)return;
    const parsedRating=rating.trim()?Number(rating):null,parsedReviews=reviewsCount.trim()?Number(reviewsCount):null;
    if(parsedRating!==null&&(!Number.isFinite(parsedRating)||parsedRating<0||parsedRating>5)||parsedReviews!==null&&(!Number.isInteger(parsedReviews)||parsedReviews<0)){
      setStatusMessage({type:'error',text:'Enter a rating from 0 to 5 and a non-negative whole review count.'});return;
    }
    const expected=editingCompId?editingVersion.current:null;setIsSubmitting(true);
    try{
      const data=await apiRequest<any>(`/api/companies/${encodeURIComponent(companyId)}/competitors${editingCompId?'/'+encodeURIComponent(editingCompId):''}`,{method:editingCompId?'PUT':'POST',body:JSON.stringify({name:name.trim(),rating:parsedRating,reviewsCount:parsedReviews,...(editingCompId?{expectedVersion:expected}:{refreshNow})})});
      if(accept(data)){setIsAddModalOpen(false);setStatusMessage({type:'success',text:data.refreshStatus==='SAVED'?'Competitor and provider observation saved.':data.refreshStatus==='UNCONFIRMED'?'Competitor saved manually; refresh outcome unconfirmed. Reload workspace.':data.refreshStatus==='UNAVAILABLE'?'Competitor saved manually; provider refresh unavailable.':'Manual competitor observation saved.'});}
    }catch{if(mounted.current){setWriteUnconfirmed(true);setStatusMessage({type:'error',text:'Save unconfirmed. Your form is retained. Reload workspace before retrying.'});}}
    finally{if(mounted.current)setIsSubmitting(false);}
  };
  const handleDeleteCompetitor=async(id:string)=>{
    if(!companyId||writeUnconfirmed)return;const item=competitors.find(row=>row.id===id);if(!item)return;
    try{const data=await apiRequest<any>(`/api/companies/${encodeURIComponent(companyId)}/competitors/${encodeURIComponent(id)}`,{method:'DELETE',body:JSON.stringify({expectedVersion:competitorVersion(item)})});if(accept(data))setStatusMessage({type:'info',text:'Competitor removed. Historical observations retained.'});}
    catch{if(mounted.current){setWriteUnconfirmed(true);setStatusMessage({type:'error',text:'Delete unconfirmed. Record retained; reload workspace before retrying.'});}}
  };
  const handleRefreshSingle=async(comp:CompetitorData)=>{
    if(!companyId||writeUnconfirmed)return;setRefreshingCompId(comp.id);
    try{const data=await apiRequest<any>(`/api/companies/${encodeURIComponent(companyId)}/competitors/${encodeURIComponent(comp.id)}/refresh`,{method:'POST'});if(accept(data))setStatusMessage({type:'success',text:'Provider observation saved. Change requires a comparable previous observation.'});}
    catch{if(mounted.current)setStatusMessage({type:'error',text:'Refresh unavailable or changed concurrently. Reload before another scan.'});}
    finally{if(mounted.current)setRefreshingCompId(null);}
  };
  const handleRefreshAll=async()=>{
    if(!companyId||writeUnconfirmed)return;setIsRefreshingAll(true);
    try{const data=await apiRequest<any>(`/api/companies/${encodeURIComponent(companyId)}/competitors/refresh-all`,{method:'POST'});if(accept(data))setStatusMessage({type:data.partial?'info':'success',text:data.partial?'Some observations were not saved. Reload for current state.':'Competitor observations saved.'});}
    catch{if(mounted.current)setStatusMessage({type:'error',text:'Batch refresh unavailable. Reload for current observations.'});}
    finally{if(mounted.current)setIsRefreshingAll(false);}
  };
  const handleOpenHistory=async(comp:CompetitorData)=>{
    const sequence=++historySequence.current;setSelectedCompForHistory(comp);setIsHistoryModalOpen(true);setIsLoadingHistory(true);setHistoryError(false);setObservationHistory([]);
    try{
      if(!companyId)throw new Error('Missing workspace');
      const data=await apiRequest<any>(`/api/companies/${encodeURIComponent(companyId)}/competitors/${encodeURIComponent(comp.id)}/history`);
      if(data.success!==true||data.companyId!==companyId||data.competitorId!==comp.id||!Array.isArray(data.history))throw new Error('Invalid history');
      if(mounted.current&&sequence===historySequence.current)setObservationHistory(data.history);
    }catch{if(mounted.current&&sequence===historySequence.current)setHistoryError(true);}
    finally{if(mounted.current&&sequence===historySequence.current)setIsLoadingHistory(false);}
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Users2 className="w-7 h-7 text-indigo-600" />
            Competitor Radar & Intelligence
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Automated monitoring of competing businesses across review velocity, verified ratings & map rank.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {companyId && competitors.length > 0 && (
            <button
              onClick={handleRefreshAll}
              disabled={isRefreshingAll}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-2xs disabled:opacity-50"
              title="Refresh all competitor metrics through verified provider"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingAll ? 'animate-spin text-indigo-600' : ''}`} />
              <span>{isRefreshingAll ? 'Scanning Rivals...' : 'Scan All Rivals'}</span>
            </button>
          )}

          {onUpdateCompetitors && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Competitor</span>
            </button>
          )}
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div
          className={`px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between transition ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : statusMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <Database className="w-4 h-4 text-indigo-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="p-1 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* AI Competitor Gap Alert Bento Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                  Competitive Gap Insight
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                  Evidence-Based Baseline
                </span>
              </div>
              <h3 className="text-base font-black text-slate-900 mt-0.5">
                "Real-time benchmark monitoring across local rivals"
              </h3>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Review acquisition changes are calculated strictly when historical database observations exist. Connect Google Places API or SerpAPI in Settings for live radar scans.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('reviews')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs self-start md:self-auto shrink-0"
          >
            <span>Launch Review Push</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Benchmark Table Bento Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Local Competitive Matrix ({competitors.length})
            </h2>
            <p className="text-[11px] text-slate-500">
              Historical snapshots and change detection stored in MySQL.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Auto-synced with MySQL</span>
          </div>
        </div>

        {competitors.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <Users2 className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="font-bold text-slate-800 text-sm">No Competitors Tracked</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add nearby competitors to monitor their ratings, observed review changes, and map rank.
            </p>
            {onUpdateCompetitors && (
              <button
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Track First Competitor</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 rounded-xl">
                <tr>
                  <th className="p-3.5 rounded-l-xl font-bold">Business Name</th>
                  <th className="p-3.5 font-bold">Data Status</th>
                  <th className="p-3.5 font-bold">Google Rating</th>
                  <th className="p-3.5 font-bold">Total Reviews</th>
                  <th className="p-3.5 font-bold">Change Since Previous Observation</th>
                  <th className="p-3.5 font-bold">Photos Count</th>
                  <th className="p-3.5 font-bold">Post Frequency</th>
                  <th className="p-3.5 text-center font-bold">Visibility Rank</th>
                  <th className="p-3.5 text-right rounded-r-xl font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {competitors.map((comp) => {
                  const isSelf = comp.isSelf;
                  const classification =
                    comp.dataClassification || 'UNAVAILABLE';

                  return (
                    <tr
                      key={comp.id}
                      className={`transition ${
                        isSelf ? 'bg-indigo-50/70 font-semibold' : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Business Name */}
                      <td className="p-3.5">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${isSelf ? 'text-indigo-900' : 'text-slate-800'}`}>
                              {comp.name}
                            </span>
                            {isSelf && (
                              <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-bold">
                                Your Business
                              </span>
                            )}
                          </div>
                          {comp.address && (
                            <span className="text-[10px] text-slate-400 truncate max-w-xs">{comp.address}</span>
                          )}
                        </div>
                      </td>

                      {/* Data Status Badge */}
                      <td className="p-3.5">
                        <DataStatusBadge status={classification} />
                      </td>

                      {/* Google Rating */}
                      <td className="p-3.5 font-bold text-amber-600">
                        {comp.rating !== null && comp.rating !== undefined ? (
                          <span>★ {Number(comp.rating).toFixed(1)}</span>
                        ) : (
                          <span className="text-slate-400 font-normal italic text-[11px]">UNAVAILABLE</span>
                        )}
                      </td>

                      {/* Total Reviews */}
                      <td className="p-3.5 font-bold text-slate-800">
                        {comp.reviewsCount !== null && comp.reviewsCount !== undefined ? (
                          comp.reviewsCount
                        ) : (
                          <span className="text-slate-400 font-normal italic text-[11px]">UNAVAILABLE</span>
                        )}
                      </td>

                      {/* Review Velocity (Strict Baseline Check) */}
                      <td className="p-3.5">
                        {typeof comp.reviewChangeSincePreviousObservation === 'number' ? (
                          <span
                            className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                              comp.reviewChangeSincePreviousObservation > 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : comp.reviewChangeSincePreviousObservation < 0
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {comp.reviewChangeSincePreviousObservation >= 0 ? `+${comp.reviewChangeSincePreviousObservation}` : comp.reviewChangeSincePreviousObservation} new
                          </span>
                        ) : (
                          <span
                            className="text-slate-400 text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-medium"
                            title="Calculated only when previous verified database snapshot exists"
                          >
                            Baseline needed
                          </span>
                        )}
                      </td>

                      {/* Photos Count */}
                      <td className="p-3.5 text-slate-600 font-medium">
                        {typeof comp.photosCount === 'number' ? (
                          comp.photosCount
                        ) : (
                          <span className="text-slate-400 font-normal italic text-[11px]">UNAVAILABLE</span>
                        )}
                      </td>

                      {/* Post Frequency */}
                      <td className="p-3.5 text-slate-600 font-medium">
                        {typeof comp.postsPerWeek === 'number' ? (
                          `${comp.postsPerWeek} posts / wk`
                        ) : (
                          <span className="text-slate-400 font-normal italic text-[11px]">UNAVAILABLE</span>
                        )}
                      </td>

                      {/* Visibility Rank */}
                      <td className="p-3.5 text-center font-black text-slate-900">
                        {typeof comp.localVisibilityRank === 'number' ? (
                          `#${comp.localVisibilityRank}`
                        ) : (
                          <span className="text-slate-400 font-normal italic text-[11px]">UNAVAILABLE</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Live Scan Button */}
                          {companyId && !isSelf && (
                            <button
                              onClick={() => handleRefreshSingle(comp)}
                              disabled={refreshingCompId === comp.id}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition"
                              title="Fetch live provider snapshot"
                            >
                              <RefreshCw
                                className={`w-3.5 h-3.5 ${
                                  refreshingCompId === comp.id ? 'animate-spin text-indigo-600' : ''
                                }`}
                              />
                            </button>
                          )}

                          {/* Historical Observations Modal Trigger */}
                          {companyId && (
                            <button
                              onClick={() => handleOpenHistory(comp)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition"
                              title="View snapshot history in MySQL"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit */}
                          {onUpdateCompetitors && (
                            <button
                              onClick={() => handleOpenEdit(comp)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition"
                              title="Edit competitor"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete */}
                          {onUpdateCompetitors && !isSelf && (
                            <button
                              onClick={() => handleDeleteCompetitor(comp.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition"
                              title="Remove competitor"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Competitor Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingCompId ? 'Edit Competitor Entry' : 'Track New Competitor'}
                </h3>
                <p className="text-xs text-slate-500">
                  Data points and timestamped observations are auto-saved to MySQL.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCompetitor} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Competitor Business Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Star Tech Solutions"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Manual Rating (Optional)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    placeholder="e.g. 4.5"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Total Reviews (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    value={reviewsCount}
                    onChange={(e) => setReviewsCount(e.target.value)}
                    placeholder="e.g. 85"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 font-medium"
                  />
                </div>
              </div>

              {!editingCompId&&<label className="flex items-center gap-2 text-slate-600"><input type="checkbox" checked={refreshNow} onChange={e=>setRefreshNow(e.target.checked)}/>Attempt provider refresh after saving</label>}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500">
                <strong>Data Truth Notice:</strong> Change since the previous observation remains <code className="font-bold">Baseline needed</code> until comparable provider observations for the same place are recorded. This is not a calendar-month metric.
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || writeUnconfirmed}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingCompId ? 'Update Competitor' : 'Save Competitor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Observation History Modal */}
      {isHistoryModalOpen && selectedCompForHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  <span>Observation History: {selectedCompForHistory.name}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Historical timestamped observations recorded in <code className="font-bold">competitor_observations</code>.
                </p>
              </div>
              <button
                onClick={() => {historySequence.current++;setIsHistoryModalOpen(false);}}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1 text-xs">
              {isLoadingHistory ? (
                <div className="p-8 text-center text-slate-400">Loading historical snapshots from database...</div>
              ) : historyError ? (
                <div className="p-8 text-center text-rose-600">History unavailable. Reload to retry.</div>
              ) : observationHistory.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl text-slate-500 space-y-1">
                  <div className="font-bold">No Historical Snapshots Recorded Yet</div>
                  <p className="text-[11px] text-slate-400">
                    Click the scan button to record the first timestamped snapshot.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {observationHistory.map((obs, idx) => (
                    <div key={obs.id || idx} className="p-3.5 bg-white hover:bg-slate-50 transition space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <DataStatusBadge status={obs.status || 'UNAVAILABLE'} />
                          <span className="font-bold text-slate-800">
                            Provider: <code className="text-indigo-600">{obs.provider}</code>
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          <span>{obs.timestamp ? new Date(obs.timestamp).toLocaleString() : 'N/A'}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <div className="text-slate-400">Rating</div>
                          <div className="font-bold text-amber-600 text-xs">
                            {obs.rating !== null && obs.rating !== undefined ? `★ ${Number(obs.rating).toFixed(1)}` : 'UNAVAILABLE'}
                          </div>
                        </div>

                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <div className="text-slate-400">Reviews</div>
                          <div className="font-bold text-slate-800 text-xs">
                            {obs.reviews_count !== null && obs.reviews_count !== undefined ? obs.reviews_count : 'UNAVAILABLE'}
                          </div>
                        </div>

                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <div className="text-slate-400">Photos Count</div>
                          <div className="font-bold text-slate-800 text-xs">
                            {obs.photos_count !== null && obs.photos_count !== undefined ? obs.photos_count : 'UNAVAILABLE'}
                          </div>
                        </div>

                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <div className="text-slate-400">Map Rank</div>
                          <div className="font-bold text-slate-900 text-xs">
                            {obs.rank_position !== null && obs.rank_position !== undefined ? `#${obs.rank_position}` : 'UNAVAILABLE'}
                          </div>
                        </div>
                      </div>

                      {obs.address && (
                        <div className="text-[10px] text-slate-400 truncate">
                          Address: {obs.address}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {historySequence.current++;setIsHistoryModalOpen(false);}}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition text-xs"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

