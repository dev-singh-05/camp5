import { supabase } from "@/utils/supabaseClient";

// Generate static params for static export
export async function generateStaticParams() {
  try {
    const { data: clubs, error } = await supabase
      .from('clubs')
      .select('id');

    if (error || !clubs || clubs.length === 0) {
      console.warn('Failed to fetch clubs for generateStaticParams, using placeholder');
      return [{ id: 'placeholder' }];
    }

    return clubs.map((club) => ({
      id: club.id,
    }));
  } catch (error) {
    console.warn('Error in generateStaticParams:', error);
    return [{ id: 'placeholder' }];
  }
}

export const dynamicParams = false;

export default function ClubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
