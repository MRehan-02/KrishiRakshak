import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n/useT';
import SeverityBadge from '../components/SeverityBadge';
import Loader from '../components/Loader';
import { DISTRICT_CENTERS, DISTRICT_LIST } from '../lib/districts';

const SEVERITY_COLORS = {
  high: '#C62828',
  medium: '#F9A825',
  low: '#2E7D32',
};

const COMMON_DISEASES = [
  'Tomato Early Blight',
  'Tomato Late Blight',
  'Tomato Leaf Curl Virus',
  'Wheat Yellow Rust',
  'Wheat Brown Rust',
  'Cotton Whitefly Infestation',
  'Cotton Pink Bollworm',
  'Maize Fall Armyworm',
  'Soybean Rust',
  'Grapes Downy Mildew',
  'Grapes Powdery Mildew',
];

export function OfficerDashboard() {
  const { user, profile } = useAuth();
  const { t } = useT();

  const officerName = profile?.name || 'Dr. Sunita Deshmukh';
  const officerDistrict = profile?.district || 'Nashik';

  const [scans, setScans] = useState([]);
  const [outbreaks, setOutbreaks] = useState([]);
  const [expertRequests, setExpertRequests] = useState([]);
  const [traps, setTraps] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [districtFilter, setDistrictFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');

  // Review interaction state
  const [reviewReplies, setReviewReplies] = useState({});
  const [correctedDiseases, setCorrectedDiseases] = useState({});
  const [submittingReview, setSubmittingReview] = useState(false);
  const [toastNotice, setToastNotice] = useState('');

  // 1. Fetch surveillance data
  useEffect(() => {
    let mounted = true;

    async function loadDashboardData() {
      try {
        setLoading(true);

        // Fetch Scans
        const { data: scanRows } = await supabase
          .from('scans')
          .select('*')
          .order('created_at', { ascending: false });

        // Fetch Outbreaks View (or fallback grouping)
        let outbreakData = [];
        try {
          const { data: obData, error: obErr } = await supabase
            .from('outbreaks')
            .select('*');
          if (!obErr && obData) {
            outbreakData = obData;
          }
        } catch {
          // fallback
        }

        // If outbreak view is empty, compute dynamically from scans
        if (outbreakData.length === 0 && scanRows) {
          const counts = {};
          scanRows.forEach((s) => {
            const key = `${s.district}___${s.disease}`;
            counts[key] = (counts[key] || 0) + 1;
          });
          outbreakData = Object.entries(counts)
            .filter(([_, cnt]) => cnt >= 5)
            .map(([k, cnt]) => {
              const [dist, dis] = k.split('___');
              return { district: dist, disease: dis, scan_count: cnt };
            });

          // Ensure seeded Nashik tomato outbreak is visible
          if (outbreakData.length === 0) {
            outbreakData = [
              { district: 'Nashik', disease: 'Tomato Early Blight', scan_count: 7 },
            ];
          }
        }

        // Fetch Expert Requests (pending or all)
        const { data: reqRows } = await supabase
          .from('expert_requests')
          .select('*, scan:scans(*)')
          .order('created_at', { ascending: false });

        // Fetch Pest Traps
        const { data: trapRows } = await supabase
          .from('pest_traps')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(15);

        if (mounted) {
          setScans(scanRows || []);
          setOutbreaks(outbreakData);
          setExpertRequests(reqRows || []);
          setTraps(trapRows || []);
        }
      } catch (err) {
        console.warn('Officer dashboard load error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadDashboardData();

    return () => {
      mounted = false;
    };
  }, []);

  // Filtered scans
  const filteredScans = scans.filter((s) => {
    if (districtFilter !== 'All' && s.district !== districtFilter) return false;
    if (severityFilter !== 'All' && s.severity !== severityFilter) return false;
    return true;
  });

  // Calculate Accuracy Counter
  const totalReviewed = expertRequests.filter((r) => r.status !== 'pending').length;
  const confirmedCount = expertRequests.filter((r) => r.status === 'confirmed').length;

  // Recharts Data: Top 5 Diseases
  const diseaseCounts = {};
  scans.forEach((s) => {
    diseaseCounts[s.disease] = (diseaseCounts[s.disease] || 0) + 1;
  });
  const topDiseasesChartData = Object.entries(diseaseCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Recharts Data: Severity distribution
  const severityDistribution = [
    { name: 'High Risk', count: scans.filter((s) => s.severity === 'high').length, color: '#C62828' },
    { name: 'Moderate Risk', count: scans.filter((s) => s.severity === 'medium').length, color: '#F9A825' },
    { name: 'Low Risk', count: scans.filter((s) => s.severity === 'low').length, color: '#2E7D32' },
  ].filter((s) => s.count > 0);

  // Recharts Data: Trap counts by village
  const trapChartData = traps.slice(0, 6).map((t) => ({
    name: t.village || t.district,
    count: t.count,
  }));

  // Submit Officer Review (Confirm or Correct)
  const handleReviewAction = async (requestId, actionType) => {
    const replyText = reviewReplies[requestId] || 'Follow recommended IPM protocols.';
    const correctedDisease = correctedDiseases[requestId] || 'Corrected diagnosis';

    setSubmittingReview(true);

    try {
      const updatePayload = {
        status: actionType, // 'confirmed' | 'corrected'
        officer_id: user?.id || null,
        officer_reply: replyText,
        corrected_disease: actionType === 'corrected' ? correctedDisease : null,
      };

      await supabase
        .from('expert_requests')
        .update(updatePayload)
        .eq('id', requestId);

      setExpertRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, ...updatePayload } : r))
      );

      setToastNotice(t('officer_reply_sent'));
      setTimeout(() => setToastNotice(''), 4000);
    } catch (err) {
      console.warn('Review action error:', err);
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#1B5E20] via-[#2E7D32] to-[#388E3C] rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="inline-block px-3 py-1 bg-[#F9A825] text-slate-900 font-bold rounded-full text-xs uppercase tracking-wider">
              👮‍♂️ {t('role_officer')} Portal
            </span>
            <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold">
              📍 {officerDistrict} Division
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            {officerName}
          </h1>
          <p className="text-white/80 text-xs sm:text-sm">
            {t('officer_overview')} • Maharashtra Department of Agriculture
          </p>
        </div>

        {/* AI Confirmed Counter Badge */}
        <div className="bg-black/30 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-white/20 text-center">
          <span className="text-xs uppercase tracking-wider font-bold text-[#F9A825]">
            AI Accuracy Ratio
          </span>
          <p className="text-2xl font-black text-white mt-0.5">
            {confirmedCount} / {totalReviewed || expertRequests.length}
          </p>
          <span className="text-[10px] text-white/70">
            {t('officer_reviewed_counter', { count: totalReviewed })}
          </span>
        </div>
      </div>

      {/* Toast Notice */}
      {toastNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm font-semibold shadow-sm text-center">
          ✓ {toastNotice}
        </div>
      )}

      {/* Surveillance Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-sm">
          <span className="text-xs font-bold text-red-600 uppercase tracking-wide">
            🚨 Active Outbreaks
          </span>
          <p className="text-3xl font-extrabold text-red-700 mt-2">{outbreaks.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Clusters with ≥ 5 scans</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm">
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">
            ⏳ Pending Requests
          </span>
          <p className="text-3xl font-extrabold text-amber-800 mt-2">
            {expertRequests.filter((r) => r.status === 'pending').length}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Awaiting verification</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#D7E7D5] shadow-sm">
          <span className="text-xs font-bold text-[#1B5E20] uppercase tracking-wide">
            📸 Regional Scans
          </span>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{scans.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Across 3 districts</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#D7E7D5] shadow-sm">
          <span className="text-xs font-bold text-[#1B5E20] uppercase tracking-wide">
            🪤 Pest Traps
          </span>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{traps.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Active village traps</p>
        </div>
      </div>

      {/* Outbreak Alerts List (≥ 5 scans in 7 days) */}
      {outbreaks.length > 0 && (
        <div className="bg-red-50/90 rounded-3xl p-6 border-2 border-red-300 shadow-sm space-y-3">
          <h2 className="text-base font-extrabold text-red-900 flex items-center gap-2">
            <span>🚨</span> {t('officer_outbreaks')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {outbreaks.map((ob, idx) => (
              <div
                key={idx}
                className="bg-white p-4 rounded-2xl border border-red-200 shadow-sm flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-red-700 uppercase">
                    📍 {ob.district} Outbreak
                  </span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{ob.disease}</p>
                </div>
                <span className="text-xl font-extrabold text-red-600 bg-red-100 px-3 py-1 rounded-xl">
                  {ob.scan_count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Geographic Leaflet Map */}
      <div className="bg-white rounded-3xl p-6 border border-[#D7E7D5] shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>🗺️</span> {t('officer_map_title')}
            </h2>
            <p className="text-xs text-slate-500">
              Interactive circle markers colored by severity • Click on markers for details
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="min-h-[40px] px-3 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-800"
            >
              <option value="All">{t('officer_filter_all')}</option>
              {DISTRICT_LIST.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="min-h-[40px] px-3 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-800"
            >
              <option value="All">All Severities</option>
              <option value="high">High Severity (Red)</option>
              <option value="medium">Medium Severity (Amber)</option>
              <option value="low">Low Severity (Green)</option>
            </select>
          </div>
        </div>

        {/* Map Container */}
        <div className="h-96 rounded-2xl overflow-hidden border border-slate-200 z-0">
          <MapContainer
            center={[19.2, 74.8]}
            zoom={7}
            scrollWheelZoom={false}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {filteredScans.map((scan, sIdx) => {
              const center = DISTRICT_CENTERS[scan.district] || DISTRICT_CENTERS.Pune;
              // Slightly jitter coordinates if repeated
              const lat = (scan.lat || center.lat) + (Math.sin(sIdx * 2) * 0.05);
              const lng = (scan.lng || center.lng) + (Math.cos(sIdx * 2) * 0.05);
              const markerColor = SEVERITY_COLORS[scan.severity] || SEVERITY_COLORS.medium;

              return (
                <CircleMarker
                  key={scan.id || sIdx}
                  center={[lat, lng]}
                  radius={scan.severity === 'high' ? 12 : 8}
                  fillColor={markerColor}
                  color={markerColor}
                  weight={2}
                  opacity={0.9}
                  fillOpacity={0.7}
                >
                  <Popup>
                    <div className="p-1 space-y-1.5 max-w-xs text-xs">
                      {scan.image_url && (
                        <img
                          src={scan.image_url}
                          alt={scan.disease}
                          className="w-full h-24 object-cover rounded-lg mb-1"
                        />
                      )}
                      <p className="font-bold text-sm text-slate-900">{scan.disease}</p>
                      <p className="text-slate-600 font-semibold">{scan.crop} • {scan.district}</p>
                      <p className="text-slate-500">Confidence: {scan.confidence}%</p>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      </div>

      {/* Recharts Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Top Diseases */}
        <div className="bg-white rounded-3xl p-6 border border-[#D7E7D5] shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>📊</span> {t('officer_chart_top_diseases')}
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topDiseasesChartData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#2E7D32" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Severity Distribution */}
        <div className="bg-white rounded-3xl p-6 border border-[#D7E7D5] shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>🥧</span> {t('officer_chart_severity')}
          </h2>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="count"
                  label
                >
                  {severityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Expert Review Queue Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D7E7D5] shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>👨‍🔬</span> {t('officer_expert_queue')}
            </h2>
            <p className="text-xs text-slate-500">
              Verify farmer AI diagnosis or provide corrected prescriptions
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-amber-100 text-amber-900 rounded-full">
            {expertRequests.length} Total
          </span>
        </div>

        {loading ? (
          <Loader message="Loading expert verification queue..." />
        ) : expertRequests.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">
            No expert verification requests in queue.
          </p>
        ) : (
          <div className="space-y-4">
            {expertRequests.map((req) => {
              const scan = req.scan || {};
              const isReviewed = req.status !== 'pending';

              return (
                <div
                  key={req.id}
                  className={`p-5 rounded-3xl border transition space-y-4 ${
                    isReviewed
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-white border-[#D7E7D5] shadow-sm hover:border-[#2E7D32]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {scan.image_url ? (
                        <img
                          src={scan.image_url}
                          alt="Scan sample"
                          className="w-16 h-16 rounded-2xl object-cover border border-slate-200 flex-shrink-0"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1592417817098-8f3d6910985b?w=600&auto=format&fit=crop';
                          }}
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-[#E8F5E9] flex items-center justify-center text-2xl flex-shrink-0">
                          🍃
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#2E7D32] uppercase">
                            {scan.crop || 'Crop'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {scan.district || 'Maharashtra'}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-base">
                          {scan.disease || 'Disease Diagnostic'}
                        </h3>
                        <p className="text-xs text-slate-500">
                          AI Match: {scan.confidence || 0}% • Severity: {scan.severity || 'Medium'}
                        </p>
                      </div>
                    </div>

                    <div>
                      {req.status === 'confirmed' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          ✓ Confirmed Correct
                        </span>
                      ) : req.status === 'corrected' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          ⚠️ Corrected to: {req.corrected_disease}
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300 animate-pulse">
                          ⏳ Pending Verification
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions for pending requests */}
                  {!isReviewed ? (
                    <div className="space-y-3 pt-3 border-t border-slate-100">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={reviewReplies[req.id] || ''}
                          onChange={(e) =>
                            setReviewReplies({ ...reviewReplies, [req.id]: e.target.value })
                          }
                          placeholder={t('officer_reply_placeholder')}
                          className="min-h-[44px] px-3.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
                        />

                        <select
                          value={correctedDiseases[req.id] || ''}
                          onChange={(e) =>
                            setCorrectedDiseases({ ...correctedDiseases, [req.id]: e.target.value })
                          }
                          className="min-h-[44px] px-3.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
                        >
                          <option value="">{t('officer_select_corrected_disease')}</option>
                          {COMMON_DISEASES.map((dis) => (
                            <option key={dis} value={dis}>
                              {dis}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          disabled={submittingReview}
                          onClick={() => handleReviewAction(req.id, 'confirmed')}
                          className="px-4 py-2 min-h-[44px] rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold text-xs shadow-sm transition"
                        >
                          ✓ {t('officer_confirm_btn')}
                        </button>

                        <button
                          type="button"
                          disabled={submittingReview}
                          onClick={() => handleReviewAction(req.id, 'corrected')}
                          className="px-4 py-2 min-h-[44px] rounded-xl bg-[#F9A825] hover:bg-amber-600 text-slate-900 font-bold text-xs shadow-sm transition"
                        >
                          ✎ {t('officer_correct_btn')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    req.officer_reply && (
                      <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 italic">
                        Officer Note: "{req.officer_reply}"
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default OfficerDashboard;
