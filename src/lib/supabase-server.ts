import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerComponentClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// For API routes - handle cookies from request
export function createClient(request?: Request) {
  const cookieStore = request ? 
    Object.fromEntries(request.headers.get('cookie')?.split(';').map(c => {
      const [key, value] = c.trim().split('=')
      return [key, value]
    }) || []) : {}

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return Object.entries(cookieStore).map(([name, value]) => ({
            name,
            value: value || '',
          }))
        },
        setAll() {
          // No-op for API routes
        },
      },
    }
  )
} 