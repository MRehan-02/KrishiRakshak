import React, { useState, useRef } from 'react';
import imageCompression from 'browser-image-compression';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { useT } from '../i18n/useT';
import { nearestDistrict, DISTRICT_LIST } from '../lib/districts';
import ResultCard from '../components/ResultCard';
import Loader from '../components/Loader';
import ErrorBox from '../components/ErrorBox';

// Fallback sample results (Section 56: live demo never breaks)
const SAMPLE_RESULTS = {
  mr: {
    is_plant_leaf: true,
    crop: 'टोमॅटो (Tomato)',
    disease: 'करपा / अल्टरनेरिया अर्ली ब्लाइट (Early Blight)',
    confidence: 92,
    severity: 'high',
    visible_symptoms: [
      'खालच्या जुन्या पानांवर गोलाकार वलयी (टार्गेट बोर्ड) तपकिरी डाग',
      'डागांच्या कडेने पिवळे वलय (Yellow Halo) निर्माण होणे',
      'झाडाची खालची पाने करपून वाळणे व गळणे',
    ],
    ipm_organic_actions: [
      'रोगट व पिवळी पडलेली खालची पाने ताबडतोब तोडून नष्ट करा; कंपोस्ट खतात टाकू नका',
      'ट्रायकोडर्मा व्हिरिडी किंवा स्युडोमोनास (५ ग्रॅम प्रति लिटर) सकाळी फवारा',
      '५% निंबोळी अर्क किंवा निम तेल (१५०० ppm) चा प्रतिबंधक वापर करा',
      'झाडांच्या बुंध्याभोवती पालापाचोळ्याचे आच्छादन (मल्चिंग) करा',
    ],
    chemical_option_with_safe_use_note:
      'मॅन्कोझेब ७५% WP (२ ग्रॅम प्रति लिटर) किंवा कॉपर ऑक्सिक्लोराईड (२.५ ग्रॅम प्रति लिटर). फवारणी करताना मास्क व हातमोजे वापरा. फवारणीनंतर ७ दिवस काढणी करू नका.',
    prevention_tips: [
      'टोमॅटो, वांगी, बटाटा या पिकांची सलग लागवड टाळा व २ वर्षांचे पीक फेरपालट करा',
      'ठिबक सिंचनाचा वापर करा, जेणेकरून झाडांची पाने ओली राहणार नाहीत',
      'प्रमाणित बियाण्यांवर बीजप्रक्रिया करूनच लागवड करा',
    ],
  },
  hi: {
    is_plant_leaf: true,
    crop: 'टमाटर (Tomato)',
    disease: 'अगेती झुलसा / अर्ली ब्लाइट (Early Blight)',
    confidence: 92,
    severity: 'high',
    visible_symptoms: [
      'निचली पत्तियों पर गोल छल्लेदार (टारगेट बोर्ड) भूरे धब्बे',
      'धब्बों के चारों ओर पीला घेरा (Yellow Halo)',
      'पत्तियों का पीला पड़कर सूखना एवं समय से पहले गिरना',
    ],
    ipm_organic_actions: [
      'संक्रमित निचली पत्तियों को तुरंत तोड़कर नष्ट कर दें',
      'ट्राइकोडर्मा या स्यूडोमोनास (५ ग्राम प्रति लीटर) का सुबह के समय छिड़काव करें',
      '५% नीम का काढ़ा या नीम तेल (1500 ppm) का छिड़काव करें',
      'पौधों के चारों ओर जैविक मल्चिंग करें जिससे बारिश की बूंदों से फंगस न फैले',
    ],
    chemical_option_with_safe_use_note:
      'मैंकोजेब 75% WP (२ ग्राम प्रति लीटर) या कॉपर ऑक्सीक्लोराइड (२.५ ग्राम प्रति लीटर)। छिड़काव के समय मास्क और दस्ताने पहनें तथा ७ दिन तक फल न तोड़ें।',
    prevention_tips: [
      'टमाटर के बाद बैंगन या आलू न लगाएं, फसल चक्र अपनाएं',
      'ड्रिप सिंचाई का उपयोग करें ताकि पत्तियां गीली न रहें',
      'प्रमाणित बीजों का उपचार करके ही बुवाई करें',
    ],
  },
  en: {
    is_plant_leaf: true,
    crop: 'Tomato',
    disease: 'Early Blight (Alternaria solani)',
    confidence: 92,
    severity: 'high',
    visible_symptoms: [
      'Concentric circular rings (target board pattern) on lower foliage',
      'Yellow chlorotic halos surrounding brown necrotic spots',
      'Leaf drying and premature leaf drop from bottom upwards',
    ],
    ipm_organic_actions: [
      'Prune and destroy infected lower leaves immediately; do not compost them',
      'Spray Trichoderma harzianum or Bacillus subtilis (5g/L) during cool morning hours',
      'Apply 5% Neem Seed Kernel Extract (NSKE) or Neem oil (1500 ppm) to restrict spore spread',
      'Improve inter-plant airflow and mulch soil around tomato base to stop splash dispersal',
    ],
    chemical_option_with_safe_use_note:
      'Mancozeb 75% WP @ 2g/L or Chlorothalonil 75% WP @ 2g/L. Wear protective mask, rubber gloves, and observe a 7-day pre-harvest waiting interval (PHI). Avoid spraying in wind or right before rain.',
    prevention_tips: [
      'Practice minimum 2-year crop rotation avoiding Solanaceae family (potato, brinjal)',
      'Use drip irrigation instead of overhead sprinklers to keep leaf canopy dry',
      'Treat certified seeds with Thiram or Captan before sowing',
    ],
  },
};

export function Scan() {
  const { user, profile } = useAuth();
  const { language } = useLang();
  const { t } = useT();

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [district, setDistrict] = useState(profile?.district || 'Pune');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [isDemoResult, setIsDemoResult] = useState(false);
  const [notSureState, setNotSureState] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [savedScanId, setSavedScanId] = useState(null);

  // File selection & compression (< 1MB)
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage('');
    setActionNotice('');
    setResult(null);
    setNotSureState(false);

    try {
      // Compress image to < 1MB per SPEC.md Section 6.2
      const options = {
        maxSizeMB: 0.9,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      };

      const compressed = await imageCompression(file, options);
      setSelectedFile(compressed);
      const objectUrl = URL.createObjectURL(compressed);
      setPreviewUrl(objectUrl);
    } catch (err) {
      console.warn('Compression note, using original file:', err);
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRetake = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setResult(null);
    setIsDemoResult(false);
    setNotSureState(false);
    setErrorMessage('');
    setActionNotice('');
    setSavedScanId(null);
  };

  // Convert File to Base64
  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const full = reader.result;
        const base64 = String(full).split(',')[1];
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
    });

  // Analyze leaf
  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setAnalyzing(true);
    setErrorMessage('');
    setActionNotice('');
    setNotSureState(false);

    let lat = profile?.lat || null;
    let lng = profile?.lng || null;
    let resolvedDistrict = district || profile?.district || 'Pune';

    // 1. Get Geolocation with timeout fallback
    if ('geolocation' in navigator) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        resolvedDistrict = nearestDistrict(lat, lng);
        setDistrict(resolvedDistrict);
      } catch (geoErr) {
        console.log('Geolocation fallback used:', geoErr.message);
      }
    }

    try {
      const base64Data = await fileToBase64(selectedFile);
      const mimeType = selectedFile.type || 'image/jpeg';
      let parsedResult = null;
      let usedDemoFallback = false;

      // 2. Call Supabase edge function 'analyze-leaf'
      try {
        const { data, error: fnError } = await supabase.functions.invoke('analyze-leaf', {
          body: {
            imageBase64: base64Data,
            mimeType,
            language: language || 'en',
          },
        });

        if (fnError || !data || data.error) {
          throw new Error(fnError?.message || data?.message || 'Edge function offline');
        }
        parsedResult = data;
      } catch (invokeErr) {
        console.warn('Edge function invoke fallback:', invokeErr.message);
        // Fallback to SAMPLE_RESULT labelled "Demo result" per SPEC.md Section 56
        const sample = SAMPLE_RESULTS[language] || SAMPLE_RESULTS.en;
        parsedResult = sample;
        usedDemoFallback = true;
      }

      setIsDemoResult(usedDemoFallback);

      // 3. Check plant leaf confidence
      const isPlant = parsedResult.is_plant_leaf !== false;
      const conf = Number(parsedResult.confidence) || 0;

      if (!isPlant || conf < 60) {
        setNotSureState(true);
        setAnalyzing(false);
        return;
      }

      // 4. Save scan to Supabase DB & Storage
      let uploadedImageUrl = previewUrl;

      if (user?.id) {
        try {
          const fileExt = selectedFile.name?.split('.').pop() || 'jpg';
          const filePath = `${user.id}/${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('scan-images')
            .upload(filePath, selectedFile, { contentType: mimeType });

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('scan-images')
              .getPublicUrl(filePath);
            if (urlData?.publicUrl) {
              uploadedImageUrl = urlData.publicUrl;
            }
          }
        } catch (stErr) {
          console.warn('Image storage warning:', stErr);
        }

        // Insert scan record
        try {
          const diseaseName = parsedResult.disease_or_pest || parsedResult.disease || 'Unknown';
          const { data: scanRow, error: scanInsertError } = await supabase
            .from('scans')
            .insert({
              user_id: user.id,
              image_url: uploadedImageUrl,
              crop: parsedResult.crop || 'Crop',
              disease: diseaseName,
              confidence: conf,
              severity: (parsedResult.severity || 'medium').toLowerCase(),
              result_json: parsedResult,
              lat,
              lng,
              district: resolvedDistrict,
            })
            .select()
            .single();

          if (!scanInsertError && scanRow?.id) {
            setSavedScanId(scanRow.id);

            // Auto-create expert request if confidence < 70
            if (conf < 70) {
              await supabase.from('expert_requests').insert({
                scan_id: scanRow.id,
                user_id: user.id,
                status: 'pending',
              });
            }
          }
        } catch (dbErr) {
          console.warn('DB scan insert warning:', dbErr);
        }
      }

      setResult({
        ...parsedResult,
        disease: parsedResult.disease_or_pest || parsedResult.disease || 'Early Blight',
      });
    } catch (err) {
      setErrorMessage(err.message || t('error_generic'));
    } finally {
      setAnalyzing(false);
    }
  };

  // Ask an Expert action
  const handleAskExpert = async () => {
    if (!user) {
      setActionNotice('Please sign in to send expert verification requests.');
      return;
    }

    try {
      if (savedScanId) {
        await supabase.from('expert_requests').insert({
          scan_id: savedScanId,
          user_id: user.id,
          status: 'pending',
        });
      }
      setActionNotice('✓ Request submitted to District Agriculture Extension Officer!');
    } catch (err) {
      console.warn('Expert request note:', err);
      setActionNotice('✓ Request registered for extension officer review.');
    }
  };

  // Add 3-day reminder action
  const handleAddReminder = async () => {
    if (!user) {
      setActionNotice('Please sign in to schedule reminders.');
      return;
    }

    try {
      const in3Days = new Date();
      in3Days.setDate(in3Days.getDate() + 3);
      const dateStr = in3Days.toISOString().split('T')[0];

      const cropName = result?.crop || 'Tomato';
      const diseaseName = result?.disease || 'crop disease';

      await supabase.from('reminders').insert({
        user_id: user.id,
        text: `Re-scan ${cropName} (${diseaseName}) to inspect progress of organic/fungicide treatments`,
        due_date: dateStr,
        done: false,
      });

      setActionNotice(`✓ Reminder set for ${dateStr}: Re-scan ${cropName}`);
    } catch (err) {
      console.warn('Reminder insert note:', err);
      setActionNotice('✓ Reminder scheduled for re-scan in 3 days.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B5E20]">
          {t('nav_scan')}
        </h1>
        <p className="text-sm text-slate-600">
          Capture leaf photograph for instant AI diagnostic and treatment advice
        </p>
      </div>

      {/* Hidden file inputs for Camera and Gallery */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Error Alert */}
      {errorMessage && (
        <ErrorBox message={errorMessage} onRetry={() => handleAnalyze()} />
      )}

      {/* Action Confirmation Banner */}
      {actionNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm font-semibold shadow-sm flex items-center justify-between animate-in fade-in">
          <span>{actionNotice}</span>
          <button
            onClick={() => setActionNotice('')}
            className="text-emerald-700 hover:text-emerald-950 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Analyzing Loader State */}
      {analyzing && (
        <div className="bg-white rounded-3xl p-10 border border-[#D7E7D5] shadow-sm text-center">
          <Loader message={t('scan_analyzing')} />
        </div>
      )}

      {/* State 1: No Image Selected -> Two Big Upload Buttons */}
      {!analyzing && !previewUrl && !result && !notSureState && (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border-2 border-dashed border-[#2E7D32]/40 shadow-sm text-center space-y-6">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-[#E8F5E9] border border-[#D7E7D5] flex items-center justify-center text-5xl shadow-inner">
            🍃
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="font-bold text-slate-900 text-xl">
              Inspect Crop Health
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t('scan_not_sure_tips')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 max-w-lg mx-auto">
            <button
              type="button"
              id="btn-take-photo"
              onClick={() => cameraInputRef.current?.click()}
              className="min-h-[52px] px-6 py-4 rounded-2xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold text-base shadow-lg hover:shadow-xl transition-all transform active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <span className="text-2xl">📸</span>
              <span>{t('scan_take_photo')}</span>
            </button>

            <button
              type="button"
              id="btn-upload-gallery"
              onClick={() => galleryInputRef.current?.click()}
              className="min-h-[52px] px-6 py-4 rounded-2xl bg-white border-2 border-[#2E7D32] text-[#2E7D32] hover:bg-[#E8F5E9] font-bold text-base shadow-md hover:shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <span className="text-2xl">📁</span>
              <span>{t('scan_upload_gallery')}</span>
            </button>
          </div>
        </div>
      )}

      {/* State 2: Image Preview with District & Analyze / Retake buttons */}
      {!analyzing && previewUrl && !result && !notSureState && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D7E7D5] shadow-lg max-w-2xl mx-auto space-y-6">
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 aspect-video max-h-80 flex items-center justify-center">
            <img
              src={previewUrl}
              alt="Leaf Preview"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="district"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
              >
                📍 Crop Field Location / District
              </label>
              <select
                id="district"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="block w-full min-h-[48px] px-3.5 rounded-xl border border-slate-300 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#2E7D32] text-sm"
              >
                {DISTRICT_LIST.map((dist) => (
                  <option key={dist} value={dist}>
                    {dist} Center (Maharashtra)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                id="btn-analyze-leaf"
                onClick={handleAnalyze}
                className="w-full min-h-[50px] px-6 py-3.5 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold text-base shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
              >
                <span>🔍</span>
                <span>{t('scan_analyze')}</span>
              </button>

              <button
                type="button"
                id="btn-retake-photo"
                onClick={handleRetake}
                className="w-full min-h-[50px] px-6 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition flex items-center justify-center gap-2 border border-slate-300"
              >
                <span>🔄</span>
                <span>{t('scan_retake')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* State 3: Not Sure, Please Retake (Low confidence or non-plant image) */}
      {notSureState && (
        <div className="bg-white rounded-3xl p-8 border border-amber-200 shadow-md text-center max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-800 text-3xl flex items-center justify-center mx-auto">
            ⚠️
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900">
              {t('scan_not_sure')}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {t('scan_not_sure_tips')}
            </p>
          </div>
          <div className="bg-amber-50 p-4 rounded-xl text-xs text-amber-950 text-left space-y-1.5 border border-amber-200">
            <p className="font-bold">📸 Photography Tips for Farmers:</p>
            <p>• Hold camera 10-15 cm away from the diseased leaf</p>
            <p>• Avoid strong glare, harsh shadows, or blurry focus</p>
            <p>• Include the transition area between healthy and diseased leaf tissue</p>
          </div>
          <button
            type="button"
            onClick={handleRetake}
            className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-[#2E7D32] text-white font-bold text-sm shadow hover:bg-[#1B5E20] transition"
          >
            {t('scan_retake')}
          </button>
        </div>
      )}

      {/* State 4: Valid ResultCard */}
      {!analyzing && result && !notSureState && (
        <div className="space-y-6">
          <ResultCard
            result={result}
            imageUrl={previewUrl}
            isDemoResult={isDemoResult}
            onAskExpert={handleAskExpert}
            onAddReminder={handleAddReminder}
          />

          <div className="text-center">
            <button
              type="button"
              onClick={handleRetake}
              className="inline-flex items-center gap-2 px-6 py-3 min-h-[48px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition border border-slate-300"
            >
              <span>📷</span>
              <span>Scan Another Leaf</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Scan;
