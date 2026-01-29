import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'

// 구독자 추가 API
export async function POST(request: NextRequest) {
  try {
    const supabaseServer = getSupabaseServer()
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
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

    // subscribers 테이블에 저장
    const { data: subscriber, error: subscriberError } = await supabaseServer
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
      .select()
      .single()

    if (subscriberError) {
      console.error('Subscriber upsert error:', subscriberError)
      return NextResponse.json(
        { error: 'Failed to save subscriber', details: subscriberError.message },
        { status: 500 }
      )
    }

    // 환영 이메일 발송
    const resendApiKey = process.env.RESEND_API_KEY
    if (resendApiKey) {
      try {
        const welcomeEmailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: linear-gradient(135deg, #1a2332 0%, #2d3a4f 100%); color: #fff;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="font-size: 32px; font-weight: 800; color: #d4a574; margin: 0;">LUMEN</h1>
              <p style="font-size: 14px; opacity: 0.8; margin-top: 8px;">과장 없이, 오늘의 흐름을 정리하는 시간</p>
            </div>
            
            <div style="background: rgba(255,255,255,0.1); border-radius: 16px; padding: 32px; margin-bottom: 24px;">
              <h2 style="font-size: 24px; margin: 0 0 16px 0; color: #fff;">구독을 환영합니다!</h2>
              <p style="font-size: 16px; line-height: 1.7; margin: 0; opacity: 0.9;">
                LUMEN 구독이 완료되었습니다.<br/><br/>
                매일 아침, 오늘의 키워드와 한 줄 조언을 받아보실 수 있어요.<br/>
                과장 없이 깔끔하게, 오늘의 흐름을 정리해드립니다.
              </p>
            </div>
            
            <div style="text-align: center; padding: 24px 0; border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="font-size: 12px; opacity: 0.6; margin: 0;">
                © LUMEN | 스팸 없이, 오직 운세만 보내드려요
              </p>
            </div>
          </div>
        `

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || 'LUMEN <onboarding@resend.dev>',
            to: email.toLowerCase().trim(),
            subject: '[LUMEN] 구독을 환영합니다!',
            html: welcomeEmailHtml,
          }),
        })
        console.log('Welcome email sent to:', email)
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError)
        // 이메일 발송 실패해도 구독은 성공으로 처리
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Subscriber saved successfully',
        subscriber: subscriber,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Save subscriber error:', error)
    return NextResponse.json(
      {
        error: 'Failed to save subscriber',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
