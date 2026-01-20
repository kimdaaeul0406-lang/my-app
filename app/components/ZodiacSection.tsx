"use client";

import { useState, useEffect, useMemo } from "react";
import {
  calculateZodiac,
  parseDateAndCalculateZodiac,
  type ZodiacInfo,
} from "../utils/zodiac";
import ZodiacResult from "./ZodiacResult";
import PremiumGate from "./PremiumGate";

interface HoroscopeData {
  date: string | null;
  sign: string;
  horoscope: string;
  description?: string;
  mood?: string | null;
  color?: string | null;
  lucky_number?: string | number | null;
  lucky_time?: string | null;
  source?: "aztro" | "api-ninjas";
  type?: "basic" | "today" | "tomorrow" | "yesterday";
}

interface ZodiacSectionProps {
  isPremium?: boolean;
}

/**
 * 별자리 운세 섹션 컴포넌트
 * 생일 입력 → 별자리 계산 → 오늘의 운세 표시
 */
export default function ZodiacSection({
  isPremium = false,
}: ZodiacSectionProps) {
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [zodiacInfo, setZodiacInfo] = useState<ZodiacInfo | null>(null);
  const [horoscopeData, setHoroscopeData] = useState<HoroscopeData | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 생일 입력 시 별자리 자동 계산
  useEffect(() => {
    // 생일이 변경되면 이전 운세 데이터 초기화
    setHoroscopeData(null);
    setError(null);
    setLoading(false);

    if (birthMonth && birthDay) {
      try {
        const month = parseInt(birthMonth, 10);
        const day = parseInt(birthDay, 10);
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          const zodiac = calculateZodiac(month, day);
          setZodiacInfo(zodiac);
        } else {
          setZodiacInfo(null);
        }
      } catch {
        setZodiacInfo(null);
      }
    } else {
      setZodiacInfo(null);
    }
  }, [birthMonth, birthDay]);

  // 별자리가 계산되면 운세 가져오기
  useEffect(() => {
    if (!zodiacInfo) {
      setHoroscopeData(null);
      return;
    }

    const fetchHoroscope = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log(`🌐 [Client] Fetching horoscope from: /api/horoscope`);

        const response = await fetch("/api/horoscope", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sign: zodiacInfo.nameEn,
            signName: zodiacInfo.name,
            date: new Date().toISOString().split('T')[0],
          }),
        });

        console.log(`📥 [Client] Response status: ${response.status}`);

        if (!response.ok) {
          let errorData: any = {};
          try {
            const text = await response.text();
            console.log(`❌ [Client] Error response text:`, text);
            errorData = text
              ? JSON.parse(text)
              : { error: `HTTP ${response.status}` };
          } catch (parseError) {
            console.error(
              `❌ [Client] Failed to parse error response:`,
              parseError
            );
            errorData = {
              error: `HTTP ${response.status}`,
              message: "서버에서 에러 응답을 받았습니다.",
            };
          }

          console.error(`❌ [Client] API error:`, errorData);
          console.error(`❌ [Client] Response status: ${response.status}`);

          const errorMessage =
            errorData.message ||
            errorData.error ||
            `HTTP ${response.status}: 운세를 가져오는데 실패했어요`;
          throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log(`✅ [Client] Received data:`, result);

        if (!result.success) {
          console.warn(`⚠️ [Client] API returned error:`, result.error);
          setHoroscopeData(null);
          setError(result.error || "운세 데이터를 가져올 수 없어요");
          return;
        }

        // API 응답 형식에 맞게 변환
        const data = result.data;
        setHoroscopeData({
          date: data.date || null,
          sign: data.sign || zodiacInfo?.nameEn || "",
          horoscope: data.message || data.horoscope || "",
          description: data.message || data.description || "",
          mood: data.mood || null,
          color: data.luckyColor || data.color || null,
          lucky_number: data.luckyNumber || data.lucky_number || null,
          lucky_time: data.lucky_time || null,
          source: data.source || "aztro",
          type: data.type || "today",
        });
      } catch (err) {
        console.error(`❌ [Client] Error:`, err);
        setError(err instanceof Error ? err.message : "오류가 발생했어요");
        setHoroscopeData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchHoroscope();
  }, [zodiacInfo]);

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (
      value === "" ||
      (parseInt(value, 10) >= 1 && parseInt(value, 10) <= 12)
    ) {
      setBirthMonth(value);
    }
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (
      value === "" ||
      (parseInt(value, 10) >= 1 && parseInt(value, 10) <= 31)
    ) {
      setBirthDay(value);
    }
  };

  return (
    <div className="zodiacSection">
      <div className="zodiacSectionHeader">
        <div className="zodiacSectionKicker">오늘의 별자리 흐름</div>
        <div className="zodiacSectionDesc">
          타로는 당신의 선택을 말하고,
          <br />
          별자리는 오늘의 흐름을 알려줍니다.
        </div>
      </div>

      <div className="zodiacInputSection">
        <div className="zodiacInputRow">
          <div className="zodiacInputField">
            <label className="zodiacInputLabel">생일</label>
            <div className="zodiacInputGroup">
              <input
                type="text"
                className="input"
                placeholder="월"
                value={birthMonth}
                onChange={handleMonthChange}
                maxLength={2}
                style={{ width: "60px", textAlign: "center" }}
              />
              <span style={{ margin: "0 8px", color: "var(--muted)" }}>/</span>
              <input
                type="text"
                className="input"
                placeholder="일"
                value={birthDay}
                onChange={handleDayChange}
                maxLength={2}
                style={{ width: "60px", textAlign: "center" }}
              />
            </div>
          </div>
        </div>
      </div>

      {zodiacInfo && (
        <ZodiacResult
          zodiacInfo={zodiacInfo}
          horoscopeData={horoscopeData}
          loading={loading}
          error={error}
          isPremium={isPremium}
        />
      )}

      {!zodiacInfo && birthMonth && birthDay && (
        <div
          className="smallHelp"
          style={{ marginTop: 12, textAlign: "center" }}
        >
          생일을 올바르게 입력해주세요 (예: 08/17)
        </div>
      )}
    </div>
  );
}
