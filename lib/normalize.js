const NAME_OVERRIDES = {
  nidoran: "nidoran-f",
  "mr mime": "mr-mime",
  "mime jr": "mime-jr",
  "ho oh": "ho-oh",
  "porygon z": "porygon-z",
  "type null": "type-null",
  "jangmo o": "jangmo-o",
  "hakamo o": "hakamo-o",
  "kommo o": "kommo-o",
};

const COMBINING_DIACRITICS = new RegExp("[̀-ͯ]", "g");

export function normalizePokemonName(name) {
  const cleaned = String(name)
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .trim()
    .toLowerCase();

  if (NAME_OVERRIDES[cleaned]) {
    return NAME_OVERRIDES[cleaned];
  }

  return cleaned.replace(/['.]/g, "").replace(/\s+/g, "-");
}
