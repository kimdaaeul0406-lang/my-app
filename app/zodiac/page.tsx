"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ZodiacSection from "../components/ZodiacSection";
import { calculateZodiac, type ZodiacInfo } from "../utils/zodiac";

const HISTORY_KEY = "lumen_history_v2";

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
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
  // 프리미엄: 카테고리별 운세
  love?: string | null;
  money?: string | null;
  work?: string | null;
}

export default function ZodiacPage() {
  const router = useRouter();
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [zodiacInfo, setZodiacInfo] = useState<ZodiacInfo | null>(null);
  const [horoscopeData, setHoroscopeData] = useState<HoroscopeData | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);

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
        // API Ninjas가 계속 실패하므로 Aztro API 사용 (type=today)
        const apiUrl = `/api/horoscope?sign=${zodiacInfo.nameEn}&type=today`;
        console.log(`🌐 [Client] Fetching horoscope from: ${apiUrl}`);

        const response = await fetch(apiUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          // 캐시 비활성화하여 항상 서버에서 최신 데이터 가져오기
          cache: "no-store",
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
          console.error(
            `❌ [Client] Response headers:`,
            Object.fromEntries(response.headers.entries())
          );

          const errorMessage =
            errorData.message ||
            errorData.error ||
            `HTTP ${response.status}: 운세를 가져오는데 실패했어요`;
          throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log(`✅ [Client] Received data:`, data);

        // API 호출 실패 시 null 처리
        if (data.error || !data.description) {
          console.warn(`⚠️ [Client] API returned error or empty data`);
          setHoroscopeData(null);
          setError(data.error || "운세 데이터를 가져올 수 없어요");
          return;
        }

        // 새로운 API 응답 형식에 맞게 변환 (description -> horoscope)
        setHoroscopeData({
          ...data,
          horoscope: data.description, // description을 horoscope로 매핑
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

  const saveZodiac = (isPremium = false) => {
    if (!zodiacInfo || !horoscopeData) return;

    const item: HistoryItem = {
      id: uid(),
      type: "ZODIAC",
      title: `[별자리] ${zodiacInfo.name} - 오늘의 흐름`,
      text: horoscopeData.horoscope,
      tags: [zodiacInfo.name, "별자리", "오늘의 흐름"],
      createdAt: Date.now(),
      isPremium,
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
        <section className="section reveal on">
          <div className="container center">
            <div style={{ marginBottom: 16 }}>
              <Link
                href="/"
                className="btnTiny"
                style={{ textDecoration: "none" }}
              >
                ← 돌아가기
              </Link>
            </div>

            <h1 className="h2 stagger d1">별자리 운세(데모)</h1>
            <p className="p stagger d2">
              생일을 입력하면 오늘의 별자리 흐름을 알려드려요.
            </p>

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
                        <span
                          style={{ margin: "0 8px", color: "var(--muted)" }}
                        >
                          /
                        </span>
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

                {loading && (
                  <div className="card cardPad lift" style={{ marginTop: 16 }}>
                    {/* 별자리 정보 스켈레톤 */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <div
                        className="skeleton"
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: "50%",
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          className="skeleton"
                          style={{
                            width: "60%",
                            height: 20,
                            borderRadius: 4,
                            marginBottom: 8,
                          }}
                        />
                        <div
                          className="skeleton"
                          style={{
                            width: "40%",
                            height: 14,
                            borderRadius: 4,
                          }}
                        />
                      </div>
                    </div>

                    {/* 운세 텍스트 스켈레톤 */}
                    <div style={{ marginTop: 20 }}>
                      <div
                        className="skeleton"
                        style={{
                          width: "50%",
                          height: 18,
                          borderRadius: 4,
                          marginBottom: 12,
                        }}
                      />
                      <div
                        className="skeleton"
                        style={{
                          width: "100%",
                          height: 14,
                          borderRadius: 4,
                          marginBottom: 8,
                        }}
                      />
                      <div
                        className="skeleton"
                        style={{
                          width: "95%",
                          height: 14,
                          borderRadius: 4,
                          marginBottom: 8,
                        }}
                      />
                      <div
                        className="skeleton"
                        style={{
                          width: "85%",
                          height: 14,
                          borderRadius: 4,
                        }}
                      />
                    </div>

                    {/* 프리미엄 정보 스켈레톤 (선택적) */}
                    {isPremium && (
                      <div
                        style={{
                          marginTop: 20,
                          padding: 18,
                          background:
                            "linear-gradient(135deg, rgba(232, 181, 99, 0.08), rgba(232, 181, 99, 0.03))",
                          borderRadius: 12,
                          border: "1px solid rgba(232, 181, 99, 0.2)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 16,
                          }}
                        >
                          <div
                            className="skeleton"
                            style={{
                              width: 60,
                              height: 20,
                              borderRadius: 999,
                            }}
                          />
                          <div
                            className="skeleton"
                            style={{
                              width: 80,
                              height: 18,
                              borderRadius: 4,
                            }}
                          />
                        </div>
                        <div
                          style={{ marginTop: 12, display: "grid", gap: 12 }}
                        >
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              style={{
                                padding: 12,
                                background: "rgba(255, 255, 255, 0.5)",
                                borderRadius: 8,
                              }}
                            >
                              <div
                                className="skeleton"
                                style={{
                                  width: "40%",
                                  height: 14,
                                  borderRadius: 4,
                                  marginBottom: 8,
                                }}
                              />
                              <div
                                className="skeleton"
                                style={{
                                  width: "60%",
                                  height: 16,
                                  borderRadius: 4,
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="card cardPad" style={{ marginTop: 16 }}>
                    <div
                      className="p"
                      style={{ textAlign: "center", color: "var(--muted)" }}
                    >
                      {error}
                    </div>
                  </div>
                )}

                {zodiacInfo && !loading && !error && !horoscopeData && (
                  <div className="card cardPad" style={{ marginTop: 16 }}>
                    <div
                      className="p"
                      style={{ textAlign: "center", color: "var(--muted)" }}
                    >
                      데이터 없음 - API 호출이 실패했거나 응답이 없습니다.
                    </div>
                  </div>
                )}

                {zodiacInfo && horoscopeData && horoscopeData.horoscope && (
                  <div className="card cardPad lift" style={{ marginTop: 16 }}>
                    {/* 별자리 정보 */}
                    <div className="zodiacResultHeader">
                      <div className="zodiacIcon">{zodiacInfo.icon}</div>
                      <div>
                        <div className="zodiacName">{zodiacInfo.name}</div>
                        <div className="zodiacDateRange">
                          {zodiacInfo.dateRange}
                        </div>
                      </div>
                    </div>

                    {/* 오늘의 한 줄 운세 - 실제 API 응답 */}
                    <div style={{ marginTop: 16 }}>
                      <div className="zodiacHoroscopeTitle">
                        오늘의 한 줄 운세
                      </div>
                      <div className="p" style={{ marginTop: 8 }}>
                        {horoscopeData.horoscope ||
                          "운세 데이터를 불러오는 중..."}
                      </div>
                      {/* API 응답 디버깅 정보 (개발용) */}
                      {process.env.NODE_ENV === "development" && (
                        <details
                          style={{
                            marginTop: 12,
                            fontSize: 11,
                            color: "var(--muted)",
                          }}
                        >
                          <summary style={{ cursor: "pointer" }}>
                            API 응답 확인
                          </summary>
                          <pre
                            style={{
                              marginTop: 8,
                              padding: 8,
                              background: "var(--navy-light)",
                              borderRadius: 4,
                              overflow: "auto",
                              fontSize: 10,
                            }}
                          >
                            {JSON.stringify(horoscopeData, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>

                    {/* 프리미엄: 카테고리별 운세 (연애/금전/일) */}
                    {isPremium && (
                      <div
                        style={{
                          marginTop: 20,
                          padding: 18,
                          background:
                            "linear-gradient(135deg, rgba(232, 181, 99, 0.08), rgba(232, 181, 99, 0.03))",
                          borderRadius: 12,
                          border: "1px solid rgba(232, 181, 99, 0.2)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 16,
                          }}
                        >
                          <span className="chip chipGold">프리미엄</span>
                          <div
                            className="zodiacHoroscopeTitle"
                            style={{ margin: 0 }}
                          >
                            카테고리별 운세
                          </div>
                        </div>
                        <div
                          style={{ marginTop: 12, display: "grid", gap: 16 }}
                        >
                          {horoscopeData.love && (
                            <div
                              style={{
                                padding: 12,
                                background: "rgba(255, 255, 255, 0.5)",
                                borderRadius: 8,
                                border: "1px solid rgba(232, 181, 99, 0.15)",
                              }}
                            >
                              <div className="zodiacCategoryLabel">연애</div>
                              <div
                                className="p"
                                style={{ marginTop: 6, fontWeight: 500 }}
                              >
                                {horoscopeData.love}
                              </div>
                            </div>
                          )}
                          {horoscopeData.money && (
                            <div
                              style={{
                                padding: 12,
                                background: "rgba(255, 255, 255, 0.5)",
                                borderRadius: 8,
                                border: "1px solid rgba(232, 181, 99, 0.15)",
                              }}
                            >
                              <div className="zodiacCategoryLabel">금전</div>
                              <div
                                className="p"
                                style={{ marginTop: 6, fontWeight: 500 }}
                              >
                                {horoscopeData.money}
                              </div>
                            </div>
                          )}
                          {horoscopeData.work && (
                            <div
                              style={{
                                padding: 12,
                                background: "rgba(255, 255, 255, 0.5)",
                                borderRadius: 8,
                                border: "1px solid rgba(232, 181, 99, 0.15)",
                              }}
                            >
                              <div className="zodiacCategoryLabel">일</div>
                              <div
                                className="p"
                                style={{ marginTop: 6, fontWeight: 500 }}
                              >
                                {horoscopeData.work}
                              </div>
                            </div>
                          )}
                          {!horoscopeData.love &&
                            !horoscopeData.money &&
                            !horoscopeData.work && (
                              <div
                                className="p"
                                style={{
                                  textAlign: "center",
                                  color: "var(--muted)",
                                  padding: 20,
                                }}
                              >
                                카테고리별 운세 데이터를 불러오는 중입니다...
                                <br />
                                <span style={{ fontSize: 11 }}>
                                  (API에서 카테고리별 운세를 제공하지 않을 수
                                  있습니다)
                                </span>
                              </div>
                            )}
                        </div>
                      </div>
                    )}

                    {/* 프리미엄: 추가 정보 (기분, 색, 숫자, 시간) */}
                    {isPremium && (
                      <div
                        style={{
                          marginTop: 20,
                          padding: 18,
                          background:
                            "linear-gradient(135deg, rgba(232, 181, 99, 0.08), rgba(232, 181, 99, 0.03))",
                          borderRadius: 12,
                          border: "1px solid rgba(232, 181, 99, 0.2)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 16,
                          }}
                        >
                          <span className="chip chipGold">프리미엄</span>
                          <div
                            className="zodiacHoroscopeTitle"
                            style={{ margin: 0 }}
                          >
                            추가 정보
                          </div>
                        </div>
                        <div
                          style={{ marginTop: 12, display: "grid", gap: 12 }}
                        >
                          {horoscopeData.mood && (
                            <div
                              style={{
                                padding: 12,
                                background: "rgba(255, 255, 255, 0.5)",
                                borderRadius: 8,
                                border: "1px solid rgba(232, 181, 99, 0.15)",
                              }}
                            >
                              <div className="zodiacCategoryLabel">기분</div>
                              <div
                                className="p"
                                style={{ marginTop: 6, fontWeight: 500 }}
                              >
                                {horoscopeData.mood}
                              </div>
                            </div>
                          )}
                          {horoscopeData.color && (
                            <div
                              style={{
                                padding: 12,
                                background: "rgba(255, 255, 255, 0.5)",
                                borderRadius: 8,
                                border: "1px solid rgba(232, 181, 99, 0.15)",
                              }}
                            >
                              <div className="zodiacCategoryLabel">
                                행운의 색
                              </div>
                              <div
                                className="p"
                                style={{ marginTop: 6, fontWeight: 500 }}
                              >
                                {horoscopeData.color}
                              </div>
                            </div>
                          )}
                          {horoscopeData.lucky_number && (
                            <div
                              style={{
                                padding: 12,
                                background: "rgba(255, 255, 255, 0.5)",
                                borderRadius: 8,
                                border: "1px solid rgba(232, 181, 99, 0.15)",
                              }}
                            >
                              <div className="zodiacCategoryLabel">
                                행운의 숫자
                              </div>
                              <div
                                className="p"
                                style={{
                                  marginTop: 6,
                                  fontWeight: 500,
                                  fontSize: 18,
                                  color: "var(--gold-main)",
                                }}
                              >
                                {horoscopeData.lucky_number}
                              </div>
                            </div>
                          )}
                          {horoscopeData.lucky_time && (
                            <div
                              style={{
                                padding: 12,
                                background: "rgba(255, 255, 255, 0.5)",
                                borderRadius: 8,
                                border: "1px solid rgba(232, 181, 99, 0.15)",
                              }}
                            >
                              <div className="zodiacCategoryLabel">
                                행운의 시간
                              </div>
                              <div
                                className="p"
                                style={{ marginTop: 6, fontWeight: 500 }}
                              >
                                {horoscopeData.lucky_time}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 프리미엄이 아닐 때 안내 */}
                    {!isPremium && (
                      <div
                        style={{
                          marginTop: 16,
                          padding: 16,
                          background: "var(--navy-light)",
                          borderRadius: 8,
                          textAlign: "center",
                        }}
                      >
                        <div
                          className="p"
                          style={{
                            marginBottom: 12,
                            color: "rgba(255, 255, 255, 0.9)",
                          }}
                        >
                          프리미엄으로 더 깊은 해석을 확인하세요
                        </div>
                        <button
                          className="btn btnGhost btnWide"
                          onClick={() => setIsPremium(true)}
                          style={{ color: "rgba(255, 255, 255, 0.95)" }}
                        >
                          프리미엄으로 더 깊게 보기
                        </button>
                      </div>
                    )}

                    <div className="smallHelp" style={{ marginTop: 12 }}>
                      * 오늘의 결과는 하루 동안 유지됩니다
                    </div>

                    {/* 저장 버튼 */}
                    <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
                      <button
                        className="btn btnPrimary btnWide"
                        onClick={() => saveZodiac(false)}
                      >
                        기록에 저장하기
                      </button>

                      {!isPremium && (
                        <button
                          className="btn btnGhost btnWide"
                          onClick={() => setIsPremium(true)}
                        >
                          프리미엄으로 더 깊게 보기
                        </button>
                      )}
                      {isPremium && (
                        <button
                          className="btn btnGhost btnWide"
                          onClick={() => setIsPremium(false)}
                          style={{
                            background: "rgba(232, 181, 99, 0.1)",
                            color: "var(--gold-main)",
                            borderColor: "rgba(232, 181, 99, 0.3)",
                          }}
                        >
                          기본 보기로 전환
                        </button>
                      )}

                      <Link
                        href="/"
                        className="btn btnGhost btnWide"
                        style={{ textAlign: "center", textDecoration: "none" }}
                      >
                        돌아가기
                      </Link>
                    </div>
                  </div>
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
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
