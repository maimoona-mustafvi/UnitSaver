"use client";

import { useState } from "react";
import { useData } from "./DataProvider";
import { Button, Unity } from "./ui";

/** Empty state shown before the user has added a bill. */
export function SetupPrompt({ title = "Let's set up your meter" }: { title?: string }) {
  const { loadDemo } = useData();
  const [busy, setBusy] = useState(false);
  return (
    <div className="empty-state">
      <Unity mood="thinking" size={110} />
      <h2>{title}</h2>
      <p>Add last month&apos;s bill to start tracking units, your estimated bill and protected status.</p>
      <div className="actions">
        <Button href="/setup">Add my bill →</Button>
        <Button
          variant="white"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await loadDemo().finally(() => setBusy(false));
          }}
        >
          {busy ? "Loading…" : "Load demo data"}
        </Button>
      </div>
    </div>
  );
}
