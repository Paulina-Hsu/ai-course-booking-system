"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { OneOnOneSlot } from "@/lib/firestoreTypes";
import {
  createOneOnOneSlot,
  listOneOnOneSlots,
  setOneOnOneSlotOpen,
  updateOneOnOneSlot,
} from "@/lib/firestoreService";

interface SlotFormState {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  pricePerHour: string;
  isOpen: boolean;
}

const DEFAULT_SLOT_FORM: SlotFormState = {
  id: "",
  date: "",
  startTime: "08:30",
  endTime: "09:30",
  pricePerHour: "1600",
  isOpen: true,
};

function formatStatus(slot: OneOnOneSlot): string {
  if (!slot.isOpen) return "停用";
  return slot.isBooked ? "已預約" : "可預約";
}

export default function AdminOneOnOnePage() {
  const [slots, setSlots] = useState<OneOnOneSlot[]>([]);
  const [form, setForm] = useState<SlotFormState>(DEFAULT_SLOT_FORM);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    return listOneOnOneSlots().then(setSlots);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const clearMessage = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 1600);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      if (!form.date) {
        throw new Error("請選擇日期");
      }

      if (form.id) {
        await updateOneOnOneSlot(form.id, {
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
          pricePerHour: Number(form.pricePerHour) || 1600,
          isOpen: form.isOpen,
        });
        clearMessage("時段已更新");
      } else {
        await createOneOnOneSlot({
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
          pricePerHour: Number(form.pricePerHour) || 1600,
          isOpen: form.isOpen,
        });
        clearMessage("時段已新增");
      }

      setForm(DEFAULT_SLOT_FORM);
      await load();
    } catch (error) {
      clearMessage(error instanceof Error ? error.message : "操作失敗");
    } finally {
      setLoading(false);
    }
  };

  const onEdit = (slot: OneOnOneSlot) => {
    setForm({
      id: slot.id,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      pricePerHour: String(slot.pricePerHour),
      isOpen: slot.isOpen,
    });
  };

  const onToggleOpen = async (slotId: string, isOpen: boolean) => {
    await setOneOnOneSlotOpen(slotId, isOpen);
    await load();
  };

  const onReset = () => {
    setForm(DEFAULT_SLOT_FORM);
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">1 對 1 時段管理</h1>

      <form onSubmit={onSubmit} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2">
        <div className="flex flex-col gap-1 text-sm">
          <label>日期</label>
          <input
            required
            type="date"
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.date}
            onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <label>開始時間（預設 08:30）</label>
          <input
            required
            type="time"
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.startTime}
            onChange={(event) => setForm((prev) => ({ ...prev, startTime: event.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <label>結束時間（預設 09:30）</label>
          <input
            required
            type="time"
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.endTime}
            onChange={(event) => setForm((prev) => ({ ...prev, endTime: event.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <label>時價（預設 1600）</label>
          <input
            required
            type="number"
            min={0}
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.pricePerHour}
            onChange={(event) => setForm((prev) => ({ ...prev, pricePerHour: event.target.value }))}
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isOpen}
            onChange={(event) => setForm((prev) => ({ ...prev, isOpen: event.target.checked }))}
          />
          開放預約
        </label>

        <div className="md:col-span-2 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white disabled:bg-slate-400"
          >
            {form.id ? "更新時段" : "新增時段"}
          </button>
          {form.id ? (
            <button
              type="button"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm"
              onClick={onReset}
            >
              取消編輯
            </button>
          ) : null}
          {message ? <span className="text-sm text-slate-600">{message}</span> : null}
        </div>
      </form>

      <div className="grid gap-3">
        {slots.map((slot) => (
          <div key={slot.id} className="card flex items-center justify-between p-4">
            <div>
              <p className="font-semibold">
                {slot.date} {slot.startTime}-{slot.endTime}
              </p>
              <p className="text-sm text-slate-600">價格：NT$ {slot.pricePerHour}/小時</p>
              <p className="text-sm text-slate-600">狀態：{formatStatus(slot)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => onEdit(slot)} className="rounded-full border border-slate-300 px-3 py-1 text-sm">
                編輯
              </button>
              <button
                className={`rounded-full px-3 py-1 text-sm ${slot.isOpen ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}
                onClick={() => onToggleOpen(slot.id, !slot.isOpen)}
              >
                {slot.isOpen ? "停用" : "啟用"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
