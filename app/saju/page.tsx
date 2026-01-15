"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type SajuTopic = "연애" | "재물" | "직장" | "건강";

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

export default function SajuPage() {
  const router = useRouter();
  const [birth, setBirth] = useState("");
  const [time, setTime] = useState("");
  const [gender, setGender] = useState<"female" | "male" | "none">("female");
  const [topic, setTopic] = useState<SajuTopic>("연애");
  const [showResult, setShowResult] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const sajuBase = useMemo(() => {
    const hasBirth = birth.trim().length >= 8;
    const hasTime = time.trim().length >= 4;
    const g =
      gender === "female" ? "여성" : gender === "male" ? "남성" : "선택 안 함";
    const note = hasBirth
      ? `입력 기반(데모) · ${g}${hasTime ? " · 시간 포함" : ""}`
      : "기본 데모 결과";
    return note;
  }, [birth, time, gender]);

  const sajuResultByTopic = useMemo(() => {
    const map: Record<
      SajuTopic,
      { title: string; text: string; detailText: string; tags: string[] }
    > = {
      연애: {
        title: "관계의 결을 정리하면, 마음이 편해져요.",
        text: "오늘은 밀어붙이기보다 '대화의 여백'을 남기는 편이 좋아요.",
        detailText: "오늘은 밀어붙이기보다 '대화의 여백'을 남기는 편이 좋아요. 말이 줄면 진심이 더 또렷해져요.\n\n관계에서 가장 중요한 것은 때로는 말하지 않는 것일 수 있어요. 오늘은 상대방의 말을 끝까지 듣고, 자신의 의견을 바로 내세우기보다 잠시 멈춰보는 시간을 가져보세요. 그 여백 속에서 진짜 마음이 보일 거예요.\n\n급하게 결론을 내리려 하지 말고, 서로의 공간을 존중하는 것이 오늘의 핵심이에요. 작은 배려가 큰 신뢰로 이어질 수 있는 날입니다.",
        tags: ["배려", "거리감", "정리"],
      },
      재물: {
        title: "지출의 '이유'를 확인하면 흐름이 바뀌어요.",
        text: "오늘은 작은 충동이 커질 수 있어요. 구매 전에 '왜 필요하지?'를 한 번만 묻고 결정하면 깔끔해요.",
        detailText: "오늘은 작은 충동이 커질 수 있어요. 구매 전에 '왜 필요하지?'를 한 번만 묻고 결정하면 깔끔해요.\n\n재물의 흐름은 단순히 돈을 모으는 것이 아니라, 자신의 가치관을 명확히 하는 것에서 시작돼요. 오늘 지출하려는 것들이 정말 필요한 것인지, 아니면 일시적인 욕구인지 구분해보세요.\n\n작은 절제가 큰 자유로 이어질 수 있어요. 불필요한 지출을 줄이면 진짜로 원하는 것에 집중할 수 있는 여유가 생깁니다. 오늘은 현명한 선택이 미래의 재물 흐름을 바꿀 수 있는 중요한 날이에요.",
        tags: ["절제", "기준", "현명"],
      },
      직장: {
        title: "속도보다 정렬이 먼저인 날이에요.",
        text: "할 일을 늘리기보다 우선순위를 맞추면 시간이 벌려요. 오늘은 '정리한 사람이 이기는 날'이에요.",
        detailText: "할 일을 늘리기보다 우선순위를 맞추면 시간이 벌려요. 오늘은 '정리한 사람이 이기는 날'이에요.\n\n바쁘게 움직이는 것보다 무엇을 먼저 해야 할지 명확히 하는 것이 오늘의 성공 열쇠예요. 업무 목록을 다시 한 번 점검하고, 정말 중요한 것부터 차근차근 처리해보세요.\n\n무작정 빠르게 일을 늘리기보다, 한 가지씩 완벽하게 마무리하는 것이 더 큰 성과를 만들어낼 거예요. 오늘은 집중력이 중요한 날이니, 주변의 산만함을 줄이고 본질에 집중해보세요.",
        tags: ["우선순위", "집중", "정렬"],
      },
      건강: {
        title: "몸이 보내는 작은 신호를 놓치지 마세요.",
        text: "오늘은 무리보다 루틴이 중요해요. 짧은 스트레칭과 물 한 컵만으로도 컨디션이 달라져요.",
        detailText: "오늘은 무리보다 루틴이 중요해요. 짧은 스트레칭과 물 한 컵만으로도 컨디션이 달라져요.\n\n건강은 하루아침에 만들어지는 것이 아니라, 작은 습관들이 쌓여서 만들어지는 거예요. 오늘 몸이 보내는 신호에 귀 기울여보세요. 피곤하다면 잠시 휴식을, 목이 마르다면 물을 마시는 것처럼 말이에요.\n\n큰 변화를 시도하기보다, 지금 할 수 있는 작은 것부터 시작해보세요. 5분 스트레칭, 충분한 물 섭취, 규칙적인 식사 시간. 이런 작은 루틴들이 모여서 건강한 하루를 만들어줄 거예요.",
        tags: ["루틴", "회복", "호흡"],
      },
    };
    return map[topic];
  }, [topic]);

  const topics: SajuTopic[] = ["연애", "재물", "직장", "건강"];

  const saveSaju = () => {
    const item: HistoryItem = {
      id: uid(),
      type: "SAJU",
      title: `[사주] ${topic} · ${sajuResultByTopic.title}`,
      text: `${sajuBase}\n\n${sajuResultByTopic.text}`,
      tags: [topic, ...sajuResultByTopic.tags],
      createdAt: Date.now(),
      isPremium: false,
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
              <Link href="/" className="btnTiny" style={{ textDecoration: "none" }}>
                ← 돌아가기
              </Link>
            </div>

            <h1 className="h2 stagger d1">사주 조회(데모)</h1>
            <p className="p stagger d2">
              {sajuBase} · 오늘의 흐름을 "짧게, 과장 없이" 정리해요.
            </p>

            <div className="form left stagger d3" style={{ marginTop: 16 }}>
              <div className="field">
                <div className="label">생년월일</div>
                <input
                  className="input"
                  placeholder="예: 1996-08-17"
                  value={birth}
                  onChange={(e) => setBirth(e.target.value)}
                />
              </div>

              <div className="row2">
                <div className="field">
                  <div className="label">태어난 시간(선택)</div>
                  <input
                    className="input"
                    placeholder="예: 07:30"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
                <div className="field">
                  <div className="label">성별</div>
                  <select
                    className="input"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                  >
                    <option value="female">여성</option>
                    <option value="male">남성</option>
                    <option value="none">선택 안 함</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="tabRow stagger d4" aria-label="사주 분야" style={{ marginTop: 16 }}>
              {topics.map((t) => (
                <button
                  key={t}
                  className={`tabBtn ${t === topic ? "on" : ""}`}
                  onClick={() => {
                    setTopic(t);
                    setShowResult(false); // 탭 변경 시 결과 숨김
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
              <button
                className="btn btnPrimary btnWide"
                onClick={() => setShowResult(true)}
                disabled={showResult}
              >
                {showResult ? "조회 완료" : "사주 확인하기"}
              </button>
            </div>

            {showResult && (
              <div className="card cardPad lift stagger d5" style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 900, letterSpacing: -0.01 }}>
                  {sajuResultByTopic.title}
                </div>
                <div className="p" style={{ marginTop: 8 }}>
                  {sajuResultByTopic.text}
                </div>

                <div className="chipRow">
                  <span className="chip">{topic}</span>
                  {sajuResultByTopic.tags.map((t) => (
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
                  <button className="btn btnPrimary btnWide" onClick={saveSaju}>
                    기록에 저장하기
                  </button>
                  <Link href="/" className="btn btnGhost btnWide" style={{ textAlign: "center", textDecoration: "none" }}>
                    돌아가기
                  </Link>
                </div>

                <div className="smallHelp" style={{ marginTop: 8 }}>
                  * 이 결과는 데모예요. API 연결 후 실제 계산 결과로 교체하면 돼요.
                </div>
              </div>
            )}

            {/* 자세히보기 팝업 */}
            {showDetailModal && (
              <div className="modalOverlay" onClick={() => setShowDetailModal(false)}>
                <div className="modalSheet" onClick={(e) => e.stopPropagation()}>
                  <div className="modalHeader">
                    <div className="modalTitle">{sajuResultByTopic.title}</div>
                    <button
                      className="closeBtn"
                      onClick={() => setShowDetailModal(false)}
                      aria-label="닫기"
                    >
                      ×
                    </button>
                  </div>
                  <div className="modalBody">
                    <div className="p" style={{ whiteSpace: "pre-line", lineHeight: 1.8 }}>
                      {sajuResultByTopic.detailText}
                    </div>
                    <div className="chipRow" style={{ marginTop: 16 }}>
                      <span className="chip">{topic}</span>
                      {sajuResultByTopic.tags.map((t) => (
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
