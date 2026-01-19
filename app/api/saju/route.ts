import { NextRequest, NextResponse } from "next/server";
import { fetchSajuReading } from "@/app/utils/sajuApi";

/**
 * 사주 운세 API
 * POST /api/saju
 * Body: { birthDate: "YYYY-MM-DD", birthTime: "HH:MM" | null, gender: "male" | "female", calendar: "solar" | "lunar" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { birthDate, birthTime, gender, calendar } = body;

    console.log("[Saju API Route] Received request:", { birthDate, birthTime, gender, calendar });

    if (!birthDate || !gender || !calendar) {
      console.error("[Saju API Route] Missing required fields");
      return NextResponse.json(
        { error: "birthDate, gender, calendar are required" },
        { status: 400 }
      );
    }

    // Gemini API로 사주 해석 생성
    console.log("[Saju API Route] Calling fetchSajuReading...");
    const result = await fetchSajuReading(birthDate, birthTime || null, gender, calendar);
    console.log("[Saju API Route] Successfully got result");

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Saju API Route] Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Saju API Route] Error message:", errorMessage);
    
    return NextResponse.json(
      {
        error: errorMessage.includes("NEXT_PUBLIC_GEMINI_API_KEY") 
          ? "API 키가 설정되지 않았습니다. 환경 변수를 확인해주세요."
          : "별들이 잠시 쉬고 있어요. 조금 후 다시 시도해주세요 🌙",
      },
      { status: 500 }
    );
  }
}
