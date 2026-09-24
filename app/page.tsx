import { Board } from "@/components/board";
import { listIssues, type IssueRow } from "@/lib/db";
import { missingDatabaseEnv, missingStorageEnv } from "@/lib/env";
import { safeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const missingDb = missingDatabaseEnv();
  const missingStorage = missingStorageEnv();
  if (missingDb.length > 0) {
    return <SetupNotice missing={[...missingDb, ...missingStorage]} />;
  }

  const loaded = await loadIssues();
  if (!loaded.ok) {
    return <SetupNotice missing={[]} error={loaded.error} />;
  }
  return <Board issues={loaded.issues} storageReady={missingStorage.length === 0} />;
}

async function loadIssues(): Promise<
  { ok: true; issues: IssueRow[] } | { ok: false; error: string }
> {
  try {
    return { ok: true, issues: await listIssues() };
  } catch (error) {
    return { ok: false, error: safeError(error) };
  }
}

function SetupNotice({ missing, error }: { missing: string[]; error?: string }) {
  return (
    <main className="hw-log setup">
      <header className="bench">
        <div className="bench-title">
          <h1>Firmware Test Log</h1>
          <div className="sub">{error ? "The bench cannot reach Neon." : "Link this app to Neon."}</div>
        </div>
      </header>
      <div className="banner">
        Findings and notes are stored in Postgres. Proof photos go in the <code>proofissues</code> bucket.
      </div>
      {error ? <p className="banner">{error}</p> : null}
      {missing.length > 0 ? (
        <p className="banner">Missing environment: {missing.join(", ")}</p>
      ) : null}
      <ol>
        <li><code>neon login</code></li>
        <li><code>neon link --project-id noisy-dawn-91073781 --branch production -y</code></li>
        <li><code>neon deploy</code></li>
        <li>Restart the dev server so it reloads .env.local</li>
      </ol>
    </main>
  );
}
