# Sprint AUTH-PERFEKT — Login, Passwort-Reset, 2-Faktor-Authentifizierung

> **PRIORITÄT:** Kritisch. Wird nach S-SICHER und vor S3 ausgeführt.
> Marcel will: *"Login muss perfekt funktionieren, auch Passwort vergessen. Am besten direkt 2FA."*

---

## Ziel

Authentifizierung die NICHT ausgehebelt werden kann. 3 Kern-Flows bulletproof machen:
1. Login (mit Rate-Limiting, Brute-Force-Schutz)
2. Passwort-Reset (zeitbegrenzte Tokens, E-Mail-basiert)
3. 2-Faktor-Authentifizierung (TOTP + Backup-Codes)

---

## Voraussetzungen

- ✅ Sprint S-SICHER abgeschlossen (Auth-Flow grundlegend auditiert)
- ✅ IONOS SMTP-Zugang funktioniert
- ✅ Airtable: Feld `two_factor_secret` (Long Text, verschlüsselt) in SACHVERSTEANDIGE
- ✅ Airtable: Feld `two_factor_enabled` (Checkbox) in SACHVERSTEANDIGE
- ✅ Airtable: Feld `backup_codes_hash` (Long Text) in SACHVERSTEANDIGE
- ✅ Airtable: Tabelle `PASSWORD_RESET_TOKENS` (neu, siehe unten)
- ✅ Airtable: Tabelle `LOGIN_ATTEMPTS` (neu, siehe unten)

---

## Neue Airtable-Tabellen

### PASSWORD_RESET_TOKENS
| Feld | Typ |
|---|---|
| `token_hash` (Primary) | Single Line Text |
| `sv_email` | Email |
| `created_at` | Date and Time |
| `expires_at` | Date and Time (15 Min nach created_at) |
| `used_at` | Date and Time |
| `ip_address` | Single Line Text |

### LOGIN_ATTEMPTS
| Feld | Typ |
|---|---|
| `email` | Email |
| `timestamp` | Date and Time |
| `success` | Checkbox |
| `ip_address` | Single Line Text |
| `failure_reason` | Single Line Text |

**WICHTIG:** Beide Tabellen in `airtable.js` Whitelist mit `readOnly: true` für Frontend (nur Backend-Functions dürfen schreiben).

---

## Teil 1: Login mit Rate-Limiting

### Problem heute
`app-login.html` lässt beliebig viele Fehlversuche zu → Brute-Force möglich.

### Lösung
Neue Function `/.netlify/functions/login` übernimmt:

```javascript
// login.js (Netlify Function)
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

exports.handler = async function(event) {
  var { email, password } = JSON.parse(event.body);
  var ip = event.headers['x-nf-client-connection-ip'] || 'unknown';
  
  // 1. Rate-Limit-Check: max 5 Fehlversuche in 15 Min pro Email
  var recentFailures = await countFailedAttempts(email, 15);
  if (recentFailures >= 5) {
    await logAttempt(email, false, ip, 'rate_limited');
    return {
      statusCode: 429,
      body: JSON.stringify({ error: 'Zu viele Versuche. Bitte warten Sie 15 Minuten.' })
    };
  }
  
  // 2. Email-basiertes Rate-Limit-Check: max 20 Fehlversuche in 1 Std pro IP
  var recentFailuresByIP = await countFailedAttemptsByIP(ip, 60);
  if (recentFailuresByIP >= 20) {
    await logAttempt(email, false, ip, 'ip_rate_limited');
    return { statusCode: 429, body: JSON.stringify({ error: 'IP gesperrt. Bitte warten.' })};
  }
  
  // 3. User aus Airtable laden (mit Passwort-Hash)
  var user = await getUserByEmail(email);
  if (!user) {
    await logAttempt(email, false, ip, 'user_not_found');
    // WICHTIG: Gleiche Antwort wie bei falschem Passwort (Timing-Angriff verhindern)
    await new Promise(r => setTimeout(r, 200));
    return { statusCode: 401, body: JSON.stringify({ error: 'E-Mail oder Passwort falsch' })};
  }
  
  // 4. Passwort prüfen
  var passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) {
    await logAttempt(email, false, ip, 'wrong_password');
    return { statusCode: 401, body: JSON.stringify({ error: 'E-Mail oder Passwort falsch' })};
  }
  
  // 5. 2FA-Check: falls aktiviert, separaten Schritt anzeigen
  if (user.two_factor_enabled) {
    // Temporäres Token für 2FA-Schritt (5 Min gültig)
    var partialToken = crypto.randomBytes(32).toString('hex');
    await storePartialAuthToken(partialToken, email, 5);
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        requires_2fa: true, 
        partial_token: partialToken 
      })
    };
  }
  
  // 6. Login erfolgreich, Session-Token ausstellen
  await logAttempt(email, true, ip, null);
  var sessionToken = createSessionToken(user);
  return {
    statusCode: 200,
    body: JSON.stringify({ 
      success: true, 
      session_token: sessionToken,
      user: { email: user.email, paket: user.paket }
    })
  };
};
```

### Frontend-Anpassung `app-login.html`

```javascript
async function doLogin() {
  var email = document.getElementById('email').value.trim();
  var password = document.getElementById('password').value;
  
  var res = await fetch('/.netlify/functions/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ email, password })
  });
  
  if (res.status === 429) {
    showError('Zu viele Versuche. Bitte warten Sie 15 Minuten.');
    return;
  }
  
  if (!res.ok) {
    showError('E-Mail oder Passwort falsch');
    return;
  }
  
  var data = await res.json();
  
  if (data.requires_2fa) {
    // Zeige 2FA-Eingabe
    sessionStorage.setItem('partial_token', data.partial_token);
    showTwoFactorScreen();
    return;
  }
  
  // Login erfolgreich
  localStorage.setItem('prova_session_token', data.session_token);
  localStorage.setItem('prova_sv_email', data.user.email);
  window.location.href = 'fall-aufmachen.html';
}
```

---

## Teil 2: Passwort-Reset (sicher)

### Flow
1. User klickt "Passwort vergessen" → gibt Email ein
2. System generiert **zeitbegrenzten Token** (15 Min gültig), schickt Link per Email
3. User klickt Link → neue Passwort-Seite → setzt neues Passwort
4. Token wird als `used_at` markiert, kann nicht wiederverwendet werden

### `password-reset-request.js` (Netlify Function)

```javascript
const crypto = require('crypto');

exports.handler = async function(event) {
  var { email } = JSON.parse(event.body);
  var ip = event.headers['x-nf-client-connection-ip'] || 'unknown';
  
  // 1. Rate-Limit: max 3 Reset-Requests pro Email in 1 Std
  var recent = await countResetRequests(email, 60);
  if (recent >= 3) {
    // WICHTIG: Trotzdem "Email wurde verschickt" antworten (Enumeration-Schutz)
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  }
  
  // 2. User existiert? (nicht preisgeben ob ja/nein!)
  var user = await getUserByEmail(email);
  if (user) {
    // 3. Token generieren, Hash in Airtable speichern
    var rawToken = crypto.randomBytes(32).toString('hex');
    var tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    
    await createResetToken({
      token_hash: tokenHash,
      sv_email: email,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      ip_address: ip
    });
    
    // 4. Email versenden mit RAW-Token im Link
    var resetLink = 'https://prova-systems.de/passwort-neu.html?token=' + rawToken;
    await sendPasswordResetEmail(email, resetLink);
  }
  
  // IMMER gleiche Antwort (auch wenn User nicht existiert) - Enumeration-Schutz
  return { 
    statusCode: 200, 
    body: JSON.stringify({ success: true, message: 'Falls die E-Mail existiert, erhalten Sie einen Reset-Link.' })
  };
};
```

### `password-reset-confirm.js`

```javascript
exports.handler = async function(event) {
  var { token, new_password } = JSON.parse(event.body);
  
  // 1. Passwort-Komplexität prüfen
  if (!isPasswordStrong(new_password)) {
    return { statusCode: 400, body: JSON.stringify({ 
      error: 'Passwort muss mind. 12 Zeichen haben, Groß-/Kleinschreibung, Zahl und Sonderzeichen.' 
    })};
  }
  
  // 2. Token-Hash berechnen, in DB suchen
  var tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  var tokenRecord = await getResetToken(tokenHash);
  
  if (!tokenRecord) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Ungültiger Link' })};
  }
  
  // 3. Nicht abgelaufen?
  if (new Date(tokenRecord.expires_at) < new Date()) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Link abgelaufen. Bitte neu anfordern.' })};
  }
  
  // 4. Noch nicht benutzt?
  if (tokenRecord.used_at) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Link bereits verwendet.' })};
  }
  
  // 5. Passwort setzen
  var hash = await bcrypt.hash(new_password, 12);
  await updateUserPassword(tokenRecord.sv_email, hash);
  
  // 6. Token als verbraucht markieren
  await markTokenAsUsed(tokenRecord.id);
  
  // 7. ALLE bestehenden Sessions dieser Email invalidieren
  await invalidateAllSessions(tokenRecord.sv_email);
  
  // 8. Security-Email: "Ihr Passwort wurde geändert von IP XYZ um HH:MM"
  await sendPasswordChangedNotificationEmail(tokenRecord.sv_email);
  
  return { statusCode: 200, body: JSON.stringify({ success: true })};
};
```

### Passwort-Komplexität prüfen

```javascript
function isPasswordStrong(pw) {
  if (pw.length < 12) return false;
  if (!/[A-Z]/.test(pw)) return false;  // Großbuchstabe
  if (!/[a-z]/.test(pw)) return false;  // Kleinbuchstabe
  if (!/[0-9]/.test(pw)) return false;  // Zahl
  if (!/[^A-Za-z0-9]/.test(pw)) return false;  // Sonderzeichen
  return true;
}
```

---

## Teil 3: 2-Faktor-Authentifizierung (TOTP)

### Überblick

**TOTP** = Time-based One-Time Password. Der Standard für 2FA. Funktioniert mit Google Authenticator, Authy, Microsoft Authenticator, 1Password, Bitwarden.

### Abhängigkeit

```bash
npm install speakeasy qrcode
```

`speakeasy` ist die Standard-Library. Millionenfach getestet.

### Setup-Flow (SV aktiviert 2FA)

1. SV geht in Einstellungen → "2FA aktivieren"
2. Server generiert **Secret** (Base32-String)
3. Server zeigt **QR-Code** (SV scannt mit Authenticator-App)
4. SV gibt **aktuellen 6-stelligen Code** zur Verifizierung ein
5. Wenn korrekt: Server speichert Secret **verschlüsselt** in Airtable
6. Server generiert **10 Backup-Codes** (für den Fall dass Handy verloren geht)
7. SV **lädt Backup-Codes als PDF runter** (dringender Hinweis!)

### `2fa-setup.js` (Netlify Function)

```javascript
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const crypto = require('crypto');

exports.handler = async function(event) {
  var { action } = JSON.parse(event.body);
  var sessionEmail = validateSessionToken(event.headers.authorization);
  if (!sessionEmail) return { statusCode: 401, body: 'Unauthorized' };
  
  if (action === 'generate') {
    // Secret generieren
    var secret = speakeasy.generateSecret({
      name: 'PROVA Systems (' + sessionEmail + ')',
      issuer: 'PROVA Systems',
      length: 32
    });
    
    // QR-Code als Data-URL
    var qrDataUrl = await qrcode.toDataURL(secret.otpauth_url);
    
    // Secret TEMPORÄR in Session (nicht in Airtable bis verifiziert)
    await storeTempSecret(sessionEmail, secret.base32);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        secret_base32: secret.base32,  // nur zur Anzeige
        qr_code: qrDataUrl
      })
    };
  }
  
  if (action === 'verify') {
    var { code } = JSON.parse(event.body);
    var tempSecret = await getTempSecret(sessionEmail);
    
    var verified = speakeasy.totp.verify({
      secret: tempSecret,
      encoding: 'base32',
      token: code,
      window: 1  // erlaubt ±30 Sek Drift
    });
    
    if (!verified) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Code falsch' })};
    }
    
    // Secret PERMANENT in Airtable speichern (verschlüsselt!)
    var encryptedSecret = encryptSecret(tempSecret);
    await enableTwoFactor(sessionEmail, encryptedSecret);
    
    // 10 Backup-Codes generieren
    var backupCodes = [];
    var backupHashes = [];
    for (var i = 0; i < 10; i++) {
      var code = crypto.randomBytes(4).toString('hex').toUpperCase(); // z.B. "A3F2-9B7C"
      backupCodes.push(code.substr(0, 4) + '-' + code.substr(4));
      backupHashes.push(crypto.createHash('sha256').update(code).digest('hex'));
    }
    
    await storeBackupCodes(sessionEmail, backupHashes);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        backup_codes: backupCodes,  // NUR EINMAL ANGEZEIGT!
        warning: 'Speichern Sie diese Codes sicher. Sie werden nie wieder angezeigt.'
      })
    };
  }
};

function encryptSecret(secret) {
  var key = process.env.TWO_FACTOR_ENCRYPTION_KEY; // 32-Byte Key in Netlify ENV
  var iv = crypto.randomBytes(16);
  var cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  var encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  var authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted.toString('hex');
}
```

### Login-Flow mit 2FA

```javascript
// 2fa-verify.js (nach erfolgreichem Passwort-Check)
exports.handler = async function(event) {
  var { partial_token, code } = JSON.parse(event.body);
  
  // 1. Partial-Token validieren (existiert + nicht abgelaufen)
  var email = await getEmailFromPartialToken(partial_token);
  if (!email) return { statusCode: 401, body: 'Invalid token' };
  
  // 2. User + 2FA-Secret laden
  var user = await getUserByEmail(email);
  var secret = decryptSecret(user.two_factor_secret);
  
  // 3. Check: Ist es ein TOTP-Code ODER ein Backup-Code?
  var isBackupCode = code.includes('-');
  
  if (isBackupCode) {
    var codeHash = crypto.createHash('sha256').update(code).digest('hex');
    var validBackup = await consumeBackupCode(email, codeHash);
    if (!validBackup) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Backup-Code ungültig oder schon verwendet' })};
    }
    // Optional: User per Email benachrichtigen "Backup-Code verwendet"
    await notifyBackupCodeUsed(email);
  } else {
    // TOTP-Code
    var verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: code,
      window: 1
    });
    if (!verified) {
      return { statusCode: 401, body: JSON.stringify({ error: '2FA-Code falsch' })};
    }
  }
  
  // 4. Login erfolgreich
  await consumePartialToken(partial_token);
  var sessionToken = createSessionToken(user);
  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, session_token: sessionToken })
  };
};
```

### UI in `einstellungen.html`

Neuer Bereich "Sicherheit":

```html
<section class="sicherheit">
  <h2>Zwei-Faktor-Authentifizierung</h2>
  <p>Schützt Ihren Account auch wenn Ihr Passwort gestohlen wird.</p>
  
  <div id="2fa-status">
    <!-- dynamisch: "Aktiv" oder "Nicht aktiv" -->
  </div>
  
  <button onclick="setup2FA()" id="btn-setup-2fa">2FA aktivieren</button>
  
  <div id="2fa-setup-wizard" style="display:none">
    <!-- Schritt 1: QR-Code -->
    <div class="step step-1">
      <h3>Schritt 1: Scannen Sie den QR-Code</h3>
      <img id="qr-code" src="">
      <p>Benötigen Sie eine App? 
        <a href="https://authy.com" target="_blank">Authy</a> oder
        <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2" target="_blank">Google Authenticator</a>
      </p>
      <button onclick="next2FAStep()">Weiter</button>
    </div>
    
    <!-- Schritt 2: Code eingeben -->
    <div class="step step-2" style="display:none">
      <h3>Schritt 2: Code aus App eingeben</h3>
      <input type="text" id="verify-code" maxlength="6" pattern="\d{6}" placeholder="6-stelliger Code">
      <button onclick="verify2FA()">Aktivieren</button>
    </div>
    
    <!-- Schritt 3: Backup-Codes -->
    <div class="step step-3" style="display:none">
      <h3>WICHTIG: Backup-Codes speichern</h3>
      <p class="warning">Diese Codes werden NUR EINMAL angezeigt. Falls Sie Ihr Handy verlieren, brauchen Sie diese.</p>
      <pre id="backup-codes"></pre>
      <button onclick="downloadBackupCodes()">Als PDF herunterladen</button>
      <button onclick="finish2FASetup()">Ich habe die Codes gesichert</button>
    </div>
  </div>
</section>
```

---

## Zusätzliche Sicherheitsmaßnahmen

### Session-Invalidierung bei Passwort-Änderung

Wenn ein User sein Passwort ändert (freiwillig oder via Reset), werden **alle bestehenden Sessions** invalidiert. Ein eingeschleuster Angreifer wird somit ausgeloggt.

### Security-Email bei kritischen Änderungen

Bei:
- Passwort-Änderung
- 2FA aktiviert/deaktiviert
- Neuer Login von unbekannter IP
- Backup-Code verwendet

→ Automatische Email an den User mit IP, Zeitpunkt, Gerät-Info. Das verhindert dass ein erfolgreicher Angriff unbemerkt bleibt.

### Auto-Logout bei Inaktivität

60 Minuten ohne Aktivität → automatischer Logout mit Hinweis. Verhindert Session-Hijacking bei verlorenen Geräten.

---

## Akzeptanzkriterien

- [ ] Login hat Rate-Limiting (5 Fehlversuche pro Email in 15 Min, 20 pro IP in 1h)
- [ ] Login-Attempts werden in Airtable geloggt
- [ ] Timing-Attack-Schutz (gleiche Antwortzeit bei existierendem/nicht-existierendem User)
- [ ] Passwort-Komplexität: 12+ Zeichen, Groß-/Klein/Zahl/Sonderzeichen
- [ ] Passwort-Reset-Token: 15 Min gültig, einmalig verwendbar, Hash in DB
- [ ] Enumeration-Schutz: gleiche Antwort bei existierender/nicht-existierender Email
- [ ] 2FA per TOTP mit speakeasy
- [ ] QR-Code-Setup in Einstellungen
- [ ] 10 Backup-Codes generiert + nur einmal angezeigt + als PDF downloadbar
- [ ] Backup-Codes: Hashes in DB, Einmal-Verwendung enforcen
- [ ] 2FA-Secret verschlüsselt in Airtable (AES-256-GCM)
- [ ] `TWO_FACTOR_ENCRYPTION_KEY` in Netlify ENV (32 Byte hex)
- [ ] Session-Invalidierung bei Passwort-Änderung
- [ ] Security-Email bei kritischen Änderungen
- [ ] Auto-Logout nach 60 Min Inaktivität
- [ ] sw.js CACHE_VERSION inkrementiert

---

## Test-Checkliste für Marcel

### Login-Tests
1. [ ] 5× falsches Passwort eingeben → 6. Versuch blockiert "Zu viele Versuche"
2. [ ] 15 Min warten, dann korrekt einloggen → klappt
3. [ ] Gültiges Passwort korrekt → Login erfolgreich
4. [ ] Im DevTools Network: Bei falschem UND richtigem Email-Versuch: gleiche Response-Zeit

### Passwort-Reset-Tests
5. [ ] "Passwort vergessen" mit existierender Email → Email kommt an
6. [ ] "Passwort vergessen" mit nicht-existierender Email → gleiche UI-Antwort (keine Enumeration)
7. [ ] Reset-Link klicken → neues Passwort "abc123" → Fehler "nicht stark genug"
8. [ ] Starkes neues Passwort → Erfolg, kann einloggen
9. [ ] Alter Reset-Link nochmal klicken → "Bereits verwendet"
10. [ ] Reset-Link nach 16 Min klicken → "Abgelaufen"
11. [ ] Alte Session (zweiter Browser) → nach Passwort-Change ausgeloggt

### 2FA-Tests
12. [ ] In Einstellungen "2FA aktivieren" → QR-Code erscheint
13. [ ] Mit Authy/Google Authenticator scannen → 6-stelliger Code erscheint
14. [ ] Code eingeben → "erfolgreich aktiviert"
15. [ ] 10 Backup-Codes werden angezeigt → PDF-Download klappt
16. [ ] Logout + Login → nach Passwort wird 2FA-Code verlangt
17. [ ] Falscher 2FA-Code → Fehlermeldung
18. [ ] Richtiger 2FA-Code → Login erfolgreich
19. [ ] Einen Backup-Code verwenden statt App-Code → funktioniert
20. [ ] Gleichen Backup-Code nochmal → "bereits verwendet"
21. [ ] 2FA deaktivieren → Security-Email kommt an

---

## Bekannte Limitierungen

- WebAuthn/FIDO2 (Hardware-Keys wie YubiKey) kommen in K3+
- SMS-2FA NICHT implementiert (unsicher wegen SIM-Swapping)
- Social-Login (Google/Microsoft) kommt in K3+
