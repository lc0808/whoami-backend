export type PresetCategory = "animals" | "celebrities" | "foods" | "movies" | "countries";

export interface PresetItem {
  id: string;
  name: string;
  difficulty?: "easy" | "medium" | "hard";
}
