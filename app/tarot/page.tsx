"use client";

import { useEffect, useMemo, useState, useRef } from "react";
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

type TarotCard = {
  id: number;
  name: string;
  title: string;
  text: string;
  detailText: string;
  tags: string[];
  suit?: string;
  number?: string;
};

// 부채꼴 덱 + 개별 카드 드래그 UX
function TarotFanPicker({
  cards,
  onCardSelect,
  stage,
  selectedCardIndex,
}: {
  cards: TarotCard[];
  onCardSelect?: (index: number) => void;
  stage: "deck" | "selecting" | "flipping" | "result";
  selectedCardIndex: number | null;
}) {
  // 덱 단계에서만 드래그 활성화
  const isDeckActive = stage === "deck";

  // 덱 탐색 상태
  const [currentIndex, setCurrentIndex] = useState(
    Math.floor(cards.length / 2)
  );
  const [deckOffsetX, setDeckOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [draggingCardIndex, setDraggingCardIndex] = useState<number | null>(
    null
  );
  const [dragStartX, setDragStartX] = useState(0);
  const [pendingIndexChange, setPendingIndexChange] = useState<number | null>(
    null
  );
  const [isResetting, setIsResetting] = useState(false); // offset 리셋 중 transition 비활성화
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null); // requestAnimationFrame ID 추적

  // stage가 "deck"으로 변경될 때 currentIndex 초기화
  useEffect(() => {
    if (stage === "deck") {
      setCurrentIndex(Math.floor(cards.length / 2));
      setDeckOffsetX(0);
      setIsDragging(false);
      setDraggingCardIndex(null);
    }
  }, [stage, cards.length]);

  // 카드별 드래그 핸들러 (덱 탐색용)
  const handleCardPointerDown = (e: React.PointerEvent, cardIndex: number) => {
    if (!isDeckActive) return;
    e.stopPropagation();
    e.preventDefault();

    // 예약된 애니메이션 프레임 취소
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    setIsDragging(true);
    setDraggingCardIndex(cardIndex);
    setDragStartX(e.clientX);
    setDeckOffsetX(0);

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleCardPointerMove = (e: React.PointerEvent) => {
    if (!isDragging || draggingCardIndex === null || !isDeckActive) return;

    const deltaX = e.clientX - dragStartX;
    // 드래그 중에는 임시 오프셋만 사용 (카드만 움직이고 덱 컨테이너는 고정)
    // 충분히 큰 범위 허용 (여러 카드 이동 가능)
    const maxOffset = 600;
    const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, deltaX));

    // 이미 예약된 프레임이 있으면 취소하고 새로 예약
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    // requestAnimationFrame으로 부드러운 업데이트 (컨테이너는 고정, 카드만 움직임)
    rafRef.current = requestAnimationFrame(() => {
      setDeckOffsetX(clampedOffset);
      rafRef.current = null;
    });
  };

  const handleCardPointerUp = (e: React.PointerEvent) => {
    if (!isDragging || draggingCardIndex === null) return;

    // 예약된 애니메이션 프레임 취소
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const deltaX = e.clientX - dragStartX;
    const threshold = 60; // 스와이프 임계값 (카드 절반 정도)

    // 클릭 처리 (드래그가 거의 없으면)
    if (Math.abs(deltaX) < 10) {
      if (draggingCardIndex === currentIndex && onCardSelect) {
        // 클릭 시에도 부드럽게 리셋되도록 약간의 지연 추가
        setIsDragging(false);
        setDraggingCardIndex(null);
        // 리셋 애니메이션을 위해 transition을 활성화
        requestAnimationFrame(() => {
          setDeckOffsetX(0);
        });
        onCardSelect(currentIndex);
      } else {
        // setState를 묶어서 업데이트
        setIsDragging(false);
        setDraggingCardIndex(null);
        requestAnimationFrame(() => {
          setDeckOffsetX(0);
        });
      }
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      return;
    }

    // 드래그가 끝났을 때: deltaX를 기반으로 다음 카드 결정
    let nextIndex: number | null = null;
    let cardsToMove = 0;

    // 드래그 거리를 카드 간격(56px)으로 나누어 몇 장 이동할지 계산
    if (Math.abs(deltaX) >= threshold) {
      cardsToMove = Math.round(deltaX / 56); // 카드 간격으로 나눔

      if (deltaX > 0 && currentIndex > 0) {
        // 오른쪽으로 드래그 -> 이전 카드들로 이동 (currentIndex 감소)
        nextIndex = Math.max(0, currentIndex - Math.abs(cardsToMove));
      } else if (deltaX < 0 && currentIndex < cards.length - 1) {
        // 왼쪽으로 드래그 -> 다음 카드들로 이동 (currentIndex 증가)
        nextIndex = Math.min(
          cards.length - 1,
          currentIndex + Math.abs(cardsToMove)
        );
      }
    }

    // setState를 묶어서 업데이트 (한 번의 리렌더링으로 처리)
    if (nextIndex !== null && nextIndex !== currentIndex) {
      // 카드 인덱스 변경 및 오프셋 리셋 (덱 컨테이너는 고정, 카드만 새로운 위치로 이동)
      setIsDragging(false);
      setDraggingCardIndex(null);

      // transition 없이 즉시 인덱스 변경 (덱 컨테이너는 고정 상태 유지)
      setIsResetting(true);
      setCurrentIndex(nextIndex);

      // 다음 프레임에서 transition 활성화 후 오프셋 리셋
      // 이렇게 하면 컨테이너는 고정되고 카드만 부드럽게 새로운 위치로 이동
      requestAnimationFrame(() => {
        setIsResetting(false);
        setDeckOffsetX(0);
      });
    } else {
      // 충분히 움직이지 않았거나 같은 위치면 원래 위치로 복귀 (덱 컨테이너 고정 유지)
      setIsDragging(false);
      setDraggingCardIndex(null);
      requestAnimationFrame(() => {
        setDeckOffsetX(0);
      });
    }

    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  // transitionend 이벤트 핸들러
  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    // transform transition이 끝났을 때만 처리
    if (e.propertyName !== "transform") return;
    if (pendingIndexChange === null) return;

    const nextIndex = pendingIndexChange;

    // currentIndex 변경 및 deckOffsetX 리셋 (transition 없이)
    setIsResetting(true);
    setCurrentIndex(nextIndex);
    setPendingIndexChange(null);

    // 다음 프레임에서 오프셋 리셋 및 transition 재활성화
    requestAnimationFrame(() => {
      setDeckOffsetX(0);
      requestAnimationFrame(() => {
        setIsResetting(false);
      });
    });
  };

  return (
    <div
      ref={containerRef}
      className="tarotFanPickerContainer"
      style={{
        pointerEvents: isDeckActive ? "auto" : "none",
      }}
    >
      {cards.map((card, i) => {
        const isSelected = selectedCardIndex === i;
        const isSelecting = stage === "selecting";
        const isFlipping = stage === "flipping";
        const isResult = stage === "result";
        const isThisCardDragging = draggingCardIndex === i; // 이 카드가 드래그 중인지

        // 덱 단계: 부채꼴 배치 + 덱 탐색
        if (isDeckActive && !isSelected) {
          const offset = i - currentIndex;
          // 회전 각도: offset * 6deg
          const angle = offset * 6;
          // X 이동: offset * 56px + 덱 오프셋 (모든 카드가 함께 움직임)
          const baseX = offset * 56;
          const x = baseX + deckOffsetX;
          // Y 이동: abs(offset) * 6px
          const y = Math.abs(offset) * 6;

          // 드래그 중인지 확인 (모든 카드가 동일하게 처리됨)
          const isCenterCard = offset === 0; // 중앙 카드

          return (
            <div
              key={card.id}
              className={`tarotFanPickerCard ${
                isThisCardDragging ? "dragging" : ""
              } stage-${stage}`}
              style={{
                transform: `rotate(${angle}deg) translate3d(${x}px, ${y}px, 0) scale(${
                  isThisCardDragging ? 1.03 : 1
                })`,
                transformOrigin: "bottom center",
                opacity:
                  Math.abs(offset) <= 5
                    ? 1
                    : Math.max(0, 1 - Math.abs(offset) * 0.15),
                zIndex: isThisCardDragging ? 1000 : 100 - Math.abs(offset),
                transition:
                  isDragging || isResetting
                    ? "none" // 드래그 중이거나 리셋 중에는 모든 카드의 애니메이션 없음 (전역 isDragging 상태 사용)
                    : "transform 450ms cubic-bezier(0.25, 0.46, 0.45, 0.94)", // 스냅 및 일반 상태에서 transition 사용 (더 부드러운 easing)
                pointerEvents: "auto",
              }}
              onPointerDown={(e) => handleCardPointerDown(e, i)}
              onPointerMove={handleCardPointerMove}
              onPointerUp={handleCardPointerUp}
              onPointerLeave={handleCardPointerUp}
              onTransitionEnd={undefined}
            >
              <div className="tarotFlip">
                <div className="tarotInner">
                  <div className="tarotFace tarotBack" />
                  <div className="tarotFace tarotFront">LUMEN</div>
                </div>
              </div>
            </div>
          );
        }

        // 선택/뒤집기/결과 단계: 기존 로직
        let transform = "";
        let opacity = 1;
        let scale = 1;
        let translateX = 0;
        let translateY = 0;

        if (isSelecting) {
          // 2단계: 선택 중
          if (isSelected) {
            translateX = 0;
            translateY = -40;
            scale = 1.2;
            opacity = 1;
            transform = `rotate(0deg) translateX(${translateX}px) translateY(${translateY}px) scale(${scale})`;
          } else {
            opacity = 0;
            scale = 0.3;
            transform = `rotate(0deg) scale(${scale})`;
          }
        } else if (isFlipping || isResult) {
          // 3-4단계: 선택된 카드만 표시
          if (isSelected) {
            translateX = 0;
            translateY = -40;
            scale = 1.2;
            opacity = 1;
            transform = `rotate(0deg) translateX(${translateX}px) translateY(${translateY}px) scale(${scale})`;
          } else {
            opacity = 0;
            transform = `rotate(0deg)`;
          }
        }

        return (
          <div
            key={card.id}
            className={`tarotFanPickerCard ${
              isSelected ? "selected" : ""
            } stage-${stage}`}
            style={{
              transform,
              transformOrigin: "bottom center",
              opacity,
              zIndex: isSelected
                ? 100
                : 50 - Math.abs(i - (selectedCardIndex || 0)),
              transition: isSelecting
                ? "transform 0.6s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.6s ease"
                : "none",
            }}
          >
            <div className="tarotFlip">
              <div
                className={`tarotInner ${
                  isFlipping || isResult ? "flipped" : ""
                }`}
              >
                <div className="tarotFace tarotBack" />
                <div className="tarotFace tarotFront">
                  {isResult ? "OPEN" : "LUMEN"}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function TarotPage() {
  const router = useRouter();
  const [picked, setPicked] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [canHover, setCanHover] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [swipeStart, setSwipeStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [swipeOffset, setSwipeOffset] = useState(0);

  // 단계별 상태 관리
  const [stage, setStage] = useState<
    "deck" | "selecting" | "flipping" | "result"
  >("deck");

  useEffect(() => {
    const m = window.matchMedia("(hover: hover) and (pointer: fine)");
    const apply = () => setCanHover(m.matches);
    apply();
    m.addEventListener?.("change", apply);
    return () => m.removeEventListener?.("change", apply);
  }, []);

  // 78장의 타로 카드 생성
  const tarotDeck = useMemo(() => {
    const cards: TarotCard[] = [];

    // 메이저 아르카나 22장 (0-21)
    const majorArcana = [
      {
        name: "THE FOOL",
        title: "새로운 시작의 여정",
        text: "오늘은 두려움보다 호기심을 선택하는 날이에요.",
        tags: ["시작", "자유", "모험"],
      },
      {
        name: "THE MAGICIAN",
        title: "의지로 현실을 만들어요",
        text: "오늘은 생각을 행동으로 옮길 수 있는 날이에요.",
        tags: ["의지", "집중", "실행"],
      },
      {
        name: "THE HIGH PRIESTESS",
        title: "직감이 답을 알려줘요",
        text: "오늘은 논리보다 내면의 목소리를 들어보세요.",
        tags: ["직감", "침묵", "지혜"],
      },
      {
        name: "THE EMPRESS",
        title: "풍요와 성장의 시간",
        text: "오늘은 자연스러운 흐름을 따르는 것이 좋아요.",
        tags: ["풍요", "성장", "배려"],
      },
      {
        name: "THE EMPEROR",
        title: "구조와 안정을 만들어요",
        text: "오늘은 체계적으로 정리하는 것이 중요해요.",
        tags: ["구조", "안정", "리더십"],
      },
      {
        name: "THE HIEROPHANT",
        title: "전통과 가르침을 따르세요",
        text: "오늘은 검증된 방법을 따르는 것이 좋아요.",
        tags: ["전통", "가르침", "규칙"],
      },
      {
        name: "THE LOVERS",
        title: "선택과 조화의 시간",
        text: "오늘은 중요한 결정을 내려야 할 때예요.",
        tags: ["선택", "조화", "관계"],
      },
      {
        name: "THE CHARIOT",
        title: "의지로 목표를 향해요",
        text: "오늘은 집중력으로 장애물을 넘어가요.",
        tags: ["의지", "집중", "승리"],
      },
      {
        name: "STRENGTH",
        title: "인내로 힘을 다스려요",
        text: "오늘은 부드러운 힘으로 극복하는 날이에요.",
        tags: ["인내", "자제", "용기"],
      },
      {
        name: "THE HERMIT",
        title: "내면의 빛을 찾아요",
        text: "오늘은 혼자만의 시간이 필요해요.",
        tags: ["성찰", "탐구", "고독"],
      },
      {
        name: "WHEEL OF FORTUNE",
        title: "변화의 순환을 받아들이세요",
        text: "오늘은 흐름에 맡기는 것이 좋아요.",
        tags: ["변화", "순환", "운명"],
      },
      {
        name: "JUSTICE",
        title: "균형과 공정함을 찾아요",
        text: "오늘은 객관적인 판단이 필요해요.",
        tags: ["공정", "균형", "책임"],
      },
      {
        name: "THE HANGED MAN",
        title: "새로운 관점을 얻어요",
        text: "오늘은 기다림과 관찰이 중요해요.",
        tags: ["기다림", "관점", "희생"],
      },
      {
        name: "DEATH",
        title: "끝과 새로운 시작",
        text: "오늘은 변화를 받아들이는 시간이에요.",
        tags: ["변화", "종료", "재생"],
      },
      {
        name: "TEMPERANCE",
        title: "균형이 답을 더 빨리 데려와요",
        text: "오늘은 한쪽으로 치우치기 쉬워요. 속도 조절만 해도 관계와 일정이 부드러워져요.",
        tags: ["균형", "조율", "호흡"],
      },
      {
        name: "THE DEVIL",
        title: "속박에서 벗어나요",
        text: "오늘은 나쁜 습관이나 패턴을 인식하는 날이에요.",
        tags: ["속박", "욕구", "해방"],
      },
      {
        name: "THE TOWER",
        title: "갑작스러운 변화를 받아들이세요",
        text: "오늘은 예상치 못한 변화가 있을 수 있어요.",
        tags: ["변화", "파괴", "각성"],
      },
      {
        name: "THE STAR",
        title: "희망과 영감이 찾아와요",
        text: "오늘은 긍정적인 에너지가 흐르는 날이에요.",
        tags: ["희망", "영감", "치유"],
      },
      {
        name: "THE MOON",
        title: "흐림 속에서도 길은 있어요",
        text: "오늘은 모든 걸 확정하기보다, 감정을 관찰하는 쪽이 좋아요.",
        tags: ["관찰", "직감", "유예"],
      },
      {
        name: "THE SUN",
        title: "정답이 아니라 '확신'이 자라요",
        text: "오늘은 작은 성취가 큰 자신감으로 이어져요. 시작을 미루지 말고, 가볍게 움직여봐요.",
        tags: ["성취", "기쁨", "시작"],
      },
      {
        name: "JUDGEMENT",
        title: "과거를 평가하고 새로 시작해요",
        text: "오늘은 자신을 되돌아보는 시간이에요.",
        tags: ["평가", "재생", "각성"],
      },
      {
        name: "THE WORLD",
        title: "완성과 새로운 시작",
        text: "오늘은 한 단계를 마무리하고 다음으로 나아가는 날이에요.",
        tags: ["완성", "성취", "새시작"],
      },
    ];

    // 마이너 아르카나 56장 생성
    const suits = [
      { name: "완드", symbol: "W" },
      { name: "컵", symbol: "C" },
      { name: "소드", symbol: "S" },
      { name: "펜타클", symbol: "P" },
    ];

    const numbers = [
      "Ace",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "Page",
      "Knight",
      "Queen",
      "King",
    ];

    // 메이저 아르카나 추가
    majorArcana.forEach((card, index) => {
      cards.push({
        id: index,
        name: card.name,
        title: card.title,
        text: card.text,
        detailText: `${card.text}\n\n${card.name} 카드는 ${card.tags.join(
          ", "
        )}의 의미를 담고 있어요. 오늘 하루 이 에너지를 기억하며 살펴보세요.`,
        tags: card.tags,
      });
    });

    // 마이너 아르카나 추가
    suits.forEach((suit, suitIndex) => {
      numbers.forEach((number, numIndex) => {
        const cardId = 22 + suitIndex * 14 + numIndex;
        cards.push({
          id: cardId,
          name: `${number} of ${suit.name}`,
          title: `${suit.name}의 ${number}`,
          text: `${suit.name}의 ${number} 카드가 오늘의 메시지를 전해요.`,
          detailText: `${suit.name}의 ${number} 카드는 ${suit.name}의 에너지를 ${number}의 의미로 전달해요. 오늘 하루 이 카드의 메시지를 마음에 새겨보세요.`,
          tags: [suit.name, number],
          suit: suit.name,
          number: number,
        });
      });
    });

    return cards;
  }, []);

  // 부채꼴 덱용 카드 21장 (임시)
  const fanDeckCards = useMemo(() => {
    return tarotDeck.slice(0, 21);
  }, [tarotDeck]);

  const resetTarot = () => {
    setPicked(null);
    setFlipped(false);
    setStage("deck");
    setCurrentCardIndex(0);
  };

  const pickTarot = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    setCurrentCardIndex(i);

    // 2단계: 카드 선택 (나머지 fade out)
    setStage("selecting");

    // 3단계: 카드 뒤집기 (0.7초 후)
    setTimeout(() => {
      setStage("flipping");
      setFlipped(true);

      // 4단계: 해석 표시 (뒤집기 완료 후)
      setTimeout(() => {
        setStage("result");
      }, 700); // flip 애니메이션 시간
    }, 600); // selecting 애니메이션 시간
  };

  const tarotResult = useMemo(() => {
    if (picked === null) return null;
    return tarotDeck[currentCardIndex];
  }, [picked, currentCardIndex, tarotDeck]);

  // 스와이프 핸들러
  const handleTouchStart = (e: React.TouchEvent) => {
    setSwipeStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setSwipeOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipeStart) return;
    const deltaX = e.touches[0].clientX - swipeStart.x;
    const deltaY = e.touches[0].clientY - swipeStart.y;

    // 수평 스와이프만 처리
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setSwipeOffset(deltaX);
    }
  };

  const handleTouchEnd = () => {
    if (!swipeStart) return;

    const threshold = 50; // 스와이프 임계값
    let newIndex = currentCardIndex;

    if (swipeOffset > threshold && currentCardIndex > 0) {
      // 오른쪽으로 스와이프 (이전 카드)
      newIndex = currentCardIndex - 1;
      setCurrentCardIndex(newIndex);
    } else if (
      swipeOffset < -threshold &&
      currentCardIndex < tarotDeck.length - 1
    ) {
      // 왼쪽으로 스와이프 (다음 카드)
      newIndex = currentCardIndex + 1;
      setCurrentCardIndex(newIndex);
    }

    // 스와이프가 끝나면 자동으로 중앙 카드 선택
    if (
      picked === null &&
      (swipeOffset > threshold || swipeOffset < -threshold)
    ) {
      setTimeout(() => {
        setPicked(newIndex);
        window.setTimeout(() => setFlipped(true), 220);
      }, 300); // 스와이프 애니메이션 후 선택
    }

    setSwipeStart(null);
    setSwipeOffset(0);
  };

  // 마우스 드래그 지원
  const handleMouseDown = (e: React.MouseEvent) => {
    setSwipeStart({ x: e.clientX, y: e.clientY });
    setSwipeOffset(0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!swipeStart) return;
    const deltaX = e.clientX - swipeStart.x;
    const deltaY = e.clientY - swipeStart.y;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setSwipeOffset(deltaX);
    }
  };

  const handleMouseUp = () => {
    if (!swipeStart) return;

    const threshold = 50;
    let newIndex = currentCardIndex;

    if (swipeOffset > threshold && currentCardIndex > 0) {
      newIndex = currentCardIndex - 1;
      setCurrentCardIndex(newIndex);
    } else if (
      swipeOffset < -threshold &&
      currentCardIndex < tarotDeck.length - 1
    ) {
      newIndex = currentCardIndex + 1;
      setCurrentCardIndex(newIndex);
    }

    // 스와이프가 끝나면 자동으로 중앙 카드 선택
    if (
      picked === null &&
      (swipeOffset > threshold || swipeOffset < -threshold)
    ) {
      setTimeout(() => {
        setPicked(newIndex);
        window.setTimeout(() => setFlipped(true), 220);
      }, 300); // 스와이프 애니메이션 후 선택
    }

    setSwipeStart(null);
    setSwipeOffset(0);
  };

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
            <div style={{ marginBottom: 16 }}>
              <Link
                href="/"
                className="btnTiny"
                style={{ textDecoration: "none" }}
              >
                ← 돌아가기
              </Link>
            </div>

            <h1 className="h2 stagger d1">타로 카드(데모)</h1>
            <p className="p stagger d2">
              부채꼴로 펼쳐진 카드를 드래그해서 탐색하고, 카드를 탭해서
              선택하세요.
            </p>

            <div
              className="tarotArea stagger d3"
              onPointerDown={onEmptyTapReset}
            >
              <TarotFanPicker
                cards={fanDeckCards}
                onCardSelect={(index) => {
                  // 중앙 카드(currentIndex)를 탭하면 선택
                  if (stage === "deck") {
                    pickTarot(index);
                  }
                }}
                stage={stage}
                selectedCardIndex={picked}
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

                <div
                  style={{
                    marginTop: 8,
                    fontWeight: 900,
                    letterSpacing: -0.01,
                  }}
                >
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

                <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                  <button
                    className="btn btnGhost btnWide"
                    onClick={() => setShowDetailModal(true)}
                  >
                    자세히보기
                  </button>
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
              </div>
            ) : stage === "deck" ? (
              <div
                className="stagger d4"
                style={{
                  marginTop: 16,
                  fontSize: 11,
                  color: "rgba(43,38,42,0.62)",
                  lineHeight: 1.6,
                  textAlign: "center",
                }}
              >
                좌우로 스와이프하여 카드를 탐색하고, 중앙 카드를 선택하세요.
              </div>
            ) : null}

            {/* 자세히보기 팝업 */}
            {showDetailModal && tarotResult && (
              <div
                className="modalOverlay"
                onClick={() => setShowDetailModal(false)}
              >
                <div
                  className="modalSheet"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="modalHeader">
                    <div className="modalTitle">
                      {tarotResult.name} · {tarotResult.title}
                    </div>
                    <button
                      className="closeBtn"
                      onClick={() => setShowDetailModal(false)}
                      aria-label="닫기"
                    >
                      ×
                    </button>
                  </div>
                  <div className="modalBody">
                    <div
                      className="p"
                      style={{ whiteSpace: "pre-line", lineHeight: 1.8 }}
                    >
                      {tarotResult.detailText}
                    </div>
                    <div className="chipRow" style={{ marginTop: 16 }}>
                      {tarotResult.tags.map((t) => (
                        <span className="chip" key={t}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
