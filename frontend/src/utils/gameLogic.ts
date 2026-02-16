// ============================================================
// 섯다 핵심 로직
// - 20장 패 데이터 (1~10월 x 2장)
// - 족보 계산 (38광땡 ~ 망통)
// - 셔플 & 딜
// ============================================================

/** 섯다 카드 한 장 */
export interface SutdaCard {
  month: number;    // 1~10
  isKwang: boolean; // 광패 여부 (1월광, 3월광, 8월광)
  id: string;       // 고유 식별자 "1K", "1N", "3K", ...
}

/** 두 장의 족보 평가 결과 */
export interface HandResult {
  rank: number;   // 높을수록 강함 (0~30)
  name: string;   // "38광땡", "9끗", "망통" 등
  score: number;  // 같은 rank 내 세부 점수
}

// ----------------------------------------------------------
// 1. 20장 덱 생성
// ----------------------------------------------------------
const KWANG_MONTHS = new Set([1, 3, 8]);

export function createDeck(): SutdaCard[] {
  const deck: SutdaCard[] = [];
  for (let m = 1; m <= 10; m++) {
    // 광패 (1, 3, 8월만 실제 광)
    deck.push({ month: m, isKwang: KWANG_MONTHS.has(m), id: `${m}K` });
    // 일반패
    deck.push({ month: m, isKwang: false, id: `${m}N` });
  }
  return deck;
}

// ----------------------------------------------------------
// 2. Fisher-Yates 셔플 & 딜
// ----------------------------------------------------------
export function shuffleDeck(deck: SutdaCard[]): SutdaCard[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 덱을 셔플한 뒤 playerCount명에게 2장씩 나눠준다.
 * @returns [각 플레이어 핸드 배열, 남은 덱]
 */
export function shuffleAndDeal(
  playerCount: number
): { hands: SutdaCard[][]; remaining: SutdaCard[] } {
  if (playerCount < 2 || playerCount > 4) {
    throw new Error("플레이어 수는 2~4명이어야 합니다.");
  }
  const deck = shuffleDeck(createDeck());
  const hands: SutdaCard[][] = [];
  for (let i = 0; i < playerCount; i++) {
    hands.push([deck[i * 2], deck[i * 2 + 1]]);
  }
  const remaining = deck.slice(playerCount * 2);
  return { hands, remaining };
}

// ----------------------------------------------------------
// 3. 족보 계산
//
// 순위 (rank 값, 높을수록 강함):
//  30  38광땡
//  29  18광땡
//  28  13광땡
//  27  장땡 (10-10)
//  26  9땡
//  ...
//  18  1땡
//  17  알리   (1-2)
//  16  독사   (1-4)
//  15  구삥   (1-9)
//  14  장삥   (1-10)
//  13  장사   (4-10)
//  12  세륙   (4-6)
//  11  갑오   (특수: 양쪽 다 광패인 조합이 아닌 경우의 합 5 쌍)
//   1~10  끗 (9끗=10, 8끗=9, ... 1끗=2, 망통=1)
//   0  (불가)
// ----------------------------------------------------------

// 특수 족보 테이블: [monthA, monthB] => { rank, name }
// (month 는 정렬된 오름차순)
interface SpecialHand {
  rank: number;
  name: string;
  requireBothKwang?: boolean; // 광땡 여부
}

const SPECIAL_PAIRS: Record<string, SpecialHand> = {
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

  // --- 광땡 체크 ---
  const special = SPECIAL_PAIRS[key];
  if (special?.requireBothKwang) {
    // 두 장 모두 광패여야 광땡
    if (cardA.isKwang && cardB.isKwang) {
      return { rank: special.rank, name: special.name, score: 0 };
    }
    // 광이 아닌 경우 일반 땡으로 판정되지 않음 → 아래로 fall-through
  }

  // --- 땡 (같은 월) ---
  if (cardA.month === cardB.month) {
    // 장땡(10)=27, 9땡=26, ... 1땡=18
    const rank = 18 + (cardA.month === 10 ? 9 : cardA.month - 1);
    return { rank, name: `${cardA.month === 10 ? "장" : cardA.month}땡`, score: 0 };
  }

  // --- 특수 족보 (알리~세륙) ---
  if (special && !special.requireBothKwang) {
    return { rank: special.rank, name: special.name, score: 0 };
  }

  // --- 끗 (합의 끝자리) ---
  const sum = (cardA.month + cardB.month) % 10;
  // 9끗(rank 10) > 8끗(rank 9) > ... > 1끗(rank 2) > 망통(0끗, rank 1)
  if (sum === 0) {
    return { rank: 1, name: "망통", score: 0 };
  }
  return { rank: sum + 1, name: `${sum}끗`, score: 0 };
}

/**
 * 두 핸드를 비교하여 승자를 판별한다.
 * @returns 양수면 handA 승, 음수면 handB 승, 0이면 무승부
 */
export function compareHands(
  handA: [SutdaCard, SutdaCard],
  handB: [SutdaCard, SutdaCard]
): number {
  const a = calculateRank(handA[0], handA[1]);
  const b = calculateRank(handB[0], handB[1]);
  if (a.rank !== b.rank) return a.rank - b.rank;
  return a.score - b.score;
}
