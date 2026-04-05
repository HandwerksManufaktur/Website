/**
 * Handwerksmanufaktur Onboarding – Cloudflare Worker
 */

const FOLDER_IDS = {
  webdesign: '0AEItEqlPzyB0Uk9PVA',
  shk: '0AC4XaHzbPF-HUk9PVA',
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function jsonResp(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function b64u(str) {
  return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function bufToB64u(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return b64u(s);
}

async function getAccessToken(clientEmail, privateKeyPem) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const enc = obj => b64u(JSON.stringify(obj));
  const signingInput = `${enc(header)}.${enc(payload)}`;

  const pemNormalized = privateKeyPem.replace(/\\n/g, '\n');
  const pemClean = pemNormalized
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '')
    .trim();

  const binaryStr = atob(pemClean);
  const derBytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) derBytes[i] = binaryStr.charCodeAt(i);

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', derBytes.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );

  const sigBuffer = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signingInput));
  const jwt = `${signingInput}.${bufToB64u(sigBuffer)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const data = await res.json();
  if (!data.access_token) throw new Error('Token error: ' + JSON.stringify(data));
  return data.access_token;
}

async function mkdir(token, name, parentId) {
  const res = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] }),
  });
  const data = await res.json();
  if (!data.id) throw new Error('mkdir failed: ' + JSON.stringify(data));
  return data.id;
}

async function createGoogleDoc(token, name, htmlContent, folderId) {
  const metadata = JSON.stringify({
    name,
    parents: [folderId],
    mimeType: 'application/vnd.google-apps.document',
  });
  const boundary = 'hwm_doc_boundary';
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    metadata,
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    htmlContent,
    `--${boundary}--`,
  ].join('\r\n');

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
  const data = await res.json();
  if (!data.id) console.error('createGoogleDoc failed:', JSON.stringify(data));
  return data.id;
}

async function sendNotification(env, firmaName, serviceType, driveLink, formData) {
  if (!env.RESEND_API_KEY) { console.error('[Email] RESEND_API_KEY not set'); return; }
  if (!env.NOTIFY_EMAIL)   { console.error('[Email] NOTIFY_EMAIL not set'); return; }

  const typ = serviceType === 'webdesign' ? 'Webdesign' : 'LeadGen & Recruiting';
  const rows = formData ? Object.entries(formData).map(([k, v]) => {
    if (k.startsWith('\u2500\u2500')) {
      // Section header
      return `<tr><td colspan="2" style="padding:10px 14px 4px;background:#f0f0f0;font-size:12px;font-weight:bold;color:#333;letter-spacing:0.5px">${k.replace(/\u2500/g,'').trim()}</td></tr>`;
    }
    if (!v) return '';
    return `<tr><td style="padding:6px 14px;color:#666;font-size:12px;white-space:nowrap;vertical-align:top;padding-left:${k.startsWith('  ')?'28px':'14px'}">${k.trim()}</td>` +
    `<td style="padding:6px 14px;font-size:12px">${String(v).replace(/\n/g, '<br>').replace(/\|/g,'·')}</td></tr>`;
  }).join('') : '';

  const html = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto">
    <div style="background:#D4860A;padding:20px 24px">
      <h1 style="color:#fff;margin:0;font-size:20px">Neues Onboarding: ${firmaName}</h1>
      <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">Typ: ${typ}</p>
    </div>
    <div style="padding:20px 24px;background:#f9f9f9">
      <a href="${driveLink}" style="display:inline-block;background:#D4860A;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;margin-bottom:20px">Drive-Ordner öffnen</a>
      <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
        ${rows}
      </table>
    </div>
  </div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Onboarding <onboarding@die-handwerksmanufaktur.de>',
      to: [env.NOTIFY_EMAIL],
      subject: `Neues Onboarding: ${firmaName} (${typ})`,
      html,
    }),
  });
  const result = await res.json().catch(() => ({}));
  console.log('[Email] Status:', res.status, JSON.stringify(result));
}

async function handleCreateFolders(request, env) {
  const body = await request.json();
  const { firmaName, leistungen = [], serviceType = 'webdesign', formData = {} } = body;
  if (!firmaName) return jsonResp({ error: 'firmaName required' }, 400);

  const token    = await getAccessToken(env.GOOGLE_CLIENT_EMAIL, env.GOOGLE_PRIVATE_KEY);
  const parentId = FOLDER_IDS[serviceType] || FOLDER_IDS.webdesign;

  const rootId     = await mkdir(token, `${firmaName} - Allgemein`, parentId);
  const internId   = await mkdir(token, '_INTERN', rootId);
  await mkdir(token, 'Vertrag', internId);
  const customerFolderId = await mkdir(token, firmaName, rootId);

  const folderIds = {};

  if (serviceType === 'webdesign') {
    folderIds.logo        = await mkdir(token, 'Logo', customerFolderId);
    folderIds.inhaberfoto = await mkdir(token, 'Inhaberfoto', customerFolderId);
    folderIds.teamfotos   = await mkdir(token, 'Teamfotos', customerFolderId);
    const leistungenFolderId = await mkdir(token, 'Leistungen', customerFolderId);
    for (let i = 0; i < leistungen.length; i++) {
      folderIds[`leistung_${i}`] = await mkdir(token, leistungen[i] || `Leistung ${i + 1}`, leistungenFolderId);
    }
    folderIds.sonstiges = await mkdir(token, 'Sonstiges', customerFolderId);
  } else {
    folderIds.inhaberfoto = await mkdir(token, 'Inhaberfoto', customerFolderId);
    folderIds.teamfotos   = await mkdir(token, 'Teamfotos', customerFolderId);
    const leistungenSHKId = await mkdir(token, 'Leistungen', customerFolderId);
    for (let i = 0; i < leistungen.length; i++) {
      folderIds[`leistung_${i}`] = await mkdir(token, leistungen[i] || `Leistung ${i + 1}`, leistungenSHKId);
    }
    const videosId = await mkdir(token, 'Videos', customerFolderId);
    await mkdir(token, 'Rohmaterial', videosId);
    await mkdir(token, 'Fertige Videos', videosId);
    folderIds.skripte   = await mkdir(token, 'Skripte', customerFolderId);
    folderIds.sonstiges = await mkdir(token, 'Sonstiges', customerFolderId);
  }

  const driveLink = `https://drive.google.com/drive/folders/${customerFolderId}`;

  // Create Google Doc with form data
  if (formData && Object.keys(formData).length > 0) {
    const typ  = serviceType === 'webdesign' ? 'Webdesign' : 'LeadGen & Recruiting';
    const date = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
    const rows = Object.entries(formData).map(function(entry) {
      var k = entry[0]; var v = entry[1];
      if (k.indexOf('──') === 0) {
        return '<tr><td colspan="2" style="padding:10px 14px 4px;background:#fff3e0;font-weight:bold;font-size:13px;color:#D4860A;border-top:2px solid #D4860A">' + k.replace(/─/g,'').trim() + '</td></tr>';
      }
      if (!v) return '';
      var indent = k.indexOf('  ') === 0 ? 'padding-left:28px;' : '';
      return '<tr style="border-bottom:1px solid #f0f0f0"><td style="padding:7px 14px;color:#555;font-size:12px;vertical-align:top;width:200px;' + indent + '">' + k.trim() + '</td>' +
      '<td style="padding:7px 14px;font-size:12px;color:#111">' + String(v).replace(/\n/g,'<br>').replace(/\|/g,'·') + '</td></tr>';
    }).join('')
    const docHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>` +
      `<h1 style="color:#D4860A">Onboarding - ${firmaName}</h1>` +
      `<p style="color:#888;font-size:12px">Typ: ${typ} | Eingegangen: ${date}</p>` +
      `<table style="width:100%;border-collapse:collapse;margin-top:16px">${rows}</table>` +
      `</body></html>`;
    await createGoogleDoc(token, `Onboarding - ${firmaName}`, docHtml, customerFolderId)
      .catch(e => console.error('Doc failed:', e.message));
  }

  // Send email
  try {
    await sendNotification(env, firmaName, serviceType, driveLink, formData);
  } catch(e) {
    console.error('[Email ERROR]', e.message);
  }

  return jsonResp({ success: true, folderIds, customerFolderId, rootId, driveLink });
}

async function handleStartUpload(request, env) {
  const { fileName, mimeType, folderId, totalSize } = await request.json();
  if (!fileName || !folderId) return jsonResp({ error: 'fileName and folderId required' }, 400);

  const token   = await getAccessToken(env.GOOGLE_CLIENT_EMAIL, env.GOOGLE_PRIVATE_KEY);
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Upload-Content-Type': mimeType || 'application/octet-stream',
  };
  if (totalSize) headers['X-Upload-Content-Length'] = String(totalSize);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',
    { method: 'POST', headers, body: JSON.stringify({ name: fileName, parents: [folderId] }) }
  );

  if (!res.ok) { const txt = await res.text(); throw new Error(`Drive session ${res.status}: ${txt}`); }
  const sessionUrl = res.headers.get('location');
  if (!sessionUrl) throw new Error('No session URL from Drive');
  return jsonResp({ sessionUrl });
}

async function handleUploadChunk(request, env) {
  const formData  = await request.formData();
  const chunk     = formData.get('chunk');
  const sessionUrl = formData.get('sessionUrl');
  const byteStart = parseInt(formData.get('byteStart'));
  const byteEnd   = parseInt(formData.get('byteEnd'));
  const totalSize = parseInt(formData.get('totalSize'));

  if (!chunk || !sessionUrl) return jsonResp({ error: 'chunk and sessionUrl required' }, 400);

  const chunkBuffer  = await chunk.arrayBuffer();
  const isLast       = byteEnd + 1 >= totalSize;
  const contentRange = isLast
    ? `bytes ${byteStart}-${byteEnd}/${totalSize}`
    : `bytes ${byteStart}-${byteEnd}/*`;

  const res = await fetch(sessionUrl, {
    method: 'PUT',
    headers: { 'Content-Range': contentRange, 'Content-Type': chunk.type || 'application/octet-stream' },
    body: chunkBuffer,
  });

  if (res.status === 200 || res.status === 201 || res.status === 308) {
    return jsonResp({ ok: true, done: res.status !== 308 });
  }
  const txt = await res.text();
  throw new Error(`Chunk upload failed ${res.status}: ${txt}`);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (request.method !== 'POST')    return new Response('Method not allowed', { status: 405, headers: CORS });

    try {
      const p = url.pathname;
      if (p === '/create-folders'  || p === '/api/create-folders')  return handleCreateFolders(request, env);
      if (p === '/start-upload'    || p === '/api/start-upload')    return handleStartUpload(request, env);
      if (p === '/upload-chunk'    || p === '/api/upload-chunk')    return handleUploadChunk(request, env);
      return new Response('Not found', { status: 404, headers: CORS });
    } catch (err) {
      console.error('[Worker]', err.message);
      return jsonResp({ error: err.message }, 500);
    }
  },
};
