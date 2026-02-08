export type ProviderName = "direct" | "iframely" | "linkpreview" | "jsonlink";

export interface LinkCardMeta {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

export interface LinkCardSettings {
  // Behavior
  enabled: boolean;
  autoOnPaste: boolean;
  stripUtmParams: boolean;
  providerOrder: ProviderName[];
  timeoutMs: number;
  userAgent: string;

  // Provider keys
  iframelyApiKey: string;
  linkPreviewApiKey: string;
  jsonLinkApiKey: string;

  // Cache
  cacheTtlHours: number;
}