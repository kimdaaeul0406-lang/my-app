/**
 * 사주 운세 유틸리티 (타입 정의만)
 * 실제 Gemini API 호출은 서버 라우트(/api/saju)에서 처리
 */

export interface SajuResult {
  overview: string; // 전체 운세 3-4문장
  personality: string; // 성격 특징 2-3문장
  love: string; // 연애운 2문장
  career: string; // 직장/학업운 2문장
  money: string; // 금전운 2문장
  thisYear: string; // 올해(2026년) 운세 2-3문장
  advice: string; // 조언 2문장
  luckyElement: string; // 행운의 오행(목/화/토/금/수)
  luckyColor: string; // 행운의 색상
  keywords: string[]; // 키워드 배열
}
