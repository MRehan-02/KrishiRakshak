import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n/useT';
import ErrorBox from '../components/ErrorBox';
import { DISTRICT_LIST } from '../lib/districts';

export function Login() {
  const { signIn, signUp, loading: authLoading, error: authError } = useAuth();
  const { t } = useT();
  const navigate = useNavigate();

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('farmer'); // 'farmer' | 'officer'
  const [district, setDistrict] = useState('Pune');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMsg('');

    if (!email.trim() || !password.trim()) {
      setLocalError(t('login_error_empty'));
      return;
    }

    setSubmitting(true);

    if (mode === 'signup') {
      const res = await signUp(email.trim(), password, {
        name: name.trim() || email.split('@')[0],
        role,
        district,
      });
      setSubmitting(false);

      if (res?.success) {
        if (res.requiresConfirmation) {
          setSuccessMsg(res.message || t('signup_success_confirm'));
        } else {
          if (role === 'officer') {
            navigate('/officer');
          } else {
            navigate('/');
          }
        }
      } else {
        setLocalError(res?.error || 'Registration failed. Please check your credentials.');
      }
    } else {
      // Sign In mode
      const res = await signIn(email.trim(), password);
      setSubmitting(false);

      if (res?.success) {
        if (res?.profile?.role === 'officer') {
          navigate('/officer');
        } else {
          navigate('/');
        }
      } else {
        setLocalError(res?.error || t('login_error_invalid'));
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F6FBF4] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#E8F5E9] border border-[#D7E7D5] shadow-sm mb-3">
          <span className="text-3xl">🌱</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B5E20] tracking-tight">
          {mode === 'signup' ? t('signup_title') : t('login_title')}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {mode === 'signup' ? t('signup_subtitle') : t('login_subtitle')}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-[#D7E7D5] sm:px-10 space-y-6">
          {/* Tab Navigation: Sign In vs Create Account */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setLocalError('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition min-h-[40px] ${
                mode === 'signin'
                  ? 'bg-white text-[#1B5E20] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('login_tab_signin')}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setLocalError('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition min-h-[40px] ${
                mode === 'signup'
                  ? 'bg-white text-[#1B5E20] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('login_tab_signup')}
            </button>
          </div>

          {/* Success Message */}
          {successMsg && (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-sm font-medium">
              ✓ {successMsg}
            </div>
          )}

          {/* Error Message */}
          {(localError || authError) && (
            <ErrorBox message={localError || authError} />
          )}

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div>
                <label
                  htmlFor="name"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
                >
                  {t('signup_name_label')}
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('signup_name_placeholder')}
                  className="block w-full min-h-[48px] px-3.5 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2E7D32] focus:border-transparent text-sm transition"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
              >
                {t('login_email_label')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('login_email_placeholder')}
                className="block w-full min-h-[48px] px-3.5 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2E7D32] focus:border-transparent text-sm transition"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
              >
                {t('login_password_label')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('login_password_placeholder')}
                className="block w-full min-h-[48px] px-3.5 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2E7D32] focus:border-transparent text-sm transition"
              />
            </div>

            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {t('signup_role_label')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('farmer')}
                      className={`min-h-[46px] p-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                        role === 'farmer'
                          ? 'border-[#2E7D32] bg-[#E8F5E9] text-[#1B5E20] ring-2 ring-[#2E7D32]/30 shadow-sm'
                          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-base">👨‍🌾</span>
                      <span>{t('role_farmer')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('officer')}
                      className={`min-h-[46px] p-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                        role === 'officer'
                          ? 'border-[#F9A825] bg-amber-50 text-amber-950 ring-2 ring-[#F9A825]/40 shadow-sm'
                          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-base">👮‍♂️</span>
                      <span>{t('role_officer')}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="district"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
                  >
                    {t('signup_district_label')}
                  </label>
                  <select
                    id="district"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="block w-full min-h-[48px] px-3.5 rounded-xl border border-slate-300 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#2E7D32] focus:border-transparent text-sm transition"
                  >
                    {DISTRICT_LIST.map((dist) => (
                      <option key={dist} value={dist}>
                        {dist}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={submitting || authLoading}
              className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold text-sm shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{mode === 'signup' ? t('signup_submitting') : t('login_submitting')}</span>
                </>
              ) : (
                <span>{mode === 'signup' ? t('signup_submit_btn') : t('login_submit_btn')}</span>
              )}
            </button>
          </form>

          {/* Toggle between Sign In and Create Account at bottom */}
          <div className="pt-2 text-center text-xs text-slate-500">
            {mode === 'signup' ? (
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setLocalError('');
                  setSuccessMsg('');
                }}
                className="text-[#2E7D32] font-semibold hover:underline"
              >
                {t('already_have_account')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setLocalError('');
                  setSuccessMsg('');
                }}
                className="text-[#2E7D32] font-semibold hover:underline"
              >
                {t('dont_have_account')}
              </button>
            )}
          </div>

          {/* Language selector link */}
          <div className="text-center pt-2 border-t border-slate-100">
            <Link
              to="/language"
              className="text-xs text-[#2E7D32] hover:underline font-semibold"
            >
              🌐 {t('lang_select_title')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
