/**
 * Starting points, not gospel. Every value here is editable in the UI.
 * Game names are kept out of preset names unless we can cite a source: an
 * official published rate (the two shiny-hunt presets below) or logged pulls
 * (the last pity preset, which says whose and when). The first pity preset is
 * a generic archetype, not any one game's numbers.
 */
import type { PityConfig } from "./math/pity.js";
import { LOGGED_CHARACTER_BANNER_RATES } from "./logged-rates.js";

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
  /** Set when `config.rates` is a measured table; the page shows it and drops it on any edit of the curve. */
  measured?: { source: string; retrieved: string };
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
      "0.6% base, soft pity ramping 6% a pull from pull 74, hard pity at 90, a 50/50 featured roll with a guaranteed win after a loss. A generic archetype, not fitted to any game; its curve is the one the logged Genshin Impact pulls below agree with up to pull 83, and its 50/50 is the rule that game used before version 5.0.",
    config: {
      baseRate: 0.006,
      softPityStart: 74,
      softPityIncrement: 0.06,
      hardPity: 90,
      featuredRate: 0.5,
      hasGuarantee: true,
    },
  },
  {
    id: "genshin-logged-2026-10",
    mode: "pity",
    label: "Genshin Impact character banner, as logged (Oct 2026)",
    description:
      "Per-pull five-star chance for pulls 1 to 84 measured from 7,657,036 five-stars that players logged on paimon.moe (opt-in submissions) over 37 banner phases, versions 5.0 to 7.1, retrieved 2026-10-08. Community data, not the publisher's odds. Above pull 84 the logs hold more long streaks than the ramp allows and are not monotone, so the table uses the archetype's ramp there. It averages 61.1 pulls per five-star; a community estimate from 9.45 million wishes, quoted on the Genshin wiki, gives 62.3. The 55% featured chance is the figure in the publisher's February 2025 post, read as the win rate on a roll with no guarantee; that reading is the wiki's, not the post's wording, and banners logged from 5.5 on read 57 to 60%.",
    config: {
      baseRate: 0.006,
      softPityStart: 74,
      softPityIncrement: 0.06,
      hardPity: 90,
      featuredRate: 0.55,
      hasGuarantee: true,
      rates: LOGGED_CHARACTER_BANNER_RATES,
    },
    measured: {
      source: "paimon.moe Global Wish Stats, 5.0 to 7.1 character banners",
      retrieved: "2026-10-08",
    },
  },
];
