// ==================== PARK CONSTANTS ====================

import type { ParkKey } from "../types/common";

export const PARK_NAME_TO_KEY: Record<string, ParkKey> = {
  "Disneyland": "disneyland",
  "Disneyland Park": "disneyland",
  "California Adventure": "californiaadventure",
  "Disney California Adventure": "californiaadventure",
  "Downtown Disney": "downtown",
  "Downtown Disney District": "downtown",
  "Grand Californian": "grandcalifornian",
  "Disney's Grand Californian Hotel": "grandcalifornian",
  "Disneyland Hotel": "disneyland_hotel",
  "Pixar Place Hotel": "pixar_place_hotel",
  "Disneyland Resort": "disneyland_resort",
};

export const PARK_KEY_TO_NAME: Record<string, string> = {
  disneyland: "Disneyland",
  californiaadventure: "California Adventure",
  downtown: "Downtown Disney",
  grandcalifornian: "Grand Californian",
  disneyland_hotel: "Disneyland Hotel",
  pixar_place_hotel: "Pixar Place Hotel",
  disneyland_resort: "Disneyland Resort",
};

/** Short display names for compact UI */
export const PARK_SHORT_NAMES: Record<string, string> = {
  disneyland: "DL",
  californiaadventure: "DCA",
  downtown: "DTD",
  grandcalifornian: "GCH",
  disneyland_hotel: "DLH",
  pixar_place_hotel: "PPH",
  disneyland_resort: "DLR",
};
