import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

// 사용자 세션별 이메일 조회/저장 API
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
      // 세션별 이메일 조회
      const { data: session, error: sessionError } = await supabaseServer
        .from('user_sessions')
        .select('email, save_email')
        .eq('session_id', sessionId)
        .single()

      if (sessionError) {
        // PGRST116은 "no rows returned" 에러 (정상 - 세션이 없는 경우)
        if (sessionError.code === 'PGRST116') {
          // 세션이 없으면 null 반환 (정상)
          return NextResponse.json(
            {
              success: true,
              email: null,
              saveEmail: false,
            },
            { status: 200 }
          )
        }
        
        // 테이블이 없는 경우도 처리 (42P01: relation does not exist)
        if (sessionError.code === '42P01' || sessionError.message?.includes('does not exist') || sessionError.message?.includes('relation')) {
          console.warn('user_sessions table does not exist yet, returning empty result')
          return NextResponse.json(
            {
              success: true,
              email: null,
              saveEmail: false,
            },
            { status: 200 }
          )
        }
        
        // 기타 에러는 경고만 출력하고 빈 결과 반환 (이메일 전송을 막지 않음)
        console.warn('Get session error (non-critical):', sessionError.code, sessionError.message)
        return NextResponse.json(
          {
            success: true,
            email: null,
            saveEmail: false,
          },
          { status: 200 }
        )
      }

      return NextResponse.json(
        {
          success: true,
          email: session?.email || null,
          saveEmail: session?.save_email || false,
        },
        { status: 200 }
      )
    } catch (dbError) {
      // DB 연결 에러 등도 처리
      console.warn('Database error (non-critical):', dbError)
      return NextResponse.json(
        {
          success: true,
          email: null,
          saveEmail: false,
        },
        { status: 200 }
      )
    }
  } catch (error) {
    console.error('Get user email error:', error)
    // 최종적으로도 빈 결과 반환 (이메일 전송을 막지 않음)
    return NextResponse.json(
      {
        success: true,
        email: null,
        saveEmail: false,
      },
      { status: 200 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, email, saveEmail } = body

    if (!sessionId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, email' },
        { status: 400 }
      )
    }

    // email 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // 세션별 이메일 저장/업데이트 (실패해도 이메일 전송은 계속)
    try {
      const { data: session, error: sessionError } = await supabaseServer
        .from('user_sessions')
        .upsert(
          {
            session_id: sessionId,
            email: email.toLowerCase().trim(),
            save_email: saveEmail || false,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'session_id',
          }
        )
        .select()
        .single()

      if (sessionError) {
        // 테이블이 없는 경우도 처리 (42P01: relation does not exist)
        if (sessionError.code === '42P01' || sessionError.message?.includes('does not exist') || sessionError.message?.includes('relation')) {
          console.warn('user_sessions table does not exist yet, skipping session save')
          // 테이블이 없어도 이메일 전송은 계속 진행
        } else {
          console.warn('Session upsert error (non-critical):', sessionError.code, sessionError.message)
          // 에러가 발생해도 이메일 전송은 계속 진행
        }
      }
    } catch (dbError) {
      // DB 연결 에러 등도 처리 (이메일 전송을 막지 않음)
      console.warn('Database error during session save (non-critical):', dbError)
    }

    // 이메일을 저장하기로 선택한 경우 subscribers 테이블에도 저장 (실패해도 계속 진행)
    if (saveEmail) {
      try {
        const { error: subscriberError } = await supabaseServer
          .from('subscribers')
          .upsert(
            {
              email: email.toLowerCase().trim(),
              save_email: true,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'email',
            }
          )

        if (subscriberError) {
          console.warn('Subscriber upsert error (non-critical):', subscriberError.code, subscriberError.message)
          // 에러가 발생해도 이메일 전송은 계속 진행
        }
      } catch (dbError) {
        console.warn('Database error during subscriber save (non-critical):', dbError)
        // 에러가 발생해도 이메일 전송은 계속 진행
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: saveEmail ? 'Email saved to session and subscribers' : 'Email saved to session only',
      },
      { status: 200 }
    )
  } catch (error) {
    console.warn('Save user email error (non-critical):', error)
    // 최종적으로도 성공으로 처리 (이메일 전송을 막지 않음)
    return NextResponse.json(
      {
        success: true,
        message: 'Email save attempted (may have failed, but email sending will continue)',
      },
      { status: 200 }
    )
  }
}
