# Vault Env Manager - Chrome Extension

A Chrome extension for converting `.env` file content to JSON format for Vault setup.

## Features

- Paste `.env` file content and auto-convert to JSON
- Real-time JSON preview as you type
- Copy JSON to clipboard with one click
- Download as JSON file
- Edit/delete individual variables after parsing
- Persistent storage (remembers your last input)
- Handles comments and quoted values
- Clean, modern UI

## Usage

1. Click the extension icon in your browser toolbar
2. Paste your `.env` file content into the textarea
3. The JSON will be automatically generated as you type
4. Click "Copy JSON" to copy to clipboard
5. Or click "Download" to save as a JSON file

### Example Input (.env format)

```
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp

# API Keys
API_KEY=your-secret-key
API_URL=https://api.example.com

# Environment
NODE_ENV=production
```

### Example Output (JSON)

```json
{
  "DB_HOST": "localhost",
  "DB_PORT": "5432",
  "DB_NAME": "myapp",
  "API_KEY": "your-secret-key",
  "API_URL": "https://api.example.com",
  "NODE_ENV": "production"
}
```

## Installation

### 1. Create Icons (Optional)

The extension needs icon files. You can:
- Use online tools to generate icons from any image
- Or simply use any PNG images sized 16x16, 48x48, and 128x128 pixels

Place them in the `icons/` folder as:
- `icon16.png`
- `icon48.png`
- `icon128.png`

### 2. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top right)
3. Click "Load unpacked"
4. Select the `vault-env-extension` folder

## Usage

1. Click the extension icon in your browser toolbar
2. Enter environment variable name (e.g., `DB_HOST`, `API_KEY`)
3. Enter the value
4. Click "Add Variable"
5. Use the buttons to:
   - **Copy JSON**: Copies the JSON format to clipboard
   - **Download .env**: Downloads as either `.env` or JSON format
   - **Clear All**: Removes all stored variables

### Example Output

```json
{
  "DB_HOST": "localhost",
  "DB_PORT": "5432",
  "API_KEY": "your-secret-key",
  "NODE_ENV": "production"
}
```

## File Structure

```
vault-env-extension/
├── manifest.json       # Extension configuration
├── popup.html         # Popup UI structure
├── popup.css          # Styling
├── popup.js           # Functionality
├── icons/             # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Permissions

- `storage`: Used to persist environment variables across sessions
