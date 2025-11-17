import { supabase } from "@/utils/supabaseClient";
import ClubDetailPage from "./ClientPage";

// Generate static params for static export
export async function generateStaticParams() {
  try {
    const { data: clubs, error } = await supabase
      .from('clubs')
      .select('id');

    if (error || !clubs || clubs.length === 0) {
      console.warn('Failed to fetch clubs for generateStaticParams in page.tsx, using placeholder');
      return [{ id: 'placeholder' }];
    }

    console.log(`✅ Generated static params for ${clubs.length} club detail pages`);
    return clubs.map((club) => ({
      id: club.id,
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
  return <ClubDetailPage />;
}
