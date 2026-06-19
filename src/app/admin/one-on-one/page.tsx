import { ONE_ON_ONE_SLOTS } from "@/data/courses";

export default function AdminOneOnOnePage() {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">1 對 1 預約管理</h1>
        <button className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white">
          新增時段（草稿）
        </button>
      </div>

      <div className="grid gap-3">
        {ONE_ON_ONE_SLOTS.map((slot) => (
          <div key={slot.id} className="card flex items-center justify-between">
            <div>
              <p className="font-semibold">日期：{slot.date}</p>
              <p className="text-sm text-slate-600">
                時間：{slot.startTime}–{slot.endTime}（每小時 NT$ {slot.pricePerHour}）
              </p>
            </div>
            <div className="text-sm">
              <span
                className={`rounded-full px-3 py-1 ${
                  slot.isBooked ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {slot.isBooked ? "已預約" : "可預約"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
