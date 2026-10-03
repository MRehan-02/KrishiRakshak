import React, { useState } from 'react';
import { useT } from '../i18n/useT';
import SeverityBadge from './SeverityBadge';
import ListenButton from './ListenButton';

export function ResultCard({
  result,
  imageUrl,
  onAskExpert,
  onAddReminder,
  isDemoResult = false,
}) {
  const { t } = useT();
  const [showOfficeModal, setShowOfficeModal] = useState(false);

  if (!result) return null;

  const {
    crop = 'Crop',
    disease = 'Unknown',
    confidence = 0,
    severity = 'low',
    visible_symptoms = [],
    ipm_organic_actions = [],
    chemical_option_with_safe_use_note = '',
    prevention_tips = [],
  } = result;

  // Compile full text summary for text-to-speech
  const summaryForSpeech = [
    `${crop}. ${disease}.`,
    `Confidence ${confidence} percent. Severity ${severity}.`,
    visible_symptoms.length > 0 ? `Symptoms: ${visible_symptoms.join(', ')}.` : '',
    ipm_organic_actions.length > 0 ? `Organic actions: ${ipm_organic_actions.join(', ')}.` : '',
    chemical_option_with_safe_use_note ? `Chemical options: ${chemical_option_with_safe_use_note}.` : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="bg-white rounded-2xl border border-[#D7E7D5] shadow-lg overflow-hidden max-w-2xl mx-auto">
      {isDemoResult && (
        <div className="bg-amber-100 text-amber-900 px-4 py-2 text-xs font-semibold flex items-center justify-between border-b border-amber-200">
          <span>⚠️ Demo Result (Offline fallback preview)</span>
          <span className="text-[11px] bg-amber-200 px-2 py-0.5 rounded">Sample</span>
        </div>
      )}

      {imageUrl && (
        <div className="w-full h-56 bg-slate-900 relative overflow-hidden">
          <img
            src={imageUrl}
            alt={disease}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 right-3">
            <SeverityBadge severity={severity} />
          </div>
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium">
            🎯 {confidence}% Match
          </div>
        </div>
      )}

      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs uppercase tracking-wider font-bold text-[#2E7D32]">
              {crop}
            </span>
            <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
              {disease}
            </h2>
          </div>
          <ListenButton text={summaryForSpeech} />
        </div>

        {/* Symptoms */}
        {visible_symptoms.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
              <span>🔍</span> Visible Symptoms
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {visible_symptoms.map((sym, idx) => (
                <li key={idx}>{sym}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Organic / IPM Actions First */}
        {ipm_organic_actions.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-[#1B5E20] mb-2 flex items-center gap-1.5">
              <span>🌿</span> Recommended IPM & Organic Actions
            </h3>
            <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-800 bg-[#E8F5E9]/60 p-3.5 rounded-xl border border-[#D7E7D5]">
              {ipm_organic_actions.map((act, idx) => (
                <li key={idx} className="font-medium">{act}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Chemical Option Last */}
        {chemical_option_with_safe_use_note && (
          <div>
            <h3 className="text-sm font-semibold text-amber-900 mb-1 flex items-center gap-1.5">
              <span>🧪</span> Chemical Option (Use with safety gears)
            </h3>
            <p className="text-xs text-amber-950 bg-amber-50 p-3 rounded-xl border border-amber-200 leading-relaxed">
              {chemical_option_with_safe_use_note}
            </p>
          </div>
        )}

        {/* Prevention */}
        {prevention_tips.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
              <span>🛡️</span> Prevention Tips
            </h3>
            <ul className="list-disc list-inside space-y-1 text-xs text-slate-600">
              {prevention_tips.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Regulatory Disclaimer */}
        <div className="bg-slate-100 p-3 rounded-xl text-[11px] text-slate-500 leading-snug border border-slate-200 italic">
          ⚠️ {t('scan_disclaimer')}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {onAskExpert && (
            <button
              onClick={onAskExpert}
              type="button"
              className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-sm font-semibold shadow transition flex items-center justify-center gap-2"
            >
              <span>👨‍🌾</span>
              <span>{t('scan_ask_expert')}</span>
            </button>
          )}

          <button
            onClick={() => setShowOfficeModal(true)}
            type="button"
            className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-white border border-[#2E7D32] text-[#2E7D32] hover:bg-[#E8F5E9] text-sm font-semibold shadow-sm transition flex items-center justify-center gap-2"
          >
            <span>🏢</span>
            <span>{t('scan_nearest_office')}</span>
          </button>

          {onAddReminder && (
            <button
              onClick={onAddReminder}
              type="button"
              className="sm:col-span-2 w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-medium transition flex items-center justify-center gap-2"
            >
              <span>⏰</span>
              <span>{t('scan_remind_3days')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Static Extension Office Modal */}
      {showOfficeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>🏢</span> Extension Office & KVK Lab
              </h3>
              <button
                onClick={() => setShowOfficeModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-sm text-slate-700">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-semibold text-slate-900">Krishi Vigyan Kendra (KVK)</p>
                <p className="text-xs text-slate-600 mt-1">Govt. Agriculture Research & Extension Center</p>
                <p className="text-xs mt-2 font-mono">📞 Helpline: 1800-180-1551 (Kisan Call Center)</p>
                <p className="text-xs mt-1 font-mono">📍 District Agri Officer: Pune / Nashik / Solapur</p>
                <p className="text-xs mt-1 font-mono">⏰ Mon - Sat: 9:00 AM - 5:30 PM</p>
              </div>
            </div>
            <button
              onClick={() => setShowOfficeModal(false)}
              className="w-full min-h-[48px] bg-[#2E7D32] text-white rounded-xl font-medium"
            >
              {t('back')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResultCard;
