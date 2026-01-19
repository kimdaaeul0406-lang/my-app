import { NextRequest, NextResponse } from "next/server";
import { getRandomCard, fetchTarotReading } from "@/app/utils/tarotApi";

/**
 * 타로 카드 운세 API
 * GET /api/tarot
 */
export async function GET(request: NextRequest) {
  try {
    // 오늘의 카드 선택
    const card = getRandomCard();

    // Gemini API로 해석 생성
    const result = await fetchTarotReading(card.name, card.nameKo, card.isReversed);

    return NextResponse.json({
      card: {
        name: card.name,
        nameKo: card.nameKo,
        id: card.id,
        isReversed: card.isReversed,
      },
      ...result,
    });
  } catch (error) {
    console.error("[Tarot API] Error:", error);
    return NextResponse.json(
      {
        error: "별들이 잠시 쉬고 있어요. 조금 후 다시 시도해주세요 🌙",
      },
      { status: 500 }
    );
  }
}
