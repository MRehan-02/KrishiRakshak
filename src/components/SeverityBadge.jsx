import React from 'react';
import { useT } from '../i18n/useT';

export function SeverityBadge({ severity = 'low', className = '' }) {
  const { t } = useT();
  const normalized = (severity || 'low').toLowerCase();

  let styles = 'bg-green-100 text-green-900 border-green-300';
  let label = t('severity_low');
  let icon = '🟢';

  if (normalized === 'high') {
    styles = 'bg-red-100 text-red-900 border-red-300';
    label = t('severity_high');
    icon = '🔴';
  } else if (normalized === 'medium') {
    styles = 'bg-amber-100 text-amber-900 border-amber-300';
    label = t('severity_medium');
    icon = '🟡';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${styles} ${className}`}
    >
      <span className="text-[10px]">{icon}</span>
      <span>{label}</span>
    </span>
  );
}

export default SeverityBadge;
