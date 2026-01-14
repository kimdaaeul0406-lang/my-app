"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const HISTORY_KEY = "lumen_history_v2";

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

type HistoryItem = {
  id: string;
  type: "SAJU" | "TAROT";
  title: string;
  text: string;
  tags: string[];
  createdAt: number;
  isPremium?: boolean;
};

export default function TarotPage() {
  const router = useRouter();
  const [picked, setPicked] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [canHover, setCanHover] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    const m = window.matchMedia("(hover: hover) and (pointer: fine)");
    const apply = () => setCanHover(m.matches);
    apply();
    m.addEventListener?.("change", apply);
    return () => m.removeEventListener?.("change", apply);
  }, []);

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

  const saveTarot = (isPremium = false) => {
    if (!tarotResult) return;

    const item: HistoryItem = {
      id: uid(),
      type: "TAROT",
      title: `[타로] ${tarotResult.title}`,
      text: tarotResult.text,
      tags: tarotResult.tags,
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

    router.push("/?saved=tarot");
  };

  const onEmptyTapReset = (e: React.PointerEvent<HTMLDivElement>) => {
    if (canHover) return;
    const el = e.target as HTMLElement;
    if (el.closest("button")) return;
    if (picked !== null) resetTarot();
  };

  return (
    <main className="mainWrap">
      <div className="bgFX" />
      <div className="content">
        <section className="section reveal on">
          <div className="container center">
            <div style={{ marginBottom: 24 }}>
              <Link href="/" className="btnTiny" style={{ textDecoration: "none" }}>
                ← 돌아가기
              </Link>
            </div>

            <h1 className="h2 stagger d1">타로 한 장(데모)</h1>
            <p className="p stagger d2">
              카드 3장 중 1장을 선택하면 메시지가 열려요.
            </p>

            <div className="tarotArea stagger d3" onPointerDown={onEmptyTapReset}>
              <div className="tarotPickRow" aria-label="타로 카드 선택">
                {[0, 1, 2].map((i) => {
                  const isPicked = picked === i;
                  const showFlip = isPicked && flipped;
                  const preview = canHover && picked === null && hovered === i;

                  return (
                    <button
                      key={i}
                      onPointerEnter={() => setHovered(i)}
                      onPointerLeave={() => setHovered(null)}
                      onClick={() => pickTarot(i)}
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

            {tarotResult ? (
              <div className="card cardPad lift stagger d4" style={{ marginTop: 24 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div style={{ fontWeight: 900 }}>{tarotResult.name}</div>
                  <div className="muted">오늘의 메시지</div>
                </div>

                <div style={{ marginTop: 10, fontWeight: 900, letterSpacing: -0.01 }}>
                  {tarotResult.title}
                </div>
                <div className="p">{tarotResult.text}</div>

                <div className="chipRow">
                  {tarotResult.tags.map((t) => (
                    <span className="chip" key={t}>
                      {t}
                    </span>
                  ))}
                </div>

                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  <button className="btn btnPrimary btnWide" onClick={() => saveTarot(false)}>
                    기록에 저장하기
                  </button>

                  <button
                    className="btn btnGhost btnWide"
                    onClick={() => {
                      router.push("/plan");
                    }}
                  >
                    프리미엄으로 더 깊게(잠금)
                  </button>

                  <button className="btn btnGhost btnWide" onClick={resetTarot}>
                    카드 다시 뽑기
                  </button>

                  <Link href="/" className="btn btnGhost btnWide" style={{ textAlign: "center", textDecoration: "none" }}>
                    돌아가기
                  </Link>
                </div>
              </div>
            ) : (
              <div
                className="stagger d4"
                style={{
                  marginTop: 24,
                  fontSize: 11,
                  color: "rgba(43,38,42,0.62)",
                  lineHeight: 1.6,
                }}
              >
                * 아직 선택하지 않았어요. 한 장을 눌러서 열어봐.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
