import { Editor, MarkdownPostProcessorContext, Notice, Plugin } from "obsidian";
import { LinkCardSettingTab, DEFAULT_SETTINGS } from "./settings";
import type { LinkCardMeta, LinkCardSettings } from "./types";
import { fetchMetaWithProviders, normalizeUrl } from "./fetchers";
import { renderLinkCard } from "./render";

type CacheRecord = { meta: LinkCardMeta; fetchedAt: number };

export default class LinkCardRevivalPlugin extends Plugin {
  settings: LinkCardSettings;
  private cache: Record<string, CacheRecord> = {};

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
        } catch (e: any) {
          el.createEl("pre", { text: `Link card error: ${e?.message ?? String(e)}` });
        }
      }
    );

    if (this.settings.autoOnPaste) {
      this.registerEvent(
        this.app.workspace.on("editor-paste", (evt: ClipboardEvent, editor: Editor) => {
          if (!this.settings.enabled) return;
          tryAutoConvertPaste(evt, editor);
        })
      );
    }

    // Load styles.css
    this.registerStyles();

    // Command for manual conversion
    this.addCommand({
      id: "convert-url-to-link-card",
      name: "Convert current line URL to Link Card block",
      editorCallback: async (editor) => {
        const line = editor.getLine(editor.getCursor().line).trim();
        if (!isLikelyUrl(line)) {
          new Notice("Current line does not look like a URL.");
          return;
        }
        const block = makeBlock(line);
        editor.setLine(editor.getCursor().line, block);
      }
    });
  }

  onunload() {}

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
    new Notice("Link Card cache cleared.");
  }

  private async getMetaCached(url: string): Promise<LinkCardMeta> {
    const ttlMs = this.settings.cacheTtlHours * 60 * 60 * 1000;
    const rec = this.cache[url];
    if (rec && Date.now() - rec.fetchedAt < ttlMs) return rec.meta;

    const meta = await fetchMetaWithProviders(url, this.settings);
    this.cache[url] = { meta, fetchedAt: Date.now() };
    await this.saveSettings();
    return meta;
  }

  private registerStyles() {
    const cssPath = this.manifest.dir + "/styles.css";
    // Obsidian auto-loads styles.css if present in plugin dir for community plugins,
    // but for dev, adding ensures it loads reliably.
    this.registerDomEvent(window, "load", () => {
      // no-op: presence of styles.css is enough in most setups
    });
    // If you find styles not loading in dev, we can add a dynamic loader.
  }
}

function parseUrlFromBlock(source: string): string | null {
  // accepts either:
  // url: https://...
  // or plain URL
  const lines = source
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  for (const l of lines) {
    if (l.toLowerCase().startsWith("url:")) return l.slice(4).trim();
  }
  if (lines.length === 1 && isLikelyUrl(lines[0])) return lines[0];
  return null;
}

function isLikelyUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function makeBlock(url: string): string {
  return ["```link-card", `url: ${url}`, "```"].join("\n");
}

function tryAutoConvertPaste(evt: ClipboardEvent, editor: Editor) {
  const text = evt.clipboardData?.getData("text/plain")?.trim() ?? "";
  if (!text) return;

  // Only auto-convert if it's a single URL
  if (!isLikelyUrl(text)) return;

  // Only if current selection is empty and we’re pasting into a blank-ish line
  const cur = editor.getCursor();
  const line = editor.getLine(cur.line);
  const hasSelection = editor.somethingSelected();
  if (hasSelection) return;

  // Heuristic: convert when the line is empty or whitespace
  if (line.trim().length !== 0) return;

  evt.preventDefault();
  editor.replaceRange(makeBlock(text), cur);
}