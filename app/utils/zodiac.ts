/**
 * 생일(MM/DD)을 기반으로 별자리를 계산하는 유틸 함수
 */

export type ZodiacSign =
  | "양자리"
  | "황소자리"
  | "쌍둥이자리"
  | "게자리"
  | "사자자리"
  | "처녀자리"
  | "천칭자리"
  | "전갈자리"
  | "사수자리"
  | "염소자리"
  | "물병자리"
  | "물고기자리";

export type ZodiacSignEn =
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

export interface ZodiacInfo {
  name: ZodiacSign;
  nameEn: ZodiacSignEn;
  icon: string;
  dateRange: string;
}

/**
 * 생일(MM/DD)을 기반으로 별자리를 계산
 * @param month 월 (1-12)
 * @param day 일 (1-31)
 * @returns 별자리 정보
 */
export function calculateZodiac(month: number, day: number): ZodiacInfo {
  // 유효성 검사
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error("Invalid date");
  }

  // 별자리 경계일 기준
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) {
    return {
      name: "양자리",
      nameEn: "aries",
      icon: "",
      dateRange: "3/21 - 4/19",
    };
  }
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) {
    return {
      name: "황소자리",
      nameEn: "taurus",
      icon: "",
      dateRange: "4/20 - 5/20",
    };
  }
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) {
    return {
      name: "쌍둥이자리",
      nameEn: "gemini",
      icon: "",
      dateRange: "5/21 - 6/20",
    };
  }
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) {
    return {
      name: "게자리",
      nameEn: "cancer",
      icon: "",
      dateRange: "6/21 - 7/22",
    };
  }
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) {
    return {
      name: "사자자리",
      nameEn: "leo",
      icon: "",
      dateRange: "7/23 - 8/22",
    };
  }
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) {
    return {
      name: "처녀자리",
      nameEn: "virgo",
      icon: "",
      dateRange: "8/23 - 9/22",
    };
  }
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) {
    return {
      name: "천칭자리",
      nameEn: "libra",
      icon: "",
      dateRange: "9/23 - 10/22",
    };
  }
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) {
    return {
      name: "전갈자리",
      nameEn: "scorpio",
      icon: "",
      dateRange: "10/23 - 11/21",
    };
  }
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) {
    return {
      name: "사수자리",
      nameEn: "sagittarius",
      icon: "",
      dateRange: "11/22 - 12/21",
    };
  }
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) {
    return {
      name: "염소자리",
      nameEn: "capricorn",
      icon: "",
      dateRange: "12/22 - 1/19",
    };
  }
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) {
    return {
      name: "물병자리",
      nameEn: "aquarius",
      icon: "",
      dateRange: "1/20 - 2/18",
    };
  }
  // 물고기자리 (2/19 - 3/20)
  return {
    name: "물고기자리",
    nameEn: "pisces",
    icon: "",
    dateRange: "2/19 - 3/20",
  };
}

/**
 * MM/DD 형식의 문자열을 파싱하여 별자리 계산
 * @param dateStr MM/DD 형식의 문자열
 * @returns 별자리 정보 또는 null
 */
export function parseDateAndCalculateZodiac(
  dateStr: string
): ZodiacInfo | null {
  try {
    const parts = dateStr.split("/");
    if (parts.length !== 2) return null;

    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);

    if (isNaN(month) || isNaN(day)) return null;

    return calculateZodiac(month, day);
  } catch {
    return null;
  }
}
