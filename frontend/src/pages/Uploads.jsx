import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { uploadsApi, entitiesApi, periodsApi } from "../lib/api";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const UPLOAD_LIST_TABS = [
  { key: "schedule", label: "Prepayment Schedule" },
  { key: "trial-balance", label: "Trial Balance" },
  { key: "pprec", label: "PPREC" },
];

export function Uploads() {
  const [file, setFile] = useState(null);
  const [parseResult, setParseResult] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [uploadType, setUploadType] = useState("schedule");
  const [entityId, setEntityId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [fiscalYear, setFiscalYear] = useState("");
  const [listTab, setListTab] = useState("schedule");
  const [viewingId, setViewingId] = useState(null);
  const [viewingType, setViewingType] = useState(null);
  const [dataViewSearch, setDataViewSearch] = useState("");
  const [dataViewSortKey, setDataViewSortKey] = useState(null);
  const [dataViewSortDir, setDataViewSortDir] = useState("asc");
  const [dataViewPage, setDataViewPage] = useState(1);
  const [dataViewPageSize, setDataViewPageSize] = useState(25);
  const [dataViewColumnFilters, setDataViewColumnFilters] = useState({});
  const queryClient = useQueryClient();

  useEffect(() => {
    setDataViewPage(1);
    setDataViewSearch("");
    setDataViewSortKey(null);
    setDataViewSortDir("asc");
    setDataViewColumnFilters({});
  }, [viewingId, viewingType]);

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

  const { data: scheduleList } = useQuery({
    queryKey: ["uploads", "schedule"],
    queryFn: () => uploadsApi.listSchedule({}),
  });
  const { data: tbList } = useQuery({
    queryKey: ["uploads", "trial-balance"],
    queryFn: () => uploadsApi.listTrialBalance({}),
  });
  const { data: pprecList } = useQuery({
    queryKey: ["uploads", "pprec"],
    queryFn: () => uploadsApi.listPprec({}),
  });

  const scheduleUploads = scheduleList?.uploads ?? [];
  const tbUploads = tbList?.uploads ?? [];
  const pprecUploads = pprecList?.uploads ?? [];

  const { data: viewingUpload } = useQuery({
    queryKey: ["upload-detail", viewingType, viewingId],
    queryFn: () => {
      if (viewingType === "schedule") return uploadsApi.getSchedule(viewingId);
      if (viewingType === "trial-balance")
        return uploadsApi.getTrialBalance(viewingId);
      if (viewingType === "pprec") return uploadsApi.getPprec(viewingId);
      return Promise.resolve(null);
    },
    enabled: Boolean(viewingId && viewingType),
  });
  const viewingRows = viewingUpload?.rows ?? [];
  const viewingHeaders =
    viewingRows.length > 0 ? Object.keys(viewingRows[0]) : [];

  const { filteredRows, totalFiltered, pageRows, totalPages } = useMemo(() => {
    if (!viewingRows.length)
      return {
        filteredRows: [],
        totalFiltered: 0,
        pageRows: [],
        totalPages: 0,
      };
    const searchLower = dataViewSearch.trim().toLowerCase();
    const colFilters = dataViewColumnFilters || {};
    let rows = viewingRows.filter((row) => {
      if (searchLower) {
        const matchSearch = viewingHeaders.some((h) =>
          String(row[h] ?? "")
            .toLowerCase()
            .includes(searchLower),
        );
        if (!matchSearch) return false;
      }
      for (const [col, val] of Object.entries(colFilters)) {
        if (!val?.trim()) continue;
        const cell = String(row[col] ?? "").toLowerCase();
        if (!cell.includes(val.trim().toLowerCase())) return false;
      }
      return true;
    });
    const totalFiltered = rows.length;
    if (dataViewSortKey && viewingHeaders.includes(dataViewSortKey)) {
      rows = [...rows].sort((a, b) => {
        const va = a[dataViewSortKey];
        const vb = b[dataViewSortKey];
        const na = Number(va);
        const nb = Number(vb);
        const numA = !Number.isNaN(na);
        const numB = !Number.isNaN(nb);
        if (numA && numB) return dataViewSortDir === "asc" ? na - nb : nb - na;
        const sa = String(va ?? "").toLowerCase();
        const sb = String(vb ?? "").toLowerCase();
        const cmp = sa.localeCompare(sb);
        return dataViewSortDir === "asc" ? cmp : -cmp;
      });
    }
    const totalPages = Math.max(1, Math.ceil(totalFiltered / dataViewPageSize));
    const page = Math.min(dataViewPage, totalPages);
    const start = (page - 1) * dataViewPageSize;
    const pageRows = rows.slice(start, start + dataViewPageSize);
    return { filteredRows: rows, totalFiltered, pageRows, totalPages };
  }, [
    viewingRows,
    viewingHeaders,
    dataViewSearch,
    dataViewSortKey,
    dataViewSortDir,
    dataViewPage,
    dataViewPageSize,
    dataViewColumnFilters,
  ]);

  const handleSortHeader = (key) => {
    if (dataViewSortKey === key) {
      setDataViewSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setDataViewSortKey(key);
      setDataViewSortDir("asc");
    }
    setDataViewPage(1);
  };

  const setColumnFilter = (col, value) => {
    setDataViewColumnFilters((prev) => ({ ...prev, [col]: value }));
    setDataViewPage(1);
  };

  useEffect(() => {
    if (totalPages > 0 && dataViewPage > totalPages)
      setDataViewPage(totalPages);
  }, [totalPages, dataViewPage]);

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
      queryClient.invalidateQueries(["uploads", "schedule"]);
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
      queryClient.invalidateQueries(["uploads", "trial-balance"]);
      setParseResult(null);
      setFile(null);
      setSelectedSheet("");
    },
  });

  const savePprecFileMutation = useMutation({
    mutationFn: ({ file, sheetName, entityId, periodId, fiscalYear }) =>
      uploadsApi.savePprecFile(file, {
        sheetName,
        entityId,
        periodId,
        fiscalYear,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(["uploads"]);
      queryClient.invalidateQueries(["uploads", "schedule"]);
      queryClient.invalidateQueries(["uploads", "trial-balance"]);
      queryClient.invalidateQueries(["uploads", "pprec"]);
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
    saveScheduleFileMutation.isPending ||
    saveTBFileMutation.isPending ||
    savePprecFileMutation.isPending;

  const canSave = file && (selectedSheet || sheets[0]);

  const handleSave = () => {
    if (!canSave) return;
    const payload = {
      file,
      sheetName: selectedSheet || sheets[0],
      entityId: entityId || undefined,
      periodId: periodId || undefined,
      fiscalYear: fiscalYear || undefined,
    };
    if (uploadType === "schedule") saveScheduleFileMutation.mutate(payload);
    else if (uploadType === "trial-balance") saveTBFileMutation.mutate(payload);
    else if (uploadType === "pprec") savePprecFileMutation.mutate(payload);
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
          Upload Prepayment Schedule, PPREC (Prepayment Reconciliation), or
          Trial Balance. Choose a sheet, review columns and preview, then save.
        </p>
        <div
          className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm dark:border-sky-800 dark:bg-sky-950/40"
          style={{ color: "var(--text-primary)" }}
        >
          <strong>
            After uploading all three (Prepayment Schedule, PPREC, Trial
            Balance):
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
          <div className="flex flex-wrap gap-4">
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
                checked={uploadType === "pprec"}
                onChange={() => setUploadType("pprec")}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium">PPREC</span>
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
          {uploadType === "pprec" && (
            <label className="flex flex-col gap-1">
              <span
                className="text-xs font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Fiscal year (optional)
              </span>
              <input
                type="text"
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
                placeholder="e.g. 2024"
                className="input-soft w-32"
              />
            </label>
          )}
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
                      : uploadType === "pprec"
                        ? "PPREC"
                        : "Trial Balance"}
                    .
                  </p>
                  {(uploadType === "schedule" ||
                    uploadType === "trial-balance" ||
                    uploadType === "pprec") && (
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

      <section className="card-soft p-4" aria-label="Uploaded Excel files">
        <h2
          className="mb-3 text-sm font-semibold uppercase tracking-wider"
          style={{ color: "var(--text-secondary)" }}
        >
          Uploaded Excel files
        </h2>
        <p className="mb-4 text-sm" style={{ color: "var(--text-secondary)" }}>
          View and inspect previously uploaded Schedule, Trial Balance, and
          PPREC data.
        </p>
        <div
          className="mb-4 flex gap-2 border-b pb-2"
          style={{ borderColor: "var(--border)" }}
        >
          {UPLOAD_LIST_TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setListTab(key)}
              className={`rounded px-3 py-1.5 text-sm font-medium ${
                listTab === key
                  ? "bg-sky-600 text-white dark:bg-sky-500"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {listTab === "schedule" && (
          <div
            className="overflow-x-auto rounded-lg border"
            style={{ borderColor: "var(--border)" }}
          >
            <table className="table-soft w-full min-w-[500px] text-left text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 font-medium">Created</th>
                  <th className="px-3 py-2 font-medium">Entity</th>
                  <th className="px-3 py-2 font-medium">Period</th>
                  <th className="px-3 py-2 font-medium">Rows</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {scheduleUploads.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-6 text-center text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      No Prepayment Schedule uploads yet. Upload an Excel file
                      above.
                    </td>
                  </tr>
                ) : (
                  scheduleUploads.map((u) => (
                    <tr key={u.id}>
                      <td
                        className="px-3 py-2"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleString()
                          : "—"}
                      </td>
                      <td
                        className="px-3 py-2"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {u.entityId ?? "—"}
                      </td>
                      <td
                        className="px-3 py-2"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {u.periodId ?? "—"}
                      </td>
                      <td
                        className="px-3 py-2 tabular-nums"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {(u.rows ?? []).length}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => {
                            setViewingId(u.id);
                            setViewingType("schedule");
                          }}
                          className="text-sm font-medium text-sky-600 hover:underline dark:text-sky-400"
                        >
                          View data
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        {listTab === "trial-balance" && (
          <div
            className="overflow-x-auto rounded-lg border"
            style={{ borderColor: "var(--border)" }}
          >
            <table className="table-soft w-full min-w-[500px] text-left text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 font-medium">Created</th>
                  <th className="px-3 py-2 font-medium">Entity</th>
                  <th className="px-3 py-2 font-medium">Period</th>
                  <th className="px-3 py-2 font-medium">Rows</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tbUploads.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-6 text-center text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      No Trial Balance uploads yet. Upload an Excel file above.
                    </td>
                  </tr>
                ) : (
                  tbUploads.map((u) => (
                    <tr key={u.id}>
                      <td
                        className="px-3 py-2"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleString()
                          : "—"}
                      </td>
                      <td
                        className="px-3 py-2"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {u.entityId ?? "—"}
                      </td>
                      <td
                        className="px-3 py-2"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {u.periodId ?? "—"}
                      </td>
                      <td
                        className="px-3 py-2 tabular-nums"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {(u.rows ?? []).length}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => {
                            setViewingId(u.id);
                            setViewingType("trial-balance");
                          }}
                          className="text-sm font-medium text-sky-600 hover:underline dark:text-sky-400"
                        >
                          View data
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        {listTab === "pprec" && (
          <div
            className="overflow-x-auto rounded-lg border"
            style={{ borderColor: "var(--border)" }}
          >
            <table className="table-soft w-full min-w-[500px] text-left text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 font-medium">Created</th>
                  <th className="px-3 py-2 font-medium">Entity</th>
                  <th className="px-3 py-2 font-medium">Period</th>
                  <th className="px-3 py-2 font-medium">Rows</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pprecUploads.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-6 text-center text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      No PPREC uploads yet. Upload an Excel file above.
                    </td>
                  </tr>
                ) : (
                  pprecUploads.map((u) => (
                    <tr key={u.id}>
                      <td
                        className="px-3 py-2"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleString()
                          : "—"}
                      </td>
                      <td
                        className="px-3 py-2"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {u.entityId ?? "—"}
                      </td>
                      <td
                        className="px-3 py-2"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {u.periodId ?? "—"}
                      </td>
                      <td
                        className="px-3 py-2 tabular-nums"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {(u.rows ?? []).length}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => {
                            setViewingId(u.id);
                            setViewingType("pprec");
                          }}
                          className="text-sm font-medium text-sky-600 hover:underline dark:text-sky-400"
                        >
                          View data
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {viewingId && viewingType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-data-title"
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl border bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800"
            style={{ borderColor: "var(--border)" }}
          >
            <div
              className="flex items-center justify-between border-b px-4 py-3"
              style={{ borderColor: "var(--border)" }}
            >
              <h3
                id="view-data-title"
                className="text-lg font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {viewingType === "schedule" && "Prepayment Schedule data"}
                {viewingType === "trial-balance" && "Trial Balance data"}
                {viewingType === "pprec" && "PPREC data"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setViewingId(null);
                  setViewingType(null);
                }}
                className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-600 dark:hover:text-slate-300"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="flex max-h-[calc(90vh-4rem)] flex-col overflow-hidden p-4">
              {viewingRows.length === 0 && !viewingUpload ? (
                <p
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Loading…
                </p>
              ) : viewingRows.length === 0 ? (
                <p
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  No rows in this upload.
                </p>
              ) : (
                <>
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <label className="flex flex-1 min-w-[180px] items-center gap-2">
                      <span
                        className="text-xs font-medium whitespace-nowrap"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Search
                      </span>
                      <input
                        type="search"
                        value={dataViewSearch}
                        onChange={(e) => {
                          setDataViewSearch(e.target.value);
                          setDataViewPage(1);
                        }}
                        placeholder="Search in all columns…"
                        className="input-soft flex-1 min-w-0 text-sm"
                        aria-label="Search rows"
                      />
                    </label>
                    <label className="flex items-center gap-2">
                      <span
                        className="text-xs font-medium whitespace-nowrap"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Rows per page
                      </span>
                      <select
                        value={dataViewPageSize}
                        onChange={(e) => {
                          setDataViewPageSize(Number(e.target.value));
                          setDataViewPage(1);
                        }}
                        className="input-soft w-20 text-sm"
                        aria-label="Rows per page"
                      >
                        {PAGE_SIZE_OPTIONS.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <p
                    className="mb-2 text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {totalFiltered === viewingRows.length
                      ? `${viewingRows.length} row${viewingRows.length !== 1 ? "s" : ""}`
                      : `${totalFiltered} of ${viewingRows.length} rows (filtered)`}
                  </p>
                  <div
                    className="flex-1 overflow-auto rounded-lg border"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <table className="table-soft w-full min-w-[600px] text-left text-sm">
                      <thead
                        className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800"
                        style={{ background: "var(--bg-card)" }}
                      >
                        <tr>
                          {viewingHeaders.map((h) => (
                            <th
                              key={h}
                              className="whitespace-nowrap px-3 py-2 font-medium"
                            >
                              <button
                                type="button"
                                onClick={() => handleSortHeader(h)}
                                className={`flex items-center gap-1 text-left hover:underline ${dataViewSortKey === h ? "font-semibold" : ""}`}
                                style={{ color: "var(--text-primary)" }}
                              >
                                {h}
                                {dataViewSortKey === h && (
                                  <span className="text-xs" aria-hidden>
                                    {dataViewSortDir === "asc" ? "↑" : "↓"}
                                  </span>
                                )}
                              </button>
                            </th>
                          ))}
                        </tr>
                        <tr
                          className="border-t"
                          style={{ borderColor: "var(--border)" }}
                        >
                          {viewingHeaders.map((h) => (
                            <th key={h} className="whitespace-nowrap px-2 py-1">
                              <input
                                type="text"
                                value={dataViewColumnFilters[h] ?? ""}
                                onChange={(e) =>
                                  setColumnFilter(h, e.target.value)
                                }
                                placeholder="Filter"
                                className="w-full max-w-[120px] rounded border px-2 py-1 text-xs"
                                style={{
                                  borderColor: "var(--border)",
                                  color: "var(--text-primary)",
                                  background: "var(--bg-page)",
                                }}
                                aria-label={`Filter column ${h}`}
                              />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={viewingHeaders.length}
                              className="px-3 py-8 text-center text-sm"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {totalFiltered === 0 && viewingRows.length > 0
                                ? "No rows match the current search or filters."
                                : "No rows."}
                            </td>
                          </tr>
                        ) : (
                          pageRows.map((row, i) => (
                            <tr key={(dataViewPage - 1) * dataViewPageSize + i}>
                              {viewingHeaders.map((key) => (
                                <td
                                  key={key}
                                  className="tabular-nums px-3 py-2"
                                  style={{ color: "var(--text-primary)" }}
                                >
                                  {row[key] != null ? String(row[key]) : "—"}
                                </td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div
                    className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Showing {(dataViewPage - 1) * dataViewPageSize + 1}–
                      {Math.min(dataViewPage * dataViewPageSize, totalFiltered)}{" "}
                      of {totalFiltered}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setDataViewPage((p) => Math.max(1, p - 1))
                        }
                        disabled={dataViewPage <= 1}
                        className="rounded border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                        style={{
                          borderColor: "var(--border)",
                          color: "var(--text-primary)",
                        }}
                      >
                        Previous
                      </button>
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Page {dataViewPage} of {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setDataViewPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={dataViewPage >= totalPages}
                        className="rounded border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                        style={{
                          borderColor: "var(--border)",
                          color: "var(--text-primary)",
                        }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
