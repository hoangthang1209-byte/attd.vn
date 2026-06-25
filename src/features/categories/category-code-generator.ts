import {
  CATEGORY_CODE_GENERATION_FAILED,
  FOUR_LETTER_CATEGORY_CODE_REGEX,
} from "@/features/categories/category-admin-constants";

const STOP_WORDS = new Set(["and", "the", "of", "for", "with", "a", "an"]);

export class CategoryCodeGenerationError extends Error {
  constructor(message: string = CATEGORY_CODE_GENERATION_FAILED) {
    super(message);
    this.name = "CategoryCodeGenerationError";
  }
}

function extractLetters(token: string): string {
  return token.toUpperCase().replace(/[^A-Z]/g, "");
}

export function tokenizeEnglishCategoryName(nameEn: string): string[] {
  const normalized = nameEn
    .trim()
    .replace(/[^a-zA-Z\s/-]/g, " ")
    .replace(/[-/]+/g, " ")
    .split(/\s+/)
    .map(extractLetters)
    .filter((word) => word.length > 0)
    .filter((word) => !STOP_WORDS.has(word.toLowerCase()));

  if (normalized.length >= 2) {
    return normalized;
  }

  const single = extractLetters(nameEn);
  return single ? [single] : [];
}

function isFourLetterCode(candidate: string): boolean {
  return FOUR_LETTER_CATEGORY_CODE_REGEX.test(candidate);
}

function addCandidate(candidates: string[], value: string | undefined) {
  if (!value || !isFourLetterCode(value)) return;
  if (!candidates.includes(value)) {
    candidates.push(value);
  }
}

function oneWordCandidates(word: string): string[] {
  const letters = extractLetters(word);
  const candidates: string[] = [];

  const knownSingleWordCodes: Record<string, string> = {
    TSHIRT: "TSHI",
    TSHIRTS: "TSHR",
    TEE: "TEES",
    POLO: "POLO",
    TOTE: "TOTE",
    TUMBLER: "TUMB",
    TUMBLERS: "TUMB",
  };

  if (knownSingleWordCodes[letters]) {
    addCandidate(candidates, knownSingleWordCodes[letters]);
  }

  if (letters.length >= 4) {
    addCandidate(candidates, letters.slice(0, 4));
    for (let start = 1; start <= letters.length - 4; start++) {
      addCandidate(candidates, letters.slice(start, start + 4));
    }
    for (let i = 3; i < letters.length; i++) {
      addCandidate(candidates, letters.slice(0, 3) + letters[i]);
    }
    for (let i = 1; i < letters.length; i++) {
      addCandidate(candidates, letters[0] + letters.slice(i, i + 3));
    }
  } else if (letters.length > 0) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const padded = letters.padEnd(4, letters[letters.length - 1] ?? "X").slice(0, 4);
    addCandidate(candidates, padded);
    for (const letter of alphabet) {
      addCandidate(candidates, (letters + letter).slice(0, 4).padEnd(4, letter));
      if (letters.length === 3) {
        addCandidate(candidates, letters + letter);
      }
    }
  }

  return candidates;
}

function multiWordCandidates(words: string[]): string[] {
  const candidates: string[] = [];
  const first = words[0] ?? "";
  const second = words[1] ?? "";
  const last = words[words.length - 1] ?? "";

  const knownMultiWordCodes: Record<string, string> = {
    "T SHIRT": "TSHI",
    "T SHIRTS": "TSHR",
    "POLO SHIRTS": "POLS",
    "SPORTS POLO": "SPOL",
    "REGULAR FIT": "REGF",
    "CANVAS TOTE": "CATO",
    "TOTE BAGS": "TOTE",
    "BOXY FIT": "BOXY",
  };
  const lookupKey = words.join(" ");
  if (knownMultiWordCodes[lookupKey]) {
    addCandidate(candidates, knownMultiWordCodes[lookupKey]);
  }

  const firstLetters = extractLetters(first);
  const secondLetters = extractLetters(second);
  const lastLetters = extractLetters(last);

  if (firstLetters.length >= 2 && (secondLetters.length >= 2 || lastLetters.length >= 2)) {
    addCandidate(
      candidates,
      (firstLetters.slice(0, 2) + (secondLetters || lastLetters).slice(0, 2)).slice(0, 4),
    );
  }

  if (firstLetters.length <= secondLetters.length) {
    addCandidate(
      candidates,
      (firstLetters.slice(0, 3) + secondLetters.slice(0, 1)).slice(0, 4),
    );
    addCandidate(
      candidates,
      (firstLetters.slice(0, 1) + secondLetters.slice(0, 3)).slice(0, 4),
    );
  } else if (secondLetters.length >= 4) {
    addCandidate(
      candidates,
      (firstLetters.slice(0, 1) + secondLetters.slice(0, 3)).slice(0, 4),
    );
    addCandidate(
      candidates,
      (firstLetters.slice(0, 3) + secondLetters.slice(0, 1)).slice(0, 4),
    );
  } else {
    addCandidate(
      candidates,
      (firstLetters.slice(0, 3) + secondLetters.slice(0, 1)).slice(0, 4),
    );
    addCandidate(
      candidates,
      (firstLetters.slice(0, 1) + secondLetters.slice(0, 3)).slice(0, 4),
    );
  }

  addCandidate(
    candidates,
    (extractLetters(first).slice(0, 1) + extractLetters(last).slice(0, 3)).slice(0, 4),
  );
  addCandidate(
    candidates,
    words
      .map((word) => extractLetters(word)[0] ?? "")
      .join("")
      .slice(0, 4),
  );
  addCandidate(
    candidates,
    (extractLetters(first).slice(0, 2) + extractLetters(last).slice(0, 2)).slice(0, 4),
  );

  const patterns = [
    [0, 0, 1, 1],
    [0, 1, 0, 1],
    [0, 2, 1, 0],
    [0, 0, 1, 2],
    [0, 1, 1, 0],
  ] as const;

  for (const pattern of patterns) {
    let code = "";
    for (let index = 0; index < pattern.length; index++) {
      const word = words[Math.min(index, words.length - 1)] ?? "";
      const letters = extractLetters(word);
      if (!letters) continue;
      code += letters[pattern[index] % letters.length] ?? "";
    }
    addCandidate(candidates, code.slice(0, 4));
  }

  if (words.length === 2) {
    const w0 = extractLetters(words[0]);
    const w1 = extractLetters(words[1]);
    addCandidate(candidates, w0.slice(0, 1) + w1.slice(0, 3));
    addCandidate(candidates, w0.slice(0, 3) + w1.slice(0, 1));
    addCandidate(candidates, w0.slice(0, 2) + w1.slice(0, 2));
  }

  return candidates;
}

function fallbackCandidates(words: string[]): string[] {
  const pool = words.map(extractLetters).join("");
  const candidates: string[] = [];

  if (pool.length >= 4) {
    addCandidate(candidates, pool.slice(0, 4));
    for (let start = 1; start <= pool.length - 4; start++) {
      addCandidate(candidates, pool.slice(start, start + 4));
    }
  }

  const consonantPool = pool.replace(/[AEIOU]/g, "");
  if (consonantPool.length >= 4) {
    addCandidate(candidates, consonantPool.slice(0, 4));
  }

  return candidates;
}

function alphabeticalAlternatives(base: string): string[] {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const candidates: string[] = [];
  const normalized = extractLetters(base).padEnd(4, "X").slice(0, 4);

  for (let position = 3; position >= 0; position--) {
    const current = normalized[position];
    const startIndex = letters.indexOf(current);
    for (let offset = 1; offset < 26; offset++) {
      const nextLetter = letters[(startIndex + offset) % 26];
      const candidate =
        normalized.slice(0, position) + nextLetter + normalized.slice(position + 1);
      addCandidate(candidates, candidate);
    }
  }

  for (let a = 0; a < 26; a++) {
    for (let b = 0; b < 26; b++) {
      addCandidate(candidates, normalized.slice(0, 2) + letters[a] + letters[b]);
      if (candidates.length > 200) return candidates;
    }
  }

  return candidates;
}

export function generateCategoryCodeCandidates(nameEn: string): string[] {
  const words = tokenizeEnglishCategoryName(nameEn);
  if (words.length === 0) return [];

  const primary =
    words.length === 1 ? oneWordCandidates(words[0]) : multiWordCandidates(words);

  const merged = [...primary, ...fallbackCandidates(words)];
  for (const base of [...merged]) {
    merged.push(...alphabeticalAlternatives(base));
  }

  return merged.filter(isFourLetterCode);
}

export function pickUniqueCategoryCode(
  candidates: string[],
  isTaken: (code: string) => boolean,
): string | null {
  for (const candidate of candidates) {
    if (!isTaken(candidate)) {
      return candidate;
    }
  }
  return null;
}

export function generateCategoryCodeFromEnglishName(nameEn: string): string {
  const candidates = generateCategoryCodeCandidates(nameEn);
  const first = candidates[0];
  if (!first) {
    throw new CategoryCodeGenerationError();
  }
  return first;
}

export type CategoryCodeTakenChecker = (code: string) => boolean | Promise<boolean>;

async function checkCategoryCodeTaken(
  checker: CategoryCodeTakenChecker,
  code: string,
): Promise<boolean> {
  return checker(code);
}

export async function generateUniqueCategoryCodeFromEnglishName(
  nameEn: string,
  isTaken: CategoryCodeTakenChecker,
): Promise<string> {
  const candidates = generateCategoryCodeCandidates(nameEn);
  for (const candidate of candidates) {
    if (!(await checkCategoryCodeTaken(isTaken, candidate))) {
      return candidate;
    }
  }
  throw new CategoryCodeGenerationError();
}
