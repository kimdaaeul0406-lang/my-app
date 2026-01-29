import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'

/**
 * 기록 삭제 API
 * sessionId로 본인 이메일을 확인한 뒤, 해당 subscriber의 reading만 삭제합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseServer = getSupabaseServer()
    const body = await request.json()
    const { id: readingId, sessionId } = body

    if (!readingId || !sessionId) {
      return NextResponse.json(
        { success: false, error: 'id와 sessionId가 필요합니다.' },
        { status: 400 }
      )
    }

    // 1. 세션으로 이메일 조회
    const { data: session, error: sessionError } = await supabaseServer
      .from('user_sessions')
      .select('email')
      .eq('session_id', sessionId)
      .single()

    if (sessionError || !session?.email) {
      return NextResponse.json(
        { success: false, error: '세션을 찾을 수 없습니다.' },
        { status: 401 }
      )
    }

    const email = session.email.toLowerCase().trim()

    // 2. 해당 이메일의 subscriber 조회
    const { data: subscriber, error: subscriberError } = await supabaseServer
      .from('subscribers')
      .select('id')
      .eq('email', email)
      .single()

    if (subscriberError || !subscriber) {
      return NextResponse.json(
        { success: false, error: '구독자 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 3. 해당 reading이 이 subscriber 소유인지 확인 후 삭제
    const { error: deleteError } = await supabaseServer
      .from('readings')
      .delete()
      .eq('id', readingId)
      .eq('subscriber_id', subscriber.id)

    if (deleteError) {
      console.error('Readings delete error:', deleteError)
      return NextResponse.json(
        { success: false, error: '삭제에 실패했습니다.', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: '삭제되었습니다.' }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error in readings/delete:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
