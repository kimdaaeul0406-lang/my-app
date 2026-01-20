/**
 * 공유 유틸리티 함수
 * - 모바일: 네이티브 공유 API
 * - PC: 클립보드 복사
 */

export interface ShareData {
    title: string;
    text: string;
    url?: string;
}

/**
 * 결과 공유하기
 * @returns 공유 성공 여부와 방법 (native/clipboard)
 */
export async function shareResult(data: ShareData): Promise<{
    success: boolean;
    method: "native" | "clipboard" | "failed";
}> {
    const shareText = `${data.title}\n\n${data.text}\n\nLUMEN에서 확인하기`;

    // Web Share API 지원 체크 (주로 모바일)
    if (navigator.share) {
        try {
            await navigator.share({
                title: data.title,
                text: shareText,
                url: data.url || window.location.origin,
            });
            return { success: true, method: "native" };
        } catch (err) {
            // 사용자가 공유 취소한 경우
            if ((err as Error).name === "AbortError") {
                return { success: false, method: "failed" };
            }
        }
    }

    // 클립보드 복사 (PC 또는 Share API 실패 시)
    try {
        await navigator.clipboard.writeText(shareText);
        return { success: true, method: "clipboard" };
    } catch {
        // 클립보드도 실패
        return { success: false, method: "failed" };
    }
}

/**
 * 타로 결과용 공유 텍스트 생성
 */
export function formatTarotShare(
    cardName: string,
    cardNameKo: string,
    isReversed: boolean,
    message: string,
    advice: string,
    keywords: string[]
): ShareData {
    const direction = isReversed ? " (역방향)" : "";
    const keywordText = keywords.length > 0 ? `\n\n#${keywords.join(" #")}` : "";

    return {
        title: `오늘의 타로: ${cardNameKo}${direction}`,
        text: `${message}\n\n조언: ${advice}${keywordText}`,
    };
}

/**
 * 사주 결과용 공유 텍스트 생성
 */
export function formatSajuShare(
    birthDate: string,
    overview: string,
    advice: string,
    keywords: string[]
): ShareData {
    const keywordText = keywords.length > 0 ? `\n\n#${keywords.join(" #")}` : "";

    return {
        title: `나의 사주 운세 (${birthDate})`,
        text: `${overview}\n\n조언: ${advice}${keywordText}`,
    };
}

/**
 * 별자리 결과용 공유 텍스트 생성
 */
export function formatZodiacShare(
    zodiacName: string,
    message: string,
    advice: string,
    luckyNumber: number,
    luckyColor: string,
    keywords: string[]
): ShareData {
    const keywordText = keywords.length > 0 ? `\n\n#${keywords.join(" #")}` : "";
    const luckyText = `\n\n행운의 숫자: ${luckyNumber} | 행운의 색상: ${luckyColor}`;

    return {
        title: `${zodiacName} 오늘의 운세`,
        text: `${message}\n\n조언: ${advice}${luckyText}${keywordText}`,
    };
}
