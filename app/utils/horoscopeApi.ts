/**
 * 별자리 운세 API (Gemini AI 기반)
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

/**
 * Gemini API로 별자리 운세 생성
 */
export async function fetchHoroscope(signEn: string, signName: string): Promise<HoroscopeResult> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_GEMINI_API_KEY is not set");
  }

  const prompt = `당신은 전문 점성술사입니다. ${signName}의 오늘의 운세를 해석해주세요.

다음 JSON 형식으로 응답해주세요 (한국어로만 작성):
{
  "message": "전체 운세 2-3문장",
  "love": "연애운 1-2문장",
  "career": "직장/학업운 1-2문장",
  "money": "금전운 1-2문장",
  "advice": "조언 1-2문장",
  "luckyNumber": 숫자,
  "luckyColor": "색상",
  "keywords": ["키워드1", "키워드2", "키워드3"]
}

톤은 세련되고 신비로운, 키치하지 않은 감성적 문체로 작성해주세요. 공포나 불안을 조장하지 않고, 실용적이고 긍정적인 조언을 해주세요.`;

  // Gemini API 엔드포인트 (최신 모델 사용)
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`;
  console.log("[Horoscope API] Calling Gemini API:", apiUrl);
  console.log("[Horoscope API] API Key present:", !!apiKey);

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey, // 헤더로 API 키 전달 (권장 방식)
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  console.log("[Horoscope API] Response status:", response.status, response.statusText);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Horoscope API] Error response:", errorText);
    throw new Error(`Gemini API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  console.log("[Horoscope API] Response data structure:", {
    hasCandidates: !!data.candidates,
    candidatesLength: data.candidates?.length,
  });

  if (!data.candidates || !Array.isArray(data.candidates) || data.candidates.length === 0) {
    console.error("[Horoscope API] Invalid response structure:", JSON.stringify(data, null, 2));
    throw new Error("Gemini API 응답에 candidates가 없습니다");
  }

  if (!data.candidates[0]?.content?.parts || !Array.isArray(data.candidates[0].content.parts) || data.candidates[0].content.parts.length === 0) {
    console.error("[Horoscope API] Invalid response structure - no parts:", JSON.stringify(data.candidates[0], null, 2));
    throw new Error("Gemini API 응답에 content.parts가 없습니다");
  }

  const text = data.candidates[0].content.parts[0].text;
  console.log("[Horoscope API] Received text length:", text?.length);

  // JSON 파싱 시도 (마크다운 코드 블록 제거)
  let cleanedText = text.trim();
  if (cleanedText.startsWith("```json")) {
    cleanedText = cleanedText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  } else if (cleanedText.startsWith("```")) {
    cleanedText = cleanedText.replace(/```\n?/g, "");
  }

  try {
    const result: HoroscopeResult = JSON.parse(cleanedText);
    return result;
  } catch (parseError) {
    // JSON 파싱 실패 시 재시도
    console.error("[Horoscope API] Failed to parse JSON, retrying...", parseError);
    throw new Error("JSON 파싱 실패");
  }
}
