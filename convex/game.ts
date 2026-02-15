// ============================================================
// 섯다 핵심 로직 (전통 10개월, 40장 덱)
// - 1~10월 각 2장 × 2세트 = 40장
// - isKwang: 이미지 파일명에 'Hikari' 포함 여부로 판정
// - 족보: 38광땡 ~ 망통 (전통 방식 그대로)
// ============================================================

export interface SutdaCard {
  month: number;      // 1~10
  isKwang: boolean;   // 파일명에 'Hikari' 포함 시 true
  id: string;         // "1K_a", "1N_a", "1K_b" …
  imageFile: string;  // "Hwatu_January_Hikari.svg" 등
}

export interface HandResult {
  rank: number;
  name: string;
  score: number;
}

// ─────────────────────────────────────────────
// 1. 월별 이미지 매핑 (1~10월만, 11·12월 제외)
// ─────────────────────────────────────────────
const MONTH_IMAGES: Record<number, [string, string]> = {
  1:  ["Hwatu_January_Hikari.svg",   "Hwatu_January_Tanzaku.svg"],
  2:  ["Hwatu_February_Tane.svg",    "Hwatu_February_Tanzaku.svg"],
  3:  ["Hwatu_March_Hikari.svg",     "Hwatu_March_Tanzaku.svg"],
  4:  ["Hwatu_April_Tane.svg",       "Hwatu_April_Tanzaku.svg"],
  5:  ["Hwatu_May_Tane.svg",         "Hwatu_May_Tanzaku.svg"],
  6:  ["Hwatu_June_Tane.svg",        "Hwatu_June_Tanzaku.svg"],
  7:  ["Hwatu_July_Tane.svg",        "Hwatu_July_Tanzaku.svg"],
  8:  ["Hwatu_August_Hikari.svg",    "Hwatu_August_Tane.svg"],
  9:  ["Hwatu_September_Tane.svg",   "Hwatu_September_Tanzaku.svg"],
  10: ["Hwatu_October_Tane.svg",     "Hwatu_October_Tanzaku.svg"],
};

/**
 * 20장 베이스 덱 생성 (1세트)
 * isKwang = 파일명에 'Hikari' 포함 여부
 */
function createBaseDeck(setLabel: "a" | "b"): SutdaCard[] {
  const deck: SutdaCard[] = [];
  for (let m = 1; m <= 10; m++) {
    const [imgK, imgN] = MONTH_IMAGES[m];
    deck.push({ month: m, isKwang: imgK.includes("Hikari"), id: `${m}K_${setLabel}`, imageFile: imgK });
    deck.push({ month: m, isKwang: imgN.includes("Hikari"), id: `${m}N_${setLabel}`, imageFile: imgN });
  }
  return deck;
}

// ─────────────────────────────────────────────
// 2. 40장 풀 덱 = 2세트 Fisher-Yates 셔플
// ─────────────────────────────────────────────
function fisherYates(arr: SutdaCard[]): SutdaCard[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function shuffleAndDeal(playerCount: number): { hands: SutdaCard[][]; remaining: SutdaCard[] } {
  if (playerCount < 2 || playerCount > 10) throw new Error("플레이어 수는 2~10명이어야 합니다.");
  const deck = fisherYates([...createBaseDeck("a"), ...createBaseDeck("b")]);
  const hands: SutdaCard[][] = [];
  for (let i = 0; i < playerCount; i++) hands.push([deck[i * 2], deck[i * 2 + 1]]);
  return { hands, remaining: deck.slice(playerCount * 2) };
}

// ─────────────────────────────────────────────
// 3. 족보 계산 (전통 10개월)
//
// rank 높을수록 강함:
//  30  38광땡    29  18광땡    28  13광땡
//  27  장땡(10+10)  26  9땡  …  18  1땡
//  17  알리(1+2)  16  독사(1+4)  15  구삥(1+9)
//  14  장삥(1+10) 13  장사(4+10) 12  세륙(4+6)
//  11~2  끗(9끗=11 … 1끗=2)
//   1  망통
// ─────────────────────────────────────────────

const SPECIAL_PAIRS: Record<string, { rank: number; name: string; requireBothKwang?: boolean }> = {
  "3,8":  { rank: 30, name: "38광땡", requireBothKwang: true },
  "1,8":  { rank: 29, name: "18광땡", requireBothKwang: true },
  "1,3":  { rank: 28, name: "13광땡", requireBothKwang: true },
  "1,2":  { rank: 17, name: "알리" },
  "1,4":  { rank: 16, name: "독사" },
  "1,9":  { rank: 15, name: "구삥" },
  "1,10": { rank: 14, name: "장삥" },
  "4,10": { rank: 13, name: "장사" },
  "4,6":  { rank: 12, name: "세륙" },
};

export function calculateRank(cardA: SutdaCard, cardB: SutdaCard): HandResult {
  const months = [cardA.month, cardB.month].sort((a, b) => a - b);
  const key = months.join(",");
  const special = SPECIAL_PAIRS[key];

  if (special?.requireBothKwang) {
    if (cardA.isKwang && cardB.isKwang) return { rank: special.rank, name: special.name, score: 0 };
  }

  if (cardA.month === cardB.month) {
    const m = cardA.month;
    const rank = m === 10 ? 27 : 17 + m;
    return { rank, name: m === 10 ? "장땡" : `${m}땡`, score: 0 };
  }

  if (special && !special.requireBothKwang) return { rank: special.rank, name: special.name, score: 0 };

  const sum = (cardA.month + cardB.month) % 10;
  if (sum === 0) return { rank: 1, name: "망통", score: 0 };
  return { rank: sum + 1, name: `${sum}끗`, score: 0 };
}

export function compareHands(handA: [SutdaCard, SutdaCard], handB: [SutdaCard, SutdaCard]): number {
  const a = calculateRank(handA[0], handA[1]);
  const b = calculateRank(handB[0], handB[1]);
  if (a.rank !== b.rank) return a.rank - b.rank;
  return a.score - b.score;
}
