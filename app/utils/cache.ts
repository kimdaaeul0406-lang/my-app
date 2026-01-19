/**
 * 로컬스토리지 기반 캐싱 유틸
 * 같은 날 같은 운세는 캐시 반환 (API 재호출 방지)
 */

/**
 * 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 */
function getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 캐시에서 데이터 가져오기
 * @param key 캐시 키
 * @returns 캐시된 데이터 또는 null
 */
export function getCachedData<T>(key: string): T | null {
  if (typeof window === "undefined") return null; // 서버 사이드에서는 null 반환

  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    const today = getTodayDate();

    // 날짜가 다르면 캐시 무효화
    if (parsed.date !== today) {
      localStorage.removeItem(key);
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.error("[Cache] Failed to get cached data:", error);
    return null;
  }
}

/**
 * 캐시에 데이터 저장하기
 * @param key 캐시 키
 * @param data 저장할 데이터
 */
export function setCachedData<T>(key: string, data: T): void {
  if (typeof window === "undefined") return; // 서버 사이드에서는 무시

  try {
    const today = getTodayDate();
    const cached = {
      date: today,
      data,
    };
    localStorage.setItem(key, JSON.stringify(cached));
  } catch (error) {
    console.error("[Cache] Failed to cache data:", error);
  }
}

/**
 * 타로 캐시 키 생성
 * @param cardName 카드 이름 (예: "TheFool")
 * @returns 캐시 키
 */
export function getTarotCacheKey(cardName: string): string {
  const today = getTodayDate();
  return `tarot-v2-${cardName}-${today}`;
}

/**
 * 별자리 캐시 키 생성
 * @param zodiacSign 별자리 영어명 (예: "aries")
 * @returns 캐시 키
 */
export function getHoroscopeCacheKey(zodiacSign: string): string {
  const today = getTodayDate();
  return `horoscope-v2-${zodiacSign}-${today}`;
}

/**
 * 사주 캐시 키 생성
 * @param birthDate 생년월일 (YYYYMMDD 형식)
 * @param gender 성별 ("male" | "female")
 * @returns 캐시 키
 */
export function getSajuCacheKey(birthDate: string, gender: string): string {
  const today = getTodayDate();
  return `saju-v2-${birthDate}-${gender}-${today}`;
}
