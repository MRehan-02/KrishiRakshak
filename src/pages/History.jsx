import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n/useT';
import SeverityBadge from '../components/SeverityBadge';
import Loader from '../components/Loader';

export function History() {
  const { user } = useAuth();
  const { t } = useT();

  const [scans, setScans] = useState([]);
  const [expertRequests, setExpertRequests] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedCrop, setSelectedCrop] = useState('All');

  useEffect(() => {
    let mounted = true;

    async function loadHistory() {
      try {
        setLoading(true);

        // 1. Fetch scans for current user (or demo scans fallback)
        let query = supabase.from('scans').select('*').order('created_at', { ascending: false });

        if (user?.id) {
          query = query.eq('user_id', user.id);
        }

        const { data: scanRows, error: scanErr } = await query;

        // If no user scans yet, fallback to all recent scans so the demo displays
        let finalScans = scanRows || [];
        if (finalScans.length === 0) {
          const { data: publicScans } = await supabase
            .from('scans')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
          finalScans = publicScans || [];
        }

        if (mounted) {
          setScans(finalScans);
        }

        // 2. Fetch expert requests
        const { data: reqRows } = await supabase.from('expert_requests').select('*');
        if (mounted && reqRows) {
          const map = {};
          reqRows.forEach((r) => {
            if (r.scan_id) map[r.scan_id] = r;
          });
          setExpertRequests(map);
        }
      } catch (err) {
        console.warn('History fetch error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadHistory();

    return () => {
      mounted = false;
    };
  }, [user]);

  // Unique crops for filter
  const cropList = ['All', ...new Set(scans.map((s) => s.crop).filter(Boolean))];

  const filteredScans = scans.filter((s) => {
    if (selectedCrop === 'All') return true;
    return s.crop === selectedCrop;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B5E20]">
            {t('history_title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            {t('history_subtitle')}
          </p>
        </div>

        <Link
          to="/scan"
          className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold text-sm shadow-md transition"
        >
          <span>📸</span>
          <span>{t('nav_scan')}</span>
        </Link>
      </div>

      {/* Filter by Crop */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-[#D7E7D5] shadow-sm max-w-sm">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider pl-1">
          🔍 {t('history_filter_crop')}:
        </span>
        <select
          value={selectedCrop}
          onChange={(e) => setSelectedCrop(e.target.value)}
          className="flex-1 min-h-[40px] px-3 py-1 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
        >
          {cropList.map((c) => (
            <option key={c} value={c}>
              {c === 'All' ? t('history_filter_all') : c}
            </option>
          ))}
        </select>
      </div>

      {/* Scans List */}
      {loading ? (
        <Loader message="Loading scan records..." />
      ) : filteredScans.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-[#D7E7D5] text-center space-y-4 max-w-md mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#E8F5E9] text-3xl flex items-center justify-center mx-auto">
            📋
          </div>
          <p className="text-sm text-slate-600 leading-relaxed font-medium">
            {t('history_empty')}
          </p>
          <Link
            to="/scan"
            className="inline-block px-5 py-3 rounded-xl bg-[#2E7D32] text-white font-bold text-sm shadow"
          >
            {t('nav_scan')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScans.map((scan) => {
            const exp = expertRequests[scan.id];
            const symptoms = scan.result_json?.visible_symptoms || [];

            return (
              <div
                key={scan.id}
                className="bg-white rounded-3xl border border-[#D7E7D5] shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Image */}
                  <div className="h-48 w-full bg-slate-900 relative overflow-hidden">
                    <img
                      src={scan.image_url}
                      alt={scan.disease}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1592417817098-8f3d6910985b?w=600&auto=format&fit=crop';
                      }}
                    />
                    <div className="absolute top-3 right-3">
                      <SeverityBadge severity={scan.severity} />
                    </div>
                    <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                      🎯 {scan.confidence}%
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-bold text-[#2E7D32] uppercase tracking-wide">
                        {scan.crop}
                      </span>
                      <span>
                        {new Date(scan.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-lg leading-tight">
                      {scan.disease}
                    </h3>

                    {/* Symptoms list */}
                    {symptoms.length > 0 && (
                      <p className="text-xs text-slate-600 line-clamp-2 italic">
                        "{symptoms.join(', ')}"
                      </p>
                    )}

                    {/* Location Badge */}
                    <div className="text-[11px] text-slate-500 font-medium">
                      📍 {scan.district || 'Maharashtra'}
                    </div>

                    {/* Officer Review Feedback Card */}
                    {exp && (
                      <div className="pt-2">
                        {exp.status === 'confirmed' && (
                          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
                            <span className="font-bold text-emerald-800 flex items-center gap-1">
                              ✓ {t('history_officer_verified')}
                            </span>
                            {exp.officer_reply && (
                              <p className="text-[11px] text-slate-700">
                                💬 <em>"{exp.officer_reply}"</em>
                              </p>
                            )}
                          </div>
                        )}

                        {exp.status === 'corrected' && (
                          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-1">
                            <span className="font-bold text-amber-800 flex items-center gap-1">
                              ⚠️ {t('history_officer_corrected')}
                            </span>
                            <p className="font-semibold text-slate-900 text-xs">
                              Corrected to: {exp.corrected_disease}
                            </p>
                            {exp.officer_reply && (
                              <p className="text-[11px] text-slate-700">
                                💬 <em>"{exp.officer_reply}"</em>
                              </p>
                            )}
                          </div>
                        )}

                        {exp.status === 'pending' && (
                          <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200 text-[11px] text-blue-800 font-medium flex items-center gap-1.5">
                            <span className="animate-pulse">⏳</span>
                            <span>{t('history_officer_pending')}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default History;
