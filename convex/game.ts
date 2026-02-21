// ============================================================
// 섯다 핵심 로직 (전통 10개월, 40장 덱)
// - 1~10월 각 2장 × 2세트 = 40장
// - isKwang: 이미지 파일명에 'Hikari' 포함 여부로 판정
// - 족보: 38광땡 ~ 망통 (전통 방식 + 특수패)
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
  /** 상대 패에 따라 승/패/재경기가 결정되는 특수 족보 정보 */
  special?: SpecialHandInfo;
}

/**
 * 상대 의존 특수 족보 타입
 * - gusa / mung_gusa: 조건 충족 시 재경기 (판돈 이월)
 * - amhaeng: 조건 충족 시 승리, 아니면 1끗으로 강등
 * - ddangjabi: 조건 충족 시 승리, 아니면 망통으로 강등
 */
export type SpecialHandType = "gusa" | "mung_gusa" | "amhaeng" | "ddangjabi";

export interface SpecialHandInfo {
  type: SpecialHandType;
  /** 재경기 발동 조건: 상대 최상위 족보가 이 rank 이하일 때 */
  rematchIfOpponentRankBelow?: number;
  /** 승리 조건: 상대 족보 이름이 이 목록에 포함될 때 */
  winsAgainst?: string[];
  /** 조건 불충족 시 강등될 rank와 name */
  fallbackRank: number;
  fallbackName: string;
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
// 3. 족보 계산 (전통 10개월 + 특수패)
//
// rank 높을수록 강함:
//  30  38광땡    29  18광땡    28  13광땡
//  27  장땡(10+10)  26  9땡  …  18  1땡
//  17  알리(1+2)  16  독사(1+4)  15  구삥(1+9)
//  14  장삥(1+10) 13  장사(4+10) 12  세륙(4+6)
//  11~2  끗(9끗=11 … 1끗=2)
//   1  망통
//
// 상대 의존 특수패 (rank는 조건 충족 시 동적 결정):
//  멍텅구리구사: 4+9(둘 다 Tane) → 장땡 이하 상대 시 재경기
//  구사:         4+9(일반)     → 알리 이하 상대 시 재경기
//  암행어사:     4(Tane)+7(Tane) → 18광땡/13광땡 상대 시 승리, 아니면 1끗
//  땡잡이:       3(Hikari)+7(Tane) → 9땡 이하 땡 상대 시 승리, 아니면 망통
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

/** 두 카드 모두 imageFile에 'Tane' 포함 여부 */
function bothTane(a: SutdaCard, b: SutdaCard): boolean {
  return a.imageFile.includes("Tane") && b.imageFile.includes("Tane");
}

/** 특정 카드가 Tane인지 확인 */
function isTane(card: SutdaCard): boolean {
  return card.imageFile.includes("Tane");
}

/** 4월+9월 조합인지 확인 */
function is49Pair(a: SutdaCard, b: SutdaCard): boolean {
  return (a.month === 4 && b.month === 9) || (a.month === 9 && b.month === 4);
}

/** 특정 월 조합(Tane 기준)인지 확인 */
function isPairWithTane(a: SutdaCard, b: SutdaCard, m1: number, m2: number): boolean {
  const c1 = a.month === m1 ? a : b.month === m1 ? b : null;
  const c2 = a.month === m2 ? a : b.month === m2 ? b : null;
  if (!c1 || !c2 || c1 === c2) return false;
  return isTane(c1) && isTane(c2);
}

/** 3월(Hikari) + 7월(Tane) 조합인지 확인 */
function isDdangjabi(a: SutdaCard, b: SutdaCard): boolean {
  const c3 = a.month === 3 ? a : b.month === 3 ? b : null;
  const c7 = a.month === 7 ? a : b.month === 7 ? b : null;
  if (!c3 || !c7 || c3 === c7) return false;
  return c3.isKwang && isTane(c7);
}

export function calculateRank(cardA: SutdaCard, cardB: SutdaCard): HandResult {
  const months = [cardA.month, cardB.month].sort((a, b) => a - b);
  const key = months.join(",");

  // ── 상대 의존 특수패 검사 (SPECIAL_PAIRS보다 먼저 체크) ──

  // 멍텅구리구사: 4+9, 둘 다 Tane → 장땡(rank 27) 이하 재경기
  if (is49Pair(cardA, cardB) && bothTane(cardA, cardB)) {
    return {
      rank: 31, // 기본 rank는 최상위보다 높게 (재경기 조건 비교에 사용)
      name: "멍텅구리구사",
      score: 0,
      special: {
        type: "mung_gusa",
        rematchIfOpponentRankBelow: 27, // 장땡 이하
        fallbackRank: 31,
        fallbackName: "멍텅구리구사",
      },
    };
  }

  // 구사: 4+9 일반 조합 → 알리(rank 17) 이하 재경기
  if (is49Pair(cardA, cardB)) {
    return {
      rank: 31,
      name: "구사",
      score: 0,
      special: {
        type: "gusa",
        rematchIfOpponentRankBelow: 17, // 알리 이하
        fallbackRank: 31,
        fallbackName: "구사",
      },
    };
  }

  // 암행어사: 4(Tane)+7(Tane) → 18광땡/13광땡 상대 시 승리, 아니면 1끗
  if (isPairWithTane(cardA, cardB, 4, 7)) {
    return {
      rank: 2, // 기본은 1끗 (조건 불충족 시 fallback)
      name: "암행어사",
      score: 0,
      special: {
        type: "amhaeng",
        winsAgainst: ["18광땡", "13광땡"],
        fallbackRank: 2,
        fallbackName: "1끗",
      },
    };
  }

  // 땡잡이: 3(Hikari)+7(Tane) → 9땡~1땡 상대 시 승리, 아니면 망통
  if (isDdangjabi(cardA, cardB)) {
    return {
      rank: 1, // 기본은 망통 (조건 불충족 시 fallback)
      name: "땡잡이",
      score: 0,
      special: {
        type: "ddangjabi",
        winsAgainst: ["1땡", "2땡", "3땡", "4땡", "5땡", "6땡", "7땡", "8땡", "9땡"],
        fallbackRank: 1,
        fallbackName: "망통",
      },
    };
  }

  // ── 기존 SPECIAL_PAIRS (광땡 / 일반 특수) ──

  const special = SPECIAL_PAIRS[key];

  if (special?.requireBothKwang) {
    if (cardA.isKwang && cardB.isKwang) return { rank: special.rank, name: special.name, score: 0 };
  }

  // 땡 (같은 월)
  if (cardA.month === cardB.month) {
    const m = cardA.month;
    const rank = m === 10 ? 27 : 17 + m;
    return { rank, name: m === 10 ? "장땡" : `${m}땡`, score: 0 };
  }

  // 일반 특수 조합 (알리, 독사, 구삥, 장삥, 장사, 세륙)
  if (special && !special.requireBothKwang) return { rank: special.rank, name: special.name, score: 0 };

  // 끗 / 망통
  const sum = (cardA.month + cardB.month) % 10;
  if (sum === 0) return { rank: 1, name: "망통", score: 0 };
  return { rank: sum + 1, name: `${sum}끗`, score: 0 };
}

/**
 * 다중 플레이어 대결 시 특수 족보를 해석하여 최종 결과를 결정한다.
 *
 * 반환:
 *  - winnerId: 승자 playerId (null이면 재경기)
 *  - isRematch: 재경기 여부
 *  - rematchPlayerIds: 재경기 참여 대상 playerId 목록
 *    - 구사/멍텅구리구사: 모든 활성 플레이어 (올인 포함)
 *    - 일반 동점: 동점인 플레이어들만
 *    - 승패 확정 시: 빈 배열
 *  - results: 각 플레이어의 최종 HandResult (강등 반영)
 */
export function resolveSpecialHands(
  playerHands: { playerId: string; result: HandResult }[],
): {
  winnerId: string | null;
  isRematch: boolean;
  rematchPlayerIds: string[];
  results: { playerId: string; result: HandResult }[];
} {
  // 특수패가 없으면 기존 rank 비교
  const hasSpecial = playerHands.some((ph) => ph.result.special);
  if (!hasSpecial) {
    const best = playerHands.reduce((a, b) => (b.result.rank > a.result.rank ? b : a));
    const tied = playerHands.filter((ph) => ph.result.rank === best.result.rank);
    if (tied.length > 1) {
      return {
        winnerId: null,
        isRematch: true,
        rematchPlayerIds: tied.map((ph) => ph.playerId),
        results: playerHands,
      };
    }
    return { winnerId: best.playerId, isRematch: false, rematchPlayerIds: [], results: playerHands };
  }

  // 상대 중 특수패가 아닌 "일반 최고 rank" 산출
  const nonSpecialResults = playerHands.filter((ph) => !ph.result.special);
  const bestNonSpecialRank = nonSpecialResults.length > 0
    ? Math.max(...nonSpecialResults.map((ph) => ph.result.rank))
    : 0;
  const bestNonSpecialName = nonSpecialResults.length > 0
    ? nonSpecialResults.reduce((a, b) => (b.result.rank > a.result.rank ? b : a)).result.name
    : "";

  // 각 특수패 해석
  const resolved = playerHands.map((ph) => {
    const sp = ph.result.special;
    if (!sp) return ph;

    // 구사 / 멍텅구리구사: 조건 충족 → 재경기
    if (sp.type === "gusa" || sp.type === "mung_gusa") {
      // 재경기 여부는 아래에서 별도 판정 → 여기선 원본 유지
      return ph;
    }

    // 암행어사: 상대가 winsAgainst에 해당하면 최상위 승리, 아니면 fallback
    if (sp.type === "amhaeng") {
      if (sp.winsAgainst && sp.winsAgainst.includes(bestNonSpecialName)) {
        return {
          ...ph,
          result: { ...ph.result, rank: 99, name: "암행어사", special: undefined },
        };
      }
      return {
        ...ph,
        result: { rank: sp.fallbackRank, name: sp.fallbackName, score: 0 },
      };
    }

    // 땡잡이: 상대가 winsAgainst에 해당하면 최상위 승리, 아니면 fallback
    if (sp.type === "ddangjabi") {
      if (sp.winsAgainst && sp.winsAgainst.includes(bestNonSpecialName)) {
        return {
          ...ph,
          result: { ...ph.result, rank: 98, name: "땡잡이", special: undefined },
        };
      }
      return {
        ...ph,
        result: { rank: sp.fallbackRank, name: sp.fallbackName, score: 0 },
      };
    }

    return ph;
  });

  // 구사 / 멍텅구리구사 재경기 판정
  const gusaPlayers = resolved.filter(
    (ph) => ph.result.special?.type === "gusa" || ph.result.special?.type === "mung_gusa",
  );

  if (gusaPlayers.length > 0) {
    for (const gp of gusaPlayers) {
      const sp = gp.result.special!;
      if (sp.rematchIfOpponentRankBelow !== undefined && bestNonSpecialRank <= sp.rematchIfOpponentRankBelow) {
        // 재경기 발동: 모든 활성 플레이어 참여 (올인으로 잔액 0인 플레이어도 포함)
        const rematchResults = resolved.map((ph) => ({
          ...ph,
          result: ph.result.special
            ? { rank: ph.result.rank, name: ph.result.name, score: 0 }
            : ph.result,
        }));
        return {
          winnerId: null,
          isRematch: true,
          rematchPlayerIds: playerHands.map((ph) => ph.playerId),
          results: rematchResults,
        };
      }
    }
    // 재경기 조건 미달 → 구사/멍텅구리구사를 끗으로 강등
    const finalResolved = resolved.map((ph) => {
      if (ph.result.special?.type === "gusa" || ph.result.special?.type === "mung_gusa") {
        // 4+9 = 13 % 10 = 3 → 3끗
        return {
          ...ph,
          result: { rank: 4, name: "3끗", score: 0 },
        };
      }
      return ph;
    });
    const best = finalResolved.reduce((a, b) => (b.result.rank > a.result.rank ? b : a));
    const tied = finalResolved.filter((ph) => ph.result.rank === best.result.rank);
    if (tied.length > 1) {
      return {
        winnerId: null,
        isRematch: true,
        rematchPlayerIds: tied.map((ph) => ph.playerId),
        results: finalResolved,
      };
    }
    return { winnerId: best.playerId, isRematch: false, rematchPlayerIds: [], results: finalResolved };
  }

  // 일반 rank 비교 (특수패 해석 완료 후)
  const best = resolved.reduce((a, b) => (b.result.rank > a.result.rank ? b : a));
  const tied = resolved.filter((ph) => ph.result.rank === best.result.rank);
  if (tied.length > 1) {
    return {
      winnerId: null,
      isRematch: true,
      rematchPlayerIds: tied.map((ph) => ph.playerId),
      results: resolved,
    };
  }
  return { winnerId: best.playerId, isRematch: false, rematchPlayerIds: [], results: resolved };
}

export function compareHands(handA: [SutdaCard, SutdaCard], handB: [SutdaCard, SutdaCard]): number {
  const a = calculateRank(handA[0], handA[1]);
  const b = calculateRank(handB[0], handB[1]);
  if (a.rank !== b.rank) return a.rank - b.rank;
  return a.score - b.score;
}
