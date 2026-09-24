/**
 * Starting points, not gospel. Every value here is editable in the UI.
 * Game names are kept out of preset names unless we can cite an official
 * published rate (see the two shiny-hunt presets below); the soft-pity
 * preset is a generic archetype that matches publicly documented models
 * of popular gacha games, not any one game's exact numbers.
 */
import type { PityConfig } from "./math/pity.js";

export interface SimplePreset {
  id: string;
  mode: "simple";
  label: string;
  description: string;
  rate: string;
}

export interface PityPreset {
  id: string;
  mode: "pity";
  label: string;
  description: string;
  config: PityConfig;
}

export type Preset = SimplePreset | PityPreset;

export const SIMPLE_PRESETS: SimplePreset[] = [
  {
    id: "shiny-base",
    mode: "simple",
    label: "Shiny hunt — 1/4096",
    description:
      "Community shorthand for a base shiny encounter rate; matches the documented 1/4096 odds used since Generation VI in the mainline Pokémon games.",
    rate: "1/4096",
  },
  {
    id: "shiny-charm",
    mode: "simple",
    label: "Shiny hunt with charm — 3/4096",
    description:
      "The same base rate with three roll attempts per encounter, matching the documented effect of the in-game Shiny Charm item.",
    rate: "3/4096",
  },
  {
    id: "mmo-rare",
    mode: "simple",
    label: "MMO rare drop — 1/1000",
    description:
      "Generic archetype for a “rare drop” rate commonly quoted on MMO wikis. Edit freely.",
    rate: "1/1000",
  },
  {
    id: "loot-box",
    mode: "simple",
    label: "Loot box — 0.5%",
    description:
      "Generic archetype for a premium loot-box item rate. Edit freely.",
    rate: "0.5%",
  },
];

export const PITY_PRESETS: PityPreset[] = [
  {
    id: "soft-pity-gacha",
    mode: "pity",
    label: "Soft-pity gacha",
    description:
      "0.6% base, soft pity ramping from pull 74, hard pity at 90, 50/50 featured roll with a guaranteed win after a loss. A generic archetype that matches community-documented models of popular gacha games — not any single game's exact published numbers.",
    config: {
      baseRate: 0.006,
      softPityStart: 74,
      softPityIncrement: 0.06,
      hardPity: 90,
      featuredRate: 0.5,
      hasGuarantee: true,
    },
  },
];
