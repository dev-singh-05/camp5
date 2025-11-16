// Server component layout for dynamic route
// Generate static params for static export
export async function generateStaticParams() {
  // Return placeholder param to allow build to complete
  // In production, you should fetch actual match IDs from your database
  return [
    { id: 'placeholder' }
  ];
}

// Allow dynamic params to enable runtime rendering (does not work with static export)
// export const dynamicParams = true;

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
