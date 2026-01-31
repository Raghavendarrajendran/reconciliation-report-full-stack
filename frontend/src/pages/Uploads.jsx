import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { uploadsApi, entitiesApi, periodsApi } from "../lib/api";

export function Uploads() {
  const [file, setFile] = useState(null);
  const [parseResult, setParseResult] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [uploadType, setUploadType] = useState("schedule");
  const [entityId, setEntityId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const queryClient = useQueryClient();

  const { data: entitiesData } = useQuery({
    queryKey: ["entities"],
    queryFn: () => entitiesApi.list(),
  });
  const { data: periodsData } = useQuery({
    queryKey: ["periods"],
    queryFn: () => periodsApi.list(),
  });
  const entities = entitiesData?.entities ?? [];
  const periods = periodsData?.periods ?? [];

  const parseMutation = useMutation({
    mutationFn: (f) => uploadsApi.parse(f),
    onSuccess: (data) => {
      setParseResult(data);
      const sheets = data?.sheets ?? [];
      setSelectedSheet(sheets[0] ?? "");
    },
  });

  const saveScheduleFileMutation = useMutation({
    mutationFn: ({ file, sheetName, entityId, periodId }) =>
      uploadsApi.saveScheduleFile(file, { sheetName, entityId, periodId }),
    onSuccess: () => {
      queryClient.invalidateQueries(["uploads"]);
      setParseResult(null);
      setFile(null);
      setSelectedSheet("");
    },
  });

  const saveTBFileMutation = useMutation({
    mutationFn: ({ file, sheetName, entityId, periodId }) =>
      uploadsApi.saveTrialBalanceFile(file, { sheetName, entityId, periodId }),
    onSuccess: () => {
      queryClient.invalidateQueries(["uploads"]);
      setParseResult(null);
      setFile(null);
      setSelectedSheet("");
    },
  });

  const sheets = parseResult?.sheets ?? [];
  const currentSheetData =
    selectedSheet && parseResult?.sample?.[selectedSheet];
  const headers = currentSheetData?.headers ?? [];
  const sampleRows = currentSheetData?.sampleRows ?? [];
  const rowCount = currentSheetData?.rowCount ?? 0;
  const isSaving =
    saveScheduleFileMutation.isPending || saveTBFileMutation.isPending;

  const canSave = file && (selectedSheet || sheets[0]);

  const handleSave = () => {
    if (!canSave) return;
    const payload = {
      file,
      sheetName: selectedSheet || sheets[0],
      entityId: entityId || undefined,
      periodId: periodId || undefined,
    };
    if (uploadType === "schedule") saveScheduleFileMutation.mutate(payload);
    else saveTBFileMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Upload Center
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Upload Prepayment Schedule, Trial Balance, or PPREC. Choose a sheet,
          review columns and preview, then save.
        </p>
        <div
          className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm dark:border-sky-800 dark:bg-sky-950/40"
          style={{ color: "var(--text-primary)" }}
        >
          <strong>
            After uploading Prepayment Schedule and Trial Balance:
          </strong>{" "}
          go to{" "}
          <Link
            to="/reconciliations"
            className="font-medium text-sky-600 underline hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
          >
            Reconciliations
          </Link>
          , select the <strong>same Entity and Period</strong>, then click{" "}
          <strong>Run reconciliation</strong> to see results.
        </div>
      </div>

      <div className="card-soft p-4">
        <h2
          className="mb-3 text-sm font-semibold uppercase tracking-wider"
          style={{ color: "var(--text-secondary)" }}
        >
          Upload type & context
        </h2>
        <div className="flex flex-wrap gap-6">
          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="type"
                checked={uploadType === "schedule"}
                onChange={() => setUploadType("schedule")}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium">Prepayment Schedule</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="type"
                checked={uploadType === "trial-balance"}
                onChange={() => setUploadType("trial-balance")}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium">Trial Balance</span>
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span
              className="text-xs font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Entity
            </span>
            <select
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              className="input-soft w-48"
            >
              <option value="">All entities</option>
              {entities.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name || e.code}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span
              className="text-xs font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Period
            </span>
            <select
              value={periodId}
              onChange={(e) => setPeriodId(e.target.value)}
              className="input-soft w-48"
            >
              <option value="">Select period</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.code}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span
              className="text-xs font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Excel file
            </span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setParseResult(null);
                setSelectedSheet("");
              }}
              className="text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-[#0369a1] file:px-3 file:py-1.5 file:text-sm file:text-white file:hover:bg-[#075985]"
            />
          </label>
          <button
            type="button"
            onClick={() => file && parseMutation.mutate(file)}
            disabled={!file || parseMutation.isPending}
            className="btn-primary"
          >
            {parseMutation.isPending ? "Parsing…" : "Parse Excel"}
          </button>
        </div>
      </div>

      {parseResult && (
        <>
          <div className="card-soft p-4">
            <h2
              className="mb-3 text-sm font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-secondary)" }}
            >
              Sheet selector
            </h2>
            {sheets.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                No sheets found in this file.
              </p>
            ) : sheets.length === 1 ? (
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Using sheet:{" "}
                <strong style={{ color: "var(--text-primary)" }}>
                  {sheets[0]}
                </strong>
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sheets.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setSelectedSheet(name)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      selectedSheet === name
                        ? "border-[#0369a1] bg-[#0369a1]/10 text-[#0369a1] dark:border-[#38bdf8] dark:bg-[#38bdf8]/20 dark:text-[#38bdf8]"
                        : "border-[var(--border)] hover:opacity-80"
                    }`}
                    style={
                      selectedSheet !== name
                        ? { color: "var(--text-secondary)" }
                        : {}
                    }
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {currentSheetData && (
            <>
              <div className="card-soft p-4">
                <h2
                  className="mb-3 text-sm font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Column mapping & validation
                </h2>
                <p
                  className="mb-3 text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Sheet{" "}
                  <strong style={{ color: "var(--text-primary)" }}>
                    {selectedSheet}
                  </strong>
                  : <strong>{rowCount}</strong> row{rowCount !== 1 ? "s" : ""},{" "}
                  <strong>{headers.length}</strong> column
                  {headers.length !== 1 ? "s" : ""}.
                </p>
                <p
                  className="mb-3 text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Detected columns (normalized):{" "}
                  {headers.length ? headers.join(", ") : "—"}
                </p>
                <div
                  className="overflow-x-auto rounded-lg border"
                  style={{ borderColor: "var(--border)" }}
                >
                  <table className="table-soft w-full min-w-[500px] text-left text-sm">
                    <thead>
                      <tr>
                        {headers.map((h) => (
                          <th key={h} className="whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sampleRows.length === 0 && (
                        <tr>
                          <td
                            colSpan={headers.length || 1}
                            className="py-6 text-center text-sm"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            No sample rows (empty sheet or headers only).
                          </td>
                        </tr>
                      )}
                      {sampleRows.map((row, i) => (
                        <tr key={i}>
                          {headers.map((key) => (
                            <td key={key} className="tabular-nums">
                              {row[key] != null ? String(row[key]) : "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p
                  className="mt-2 text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Showing first {sampleRows.length} of {rowCount} rows. Full
                  data will be saved when you click Save.
                </p>
              </div>

              <div className="card-soft flex flex-wrap items-center justify-between gap-4 p-4">
                <div>
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Save{" "}
                    <strong style={{ color: "var(--text-primary)" }}>
                      {selectedSheet}
                    </strong>{" "}
                    as{" "}
                    {uploadType === "schedule"
                      ? "Prepayment Schedule"
                      : "Trial Balance"}
                    .
                  </p>
                  {(uploadType === "schedule" ||
                    uploadType === "trial-balance") && (
                    <p
                      className="mt-1 text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Company/Entity names create or match entities; Fiscal year
                      and Fiscal period from the sheet create or match periods
                      in the master (no duplicates).
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || !canSave}
                  className="btn-primary rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSaving ? "Saving…" : "Save upload"}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
