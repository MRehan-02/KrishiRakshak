import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { useT } from '../i18n/useT';

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const { language, setLanguage, supportedLanguages } = useLang();
  const { t } = useT();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isOfficer = profile?.role === 'officer';

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }) =>
    `inline-flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition min-h-[44px] ${
      isActive
        ? 'bg-[#1B5E20] text-white shadow-sm'
        : 'text-white/90 hover:bg-white/10 hover:text-white'
    }`;

  const mobileNavLinkClass = ({ isActive }) =>
    `flex items-center px-4 py-3 text-base font-semibold rounded-xl transition min-h-[48px] ${
      isActive
        ? 'bg-[#2E7D32] text-white shadow-sm'
        : 'text-slate-800 hover:bg-[#E8F5E9]'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-[#2E7D32] text-white shadow-md border-b border-[#1B5E20]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link
              to={isOfficer ? '/officer' : '/'}
              className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-white rounded-lg p-1"
            >
              <span className="text-3xl filter drop-shadow">🌱</span>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-white leading-none">
                  {t('app_name')}
                </span>
                <span className="text-[10px] sm:text-xs text-white/80 font-medium tracking-wide mt-1">
                  SIH 2026 • Govt of Maharashtra
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          {user && (
            <nav className="hidden md:flex items-center gap-1 lg:gap-2">
              {!isOfficer ? (
                <>
                  <NavLink to="/" className={navLinkClass}>
                    {t('nav_home')}
                  </NavLink>
                  <NavLink to="/scan" className={navLinkClass}>
                    {t('nav_scan')}
                  </NavLink>
                  <NavLink to="/history" className={navLinkClass}>
                    {t('nav_history')}
                  </NavLink>
                  <NavLink to="/roadmap" className={navLinkClass}>
                    {t('nav_roadmap')}
                  </NavLink>
                  <NavLink to="/traps" className={navLinkClass}>
                    {t('nav_traps')}
                  </NavLink>
                  <NavLink to="/assistant" className={navLinkClass}>
                    {t('nav_assistant')}
                  </NavLink>
                </>
              ) : (
                <>
                  <NavLink to="/officer" className={navLinkClass}>
                    {t('nav_officer_dashboard')}
                  </NavLink>
                  <NavLink to="/assistant" className={navLinkClass}>
                    {t('nav_assistant')}
                  </NavLink>
                </>
              )}
            </nav>
          )}

          {/* Controls: Language, User Profile, Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher Buttons */}
            <div className="inline-flex rounded-lg bg-[#1B5E20]/70 p-1 border border-white/20">
              {supportedLanguages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition min-h-[36px] ${
                    language === l.code
                      ? 'bg-white text-[#1B5E20] shadow-sm'
                      : 'text-white/80 hover:text-white'
                  }`}
                  aria-label={`Switch to ${l.label}`}
                >
                  {l.nativeName}
                </button>
              ))}
            </div>

            {/* User Profile Pill & Logout (Desktop) */}
            {user ? (
              <div className="hidden lg:flex items-center gap-3 pl-2 border-l border-white/20">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-bold text-white leading-tight">
                    {profile?.name || user.email}
                  </span>
                  <span className="text-[11px] text-[#F9A825] font-semibold">
                    {isOfficer ? t('role_officer') : t('role_farmer')} • {profile?.district || 'MH'}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  type="button"
                  className="px-3 py-1.5 min-h-[44px] rounded-lg text-xs font-semibold bg-[#C62828] hover:bg-red-800 text-white transition shadow-sm"
                >
                  {t('nav_logout')}
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center px-4 py-2 min-h-[44px] rounded-lg text-sm font-semibold bg-white text-[#2E7D32] hover:bg-[#E8F5E9] transition shadow-sm"
              >
                {t('login_submit_btn')}
              </Link>
            )}

            {/* Mobile Hamburger Button */}
            {user && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-white hover:bg-white/10 min-h-[48px] min-w-[48px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white"
                aria-label={t('nav_menu_toggle')}
              >
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && user && (
        <div className="md:hidden bg-white text-slate-800 border-t border-slate-200 px-4 pt-4 pb-6 space-y-3 shadow-2xl animate-in slide-in-from-top duration-200">
          {/* User Info Card in Mobile Menu */}
          <div className="p-3 rounded-xl bg-[#F6FBF4] border border-[#D7E7D5] flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">{profile?.name || user.email}</p>
              <p className="text-xs text-[#2E7D32] font-semibold">
                {isOfficer ? t('role_officer') : t('role_farmer')} • {profile?.district || 'Maharashtra'}
              </p>
            </div>
          </div>

          <nav className="flex flex-col space-y-1">
            {!isOfficer ? (
              <>
                <NavLink
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass}
                >
                  <span className="mr-3 text-lg">🏠</span>
                  {t('nav_home')}
                </NavLink>
                <NavLink
                  to="/scan"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass}
                >
                  <span className="mr-3 text-lg">📷</span>
                  {t('nav_scan')}
                </NavLink>
                <NavLink
                  to="/history"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass}
                >
                  <span className="mr-3 text-lg">📋</span>
                  {t('nav_history')}
                </NavLink>
                <NavLink
                  to="/roadmap"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass}
                >
                  <span className="mr-3 text-lg">📅</span>
                  {t('nav_roadmap')}
                </NavLink>
                <NavLink
                  to="/traps"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass}
                >
                  <span className="mr-3 text-lg">🪤</span>
                  {t('nav_traps')}
                </NavLink>
                <NavLink
                  to="/assistant"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass}
                >
                  <span className="mr-3 text-lg">🤖</span>
                  {t('nav_assistant')}
                </NavLink>
              </>
            ) : (
              <>
                <NavLink
                  to="/officer"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass}
                >
                  <span className="mr-3 text-lg">📊</span>
                  {t('nav_officer_dashboard')}
                </NavLink>
                <NavLink
                  to="/assistant"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass}
                >
                  <span className="mr-3 text-lg">🤖</span>
                  {t('nav_assistant')}
                </NavLink>
              </>
            )}
          </nav>

          <div className="pt-2 border-t border-slate-200">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              type="button"
              className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-red-50 text-[#C62828] hover:bg-red-100 font-bold text-sm transition flex items-center justify-center gap-2"
            >
              <span>🚪</span>
              <span>{t('nav_logout')}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
