"use client";

import { useState } from "react";

interface EmailInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (email: string, saveToHistory: boolean, saveEmail: boolean) => Promise<void>;
  title?: string;
  description?: string;
}

export default function EmailInputModal({
  isOpen,
  onClose,
  onConfirm,
  title = "이메일을 입력해주세요",
  description = "결과를 이메일로 받아보실 수 있어요.",
}: EmailInputModalProps) {
  const [email, setEmail] = useState("");
  const [saveToHistory, setSaveToHistory] = useState(false);
  const [saveEmail, setSaveEmail] = useState(false); // 이메일 저장 여부
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("올바른 이메일 주소를 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      await onConfirm(email, saveToHistory, saveEmail);
      setEmail("");
      setSaveToHistory(false);
      setSaveEmail(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했어요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalSheet" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div className="modalTitle">{title}</div>
          <button
            className="closeBtn"
            onClick={onClose}
            aria-label="닫기"
            disabled={isLoading}
          >
            ×
          </button>
        </div>
        <div className="modalBody">
          <p className="p" style={{ marginTop: 0, marginBottom: 16 }}>
            {description}
          </p>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="label">이메일</label>
              <input
                type="email"
                className="input"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                autoFocus
              />
              {error && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "rgba(220, 38, 38, 0.8)",
                  }}
                >
                  {error}
                </div>
              )}
            </div>

            {/* 구독 모달에서는 기록 저장 옵션 숨기기 */}
            {title !== "구독하기" && (
              <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, padding: "10px", background: "rgba(26, 35, 50, 0.04)", borderRadius: "12px" }}>
                  <input
                    type="checkbox"
                    checked={saveEmail}
                    onChange={(e) => setSaveEmail(e.target.checked)}
                    disabled={isLoading}
                    style={{ width: 16, height: 16, cursor: "pointer" }}
                  />
                  <span>이메일 저장하기 (다음에도 이 이메일 사용)</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, padding: "10px", background: "rgba(26, 35, 50, 0.04)", borderRadius: "12px" }}>
                  <input
                    type="checkbox"
                    checked={saveToHistory}
                    onChange={(e) => setSaveToHistory(e.target.checked)}
                    disabled={isLoading}
                    style={{ width: 16, height: 16, cursor: "pointer" }}
                  />
                  <span>기록에도 저장하기</span>
                </label>
              </div>
            )}
            
            {/* 구독 모달에서는 이메일 저장만 표시 */}
            {title === "구독하기" && (
              <div style={{ marginTop: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, padding: "10px", background: "rgba(26, 35, 50, 0.04)", borderRadius: "12px" }}>
                  <input
                    type="checkbox"
                    checked={saveEmail}
                    onChange={(e) => setSaveEmail(e.target.checked)}
                    disabled={isLoading}
                    style={{ width: 16, height: 16, cursor: "pointer" }}
                  />
                  <span>이메일 저장하기 (다음에도 이 이메일 사용)</span>
                </label>
              </div>
            )}

            <div style={{ marginTop: 20, display: "grid", gap: 10 }}>
              <button
                type="submit"
                className="btn btnPrimary btnWide"
                disabled={isLoading || !email}
                style={{
                  marginLeft: "auto",
                  marginRight: "auto",
                }}
              >
                {isLoading ? "전송 중..." : "이메일로 보내기"}
              </button>
              <button
                type="button"
                className="btn btnGhost btnWide"
                onClick={onClose}
                disabled={isLoading}
                style={{
                  marginLeft: "auto",
                  marginRight: "auto",
                }}
              >
                취소
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
