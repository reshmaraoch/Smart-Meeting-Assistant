type SuggestionItem = {
  title: string;
  preview: string;
  type?: string;
};

type SuggestionBatch = {
  id: string;
  timestamp: string;
  suggestions: SuggestionItem[];
};

type Props = {
  batches?: SuggestionBatch[];
  onRefresh: () => void;
  onSuggestionClick: (suggestion: SuggestionItem) => void;
  isLoading: boolean;
};

export default function SuggestionsPanel({
  batches = [],
  onRefresh,
  onSuggestionClick,
  isLoading,
}: Props) {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-4 flex shrink-0 items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Suggestions</h2>
          <p className="text-sm text-neutral-400">
            Newest batches appear first
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-neutral-900 px-4 text-sm font-medium text-white transition hover:border-white/20 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-2">
        {batches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-neutral-400">
            {isLoading
              ? "Generating suggestions..."
              : "Suggestions will appear after the first 30-second refresh."}
          </div>
        ) : (
          batches.map((batch, batchIndex) => (
            <div key={batch.id} className="space-y-3">
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span>Batch {batches.length - batchIndex}</span>
                <span>{batch.timestamp}</span>
              </div>

              {batch.suggestions.map((item, index) => (
                <button
                  key={`${batch.id}-${item.title}-${index}`}
                  onClick={() => onSuggestionClick(item)}
                  className="w-full rounded-xl border border-white/10 bg-black/20 p-4 text-left transition hover:border-blue-500/40 hover:bg-black/30"
                >
                  {item.type && (
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-blue-300">
                      {item.type}
                    </p>
                  )}

                  <h3 className="font-medium text-white">{item.title}</h3>

                  <p className="mt-2 text-sm leading-6 text-neutral-300">
                    {item.preview}
                  </p>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </section>
  );
}