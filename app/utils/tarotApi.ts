/**
 * 타로 카드 유틸리티 (타입 정의 및 헬퍼 함수)
 * 실제 Gemini API 호출은 서버 라우트(/api/tarot)에서 처리
 */

import { MAJOR_ARCANA } from "./constants";

export interface TarotResult {
  message: string; // 전체 운세 2-3문장
  love: string; // 연애운 1-2문장
  career: string; // 직장/학업운 1-2문장
  money: string; // 금전운 1-2문장
  advice: string; // 조언 1-2문장
  keywords: string[]; // 키워드 배열
}

/**
 * 22장 중 랜덤 카드 선택 (날짜 기반 고정)
 */
export function getRandomCard(): { name: string; nameKo: string; id: number; isReversed: boolean } {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  // 날짜 기반 시드 생성
  const seed = year * 10000 + month * 100 + day;
  const randomValue = (seed * 9301 + 49297) % 233280; // 간단한 LCG
  const normalized = randomValue / 233280;

  // 카드 선택
  const cardIndex = Math.floor(normalized * MAJOR_ARCANA.length);
  const card = MAJOR_ARCANA[cardIndex];

  // 정방향/역방향 50% 확률
  const isReversed = normalized > 0.5;

  return {
    name: card.name,
    nameKo: card.nameKo,
    id: card.id,
    isReversed,
  };
}
