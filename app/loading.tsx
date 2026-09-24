export default function Loading() {
  return (
    <div className="hw-log">
      <header className="bench">
        <div className="bench-title">
          <h1>Hardware Test Log</h1>
          <div className="sub">Loading the bench log…</div>
        </div>
      </header>
      <div className="log-empty">
        <strong>Loading issues</strong>
        Pulling the latest findings.
      </div>
    </div>
  );
}