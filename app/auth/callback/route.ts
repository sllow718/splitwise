import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const next = url.searchParams.get('next') ?? '/'
    const origin = url.origin

    // Prepare a mutable response so Supabase can set cookies
    const response = NextResponse.redirect(`${origin}${next}`)

    // Handle missing code (invalid callback)
    if (!code) {
        console.error('Auth Callback Error: No code provided')
        return NextResponse.redirect(`${origin}/auth/auth-code-error`)
    }

    // Create Supabase server client (SSR)
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.headers.get('cookie') ?? ''
                },
                set(name: string, value: string, options: CookieOptions) {
                    response.cookies.set(name, value, options)
                },
                remove(name: string, options: CookieOptions) {
                    response.cookies.delete(name)
                },
            },
        }
    )

    // Exchange the code from the URL for a Supabase session
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
        console.error('Auth Callback Error:', error.message)
        return NextResponse.redirect(`${origin}/auth/auth-code-error`)
    }

    console.log('Auth Callback: Session validation successful')
    return response
}
