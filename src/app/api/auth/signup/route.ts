import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Create admin client with service role for user creation
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, enrollment } = await request.json();

    // ============================================
    // VALIDATION
    // ============================================

    if (!email || !password || !fullName || !enrollment) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (!email.toLowerCase().endsWith("@medicaps.ac.in")) {
      return NextResponse.json(
        { error: "Only @medicaps.ac.in emails are allowed" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    if (enrollment.trim().length < 3) {
      return NextResponse.json(
        { error: "Invalid enrollment number" },
        { status: 400 }
      );
    }

    // ============================================
    // CHECK FOR EXISTING USER
    // ============================================

    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("enrollment_number")
      .eq("enrollment_number", enrollment.trim())
      .single();

    if (existingProfile) {
      return NextResponse.json(
        { error: "Enrollment number already registered" },
        { status: 400 }
      );
    }

    // ============================================
    // CREATE USER (without trigger, so no profile yet)
    // ============================================

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName.trim(),
        enrollment_number: enrollment.trim(),
      },
    });

    if (authError) {
      console.error("Auth error:", authError);

      if (authError.message.includes("already") || authError.message.includes("duplicate")) {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: authError.message || "Failed to create account" },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "User creation failed" },
        { status: 500 }
      );
    }

    console.log("✅ User created:", authData.user.id);

    // ============================================
    // CREATE PROFILE (manually, no trigger)
    // ============================================

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: authData.user.id,
        full_name: fullName.trim(),
        enrollment_number: enrollment.trim(),
        college_email: email.toLowerCase().trim(),
        profile_completed: false,
      });

    if (profileError) {
      console.error("Profile creation error:", profileError);

      // Rollback: delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

      return NextResponse.json(
        { error: "Failed to create user profile. Please try again." },
        { status: 500 }
      );
    }

    console.log("✅ Profile created");

    // ============================================
    // INITIALIZE USER TOKENS
    // ============================================

    const { error: tokensError } = await supabaseAdmin
      .from("user_tokens")
      .insert({
        user_id: authData.user.id,
        balance: 0,
      });

    if (tokensError) {
      console.error("Tokens initialization error:", tokensError);
      // Don't rollback for tokens - it's not critical
      // User can still use the app without tokens initially
    } else {
      console.log("✅ Tokens initialized");
    }

    // ============================================
    // SUCCESS
    // ============================================

    return NextResponse.json({
      success: true,
      message: "Account created successfully!",
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
    });

  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
