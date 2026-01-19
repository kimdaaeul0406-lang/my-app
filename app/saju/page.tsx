"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCachedData, setCachedData, getSajuCacheKey } from "../utils/cache";

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

interface SajuResult {
  overview: string;
  personality: string;
  love: string;
  career: string;
  money: string;
  thisYear: string;
  advice: string;
  luckyElement: string;
  luckyColor: string;
  keywords: string[];
}

export default function SajuPage() {
  const router = useRouter();
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [gender, setGender] = useState<"male" | "female" | null>(null);
  const [calendar, setCalendar] = useState<"solar" | "lunar">("solar");
  const [result, setResult] = useState<SajuResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 생년월일 입력 핸들러
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBirthDate(e.target.value);
  };

  // 사주 API 호출
  useEffect(() => {
    if (!birthDate || !gender) {
      setResult(null);
      return;
    }

    const fetchSaju = async () => {
      setLoading(true);
      setError(null);

      // 캐시 확인
      const cacheKey = getSajuCacheKey(
        birthDate.replace(/-/g, ""),
        gender
      );
      const cached = getCachedData<SajuResult>(cacheKey);
      if (cached) {
        setResult(cached);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/saju", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            birthDate,
            birthTime: birthTime || null,
            gender,
            calendar,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "API 오류" }));
          throw new Error(errorData.error || "별들이 잠시 쉬고 있어요. 조금 후 다시 시도해주세요 🌙");
        }

        const data: SajuResult = await response.json();

        if (!data.overview) {
          throw new Error("사주 데이터를 가져올 수 없어요");
        }

        // 캐시 저장
        setCachedData(cacheKey, data);
        setResult(data);
      } catch (err) {
        console.error(`❌ [Saju] Error:`, err);
        setError(err instanceof Error ? err.message : "별들이 잠시 쉬고 있어요. 조금 후 다시 시도해주세요 🌙");
        setResult(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSaju();
  }, [birthDate, birthTime, gender, calendar]);

  const saveSaju = () => {
    if (!result || !birthDate || !gender) return;

    const item: HistoryItem = {
      id: uid(),
      type: "SAJU",
      title: `[사주] ${birthDate} - 오늘의 흐름`,
      text: result.overview,
      tags: ["사주", "오늘의 흐름", ...(result.keywords || [])],
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

    router.push("/?saved=saju");
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

            <h1 className="h2 stagger d1">사주 운세</h1>
            <p className="p stagger d2">
              생년월일을 입력하면 오늘의 사주 흐름을 알려드려요.
            </p>

            <div className="stagger d3" style={{ marginTop: 20 }}>
              <div className="zodiacSection">
                <div className="zodiacSectionHeader">
                  <div className="zodiacSectionKicker">오늘의 사주 흐름</div>
                  <div className="zodiacSectionDesc">
                    사주는 당신의 본질을 말하고,
                    <br />
                    오늘의 흐름을 정리해요.
                  </div>
                </div>

                <div className="zodiacInputSection" style={{ marginTop: 20 }}>
                  {/* 생년월일 */}
                  <div className="zodiacInputRow">
                    <div className="zodiacInputField">
                      <label className="zodiacInputLabel">생년월일</label>
                      <input
                        type="date"
                        className="input"
                        value={birthDate}
                        onChange={handleDateChange}
                        max={new Date().toISOString().split("T")[0]}
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>

                  {/* 출생 시간 (선택사항) */}
                  <div className="zodiacInputRow" style={{ marginTop: 16 }}>
                    <div className="zodiacInputField">
                      <label className="zodiacInputLabel">
                        출생 시간 (선택사항)
                      </label>
                      <input
                        type="time"
                        className="input"
                        value={birthTime}
                        onChange={(e) => setBirthTime(e.target.value)}
                        placeholder="모르면 비워두세요"
                        style={{ width: "100%" }}
                      />
                      <div className="smallHelp" style={{ marginTop: 4 }}>
                        모르면 비워두세요
                      </div>
                    </div>
                  </div>

                  {/* 성별 선택 */}
                  <div className="zodiacInputRow" style={{ marginTop: 16 }}>
                    <div className="zodiacInputField">
                      <label className="zodiacInputLabel">성별</label>
                      <div style={{ display: "flex", gap: 12 }}>
                        <button
                          className={`btn ${gender === "male" ? "btnPrimary" : "btnGhost"}`}
                          onClick={() => setGender("male")}
                          style={{ flex: 1 }}
                        >
                          남성
                        </button>
                        <button
                          className={`btn ${gender === "female" ? "btnPrimary" : "btnGhost"}`}
                          onClick={() => setGender("female")}
                          style={{ flex: 1 }}
                        >
                          여성
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 양력/음력 선택 */}
                  <div className="zodiacInputRow" style={{ marginTop: 16 }}>
                    <div className="zodiacInputField">
                      <label className="zodiacInputLabel">양력/음력</label>
                      <div style={{ display: "flex", gap: 12 }}>
                        <button
                          className={`btn ${calendar === "solar" ? "btnPrimary" : "btnGhost"}`}
                          onClick={() => setCalendar("solar")}
                          style={{ flex: 1 }}
                        >
                          양력
                        </button>
                        <button
                          className={`btn ${calendar === "lunar" ? "btnPrimary" : "btnGhost"}`}
                          onClick={() => setCalendar("lunar")}
                          style={{ flex: 1 }}
                        >
                          음력
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 로딩 */}
                {loading && (
                  <div className="card cardPad lift" style={{ marginTop: 16 }}>
                    <div style={{ padding: "20px 0", textAlign: "center" }}>
                      <div className="p" style={{ color: "var(--muted)" }}>
                        사주를 해석하고 있어요...
                      </div>
                    </div>
                  </div>
                )}

                {/* 에러 */}
                {error && !loading && (
                  <div className="card cardPad lift" style={{ marginTop: 16 }}>
                    <div style={{ padding: "20px 0", textAlign: "center" }}>
                      <div className="p" style={{ color: "var(--muted)" }}>
                        {error}
                      </div>
                    </div>
                  </div>
                )}

                {/* 결과 */}
                {result && !loading && (
                  <div className="card cardPad lift" style={{ marginTop: 16 }}>
                    {/* 전체 운세 */}
                    {result.overview && (
                      <div style={{ marginTop: 8 }}>
                        <div className="zodiacHoroscopeTitle">전체 운세</div>
                        <div className="p" style={{ marginTop: 8 }}>
                          {result.overview}
                        </div>
                      </div>
                    )}

                    {/* 성격 특징 */}
                    {result.personality && (
                      <div style={{ marginTop: 20 }}>
                        <div className="zodiacCategoryLabel">성격 특징</div>
                        <div className="p" style={{ marginTop: 8 }}>
                          {result.personality}
                        </div>
                      </div>
                    )}

                    {/* 연애운 */}
                    {result.love && (
                      <div style={{ marginTop: 20 }}>
                        <div className="zodiacCategoryLabel">연애운</div>
                        <div className="p" style={{ marginTop: 8 }}>
                          {result.love}
                        </div>
                      </div>
                    )}

                    {/* 직장/학업운 */}
                    {result.career && (
                      <div style={{ marginTop: 20 }}>
                        <div className="zodiacCategoryLabel">직장/학업운</div>
                        <div className="p" style={{ marginTop: 8 }}>
                          {result.career}
                        </div>
                      </div>
                    )}

                    {/* 금전운 */}
                    {result.money && (
                      <div style={{ marginTop: 20 }}>
                        <div className="zodiacCategoryLabel">금전운</div>
                        <div className="p" style={{ marginTop: 8 }}>
                          {result.money}
                        </div>
                      </div>
                    )}

                    {/* 올해 운세 */}
                    {result.thisYear && (
                      <div style={{ marginTop: 20 }}>
                        <div className="zodiacCategoryLabel">올해(2026년) 운세</div>
                        <div className="p" style={{ marginTop: 8 }}>
                          {result.thisYear}
                        </div>
                      </div>
                    )}

                    {/* 조언 */}
                    {result.advice && (
                      <div style={{ marginTop: 20 }}>
                        <div className="zodiacCategoryLabel">조언</div>
                        <div className="p" style={{ marginTop: 8 }}>
                          {result.advice}
                        </div>
                      </div>
                    )}

                    {/* 행운의 오행, 색상 */}
                    <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 12 }}>
                      {result.luckyElement && (
                        <div>
                          <span className="zodiacCategoryLabel" style={{ marginRight: 8 }}>행운의 오행</span>
                          <span className="p">{result.luckyElement}</span>
                        </div>
                      )}
                      {result.luckyColor && (
                        <div>
                          <span className="zodiacCategoryLabel" style={{ marginRight: 8 }}>행운의 색상</span>
                          <span className="p">{result.luckyColor}</span>
                        </div>
                      )}
                    </div>

                    {/* 키워드 */}
                    {result.keywords && result.keywords.length > 0 && (
                      <div className="chipRow" style={{ marginTop: 12 }}>
                        {result.keywords.map((keyword) => (
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
                        onClick={saveSaju}
                      >
                        기록에 저장하기
                      </button>

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
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
