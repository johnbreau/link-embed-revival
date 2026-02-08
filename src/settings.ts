import { App, PluginSettingTab, Setting } from "obsidian";
import type { LinkCardSettings, ProviderName } from "./types";

export const DEFAULT_SETTINGS: LinkCardSettings = {
  enabled: true,
  autoOnPaste: true,
  stripUtmParams: true,
  providerOrder: ["direct", "iframely", "linkpreview", "jsonlink"],
  timeoutMs: 12000,
  userAgent: "Mozilla/5.0 (Obsidian LinkCardRevival)",

  iframelyApiKey: "",
  linkPreviewApiKey: "",
  jsonLinkApiKey: "",

  cacheTtlHours: 24 * 7
};

export class LinkCardSettingTab extends PluginSettingTab {
  plugin: any;

  constructor(app: App, plugin: any) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Link Card Revival" });

    new Setting(containerEl)
      .setName("Enable plugin")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.enabled).onChange(async (v) => {
          this.plugin.settings.enabled = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Auto-create card on paste")
      .setDesc("If you paste a URL on its own line, convert it into a link-card block.")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.autoOnPaste).onChange(async (v) => {
          this.plugin.settings.autoOnPaste = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Strip UTM params")
      .setDesc("Removes common tracking parameters so the same link caches consistently.")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.stripUtmParams).onChange(async (v) => {
          this.plugin.settings.stripUtmParams = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Timeout (ms)")
      .addText((t) =>
        t
          .setValue(String(this.plugin.settings.timeoutMs))
          .onChange(async (v) => {
            const n = Number(v);
            if (!Number.isFinite(n)) return;
            this.plugin.settings.timeoutMs = n;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("User-Agent")
      .setDesc("Some sites block unknown clients; changing UA can help.")
      .addText((t) =>
        t.setValue(this.plugin.settings.userAgent).onChange(async (v) => {
          this.plugin.settings.userAgent = v;
          await this.plugin.saveSettings();
        })
      );

    containerEl.createEl("h3", { text: "Provider API keys (optional fallbacks)" });

    new Setting(containerEl)
      .setName("Iframely API key")
      .setDesc("Used for fallback calls to iframe.ly/api/iframely.")
      .addText((t) =>
        t
          .setPlaceholder("api_key...")
          .setValue(this.plugin.settings.iframelyApiKey)
          .onChange(async (v) => {
            this.plugin.settings.iframelyApiKey = v.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("LinkPreview API key")
      .setDesc("Used with X-Linkpreview-Api-Key header.")
      .addText((t) =>
        t
          .setPlaceholder("...")
          .setValue(this.plugin.settings.linkPreviewApiKey)
          .onChange(async (v) => {
            this.plugin.settings.linkPreviewApiKey = v.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("JsonLink API key")
      .setDesc("Used for jsonlink.io/api/extract.")
      .addText((t) =>
        t
          .setPlaceholder("pk_...")
          .setValue(this.plugin.settings.jsonLinkApiKey)
          .onChange(async (v) => {
            this.plugin.settings.jsonLinkApiKey = v.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Provider order")
      .setDesc("Comma-separated: direct, iframely, linkpreview, jsonlink")
      .addText((t) =>
        t
          .setValue(this.plugin.settings.providerOrder.join(", "))
          .onChange(async (v) => {
            const parts = v
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean) as ProviderName[];

            const allowed: ProviderName[] = ["direct", "iframely", "linkpreview", "jsonlink"];
            this.plugin.settings.providerOrder = parts.filter((p) => allowed.includes(p));
            if (this.plugin.settings.providerOrder.length === 0) {
              this.plugin.settings.providerOrder = ["direct"];
            }
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Cache TTL (hours)")
      .setDesc("How long to keep fetched metadata before re-fetching.")
      .addText((t) =>
        t
          .setValue(String(this.plugin.settings.cacheTtlHours))
          .onChange(async (v) => {
            const n = Number(v);
            if (!Number.isFinite(n)) return;
            this.plugin.settings.cacheTtlHours = n;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Clear cache")
      .addButton((b) =>
        b.setButtonText("Clear").onClick(async () => {
          await this.plugin.clearCache();
          this.display();
        })
      );
  }
}