/**
 * Read/write public/banners-upcoming.json via GitHub Contents API.
 * Requires a fine-grained PAT with "Contents: Read and Write" on the repo.
 */

const OWNER = 'Sym-0ne';
const REPO  = 'wish-counter';
const PATH  = 'public/banners-upcoming.json';
const API   = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`;

/**
 * Fetches the current SHA + parsed entries from GitHub.
 * Works without a token on public repos (rate-limited to 60 req/h per IP).
 */
export async function readUpcomingFromGitHub(token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const resp = await fetch(API, { headers, signal: AbortSignal.timeout(8000) });
  if (!resp.ok) throw new Error(`GitHub API: HTTP ${resp.status}`);
  const data = await resp.json();
  // GitHub returns content as base64 with newlines
  const json = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
  return { sha: data.sha, entries: JSON.parse(json) };
}

/**
 * Commits an updated entries array to GitHub.
 * @param {string} token  — fine-grained PAT
 * @param {Array}  entries — full updated array
 * @param {string} sha    — current file SHA (from readUpcomingFromGitHub)
 */
export async function writeUpcomingToGitHub(token, entries, sha) {
  if (!token) throw new Error('Token GitHub manquant — configure-le dans Paramètres.');
  const body = JSON.stringify(entries, null, 2) + '\n';
  // btoa only handles latin1; encode UTF-8 first
  const content = btoa(unescape(encodeURIComponent(body)));
  const resp = await fetch(API, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'feat: update banners-upcoming.json via wish-counter UI',
      content,
      sha,
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.message || `GitHub API: HTTP ${resp.status}`);
  }
  return resp.json();
}

/** Portrait URL derived from display name (best-effort; uses enka.network). */
export function nameToPortrait(name) {
  if (!name?.trim()) return null;
  const pascal = name.trim()
    .replace(/\s+(\w)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, (c) => c.toUpperCase());
  return `https://enka.network/ui/UI_AvatarIcon_${pascal}.png`;
}
