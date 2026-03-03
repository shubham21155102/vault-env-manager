let envVars = {};

// Load saved environment variables on popup open
document.addEventListener('DOMContentLoaded', loadEnvVars);

// Parse .env content button
document.getElementById('parseBtn').addEventListener('click', parseEnvContent);
document.getElementById('envInput').addEventListener('input', autoParseEnv);

// Export buttons
document.getElementById('exportBtn').addEventListener('click', copyToClipboard);
document.getElementById('downloadBtn').addEventListener('click', downloadEnvFile);
document.getElementById('clearBtn').addEventListener('click', clearAll);

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

// Make functions available globally for onclick handlers
window.deleteEnvVar = deleteEnvVar;
window.editEnvVar = editEnvVar;
