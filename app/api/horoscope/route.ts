import { NextRequest, NextResponse } from "next/server";
import { fetchHoroscope, getZodiacInfo } from "@/app/utils/horoscopeApi";

/**
 * 별자리 운세 API
 * GET /api/horoscope?sign=aries
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const signParam = searchParams.get("sign");

    if (!signParam) {
      return NextResponse.json(
        { error: "Sign parameter is required" },
        { status: 400 }
      );
    }

    const zodiacInfo = getZodiacInfo(signParam);
    if (!zodiacInfo) {
      return NextResponse.json(
        { error: "Invalid zodiac sign" },
        { status: 400 }
      );
    }

    // Gemini API로 운세 생성
    const result = await fetchHoroscope(signParam, zodiacInfo.name);

    return NextResponse.json({
      sign: signParam,
      signName: zodiacInfo.name,
      ...result,
    });
  } catch (error) {
    console.error("[Horoscope API] Error:", error);
    return NextResponse.json(
      {
        error: "별들이 잠시 쉬고 있어요. 조금 후 다시 시도해주세요 🌙",
      },
      { status: 500 }
    );
  }
}
