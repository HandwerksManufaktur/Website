// ============================================================
// ClickUp Integration — Onboarding Form → ClickUp Tasks
// ------------------------------------------------------------
// Bei Form-Submit:
//   • Webdesign-Onboarding → Task in Kundendatenbank + Task in Website Projekte (verlinkt)
//   • SHK-Onboarding       → Task in Kundendatenbank + Task in Performance Projekte (verlinkt)
//
// Non-blocking. ClickUp-Fehler killt den Drive-Flow nicht.
// ============================================================

const CLICKUP_API = 'https://api.clickup.com/api/v2';

// === Listen-IDs ===
const LISTS = {
  kdb:         '901523338166', // 👥 Kundendatenbank (FULFILLMENT Space)
  pipeline:    '901523338959', // ⚡ Performance Projekte (FULFILLMENT Space)
  webdesign:   '901515004215', // 🌐 Website Projekte (Operations Space)
};

// === Custom Field IDs ===
const FIELDS = {
  // Kundendatenbank
  kdb: {
    ansprechpartner: 'af58b50f-ccdb-4f17-aef9-3108ed521c42',
    inhaber:         '4dac64f3-2adb-4965-9804-68f0d810eee2',
    firmenadresse:   '11ac7353-b083-48df-8a05-39b3a755a8c0',
    telefon:         '40d86cc8-bb12-4efe-8ab7-f5dedd4ff352',
    email:           '7a4de0a6-4919-49f2-a471-45b2f5bcedcd',
    uid:             '83474451-1136-4db3-89be-9bad372c58c1',
    website:         '575fce4e-409e-4cf6-b758-9fe828372bb6',
    drive:           'e0f84371-a112-46c0-bd6b-2eb22b60a3b1',
    kundeSeit:       'e7959a32-f1f0-4bdb-9405-b105db7fb115',
    kundeTyp:        '04cc689d-8be7-478c-8c46-5ca3649914d8',
    produkt:         'a8d1320e-44d2-4a07-9ad7-6f1577866b62',
  },
  // Performance Projekte
  pipeline: {
    verknuepft:      '6763295c-bd89-42e2-b85a-bfeb17d59038',
    serviceTyp:      '7f3563d3-06d9-4181-ae38-8980d5a018c0',
    eingangsdatum:   '843cfc33-6b8f-42fb-a467-ce1d7873f9fe',
    drive:           'e0f84371-a112-46c0-bd6b-2eb22b60a3b1',
    facebook:        '1a704120-1820-4d05-b2b7-bc6e9944e715',
    instagram:       '84012652-380b-4496-9aa5-c574c03cdb4c',
  },
  // Website Projekte
  webdesign: {
    briefingLink:    '84f15ecb-1633-428a-9e6d-b033524a1bcb',
    driveProjekt:    'ceec73c4-95fc-4676-95a7-287048304f1e',
    projekttyp:      '3f9ec2e7-376f-4584-bd0b-1b92727a2fb6',
    hostingAlt:      '439e369b-0012-4863-b3a4-e417c7363629',
    artTexte:        'ec4a66f2-67dd-4308-b8ba-c4611486b1b9',
    statusLogo:      'f57f55d0-df4f-4efd-b300-d27a6ae740dd',
    statusFotos:     '2311c233-23d1-4c0b-890f-cf002cdcb30d',
    statusInhalte:   '762b9e24-96da-4941-a63f-a339c8493503',
  },
};

// === Option-IDs für Dropdowns/Labels ===
const OPTS = {
  kundeTyp: {
    Webdesign:   '1106b36d-0403-4eae-b3b5-f8cd9b654c66',
    Performance: '8e159d32-b1f2-452a-a85f-bb0fa3deefb6',
    Hybrid:      '09f02faa-cb10-4db1-92a7-c0e66a7e057d',
  },
  produkt: {
    Webdesign:       'b8d7d0d3-7ede-4613-a13f-ba2d3b722585',
    Performance:     '04aee833-c4ad-4802-98a4-fb81d3e7fc87',
    Recruiting:      '67f8b549-3ba2-473d-985a-605297c79f29',
    Wartungsvertrag: 'a4bf15b3-9ae6-4534-bb92-648c2ef053c1',
  },
  serviceTyp: {
    Leadgen:    '86442432-86cc-4871-8401-da17850d9aeb',
    Recruiting: '26b44106-7ff7-45b9-82c9-fce56446d7dd',
  },
  projekttyp: {
    Onepager:   '21f42b6d-622e-4d39-95a3-c5e936f74c5d',
    Multipager: '01f92ebb-94ec-4d76-b5c5-d41ac6f1dd17',
  },
  artTexte: {
    'Neu erstellen, Basis Briefing':     'f765eb19-7f76-447c-917b-f1915061b5fb',
    'Neu erstellen, Basis alte Website': 'd66dda02-b03b-4de1-9523-1942a97b40bf',
    'Kunde liefert Texte':               '3cdd5cca-c368-4a6e-a417-fd81628c737a',
  },
  statusLogo: {
    Vorhanden: 'f94ea169-0374-4fa8-9454-84742e97e5a3',
    Fehlt:     '41a12204-7ba3-4876-b810-5ecbd609374a',
  },
  statusFotos: {
    'Vollständig vorhanden': 'd7d22af8-5e60-44c2-8e7b-eceddd7e56b7',
    'Teilweise vorhanden':   '0064e714-0306-493a-99a7-a7a46b8aab02',
    'Fehlt':                 'c22af1d2-5bf0-40fd-a60b-4b19ed6c923d',
  },
  statusInhalte: {
    'Vollständig vorhanden': '7d90a6a9-3888-4e0c-a6bf-caa0c2114386',
    'Teilweise vorhanden':   'c5bd9ad6-67ea-4bf6-b661-f82d4f47a65b',
    'Fehlt':                 'f588163c-00a4-4788-af14-4b6164b43857',
  },
};

const TASK_TYPE_LEAD = 1002;

// ============================================================
// Helpers
// ============================================================

async function clickup(token, path, method, body) {
  const res = await fetch(CLICKUP_API + path, {
    method,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ClickUp ${method} ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

// Sucht ein Form-Feld unter mehreren möglichen Keys (Fuzzy-Matching)
function pick(formData, ...keys) {
  for (const k of keys) {
    const v = formData[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
}

// Long-Text-Antworten in eine Description packen
function buildDescription(formData, driveLink) {
  const longTextKeys = [
    'Was macht ihr genau? (2–3 Sätze)',
    'Was macht ihr genau?',
    'Was macht euch besonders?',
    'Konkurrenten mit guter Website?',
    'Noch etwas das wir wissen sollten?',
    'Warum entscheiden sich Kunden für euch?',
    'Was macht euch als Arbeitgeber besonders?',
    'Erfolgsziel nach der Laufzeit',
    'Betriebsvorteile',
    'Personen vor der Kamera',
    'Bevorzugtes Datum & Uhrzeit für Videodreh',
    'Öffnungszeiten',
    'Aktuelle Auslastung Badsanierung / Monat',
    'Aktuelle Auslastung Wärmepumpen / Monat',
    'Durchschnittlicher Auftragswert',
    'Einzugsgebiet / Radius',
    'Wer kontaktiert Leads?',
    'Dienstleistung / Produkt',
    'Wann und was wurde gemacht?',
  ];
  const parts = [];
  for (const k of longTextKeys) {
    const v = formData[k];
    if (v) parts.push(`**${k}:**\n${v}`);
  }
  if (driveLink) parts.push(`---\n📁 [Drive-Ordner](${driveLink})`);
  return parts.join('\n\n');
}

function cleanFields(arr) {
  return arr.filter(f => f.value !== null && f.value !== undefined && f.value !== '');
}

// ============================================================
// Haupt-Funktion: createClickUpTasks
// ============================================================

export async function createClickUpTasks({ token, firmaName, serviceType, formData, driveLink, leistungen }) {
  const isWebdesign = serviceType === 'webdesign';
  const isSHK       = serviceType === 'shk';

  // === Stammdaten extrahieren ===
  const ansprechpartner = pick(formData, 'Ansprechpartner (Name + Position)', 'Ansprechpartner');
  const inhaber         = pick(formData, 'Inhaber / Geschäftsführer', 'Inhaber/Geschäftsführer', 'Geschäftsführer');
  const strasse         = pick(formData, 'Straße + Hausnummer', 'Straße');
  const plz             = pick(formData, 'PLZ');
  const ort             = pick(formData, 'Ort');
  const firmenadresse   = [strasse, [plz, ort].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const email           = pick(formData, 'E-Mail', 'Email');
  const telefon         = pick(formData, 'Telefon');
  const uid             = pick(formData, 'UID / USt-ID', 'UID', 'USt-ID');
  const websiteUrl      = pick(formData, 'Link zur alten Website', 'Bestehende Website');
  const facebook        = pick(formData, 'Facebook Seite Link', 'Link Facebook', 'Facebook');
  const instagram       = pick(formData, 'Instagram Handle', 'Handle Instagram', 'Instagram');

  const todayMs = Date.now();
  const description = buildDescription(formData, driveLink);

  // ============================================================
  // 1. KUNDENDATENBANK-Task — IMMER (egal welches Onboarding)
  // ============================================================
  const kdbFields = cleanFields([
    { id: FIELDS.kdb.kundeTyp,        value: isWebdesign ? OPTS.kundeTyp.Webdesign : OPTS.kundeTyp.Performance },
    { id: FIELDS.kdb.produkt,         value: isWebdesign ? [OPTS.produkt.Webdesign] : [OPTS.produkt.Performance] },
    { id: FIELDS.kdb.firmenadresse,   value: firmenadresse },
    { id: FIELDS.kdb.inhaber,         value: inhaber },
    { id: FIELDS.kdb.ansprechpartner, value: ansprechpartner },
    { id: FIELDS.kdb.telefon,         value: telefon },
    { id: FIELDS.kdb.email,           value: email },
    { id: FIELDS.kdb.uid,             value: uid },
    { id: FIELDS.kdb.website,         value: websiteUrl },
    { id: FIELDS.kdb.drive,           value: driveLink },
    { id: FIELDS.kdb.kundeSeit,       value: todayMs },
  ]);

  const kdbTask = await clickup(token, `/list/${LISTS.kdb}/task`, 'POST', {
    name: firmaName,
    status: 'aktiv',
    custom_item_id: TASK_TYPE_LEAD,
    description,
    custom_fields: kdbFields,
  });

  // ============================================================
  // 2a. WEBDESIGN-FLOW → zusätzlich Task in Website Projekte
  // ============================================================
  if (isWebdesign) {
    const projekttyp = pick(formData, 'Projekttyp', 'Onepager oder Multipager');
    const projektOpt = projekttyp && /multi/i.test(projekttyp) ? OPTS.projekttyp.Multipager : OPTS.projekttyp.Onepager;
    const hatBestehendeWebsite = pick(formData, 'Bestehende Website? (Ja/Nein)', 'Bestehende Website');
    const teamfotosVorhanden = pick(formData, 'Team-Fotos vorhanden? (Ja/Nein)', 'Team-Fotos vorhanden');

    const wdFields = cleanFields([
      { id: FIELDS.webdesign.briefingLink,  value: driveLink },
      { id: FIELDS.webdesign.driveProjekt,  value: driveLink },
      { id: FIELDS.webdesign.projekttyp,    value: projektOpt },
      { id: FIELDS.webdesign.artTexte,      value: [OPTS.artTexte['Neu erstellen, Basis Briefing']] },
      { id: FIELDS.webdesign.statusLogo,    value: OPTS.statusLogo.Fehlt }, // wird upgegradet wenn Logo im Drive
      { id: FIELDS.webdesign.statusFotos,   value: teamfotosVorhanden && /ja/i.test(teamfotosVorhanden)
                                                    ? OPTS.statusFotos['Teilweise vorhanden']
                                                    : OPTS.statusFotos.Fehlt },
      { id: FIELDS.webdesign.statusInhalte, value: OPTS.statusInhalte['Teilweise vorhanden'] },
    ]);

    const wdTask = await clickup(token, `/list/${LISTS.webdesign}/task`, 'POST', {
      name: `${firmaName} - ${projekttyp && /multi/i.test(projekttyp) ? 'Multipager' : 'Onepager'}`,
      status: 'neuer kunde',
      description,
      custom_fields: wdFields,
    });

    // Relationship: Website Projekt ↔ Kundendatenbank
    await clickup(token, `/task/${wdTask.id}/link/${kdbTask.id}`, 'POST', null).catch(() => {});

    // Leistungen als Subtasks im Website Projekt
    if (Array.isArray(leistungen)) {
      for (const leistung of leistungen) {
        if (!leistung) continue;
        const stichpunkte = pick(formData, `${leistung} - Stichpunkte`, `Stichpunkte ${leistung}`) || '';
        await clickup(token, `/list/${LISTS.webdesign}/task`, 'POST', {
          name: leistung,
          parent: wdTask.id,
          description: stichpunkte,
        }).catch(() => {});
      }
    }

    return { kdbTaskId: kdbTask.id, webdesignTaskId: wdTask.id };
  }

  // ============================================================
  // 2b. SHK-FLOW → zusätzlich Task in Performance Projekte
  // ============================================================
  if (isSHK) {
    const auswahl = (pick(formData, 'Service-Auswahl', 'Recruiting / Neukundengewinnung') || '').toLowerCase();
    const isRecruiting = auswahl.includes('recruiting');

    const ppFields = cleanFields([
      { id: FIELDS.pipeline.verknuepft,    value: firmaName },
      { id: FIELDS.pipeline.serviceTyp,    value: isRecruiting ? OPTS.serviceTyp.Recruiting : OPTS.serviceTyp.Leadgen },
      { id: FIELDS.pipeline.eingangsdatum, value: todayMs },
      { id: FIELDS.pipeline.drive,         value: driveLink },
      { id: FIELDS.pipeline.facebook,      value: facebook },
      { id: FIELDS.pipeline.instagram,     value: instagram },
    ]);

    const ppTask = await clickup(token, `/list/${LISTS.pipeline}/task`, 'POST', {
      name: firmaName,
      status: '🆕 Neuer Kunde',
      custom_item_id: TASK_TYPE_LEAD,
      description,
      custom_fields: ppFields,
    });

    // Relationship: Performance Projekt ↔ Kundendatenbank
    await clickup(token, `/task/${ppTask.id}/link/${kdbTask.id}`, 'POST', null).catch(() => {});

    // Offene Stellen als Subtasks (nur bei Recruiting)
    if (isRecruiting) {
      for (let i = 1; i <= 10; i++) {
        const stelle = pick(formData, `Stelle ${i} - Stellenbezeichnung`, `Stellenbezeichnung ${i}`, `Stelle ${i}`);
        if (!stelle) break;
        const gehalt      = pick(formData, `Stelle ${i} - Gehaltsspanne brutto`, `Stelle ${i} - Gehalt`);
        const muss        = pick(formData, `Stelle ${i} - Muss-Anforderungen`);
        const kann        = pick(formData, `Stelle ${i} - Kann-Anforderungen`);
        const arbeitszeit = pick(formData, `Stelle ${i} - Arbeitszeiten`);
        const subDesc = [
          gehalt      && `**Gehalt:** ${gehalt}`,
          muss        && `**Muss-Anforderungen:**\n${muss}`,
          kann        && `**Kann-Anforderungen:**\n${kann}`,
          arbeitszeit && `**Arbeitszeiten:** ${arbeitszeit}`,
        ].filter(Boolean).join('\n\n');
        await clickup(token, `/list/${LISTS.pipeline}/task`, 'POST', {
          name: `🎯 ${stelle}`,
          parent: ppTask.id,
          description: subDesc,
        }).catch(() => {});
      }
    }

    return { kdbTaskId: kdbTask.id, pipelineTaskId: ppTask.id };
  }

  return { kdbTaskId: kdbTask.id };
}
