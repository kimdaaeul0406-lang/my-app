import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

// PWA 배너 표시 여부 조회/저장 API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    try {
      // 세션별 배너 표시 여부 조회
      const { data: session, error: sessionError } = await supabaseServer
        .from('user_sessions')
        .select('pwa_banner_dismissed_until')
        .eq('session_id', sessionId)
        .single()

      if (sessionError) {
        // PGRST116은 "no rows returned" 에러 (정상 - 세션이 없는 경우)
        if (sessionError.code === 'PGRST116') {
          return NextResponse.json(
            {
              success: true,
              showBanner: true, // 세션이 없으면 배너 표시
            },
            { status: 200 }
          )
        }
        
        // 테이블이 없는 경우도 처리
        if (sessionError.code === '42P01' || sessionError.message?.includes('does not exist') || sessionError.message?.includes('relation')) {
          console.warn('user_sessions table does not exist yet, showing banner')
          return NextResponse.json(
            {
              success: true,
              showBanner: true,
            },
            { status: 200 }
          )
        }
        
        console.warn('Get session error (non-critical):', sessionError.code, sessionError.message)
        return NextResponse.json(
          {
            success: true,
            showBanner: true, // 에러가 나도 배너 표시
          },
          { status: 200 }
        )
      }

      // 배너 표시 여부 확인
      if (session?.pwa_banner_dismissed_until) {
        const dismissedUntil = new Date(session.pwa_banner_dismissed_until).getTime()
        const now = Date.now()
        // 7일이 지나지 않았으면 배너 숨김
        if (now < dismissedUntil) {
          return NextResponse.json(
            {
              success: true,
              showBanner: false,
            },
            { status: 200 }
          )
        }
      }

      return NextResponse.json(
        {
          success: true,
          showBanner: true,
        },
        { status: 200 }
      )
    } catch (dbError) {
      console.warn('Database error (non-critical):', dbError)
      return NextResponse.json(
        {
          success: true,
          showBanner: true, // 에러가 나도 배너 표시
        },
        { status: 200 }
      )
    }
  } catch (error) {
    console.error('Get PWA banner status error:', error)
    return NextResponse.json(
      {
        success: true,
        showBanner: true, // 에러가 나도 배너 표시
      },
      { status: 200 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, dismissFor7Days } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // 7일 동안 안 보기로 설정한 경우
    if (dismissFor7Days) {
      const dismissedUntil = new Date()
      dismissedUntil.setDate(dismissedUntil.getDate() + 7) // 7일 후

      try {
        // 세션 업데이트 또는 생성
        const { error: sessionError } = await supabaseServer
          .from('user_sessions')
          .upsert(
            {
              session_id: sessionId,
              pwa_banner_dismissed_until: dismissedUntil.toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'session_id',
            }
          )

        if (sessionError) {
          // 테이블이 없는 경우도 처리
          if (sessionError.code === '42P01' || sessionError.message?.includes('does not exist') || sessionError.message?.includes('relation')) {
            console.warn('user_sessions table does not exist yet, skipping banner dismiss save')
          } else {
            console.warn('Session upsert error (non-critical):', sessionError.code, sessionError.message)
          }
        }
      } catch (dbError) {
        console.warn('Database error during banner dismiss save (non-critical):', dbError)
      }
    }
    // X 버튼을 누른 경우 (dismissFor7Days가 false)는 DB에 저장하지 않음

    return NextResponse.json(
      {
        success: true,
        message: dismissFor7Days ? 'Banner dismissed for 7 days' : 'Banner dismissed (will show again on refresh)',
      },
      { status: 200 }
    )
  } catch (error) {
    console.warn('Save PWA banner dismiss error (non-critical):', error)
    return NextResponse.json(
      {
        success: true,
        message: 'Banner dismiss attempted',
      },
      { status: 200 }
    )
  }
}
