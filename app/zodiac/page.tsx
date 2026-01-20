"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { type ZodiacInfo } from "../utils/zodiac";
import {
  getCachedData,
  setCachedData,
  getHoroscopeCacheKey,
} from "../utils/cache";
import { shareResult, formatZodiacShare } from "../utils/share";

const HISTORY_KEY = "lumen_history_v2";

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// 별자리 아이콘 SVG 컴포넌트
function ZodiacIcon({ nameEn }: { nameEn: string }) {
  const iconMap: Record<string, JSX.Element> = {
    aries: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L8 6H16L12 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4 12H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M8 18L12 22L16 18" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    taurus: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M12 4V12M12 12V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M4 12H12M12 12H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    gemini: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 4C8 5.1 7.1 6 6 6C4.9 6 4 5.1 4 4C4 2.9 4.9 2 6 2C7.1 2 8 2.9 8 4Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M20 4C20 5.1 19.1 6 18 6C16.9 6 16 5.1 16 4C16 2.9 16.9 2 18 2C19.1 2 20 2.9 20 4Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M8 20C8 21.1 7.1 22 6 22C4.9 22 4 21.1 4 20C4 18.9 4.9 18 6 18C7.1 18 8 18.9 8 20Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M20 20C20 21.1 19.1 22 18 22C16.9 22 16 21.1 16 20C16 18.9 16.9 18 18 18C19.1 18 20 18.9 20 20Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M6 6V18M18 6V18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    cancer: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 8C6 10.2 7.8 12 10 12C12.2 12 14 10.2 14 8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <path d="M10 16C10 13.8 11.8 12 14 12C16.2 12 18 13.8 18 16" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <path d="M6 6L4 4M18 6L20 4M6 18L4 20M18 18L20 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    leo: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="10" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M8 16L6 22M16 16L18 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M12 4V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    virgo: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M8 6L12 2L16 6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="14" r="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M10 18L12 20L14 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    libra: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 8H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M6 16H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M12 8V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="6" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <circle cx="18" cy="16" r="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      </svg>
    ),
    scorpio: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M12 8C12 10.2 10.2 12 8 12C5.8 12 4 10.2 4 8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <path d="M12 8C12 10.2 13.8 12 16 12C18.2 12 20 10.2 20 8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <path d="M12 12V18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M8 18L12 22L16 18" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    sagittarius: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L8 6L12 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 10L16 6L20 2" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4 12H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M12 12V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    capricorn: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 8C6 10.2 7.8 12 10 12" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <path d="M18 16C18 13.8 16.2 12 14 12" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <path d="M10 12L14 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M6 8L4 6M18 16L20 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M6 8V4M18 16V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    aquarius: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 8C6 6.9 6.9 6 8 6C9.1 6 10 6.9 10 8C10 9.1 9.1 10 8 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <path d="M14 8C14 6.9 14.9 6 16 6C17.1 6 18 6.9 18 8C18 9.1 17.1 10 16 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <path d="M6 16C6 14.9 6.9 14 8 14C9.1 14 10 14.9 10 16C10 17.1 9.1 18 8 18" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <path d="M14 16C14 14.9 14.9 14 16 14C17.1 14 18 14.9 18 16C18 17.1 17.1 18 16 18" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <path d="M8 10V14M16 10V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    pisces: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 8C6 10.2 7.8 12 10 12" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <path d="M18 8C18 10.2 16.2 12 14 12" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <path d="M6 16C6 13.8 7.8 12 10 12" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <path d="M18 16C18 13.8 16.2 12 14 12" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <path d="M10 12H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  };

  return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", color: "currentColor" }}>
      {iconMap[nameEn] || null}
    </span>
  );
}

type HistoryItem = {
  id: string;
  type: "SAJU" | "TAROT" | "ZODIAC";
  title: string;
  text: string;
  tags: string[];
  createdAt: number;
  isPremium?: boolean;
};

interface HoroscopeData {
  message: string;
  love: string;
  career: string;
  money: string;
  advice: string;
  luckyNumber: number;
  luckyColor: string;
  keywords: string[];
}

// 모든 별자리 목록
const allZodiacs: ZodiacInfo[] = [
  { name: "양자리", nameEn: "aries", icon: "aries", dateRange: "3/21 - 4/19" },
  { name: "황소자리", nameEn: "taurus", icon: "taurus", dateRange: "4/20 - 5/20" },
  { name: "쌍둥이자리", nameEn: "gemini", icon: "gemini", dateRange: "5/21 - 6/20" },
  { name: "게자리", nameEn: "cancer", icon: "cancer", dateRange: "6/21 - 7/22" },
  { name: "사자자리", nameEn: "leo", icon: "leo", dateRange: "7/23 - 8/22" },
  { name: "처녀자리", nameEn: "virgo", icon: "virgo", dateRange: "8/23 - 9/22" },
  { name: "천칭자리", nameEn: "libra", icon: "libra", dateRange: "9/23 - 10/22" },
  { name: "전갈자리", nameEn: "scorpio", icon: "scorpio", dateRange: "10/23 - 11/21" },
  {
    name: "사수자리",
    nameEn: "sagittarius",
    icon: "sagittarius",
    dateRange: "11/22 - 12/21",
  },
  {
    name: "염소자리",
    nameEn: "capricorn",
    icon: "capricorn",
    dateRange: "12/22 - 1/19",
  },
  { name: "물병자리", nameEn: "aquarius", icon: "aquarius", dateRange: "1/20 - 2/18" },
  { name: "물고기자리", nameEn: "pisces", icon: "pisces", dateRange: "2/19 - 3/20" },
];

export default function ZodiacPage() {
  const router = useRouter();
  const [selectedZodiac, setSelectedZodiac] = useState<ZodiacInfo | null>(null);
  const [zodiacInfo, setZodiacInfo] = useState<ZodiacInfo | null>(null);
  const [horoscopeData, setHoroscopeData] = useState<HoroscopeData | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // 토스트 메시지
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // 별자리 선택 시 zodiacInfo 설정 및 모달 열기
  useEffect(() => {
    if (selectedZodiac) {
      setZodiacInfo(selectedZodiac);
      setHoroscopeData(null);
      setError(null);
      setShowModal(true);
    } else {
      setZodiacInfo(null);
    }
  }, [selectedZodiac]);

  // 운세 가져오기 함수 (버튼 클릭 시 호출)
  const fetchHoroscope = async () => {
    if (!zodiacInfo || loading) return; // 이미 로딩 중이면 중복 호출 방지

    setLoading(true);
    setError(null);

    // 캐시 확인
    const cacheKey = getHoroscopeCacheKey(zodiacInfo.nameEn);
    const cached = getCachedData<HoroscopeData>(cacheKey);
    if (cached) {
      setHoroscopeData(cached);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/horoscope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sign: zodiacInfo.nameEn,
          signName: zodiacInfo.name,
          date: new Date().toISOString().split("T")[0],
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ success: false, error: "API 오류" }));
        throw new Error(
          errorData.error ||
          "별들이 잠시 쉬고 있어요. 조금 후 다시 시도해주세요 🌙"
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "API 호출 실패");
      }

      // 응답 데이터 정리
      const data = result.data;
      const horoscopeData: HoroscopeData = {
        message: data.message || "",
        love: data.love || "",
        career: data.career || "",
        money: data.money || "",
        advice: data.advice || "",
        luckyNumber: data.luckyNumber || 0,
        luckyColor: data.luckyColor || "",
        keywords: data.keywords || [],
      };

      // 캐시 저장
      setCachedData(cacheKey, horoscopeData);
      setHoroscopeData(horoscopeData);
    } catch (err) {
      console.error(`❌ [Client] Error:`, err);
      setError(
        err instanceof Error
          ? err.message
          : "별들이 잠시 쉬고 있어요. 조금 후 다시 시도해주세요 🌙"
      );
      setHoroscopeData(null);
    } finally {
      setLoading(false);
    }
  };

  const saveZodiac = () => {
    if (!zodiacInfo || !horoscopeData) return;

    const item: HistoryItem = {
      id: uid(),
      type: "ZODIAC",
      title: `[별자리] ${zodiacInfo.name} - 오늘의 흐름`,
      text: horoscopeData.message || "",
      tags: [
        zodiacInfo.name,
        "별자리",
        "오늘의 흐름",
        ...(horoscopeData.keywords || []),
      ],
      createdAt: Date.now(),
    };

    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const existing = raw ? (JSON.parse(raw) as HistoryItem[]) : [];
      const next = [item, ...existing].slice(0, 12);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }

    router.push("/?saved=zodiac");
  };

  return (
    <main className="mainWrap">
      <div className="bgFX" />
      <div className="content">
        {/* 밤하늘 헤더 */}
        <section className="subPageHeader reveal on">
          <div className="subPageStars">
            {[
              { left: 18, top: 22, delay: 0.1 },
              { left: 32, top: 38, delay: 0.6 },
              { left: 45, top: 12, delay: 1.1 },
              { left: 58, top: 48, delay: 1.6 },
              { left: 72, top: 28, delay: 0.4 },
              { left: 85, top: 42, delay: 0.9 },
              { left: 22, top: 58, delay: 1.3 },
              { left: 38, top: 62, delay: 0.7 },
              { left: 52, top: 32, delay: 1.9 },
              { left: 78, top: 52, delay: 0.3 },
              { left: 90, top: 15, delay: 1.5 },
              { left: 10, top: 45, delay: 1.0 },
            ].map((star, i) => (
              <div
                key={i}
                className="star"
                style={{
                  left: `${star.left}%`,
                  top: `${star.top}%`,
                  animationDelay: `${star.delay}s`,
                }}
              />
            ))}
          </div>
          <div className="container center">
            <div style={{ marginBottom: 16 }}>
              <Link
                href="/"
                className="btnBack"
              >
                ← 홈으로 돌아가기
              </Link>
            </div>

            <h1 className="h2 stagger d1" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <ZodiacIcon nameEn="libra" />
              별자리 운세
            </h1>
            <p className="p stagger d2">
              별자리를 선택하면 오늘의 별자리 흐름을 알려드려요.
            </p>
          </div>
        </section>

        {/* 콘텐츠 섹션 */}
        <section className="section reveal on">
          <div className="container center">

            <div className="stagger d3" style={{ marginTop: 20 }}>
              <div className="zodiacSection">
                <div className="zodiacSectionHeader">
                  <div className="zodiacSectionKicker">오늘의 별자리 흐름</div>
                  <div className="zodiacSectionDesc">
                    타로는 당신의 선택을 말하고,
                    <br />
                    별자리는 오늘의 흐름을 알려줍니다.
                  </div>
                </div>

                {/* 별자리 선택 */}
                <div className="zodiacInputSection" style={{ marginTop: 20 }}>
                  <div className="zodiacInputRow">
                    <div className="zodiacInputField" style={{ width: "100%" }}>
                      <label
                        className="zodiacInputLabel"
                        style={{ textAlign: "center", marginBottom: 16 }}
                      >
                        내 별자리 선택하기
                      </label>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3, 1fr)",
                          gap: 12,
                          maxWidth: "500px",
                          margin: "0 auto",
                        }}
                      >
                        {allZodiacs.map((zodiac) => {
                          const isSelected =
                            selectedZodiac?.nameEn === zodiac.nameEn;
                          return (
                            <button
                              key={zodiac.nameEn}
                              onClick={() => setSelectedZodiac(zodiac)}
                              style={{
                                padding: "20px 12px",
                                fontSize: 14,
                                backgroundColor: isSelected
                                  ? "var(--navy)"
                                  : "var(--cream)",
                                color: isSelected
                                  ? "var(--cream)"
                                  : "var(--navy-dark)",
                                border: `2px solid ${isSelected
                                  ? "var(--navy)"
                                  : "rgba(43, 38, 42, 0.1)"
                                  }`,
                                borderRadius: 12,
                                fontWeight: isSelected ? 700 : 500,
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 4,
                                transform: isSelected
                                  ? "scale(1.05)"
                                  : "scale(1)",
                                boxShadow: isSelected
                                  ? "0 4px 12px rgba(43, 38, 42, 0.15)"
                                  : "0 2px 4px rgba(43, 38, 42, 0.05)",
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.backgroundColor =
                                    "rgba(43, 38, 42, 0.05)";
                                  e.currentTarget.style.transform =
                                    "scale(1.02)";
                                  e.currentTarget.style.borderColor =
                                    "rgba(43, 38, 42, 0.2)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.backgroundColor =
                                    "var(--cream)";
                                  e.currentTarget.style.transform = "scale(1)";
                                  e.currentTarget.style.borderColor =
                                    "rgba(43, 38, 42, 0.1)";
                                }
                              }}
                            >
                              <span style={{ fontSize: 20, marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <ZodiacIcon nameEn={zodiac.nameEn} />
                              </span>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>
                                {zodiac.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* 모달 팝업 */}
      {showModal && (
        <div className="modalOverlay" onClick={() => setShowModal(false)}>
          <div className="modalSheet" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div className="modalTitle">
                {zodiacInfo ? `${zodiacInfo.name} 운세` : "별자리 운세"}
              </div>
              <button
                className="closeBtn"
                onClick={() => setShowModal(false)}
                aria-label="닫기"
              >
                ×
              </button>
            </div>
            <div className="modalBody">
              {!horoscopeData && !loading && !error && (
                <div style={{ padding: "20px 0", textAlign: "center" }}>
                  <div
                    className="p"
                    style={{ marginBottom: 20, color: "var(--muted)" }}
                  >
                    {zodiacInfo?.name}의 오늘의 운세를 확인해보세요.
                  </div>
                  <button
                    className="btn btnPrimary"
                    onClick={fetchHoroscope}
                    disabled={loading}
                    style={{
                      opacity: loading ? 0.6 : 1,
                      cursor: loading ? "not-allowed" : "pointer",
                      maxWidth: "280px",
                      margin: "0 auto",
                    }}
                  >
                    오늘의 운세 보기
                  </button>
                </div>
              )}

              {error && (
                <div style={{ padding: "20px 0", textAlign: "center" }}>
                  <div
                    className="p"
                    style={{ color: "var(--muted)", marginBottom: 16 }}
                  >
                    {error}
                  </div>
                  <button
                    className="btn btnPrimary"
                    style={{
                      marginRight: 8,
                      opacity: loading ? 0.6 : 1,
                      cursor: loading ? "not-allowed" : "pointer",
                    }}
                    onClick={fetchHoroscope}
                    disabled={loading}
                  >
                    {loading ? "해석 중..." : "다시 시도"}
                  </button>
                  <button
                    className="btn btnGhost"
                    onClick={() => setShowModal(false)}
                  >
                    닫기
                  </button>
                </div>
              )}

              {zodiacInfo && horoscopeData && (
                <div className="fadeSlideUp">
                  {/* 별자리 정보 */}
                  <div className="zodiacResultHeader">
                    <div className="zodiacIcon" style={{ fontSize: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ZodiacIcon nameEn={zodiacInfo.nameEn} />
                    </div>
                    <div>
                      <div className="zodiacName">{zodiacInfo.name}</div>
                      <div className="zodiacDateRange">
                        {zodiacInfo.dateRange}
                      </div>
                    </div>
                  </div>

                  {/* 전체 운세 */}
                  {horoscopeData.message && (
                    <div style={{ marginTop: 20 }}>
                      <div className="zodiacHoroscopeTitle">오늘의 운세</div>
                      <div className="p" style={{ marginTop: 8 }}>
                        {horoscopeData.message}
                      </div>
                    </div>
                  )}

                  {/* 연애운 */}
                  {horoscopeData.love && (
                    <div style={{ marginTop: 20 }}>
                      <div className="zodiacCategoryLabel">연애운</div>
                      <div className="p" style={{ marginTop: 8 }}>
                        {horoscopeData.love}
                      </div>
                    </div>
                  )}

                  {/* 직장/학업운 */}
                  {horoscopeData.career && (
                    <div style={{ marginTop: 20 }}>
                      <div className="zodiacCategoryLabel">직장/학업운</div>
                      <div className="p" style={{ marginTop: 8 }}>
                        {horoscopeData.career}
                      </div>
                    </div>
                  )}

                  {/* 금전운 */}
                  {horoscopeData.money && (
                    <div style={{ marginTop: 20 }}>
                      <div className="zodiacCategoryLabel">금전운</div>
                      <div className="p" style={{ marginTop: 8 }}>
                        {horoscopeData.money}
                      </div>
                    </div>
                  )}

                  {/* 조언 */}
                  {horoscopeData.advice && (
                    <div style={{ marginTop: 20 }}>
                      <div className="zodiacCategoryLabel">조언</div>
                      <div className="p" style={{ marginTop: 8 }}>
                        {horoscopeData.advice}
                      </div>
                    </div>
                  )}

                  {/* 행운의 숫자, 색상, 키워드 */}
                  <div
                    style={{
                      marginTop: 20,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    {horoscopeData.luckyNumber && (
                      <div>
                        <span
                          className="zodiacCategoryLabel"
                          style={{ marginRight: 8 }}
                        >
                          행운의 숫자
                        </span>
                        <span className="p">{horoscopeData.luckyNumber}</span>
                      </div>
                    )}
                    {horoscopeData.luckyColor && (
                      <div>
                        <span
                          className="zodiacCategoryLabel"
                          style={{ marginRight: 8 }}
                        >
                          행운의 색상
                        </span>
                        <span className="p">{horoscopeData.luckyColor}</span>
                      </div>
                    )}
                  </div>

                  {horoscopeData.keywords &&
                    horoscopeData.keywords.length > 0 && (
                      <div className="chipRow" style={{ marginTop: 12 }}>
                        {horoscopeData.keywords.map((keyword) => (
                          <span className="chip" key={keyword}>
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}

                  <div className="smallHelp" style={{ marginTop: 12 }}>
                    * 오늘의 결과는 하루 동안 유지됩니다
                  </div>

                  {/* 저장 버튼 */}
                  <div style={{ marginTop: 20, display: "grid", gap: 8 }}>
                    <button
                      className="btn btnPrimary btnWide"
                      onClick={() => {
                        saveZodiac();
                        setShowModal(false);
                      }}
                    >
                      기록에 저장하기
                    </button>

                    <button
                      className="btn btnGhost btnWide"
                      onClick={async () => {
                        if (!zodiacInfo || !horoscopeData) return;

                        const shareData = formatZodiacShare(
                          zodiacInfo.name,
                          horoscopeData.message,
                          horoscopeData.advice,
                          horoscopeData.luckyNumber,
                          horoscopeData.luckyColor,
                          horoscopeData.keywords
                        );

                        const result = await shareResult(shareData);
                        if (result.success) {
                          if (result.method === "clipboard") {
                            showToast("결과가 복사되었어요!");
                          }
                        } else {
                          showToast("공유에 실패했어요");
                        }
                      }}
                    >
                      결과 공유하기
                    </button>

                    <button
                      className="btn btnGhost btnWide"
                      onClick={() => setShowModal(false)}
                    >
                      닫기
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 로딩 중 터치 방지 오버레이 */}
      {loading && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.3)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              border: "4px solid rgba(255,255,255,0.3)",
              borderTop: "4px solid var(--gold-main)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <div style={{ color: "var(--cream)", fontSize: 14, fontWeight: 600 }}>
            운세를 불러오고 있어요...
          </div>
        </div>
      )}

      {/* 토스트 메시지 */}
      {toast && (
        <div className="toast">{toast}</div>
      )}
    </main>
  );
}
