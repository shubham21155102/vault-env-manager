let envVars = {};

// Load saved environment variables on popup open
document.addEventListener('DOMContentLoaded', () => {
  loadEnvVars();
  loadS3Config();
});

// Parse .env content button
document.getElementById('parseBtn').addEventListener('click', parseEnvContent);
document.getElementById('envInput').addEventListener('input', autoParseEnv);

// Export buttons
document.getElementById('exportBtn').addEventListener('click', copyToClipboard);
document.getElementById('downloadBtn').addEventListener('click', downloadEnvFile);
document.getElementById('clearBtn').addEventListener('click', clearAll);

// S3 Import & Push
document.getElementById('s3Toggle').addEventListener('click', toggleS3Section);
document.getElementById('s3ImportBtn').addEventListener('click', importFromS3);
document.getElementById('pushS3Btn').addEventListener('click', pushToS3);

function loadEnvVars() {
  chrome.storage.local.get(['envVars', 'lastEnvContent'], (result) => {
    if (result.lastEnvContent) {
      document.getElementById('envInput').value = result.lastEnvContent;
    }
    envVars = result.envVars || {};
    renderEnvList();
    updateJsonPreview();
  });
}

function saveEnvVars(content = null) {
  const data = { envVars };
  if (content !== null) {
    data.lastEnvContent = content;
  }
  chrome.storage.local.set(data, () => {
    renderEnvList();
    updateJsonPreview();
  });
}

function parseEnvContent() {
  const input = document.getElementById('envInput').value.trim();

  if (!input) {
    showNotification('Please paste .env content first', 'error');
    return;
  }

  const parsed = parseEnvString(input);

  if (Object.keys(parsed).length === 0) {
    showNotification('No valid environment variables found', 'error');
    return;
  }

  envVars = parsed;
  saveEnvVars(input);
  showNotification(`Parsed ${Object.keys(parsed).length} variables`, 'success');
}

function autoParseEnv() {
  const input = document.getElementById('envInput').value;
  const parsed = parseEnvString(input);

  if (Object.keys(parsed).length > 0) {
    envVars = parsed;
    saveEnvVars(input);
  }
}

function parseEnvString(input) {
  const result = {};

  // Split by lines and parse
  const lines = input.split('\n');

  for (let line of lines) {
    line = line.trim();

    // Skip empty lines, comments, and lines without =
    if (!line || line.startsWith('#') || !line.includes('=')) {
      continue;
    }

    // Split by first = only
    const firstEqualIndex = line.indexOf('=');
    const key = line.substring(0, firstEqualIndex).trim();
    let value = line.substring(firstEqualIndex + 1).trim();

    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // Skip if key is empty
    if (!key) {
      continue;
    }

    result[key] = value;
  }

  return result;
}

function deleteEnvVar(key) {
  delete envVars[key];

  // Update the textarea
  const envInput = document.getElementById('envInput');
  const lines = envInput.value.split('\n');
  const newLines = lines.filter(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return true;
    const firstEqualIndex = trimmed.indexOf('=');
    if (firstEqualIndex === -1) return true;
    const lineKey = trimmed.substring(0, firstEqualIndex).trim();
    return lineKey !== key;
  });
  envInput.value = newLines.join('\n');

  saveEnvVars(envInput.value);
  showNotification(`Deleted ${key}`, 'success');
}

function editEnvVar(key) {
  const newValue = prompt(`Edit value for ${key}:`, envVars[key]);
  if (newValue !== null) {
    envVars[key] = newValue;

    // Update the textarea
    const envInput = document.getElementById('envInput');
    const lines = envInput.value.split('\n');
    const newLines = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;
      const firstEqualIndex = trimmed.indexOf('=');
      if (firstEqualIndex === -1) return line;
      const lineKey = trimmed.substring(0, firstEqualIndex).trim();

      if (lineKey === key) {
        const indentation = line.substring(0, line.indexOf(trimmed[0]));
        return `${indentation}${key}=${newValue}`;
      }
      return line;
    });
    envInput.value = newLines.join('\n');

    saveEnvVars(envInput.value);
    showNotification(`Updated ${key}`, 'success');
  }
}

function renderEnvList() {
  const envList = document.getElementById('envList');
  const keys = Object.keys(envVars);

  if (keys.length === 0) {
    envList.innerHTML = '<div class="empty-state">Paste .env content above to see parsed variables</div>';
    return;
  }

  envList.innerHTML = keys.map(key => `
    <div class="env-item">
      <span class="env-key">${escapeHtml(key)}</span>
      <span class="env-value">${escapeHtml(envVars[key])}</span>
      <div class="env-actions">
        <button class="icon-btn" onclick="editEnvVar('${escapeForOnclick(key)}')" title="Edit">✏️</button>
        <button class="icon-btn" onclick="deleteEnvVar('${escapeForOnclick(key)}')" title="Delete">🗑️</button>
      </div>
    </div>
  `).join('');
}

function updateJsonPreview() {
  const jsonOutput = document.getElementById('jsonOutput');
  jsonOutput.textContent = JSON.stringify(envVars, null, 2);
}

function copyToClipboard() {
  const json = JSON.stringify(envVars, null, 2);

  if (Object.keys(envVars).length === 0) {
    showNotification('No variables to copy', 'error');
    return;
  }

  navigator.clipboard.writeText(json).then(() => {
    showNotification('JSON copied to clipboard!', 'success');
  }).catch(() => {
    showNotification('Failed to copy to clipboard', 'error');
  });
}

function downloadEnvFile() {
  const keys = Object.keys(envVars);

  if (keys.length === 0) {
    showNotification('No environment variables to download', 'error');
    return;
  }

  // Create JSON format content
  const jsonContent = JSON.stringify(envVars, null, 2);

  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'env-vars.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showNotification('Downloaded JSON file', 'success');
}

function clearAll() {
  document.getElementById('envInput').value = '';
  envVars = {};
  saveEnvVars('');
  showNotification('Cleared all content', 'success');
}

function showNotification(message, type = 'success') {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification ${type} show`;

  setTimeout(() => {
    notification.classList.remove('show');
  }, 2500);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeForOnclick(text) {
  return text.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// --- S3 Import ---

function toggleS3Section() {
  const content = document.getElementById('s3Content');
  const arrow = document.getElementById('s3Arrow');
  content.classList.toggle('open');
  arrow.classList.toggle('open');
}

function loadS3Config() {
  chrome.storage.local.get(['s3Config'], (result) => {
    if (!result.s3Config) return;
    const { region, bucket, key, accessKeyId, secretAccessKey } = result.s3Config;
    if (region) document.getElementById('s3Region').value = region;
    if (bucket) document.getElementById('s3Bucket').value = bucket;
    if (key) document.getElementById('s3Key').value = key;
    if (accessKeyId) document.getElementById('s3AccessKey').value = accessKeyId;
    if (secretAccessKey) document.getElementById('s3SecretKey').value = secretAccessKey;
  });
}

function saveS3Config() {
  const config = {
    region: document.getElementById('s3Region').value.trim(),
    bucket: document.getElementById('s3Bucket').value.trim(),
    key: document.getElementById('s3Key').value.trim(),
    accessKeyId: document.getElementById('s3AccessKey').value.trim(),
    secretAccessKey: document.getElementById('s3SecretKey').value.trim(),
  };
  chrome.storage.local.set({ s3Config: config });
}

async function importFromS3() {
  const region = document.getElementById('s3Region').value.trim();
  const bucket = document.getElementById('s3Bucket').value.trim();
  const s3Key = document.getElementById('s3Key').value.trim();
  const accessKeyId = document.getElementById('s3AccessKey').value.trim();
  const secretKey = document.getElementById('s3SecretKey').value.trim();

  if (!region || !bucket || !s3Key || !accessKeyId || !secretKey) {
    showNotification('Please fill in all S3 fields', 'error');
    return;
  }

  saveS3Config();
  setS3Loading(true);

  try {
    const content = await fetchFromS3(region, bucket, s3Key, accessKeyId, secretKey);
    const envInput = document.getElementById('envInput');
    envInput.value = content;

    const parsed = parseEnvString(content);
    if (Object.keys(parsed).length === 0) {
      showNotification('File fetched but no valid env vars found', 'error');
    } else {
      envVars = parsed;
      saveEnvVars(content);
      showNotification(`Imported ${Object.keys(parsed).length} variables from S3`, 'success');
    }
  } catch (err) {
    showNotification(`S3 Error: ${err.message}`, 'error');
  } finally {
    setS3Loading(false);
  }
}

function setS3Loading(loading) {
  const btn = document.getElementById('s3ImportBtn');
  const text = document.getElementById('s3ImportText');
  const spinner = document.getElementById('s3Spinner');
  btn.disabled = loading;
  text.textContent = loading ? 'Importing...' : 'Import from S3';
  spinner.classList.toggle('hidden', !loading);
}

// --- S3 Push ---

async function pushToS3() {
  const keys = Object.keys(envVars);
  if (keys.length === 0) {
    showNotification('No variables to push', 'error');
    return;
  }

  const region = document.getElementById('s3Region').value.trim();
  const bucket = document.getElementById('s3Bucket').value.trim();
  const s3Key = document.getElementById('s3Key').value.trim();
  const accessKeyId = document.getElementById('s3AccessKey').value.trim();
  const secretKey = document.getElementById('s3SecretKey').value.trim();

  if (!region || !bucket || !s3Key || !accessKeyId || !secretKey) {
    showNotification('Configure S3 credentials first', 'error');
    // Open S3 section so user can fill in fields
    const content = document.getElementById('s3Content');
    const arrow = document.getElementById('s3Arrow');
    if (!content.classList.contains('open')) {
      content.classList.add('open');
      arrow.classList.add('open');
    }
    return;
  }

  if (!confirm('Push current env variables to S3? This will overwrite the remote file.')) {
    return;
  }

  setPushS3Loading(true);

  try {
    // Convert envVars back to .env format, re-quoting values that need it
    const envContent = keys.map(key => {
      const val = envVars[key];
      const needsQuotes = val.includes(' ') || val.includes('#') || val.includes('"') || val.includes("'") || val.includes('\\');
      return `${key}=${needsQuotes ? `"${val}"` : val}`;
    }).join('\n') + '\n';
    await putToS3(region, bucket, s3Key, accessKeyId, secretKey, envContent);
    saveS3Config();
    showNotification(`Pushed ${keys.length} variables to S3`, 'success');
  } catch (err) {
    showNotification(`S3 Push Error: ${err.message}`, 'error');
  } finally {
    setPushS3Loading(false);
  }
}

function setPushS3Loading(loading) {
  const btn = document.getElementById('pushS3Btn');
  const text = document.getElementById('pushS3Text');
  const spinner = document.getElementById('pushS3Spinner');
  btn.disabled = loading;
  text.innerHTML = loading ? 'Pushing...' : '<span class="icon">☁️</span> Push to S3';
  spinner.classList.toggle('hidden', !loading);
}

async function putToS3(region, bucket, s3Key, accessKeyId, secretAccessKey, body) {
  return s3Request('PUT', region, bucket, s3Key, accessKeyId, secretAccessKey, body);
}

// AWS Signature V4
async function fetchFromS3(region, bucket, s3Key, accessKeyId, secretAccessKey) {
  return s3Request('GET', region, bucket, s3Key, accessKeyId, secretAccessKey);
}

// Extract region from S3 endpoint string like "bucket.s3.us-west-2.amazonaws.com"
function extractRegionFromEndpoint(endpoint) {
  const match = endpoint.match(/\.s3[.-]([a-z0-9-]+)\.amazonaws\.com/);
  return match ? match[1] : null;
}

async function s3Request(method, region, bucket, s3Key, accessKeyId, secretAccessKey, body, isRetry) {
  const service = 's3';
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const endpoint = `https://${host}/${s3Key}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const dateStamp = amzDate.slice(0, 8);

  const canonicalUri = '/' + s3Key.split('/').map(s => encodeURIComponent(s)).join('/');
  const canonicalQuerystring = '';
  const payloadHash = await sha256(body || '');

  const headerMap = {
    'host': host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  if (method === 'PUT') {
    headerMap['content-type'] = 'text/plain';
  }

  const signedHeaderKeys = Object.keys(headerMap).sort();
  const signedHeaders = signedHeaderKeys.join(';');
  const canonicalHeaders = signedHeaderKeys.map(k => `${k}:${headerMap[k]}\n`).join('');

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256(canonicalRequest),
  ].join('\n');

  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = await hmacHex(signingKey, stringToSign);

  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const fetchHeaders = {
    'x-amz-date': amzDate,
    'x-amz-content-sha256': payloadHash,
    'Authorization': authHeader,
  };
  if (method === 'PUT') {
    fetchHeaders['Content-Type'] = 'text/plain';
  }

  const fetchOpts = { method, headers: fetchHeaders };
  if (body) fetchOpts.body = body;

  const response = await fetch(endpoint, fetchOpts);

  if (!response.ok) {
    const respBody = await response.text();

    // Auto-detect correct region from redirect error and retry once
    if (!isRetry) {
      const endpointMatch = respBody.match(/<Endpoint>(.*?)<\/Endpoint>/);
      if (endpointMatch) {
        const correctRegion = extractRegionFromEndpoint(endpointMatch[1]);
        if (correctRegion && correctRegion !== region) {
          // Update the region field in the UI so it's saved correctly next time
          document.getElementById('s3Region').value = correctRegion;
          return s3Request(method, correctRegion, bucket, s3Key, accessKeyId, secretAccessKey, body, true);
        }
      }
    }

    const msgMatch = respBody.match(/<Message>(.*?)<\/Message>/);
    throw new Error(msgMatch ? msgMatch[1] : `HTTP ${response.status}`);
  }

  return method === 'GET' ? response.text() : undefined;
}

async function sha256(message) {
  const data = new TextEncoder().encode(message);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return bufToHex(hash);
}

async function hmac(key, message) {
  const keyData = typeof key === 'string' ? new TextEncoder().encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}

async function hmacHex(key, message) {
  const sig = await hmac(key, message);
  return bufToHex(sig);
}

async function getSignatureKey(secretKey, dateStamp, region, service) {
  const kDate = await hmac('AWS4' + secretKey, dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

function bufToHex(buffer) {
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Make functions available globally for onclick handlers
window.deleteEnvVar = deleteEnvVar;
window.editEnvVar = editEnvVar;
