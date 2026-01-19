import { NextRequest, NextResponse } from "next/server";

/**
 * Horoscope API 연동
 * 두 개의 외부 API를 사용하여 별자리 운세를 가져옵니다.
 *
 * - API Ninjas Horoscope API (API Key 사용) - basic (무료)
 * - Aztro API (POST 요청, API Key 없음) - today/tomorrow/yesterday (프리미엄)
 *
 * 환경 변수:
 * - API_NINJAS_KEY: API Ninjas API 키 (.env.local에 설정)
 *
 * 요청 예시:
 * - GET /api/horoscope?sign=leo&type=basic (API Ninjas)
 * - GET /api/horoscope?sign=leo&type=today (Aztro API)
 * - GET /api/horoscope?sign=leo&type=tomorrow (Aztro API)
 * - GET /api/horoscope?sign=leo&type=yesterday (Aztro API)
 */

type ZodiacSignEn =
  | "aries"
  | "taurus"
  | "gemini"
  | "cancer"
  | "leo"
  | "virgo"
  | "libra"
  | "scorpio"
  | "sagittarius"
  | "capricorn"
  | "aquarius"
  | "pisces";

type HoroscopeType = "basic" | "today" | "tomorrow" | "yesterday";

/**
 * 공통 응답 포맷
 */
interface UnifiedHoroscopeResponse {
  sign: ZodiacSignEn;
  type: HoroscopeType;
  date: string | null;
  description: string;
  mood: string | null;
  color: string | null;
  lucky_number: string | number | null;
  lucky_time: string | null;
  source: "aztro" | "api-ninjas" | "fallback";
  warning?: string;
  // 프리미엄: 카테고리별 운세
  love?: string | null;
  money?: string | null;
  work?: string | null;
}

/**
 * API Ninjas 응답 형식
 */
interface ApiNinjasResponse {
  horoscope: string;
}

/**
 * Aztro API 응답 형식
 */
interface AztroResponse {
  current_date: string;
  date_range: string;
  description: string;
  compatibility: string;
  mood: string;
  color: string;
  lucky_number: string | number;
  lucky_time: string;
}

/**
 * Google Translate 비공식 API 응답 형식
 */
type GoogleTranslateResponse = [
  [[string, string, null, null, number]],
  null,
  string
];

/**
 * Mood 매핑 테이블 (영어 → 한국어)
 */
const moodMapping: Record<string, string> = {
  Confident: "자신감",
  Relaxed: "편안함",
  Energetic: "활기참",
  Calm: "차분함",
  Optimistic: "낙관적",
  Creative: "창의적",
  Focused: "집중력",
  Playful: "장난기",
  Serious: "진지함",
  Adventurous: "모험적",
  Thoughtful: "사려깊음",
  Passionate: "열정적",
  Mysterious: "신비로움",
  Balanced: "균형잡힘",
  Ambitious: "야망",
  Sensitive: "민감함",
  Independent: "독립적",
  Social: "사교적",
  Introspective: "내성적",
  Determined: "결단력",
};

/**
 * Color 매핑 테이블 (영어 → 한국어)
 */
const colorMapping: Record<string, string> = {
  Gold: "골드",
  "Spring Green": "봄녹색",
  "Sky Blue": "하늘색",
  "Royal Blue": "로얄 블루",
  "Deep Purple": "진한 보라",
  "Coral Red": "코랄 레드",
  "Sunset Orange": "석양 오렌지",
  "Forest Green": "숲녹색",
  "Ocean Blue": "바다색",
  Lavender: "라벤더",
  "Rose Pink": "로즈 핑크",
  Amber: "호박색",
  Emerald: "에메랄드",
  Sapphire: "사파이어",
  Ruby: "루비",
  Silver: "실버",
  Bronze: "브론즈",
  Ivory: "아이보리",
  Navy: "네이비",
  Crimson: "진홍색",
};

/**
 * 시간 형식 변환 함수
 * "2pm" → "오후 2시", "7am" → "오전 7시"
 */
function translateLuckyTime(timeStr: string | null): string | null {
  if (!timeStr) return null;

  // 이미 한국어인지 체크
  if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(timeStr)) {
    return timeStr;
  }

  // "2pm", "7am" 형식 처리
  const timeMatch = timeStr.match(/(\d+)(am|pm)/i);
  if (timeMatch) {
    const hour = parseInt(timeMatch[1], 10);
    const period = timeMatch[2].toLowerCase();

    if (period === "am") {
      return `오전 ${hour}시`;
    } else {
      return `오후 ${hour}시`;
    }
  }

  // 다른 형식은 번역 API 사용
  return null; // 번역 API로 처리하도록 null 반환
}

/**
 * 영어를 한국어로 번역하는 함수 (서버 전용)
 * Google Translate 비공식 API 사용
 */
async function translateToKorean(text: string): Promise<string> {
  if (!text || text.trim() === "") {
    return text;
  }

  // 이미 한국어인지 간단히 체크 (한글 포함 여부)
  const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text);
  if (hasKorean) {
    console.log(
      "🌐 [Translation] Text already contains Korean, skipping translation"
    );
    return text;
  }

  console.log(`🌐 [Translation] Translating text (length: ${text.length})`);

  const translateUrl = new URL(
    "https://translate.googleapis.com/translate_a/single"
  );
  translateUrl.searchParams.append("client", "gtx");
  translateUrl.searchParams.append("sl", "en");
  translateUrl.searchParams.append("tl", "ko");
  translateUrl.searchParams.append("dt", "t");
  translateUrl.searchParams.append("q", text);

  // AbortController를 사용한 timeout 설정 (5초)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(translateUrl.toString(), {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`❌ [Translation] HTTP error: ${response.status}`);
      return text; // 번역 실패 시 원문 반환
    }

    const data: GoogleTranslateResponse = await response.json();

    // 응답 형식: [[["번역된 텍스트", "원문", null, null, 0]], null, "en"]
    if (
      Array.isArray(data) &&
      Array.isArray(data[0]) &&
      Array.isArray(data[0][0]) &&
      data[0][0][0]
    ) {
      const translatedText = data[0][0][0];
      console.log("✅ [Translation] Translation successful");
      return translatedText;
    }

    console.error("❌ [Translation] Unexpected response format");
    return text; // 번역 실패 시 원문 반환
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      console.error("❌ [Translation] Request timeout (5 seconds)");
    } else {
      console.error("❌ [Translation] Error:", error);
    }

    // 번역 실패해도 원문 반환 (전체 API는 정상 동작)
    return text;
  }
}

/**
 * 응답 객체의 모든 필드를 한국어로 번역하는 함수
 */
async function translateFields(
  response: UnifiedHoroscopeResponse
): Promise<UnifiedHoroscopeResponse> {
  console.log("🌐 [Translation] Starting field translation");

  // description 번역 (번역 API 사용)
  const translatedDescription = await translateToKorean(response.description);

  // mood 번역 (매핑 테이블 우선, 없으면 번역 API)
  let translatedMood: string | null = null;
  if (response.mood) {
    const moodLower = response.mood.trim();
    if (moodMapping[moodLower]) {
      translatedMood = moodMapping[moodLower];
      console.log(
        `🌐 [Translation] Mood mapped: ${response.mood} → ${translatedMood}`
      );
    } else {
      translatedMood = await translateToKorean(response.mood);
    }
  }

  // color 번역 (매핑 테이블 우선, 없으면 번역 API)
  let translatedColor: string | null = null;
  if (response.color) {
    const colorKey = Object.keys(colorMapping).find(
      (key) => key.toLowerCase() === response.color?.toLowerCase()
    );
    if (colorKey) {
      translatedColor = colorMapping[colorKey];
      console.log(
        `🌐 [Translation] Color mapped: ${response.color} → ${translatedColor}`
      );
    } else {
      translatedColor = await translateToKorean(response.color);
    }
  }

  // lucky_time 번역 (시간 형식 변환 우선, 없으면 번역 API)
  let translatedLuckyTime: string | null = null;
  if (response.lucky_time) {
    const timeTranslated = translateLuckyTime(response.lucky_time);
    if (timeTranslated) {
      translatedLuckyTime = timeTranslated;
      console.log(
        `🌐 [Translation] Lucky time converted: ${response.lucky_time} → ${translatedLuckyTime}`
      );
    } else {
      translatedLuckyTime = await translateToKorean(response.lucky_time);
    }
  }

  // warning 번역 (있는 경우)
  let translatedWarning: string | undefined = undefined;
  if (response.warning) {
    translatedWarning = await translateToKorean(response.warning);
  }

  // love, money, work 번역 (있는 경우)
  let translatedLove: string | null = null;
  let translatedMoney: string | null = null;
  let translatedWork: string | null = null;

  if (response.love) {
    translatedLove = await translateToKorean(response.love);
  }
  if (response.money) {
    translatedMoney = await translateToKorean(response.money);
  }
  if (response.work) {
    translatedWork = await translateToKorean(response.work);
  }

  return {
    ...response,
    description: translatedDescription,
    mood: translatedMood,
    color: translatedColor,
    lucky_time: translatedLuckyTime,
    warning: translatedWarning,
    love: translatedLove,
    money: translatedMoney,
    work: translatedWork,
  };
}

/**
 * 날짜 변환 함수 (Aztro 전용)
 * "January 16, 2026" → "2026-01-16"
 */
function convertAztroDate(dateStr: string): string | null {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      console.error("❌ [Date Conversion] Invalid date:", dateStr);
      return null;
    }
    return date.toISOString().split("T")[0];
  } catch (error) {
    console.error("❌ [Date Conversion] Failed to convert date:", dateStr);
    return null;
  }
}

/**
 * HTML 응답인지 확인
 */
function isHtmlResponse(text: string): boolean {
  const trimmed = text.trim().toLowerCase();
  return (
    trimmed.startsWith("<!doctype") ||
    trimmed.startsWith("<html") ||
    trimmed.includes("<html>")
  );
}

/**
 * API Ninjas에서 운세를 가져오는 함수
 * ⚠️ 중요: date, day, today 같은 파라미터 절대 추가하지 않기
 */
async function fetchFromApiNinjas(
  sign: ZodiacSignEn
): Promise<UnifiedHoroscopeResponse> {
  const apiKey = process.env.API_NINJAS_KEY;

  if (!apiKey) {
    throw new Error("API_NINJAS_KEY is not set in environment variables");
  }

  console.log(`🔮 [API Ninjas] Fetching horoscope for ${sign}`);

  // ⚠️ 중요: URL을 직접 고정하여 date/day/today 파라미터가 절대 포함되지 않도록 함
  const url = `https://api.api-ninjas.com/v1/horoscope?zodiac=${encodeURIComponent(
    sign
  )}`;

  // 디버깅: fetch 호출 직전에 실제 URL 확인
  console.log("[NINJAS URL]", url);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Api-Key": apiKey,
      },
      cache: "no-store",
    });

    console.log(`📥 [API Ninjas] Response Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ [API Ninjas] Error response:", errorText);
      throw new Error(
        `API Ninjas request failed: ${response.status} ${errorText}`
      );
    }

    const data: ApiNinjasResponse = await response.json();
    console.log("✅ [API Ninjas] Response received");

    if (!data.horoscope || data.horoscope.trim() === "") {
      throw new Error("API Ninjas returned empty horoscope");
    }

    // basic은 date를 항상 null로 설정
    const result: UnifiedHoroscopeResponse = {
      sign: sign,
      date: null,
      type: "basic",
      description: data.horoscope, // 번역은 translateFields에서 처리
      mood: null,
      color: null,
      lucky_number: null,
      lucky_time: null,
      source: "api-ninjas",
    };

    // 모든 필드 번역
    return await translateFields(result);
  } catch (error) {
    console.error("❌ [API Ninjas] Error:", error);
    throw error;
  }
}

/**
 * Aztro API에서 운세를 가져오는 함수
 * type=today|tomorrow|yesterday에서만 사용
 * timeout 6초 적용, HTML 응답 감지 및 처리
 */
async function fetchFromAztro(
  sign: ZodiacSignEn,
  day: "today" | "tomorrow" | "yesterday"
): Promise<UnifiedHoroscopeResponse> {
  console.log(`🔮 [Aztro] Fetching horoscope for ${sign}, day: ${day}`);

  const apiUrl = `https://aztro.sameerkumar.website/?sign=${sign}&day=${day}`;

  console.log(`📡 [Aztro] Request URL: ${apiUrl}`);

  // AbortController를 사용한 timeout 설정 (6초)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(`📥 [Aztro] Response Status: ${response.status}`);

    // 응답이 성공이 아니거나 HTML인 경우 처리
    if (!response.ok) {
      const errorText = await response.text();
      const errorPreview = errorText.substring(0, 200);

      console.error("❌ [Aztro] Error response status:", response.status);
      console.error("❌ [Aztro] Error response preview:", errorPreview);
      console.error(
        "❌ [Aztro] Error response is HTML:",
        isHtmlResponse(errorText)
      );

      // HTML 응답이면 AztroUnavailable로 간주
      if (isHtmlResponse(errorText)) {
        throw new Error("AztroUnavailable: HTML error page received");
      }

      throw new Error(
        `Aztro API request failed: ${response.status} ${errorPreview}`
      );
    }

    // 응답 텍스트 읽기
    const responseText = await response.text();

    // HTML 응답인지 확인
    if (isHtmlResponse(responseText)) {
      console.error("❌ [Aztro] Received HTML instead of JSON");
      console.error(
        "❌ [Aztro] Response preview:",
        responseText.substring(0, 200)
      );
      throw new Error("AztroUnavailable: HTML error page received");
    }

    // JSON 파싱 시도
    let data: AztroResponse;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("❌ [Aztro] Failed to parse JSON response");
      console.error(
        "❌ [Aztro] Response preview:",
        responseText.substring(0, 200)
      );
      throw new Error("AztroUnavailable: Invalid JSON response");
    }

    console.log("✅ [Aztro] Response received and parsed");

    if (!data.description || data.description.trim() === "") {
      throw new Error("Aztro API returned empty description");
    }

    // Aztro만 날짜 변환: "January 16, 2026" → "2026-01-16"
    const convertedDate = convertAztroDate(data.current_date);

    const result: UnifiedHoroscopeResponse = {
      sign: sign,
      date: convertedDate,
      type: day,
      description: data.description, // 번역은 translateFields에서 처리
      mood: data.mood || null,
      color: data.color || null,
      lucky_number: data.lucky_number || null,
      lucky_time: data.lucky_time || null,
      source: "aztro",
    };

    // 모든 필드 번역
    return await translateFields(result);
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      console.error("❌ [Aztro] Request timeout (6 seconds)");
      throw new Error("AztroUnavailable: Request timeout");
    }

    console.error("❌ [Aztro] Error:", error);
    throw error;
  }
}

/**
 * 유효한 별자리인지 확인
 */
function isValidSign(sign: string): sign is ZodiacSignEn {
  const validSigns: ZodiacSignEn[] = [
    "aries",
    "taurus",
    "gemini",
    "cancer",
    "leo",
    "virgo",
    "libra",
    "scorpio",
    "sagittarius",
    "capricorn",
    "aquarius",
    "pisces",
  ];
  return validSigns.includes(sign as ZodiacSignEn);
}

/**
 * 유효한 type인지 확인
 */
function isValidType(type: string): type is HoroscopeType {
  return (
    type === "basic" ||
    type === "today" ||
    type === "tomorrow" ||
    type === "yesterday"
  );
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const signParam = searchParams.get("sign");
    const typeParam = searchParams.get("type") || "today"; // 기본값 today

    // sign 파라미터 검증
    if (!signParam) {
      return NextResponse.json(
        { error: "Sign parameter is required" },
        { status: 400 }
      );
    }

    if (!isValidSign(signParam)) {
      return NextResponse.json(
        {
          error: "Invalid zodiac sign",
          message:
            "Valid signs: aries, taurus, gemini, cancer, leo, virgo, libra, scorpio, sagittarius, capricorn, aquarius, pisces",
        },
        { status: 400 }
      );
    }

    // type 파라미터 검증
    if (!isValidType(typeParam)) {
      return NextResponse.json(
        {
          error: "Invalid type",
          message: "Type must be 'basic', 'today', 'tomorrow', or 'yesterday'",
        },
        { status: 400 }
      );
    }

    const sign: ZodiacSignEn = signParam;
    const type: HoroscopeType = typeParam;

    console.log(
      `🌐 [Server Route] Fetching horoscope for ${sign}, type: ${type}`
    );

    let result: UnifiedHoroscopeResponse;

    try {
      if (type === "basic") {
        // API Ninjas 사용 (무료) - date 파라미터 절대 사용 안 함
        try {
          result = await fetchFromApiNinjas(sign);
        } catch (apiNinjasError) {
          console.warn(
            "⚠️ [Server Route] API Ninjas failed, trying Aztro as fallback"
          );
          // API Ninjas 실패 시 Aztro API로 폴백
          try {
            result = await fetchFromAztro(sign, "today");
            result.source = "fallback";
            result.warning = "API Ninjas temporarily unavailable, using Aztro";
            // warning도 번역
            result = await translateFields(result);
          } catch (aztroError) {
            // 둘 다 실패하면 에러 throw
            throw apiNinjasError;
          }
        }
      } else {
        // Aztro API 사용 (프리미엄: today, tomorrow, yesterday)
        try {
          result = await fetchFromAztro(sign, type);
        } catch (aztroError) {
          const isAztroUnavailable =
            aztroError instanceof Error &&
            aztroError.message.includes("AztroUnavailable");

          if (isAztroUnavailable) {
            console.warn(
              "⚠️ [Server Route] Aztro unavailable, trying API Ninjas as fallback"
            );
            console.warn(
              "⚠️ [Server Route] Aztro error:",
              aztroError instanceof Error
                ? aztroError.message
                : String(aztroError)
            );
          } else {
            console.warn(
              "⚠️ [Server Route] Aztro failed, trying API Ninjas as fallback"
            );
          }

          // Aztro 실패 시 API Ninjas로 폴백 (basic으로)
          try {
            result = await fetchFromApiNinjas(sign);
            result.source = "fallback";
            result.type = type; // 원래 요청한 type 유지
            result.warning = "Aztro temporarily unavailable, using API Ninjas";
            // warning도 번역
            result = await translateFields(result);
          } catch (apiNinjasError) {
            // 둘 다 실패하면 에러 throw
            throw aztroError;
          }
        }
      }

      console.log(`✅ [Server Route] Successfully fetched horoscope`);
      console.log(`📊 [Server Route] Source: ${result.source}`);

      return NextResponse.json(result, {
        headers: {
          "Cache-Control": "no-store, must-revalidate",
          "X-API-Source": result.source,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`❌ [Server Route] All API calls failed:`, errorMessage);

      // 에러 메시지도 한국어로 번역
      const translatedErrorMessage = await translateToKorean(
        "별자리 API 호출에 실패했습니다. 잠시 후 다시 시도해주세요."
      );

      // 외부 API 실패 시 502 Bad Gateway
      return NextResponse.json(
        {
          error: errorMessage || "Failed to fetch horoscope from API",
          message: translatedErrorMessage,
          sign: sign,
          type: type,
        },
        {
          status: 502,
          headers: {
            "Cache-Control": "no-store, must-revalidate",
          },
        }
      );
    }
  } catch (error) {
    console.error("❌ [Server Route] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
