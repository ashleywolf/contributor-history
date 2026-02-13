'use client';

import React from 'react';
import { ChartSettings } from '@/lib/types';

interface Props {
  settings: ChartSettings;
  onToggleTimeline: () => void;
  onToggleXkcd: () => void;
  onDownload: () => void;
  onToggleTheme: () => void;
  theme: 'light' | 'dark' | 'system';
  hasChart: boolean;
}

function ToolbarButton({
  active,
  onClick,
  title,
  icon,
  label,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  icon: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`btn-glow flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-sm font-medium transition-all duration-200 ${
        active
          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-[0_0_12px_var(--color-glow)]'
          : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]'
      }`}
      title={title}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export default function Toolbar({
  settings,
  onToggleTimeline,
  onToggleXkcd,
  onDownload,
  onToggleTheme,
  theme,
  hasChart,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 animate-fade-up" style={{ animationDelay: '0.1s' }}>
      <ToolbarButton
        active={settings.timelineMode}
        onClick={onToggleTimeline}
        icon="⏱"
        label="Timeline"
        title="Align all repos to Day 0 — compare growth rate regardless of when projects started"
      />

      <ToolbarButton
        active={settings.xkcdStyle}
        onClick={onToggleXkcd}
        icon="✏️"
        label="Sketch"
        title="Hand-drawn chart style — wobbly lines and a playful font, inspired by XKCD comics"
      />

      <ToolbarButton
        onClick={onToggleTheme}
        icon={theme === 'dark' ? '☀️' : theme === 'light' ? '🌙' : '💻'}
        label={theme === 'system' ? 'System' : theme === 'dark' ? 'Light' : 'Dark'}
        title="Cycle through light, dark, and system theme"
      />

      {hasChart && (
        <ToolbarButton
          onClick={onDownload}
          icon="📥"
          label="PNG"
          title="Download chart as a high-resolution PNG image"
        />
      )}
    </div>
  );
}
