import { PROVIDER_CATALOG, type CatalogModel, type CatalogProvider } from "./provider-catalog";
import type { Settings } from "./types";

export type Provider = CatalogProvider;
export type ProviderModel = CatalogModel;

export const DEFAULT_PROVIDER = "xai";

export function providers(): Provider[] {
  return PROVIDER_CATALOG;
}

export function providerById(id: string | undefined): Provider {
  return PROVIDER_CATALOG.find((provider) => provider.id === id) || PROVIDER_CATALOG.find((provider) => provider.id === DEFAULT_PROVIDER) || PROVIDER_CATALOG[0];
}

/** A model id the provider's own list does not carry, entered by hand. */
export function customModel(settings: Pick<Settings, "provider" | "customModels">): string {
  return String((settings.customModels || {})[activeProviderId(settings)] || "").trim();
}

export function activeProviderId(settings: Pick<Settings, "provider">): string {
  return providerById(settings.provider).id;
}

export function activeProvider(settings: Pick<Settings, "provider">): Provider {
  return providerById(settings.provider);
}

/** The endpoint for the active provider: the saved override, or the catalog one. */
export function providerBaseUrl(settings: Pick<Settings, "provider" | "providerBase">): string {
  const provider = activeProvider(settings);
  const stored = String((settings.providerBase || {})[provider.id] || "").trim();
  return stored || provider.api;
}

/** The key saved for the active provider. Only what this app stores, never the environment. */
export function providerKey(settings: Pick<Settings, "provider" | "providerKeys">): string {
  return String((settings.providerKeys || {})[activeProviderId(settings)] || "").trim();
}

export function hasProviderKey(settings: Pick<Settings, "provider" | "providerKeys">): boolean {
  return activeKey(settings) !== "";
}

const envKeys: Record<string, string> = {};

/**
 * Reads the key variables the catalog names once at start, so the send path and the
 * schedule tick can check a provider key without awaiting anything.
 */
export async function warmProviderKeys(): Promise<void> {
  const names = [...new Set(PROVIDER_CATALOG.flatMap((provider) => provider.env))];
  for (const name of names) {
    try {
      const value = await window.modbitx?.keyEnv(name);
      if (value) envKeys[name] = String(value);
    } catch { /* the bridge may be absent in a plain browser */ }
  }
}

/** The environment key for the active provider, when this Mac has one. */
export function envProviderKey(settings: Pick<Settings, "provider">): string {
  for (const name of activeProvider(settings).env) {
    if (envKeys[name]) return envKeys[name];
  }
  return "";
}

/** The key the active provider accepts: the saved one, or the environment one. */
export function activeKey(settings: Pick<Settings, "provider" | "providerKeys">): string {
  return providerKey(settings) || envProviderKey(settings);
}

/** The catalog models for the active provider, plus a hand-entered one when set. */
export function providerModels(settings: Pick<Settings, "provider" | "customModels">): ProviderModel[] {
  const listed = activeProvider(settings).models;
  const mine = customModel(settings);
  if (mine && !listed.some((model) => model.id === mine)) {
    return [{ id: mine, name: `${mine} (yours)` }, ...listed];
  }
  return listed;
}

export function modelFits(settings: Pick<Settings, "provider" | "customModels">, model: string): boolean {
  return providerModels(settings).some((item) => item.id === model);
}

/** The saved model when the active provider serves it, otherwise that provider's first. */
export function settledModel(settings: Pick<Settings, "provider" | "model" | "customModels">): string {
  const models = providerModels(settings);
  if (modelFits(settings, settings.model)) return settings.model;
  return models[0]?.id || customModel(settings);
}

/** Switching providers keeps a model that fits, or moves to the new provider's first. */
export function switchProvider(
  settings: Pick<Settings, "provider" | "model" | "customModels">,
  id: string
): { provider: string; model?: string } {
  const patch: { provider: string; model?: string } = { provider: providerById(id).id };
  if (!modelFits({ provider: id, customModels: settings.customModels }, settings.model)) {
    const next = providerById(id).models[0]?.id || String((settings.customModels || {})[id] || "").trim();
    if (next) patch.model = next;
  }
  return patch;
}

/** An older save keeps its xAI key and Z.ai key, and its provider choice. */
export function settleProviders(
  settings: Settings
): Pick<Settings, "provider" | "providerKeys" | "providerBase" | "customModels"> {
  const keys: Record<string, string> = { ...(settings.providerKeys || {}) };
  if (!keys.xai && settings.apiKey) keys.xai = settings.apiKey;
  if (!keys.zai && settings.zcodeKey) keys.zai = settings.zcodeKey;
  if (!keys.zcode && settings.zcodeKey) keys.zcode = settings.zcodeKey;
  const base: Record<string, string> = { ...(settings.providerBase || {}) };
  if (!base.zai && settings.zcodeBaseUrl) base.zai = settings.zcodeBaseUrl;
  const legacy = settings.provider === "zcode" ? "zai" : settings.provider;
  return {
    provider: providerById(legacy).id,
    providerKeys: keys,
    providerBase: base,
    customModels: { ...(settings.customModels || {}) }
  };
}
