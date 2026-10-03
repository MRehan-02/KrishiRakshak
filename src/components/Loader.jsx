import React from 'react';
import { useT } from '../i18n/useT';

export function Loader({ message, fullScreen = false }) {
  const { t } = useT();
  const displayMsg = message || t('loading');

  const content = (
    <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-[#D7E7D5] border-t-[#2E7D32] animate-spin"></div>
        <div className="absolute inset-2 flex items-center justify-center text-xl">
          🌱
        </div>
      </div>
      <p className="text-[#1E293B] font-medium text-base animate-pulse">
        {displayMsg}
      </p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F6FBF4]/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
}

export default Loader;
