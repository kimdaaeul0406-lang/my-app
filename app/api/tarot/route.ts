import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("[Tarot API] ❌ GEMINI_API_KEY가 설정되지 않았습니다");
      return NextResponse.json(
        { success: false, error: "API Key가 설정되지 않았습니다" },
        { status: 500 }
      );
    }

    console.log("[Tarot API] 요청 받음:", body);

    const { cardName, cardNameKo, isReversed } = body;

    if (!cardName || !cardNameKo) {
      return NextResponse.json(
        { success: false, error: "cardName과 cardNameKo는 필수입니다" },
        { status: 400 }
      );
    }

    // 타로 프롬프트 생성
    const prompt = `당신은 전문 타로 해석가입니다. 타로카드 "${cardNameKo}(${cardName})" ${
      isReversed ? "역방향" : "정방향"
    }에 대한 오늘의 운세를 한국어로 해석해주세요.

타로카드 정보:
- 카드명: ${cardNameKo} (${cardName})
- 방향: ${isReversed ? "역방향" : "정방향"}

다음 JSON 형식으로만 답변해주세요. 반드시 모든 필드를 채워주세요:
{
  "message": "전체 운세 2-3문장 (카드의 전체적인 의미와 오늘의 메시지)",
  "love": "연애운 1-2문장 (연인 관계나 새로운 인연에 대한 운세)",
  "career": "직장/학업운 1-2문장 (업무나 학업 관련 운세)",
  "money": "금전운 1-2문장 (재물과 경제 관련 운세)",
  "advice": "조언 1-2문장 (실용적인 조언)",
  "keywords": ["키워드1", "키워드2", "키워드3"]
}

중요:
- 반드시 JSON 형식으로만 답변하세요
- 모든 필드를 반드시 채워주세요 (love, money, career, advice 모두 필수)
- message 필드는 절대 비워두지 마세요
- 세련되고 신비로운 톤으로 작성해주세요
- 타로카드의 전통적인 의미를 바탕으로 하되, 현대적이고 실용적인 해석을 제공해주세요`;

    console.log("[Tarot API] Gemini 호출 시작");
    console.log("Using Key:", process.env.GEMINI_API_KEY?.slice(-4));

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const resultText = response.text();
    console.log("[Tarot API] 응답 받음 (전체):", resultText);
    console.log(
      "[Tarot API] 응답 받음 (처음 200자):",
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
          "[Tarot API] 파싱된 결과:",
          JSON.stringify(parsedResult, null, 2)
        );

        // 필수 필드 검증 (love, money, career, advice 모두 필수)
        if (!parsedResult.message || parsedResult.message.trim() === "") {
          console.error("[Tarot API] ❌ 필수 필드(message)가 없거나 비어있음");
          console.error("[Tarot API] 파싱된 전체 데이터:", parsedResult);
          return NextResponse.json(
            {
              success: false,
              error:
                "Gemini 응답에 필수 필드(message)가 없습니다. 응답을 확인해주세요.",
            },
            { status: 500 }
          );
        }

        // love, money, career, advice 필드 확인
        const requiredFields = [
          "message",
          "love",
          "career",
          "money",
          "advice",
          "keywords",
        ];
        const missingFields = requiredFields.filter(
          (field) => !parsedResult[field] && parsedResult[field] !== 0
        );

        if (missingFields.length > 0) {
          console.warn("[Tarot API] ⚠️ 누락된 필드:", missingFields);
          // 필수 필드만 확인하고 나머지는 기본값으로 채움
        }

        return NextResponse.json({ success: true, data: parsedResult });
      } catch (parseError) {
        console.error("[Tarot API] ❌ JSON 파싱 실패:", parseError);
        console.error("[Tarot API] 파싱 시도한 텍스트:", jsonMatch[0]);
        console.error("[Tarot API] 전체 응답 텍스트:", resultText);
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
    console.error("[Tarot API] ❌ JSON 형식이 아님");
    console.error("[Tarot API] 전체 응답:", resultText);
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
    console.error("[Tarot API] ❌ 에러:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
