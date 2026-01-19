/**
 * 사주 운세 API (Gemini AI 기반)
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

/**
 * Gemini API로 사주 해석 생성
 */
export async function fetchSajuReading(
  birthDate: string, // YYYY-MM-DD
  birthTime: string | null, // HH:MM 또는 "시간 모름"
  gender: "male" | "female",
  calendar: "solar" | "lunar" // 양력/음력
): Promise<SajuResult> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  // API 키 확인 및 로깅
  console.log("[Saju API] API Key check:", apiKey ? "✅ Found" : "❌ Not found");
  if (!apiKey) {
    console.error("[Saju API] NEXT_PUBLIC_GEMINI_API_KEY is not set in environment variables");
    throw new Error("NEXT_PUBLIC_GEMINI_API_KEY is not set");
  }

  const calendarText = calendar === "solar" ? "양력" : "음력";
  const genderText = gender === "male" ? "남성" : "여성";
  const timeText = birthTime || "시간 모름";

  const prompt = `당신은 전문 사주명리학자입니다. ${calendarText} ${birthDate} ${timeText}에 태어난 ${genderText}의 사주를 해석해주세요.

다음 JSON 형식으로 응답해주세요 (한국어로만 작성):
{
  "overview": "전체 운세 3-4문장",
  "personality": "성격 특징 2-3문장",
  "love": "연애운 2문장",
  "career": "직장/학업운 2문장",
  "money": "금전운 2문장",
  "thisYear": "올해(2026년) 운세 2-3문장",
  "advice": "조언 2문장",
  "luckyElement": "행운의 오행(목/화/토/금/수 중 하나)",
  "luckyColor": "행운의 색상",
  "keywords": ["키워드1", "키워드2", "키워드3"]
}

톤은 세련되고 신비로운, 키치하지 않은 감성적 문체로 작성해주세요. 공포나 불안을 조장하지 않고, 실용적이고 긍정적인 조언을 해주세요.`;

  // Gemini API 엔드포인트 (최신 모델 사용)
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`;
  console.log("[Saju API] Calling Gemini API:", apiUrl);
  console.log("[Saju API] API Key present:", !!apiKey);
  console.log("[Saju API] API Key length:", apiKey?.length || 0);

  try {
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

    console.log("[Saju API] Response status:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Saju API] Error response:", errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    console.log("[Saju API] Response data structure:", {
      hasCandidates: !!data.candidates,
      candidatesLength: data.candidates?.length,
      hasContent: !!data.candidates?.[0]?.content,
      hasParts: !!data.candidates?.[0]?.content?.parts,
      partsLength: data.candidates?.[0]?.content?.parts?.length,
    });

    // 응답 구조 확인
    if (!data.candidates || !Array.isArray(data.candidates) || data.candidates.length === 0) {
      console.error("[Saju API] Invalid response structure - no candidates:", JSON.stringify(data, null, 2));
      throw new Error("Gemini API 응답에 candidates가 없습니다");
    }

    if (!data.candidates[0]?.content?.parts || !Array.isArray(data.candidates[0].content.parts) || data.candidates[0].content.parts.length === 0) {
      console.error("[Saju API] Invalid response structure - no parts:", JSON.stringify(data.candidates[0], null, 2));
      throw new Error("Gemini API 응답에 content.parts가 없습니다");
    }

    const text = data.candidates[0].content.parts[0].text;
    console.log("[Saju API] Received text length:", text?.length);
    console.log("[Saju API] Received text preview:", text?.substring(0, 200));

    if (!text) {
      throw new Error("Gemini API 응답에 텍스트가 없습니다");
    }

    // JSON 파싱 시도 (마크다운 코드 블록 제거)
    let cleanedText = text.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/```\n?/g, "");
    }

    console.log("[Saju API] Cleaned text preview:", cleanedText.substring(0, 200));

    try {
      const result: SajuResult = JSON.parse(cleanedText);
      console.log("[Saju API] Successfully parsed JSON");
      return result;
    } catch (parseError) {
      // JSON 파싱 실패 시 상세 로깅
      console.error("[Saju API] Failed to parse JSON:", parseError);
      console.error("[Saju API] Text that failed to parse:", cleanedText);
      throw new Error(`JSON 파싱 실패: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
  } catch (error) {
    console.error("[Saju API] Full error:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`알 수 없는 오류: ${String(error)}`);
  }
}
