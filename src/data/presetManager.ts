import { PresetCategory, PresetItem } from "../types/index.js";
import { animals } from "./presets/animals.js";
import { celebrities } from "./presets/celebrities.js";
import { foods } from "./presets/foods.js";
import { movies } from "./presets/movies.js";
import { countries } from "./presets/countries.js";

const presets: Record<PresetCategory, PresetItem[]> = {
  animals,
  celebrities,
  foods,
  movies,
  countries,
};

export function getPresetByCategory(category: PresetCategory): PresetItem[] {
  return presets[category] || [];
}

export function getAllCategories(): PresetCategory[] {
  return Object.keys(presets) as PresetCategory[];
}
