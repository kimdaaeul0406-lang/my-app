/**
 * 별자리 운세 유틸리티 (타입 정의 및 헬퍼 함수)
 * 실제 Gemini API 호출은 서버 라우트(/api/horoscope)에서 처리
 */

import { ZODIAC_SIGNS } from "./constants";

export interface HoroscopeResult {
  message: string; // 전체 운세 2-3문장
  love: string; // 연애운 1-2문장
  career: string; // 직장/학업운 1-2문장
  money: string; // 금전운 1-2문장
  advice: string; // 조언 1-2문장
  luckyNumber: number; // 행운의 숫자
  luckyColor: string; // 행운의 색상
  keywords: string[]; // 키워드 배열
}

/**
 * 별자리 정보 가져오기
 */
export function getZodiacInfo(signEn: string) {
  return ZODIAC_SIGNS.find((z) => z.nameEn === signEn);
}
