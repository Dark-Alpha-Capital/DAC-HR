import { getPositions, getCandidates, getDashboardStats } from "@/lib/cached-queries";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

export default async function CacheTestPage() {
  const positions = await getPositions();
  const candidates = await getCandidates();
  const dashboardStats = await getDashboardStats();
  
  // Test fetching same data multiple times - should only query DB once
  const positions2 = await getPositions();
  const candidates2 = await getCandidates();

  async function invalidatePositionsCache() {
    "use server";
    console.log('🔄 [USER ACTION] Manually invalidating positions cache');
    revalidateTag("positions", "max");
    redirect("/cache-test");
  }

  async function invalidateCandidatesCache() {
    "use server";
    console.log('🔄 [USER ACTION] Manually invalidating candidates cache');
    revalidateTag("candidates", "max");
    redirect("/cache-test");
  }

  async function invalidateAllCache() {
    "use server";
    console.log('🔄 [USER ACTION] Manually invalidating ALL caches');
    revalidateTag("positions", "max");
    revalidateTag("candidates", "max");
    revalidateTag("applications", "max");
    revalidateTag("interviews", "max");
    revalidateTag("dashboard", "max");
    revalidateTag("analytics", "max");
    revalidateTag("documents", "max");
    revalidateTag("employees", "max");
    revalidateTag("questions", "max");
    revalidateTag("rounds", "max");
    revalidateTag("users", "max");
    revalidateTag("onboarding", "max");
    redirect("/cache-test");
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="border rounded-lg p-6 bg-card">
        <h1 className="text-3xl font-bold mb-4">Cache Testing Dashboard</h1>
        <p className="text-muted-foreground mb-4">
          Check your terminal/console for cache logs. Each query function logs when it actually executes.
          If you see logs only once per page load, caching is working!
        </p>
        
        <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">📋 Testing Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-800 dark:text-yellow-200">
            <li>Watch your terminal/console for 🔍 [CACHE MISS] logs</li>
            <li>Refresh this page multiple times - you should see logs only on first load</li>
            <li>Click an invalidation button below</li>
            <li>Refresh again - you should see new logs as cache was cleared</li>
            <li>Multiple calls to same function on this page should only log once</li>
          </ol>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="border rounded-lg p-6 bg-card">
          <h2 className="text-xl font-semibold mb-3">Positions Cache</h2>
          <div className="space-y-2 mb-4">
            <p className="text-sm text-muted-foreground">
              Total positions: <span className="font-mono font-semibold">{positions.length}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Second fetch: <span className="font-mono font-semibold">{positions2.length}</span>
            </p>
            <p className="text-xs text-muted-foreground italic">
              Cache: <span className="font-mono">days</span> | Tag: <span className="font-mono">positions</span>
            </p>
          </div>
          <form action={invalidatePositionsCache}>
            <button 
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              🔄 Invalidate Positions Cache
            </button>
          </form>
        </div>

        <div className="border rounded-lg p-6 bg-card">
          <h2 className="text-xl font-semibold mb-3">Candidates Cache</h2>
          <div className="space-y-2 mb-4">
            <p className="text-sm text-muted-foreground">
              Total candidates: <span className="font-mono font-semibold">{candidates.length}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Second fetch: <span className="font-mono font-semibold">{candidates2.length}</span>
            </p>
            <p className="text-xs text-muted-foreground italic">
              Cache: <span className="font-mono">hours</span> | Tag: <span className="font-mono">candidates</span>
            </p>
          </div>
          <form action={invalidateCandidatesCache}>
            <button 
              type="submit"
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
            >
              🔄 Invalidate Candidates Cache
            </button>
          </form>
        </div>

        <div className="border rounded-lg p-6 bg-card">
          <h2 className="text-xl font-semibold mb-3">Dashboard Stats</h2>
          <div className="space-y-2 mb-4">
            <p className="text-sm text-muted-foreground">
              Total Candidates: <span className="font-mono font-semibold">{dashboardStats.totalCandidates}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Active Candidates: <span className="font-mono font-semibold">{dashboardStats.activeCandidates}</span>
            </p>
            <p className="text-xs text-muted-foreground italic">
              Cache: <span className="font-mono">minutes</span> | Tags: <span className="font-mono">dashboard, analytics</span>
            </p>
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-6 bg-card">
        <h2 className="text-xl font-semibold mb-3">Global Cache Controls</h2>
        <form action={invalidateAllCache}>
          <button 
            type="submit"
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
          >
            💥 Invalidate All Caches
          </button>
        </form>
        <p className="text-xs text-muted-foreground mt-2">
          This will clear all cache tags and force fresh data fetches
        </p>
      </div>

      <div className="border rounded-lg p-6 bg-card space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-3">Expected Terminal Output</h3>
          <div className="bg-slate-950 text-green-400 p-4 rounded-md font-mono text-xs space-y-1 overflow-x-auto">
            <div>🔍 [CACHE MISS] getPositions executed {'{'} timestamp: &apos;...&apos;, filters: {'{'} ... {'}'} {'}'}</div>
            <div>🔍 [CACHE MISS] getCandidates executed {'{'} timestamp: &apos;...&apos; {'}'}</div>
            <div>🔍 [CACHE MISS] getDashboardStats executed {'{'} timestamp: &apos;...&apos; {'}'}</div>
            <div className="text-slate-500">// Subsequent calls won&apos;t log - cache hit!</div>
            <div className="text-yellow-400 mt-2">🔄 [USER ACTION] Manually invalidating positions cache</div>
            <div className="text-purple-400">📤 [CACHE INVALIDATED] tags revalidated</div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Cache Strategy Overview</h3>
          <div className="grid gap-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="font-mono text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">days</span>
              <span className="text-muted-foreground">Static/Config data (positions, questions, rounds)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono text-xs bg-green-100 dark:bg-green-900 px-2 py-1 rounded">hours</span>
              <span className="text-muted-foreground">Semi-static data (candidates, employees, documents)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono text-xs bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded">minutes</span>
              <span className="text-muted-foreground">Dynamic data (applications, interviews, dashboard)</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">✅ What Success Looks Like:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
            <li>Each function logs only ONCE when page first loads</li>
            <li>Page refreshes show NO new logs (data served from cache)</li>
            <li>After clicking invalidation button, you see logs again</li>
            <li>Console shows exact timestamp and parameters for each cache miss</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
