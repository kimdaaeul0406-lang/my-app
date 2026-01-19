"use client";

import { type ZodiacInfo } from "../utils/zodiac";
import PremiumGate from "./PremiumGate";

interface HoroscopeData {
  date: string;
  sign: string;
  horoscope: string;
  love?: string;
  money?: string;
  work?: string;
}

interface ZodiacResultProps {
  zodiacInfo: ZodiacInfo;
  horoscopeData: HoroscopeData | null;
  loading: boolean;
  error: string | null;
  isPremium?: boolean;
}

/**
 * 별자리 운세 결과 컴포넌트
 * 무료: 오늘의 한 줄 운세
 * 프리미엄: 연애/금전/일 운세 전체
 */
export default function ZodiacResult({
  zodiacInfo,
  horoscopeData,
  loading,
  error,
  isPremium = false,
}: ZodiacResultProps) {
  if (loading) {
    return (
      <div className="card cardPad" style={{ marginTop: 16 }}>
        <div className="p" style={{ textAlign: "center" }}>
          오늘의 운세를 불러오고 있어요...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card cardPad" style={{ marginTop: 16 }}>
        <div
          className="p"
          style={{ textAlign: "center", color: "var(--muted)" }}
        >
          {error}
        </div>
      </div>
    );
  }

  if (!horoscopeData) {
    return null;
  }

  return (
    <div className="card cardPad lift" style={{ marginTop: 16 }}>
      {/* 별자리 정보 */}
      <div className="zodiacResultHeader">
        <div className="zodiacIcon">{zodiacInfo.icon}</div>
        <div>
          <div className="zodiacName">{zodiacInfo.name}</div>
          <div className="zodiacDateRange">{zodiacInfo.dateRange}</div>
        </div>
      </div>

      {/* 무료: 오늘의 한 줄 운세 */}
      <div style={{ marginTop: 16 }}>
        <div className="zodiacHoroscopeTitle">오늘의 한 줄 운세</div>
        <div className="p" style={{ marginTop: 8 }}>
          {horoscopeData.horoscope}
        </div>
      </div>

      {/* 프리미엄: 연애/금전/일 운세 */}
      {isPremium ? (
        <div style={{ marginTop: 20 }}>
          <div className="zodiacHoroscopeTitle">카테고리별 운세</div>
          <div style={{ marginTop: 12, display: "grid", gap: 16 }}>
            {horoscopeData.love && (
              <div>
                <div className="zodiacCategoryLabel">연애</div>
                <div className="p" style={{ marginTop: 6 }}>
                  {horoscopeData.love}
                </div>
              </div>
            )}
            {horoscopeData.money && (
              <div>
                <div className="zodiacCategoryLabel">금전</div>
                <div className="p" style={{ marginTop: 6 }}>
                  {horoscopeData.money}
                </div>
              </div>
            )}
            {horoscopeData.work && (
              <div>
                <div className="zodiacCategoryLabel">일</div>
                <div className="p" style={{ marginTop: 6 }}>
                  {horoscopeData.work}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <PremiumGate feature="카테고리별 운세">
          <div style={{ marginTop: 20 }}>
            <div className="zodiacHoroscopeTitle">카테고리별 운세</div>
            <div style={{ marginTop: 12, display: "grid", gap: 16 }}>
              {horoscopeData.love && (
                <div>
                  <div className="zodiacCategoryLabel">연애</div>
                  <div className="p" style={{ marginTop: 6, opacity: 0.5 }}>
                    {horoscopeData.love}
                  </div>
                </div>
              )}
              {horoscopeData.money && (
                <div>
                  <div className="zodiacCategoryLabel">금전</div>
                  <div className="p" style={{ marginTop: 6, opacity: 0.5 }}>
                    {horoscopeData.money}
                  </div>
                </div>
              )}
              {horoscopeData.work && (
                <div>
                  <div className="zodiacCategoryLabel">일</div>
                  <div className="p" style={{ marginTop: 6, opacity: 0.5 }}>
                    {horoscopeData.work}
                  </div>
                </div>
              )}
            </div>
          </div>
        </PremiumGate>
      )}

      <div className="smallHelp" style={{ marginTop: 12 }}>
        * 오늘의 결과는 하루 동안 유지됩니다
      </div>
    </div>
  );
}
