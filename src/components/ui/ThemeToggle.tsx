'use client';

import React from 'react';
import { useTheme } from '@/lib/theme/ThemeContext';
import { Moon, Sun, Check, Sparkles } from 'lucide-react';

interface ThemeToggleProps {
  variant?: 'pill' | 'icon' | 'selector';
  className?: string;
}

export default function ThemeToggle({ variant = 'pill', className = '' }: ThemeToggleProps) {
  const { theme, setTheme, toggleTheme } = useTheme();

  // Variant 1: Compact single icon button
  if (variant === 'icon') {
    const isDark = theme === 'dark';
    return (
      <button
        onClick={toggleTheme}
        className={`p-2 rounded-xl transition-all duration-200 flex items-center justify-center ${
          isDark
            ? 'bg-slate-800/80 hover:bg-slate-700/80 text-amber-300 border border-slate-700'
            : 'bg-white hover:bg-slate-100 text-indigo-600 border border-slate-200 shadow-sm'
        } ${className}`}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        aria-label="Toggle theme"
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    );
  }

  // Variant 2: Full 2-option cards for Settings & Preference pages
  if (variant === 'selector') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`}>
        {/* Option 1: Dark Mode Card */}
        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`p-4 rounded-2xl text-left border transition-all duration-200 relative overflow-hidden group ${
            theme === 'dark'
              ? 'bg-slate-900/90 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/20'
              : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-indigo-400 flex items-center justify-center">
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-sm text-white">Dark Mode</p>
                <p className="text-[11px] text-slate-400">Deep cosmic slate</p>
              </div>
            </div>
            {theme === 'dark' ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                <Check className="w-3 h-3" />
                ACTIVE
              </span>
            ) : (
              <span className="text-xs text-slate-500 group-hover:text-slate-400">Select</span>
            )}
          </div>

          <div className="h-16 rounded-xl bg-slate-950 p-2 border border-slate-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-12 h-2 rounded bg-indigo-500/50" />
              <div className="w-4 h-2 rounded bg-emerald-500/40" />
            </div>
            <div className="space-y-1">
              <div className="w-full h-1.5 rounded bg-slate-800" />
              <div className="w-3/4 h-1.5 rounded bg-slate-800/60" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2.5">
            Optimized for low-light environments, reduced eye strain, and high-focus coding.
          </p>
        </button>

        {/* Option 2: Light Mode Card */}
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`p-4 rounded-2xl text-left border transition-all duration-200 relative overflow-hidden group ${
            theme === 'light'
              ? 'bg-white border-indigo-500 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/20'
              : 'bg-white/40 border-slate-200 hover:border-slate-300 opacity-80 hover:opacity-100'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900">Light Mode</p>
                <p className="text-[11px] text-slate-500">Crisp daytime clarity</p>
              </div>
            </div>
            {theme === 'light' ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                <Check className="w-3 h-3" />
                ACTIVE
              </span>
            ) : (
              <span className="text-xs text-slate-500 group-hover:text-slate-600">Select</span>
            )}
          </div>

          <div className="h-16 rounded-xl bg-slate-50 p-2 border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-12 h-2 rounded bg-indigo-600/50" />
              <div className="w-4 h-2 rounded bg-emerald-600/40" />
            </div>
            <div className="space-y-1">
              <div className="w-full h-1.5 rounded bg-slate-200" />
              <div className="w-3/4 h-1.5 rounded bg-slate-200/60" />
            </div>
          </div>
          <p className="text-[11px] text-slate-600 mt-2.5">
            Bright, high-contrast daylight aesthetic with clean cards and sharp typography.
          </p>
        </button>
      </div>
    );
  }

  // Variant 3: Segmented 2-option Pill Switcher (Default)
  return (
    <div
      role="group"
      aria-label="Theme selection: Dark Mode or Light Mode"
      className={`inline-flex items-center p-1 rounded-xl border backdrop-blur-md transition-all duration-200 ${
        theme === 'dark'
          ? 'bg-slate-900/90 border-slate-800 text-slate-400'
          : 'bg-slate-100 border-slate-300 text-slate-600 shadow-sm'
      } ${className}`}
    >
      {/* 2 options: Dark Mode & Light Mode */}
      <button
        type="button"
        onClick={() => setTheme('dark')}
        aria-pressed={theme === 'dark'}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
          theme === 'dark'
            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <Moon className="w-3.5 h-3.5" />
        <span>Dark</span>
      </button>

      <button
        type="button"
        onClick={() => setTheme('light')}
        aria-pressed={theme === 'light'}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
          theme === 'light'
            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Sun className="w-3.5 h-3.5" />
        <span>Light</span>
      </button>
    </div>
  );
}
