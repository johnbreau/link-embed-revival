"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => LinkCardRevivalPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian3 = require("obsidian");

// src/settings.ts
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  enabled: true,
  autoOnPaste: true,
  stripUtmParams: true,
  providerOrder: ["direct", "iframely", "linkpreview", "jsonlink"],
  timeoutMs: 12e3,
  userAgent: "Mozilla/5.0 (Obsidian LinkCardRevival)",
  iframelyApiKey: "",
  linkPreviewApiKey: "",
  jsonLinkApiKey: "",
  cacheTtlHours: 24 * 7
};
var LinkCardSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Link Card Revival" });
    new import_obsidian.Setting(containerEl).setName("Enable plugin").addToggle(
      (t) => t.setValue(this.plugin.settings.enabled).onChange(async (v) => {
        this.plugin.settings.enabled = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Auto-create card on paste").setDesc("If you paste a URL on its own line, convert it into a link-card block.").addToggle(
      (t) => t.setValue(this.plugin.settings.autoOnPaste).onChange(async (v) => {
        this.plugin.settings.autoOnPaste = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Strip UTM params").setDesc("Removes common tracking parameters so the same link caches consistently.").addToggle(
      (t) => t.setValue(this.plugin.settings.stripUtmParams).onChange(async (v) => {
        this.plugin.settings.stripUtmParams = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Timeout (ms)").addText(
      (t) => t.setValue(String(this.plugin.settings.timeoutMs)).onChange(async (v) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return;
        this.plugin.settings.timeoutMs = n;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("User-Agent").setDesc("Some sites block unknown clients; changing UA can help.").addText(
      (t) => t.setValue(this.plugin.settings.userAgent).onChange(async (v) => {
        this.plugin.settings.userAgent = v;
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("h3", { text: "Provider API keys (optional fallbacks)" });
    new import_obsidian.Setting(containerEl).setName("Iframely API key").setDesc("Used for fallback calls to iframe.ly/api/iframely.").addText(
      (t) => t.setPlaceholder("api_key...").setValue(this.plugin.settings.iframelyApiKey).onChange(async (v) => {
        this.plugin.settings.iframelyApiKey = v.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("LinkPreview API key").setDesc("Used with X-Linkpreview-Api-Key header.").addText(
      (t) => t.setPlaceholder("...").setValue(this.plugin.settings.linkPreviewApiKey).onChange(async (v) => {
        this.plugin.settings.linkPreviewApiKey = v.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("JsonLink API key").setDesc("Used for jsonlink.io/api/extract.").addText(
      (t) => t.setPlaceholder("pk_...").setValue(this.plugin.settings.jsonLinkApiKey).onChange(async (v) => {
        this.plugin.settings.jsonLinkApiKey = v.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Provider order").setDesc("Comma-separated: direct, iframely, linkpreview, jsonlink").addText(
      (t) => t.setValue(this.plugin.settings.providerOrder.join(", ")).onChange(async (v) => {
        const parts = v.split(",").map((s) => s.trim()).filter(Boolean);
        const allowed = ["direct", "iframely", "linkpreview", "jsonlink"];
        this.plugin.settings.providerOrder = parts.filter((p) => allowed.includes(p));
        if (this.plugin.settings.providerOrder.length === 0) {
          this.plugin.settings.providerOrder = ["direct"];
        }
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Cache TTL (hours)").setDesc("How long to keep fetched metadata before re-fetching.").addText(
      (t) => t.setValue(String(this.plugin.settings.cacheTtlHours)).onChange(async (v) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return;
        this.plugin.settings.cacheTtlHours = n;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Clear cache").addButton(
      (b) => b.setButtonText("Clear").onClick(async () => {
        await this.plugin.clearCache();
        this.display();
      })
    );
  }
};

// src/fetchers.ts
var import_obsidian2 = require("obsidian");
function normalizeUrl(input, stripUtm) {
  try {
    const u = new URL(input);
    if (!stripUtm) return u.toString();
    const kill = /* @__PURE__ */ new Set([
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "fbclid",
      "msclkid",
      "igshid"
    ]);
    [...u.searchParams.keys()].forEach((k) => {
      if (kill.has(k.toLowerCase())) u.searchParams.delete(k);
    });
    return u.toString();
  } catch {
    return input;
  }
}
function absolutize(baseUrl, maybeRelative) {
  if (!maybeRelative) return void 0;
  try {
    return new URL(maybeRelative, baseUrl).toString();
  } catch {
    return maybeRelative;
  }
}
function pickFirstImage(images) {
  if (!images || images.length === 0) return void 0;
  return images.find(Boolean);
}
async function fetchMetaWithProviders(url, settings) {
  const normalized = normalizeUrl(url, settings.stripUtmParams);
  let lastErr = null;
  for (const provider of settings.providerOrder) {
    try {
      const meta = await fetchMeta(normalized, provider, settings);
      meta.url = normalized;
      meta.image = absolutize(normalized, meta.image);
      meta.favicon = absolutize(normalized, meta.favicon);
      return meta;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("No providers succeeded");
}
async function fetchMeta(url, provider, settings) {
  switch (provider) {
    case "direct":
      return fetchDirect(url, settings);
    case "iframely":
      return fetchIframely(url, settings);
    case "linkpreview":
      return fetchLinkPreview(url, settings);
    case "jsonlink":
      return fetchJsonLink(url, settings);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
async function fetchDirect(url, settings) {
  const res = await (0, import_obsidian2.requestUrl)({
    url,
    method: "GET",
    headers: {
      "User-Agent": settings.userAgent,
      "Accept": "text/html,application/xhtml+xml"
    },
    timeout: settings.timeoutMs
  });
  if (res.status >= 400) {
    throw new Error(`Direct fetch failed: ${res.status}`);
  }
  const html = res.text;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const getMeta = (selector) => {
    const el = doc.querySelector(selector);
    const v = el?.getAttribute("content")?.trim();
    return v || void 0;
  };
  const title = getMeta('meta[property="og:title"]') || getMeta('meta[name="twitter:title"]') || doc.querySelector("title")?.textContent?.trim() || void 0;
  const description = getMeta('meta[property="og:description"]') || getMeta('meta[name="twitter:description"]') || getMeta('meta[name="description"]') || void 0;
  const image = getMeta('meta[property="og:image"]') || getMeta('meta[name="twitter:image"]') || void 0;
  const siteName = getMeta('meta[property="og:site_name"]') || new URL(url).hostname;
  const favicon = doc.querySelector('link[rel="icon"]')?.href || doc.querySelector('link[rel="shortcut icon"]')?.href || void 0;
  return { url, title, description, image, siteName, favicon };
}
async function fetchIframely(url, settings) {
  if (!settings.iframelyApiKey) throw new Error("Missing Iframely API key");
  const apiUrl = `https://iframe.ly/api/iframely?url=${encodeURIComponent(url)}&api_key=${encodeURIComponent(settings.iframelyApiKey)}`;
  const res = await (0, import_obsidian2.requestUrl)({
    url: apiUrl,
    method: "GET",
    headers: { "User-Agent": settings.userAgent, "Accept": "application/json" },
    timeout: settings.timeoutMs
  });
  if (res.status >= 400) throw new Error(`Iframely failed: ${res.status}`);
  const data = res.json;
  const meta = data?.meta ?? {};
  const image = pickFirstImage(meta?.thumbnail ? [meta.thumbnail] : void 0) || pickFirstImage(meta?.images);
  return {
    url,
    title: meta?.title,
    description: meta?.description,
    image,
    siteName: meta?.site,
    favicon: meta?.icon
  };
}
async function fetchLinkPreview(url, settings) {
  if (!settings.linkPreviewApiKey) throw new Error("Missing LinkPreview API key");
  const apiUrl = `https://api.linkpreview.net/?q=${encodeURIComponent(url)}`;
  const res = await (0, import_obsidian2.requestUrl)({
    url: apiUrl,
    method: "GET",
    headers: {
      "User-Agent": settings.userAgent,
      "Accept": "application/json",
      "X-Linkpreview-Api-Key": settings.linkPreviewApiKey
    },
    timeout: settings.timeoutMs
  });
  if (res.status >= 400) throw new Error(`LinkPreview failed: ${res.status}`);
  const data = res.json;
  return {
    url: data?.url ?? url,
    title: data?.title,
    description: data?.description,
    image: data?.image,
    siteName: data?.url ? new URL(data.url).hostname : new URL(url).hostname,
    favicon: void 0
  };
}
async function fetchJsonLink(url, settings) {
  if (!settings.jsonLinkApiKey) throw new Error("Missing JsonLink API key");
  const apiUrl = `https://jsonlink.io/api/extract?api_key=${encodeURIComponent(settings.jsonLinkApiKey)}&url=${encodeURIComponent(url)}`;
  const res = await (0, import_obsidian2.requestUrl)({
    url: apiUrl,
    method: "GET",
    headers: { "User-Agent": settings.userAgent, "Accept": "application/json" },
    timeout: settings.timeoutMs
  });
  if (res.status >= 400) throw new Error(`JsonLink failed: ${res.status}`);
  const data = res.json;
  return {
    url: data?.url ?? url,
    title: data?.title,
    description: data?.description,
    image: pickFirstImage(data?.images),
    siteName: data?.sitename ?? data?.domain ?? new URL(url).hostname,
    favicon: data?.favicon
  };
}

// src/render.ts
function renderLinkCard(container, meta) {
  const a = container.createEl("a", { cls: "link-card" });
  a.href = meta.url;
  a.target = "_blank";
  a.rel = "noopener";
  const left = a.createDiv({ cls: "link-card__meta" });
  left.createDiv({ cls: "link-card__title", text: meta.title ?? meta.url });
  if (meta.description) {
    left.createDiv({ cls: "link-card__desc", text: meta.description });
  }
  const site = left.createDiv({ cls: "link-card__site" });
  if (meta.favicon) {
    const img = site.createEl("img", { cls: "link-card__favicon" });
    img.src = meta.favicon;
    img.alt = "";
  }
  site.createSpan({ text: meta.siteName ?? safeHost(meta.url) });
  if (meta.image) {
    const img = a.createEl("img", { cls: "link-card__image" });
    img.src = meta.image;
    img.alt = "";
  }
}
function safeHost(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// src/main.ts
var LinkCardRevivalPlugin = class extends import_obsidian3.Plugin {
  constructor() {
    super(...arguments);
    this.cache = {};
  }
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new LinkCardSettingTab(this.app, this));
    this.registerMarkdownCodeBlockProcessor(
      "link-card",
      async (source, el, ctx) => {
        try {
          const url = parseUrlFromBlock(source);
          if (!url) return;
          const normalized = normalizeUrl(url, this.settings.stripUtmParams);
          const meta = await this.getMetaCached(normalized);
          renderLinkCard(el, meta);
        } catch (e) {
          el.createEl("pre", { text: `Link card error: ${e?.message ?? String(e)}` });
        }
      }
    );
    if (this.settings.autoOnPaste) {
      this.registerEvent(
        this.app.workspace.on("editor-paste", (evt, editor) => {
          if (!this.settings.enabled) return;
          tryAutoConvertPaste(evt, editor);
        })
      );
    }
    this.registerStyles();
    this.addCommand({
      id: "convert-url-to-link-card",
      name: "Convert current line URL to Link Card block",
      editorCallback: async (editor) => {
        const line = editor.getLine(editor.getCursor().line).trim();
        if (!isLikelyUrl(line)) {
          new import_obsidian3.Notice("Current line does not look like a URL.");
          return;
        }
        const block = makeBlock(line);
        editor.setLine(editor.getCursor().line, block);
      }
    });
  }
  onunload() {
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    const data = await this.loadData();
    if (data?.cache) this.cache = data.cache;
  }
  async saveSettings() {
    await this.saveData({ ...this.settings, cache: this.cache });
  }
  async clearCache() {
    this.cache = {};
    await this.saveSettings();
    new import_obsidian3.Notice("Link Card cache cleared.");
  }
  async getMetaCached(url) {
    const ttlMs = this.settings.cacheTtlHours * 60 * 60 * 1e3;
    const rec = this.cache[url];
    if (rec && Date.now() - rec.fetchedAt < ttlMs) return rec.meta;
    const meta = await fetchMetaWithProviders(url, this.settings);
    this.cache[url] = { meta, fetchedAt: Date.now() };
    await this.saveSettings();
    return meta;
  }
  registerStyles() {
    const cssPath = this.manifest.dir + "/styles.css";
    this.registerDomEvent(window, "load", () => {
    });
  }
};
function parseUrlFromBlock(source) {
  const lines = source.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const l of lines) {
    if (l.toLowerCase().startsWith("url:")) return l.slice(4).trim();
  }
  if (lines.length === 1 && isLikelyUrl(lines[0])) return lines[0];
  return null;
}
function isLikelyUrl(s) {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
function makeBlock(url) {
  return ["```link-card", `url: ${url}`, "```"].join("\n");
}
function tryAutoConvertPaste(evt, editor) {
  const text = evt.clipboardData?.getData("text/plain")?.trim() ?? "";
  if (!text) return;
  if (!isLikelyUrl(text)) return;
  const cur = editor.getCursor();
  const line = editor.getLine(cur.line);
  const hasSelection = editor.somethingSelected();
  if (hasSelection) return;
  if (line.trim().length !== 0) return;
  evt.preventDefault();
  editor.replaceRange(makeBlock(text), cur);
}
