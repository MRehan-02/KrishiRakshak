import React from 'react';
import { useT } from '../i18n/useT';

export function ErrorBox({ message, onRetry, className = '' }) {
  const { t } = useT();

  return (
    <div
      role="alert"
      className={`p-4 rounded-xl border border-red-200 bg-red-50/90 text-[#1E293B] shadow-sm ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-red-900 leading-snug">
            {message || t('error_generic')}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              type="button"
              className="mt-3 inline-flex items-center px-4 py-2 min-h-[44px] text-xs font-semibold text-white bg-[#C62828] hover:bg-red-800 rounded-lg shadow transition focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t('retry')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ErrorBox;
