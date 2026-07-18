export function joinWithAnd(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

const USE_CASE_PHRASES: Record<string, string> = {
  "back-pain": "people with back pain",
  "side-sleeper": "side sleepers",
  couples: "couples",
  kids: "children",
  "guest-room": "guest rooms",
  "heavy-build": "people with a heavier build",
  "hot-sleeper": "hot sleepers",
  "neck-pain": "people with neck pain",
  hygiene: "hygiene-conscious buyers",
  allergy: "allergy sufferers",
};

export function humanizeUseCase(tag: string): string {
  return USE_CASE_PHRASES[tag] ?? tag.replace(/-/g, " ");
}

export function humanizeUseCaseList(tags: string[]): string {
  return joinWithAnd(tags.map(humanizeUseCase));
}
