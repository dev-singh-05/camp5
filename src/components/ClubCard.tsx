"use client";

type ClubCardProps = {
  name: string;
  category: string | null;
  logo_url?: string | null;
  rank?: number;
  status?: "join" | "requested" | "joined";
  onAction?: () => void;
};

export default function ClubCard({
  name,
  category,
  logo_url,
  rank,
  status = "join",
  onAction,
}: ClubCardProps) {
  const getCategoryIcon = (cat: string | null) => {
    switch (cat?.toLowerCase()) {
      case "sports": return "⚽";
      case "arts": return "🎨";
      case "tech": return "💻";
      case "general": return "🌟";
      default: return "📁";
    }
  };

  return (
    <div className="flex items-center justify-between bg-gray-100 rounded-2xl shadow-md p-4 mb-4">
      {/* Left side: Avatar + details */}
      <div className="flex items-center gap-4">
        {/* Club logo or category icon */}
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-gray-600 text-xl overflow-hidden">
          {logo_url ? (
            <img
              src={logo_url}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl">{getCategoryIcon(category)}</span>
          )}
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">{name}</h3>
          <p className="text-sm text-gray-600">{category || "Uncategorized"}</p>
          {rank !== undefined && (
            <p className="text-sm font-semibold text-indigo-600">Rank #{rank}</p>
          )}
        </div>
      </div>

      {/* Right side: Action */}
      <div>
        {status === "join" && (
          <button
            onClick={onAction}
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-full transition"
          >
            Join
          </button>
        )}
        {status === "requested" && (
          <button
            disabled
            className="bg-yellow-400 text-white px-4 py-2 rounded-full cursor-not-allowed"
          >
            Requested
          </button>
        )}
        {status === "joined" && (
          <button
            disabled
            className="bg-green-500 text-white px-4 py-2 rounded-full cursor-not-allowed"
          >
            Joined
          </button>
        )}
      </div>
    </div>
  );
}
