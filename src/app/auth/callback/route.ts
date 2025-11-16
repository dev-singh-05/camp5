import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Auth callback route for handling OAuth redirects
 * Supports both web and mobile (Capacitor) authentication flows
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  // Handle error cases
  if (error) {
    console.error("Auth callback error:", error, errorDescription);
    return NextResponse.redirect(
      `${requestUrl.origin}?error=${encodeURIComponent(error)}`
    );
  }

  // Exchange code for session
  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    try {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error("Error exchanging code for session:", exchangeError);
        return NextResponse.redirect(
          `${requestUrl.origin}?error=${encodeURIComponent(exchangeError.message)}`
        );
      }

      // Successfully authenticated - redirect to home or intended page
      const redirectTo = requestUrl.searchParams.get("redirect_to") || "/";
      return NextResponse.redirect(`${requestUrl.origin}${redirectTo}`);
    } catch (err) {
      console.error("Unexpected error in auth callback:", err);
      return NextResponse.redirect(
        `${requestUrl.origin}?error=unexpected_error`
      );
    }
  }

  // No code or error - redirect to home
  return NextResponse.redirect(requestUrl.origin);
}
