
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'LUMEN - 오늘의 흐름';
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = 'image/png';

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    background: 'linear-gradient(to bottom right, #0F172A, #1E293B)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'sans-serif',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #a5b4fc 0%, #ede9fe 100%)',
                        backgroundClip: 'text',
                        color: 'transparent',
                        fontSize: 100,
                        fontWeight: 800,
                        letterSpacing: '-0.02em',
                        marginBottom: 20,
                    }}
                >
                    LUMEN
                </div>
                <div
                    style={{
                        color: '#94a3b8',
                        fontSize: 32,
                        fontWeight: 500,
                        textAlign: 'center',
                        maxWidth: '80%',
                    }}
                >
                    오늘의 흐름을 정리하는 사주 & 타로 & 별자리
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}
