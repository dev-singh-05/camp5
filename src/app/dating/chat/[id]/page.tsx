import { supabase } from "@/utils/supabaseClient";
import ChatPage from "./ClientPage";

// Generate static params for static export
export async function generateStaticParams() {
  try {
    const { data: matches, error } = await supabase
      .from('matches')
      .select('id');

    if (error || !matches || matches.length === 0) {
      console.warn('Failed to fetch matches for generateStaticParams in chat page.tsx, using placeholder');
      return [{ id: 'placeholder' }];
    }

    console.log(`✅ Generated static params for ${matches.length} chat pages`);
    return matches.map((match) => ({
      id: match.id,
    }));
  } catch (error) {
    console.warn('Error in generateStaticParams:', error);
    return [{ id: 'placeholder' }];
  }
}

// Force static generation
export const dynamic = 'force-static';
export const dynamicParams = false;
export const revalidate = false;

// Server component that renders the client component
export default function Page() {
  return <ChatPage />;
}
