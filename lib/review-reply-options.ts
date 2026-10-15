// Shared between the settings form (client) and the AI prompt (server). No server imports here.
import type { GbpReplySettings, ReplyLanguage, ReplyLength, ReplyTone } from '@/types/database';

export const TONE_OPTIONS: Array<{ value: ReplyTone; label: string; hint: string; prompt: string }> = [
  {
    value: 'warm_friendly',
    label: 'Warm & friendly',
    hint: 'Personal and welcoming. Best for restaurants, cafés, salons, local shops.',
    prompt: 'Warm, genuine and friendly, like a caring owner talking to a regular. Conversational but polished.',
  },
  {
    value: 'professional',
    label: 'Professional',
    hint: 'Courteous and composed. Best for clinics, law, finance, B2B services.',
    prompt: 'Courteous, composed and professional. Respectful and clear, never stiff or robotic.',
  },
  {
    value: 'upbeat_casual',
    label: 'Upbeat & casual',
    hint: 'Energetic and relaxed. Best for gyms, entertainment, youth brands.',
    prompt: 'Upbeat, energetic and casual, with natural enthusiasm. Still respectful.',
  },
  {
    value: 'refined_luxury',
    label: 'Refined & elegant',
    hint: 'Graceful and understated. Best for hotels, fine dining, premium brands.',
    prompt: 'Refined, gracious and understated, as a high-end hospitality brand would write. Elegant word choice, no slang.',
  },
];

export const LENGTH_OPTIONS: Array<{ value: ReplyLength; label: string; hint: string; prompt: string }> = [
  { value: 'short', label: 'Short', hint: '1–2 sentences', prompt: '1 to 2 sentences, about 20–40 words.' },
  { value: 'medium', label: 'Medium', hint: '2–4 sentences', prompt: '2 to 4 sentences, about 40–80 words.' },
  { value: 'detailed', label: 'Detailed', hint: '4–6 sentences', prompt: '4 to 6 sentences, about 80–130 words.' },
];

export const LANGUAGE_OPTIONS: Array<{ value: ReplyLanguage; label: string; prompt: string }> = [
  { value: 'match_reviewer', label: 'Same language as the review', prompt: 'the same language the review is written in (English if the review has no text)' },
  { value: 'english', label: 'Always English', prompt: 'English' },
  { value: 'arabic', label: 'Always Arabic', prompt: 'Arabic' },
  { value: 'french', label: 'Always French', prompt: 'French' },
];

export function defaultReplySettings(clientId: string): GbpReplySettings {
  return {
    clientId,
    tone: 'warm_friendly',
    length: 'medium',
    language: 'match_reviewer',
    signOff: '',
    useReviewerName: true,
    mentionBusinessName: true,
    allowEmojis: false,
    negativeContact: '',
    highlights: '',
    avoid: '',
    extraInstructions: '',
    updatedAt: '',
  };
}
