/**
 * Jev (TypeSafe AI) judgements. Jev judges; code decides.
 * All questions and thresholds live here. Everything is OFF unless
 * TYPESAFE_API_KEY is set, and any failure returns null so callers keep
 * today's behaviour.
 */

const JEV_URL = 'https://api.typesafe.ai/v1/systemone';

// Thresholds (code decides)
export const ICON_REJECT_P = 0.7; // reject icon if p(text) or p(people) above this
export const NOTE_CHIP_SUGGEST_P = 0.8; // suggest a chip above this

type NoulQuestion = { type: 'noul'; instructions: string; criteria?: string };
type Answers = Record<string, { noul?: number }>;

function getEnv(name: string): string | undefined {
  try {
    // deno-lint-ignore no-explicit-any
    return (globalThis as any).Deno?.env?.get(name) ?? undefined;
  } catch {
    return undefined;
  }
}

export function jevEnabled(): boolean {
  return Boolean(getEnv('TYPESAFE_API_KEY'));
}

async function askJev(
  state: string,
  questions: Record<string, NoulQuestion>,
  assets?: Record<string, { type: 'image'; format: 'png' | 'jpg'; data_base64: string }>,
  fetchImpl: typeof fetch = fetch
): Promise<Answers | null> {
  const key = getEnv('TYPESAFE_API_KEY');
  if (!key) return null;
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    };
    if (assets) headers['TypeSafe-Danger-Zone-Images'] = 'true';
    const res = await fetchImpl(JEV_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: getEnv('JEV_MODEL') || 'jev-latest', state, questions, ...(assets ? { assets } : {}) }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.answers ?? data) as Answers;
  } catch {
    return null;
  }
}

function p(answers: Answers | null, name: string): number | null {
  const v = answers?.[name]?.noul;
  return typeof v === 'number' ? v : null;
}

// ---------- Tracker icon QA ----------

export const ICON_QUESTIONS: Record<string, NoulQuestion> = {
  has_text: {
    type: 'noul',
    instructions: 'Does the image {{icon}} contain any visible letters, words, numbers or text-like glyphs?',
  },
  has_people: {
    type: 'noul',
    instructions: 'Does the image {{icon}} show a person, face, body or human figure?',
  },
};

/** Pure decision: true when the icon should be rejected and retried. */
export function decideIconReject(answers: Answers | null): boolean {
  if (!answers) return false;
  const t = p(answers, 'has_text') ?? 0;
  const h = p(answers, 'has_people') ?? 0;
  return t > ICON_REJECT_P || h > ICON_REJECT_P;
}

/** Returns true if the icon should be rejected. False when Jev is off or fails. */
export async function iconFailsQa(
  imageData: { data: string; mimeType: string },
  fetchImpl: typeof fetch = fetch
): Promise<boolean> {
  if (!jevEnabled()) return false;
  const format = imageData.mimeType.includes('png') ? 'png' : 'jpg';
  const answers = await askJev(
    'A generated app icon for a health tracker: {{icon}}',
    ICON_QUESTIONS,
    { '{{icon}}': { type: 'image', format, data_base64: imageData.data } },
    fetchImpl
  );
  return decideIconReject(answers);
}

// ---------- Notes to chips ----------

export function buildNoteChipQuestions(
  triggers: string[],
  locations: { value: string; label: string }[]
): Record<string, NoulQuestion> {
  const q: Record<string, NoulQuestion> = {};
  triggers.forEach((t, i) => {
    q[`trigger_${i}`] = {
      type: 'noul',
      instructions: `Does the note say or clearly imply that "${t}" contributed?`,
    };
  });
  locations.forEach((l, i) => {
    q[`location_${i}`] = { type: 'noul', instructions: `Does the note mention "${l.label}"?` };
  });
  return q;
}

/** Pure decision: options above threshold that the user has not already selected or dismissed. */
export function decideNoteChips(
  answers: Answers | null,
  triggers: string[],
  locations: { value: string; label: string }[],
  already: { triggers: string[]; locations: string[]; dismissed?: string[] }
): { triggers: string[]; locations: string[] } {
  const out = { triggers: [] as string[], locations: [] as string[] };
  if (!answers) return out;
  const skip = new Set([...(already.dismissed ?? [])]);
  triggers.forEach((t, i) => {
    if ((p(answers, `trigger_${i}`) ?? 0) > NOTE_CHIP_SUGGEST_P && !already.triggers.includes(t) && !skip.has(t)) {
      out.triggers.push(t);
    }
  });
  locations.forEach((l, i) => {
    if ((p(answers, `location_${i}`) ?? 0) > NOTE_CHIP_SUGGEST_P && !already.locations.includes(l.value) && !skip.has(l.value)) {
      out.locations.push(l.value);
    }
  });
  return out;
}

/** Suggest chips from a note. Returns empty lists when Jev is off or fails. Never auto-applies. */
export async function suggestNoteChips(
  note: string,
  triggers: string[],
  locations: { value: string; label: string }[],
  already: { triggers: string[]; locations: string[]; dismissed?: string[] },
  fetchImpl: typeof fetch = fetch
): Promise<{ triggers: string[]; locations: string[] }> {
  if (!jevEnabled() || !note.trim() || (triggers.length + locations.length) === 0) {
    return { triggers: [], locations: [] };
  }
  const answers = await askJev(`Entry note: ${note.slice(0, 1000)}`, buildNoteChipQuestions(triggers, locations), undefined, fetchImpl);
  return decideNoteChips(answers, triggers, locations, already);
}
