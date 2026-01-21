"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface SearchParamsHandlerProps {
    onSavedParam: (type: string) => void;
}

/**
 * SearchParams 처리를 위한 별도 컴포넌트
 * Suspense 경계 내부에서만 useSearchParams를 사용
 */
export default function SearchParamsHandler({ onSavedParam }: SearchParamsHandlerProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const saved = searchParams.get("saved");
        if (saved) {
            // URL에서 쿼리 파라미터 제거
            router.replace("/", { scroll: false });
            // 부모 컴포넌트에 알림
            onSavedParam(saved);
        }
    }, [searchParams, router, onSavedParam]);

    return null; // UI를 렌더링하지 않음
}
