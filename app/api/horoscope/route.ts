import { NextRequest, NextResponse } from "next/server";

/**
 * Horoscope API 연동
 * 무료 Horoscope API를 사용하여 별자리 운세를 가져옵니다.
 * 
 * 참고: 실제 API는 아래 중 하나를 사용할 수 있습니다:
 * - https://aztro.sameerkumar.website/ (무료, 간단)
 * - https://horoscope-api.herokuapp.com/horoscope/today/ (무료)
 * - https://api.horoscopesandyearlypredictions.com/ (유료)
 * 
 * 현재는 데모용으로 가공된 한국어 응답을 반환합니다.
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

interface HoroscopeResponse {
  date: string;
  sign: ZodiacSignEn;
  horoscope: string;
  love?: string;
  money?: string;
  work?: string;
}

// 날짜 기반 캐싱을 위한 간단한 메모리 캐시
const cache: Map<string, HoroscopeResponse> = new Map();

function getCacheKey(sign: ZodiacSignEn, date: string): string {
  return `${sign}_${date}`;
}

/**
 * 외부 API에서 운세를 가져오는 함수 (데모용)
 * 실제 구현 시 아래 주석 처리된 코드를 사용하세요.
 */
async function fetchHoroscopeFromAPI(
  sign: ZodiacSignEn
): Promise<HoroscopeResponse> {
  // 실제 API 연동 예시 (주석 처리됨)
  /*
  try {
    const response = await fetch(
      `https://aztro.sameerkumar.website/?sign=${sign}&day=today`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("API request failed");
    }

    const data = await response.json();
    
    // API 응답을 한국어 톤으로 가공
    return {
      date: data.current_date,
      sign: sign,
      horoscope: processHoroscopeText(data.description),
      love: data.love ? processHoroscopeText(data.love) : undefined,
      money: data.money ? processHoroscopeText(data.money) : undefined,
      work: data.work ? processHoroscopeText(data.work) : undefined,
    };
  } catch (error) {
    console.error("Horoscope API error:", error);
    throw error;
  }
  */

  // 데모용 응답 (실제 API 연결 전까지 사용)
  const demoHoroscopes: Record<ZodiacSignEn, string> = {
    aries: "오늘은 새로운 시작에 용기를 내보세요. 작은 도전이 큰 변화를 만들어요.",
    taurus: "오늘은 안정을 추구하는 하루예요. 서두르지 말고 차근차근 진행하세요.",
    gemini: "오늘은 소통이 중요한 날이에요. 주변 사람들과 대화를 나누면 좋은 기회가 생겨요.",
    cancer: "오늘은 감정에 귀 기울이는 시간이 필요해요. 내면의 목소리를 들어보세요.",
    leo: "오늘은 자신감을 발휘할 수 있는 날이에요. 주도적으로 움직이면 좋은 결과가 나와요.",
    virgo: "오늘은 정리와 계획이 중요한 하루예요. 체계적으로 접근하면 효율이 올라가요.",
    libra: "오늘은 균형을 찾는 것이 중요해요. 한쪽으로 치우치지 않도록 조심하세요.",
    scorpio: "오늘은 깊이 있는 사고가 필요한 날이에요. 표면보다 본질을 보는 것이 좋아요.",
    sagittarius: "오늘은 모험과 탐험의 기운이 있어요. 새로운 경험을 시도해보세요.",
    capricorn: "오늘은 목표를 향해 꾸준히 나아가는 날이에요. 인내심이 결과를 만들어요.",
    aquarius: "오늘은 독창적인 아이디어가 떠오르는 날이에요. 창의성을 발휘해보세요.",
    pisces: "오늘은 직감을 믿어보세요. 감정의 흐름을 따라가면 좋은 방향이 보여요.",
  };

  const demoLove: Record<ZodiacSignEn, string> = {
    aries: "오늘은 적극적인 접근이 관계를 발전시켜요.",
    taurus: "오늘은 안정적인 관계를 유지하는 것이 좋아요.",
    gemini: "오늘은 대화를 통해 서로를 더 이해할 수 있어요.",
    cancer: "오늘은 감정을 솔직하게 표현하는 것이 중요해요.",
    leo: "오늘은 로맨틱한 순간을 만들어보세요.",
    virgo: "오늘은 작은 배려가 관계를 돈독하게 만들어요.",
    libra: "오늘은 상대방의 입장을 고려하는 것이 좋아요.",
    scorpio: "오늘은 깊은 신뢰를 쌓을 수 있는 날이에요.",
    sagittarius: "오늘은 함께 새로운 경험을 나누면 좋아요.",
    capricorn: "오늘은 진지한 대화를 나눌 수 있는 날이에요.",
    aquarius: "오늘은 독특한 방식으로 마음을 전해보세요.",
    pisces: "오늘은 감성적인 교감이 중요한 하루예요.",
  };

  const demoMoney: Record<ZodiacSignEn, string> = {
    aries: "오늘은 신중한 투자가 필요해요.",
    taurus: "오늘은 안정적인 재정 관리가 중요해요.",
    gemini: "오늘은 정보를 충분히 수집한 후 결정하세요.",
    cancer: "오늘은 감정적인 소비를 자제하는 것이 좋아요.",
    leo: "오늘은 투자보다는 절약에 집중하세요.",
    virgo: "오늘은 계획적인 지출이 필요해요.",
    libra: "오늘은 균형 잡힌 재정 관리가 중요해요.",
    scorpio: "오늘은 장기적인 관점에서 생각하세요.",
    sagittarius: "오늘은 새로운 기회를 주의 깊게 살펴보세요.",
    capricorn: "오늘은 보수적인 접근이 안전해요.",
    aquarius: "오늘은 독창적인 방법으로 수입을 늘릴 수 있어요.",
    pisces: "오늘은 직감보다는 사실에 기반해 결정하세요.",
  };

  const demoWork: Record<ZodiacSignEn, string> = {
    aries: "오늘은 주도적으로 일을 이끌어가세요.",
    taurus: "오늘은 꾸준함이 성과를 만들어요.",
    gemini: "오늘은 협업이 중요한 하루예요.",
    cancer: "오늘은 세심한 배려가 업무 효율을 높여요.",
    leo: "오늘은 리더십을 발휘할 수 있는 날이에요.",
    virgo: "오늘은 체계적인 접근이 필요해요.",
    libra: "오늘은 팀워크가 성공의 열쇠예요.",
    scorpio: "오늘은 집중력이 중요한 하루예요.",
    sagittarius: "오늘은 새로운 도전을 받아들이세요.",
    capricorn: "오늘은 목표를 향해 꾸준히 나아가세요.",
    aquarius: "오늘은 혁신적인 아이디어가 떠오르는 날이에요.",
    pisces: "오늘은 직감을 활용해 문제를 해결하세요.",
  };

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  return {
    date: today,
    sign: sign,
    horoscope: demoHoroscopes[sign],
    love: demoLove[sign],
    money: demoMoney[sign],
    work: demoWork[sign],
  };
}

/**
 * API 응답 텍스트를 한국어 톤으로 가공
 * (과장/점집 느낌 제거, 세련되고 차분한 톤으로 변환)
 */
function processHoroscopeText(text: string): string {
  // 실제 API 응답을 받으면 여기서 가공
  // 예: "You will have a great day!" → "오늘은 좋은 하루가 될 거예요."
  return text;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sign = searchParams.get("sign") as ZodiacSignEn | null;

    if (!sign) {
      return NextResponse.json(
        { error: "Sign parameter is required" },
        { status: 400 }
      );
    }

    // 유효한 별자리인지 확인
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

    if (!validSigns.includes(sign)) {
      return NextResponse.json(
        { error: "Invalid zodiac sign" },
        { status: 400 }
      );
    }

    // 오늘 날짜로 캐시 키 생성
    const today = new Date().toISOString().split("T")[0];
    const cacheKey = getCacheKey(sign, today);

    // 캐시 확인
    if (cache.has(cacheKey)) {
      return NextResponse.json(cache.get(cacheKey));
    }

    // API에서 운세 가져오기
    const horoscope = await fetchHoroscopeFromAPI(sign);

    // 캐시에 저장 (하루 동안 유지)
    cache.set(cacheKey, horoscope);

    // 캐시 정리 (하루가 지난 항목 제거)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    for (const [key] of cache.entries()) {
      if (key.includes(yesterdayStr)) {
        cache.delete(key);
      }
    }

    return NextResponse.json(horoscope);
  } catch (error) {
    console.error("Horoscope API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch horoscope" },
      { status: 500 }
    );
  }
}
