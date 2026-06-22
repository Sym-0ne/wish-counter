/**
 * Sauvegarde sur le Google Drive de l'utilisateur — 100% client, pas de backend.
 *
 * Scope `drive.file` : l'app ne voit QUE les fichiers qu'elle a elle-même créés,
 * jamais le reste du Drive. Le token d'accès vit uniquement en mémoire (jamais
 * persisté) — il faut se reconnecter à chaque session, par sécurité.
 *
 * Voir GOOGLE_DRIVE_BACKUP_SETUP.md (à la racine du dossier parent du repo)
 * pour la création du Client ID Google Cloud.
 */

const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const BACKUP_PREFIX = 'genshin-wish-backup-';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const MAX_BACKUPS = 2;

let gisLoadPromise = null;
let tokenClient = null;

function loadGisScript() {
  if (gisLoadPromise) return gisLoadPromise;
  gisLoadPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Impossible de charger Google Identity Services'));
    document.head.appendChild(script);
  });
  return gisLoadPromise;
}

/**
 * Déclenche le flow de consentement Google et retourne un access token
 * (valide ~1h, jamais persisté — à refaire à chaque session).
 */
export async function requestAccessToken(clientId) {
  await loadGisScript();

  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: () => {}, // remplacé à chaque appel ci-dessous
    });
  }

  return new Promise((resolve, reject) => {
    tokenClient.callback = (resp) => {
      if (resp.error) { reject(new Error(resp.error)); return; }
      resolve(resp.access_token);
    };
    try {
      tokenClient.requestAccessToken();
    } catch (err) {
      reject(err);
    }
  });
}

async function driveFetch(url, token, options = {}) {
  const resp = await fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`Drive API ${resp.status}${body ? ': ' + body.slice(0, 200) : ''}`);
  }
  return resp;
}

/** Liste les sauvegardes existantes, triées de la plus récente à la plus ancienne. */
export async function listBackups(token) {
  const q = encodeURIComponent(`name contains '${BACKUP_PREFIX}' and trashed = false`);
  const resp = await driveFetch(
    `${DRIVE_FILES_URL}?q=${q}&fields=files(id,name,createdTime)&orderBy=createdTime desc&spaces=drive`,
    token,
  );
  const data = await resp.json();
  return data.files ?? [];
}

/**
 * Envoie une nouvelle sauvegarde, puis supprime les plus anciennes au-delà de
 * MAX_BACKUPS — toujours APRÈS l'upload réussi, pour ne jamais se retrouver
 * sans aucune sauvegarde valide si l'envoi échoue en cours de route.
 */
export async function uploadBackup(token, stateObj) {
  const name = `${BACKUP_PREFIX}${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const metadata = { name, mimeType: 'application/json' };
  const boundary = `wishtracker-${Date.now()}`;
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${JSON.stringify(stateObj)}\r\n` +
    `--${boundary}--`;

  await driveFetch(`${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id`, token, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });

  const all = await listBackups(token);
  const stale = all.slice(MAX_BACKUPS);
  for (const file of stale) {
    // eslint-disable-next-line no-await-in-loop
    await driveFetch(`${DRIVE_FILES_URL}/${file.id}`, token, { method: 'DELETE' });
  }
}

/** Télécharge et parse le contenu JSON d'une sauvegarde. */
export async function downloadBackup(token, fileId) {
  const resp = await driveFetch(`${DRIVE_FILES_URL}/${fileId}?alt=media`, token);
  return resp.json();
}
