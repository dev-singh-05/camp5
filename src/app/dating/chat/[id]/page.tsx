import { supabase } from "@/utils/supabaseClient";
import ChatPage from "./ClientPage";

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

    return matches.map((match) => ({
      id: match.id,
    }));
  } catch (error) {
    console.warn('Error in generateStaticParams:', error);
    return [{ id: 'placeholder' }];
  }
}

export const dynamicParams = false;

export default function Page() {
  return <ChatPage />;
}
