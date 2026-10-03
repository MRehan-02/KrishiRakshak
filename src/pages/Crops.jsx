import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n/useT';
import Loader from '../components/Loader';

const AVAILABLE_CROPS = [
  { name: 'Tomato', season: 'Kharif/Rabi', duration: '90-120 days', icon: '🍅' },
  { name: 'Wheat', season: 'Rabi', duration: '120-140 days', icon: '🌾' },
  { name: 'Rice', season: 'Kharif', duration: '110-130 days', icon: '🌱' },
  { name: 'Cotton', season: 'Kharif', duration: '150-180 days', icon: '☁️' },
  { name: 'Soybean', season: 'Kharif', duration: '95-105 days', icon: '🫘' },
  { name: 'Sugarcane', season: 'Annual', duration: '300-360 days', icon: '🎋' },
  { name: 'Onion', season: 'Rabi/Late Kharif', duration: '100-120 days', icon: '🧅' },
  { name: 'Potato', season: 'Rabi', duration: '90-110 days', icon: '🥔' },
  { name: 'Maize', season: 'Kharif/Rabi', duration: '90-110 days', icon: '🌽' },
  { name: 'Grapes', season: 'Perennial', duration: 'Pruning cycle', icon: '🍇' },
];

export function Crops() {
  const { user, profile } = useAuth();
  const { t } = useT();

  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadCrops() {
      if (!user?.id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('crops')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data && mounted) {
          setCrops(data);
        }
      } catch (err) {
        console.warn('Crops fetch error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadCrops();

    return () => {
      mounted = false;
    };
  }, [user]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B5E20]">
            {t('nav_crops')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Active crops enrolled in your agricultural surveillance plan
          </p>
        </div>

        <Link
          to="/roadmap"
          className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold text-sm shadow-md transition"
        >
          <span>📅</span>
          <span>{t('roadmap_create_btn')}</span>
        </Link>
      </div>

      {/* Active Enrolled Crops */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900">Your Active Crops</h2>

        {loading ? (
          <Loader message="Loading active crops..." />
        ) : crops.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-[#D7E7D5] text-center space-y-3 shadow-sm">
            <p className="text-sm text-slate-600">
              No crops enrolled yet. Select a crop to initialize your growth schedule and automated disease alerts.
            </p>
            <Link
              to="/roadmap"
              className="inline-block px-5 py-2.5 rounded-xl bg-[#2E7D32] text-white font-bold text-sm shadow"
            >
              Add First Crop
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {crops.map((c) => (
              <div
                key={c.id}
                className="bg-white p-5 rounded-3xl border border-[#D7E7D5] shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#2E7D32]">
                    📍 {c.district || profile?.district || 'Pune'}
                  </span>
                  <h3 className="font-extrabold text-slate-900 text-lg mt-0.5">{c.crop_name}</h3>
                  <p className="text-xs text-slate-500">
                    Sowing Date: {c.sowing_date || 'Recent'}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex gap-2">
                  <Link
                    to="/roadmap"
                    className="flex-1 py-2 text-center text-xs font-bold rounded-xl bg-[#E8F5E9] text-[#1B5E20] hover:bg-[#D7E7D5]"
                  >
                    View Timeline
                  </Link>
                  <Link
                    to="/scan"
                    className="py-2 px-3 text-center text-xs font-bold rounded-xl bg-[#2E7D32] text-white hover:bg-[#1B5E20]"
                  >
                    Scan
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Crops in Maharashtra Catalog */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D7E7D5] shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900">Supported Crops Catalog</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {AVAILABLE_CROPS.map((cr, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-[#F6FBF4] border border-[#D7E7D5] text-center space-y-1"
            >
              <div className="text-2xl">{cr.icon}</div>
              <p className="font-bold text-slate-900 text-xs">{cr.name}</p>
              <p className="text-[10px] text-slate-500">{cr.season}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Crops;
