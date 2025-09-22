"use client";

export default function DialogBox({
  show,
  title,
  message,
  onClose,
  actions,
}: {
  show: boolean;
  title: string;
  message: string;
  onClose: () => void;
  actions?: { label: string; onClick: () => void; className?: string }[];
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 backdrop-blur-sm">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
        <h2 className="text-lg font-bold mb-2">{title}</h2>
        <p className="mb-4 text-gray-700">{message}</p>
        <div className="flex justify-end gap-2">
          {actions && actions.length > 0 ? (
            actions.map((action, i) => (
              <button
                key={i}
                onClick={action.onClick}
                className={`px-4 py-2 rounded ${action.className || "bg-indigo-600 text-white hover:bg-indigo-700"}`}
              >
                {action.label}
              </button>
            ))
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
