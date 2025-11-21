import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Create a Supabase client with service role key for admin operations
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
    const { userId, fullName, enrollment, collegeEmail } = await request.json();

    console.log("Creating profile for user:", userId);

    // Insert the profile using service role (bypasses RLS)
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        full_name: fullName,
        enrollment_number: enrollment,
        college_email: collegeEmail,
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (profileError) {
      console.error("Profile creation error:", profileError);
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    console.log("Profile created successfully:", profileData);

    return NextResponse.json({
      success: true,
      profile: profileData,
    });
  } catch (error: any) {
    console.error("Create profile API error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
