import type { LinkCardMeta } from "./types";

export function renderLinkCard(container: HTMLElement, meta: LinkCardMeta) {
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

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}