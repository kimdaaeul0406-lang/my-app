"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCachedData, setCachedData, getSajuCacheKey } from "../utils/cache";
import { shareResult, formatSajuShare } from "../utils/share";

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

  // 토스트 메시지
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // 생년월일 입력 핸들러
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBirthDate(e.target.value);
    // 입력 변경 시 결과 초기화
    setResult(null);
    setError(null);
  };

  // 사주 API 호출 함수 (버튼 클릭 시 호출)
  const fetchSaju = async () => {
    if (!birthDate || !gender || loading) return; // 필수값 없거나 이미 로딩 중이면 중복 호출 방지

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
        const errorData = await response.json().catch(() => ({ success: false, error: "API 오류" }));
        throw new Error(errorData.error || "별들이 잠시 쉬고 있어요. 조금 후 다시 시도해주세요 🌙");
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "API 호출 실패");
      }

      // 응답 데이터 정리 (옵셔널 체이닝으로 안전하게 처리)
      const data = result.data;
      const sajuData: SajuResult = {
        overview: data.overview || "",
        personality: data.personality || "",
        love: data.love || "",
        career: data.career || "",
        money: data.money || "",
        thisYear: data.thisYear || "",
        advice: data.advice || "",
        luckyElement: data.luckyElement || "",
        luckyColor: data.luckyColor || "",
        keywords: data.keywords || [],
      };

      if (!sajuData.overview) {
        throw new Error("사주 데이터를 가져올 수 없어요");
      }

      // 캐시 저장
      setCachedData(cacheKey, sajuData);
      setResult(sajuData);
    } catch (err) {
      console.error(`❌ [Saju] Error:`, err);
      setError(err instanceof Error ? err.message : "별들이 잠시 쉬고 있어요. 조금 후 다시 시도해주세요 🌙");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

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
        {/* 밤하늘 헤더 */}
        <section className="subPageHeader reveal on">
          <div className="subPageStars">
            {[
              { left: 12, top: 18, delay: 0.2 },
              { left: 25, top: 32, delay: 0.7 },
              { left: 40, top: 14, delay: 1.2 },
              { left: 52, top: 42, delay: 1.7 },
              { left: 65, top: 22, delay: 0.5 },
              { left: 80, top: 38, delay: 1.0 },
              { left: 18, top: 52, delay: 1.4 },
              { left: 33, top: 58, delay: 0.8 },
              { left: 48, top: 28, delay: 2.0 },
              { left: 72, top: 48, delay: 0.4 },
              { left: 86, top: 16, delay: 1.6 },
              { left: 8, top: 40, delay: 1.1 },
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

            <h1 className="h2 stagger d1">🔮 사주 운세</h1>
            <p className="p stagger d2">
              생년월일을 입력하면 오늘의 사주 흐름을 알려드려요.
            </p>
          </div>
        </section>

        {/* 콘텐츠 섹션 */}
        <section className="section reveal on">
          <div className="container center">
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

                  {/* 출생 시간 (선택사항) - 전통 시간대 선택 */}
                  <div className="zodiacInputRow" style={{ marginTop: 16 }}>
                    <div className="zodiacInputField">
                      <label className="zodiacInputLabel">
                        출생 시간 (선택사항)
                      </label>
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: 8,
                        marginTop: 8,
                      }}>
                        {[
                          { value: "", label: "모름", time: "" },
                          { value: "23:00", label: "자시", time: "23~01시" },
                          { value: "01:00", label: "축시", time: "01~03시" },
                          { value: "03:00", label: "인시", time: "03~05시" },
                          { value: "05:00", label: "묘시", time: "05~07시" },
                          { value: "07:00", label: "진시", time: "07~09시" },
                          { value: "09:00", label: "사시", time: "09~11시" },
                          { value: "11:00", label: "오시", time: "11~13시" },
                          { value: "13:00", label: "미시", time: "13~15시" },
                          { value: "15:00", label: "신시", time: "15~17시" },
                          { value: "17:00", label: "유시", time: "17~19시" },
                          { value: "19:00", label: "술시", time: "19~21시" },
                          { value: "21:00", label: "해시", time: "21~23시" },
                        ].map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => {
                              setBirthTime(item.value);
                              setResult(null);
                              setError(null);
                            }}
                            style={{
                              padding: "10px 6px",
                              fontSize: 13,
                              fontWeight: birthTime === item.value ? 700 : 500,
                              backgroundColor: birthTime === item.value
                                ? "var(--navy-dark)"
                                : "rgba(26, 35, 50, 0.06)",
                              color: birthTime === item.value
                                ? "var(--cream)"
                                : "var(--navy-dark)",
                              border: "none",
                              borderRadius: 10,
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            <span>{item.label}</span>
                            {item.time && (
                              <span style={{
                                fontSize: 9,
                                opacity: birthTime === item.value ? 0.8 : 0.6,
                              }}>
                                {item.time}
                              </span>
                            )}
                          </button>
                        ))}
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
                          onClick={() => {
                            setGender("male");
                            setResult(null);
                            setError(null);
                          }}
                          style={{ flex: 1 }}
                        >
                          남성
                        </button>
                        <button
                          className={`btn ${gender === "female" ? "btnPrimary" : "btnGhost"}`}
                          onClick={() => {
                            setGender("female");
                            setResult(null);
                            setError(null);
                          }}
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
                          onClick={() => {
                            setCalendar("solar");
                            setResult(null);
                            setError(null);
                          }}
                          style={{ flex: 1 }}
                        >
                          양력
                        </button>
                        <button
                          className={`btn ${calendar === "lunar" ? "btnPrimary" : "btnGhost"}`}
                          onClick={() => {
                            setCalendar("lunar");
                            setResult(null);
                            setError(null);
                          }}
                          style={{ flex: 1 }}
                        >
                          음력
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 운세 보기 버튼 */}
                {!result && !loading && (
                  <div className="card cardPad lift" style={{ marginTop: 16 }}>
                    <div style={{ padding: "20px 0", textAlign: "center" }}>
                      <div className="p" style={{ marginBottom: 20, color: "var(--muted)" }}>
                        생년월일과 성별을 입력한 후 운세를 확인해보세요.
                      </div>
                      <button
                        className="btn btnPrimary btnWide"
                        onClick={fetchSaju}
                        disabled={loading || !birthDate || !gender}
                        style={{
                          opacity: (loading || !birthDate || !gender) ? 0.6 : 1,
                          cursor: (loading || !birthDate || !gender) ? "not-allowed" : "pointer",
                        }}
                      >
                        {loading ? "사주를 해석하고 있어요..." : "오늘의 운세 보기"}
                      </button>
                    </div>
                  </div>
                )}

                {/* 로딩 */}
                {loading && (
                  <div className="card cardPad lift" style={{ marginTop: 16 }}>
                    <div style={{ padding: "40px 0", textAlign: "center" }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        border: "3px solid var(--muted)",
                        borderTop: "3px solid var(--gold-main)",
                        borderRadius: "50%",
                        margin: "0 auto 16px",
                        animation: "spin 1s linear infinite"
                      }} />
                      <div className="p" style={{ color: "var(--muted)", fontWeight: 600 }}>
                        사주를 해석하고 있어요...
                      </div>
                      <div className="smallHelp" style={{ marginTop: 8 }}>
                        잠시만 기다려주세요 🌙
                      </div>
                    </div>
                  </div>
                )}

                {/* 에러 */}
                {error && !loading && (
                  <div className="card cardPad lift" style={{ marginTop: 16 }}>
                    <div style={{ padding: "20px 0", textAlign: "center" }}>
                      <div className="p" style={{ color: "var(--muted)", marginBottom: 16 }}>
                        {error}
                      </div>
                      <button
                        className="btn btnPrimary"
                        onClick={fetchSaju}
                        disabled={loading || !birthDate || !gender}
                        style={{
                          opacity: (loading || !birthDate || !gender) ? 0.6 : 1,
                          cursor: (loading || !birthDate || !gender) ? "not-allowed" : "pointer",
                        }}
                      >
                        {loading ? "해석 중..." : "다시 시도"}
                      </button>
                    </div>
                  </div>
                )}

                {/* 결과 */}
                {result && !loading && (
                  <div className="card cardPad lift fadeSlideUp" style={{ marginTop: 16 }}>
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

                      <button
                        className="btn btnGhost btnWide"
                        onClick={async () => {
                          if (!result || !birthDate) return;

                          const shareData = formatSajuShare(
                            birthDate,
                            result.overview,
                            result.advice,
                            result.keywords
                          );

                          const shareResult_ = await shareResult(shareData);
                          if (shareResult_.success) {
                            if (shareResult_.method === "clipboard") {
                              showToast("결과가 복사되었어요! 📋");
                            }
                          } else {
                            showToast("공유에 실패했어요 😢");
                          }
                        }}
                      >
                        결과 공유하기 📤
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
      </div >

      {/* 로딩 중 터치 방지 오버레이 */}
      {
        loading && (
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
              사주를 해석하고 있어요...
            </div>
          </div>
        )
      }

      {/* 토스트 메시지 */}
      {
        toast && (
          <div className="toast">{toast}</div>
        )
      }
    </main >
  );
}
