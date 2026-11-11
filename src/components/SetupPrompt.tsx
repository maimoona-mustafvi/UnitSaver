"use client";

import { useState } from "react";
import type { Key } from "@/i18n";
import { useData } from "./DataProvider";
import { useI18n } from "./LanguageProvider";
import { Button, Unity } from "./ui";

/** Empty state shown before the user has added a bill. */
export function SetupPrompt({ title = "sp.title" }: { title?: Key }) {
  const { loadDemo } = useData();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  return (
    <div className="empty-state">
      <Unity mood="thinking" size={110} />
      <h2>{t(title)}</h2>
      <p>{t("sp.text")}</p>
      <div className="actions">
        <Button href="/setup">{t("common.addMyBill")}</Button>
        <Button
          variant="white"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await loadDemo().finally(() => setBusy(false));
          }}
        >
          {busy ? t("common.loading") : t("common.loadDemo")}
        </Button>
      </div>
    </div>
  );
}
