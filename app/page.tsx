"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PWAInstallBanner from "./components/PWAInstallBanner";

type ModalType = "tarot" | null;

type Review = { name: string; text: string };

type HistoryItem = {
  id: string;
  type: "SAJU" | "TAROT" | "ZODIAC";
  title: string;
  text: string;
  tags: string[];
  createdAt: number;
  isPremium?: boolean;
};

const HISTORY_KEY = "lumen_history_v2";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function formatKoreanDate(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(
    d.getDate()
  )} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const flowRef = useRef<HTMLElement | null>(null);
  const subscribeRef = useRef<HTMLElement | null>(null);
  const historyRef = useRef<HTMLElement | null>(null);

  const [modal, setModal] = useState<ModalType>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  // 클라이언트 마운트 확인 (Hydration 오류 방지)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 맨 위로 가기 버튼 표시 상태
  const [showScrollTop, setShowScrollTop] = useState(false);

  // 스크롤 위치 감지
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Reveal
  useEffect(() => {
    // 페이지 로드 시 최상단으로 스크롤
    window.scrollTo(0, 0);

    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) (e.target as HTMLElement).classList.add("on");
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) =>
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  // 오늘의 흐름(데모)
  const todayFlow = useMemo(() => {
    const items = [
      {
        kicker: "TODAY FLOW",
        statement: "오늘은 결론보다 '정리'가 먼저인 날이에요.",
        desc: "급하게 답을 찾기보다, 마음의 순서를 정돈하면 흐름이 편해져요.",
        tags: ["정리", "호흡", "선택"],
      },
      {
        kicker: "TODAY FLOW",
        statement: "오늘은 '확신'보다 '감각'을 믿는 편이 좋아요.",
        desc: "작은 신호를 놓치지 않으면, 방향이 자연스럽게 잡혀요.",
        tags: ["직감", "흐름", "균형"],
      },
      {
        kicker: "TODAY FLOW",
        statement: "오늘은 작은 용기가 큰 방향을 바꿔요.",
        desc: "완벽한 준비보다, 한 걸음이 흐름을 열어줘요.",
        tags: ["용기", "시작", "집중"],
      },
    ];
    // 날짜 기반으로 고정된 인덱스 생성 (서버/클라이언트 동일, Hydration 오류 방지)
    const today = new Date();
    const dayIndex = today.getDate() % items.length;
    return items[dayIndex];
  }, []);

  // 리뷰(지그재그)
  const reviews: Review[] = [
    {
      name: "김민지",
      text: "과장된 말이 아니라 정리해주는 느낌이라 좋았어요. 마음이 덜 흔들려요.",
    },
    {
      name: "이수현",
      text: "아침에 확인하면 하루의 방향이 잡혀요. 문장이 짧고 정확해서 부담이 없어요.",
    },
    {
      name: "박지훈",
      text: "괜히 불안하게 만드는 표현이 없어서 마음이 편해요. 계속 보게 돼요.",
    },
    {
      name: "최서연",
      text: "톤이 고요해서 좋고, 결과가 딱 필요한 만큼만 있어서 믿음이 가요.",
    },
    {
      name: "정다은",
      text: "매일 아침 확인하는 게 습관이 됐어요. 하루를 시작하는 마음가짐이 달라져요.",
    },
    {
      name: "윤태영",
      text: "불필요한 걱정을 줄여주고, 실용적인 조언만 주는 게 좋아요.",
    },
  ];

  // 구독
  const submitFree = () => {
    // Stibee 구독 페이지로 이동
    window.open("https://page.stibee.com/subscriptions/467092", "_blank");
  };

  // 기록
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // localStorage에서 히스토리 로드
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as HistoryItem[];
      setHistory(Array.isArray(parsed) ? parsed : []);
    } catch {
      /* ignore */
    }
  }, []);

  // 저장 후 히스토리 섹션으로 스크롤
  useEffect(() => {
    const saved = searchParams.get("saved");
    if (saved) {
      // URL에서 쿼리 파라미터 제거
      router.replace("/", { scroll: false });
      // 히스토리 섹션으로 스크롤
      setTimeout(() => {
        scrollTo(historyRef);
        if (saved === "tarot") {
          showToast("타로 결과를 기록에 저장했어");
        } else if (saved === "zodiac") {
          showToast("별자리 결과를 기록에 저장했어");
        } else if (saved === "saju") {
          showToast("사주 결과를 기록에 저장했어");
        }
      }, 100);
    }
  }, [searchParams, router]);

  const saveHistory = (item: HistoryItem) => {
    const next = [item, ...history].slice(0, 12);
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  };

  const removeHistory = (id: string) => {
    const next = history.filter((h) => h.id !== id);
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    showToast("기록 삭제 완료");
  };

  // 타로(모달)
  const tarotDeck = useMemo(() => {
    return [
      {
        name: "THE MOON",
        title: "흐림 속에서도 길은 있어요.",
        text: "오늘은 모든 걸 확정하기보다, 감정을 관찰하는 쪽이 좋아요. 불확실함은 '정보 부족'일 수 있어요.",
        tags: ["관찰", "직감", "유예"],
      },
      {
        name: "THE SUN",
        title: "정답이 아니라 '확신'이 자라요.",
        text: "오늘은 작은 성취가 큰 자신감으로 이어져요. 시작을 미루지 말고, 가볍게 움직여봐요.",
        tags: ["성취", "기쁨", "시작"],
      },
      {
        name: "TEMPERANCE",
        title: "균형이 답을 더 빨리 데려와요.",
        text: "오늘은 한쪽으로 치우치기 쉬워요. 속도 조절만 해도 관계와 일정이 부드러워져요.",
        tags: ["균형", "조율", "호흡"],
      },
    ];
  }, []);

  const [picked, setPicked] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);

  const resetTarot = () => {
    setPicked(null);
    setFlipped(false);
  };

  const pickTarot = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    window.setTimeout(() => setFlipped(true), 220);
  };

  const tarotResult = useMemo(() => {
    if (picked === null) return null;
    return tarotDeck[picked];
  }, [picked, tarotDeck]);

  const saveTarot = () => {
    if (!tarotResult) return;
    const item: HistoryItem = {
      id: uid(),
      type: "TAROT",
      title: `[타로] ${tarotResult.title}`,
      text: tarotResult.text,
      tags: tarotResult.tags,
      createdAt: Date.now(),
    };
    saveHistory(item);
    showToast("타로 결과를 기록에 저장했어");
    scrollTo(historyRef);
  };

  useEffect(() => {
    if (modal === "tarot") resetTarot();
  }, [modal]);

  return (
    <main className="mainWrap">
      <div className="bgFX" />
      <div className="content">
        {/* HERO - Night Sky */}
        <section className="section reveal on nightSky">
          {/* 별 파티클 - 클라이언트에서만 렌더링 (Hydration 오류 방지) */}
          {isMounted && (
            <div className="starField">
              {[...Array(35)].map((_, i) => (
                <div
                  key={i}
                  className="star"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 3}s`,
                    animationDuration: `${2 + Math.random() * 2}s`,
                  }}
                />
              ))}
            </div>
          )}

          <div className="container center">
            <h1 className="brand stagger d1">LUMEN</h1>
            <p className="tagline stagger d2">
              과장 없이, 오늘의 흐름을 정리하는 사주 & 타로 & 별자리
            </p>

            <div className="heroEyebrow stagger d3">
              <span>사주</span>
              <span className="heroDot" />
              <span>타로</span>
              <span className="heroDot" />
              <span>별자리</span>
            </div>

            <div className="heroTitle stagger d4">
              오늘,
              <br />
              당신의 흐름은
              <br />
              어디로 가고 있나요?
            </div>

            <div className="heroSub stagger d5">
              사주는 본질을, 타로는 선택을, 별자리는 흐름을.
              <br />
              하루의 방향을 조용히 정리해요.
            </div>

            <div
              className="identityLine stagger d5"
              style={{ justifyContent: "center" }}
            >
              <span className="identityBadge">사주</span>
              <span>본질·정리</span>
              <span className="heroDot" />
              <span className="identityBadge">타로</span>
              <span>선택·메시지</span>
              <span className="heroDot" />
              <span className="identityBadge">별자리</span>
              <span>흐름·보조</span>
            </div>

            <div className="heroDivider" />

            <div className="heroCtaRow">
              <button
                className="btn btnPrimary btnWide"
                onClick={() => scrollTo(flowRef)}
              >
                지금 바로 시작하기
              </button>
              <Link
                href="/tarot"
                className="btn btnGhost btnWide"
                style={{ textAlign: "center", textDecoration: "none" }}
              >
                타로 카드 뽑기
              </Link>
              <button
                className="heroLink"
                onClick={() => scrollTo(subscribeRef)}
              >
                구독 혜택 확인하기
              </button>
            </div>

            <div className="miniRow" style={{ justifyContent: "center" }}>
              <span>10만+</span>
              <span>·</span>
              <span>4.8</span>
              <span>·</span>
              <span>99%</span>
            </div>
          </div>
        </section>

        {/* FLOW (별자리 세계: 밝음) */}
        <section className="sectionTight reveal" ref={flowRef as any}>
          <div className="container center">
            <h2 className="h2 stagger d1">오늘의 흐름</h2>
            <p className="p stagger d2">
              마음을 흔드는 말 대신, 오늘을 정리하는 문장으로만 전해요.
            </p>

            {/* 모바일: 기존 레이아웃 */}
            <div className="flowMobile">
              <div className="flowKicker stagger d3">{todayFlow.kicker}</div>
              <div className="flowStatement stagger d4">
                {todayFlow.statement}
              </div>
              <div className="flowDesc stagger d5">{todayFlow.desc}</div>

              <div className="chipRow" style={{ justifyContent: "center" }}>
                {todayFlow.tags.map((t) => (
                  <span className="chip" key={t}>
                    {t}
                  </span>
                ))}
              </div>

              <div className="flowCtas">
                <button
                  className="btn btnPrimary btnWide"
                  onClick={() => scrollTo(historyRef)}
                >
                  최근 기록 보기
                </button>
              </div>

              <div className="btnTinyGroup">
                <Link
                  href="/saju"
                  className="btnTiny"
                >
                  🔮 사주 확인하기
                </Link>
                <Link
                  href="/zodiac"
                  className="btnTiny"
                >
                  ⭐ 별자리 확인하기
                </Link>
                <Link
                  href="/tarot"
                  className="btnTiny"
                >
                  🃏 타로 뽑기
                </Link>
              </div>
            </div>

            {/* PC: 모바일과 동일한 세로 스택 구조 */}
            <div className="flowDesktop">
              <div className="flowKicker stagger d3">{todayFlow.kicker}</div>
              <div className="flowStatement stagger d4">
                {todayFlow.statement}
              </div>
              <div className="flowDesc stagger d5">{todayFlow.desc}</div>

              <div className="chipRow" style={{ justifyContent: "center" }}>
                {todayFlow.tags.map((t) => (
                  <span className="chip" key={t}>
                    {t}
                  </span>
                ))}
              </div>

              <div className="flowCtas">
                <button
                  className="btn btnPrimary btnWide"
                  onClick={() => scrollTo(historyRef)}
                >
                  최근 기록 보기
                </button>
              </div>

              <div className="btnTinyGroup">
                <Link
                  href="/saju"
                  className="btnTiny"
                >
                  🔮 사주 확인하기
                </Link>
                <Link
                  href="/zodiac"
                  className="btnTiny"
                >
                  ⭐ 별자리 확인하기
                </Link>
                <Link
                  href="/tarot"
                  className="btnTiny"
                >
                  🃏 타로 뽑기
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* TARO / TRUST / REVIEWS (타로 세계: 어두움 + 골드 소량) */}
        <section className="sectionTight reveal taroSection">
          <div className="container center">
            <h2 className="h2 stagger d1">믿고 볼 수 있도록</h2>
            <p className="p stagger d2">
              공포·불안 조장 없이, 오늘의 선택을 "정리"하는 서비스예요.
            </p>

            <div className="trustRow stagger d3">
              <div className="trustPill">
                <span className="trustNum">10만+</span>
                <span className="trustLabel">누적 이용자</span>
              </div>
              <div className="trustPill">
                <span className="trustNum">4.8</span>
                <span className="trustLabel">평균 평점</span>
              </div>
              <div className="trustPill">
                <span className="trustNum">99%</span>
                <span className="trustLabel">만족도</span>
              </div>
            </div>

            <div className="principles stagger d4" aria-label="해석 원칙">
              <div className="principleCard">
                <div className="principleTop">
                  <div className="principleTitle">공포·불안 조장 없음</div>
                </div>
                <div className="principleDesc">
                  마음을 흔드는 말 대신, 흐름을 정리하는 문장으로만 전해요.
                </div>
              </div>

              <div className="principleCard">
                <div className="principleTop">
                  <div className="principleTitle">행동으로 이어지는 조언</div>
                </div>
                <div className="principleDesc">
                  "그래서 오늘 뭘 하면 좋을지"가 남도록 방향을 정리해요.
                </div>
              </div>

              <div className="principleCard">
                <div className="principleTop">
                  <div className="principleTitle">짧고 명확한 문장</div>
                </div>
                <div className="principleDesc">
                  필요한 만큼만. 읽고 나면 마음이 가벼워지게 구성해요.
                </div>
              </div>
            </div>

            {/* ✅ 리뷰: 지그재그 + 스크롤 떠오름 */}
            <div
              className="reviewZig"
              style={{ marginTop: 18 }}
              aria-label="리뷰 목록"
            >
              {reviews.map((r, i) => {
                const side = i % 2 === 0 ? "left" : "right";
                return (
                  <div
                    key={`${r.name}-${i}`}
                    className={`reviewItem ${side} reveal`}
                  >
                    <div className="reviewCardZ">
                      <div className="reviewTop">
                        <div className="avatar" />
                        <div style={{ textAlign: "left" }}>
                          <div className="name">{r.name}</div>
                          <div className="stars">★★★★★</div>
                        </div>
                      </div>
                      <p className="reviewText">{r.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              className="chipRow"
              style={{ justifyContent: "center", marginTop: 14 }}
            >
              <span className="chip chipGold">프리미엄</span>
              <span className="chip">과장 없음</span>
              <span className="chip">정리 중심</span>
            </div>
          </div>
        </section>

        {/* SUBSCRIBE (통합 카드형) */}
        <section className="reveal" ref={subscribeRef as any}>
          <div className="subscribeFocus">
            <div className="subscribeOrb" />
            <div
              className="container center"
              style={{ padding: "0 var(--pad)" }}
            >
              <h2 className="h2 stagger d1">구독으로 매일 받기</h2>
              <p className="p stagger d2">
                아침에 딱 한 번, 오늘의 흐름이 정리되면 하루가 덜 흔들려요.
              </p>

              {/* 모바일: 통합 가격 카드 */}
              <div className="pricingCard pricingMobile stagger d3">
                {/* FREE 섹션 */}
                <div className="pricingSection">
                  <div className="pricingSectionHeader">
                    <div>
                      <div className="pricingBadge free">FREE</div>
                      <div className="pricingTitle">무료로 구독해서 받기</div>
                      <div className="pricingDesc">
                        하루 1회, 오늘의 흐름 + 한 줄 조언을 보내드려요.
                      </div>
                    </div>
                  </div>

                  <div className="chipRow">
                    <span className="chip">오늘의 키워드</span>
                    <span className="chip">한 줄 조언</span>
                    <span className="chip">짧고 간결</span>
                  </div>

                  <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                    <button
                      className="btn btnPrimary btnWide"
                      onClick={submitFree}
                    >
                      무료로 구독 시작하기
                    </button>
                    <div className="smallHelp">
                      * 클릭하면 구독 페이지로 이동합니다.
                    </div>
                  </div>
                </div>
              </div>

              {/* PC: 무료 구독 */}
              <div
                className="pricingDesktop stagger d3"
              >
                {/* FREE 섹션 */}
                <div className="pricingSection" style={{ maxWidth: "500px", margin: "0 auto" }}>
                  <div className="pricingSectionHeader">
                    <div>
                      <div className="pricingBadge free">FREE</div>
                      <div className="pricingTitle">무료로 구독해서 받기</div>
                      <div className="pricingDesc">
                        하루 1회, 오늘의 흐름 + 한 줄 조언을 보내드려요.
                      </div>
                    </div>
                    <div
                      className="price"
                      style={{ color: "var(--navy-dark)" }}
                    >
                      무료
                    </div>
                  </div>

                  <div className="chipRow">
                    <span className="chip">오늘의 키워드</span>
                    <span className="chip">한 줄 조언</span>
                    <span className="chip">짧고 간결</span>
                  </div>

                  <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                    <button
                      className="btn btnPrimary btnWide"
                      onClick={submitFree}
                    >
                      무료로 구독 시작하기
                    </button>
                    <div className="smallHelp" style={{ textAlign: "center" }}>
                      * 클릭하면 구독 페이지로 이동합니다.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* START FORM */}
        <section className="section reveal">
          <div className="container center">
            <h2 className="h2 stagger d1">나의 흐름, 무료로 시작하기</h2>
            <p className="p stagger d2">
              사주는 본질을, 타로는 선택을, 별자리는 오늘의 흐름을 알려줍니다.
            </p>

            <div className="stagger d3" style={{ marginTop: 20, display: "grid", gap: 10 }}>
              <Link
                href="/saju"
                className="btn btnPrimary btnWide"
                style={{
                  textAlign: "center",
                  textDecoration: "none",
                  display: "block",
                }}
              >
                사주 확인하기
              </Link>
              <Link
                href="/tarot"
                className="btn btnGhost btnWide"
                style={{
                  textAlign: "center",
                  textDecoration: "none",
                  display: "block",
                }}
              >
                타로 카드 뽑기
              </Link>
              <Link
                href="/zodiac"
                className="btn btnGhost btnWide"
                style={{
                  textAlign: "center",
                  textDecoration: "none",
                  display: "block",
                }}
              >
                별자리 확인하기
              </Link>
            </div>
          </div>
        </section>

        {/* HISTORY */}
        <section className="sectionTight reveal" ref={historyRef as any}>
          <div className="container center">
            <h2 className="h2 stagger d1">최근 기록</h2>
            <p className="p stagger d2">흐름을 쌓아두면, 내 패턴이 보여요.</p>

            <div className="historyWrap stagger d3">
              {history.length === 0 ? (
                <div className="card cardPad left">
                  <div style={{ fontWeight: 900 }}>
                    아직 저장된 기록이 없어요.
                  </div>
                  <div className="p">사주/별자리/타로 결과에서 "저장"을 눌러봐.</div>
                </div>
              ) : (
                history.map((h) => (
                  <div className="historyCard" key={h.id}>
                    <div className="historyTop">
                      <span className="badge">
                        {h.type === "SAJU"
                          ? "SAJU"
                          : h.type === "ZODIAC"
                            ? "ZODIAC"
                            : "TAROT"}
                        {h.isPremium ? " · PREMIUM" : ""}
                      </span>
                      <span className="muted">
                        {formatKoreanDate(h.createdAt)}
                      </span>
                    </div>
                    <div className="historyTitle">{h.title}</div>
                    <div className="historyText">{h.text}</div>
                    <div className="chipRow">
                      {h.tags.slice(0, 4).map((t) => (
                        <span className="chip" key={t}>
                          {t}
                        </span>
                      ))}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 8,
                      }}
                    >
                      <button
                        className="btnTiny"
                        onClick={() => removeHistory(h.id)}
                      >
                        삭제
                      </button>
                      <button
                        className="btnTiny"
                        onClick={() => {
                          navigator.clipboard?.writeText(
                            `${h.title}\n${h.text}`
                          );
                          showToast("결과를 복사했어(데모)");
                        }}
                      >
                        공유(복사)
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Reassure */}
        <section className="reveal">
          <div className="reassureBox">
            <div className="reassureTitle">안심하고 볼 수 있도록</div>
            <ul className="reassureList">
              <li>
                LUMEN은 공포·불안 조장을 하지 않아요. (과장된 문장 사용 X)
              </li>
              <li>의료·법률·투자 조언을 대체하지 않아요.</li>
              <li>
                오늘의 선택을 "정리"하는 서비스로, 스스로의 판단을 돕는 데
                집중해요.
              </li>
            </ul>
          </div>
        </section>

        <footer className="footer reveal">
          © LUMEN · 문의 · 약관 · 개인정보처리방침
        </footer>

        {/* MODALS */}
        {modal === "tarot" && (
          <Modal
            title="타로 한 장(데모)"
            onClose={() => setModal(null)}
          >
            <TarotModal
              picked={picked}
              flipped={flipped}
              onPick={pickTarot}
              onReset={resetTarot}
              result={tarotResult}
              onSave={saveTarot}
              onClose={() => setModal(null)}
            />
          </Modal>
        )}

        {toast && <div className="toast">{toast}</div>}

        {/* 맨 위로 가기 버튼 */}
        {showScrollTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            style={{
              position: "fixed",
              bottom: 24,
              right: 24,
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "var(--navy-dark)",
              color: "var(--cream)",
              border: "none",
              boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              zIndex: 1000,
              transition: "transform 0.2s ease, opacity 0.2s ease",
            }}
            aria-label="맨 위로 가기"
          >
            ↑
          </button>
        )}

        {/* PWA 설치 유도 배너 */}
        <PWAInstallBanner />
      </div>
    </main>
  );
}

/* ===== Modal Shell ===== */
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalSheet" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div className="modalTitle">{title}</div>
          <button className="closeBtn" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
        <div className="modalBody">{children}</div>
      </div>
    </div>
  );
}

/* ===== TAROT Modal (PC: hover 살짝 / click 완전 뒤집힘, Mobile: 선택 후 바탕 탭하면 초기화) ===== */
function TarotModal({
  picked,
  flipped,
  onPick,
  onReset,
  result,
  onSave,
  onClose,
}: {
  picked: number | null;
  flipped: boolean;
  onPick: (i: number) => void;
  onReset: () => void;
  result: { name: string; title: string; text: string; tags: string[] } | null;
  onSave: () => void;
  onClose: () => void;
}) {
  const [canHover, setCanHover] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(hover: hover) and (pointer: fine)");
    const apply = () => setCanHover(m.matches);
    apply();
    m.addEventListener?.("change", apply);
    return () => m.removeEventListener?.("change", apply);
  }, []);

  const [hovered, setHovered] = useState<number | null>(null);

  // 모바일에서 "빈 바탕 탭"으로 초기화(카드/버튼 제외)
  const onEmptyTapReset = (e: React.PointerEvent<HTMLDivElement>) => {
    if (canHover) return; // PC는 굳이 바탕탭 리셋 없음
    const el = e.target as HTMLElement;
    if (el.closest("button")) return;
    if (picked !== null) onReset();
  };

  return (
    <div onPointerDown={onEmptyTapReset}>
      <p className="p" style={{ marginTop: 0 }}>
        카드 3장 중 1장을 선택하면 메시지가 열려요.
      </p>

      <div className="tarotArea">
        <div className="tarotPickRow" aria-label="타로 카드 선택">
          {[0, 1, 2].map((i) => {
            const isPicked = picked === i;
            const showFlip = isPicked && flipped;

            // PC: hover는 살짝만, 클릭(선택)하면 완전 뒤집힘
            const preview = canHover && picked === null && hovered === i;

            return (
              <button
                key={i}
                onPointerEnter={() => setHovered(i)}
                onPointerLeave={() => setHovered(null)}
                onClick={() => onPick(i)}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  cursor: "pointer",
                }}
                aria-label={`카드 ${i + 1} 선택`}
              >
                <div className="tarotFlip">
                  <div
                    className={[
                      "tarotInner",
                      preview ? "preview" : "",
                      showFlip ? "flipped" : "",
                    ].join(" ")}
                  >
                    <div className="tarotFace tarotBack" />
                    <div className="tarotFace tarotFront">
                      {showFlip ? "OPEN" : "LUMEN"}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {!canHover && picked !== null && (
          <div className="tapHint">
            * 카드 주변 빈 공간을 탭하면 초기화돼요.
          </div>
        )}
      </div>

      {result ? (
        <div className="card cardPad lift" style={{ marginTop: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 900 }}>{result.name}</div>
            <div className="muted">오늘의 메시지</div>
          </div>

          <div style={{ marginTop: 10, fontWeight: 900, letterSpacing: -0.01 }}>
            {result.title}
          </div>
          <div className="p">{result.text}</div>

          <div className="chipRow">
            {result.tags.map((t) => (
              <span className="chip" key={t}>
                {t}
              </span>
            ))}
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <button className="btn btnPrimary btnWide" onClick={onSave}>
              기록에 저장하기
            </button>

            <button className="btn btnGhost btnWide" onClick={onReset}>
              카드 다시 뽑기
            </button>

            <button className="btn btnGhost btnWide" onClick={onClose}>
              닫기
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            marginTop: 12,
            fontSize: 11,
            color: "rgba(43,38,42,0.62)",
            lineHeight: 1.6,
          }}
        >
          * 아직 선택하지 않았어요. 한 장을 눌러서 열어봐.
        </div>
      )}
    </div>
  );
}

