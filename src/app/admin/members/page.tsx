"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  ImportMemberInput,
  listMembers,
  normalizeMemberPhone,
  upsertMembers,
} from "@/lib/firestoreService";
import { Member } from "@/lib/firestoreTypes";

type ExcelRow = Record<string, unknown>;

const getCellText = (row: ExcelRow, keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
};

const getCellValue = (row: ExcelRow, keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim()) return value;
  }
  return "";
};

const formatDateValue = (value: unknown) => {
  if (!value) return "未填寫";
  if (value instanceof Date) return value.toLocaleDateString("zh-TW");
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value) {
    const timestampValue = value as { toDate?: () => Date };
    if (typeof timestampValue.toDate === "function") {
      return timestampValue.toDate().toLocaleDateString("zh-TW");
    }
  }
  return String(value);
};

const mapExcelRowToMember = (row: ExcelRow): ImportMemberInput => ({
  memberNo: getCellText(row, ["編號", "會員編號", "memberNo", "Member No"]),
  name: getCellText(row, ["姓名", "會員姓名", "name", "Name"]),
  phone: getCellText(row, ["手機", "電話", "phone", "Phone"]),
  email: getCellText(row, ["email", "Email", "EMAIL", "電子信箱"]),
  statusLabel: getCellText(row, ["狀態", "會員狀態", "status", "Status"]),
  note: getCellText(row, ["備註", "note", "Note"]),
  joinedAt: getCellValue(row, ["入會日期", "joinedAt", "Joined At", "加入日期"]),
});

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [previewRows, setPreviewRows] = useState<ImportMemberInput[]>([]);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  const refreshMembers = useCallback(async () => {
    setIsLoadingMembers(true);
    try {
      setMembers(await listMembers());
    } catch (error) {
      const message = error instanceof Error ? error.message : "會員資料讀取失敗";
      setErrorMessage(message);
    } finally {
      setIsLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshMembers();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshMembers]);

  const previewStats = useMemo(() => {
    const validRows = previewRows.filter((row) => row.memberNo || normalizeMemberPhone(row.phone || ""));
    const missingPhoneCount = previewRows.filter((row) => !normalizeMemberPhone(row.phone || "")).length;
    const phoneCounts = new Map<string, number>();
    previewRows.forEach((row) => {
      const phone = normalizeMemberPhone(row.phone || "");
      if (!phone) return;
      phoneCounts.set(phone, (phoneCounts.get(phone) || 0) + 1);
    });
    const duplicatePhoneCount = Array.from(phoneCounts.values()).filter((count) => count > 1).length;

    return {
      totalRows: previewRows.length,
      validRows: validRows.length,
      skippedRows: previewRows.length - validRows.length,
      missingPhoneCount,
      duplicatePhoneCount,
    };
  }, [previewRows]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setMessage("");
    setErrorMessage("");
    setIsParsing(true);

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), {
        type: "array",
        cellDates: true,
      });
      const firstSheetName = workbook.SheetNames[0];
      const firstSheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<ExcelRow>(firstSheet, {
        defval: "",
      });
      setPreviewRows(rows.map(mapExcelRowToMember));
      setMessage(`已解析 ${file.name}，請確認預覽資料後再同步 Firestore。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Excel 解析失敗";
      setErrorMessage(`Excel 解析失敗：${message}`);
      setPreviewRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    setMessage("");
    setErrorMessage("");
    setIsImporting(true);

    try {
      const result = await upsertMembers(previewRows);
      await refreshMembers();
      setMessage(`同步完成：新增/更新 ${result.importedCount} 筆，略過 ${result.skippedCount} 筆，標記停用 ${result.deactivatedCount} 筆。`);
      if (result.errors.length > 0) {
        setErrorMessage(result.errors.slice(0, 10).join("\n"));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "同步失敗";
      setErrorMessage(`同步失敗：${message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Members</p>
          <h1 className="text-3xl font-bold text-slate-950">會員管理</h1>
          <p className="mt-2 text-slate-600">
            上傳 Excel 會員名單，預覽確認後同步 Firestore members collection。
          </p>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <label className="text-sm font-semibold text-slate-700" htmlFor="member-file">
              選擇會員名單 Excel
            </label>
            <input
              id="member-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
            />
            <p className="mt-2 text-sm text-slate-500">
              支援欄位：編號、姓名、手機、email、狀態、備註、入會日期。新版 Excel 裡沒有出現的既有會員會標記為停用，不會刪除。
            </p>
          </div>
          <button
            type="button"
            onClick={handleImport}
            disabled={previewStats.validRows === 0 || isImporting || isParsing}
            className="rounded-full bg-slate-900 px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isImporting ? "同步中..." : "同步 Firestore"}
          </button>
        </div>

        {selectedFileName && (
          <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-5">
            <p>
              檔案：<span className="font-semibold">{selectedFileName}</span>
            </p>
            <p>總列數：{previewStats.totalRows}</p>
            <p>可同步：{previewStats.validRows}</p>
            <p>缺手機：{previewStats.missingPhoneCount}</p>
            <p>重複手機：{previewStats.duplicatePhoneCount}</p>
          </div>
        )}

        {message && (
          <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>
        )}
        {errorMessage && (
          <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </pre>
        )}
      </section>

      {previewRows.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">同步預覽</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="border border-slate-200 px-3 py-3">編號</th>
                  <th className="border border-slate-200 px-3 py-3">姓名</th>
                  <th className="border border-slate-200 px-3 py-3">手機</th>
                  <th className="border border-slate-200 px-3 py-3">Email</th>
                  <th className="border border-slate-200 px-3 py-3">狀態</th>
                  <th className="border border-slate-200 px-3 py-3">入會日期</th>
                  <th className="border border-slate-200 px-3 py-3">備註</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.slice(0, 20).map((row, index) => (
                  <tr key={`${row.memberNo || row.phone || "row"}-${index}`}>
                    <td className="border border-slate-200 px-3 py-3">{row.memberNo || "未填寫"}</td>
                    <td className="border border-slate-200 px-3 py-3">{row.name || "未填寫"}</td>
                    <td className="border border-slate-200 px-3 py-3">{row.phone || "未填寫"}</td>
                    <td className="break-all border border-slate-200 px-3 py-3">{row.email || "未填寫"}</td>
                    <td className="border border-slate-200 px-3 py-3">{row.statusLabel || "有效"}</td>
                    <td className="border border-slate-200 px-3 py-3">{formatDateValue(row.joinedAt)}</td>
                    <td className="border border-slate-200 px-3 py-3">{row.note || "未填寫"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {previewRows.length > 20 && (
            <p className="mt-3 text-sm text-slate-500">預覽只顯示前 20 筆，同步時會處理全部資料。</p>
          )}
        </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-950">目前會員名單</h2>
          <button
            type="button"
            onClick={refreshMembers}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            {isLoadingMembers ? "讀取中..." : "重新整理"}
          </button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="border border-slate-200 px-3 py-3">編號</th>
                <th className="border border-slate-200 px-3 py-3">姓名</th>
                <th className="border border-slate-200 px-3 py-3">手機</th>
                <th className="border border-slate-200 px-3 py-3">Email</th>
                <th className="border border-slate-200 px-3 py-3">狀態</th>
                <th className="border border-slate-200 px-3 py-3">入會日期</th>
                <th className="border border-slate-200 px-3 py-3">備註</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="border border-slate-200 px-3 py-3">{member.memberNo || "未填寫"}</td>
                  <td className="border border-slate-200 px-3 py-3">{member.name || "未填寫"}</td>
                  <td className="border border-slate-200 px-3 py-3">{member.phone || "未填寫"}</td>
                  <td className="break-all border border-slate-200 px-3 py-3">{member.email || "未填寫"}</td>
                  <td className="border border-slate-200 px-3 py-3">{member.statusLabel || member.status}</td>
                  <td className="border border-slate-200 px-3 py-3">{formatDateValue(member.joinedAt)}</td>
                  <td className="border border-slate-200 px-3 py-3">{member.note || "未填寫"}</td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td className="border border-slate-200 px-3 py-8 text-center text-slate-500" colSpan={7}>
                    目前尚無會員資料。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
