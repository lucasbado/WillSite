export default function LoadNotice({ error, loading, onRetry }) {
    if (error) return (
        <div role="alert" className="my-4 flex flex-wrap items-center gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            <span className="flex-1">{error}</span>
            <button type="button" onClick={onRetry} disabled={loading} className="rounded-xl bg-red-800 px-4 py-2 font-bold text-white disabled:opacity-50">
                {loading ? 'Tentando…' : 'Tentar novamente'}
            </button>
        </div>
    );
    if (loading) return <p role="status" className="my-4 text-sm text-slate-500 dark:text-slate-400">Carregando dados…</p>;
    return null;
}
