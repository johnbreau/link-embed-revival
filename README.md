# Link Card Revival

Notion-style link preview cards for Obsidian.

Link Card Revival restores rich link embeds by automatically fetching page metadata and rendering clean preview cards directly inside your notes. It is designed as a modern replacement for older link embed plugins that stopped working reliably due to API or provider changes.

---

## Features

- ✅ Clean, Notion-style link preview cards
- ✅ Automatically converts pasted links into previews
- ✅ Smart metadata fetching with multiple fallbacks
- ✅ Optional provider support (Iframely, LinkPreview, JsonLink)
- ✅ Local caching for improved performance and fewer requests
- ✅ Theme-friendly styling
- ✅ Plain-text friendly and portable

---

## Example

Paste a URL on its own line:

```
https://example.com
```

It becomes:

````markdown
```link-card
url: https://example.com
```
````

And renders as a preview card in preview mode.

---

## Installation

### Manual install

1. Copy this plugin into:

```
<your-vault>/.obsidian/plugins/link-card-revival/
```

2. Install dependencies and build:

```bash
npm install
npm run build
```

3. Enable the plugin:

```
Settings → Community Plugins → Link Card Revival
```

---

## Usage

### Automatic

When enabled, pasting a URL onto an empty line automatically creates a link card.

### Manual

You can also create one yourself:

````markdown
```link-card
url: https://example.com
```
````

---

## Settings

### General

- Enable or disable the plugin
- Auto-create cards on paste
- Strip tracking parameters (UTM, etc.)
- Request timeout
- Cache duration

### Providers (optional)

You may optionally provide API keys for:

- Iframely
- LinkPreview
- JsonLink

These providers are only used when direct metadata fetching fails. Most links work without any API keys.

---

## How it works

The plugin attempts to fetch metadata in this order:

1. Directly from the page (OpenGraph / Twitter metadata)
2. Iframely (optional)
3. LinkPreview (optional)
4. JsonLink (optional)

This fallback approach helps avoid broken embeds caused by provider outages or rate limits.

---

## Styling

Cards use Obsidian CSS variables and automatically adapt to your theme.

You can customize appearance by overriding `.link-card` styles in a CSS snippet.

---

## Known limitations

- Some sites block automated metadata requests
- JavaScript-only pages may return limited preview data
- Preview images depend on site metadata availability

---

## License

MIT
