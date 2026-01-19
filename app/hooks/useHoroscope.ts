"use client";

import { useEffect, useState } from "react";

type ZodiacSignEn =
  | "aries"
  | "taurus"
  | "gemini"
  | "cancer"
  | "leo"
  | "virgo"
  | "libra"
  | "scorpio"
  | "sagittarius"
  | "capricorn"
  | "aquarius"
  | "pisces";

type HoroscopeType = "basic" | "today" | "tomorrow" | "yesterday";

interface HoroscopeResponse {
  sign: ZodiacSignEn;
  type: HoroscopeType;
  date: string | null;
  description: string;
  mood: string | null;
  color: string | null;
  lucky_number: string | number | null;
  lucky_time: string | null;
  source: "aztro" | "api-ninjas";
}

interface UseHoroscopeOptions {
  sign: ZodiacSignEn;
  type?: HoroscopeType;
  enabled?: boolean;
}

interface UseHoroscopeReturn {
  data: HoroscopeResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * 별자리 운세를 가져오는 React 훅
 * 
 * @example
 * ```tsx
 * function HoroscopeComponent() {
 *   const { data, loading, error, refetch } = useHoroscope({
 *     sign: "leo",
 *     type: "today",
 *   });
 * 
 *   if (loading) return <div>로딩 중...</div>;
 *   if (error) return <div>에러: {error}</div>;
 *   if (!data) return null;
 * 
 *   return (
 *     <div>
 *       <h2>{data.sign} 운세 ({data.type})</h2>
 *       <p>{data.description}</p>
 *       {data.mood && <p>기분: {data.mood}</p>}
 *       {data.color && <p>행운의 색: {data.color}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useHoroscope({
  sign,
  type = "basic",
  enabled = true,
}: UseHoroscopeOptions): UseHoroscopeReturn {
  const [data, setData] = useState<HoroscopeResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHoroscope = async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        sign,
        type,
      });

      const response = await fetch(`/api/horoscope?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || errorData.error || `HTTP ${response.status}`
        );
      }

      const result: HoroscopeResponse = await response.json();
      setData(result);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "운세를 가져오는데 실패했습니다.";
      setError(errorMessage);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHoroscope();
  }, [sign, type, enabled]);

  return {
    data,
    loading,
    error,
    refetch: fetchHoroscope,
  };
}
