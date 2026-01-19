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

    console.log("[Horoscope API] 요청 받음:", body);

    const { sign, signName, date } = body;

    if (!sign || !signName) {
      return NextResponse.json(
        { success: false, error: "sign과 signName은 필수입니다" },
        { status: 400 }
      );
    }

    // 별자리 프롬프트 생성
    const currentDate = date || new Date().toISOString().split("T")[0];
    const prompt = `당신은 전문 점성술사입니다. ${signName} 별자리의 ${currentDate} 운세를 한국어로 작성해주세요.

별자리 정보:
- 별자리: ${signName} (${sign})
- 날짜: ${currentDate}

다음 JSON 형식으로만 답변해주세요. 반드시 모든 필드를 채워주세요:
{
  "message": "전체 운세 2-3문장 (${signName} 별자리의 오늘의 종합 운세)",
  "love": "연애운 1-2문장 (연인 관계나 새로운 인연에 대한 운세)",
  "career": "직장/학업운 1-2문장 (업무나 학업 관련 운세)",
  "money": "금전운 1-2문장 (재물과 경제 관련 운세)",
  "advice": "조언 1-2문장 (실용적인 조언)",
  "luckyNumber": 숫자 (1-100 사이의 행운의 숫자),
  "luckyColor": "색상 (한 단어로, 예: 파란색, 빨간색 등)",
  "keywords": ["키워드1", "키워드2", "키워드3"]
}

중요:
- 반드시 JSON 형식으로만 답변하세요
- 모든 필드를 반드시 채워주세요
- message 필드는 절대 비워두지 마세요
- luckyNumber는 반드시 숫자로만 작성하세요 (문자열이 아닌 숫자)
- 세련되고 신비로운 톤으로 작성해주세요
- 점성술의 전통적인 관점을 바탕으로 하되, 현대적이고 실용적인 해석을 제공해주세요`;

    console.log("[Horoscope API] Gemini 호출 시작");
    console.log("Using Key:", process.env.GEMINI_API_KEY?.slice(-4));

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const resultText = response.text();
    console.log("[Horoscope API] 응답 받음 (전체):", resultText);
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
