import { useState } from "react";
import { accountName, useStore } from "../lib/store";
import { Card } from "../components/ui";
import { SUBTYPE_LABEL } from "../lib/i18n";
import type { Account, AccountSubtype, AccountType, CashFlowClass } from "../lib/types";

const SUBTYPE_TO_TYPE: Record<AccountSubtype, AccountType> = {
  cash: "asset", current_asset: "asset", non_current_asset: "asset", contra_asset: "asset", suspense: "asset",
  current_liability: "liability", non_current_liability: "liability", equity: "equity",
  revenue: "revenue", other_income: "revenue", cogs: "expense", expense: "expense", finance_cost: "expense", tax: "expense",
};
const DEFAULT_CF: Record<AccountSubtype, CashFlowClass> = {
  cash: "cash", current_asset: "operating", non_current_asset: "investing", contra_asset: "operating", suspense: "operating",
  current_liability: "operating", non_current_liability: "financing", equity: "financing",
  revenue: "none", other_income: "none", cogs: "none", expense: "none", finance_cost: "none", tax: "none",
};

export default function Accounts() {
  const { t, books, update, lang } = useStore();
  const [draft, setDraft] = useState<Account>({ code: "", name: "", nameAr: "", type: "expense", subtype: "expense", cf: "none" });
  const [err, setErr] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const used = new Set(books.entries.flatMap((e) => e.lines.map((l) => l.account)));

  const add = () => {
    if (!draft.code.trim() || !draft.name.trim()) return;
    if (books.accounts.some((a) => a.code === draft.code.trim())) { setErr(t("codeExists")); return; }
    setErr("");
    update((b) => ({ ...b, accounts: [...b.accounts, { ...draft, code: draft.code.trim() }].sort((a, c) => a.code.localeCompare(c.code, "en", { numeric: true })) }));
    setDraft({ ...draft, code: "", name: "", nameAr: "" });
  };
  const edit = (code: string, p: Partial<Account>) => update((b) => ({ ...b, accounts: b.accounts.map((a) => (a.code === code ? { ...a, ...p } : a)) }));
  const remove = (a: Account) => {
    if (used.has(a.code)) { edit(a.code, { archived: true }); return; }
    update((b) => ({ ...b, accounts: b.accounts.filter((x) => x.code !== a.code) }));
  };
  const L = (st: string) => SUBTYPE_LABEL[st]?.[lang === "ar" ? 1 : 0] ?? st;
  const learned = books.rules.filter((r) => r.learned);

  return (
    <div className="page">
      <Card title={t("newAccount")}>
        <div className="grid-form">
          <label>{t("code")}<input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} /></label>
          <label>{t("name")}<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
          <label>{t("nameAr")}<input dir="rtl" value={draft.nameAr} onChange={(e) => setDraft({ ...draft, nameAr: e.target.value })} /></label>
          <label>{t("group")}
            <select value={draft.subtype} onChange={(e) => { const st = e.target.value as AccountSubtype; setDraft({ ...draft, subtype: st, type: SUBTYPE_TO_TYPE[st], cf: DEFAULT_CF[st] }); }}>
              {Object.keys(SUBTYPE_TO_TYPE).map((k) => <option key={k} value={k}>{L(k)}</option>)}
            </select>
          </label>
          {draft.cf !== "none" && draft.cf !== "cash" && (
            <label>{t("cfClass")}
              <select value={draft.cf} onChange={(e) => setDraft({ ...draft, cf: e.target.value as CashFlowClass })}>
                <option value="operating">Operating / تشغيلية</option>
                <option value="investing">Investing / استثمارية</option>
                <option value="financing">Financing / تمويلية</option>
              </select>
            </label>
          )}
          <div className="row-actions"><button onClick={add}>{t("add")}</button></div>
        </div>
        {err && <div className="error">{err}</div>}
      </Card>
      <Card title={t("accounts")} actions={<label className="chk"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> {t("archive")}</label>}>
        <div className="table-wrap">
          <table className="grid">
            <thead><tr><th>{t("code")}</th><th>{t("name")}</th><th>{t("nameAr")}</th><th>{t("group")}</th><th /></tr></thead>
            <tbody>
              {books.accounts.filter((a) => showArchived || !a.archived).map((a) => (
                <tr key={a.code} className={a.archived ? "muted" : ""}>
                  <td>{a.code}</td>
                  <td><input value={a.name} onChange={(e) => edit(a.code, { name: e.target.value })} /></td>
                  <td><input dir="rtl" value={a.nameAr} onChange={(e) => edit(a.code, { nameAr: e.target.value })} /></td>
                  <td>{L(a.subtype)}</td>
                  <td>
                    {!a.system && (a.archived
                      ? <button className="ghost small" onClick={() => edit(a.code, { archived: false })}>{t("unarchive")}</button>
                      : <button className="ghost small danger" onClick={() => remove(a)}>{used.has(a.code) ? t("archive") : t("delete")}</button>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {learned.length > 0 && (
        <Card title={t("learnedRules")}>
          <table className="grid">
            <thead><tr><th>{t("keyword")}</th><th>{t("account")}</th><th /></tr></thead>
            <tbody>
              {learned.map((r) => (
                <tr key={r.keyword + r.account}>
                  <td dir="auto">{r.keyword}</td><td>{r.account} · {accountName(books, r.account, lang)}</td>
                  <td><button className="ghost small danger" onClick={() => update((b) => ({ ...b, rules: b.rules.filter((x) => x !== r) }))}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
