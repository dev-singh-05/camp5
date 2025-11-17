// Minimal layout for dynamic route with static export
// For Capacitor mobile app, we use client-side routing
export async function generateStaticParams() {
  // Return placeholder - actual routes will be handled client-side in mobile app
  return [{ id: 'placeholder' }];
}

export default function ClubProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
