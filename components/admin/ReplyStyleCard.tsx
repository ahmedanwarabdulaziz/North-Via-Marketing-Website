'use client';

import { useState } from 'react';
import { MessageSquare, Save, Sparkles, Check } from 'lucide-react';
import { previewReplyStyle, saveReplyStyle } from '@/app/actions/google-business';
import { LANGUAGE_OPTIONS, LENGTH_OPTIONS, TONE_OPTIONS } from '@/lib/review-reply-options';
import type { GbpReplySettings } from '@/types/database';

const inputClass =
  'w-full text-sm bg-white border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500';
const labelClass = 'block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5';

export function ReplyStyleCard({ initial }: { initial: GbpReplySettings }) {
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewing, setPreviewing] = useState<'positive' | 'negative' | null>(null);
  const [preview, setPreview] = useState<{ review: { reviewerName: string; rating: number; comment: string }; reply: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof GbpReplySettings>(key: K, value: GbpReplySettings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await saveReplyStyle(settings);
    setSaving(false);
    if (result.success) setSaved(true);
    else setError(result.error || 'Could not save.');
  }

  async function handlePreview(sample: 'positive' | 'negative') {
    setPreviewing(sample);
    setError(null);
    const result = await previewReplyStyle(settings, sample);
    setPreviewing(null);
    if (result.success && result.reply && result.review) setPreview({ review: result.review, reply: result.reply });
    else setError(result.error || 'Could not generate a preview.');
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
      <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
        <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-500" />
          Review reply style
        </h3>
        <p className="text-sm text-zinc-500 mt-1">How the AI drafts replies for this client. Every reply still needs approval before posting.</p>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <span className={labelClass}>Tone</span>
          <div className="grid sm:grid-cols-2 gap-2">
            {TONE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => update('tone', option.value)}
                className={`text-left p-3 rounded-xl border transition-colors ${
                  settings.tone === option.value ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/10' : 'border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                <div className="text-sm font-medium text-zinc-900">{option.label}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{option.hint}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <span className={labelClass}>Length</span>
            <div className="flex rounded-xl border border-zinc-200 p-1 gap-1">
              {LENGTH_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => update('length', option.value)}
                  className={`flex-1 py-1.5 rounded-lg text-sm transition-colors ${
                    settings.length === option.value ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-50'
                  }`}
                  title={option.hint}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-400 mt-1">Rating-only reviews always get a short reply.</p>
          </div>
          <div>
            <label className={labelClass} htmlFor="reply-language">Language</label>
            <select
              id="reply-language"
              value={settings.language}
              onChange={(e) => update('language', e.target.value as GbpReplySettings['language'])}
              className={inputClass}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          {([
            ['useReviewerName', 'Greet reviewer by name'],
            ['mentionBusinessName', 'Mention business name'],
            ['allowEmojis', 'Allow an emoji'],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
              <input
                type="checkbox"
                checked={settings[key]}
                onChange={(e) => update(key, e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
              />
              {label}
            </label>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass} htmlFor="reply-signoff">Sign-off</label>
            <input id="reply-signoff" value={settings.signOff || ''} onChange={(e) => update('signOff', e.target.value)} placeholder="e.g. — Sara, Owner" className={inputClass} maxLength={80} />
          </div>
          <div>
            <label className={labelClass} htmlFor="reply-contact">Contact for unhappy customers</label>
            <input id="reply-contact" value={settings.negativeContact || ''} onChange={(e) => update('negativeContact', e.target.value)} placeholder="e.g. email us at hello@brand.com" className={inputClass} maxLength={200} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass} htmlFor="reply-highlights">Worth mentioning (optional)</label>
            <textarea id="reply-highlights" rows={2} value={settings.highlights || ''} onChange={(e) => update('highlights', e.target.value)} placeholder="Signature dishes, services, values…" className={inputClass} maxLength={400} />
          </div>
          <div>
            <label className={labelClass} htmlFor="reply-avoid">Never say (optional)</label>
            <textarea id="reply-avoid" rows={2} value={settings.avoid || ''} onChange={(e) => update('avoid', e.target.value)} placeholder="Words, competitors or topics to avoid…" className={inputClass} maxLength={400} />
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="reply-extra">Extra instructions (optional)</label>
          <textarea id="reply-extra" rows={2} value={settings.extraInstructions || ''} onChange={(e) => update('extraInstructions', e.target.value)} placeholder="Anything else about this client's voice…" className={inputClass} maxLength={800} />
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        {preview && (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
            <div className="text-xs text-zinc-500">
              Sample {preview.review.rating}★ review from {preview.review.reviewerName}: “{preview.review.comment}”
            </div>
            <div className="text-sm text-zinc-800 whitespace-pre-line border-l-2 border-blue-400 pl-3">{preview.reply}</div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 sm:justify-between">
          <div className="flex gap-2">
            {(['positive', 'negative'] as const).map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => handlePreview(sample)}
                disabled={previewing !== null}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-zinc-200 text-zinc-700 text-sm font-medium rounded-lg hover:bg-zinc-50 disabled:opacity-50"
              >
                <Sparkles className={`w-4 h-4 ${previewing === sample ? 'animate-pulse' : ''}`} />
                Try on {sample === 'positive' ? '5★' : '2★'} sample
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : saved ? 'Saved' : 'Save style'}
          </button>
        </div>
      </div>
    </div>
  );
}
