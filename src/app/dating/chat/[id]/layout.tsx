import { supabase } from "@/utils/supabaseClient";

// Server component layout for dynamic route
// Generate static params for static export
export async function generateStaticParams() {
  try {
    const { data: matches, error } = await supabase
      .from('matches')
      .select('id');

    if (error || !matches || matches.length === 0) {
      console.warn('Failed to fetch matches for generateStaticParams, using placeholder');
      return [{ id: 'placeholder' }];
    }

    console.log(`✅ Generated static params for ${matches.length} chat matches`);
    return matches.map((match) => ({
      id: match.id,
    }));
  } catch (error) {
    console.warn('Error in generateStaticParams:', error);
    return [{ id: 'placeholder' }];
  }
}

// Disable dynamic params for static export
export const dynamicParams = false;

// Force static generation
export const dynamic = 'force-static';
export const revalidate = false;

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
