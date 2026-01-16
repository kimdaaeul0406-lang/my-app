"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import tarotCardsData from "../data/tarot-cards.json";

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

type TarotCategory = "love" | "money" | "work" | "advice";

type TarotInterpretation = {
  title: string;
  text: string;
  tags: string[];
};

type TarotCard = {
  id: number;
  name: string;
  title: string;
  interpretations: {
    love: TarotInterpretation;
    money: TarotInterpretation;
    work: TarotInterpretation;
    advice: TarotInterpretation;
  };
};

// 셔플 애니메이션 타로 카드 피커
type ShuffleStage =
  | "intro" // 카드들이 중앙으로 모이는 애니메이션
  | "stacked" // 덱이 쌓여있는 상태 (클릭 대기)
  | "shuffling" // 셔플 애니메이션
  | "spread" // 3장 펼쳐진 상태
  | "selecting" // 카드 선택 중
  | "flipping" // 카드 뒤집기
  | "result"; // 결과 표시

// 날짜 기반 시드 생성 함수 (매일 자정 기준)
function getDateSeed(): number {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  // 날짜를 숫자로 변환 (예: 2024-01-16 -> 20240116)
  return year * 10000 + month * 100 + day;
}

// 시드 기반 랜덤 생성기 (간단한 LCG 알고리즘)
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

// 날짜 기반으로 고정된 3장의 카드 인덱스 반환
function getTodayCardIndices(totalCards: number): number[] {
  const seed = getDateSeed();
  const random = seededRandom(seed);

  const indices: number[] = [];
  const available = Array.from({ length: totalCards }, (_, i) => i);

  // 3장 선택
  for (let i = 0; i < 3; i++) {
    const randomIndex = Math.floor(random() * available.length);
    indices.push(available[randomIndex]);
    available.splice(randomIndex, 1);
  }

  return indices;
}

function TarotShufflePicker({
  cards,
  onCardSelect,
  stage,
  selectedCardIndex,
  selectedSpreadIndex,
  shufflePhase = 0,
}: {
  cards: TarotCard[];
  onCardSelect?: (cardIndex: number, spreadIndex: number) => void;
  stage: ShuffleStage;
  selectedCardIndex: number | null;
  selectedSpreadIndex: number | null;
  shufflePhase?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  // 오늘의 고정된 3장의 카드 인덱스
  const [spreadCards, setSpreadCards] = useState<number[]>([]);

  // 미리 계산된 랜덤 위치값들 (hydration 에러 방지)
  const [randomPositions, setRandomPositions] = useState<{
    intro: { x: number; y: number; rotation: number }[];
    stacked: { offset: number; rotation: number }[];
    shuffle: { x: number; y: number; rotation: number }[];
  }>({ intro: [], stacked: [], shuffle: [] });

  // 클라이언트에서만 랜덤값 생성
  useEffect(() => {
    setIsClient(true);
    setRandomPositions({
      intro: cards.map(() => ({
        x: (Math.random() - 0.5) * 300,
        y: (Math.random() - 0.5) * 200 - 30,
        rotation: (Math.random() - 0.5) * 40,
      })),
      stacked: cards.map((_, i) => ({
        offset: (i - cards.length / 2) * 0.4,
        rotation: 0,
      })),
      shuffle: cards.map(() => ({
        x: (Math.random() - 0.5) * 150,
        y: (Math.random() - 0.5) * 60,
        rotation: (Math.random() - 0.5) * 20,
      })),
    });
  }, [cards.length]);

  // stage가 intro가 되면 오늘의 카드 3장 선택 (날짜 기반)
  useEffect(() => {
    if (stage === "intro" && isClient) {
      const todayIndices = getTodayCardIndices(cards.length);
      setSpreadCards(todayIndices);
    }
  }, [stage, cards.length, isClient]);

  const handleSpreadCardClick = (spreadIndex: number, cardIndex: number) => {
    if (stage === "spread" && onCardSelect) {
      onCardSelect(cardIndex, spreadIndex);
    }
  };

  // 클라이언트 준비 전에는 기본 렌더링
  if (!isClient) {
    return (
      <div ref={containerRef} className="tarotShuffleContainer">
        <div className="tarotShuffleCard">
          <div className="tarotFlip">
            <div className="tarotInner">
              <div className="tarotFace tarotBack" />
              <div className="tarotFace tarotFront">LUMEN</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="tarotShuffleContainer">
      {/* 인트로/스택/셔플 단계의 모든 카드 */}
      {(stage === "intro" || stage === "stacked" || stage === "shuffling") &&
        cards.map((card, i) => {
          let transform = "";
          let opacity = 1;
          let zIndex = i;
          let transition = "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)";

          if (stage === "intro") {
            const pos = randomPositions.intro[i] || { x: 0, y: 0, rotation: 0 };
            transform = `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) rotate(${pos.rotation}deg)`;
            opacity = 0.9;
            zIndex = i;
          } else if (stage === "stacked") {
            const pos = randomPositions.stacked[i] || {
              offset: 0,
              rotation: 0,
            };
            transform = `translate(calc(-50% + ${
              pos.offset
            }px), calc(-50% + ${-pos.offset}px)) rotateX(0deg) rotateY(0deg) rotateZ(0deg)`;
            opacity = 1;
            zIndex = i;
          } else if (stage === "shuffling") {
            const pos = randomPositions.shuffle[i] || {
              x: 0,
              y: 0,
              rotation: 0,
            };
            const direction = shufflePhase % 2 === 0 ? 1 : -1;
            const groupIndex = i % 3;
            let xMove = 0;
            let yMove = 0;

            if (groupIndex === 0) {
              xMove = direction * 120;
              yMove = -20;
            } else if (groupIndex === 1) {
              xMove = direction * -100;
              yMove = 30;
            } else {
              xMove = direction * 60;
              yMove = -50;
            }

            transform = `translate(calc(-50% + ${
              xMove + pos.x * 0.3
            }px), calc(-50% + ${yMove + pos.y * 0.2}px)) rotate(${
              pos.rotation * direction
            }deg)`;
            transition = `all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) ${
              i * 0.008
            }s`;
            zIndex = shufflePhase % 2 === 0 ? i : cards.length - i;
          }

          return (
            <div
              key={card.id}
              className={`tarotShuffleCard stage-${stage}`}
              style={{
                transform,
                opacity,
                zIndex,
                transition,
                cursor: stage === "stacked" ? "pointer" : "default",
              }}
            >
              <div className="tarotCardBack">
                <span className="tarotCardMoon">☽</span>
                <span className="tarotCardLogo">LUMEN</span>
              </div>
            </div>
          );
        })}

      {/* 스프레드 단계: 3장 일렬 배치 */}
      {(stage === "spread" ||
        stage === "selecting" ||
        stage === "flipping" ||
        stage === "result") &&
        spreadCards.map((cardIndex, spreadIndex) => {
          const card = cards[cardIndex];
          const isSelected = selectedSpreadIndex === spreadIndex;

          let transform = "";
          let opacity = 1;
          let zIndex = spreadIndex;

          if (stage === "spread") {
            const xOffset = (spreadIndex - 1) * 105;
            transform = `translate(calc(-50% + ${xOffset}px), -50%)`;
            opacity = 1;
            zIndex = spreadIndex;
          } else if (stage === "selecting") {
            if (isSelected) {
              transform = `translate(-50%, calc(-50% - 20px)) scale(1.1)`;
              opacity = 1;
              zIndex = 100;
            } else {
              const xOffset = (spreadIndex - 1) * 105;
              transform = `translate(calc(-50% + ${xOffset}px), -50%) scale(0.95)`;
              opacity = 0.4;
              zIndex = spreadIndex;
            }
          } else if (stage === "flipping" || stage === "result") {
            if (isSelected) {
              transform = `translate(-50%, calc(-50% - 20px)) scale(1.1)`;
              opacity = 1;
              zIndex = 100;
            } else {
              opacity = 0;
              transform = `translate(-50%, -50%) scale(0.5)`;
              zIndex = 0;
            }
          }

          const isFlipped = (stage === "flipping" || stage === "result") && isSelected;

          return (
            <div
              key={card.id}
              className={`tarotShuffleCard spread stage-${stage} ${
                isSelected ? "selected" : ""
              }`}
              style={{
                transform,
                opacity,
                zIndex,
                transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
                cursor: stage === "spread" ? "pointer" : "default",
              }}
              onClick={() => handleSpreadCardClick(spreadIndex, cardIndex)}
            >
              {/* 카드 플립 컨테이너 */}
              <div className="tarotCardFlip">
                <div className={`tarotCardFlipInner ${isFlipped ? 'flipped' : ''}`}>
                  {/* 뒷면 */}
                  <div className="tarotCardBack tarotCardFace">
                    <span className="tarotCardMoon">☽</span>
                    <span className="tarotCardLogo">LUMEN</span>
                  </div>
                  {/* 앞면 */}
                  <div className="tarotCardFront tarotCardFace">
                    <div className="tarotCardFrontContent">
                      {card.name}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

      {/* 덱 클릭 안내 오버레이 */}
      {stage === "stacked" && (
        <div className="deckClickOverlay">
          <span>탭하여 셔플</span>
        </div>
      )}
    </div>
  );
}

export default function TarotPage() {
  const router = useRouter();
  const [picked, setPicked] = useState<number | null>(null);
  const [pickedSpreadIndex, setPickedSpreadIndex] = useState<number | null>(
    null
  );
  const [flipped, setFlipped] = useState(false);
  const [canHover, setCanHover] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<TarotCategory>("advice");

  // 단계별 상태 관리
  const [stage, setStage] = useState<ShuffleStage>("intro");

  useEffect(() => {
    const m = window.matchMedia("(hover: hover) and (pointer: fine)");
    const apply = () => setCanHover(m.matches);
    apply();
    m.addEventListener?.("change", apply);
    return () => m.removeEventListener?.("change", apply);
  }, []);

  // 페이지 로드 시 intro -> stacked 애니메이션
  useEffect(() => {
    if (stage === "intro") {
      const timer = setTimeout(() => {
        setStage("stacked");
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [stage]);

  // 셔플 카운터
  const [shuffleCount, setShuffleCount] = useState(0);

  // 덱 클릭 시 셔플 시작
  const startShuffle = () => {
    if (stage !== "stacked") return;
    setShuffleCount(0);
    setStage("shuffling");
  };

  // 셔플 애니메이션 반복 (3번 섞기)
  useEffect(() => {
    if (stage === "shuffling") {
      if (shuffleCount < 3) {
        const timer = setTimeout(() => {
          setShuffleCount((c) => c + 1);
        }, 400);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          setStage("spread");
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [stage, shuffleCount]);

  // 타로 카드 데이터 (JSON에서 로드)
  const tarotDeck = useMemo(() => {
    return tarotCardsData as TarotCard[];
  }, []);

  const resetTarot = () => {
    setPicked(null);
    setPickedSpreadIndex(null);
    setFlipped(false);
    setStage("intro");
    setSelectedCategory("advice");
  };

  const pickTarot = (cardIndex: number, spreadIndex: number) => {
    if (picked !== null) return;
    setPicked(cardIndex);
    setPickedSpreadIndex(spreadIndex);

    // 2단계: 카드 선택 (나머지 fade out)
    setStage("selecting");

    // 3단계: 카드 뒤집기 (0.5초 후)
    setTimeout(() => {
      setStage("flipping");
      setFlipped(true);

      // 4단계: 해석 표시 (뒤집기 완료 후)
      setTimeout(() => {
        setStage("result");
      }, 700);
    }, 500);
  };

  const tarotResult = useMemo(() => {
    if (picked === null) return null;
    return tarotDeck[picked];
  }, [picked, tarotDeck]);

  const currentInterpretation = useMemo(() => {
    if (!tarotResult) return null;
    return tarotResult.interpretations[selectedCategory];
  }, [tarotResult, selectedCategory]);

  const saveTarot = (isPremium = false) => {
    if (!tarotResult || !currentInterpretation) return;

    const categoryLabels: Record<TarotCategory, string> = {
      love: "연애",
      money: "금전",
      work: "직장",
      advice: "조언",
    };

    const item: HistoryItem = {
      id: uid(),
      type: "TAROT",
      title: `[타로·${categoryLabels[selectedCategory]}] ${currentInterpretation.title}`,
      text: currentInterpretation.text,
      tags: currentInterpretation.tags,
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

  const categoryLabels: Record<TarotCategory, string> = {
    love: "연애",
    money: "금전",
    work: "직장",
    advice: "조언",
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

            <h1 className="h2 stagger d1">오늘의 타로</h1>
            <p className="p stagger d2">
              {stage === "stacked" && "덱을 탭하여 셔플하세요"}
              {stage === "spread" && "직감으로 한 장을 선택하세요"}
              {(stage === "intro" || stage === "shuffling") &&
                "카드를 섞고 있어요..."}
              {(stage === "selecting" || stage === "flipping") &&
                "카드를 확인하고 있어요..."}
              {stage === "result" && "오늘의 메시지입니다"}
            </p>

            <div
              className="tarotArea stagger d3"
              onPointerDown={onEmptyTapReset}
              onClick={() => {
                if (stage === "stacked") {
                  startShuffle();
                }
              }}
            >
              <TarotShufflePicker
                cards={tarotDeck}
                onCardSelect={(cardIndex, spreadIndex) => {
                  if (stage === "spread") {
                    pickTarot(cardIndex, spreadIndex);
                  }
                }}
                stage={stage}
                selectedCardIndex={picked}
                selectedSpreadIndex={pickedSpreadIndex}
                shufflePhase={shuffleCount}
              />
            </div>

            {tarotResult && stage === "result" ? (
              <div
                className="card cardPad lift stagger d4 tarotResultCard"
                style={{ marginTop: 16 }}
              >
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

                {/* 카테고리 선택 탭 */}
                <div
                  className="tabRow"
                  style={{ marginTop: 12 }}
                  aria-label="타로 카테고리"
                >
                  {(Object.keys(categoryLabels) as TarotCategory[]).map(
                    (category) => (
                      <button
                        key={category}
                        className={`tabBtn ${
                          category === selectedCategory ? "on" : ""
                        }`}
                        onClick={() => setSelectedCategory(category)}
                      >
                        {categoryLabels[category]}
                      </button>
                    )
                  )}
                </div>

                {currentInterpretation && (
                  <>
                    <div
                      style={{
                        marginTop: 12,
                        fontWeight: 900,
                        letterSpacing: -0.01,
                      }}
                    >
                      {currentInterpretation.title}
                    </div>
                    <div className="p">{currentInterpretation.text}</div>

                    <div className="chipRow">
                      {currentInterpretation.tags.map((t) => (
                        <span className="chip" key={t}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                  <button
                    className="btn btnPrimary btnWide"
                    onClick={() => saveTarot(false)}
                  >
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

                  <Link
                    href="/"
                    className="btn btnGhost btnWide"
                    style={{ textAlign: "center", textDecoration: "none" }}
                  >
                    돌아가기
                  </Link>
                </div>

                <div className="smallHelp" style={{ marginTop: 10 }}>
                  * 매일 자정(00:00)을 기준으로 새로운 카드가 선택돼요.
                </div>
              </div>
            ) : null}

            {/* 자세히보기 팝업 - 제거됨 (간소화) */}
          </div>
        </section>
      </div>
    </main>
  );
}
