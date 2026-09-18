import React, { useState } from 'react';
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
} from 'lucide-react';
import { CompetitorData } from '../types';

interface CompetitorsViewProps {
  competitors: CompetitorData[];
  onNavigate: (tab: any) => void;
  onUpdateCompetitors?: (competitors: CompetitorData[]) => void;
}

export const CompetitorsView: React.FC<CompetitorsViewProps> = ({
  competitors,
  onNavigate,
  onUpdateCompetitors,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [rating, setRating] = useState('4.5');
  const [reviewsCount, setReviewsCount] = useState('85');
  const [reviewGrowth, setReviewGrowth] = useState('6');

  const handleOpenAdd = () => {
    setEditingCompId(null);
    setName('');
    setRating('4.5');
    setReviewsCount('85');
    setReviewGrowth('6');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (comp: CompetitorData) => {
    setEditingCompId(comp.id);
    setName(comp.name);
    setRating(comp.rating.toString());
    setReviewsCount(comp.reviewsCount.toString());
    setReviewGrowth(comp.reviewGrowthThisMonth.toString());
    setIsAddModalOpen(true);
  };

  const handleSaveCompetitor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedRating = parseFloat(rating) || 4.5;
    const parsedReviews = parseInt(reviewsCount) || 50;
    const parsedGrowth = parseInt(reviewGrowth) || 5;

    if (editingCompId) {
      const updated = competitors.map((c) =>
        c.id === editingCompId
          ? {
              ...c,
              name: name.trim(),
              rating: parsedRating,
              reviewsCount: parsedReviews,
              reviewGrowthThisMonth: parsedGrowth,
            }
          : c
      );
      onUpdateCompetitors?.(updated);
    } else {
      const newEntry: CompetitorData = {
        id: `comp_${Date.now()}`,
        name: name.trim(),
        rating: parsedRating,
        reviewsCount: parsedReviews,
        reviewGrowthThisMonth: parsedGrowth,
        photosCount: 25,
        postsPerWeek: 2,
        localVisibilityRank: competitors.length + 1,
      };
      onUpdateCompetitors?.([...competitors, newEntry]);
    }

    setIsAddModalOpen(false);
  };

  const handleDeleteCompetitor = (id: string) => {
    onUpdateCompetitors?.(competitors.filter((c) => c.id !== id));
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
            Automated monitoring of competing repair centers across review velocity, posting rhythm & map rank.
          </p>
        </div>

        {onUpdateCompetitors && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Competitor</span>
          </button>
        )}
      </div>

      {/* AI Competitor Gap Alert Bento Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                Competitive Gap Insight
              </span>
              <h3 className="text-base font-black text-slate-900 mt-0.5">
                "Real-time benchmark monitoring across local rivals"
              </h3>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Keep your review velocity ahead of local peers. Track rival posting schedules and benchmark your rating to maintain Top 3 Google Map pack position.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('reviews')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs self-start md:self-auto flex-shrink-0"
          >
            <span>Launch Review Push</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Benchmark Table Bento Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Local Competitive Matrix ({competitors.length})
          </h2>
          <span className="text-xs text-slate-500 font-medium">Auto-synced with MySQL</span>
        </div>

        {competitors.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <Users2 className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="font-bold text-slate-800 text-sm">No Competitors Tracked</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add nearby competitors to monitor their ratings, monthly review acquisition, and map rank.
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
                  <th className="p-3.5 font-bold">Google Rating</th>
                  <th className="p-3.5 font-bold">Total Reviews</th>
                  <th className="p-3.5 font-bold">Review Growth (This Mo.)</th>
                  <th className="p-3.5 font-bold">Photos Count</th>
                  <th className="p-3.5 font-bold">Post Frequency</th>
                  <th className="p-3.5 text-center font-bold">Visibility Rank</th>
                  {onUpdateCompetitors && <th className="p-3.5 text-right rounded-r-xl font-bold">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {competitors.map((comp) => {
                  const isSelf = comp.isSelf;
                  return (
                    <tr
                      key={comp.id}
                      className={`transition ${
                        isSelf ? 'bg-indigo-50/70 font-semibold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="p-3.5">
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
                      </td>
                      <td className="p-3.5 font-bold text-amber-600">
                        ★ {comp.rating.toFixed(1)}
                      </td>
                      <td className="p-3.5 font-bold text-slate-800">
                        {comp.reviewsCount}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                            comp.reviewGrowthThisMonth >= 15
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          +{comp.reviewGrowthThisMonth} new
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 font-medium">{comp.photosCount}</td>
                      <td className="p-3.5 text-slate-600 font-medium">{comp.postsPerWeek} posts / week</td>
                      <td className="p-3.5 text-center font-black text-slate-900">
                        #{comp.localVisibilityRank}
                      </td>
                      {onUpdateCompetitors && (
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(comp)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition"
                              title="Edit competitor"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {!isSelf && (
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
                      )}
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
                <p className="text-xs text-slate-500">Auto-saved to your MySQL company workspace.</p>
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
                  <label className="font-bold text-slate-700">Google Rating (★)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Total Reviews</label>
                  <input
                    type="number"
                    min="0"
                    value={reviewsCount}
                    onChange={(e) => setReviewsCount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">New Reviews This Month</label>
                <input
                  type="number"
                  min="0"
                  value={reviewGrowth}
                  onChange={(e) => setReviewGrowth(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 font-medium"
                />
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
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-xs"
                >
                  {editingCompId ? 'Update Competitor' : 'Save Competitor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
