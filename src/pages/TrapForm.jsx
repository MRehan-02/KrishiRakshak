import React, { useState, useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n/useT';
import { DISTRICT_LIST } from '../lib/districts';
import Loader from '../components/Loader';

const PEST_TYPES = [
  'Yellow Sticky Trap (Whitefly / Aphids)',
  'Pheromone Trap (Fall Armyworm - Maize)',
  'Pheromone Trap (Pink Bollworm - Cotton)',
  'Blue Sticky Trap (Thrips - Onion/Chilli)',
  'Light Trap (Stem Borer - Rice/Sugarcane)',
  'Fruit Fly Trap (Bactrocera - Mango/Guava)',
  'Delta Trap (Spodoptera litura - Soybean)',
];

export function TrapForm() {
  const { user, profile } = useAuth();
  const { t } = useT();

  const [pestType, setPestType] = useState(PEST_TYPES[0]);
  const [count, setCount] = useState('');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState(profile?.district || 'Nashik');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [trapsList, setTrapsList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  // Load existing trap records
  useEffect(() => {
    let mounted = true;

    async function loadTraps() {
      try {
        setLoadingList(true);
        const { data, error } = await supabase
          .from('pest_traps')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (!error && data && mounted) {
          setTrapsList(data);
        }
      } catch (err) {
        console.warn('Traps fetch error:', err);
      } finally {
        if (mounted) setLoadingList(false);
      }
    }

    loadTraps();

    return () => {
      mounted = false;
    };
  }, []);

  // Handle optional photo selection
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1200, useWebWorker: true };
      const compressed = await imageCompression(file, options);
      setPhotoFile(compressed);
      setPhotoPreview(URL.createObjectURL(compressed));
    } catch {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // Submit Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!count || isNaN(count)) {
      setErrorMsg('Please enter a valid numeric insect count.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setNotice('');

    try {
      let photoUrl = null;

      // 1. Upload photo if selected
      if (photoFile && user?.id) {
        try {
          const ext = photoFile.name?.split('.').pop() || 'jpg';
          const path = `traps/${user.id}/${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from('scan-images')
            .upload(path, photoFile, { contentType: photoFile.type });

          if (!upErr) {
            const { data: urlData } = supabase.storage.from('scan-images').getPublicUrl(path);
            if (urlData?.publicUrl) photoUrl = urlData.publicUrl;
          }
        } catch (stErr) {
          console.warn('Trap image upload notice:', stErr);
        }
      }

      // 2. Insert into pest_traps
      const newTrapRecord = {
        user_id: user?.id || null,
        pest_type: pestType,
        count: parseInt(count, 10),
        village: village.trim() || 'Local Cluster',
        district,
        image_url: photoUrl,
      };

      const { data, error } = await supabase
        .from('pest_traps')
        .insert(newTrapRecord)
        .select()
        .single();

      if (error) throw error;

      setTrapsList((prev) => [data || newTrapRecord, ...prev]);
      setCount('');
      setVillage('');
      setPhotoFile(null);
      setPhotoPreview('');
      setNotice(t('trap_success'));
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || t('error_generic'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B5E20]">
          {t('trap_title')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          {t('trap_subtitle')}
        </p>
      </div>

      {/* Confirmation notice */}
      {notice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm font-semibold shadow-sm text-center">
          ✓ {notice}
        </div>
      )}

      {/* Error message */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-300 text-red-900 text-sm font-semibold shadow-sm text-center">
          ✕ {errorMsg}
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D7E7D5] shadow-lg max-w-xl mx-auto space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {t('trap_type_label')}
            </label>
            <select
              value={pestType}
              onChange={(e) => setPestType(e.target.value)}
              className="block w-full min-h-[48px] px-3.5 rounded-xl border border-slate-300 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#2E7D32] text-sm"
            >
              {PEST_TYPES.map((pt) => (
                <option key={pt} value={pt}>
                  {pt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {t('trap_count_label')} *
            </label>
            <input
              type="number"
              min="0"
              required
              value={count}
              onChange={(e) => setCount(e.target.value)}
              placeholder="e.g. 25"
              className="block w-full min-h-[48px] px-3.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2E7D32] text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t('trap_village_label')}
              </label>
              <input
                type="text"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="e.g. Barshi, Ozar"
                className="block w-full min-h-[48px] px-3.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2E7D32] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t('trap_district_label')}
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="block w-full min-h-[48px] px-3.5 rounded-xl border border-slate-300 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#2E7D32] text-sm"
              >
                {DISTRICT_LIST.map((dist) => (
                  <option key={dist} value={dist}>
                    {dist}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {t('trap_photo_label')}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#E8F5E9] file:text-[#1B5E20] hover:file:bg-[#D7E7D5]"
            />
            {photoPreview && (
              <div className="mt-2 w-28 h-28 rounded-xl overflow-hidden border border-slate-200">
                <img src={photoPreview} alt="Trap preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[50px] px-6 py-3.5 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold text-base shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{t('trap_submitting')}</span>
              </>
            ) : (
              <span>{t('trap_submit_btn')}</span>
            )}
          </button>
        </form>
      </div>

      {/* Recent Trap Observations */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D7E7D5] shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <span>📊</span> {t('trap_recent_reports')}
        </h2>

        {loadingList ? (
          <Loader message="Loading trap logs..." />
        ) : trapsList.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">{t('trap_empty')}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {trapsList.map((tr, idx) => (
              <div
                key={tr.id || idx}
                className="p-4 rounded-2xl bg-[#F6FBF4] border border-[#D7E7D5] space-y-2 flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#2E7D32]">
                    📍 {tr.district} • {tr.village || 'Field'}
                  </span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{tr.pest_type}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-2xl font-extrabold text-[#C62828]">{tr.count}</span>
                  <span className="text-[10px] text-slate-400">
                    {tr.created_at ? new Date(tr.created_at).toLocaleDateString() : 'Today'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TrapForm;
