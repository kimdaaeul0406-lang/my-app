"use client";

import { useState, useEffect, useMemo } from "react";
import { calculateZodiac, parseDateAndCalculateZodiac, type ZodiacInfo } from "../utils/zodiac";
import ZodiacResult from "./ZodiacResult";
import PremiumGate from "./PremiumGate";

interface HoroscopeData {
  date: string;
  sign: string;
  horoscope: string;
  love?: string;
  money?: string;
  work?: string;
}

interface ZodiacSectionProps {
  isPremium?: boolean;
}

/**
 * 별자리 운세 섹션 컴포넌트
 * 생일 입력 → 별자리 계산 → 오늘의 운세 표시
 */
export default function ZodiacSection({ isPremium = false }: ZodiacSectionProps) {
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [zodiacInfo, setZodiacInfo] = useState<ZodiacInfo | null>(null);
  const [horoscopeData, setHoroscopeData] = useState<HoroscopeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 생일 입력 시 별자리 자동 계산
  useEffect(() => {
    if (birthMonth && birthDay) {
      try {
        const month = parseInt(birthMonth, 10);
        const day = parseInt(birthDay, 10);
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          const zodiac = calculateZodiac(month, day);
          setZodiacInfo(zodiac);
          setError(null);
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
        const response = await fetch(
          `/api/horoscope?sign=${zodiacInfo.nameEn}`
        );
        if (!response.ok) {
          throw new Error("운세를 가져오는데 실패했어요");
        }
        const data = await response.json();
        setHoroscopeData(data);
      } catch (err) {
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
    if (value === "" || (parseInt(value, 10) >= 1 && parseInt(value, 10) <= 12)) {
      setBirthMonth(value);
    }
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || (parseInt(value, 10) >= 1 && parseInt(value, 10) <= 31)) {
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
        <div className="smallHelp" style={{ marginTop: 12, textAlign: "center" }}>
          생일을 올바르게 입력해주세요 (예: 08/17)
        </div>
      )}
    </div>
  );
}
