import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("[Horoscope API] ❌ GEMINI_API_KEY가 설정되지 않았습니다");
      return NextResponse.json(
        { success: false, error: "API Key가 설정되지 않았습니다" },
        { status: 500 }
      );
    }

    // console.log("[Horoscope API] 요청 받음:", body);

    const { sign, signName, date } = body;

    if (!sign || !signName) {
      return NextResponse.json(
        { success: false, error: "sign과 signName은 필수입니다" },
        { status: 400 }
      );
    }

    // 별자리별 고유 특성 정의
    const zodiacTraits: Record<string, {
      element: string;
      quality: string;
      ruler: string;
      traits: string[];
      strengths: string;
      focus: string;
    }> = {
      aries: {
        element: "불(Fire)",
        quality: "활동궁(Cardinal)",
        ruler: "화성(Mars)",
        traits: ["용감함", "열정", "리더십", "도전정신"],
        strengths: "새로운 시작과 도전에 강함",
        focus: "행동력과 추진력"
      },
      taurus: {
        element: "흙(Earth)",
        quality: "고정궁(Fixed)",
        ruler: "금성(Venus)",
        traits: ["안정", "인내", "감각적", "신중함"],
        strengths: "물질적 안정과 감각적 즐거움 추구",
        focus: "안정성과 실용성"
      },
      gemini: {
        element: "공기(Air)",
        quality: "변통궁(Mutable)",
        ruler: "수성(Mercury)",
        traits: ["소통", "호기심", "다재다능", "적응력"],
        strengths: "정보 수집과 커뮤니케이션에 능함",
        focus: "지적 호기심과 소통"
      },
      cancer: {
        element: "물(Water)",
        quality: "활동궁(Cardinal)",
        ruler: "달(Moon)",
        traits: ["감성", "보호본능", "직관", "가정적"],
        strengths: "감정적 유대와 보살핌에 뛰어남",
        focus: "감정과 가족"
      },
      leo: {
        element: "불(Fire)",
        quality: "고정궁(Fixed)",
        ruler: "태양(Sun)",
        traits: ["자신감", "창의성", "관대함", "리더십"],
        strengths: "자기표현과 창의적 활동에 강함",
        focus: "자기표현과 인정"
      },
      virgo: {
        element: "흙(Earth)",
        quality: "변통궁(Mutable)",
        ruler: "수성(Mercury)",
        traits: ["분석력", "완벽주의", "실용적", "봉사정신"],
        strengths: "세부 사항 분석과 개선에 뛰어남",
        focus: "완벽함과 봉사"
      },
      libra: {
        element: "공기(Air)",
        quality: "활동궁(Cardinal)",
        ruler: "금성(Venus)",
        traits: ["조화", "균형", "외교적", "공정함"],
        strengths: "관계 조율과 아름다움 추구에 능함",
        focus: "균형과 파트너십"
      },
      scorpio: {
        element: "물(Water)",
        quality: "고정궁(Fixed)",
        ruler: "명왕성(Pluto)",
        traits: ["강렬함", "통찰력", "변화", "집중력"],
        strengths: "깊은 통찰과 변화 추진에 강함",
        focus: "변화와 재생"
      },
      sagittarius: {
        element: "불(Fire)",
        quality: "변통궁(Mutable)",
        ruler: "목성(Jupiter)",
        traits: ["낙천적", "모험심", "철학적", "자유로움"],
        strengths: "확장과 탐험, 높은 이상 추구",
        focus: "자유와 성장"
      },
      capricorn: {
        element: "흙(Earth)",
        quality: "활동궁(Cardinal)",
        ruler: "토성(Saturn)",
        traits: ["책임감", "야망", "규율", "현실적"],
        strengths: "목표 달성과 구조화에 뛰어남",
        focus: "성취와 책임"
      },
      aquarius: {
        element: "공기(Air)",
        quality: "고정궁(Fixed)",
        ruler: "천왕성(Uranus)",
        traits: ["독창성", "인도주의", "혁신", "독립적"],
        strengths: "혁신적 아이디어와 사회 변화 추구",
        focus: "혁신과 공동체"
      },
      pisces: {
        element: "물(Water)",
        quality: "변통궁(Mutable)",
        ruler: "해왕성(Neptune)",
        traits: ["직관", "상상력", "공감능력", "영적"],
        strengths: "상상력과 감정적 공감에 뛰어남",
        focus: "상상과 영성"
      }
    };

    // 현재 별자리 특성 가져오기
    const currentZodiac = zodiacTraits[sign.toLowerCase()] || zodiacTraits.aries;

    // 별자리 프롬프트 생성
    const currentDate = date || new Date().toISOString().split("T")[0];

    // 날짜 기반 시드 생성
    const dateParts = currentDate.split("-");
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]);
    const day = parseInt(dateParts[2]);
    const weekday = new Date(currentDate).getDay();
    const weekdayNames = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

    // 별자리별 고유 시드 (별자리마다 다른 숫자 추가)
    const zodiacIndex = Object.keys(zodiacTraits).indexOf(sign.toLowerCase());
    const uniqueSeed = (year * 10000 + month * 100 + day + zodiacIndex * 30) % 100;

    const prompt = `당신은 전문 점성술사입니다. ${signName} 별자리의 ${currentDate} (${weekdayNames[weekday]}) 운세를 한국어로 작성해주세요.

【${signName} 별자리 고유 특성】 - 이 특성을 반드시 반영하세요!
- 원소: ${currentZodiac.element}
- 성질: ${currentZodiac.quality}  
- 수호 행성: ${currentZodiac.ruler}
- 핵심 성격: ${currentZodiac.traits.join(", ")}
- 강점: ${currentZodiac.strengths}
- 오늘의 초점: ${currentZodiac.focus}

【오늘의 에너지 시드: ${uniqueSeed}】

⚠️ 매우 중요:
1. 위의 "${signName} 고유 특성"을 반드시 운세 내용에 반영하세요.
2. ${signName}의 원소(${currentZodiac.element})와 수호행성(${currentZodiac.ruler})에 맞는 조언을 하세요.
3. 다른 별자리와 절대 비슷한 내용이 나오면 안 됩니다.
4. "${currentZodiac.focus}"를 오늘 운세의 핵심 주제로 삼으세요.

다음 JSON 형식으로만 답변해주세요:
{
  "message": "${signName}만의 고유한 전체 운세 2-3문장 (${currentZodiac.element} 원소와 ${currentZodiac.ruler}의 영향 반영)",
  "love": "${signName}의 연애 성향을 반영한 연애운 1-2문장",
  "career": "${signName}의 직업적 강점을 반영한 직장/학업운 1-2문장",
  "money": "${signName}의 재물관을 반영한 금전운 1-2문장",
  "advice": "${signName}에게 맞는 오늘의 조언 1-2문장 (${currentZodiac.focus} 관련)",
  "luckyNumber": ${(uniqueSeed % 45) + 1}에서 ${(uniqueSeed % 45) + 10} 사이 숫자,
  "luckyColor": "${currentZodiac.element.includes("불") ? "빨간색/주황색 계열" : currentZodiac.element.includes("흙") ? "갈색/녹색 계열" : currentZodiac.element.includes("공기") ? "노란색/하늘색 계열" : "파란색/보라색 계열"} 중 하나",
  "keywords": ["${currentZodiac.traits[0]}", "키워드2", "키워드3"]
}

중요:
- 반드시 JSON 형식으로만 답변하세요
- ${signName}만의 독특한 운세를 작성하세요
- message에 "${signName}"을 직접 언급하지 말고, 내용으로 특성을 보여주세요
- luckyNumber는 반드시 숫자로만 작성하세요
- 세련되고 신비로운 톤으로 작성해주세요`;

    // console.log("[Horoscope API] Gemini 호출 시작");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemma-3-27b-it",
      generationConfig: {
        temperature: 1.0, // 더 다양한 결과를 위해 temperature 증가
        topP: 0.95,
        topK: 40,
      }
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const resultText = response.text();
    // console.log("[Horoscope API] 응답 받음");
    console.log(
      "[Horoscope API] 응답 받음 (처음 200자):",
      resultText.substring(0, 200)
    );

    // JSON 파싱 시도 (여러 패턴 시도)
    let jsonMatch = resultText.match(/\{[\s\S]*\}/);

    // 코드 블록 안에 있는 경우도 처리
    if (!jsonMatch) {
      jsonMatch = resultText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        jsonMatch = [jsonMatch[1], jsonMatch[1]];
      }
    }

    // 코드 블록 없이 JSON만 있는 경우
    if (!jsonMatch) {
      jsonMatch = resultText.match(/\{[\s\S]*?\}/);
    }

    if (jsonMatch && jsonMatch[0]) {
      try {
        const parsedResult = JSON.parse(jsonMatch[0]);
        console.log(
          "[Horoscope API] 파싱된 결과:",
          JSON.stringify(parsedResult, null, 2)
        );

        // 필수 필드 검증
        if (!parsedResult.message || parsedResult.message.trim() === "") {
          console.error(
            "[Horoscope API] ❌ 필수 필드(message)가 없거나 비어있음"
          );
          console.error("[Horoscope API] 파싱된 전체 데이터:", parsedResult);
          return NextResponse.json(
            {
              success: false,
              error:
                "Gemini 응답에 필수 필드(message)가 없습니다. 응답을 확인해주세요.",
            },
            { status: 500 }
          );
        }

        // luckyNumber가 숫자인지 확인
        if (
          parsedResult.luckyNumber !== undefined &&
          typeof parsedResult.luckyNumber !== "number"
        ) {
          console.warn(
            "[Horoscope API] ⚠️ luckyNumber가 숫자가 아님, 변환 시도:",
            parsedResult.luckyNumber
          );
          const numValue = Number(parsedResult.luckyNumber);
          if (!isNaN(numValue)) {
            parsedResult.luckyNumber = numValue;
          } else {
            parsedResult.luckyNumber = 7; // 기본값
          }
        }

        // 모든 필드가 있는지 확인
        const requiredFields = [
          "message",
          "love",
          "career",
          "money",
          "advice",
          "luckyNumber",
          "luckyColor",
          "keywords",
        ];
        const missingFields = requiredFields.filter(
          (field) => !parsedResult[field] && parsedResult[field] !== 0
        );

        if (missingFields.length > 0) {
          console.warn("[Horoscope API] ⚠️ 누락된 필드:", missingFields);
          // 필수 필드만 확인하고 나머지는 기본값으로 채움
        }

        return NextResponse.json({ success: true, data: parsedResult });
      } catch (parseError) {
        console.error("[Horoscope API] ❌ JSON 파싱 실패:", parseError);
        console.error("[Horoscope API] 파싱 시도한 텍스트:", jsonMatch[0]);
        console.error("[Horoscope API] 전체 응답 텍스트:", resultText);
        return NextResponse.json(
          {
            success: false,
            error:
              "JSON 파싱 실패: " +
              (parseError instanceof Error
                ? parseError.message
                : String(parseError)),
          },
          { status: 500 }
        );
      }
    }

    // JSON 형식이 아닌 경우
    console.error("[Horoscope API] ❌ JSON 형식이 아님");
    console.error("[Horoscope API] 전체 응답:", resultText);
    return NextResponse.json(
      {
        success: false,
        error:
          "Gemini 응답이 JSON 형식이 아닙니다. 응답: " +
          resultText.substring(0, 100),
      },
      { status: 500 }
    );
  } catch (error) {
    console.error("[Horoscope API] ❌ 에러:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
