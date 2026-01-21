import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// 서버 전용 클라이언트 (service role key 사용)
// 이 클라이언트는 RLS를 우회하고 모든 권한을 가집니다.
// 절대 클라이언트 코드에 노출하지 마세요!

let _supabaseServer: SupabaseClient | null = null

export function getSupabaseServer(): SupabaseClient {
  if (!supabaseUrl) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
  }

  if (!supabaseServiceRoleKey) {
    throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY - Get this from Supabase Dashboard > Settings > API > service_role key')
  }

  if (!_supabaseServer) {
    _supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }

  return _supabaseServer
}

// 기존 코드 호환을 위한 export (deprecated)
// 빌드 시 환경변수가 없어도 에러가 나지 않도록 null을 반환할 수 있음
export const supabaseServer = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  : null as unknown as SupabaseClient

