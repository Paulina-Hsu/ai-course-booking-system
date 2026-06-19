import { BOOKINGS } from "@/data/courses";
import { BOOKING_STATUS_OPTIONS } from "@/lib/firestoreTypes";

export default function AdminBookingsPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">報名管理</h1>
      <button className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white">CSV 匯出（草稿）</button>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] table-fixed border border-slate-200 bg-white">
          <thead>
            <tr className="bg-slate-100 text-left text-sm">
              <th className="border border-slate-200 px-3 py-2">姓名</th>
              <th className="border border-slate-200 px-3 py-2">手機</th>
              <th className="border border-slate-200 px-3 py-2">課程</th>
              <th className="border border-slate-200 px-3 py-2">金額</th>
              <th className="border border-slate-200 px-3 py-2">狀態</th>
              <th className="border border-slate-200 px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {BOOKINGS.map((booking) => (
              <tr key={booking.id}>
                <td className="border border-slate-200 px-3 py-2 text-sm">{booking.name}</td>
                <td className="border border-slate-200 px-3 py-2 text-sm">{booking.phone}</td>
                <td className="border border-slate-200 px-3 py-2 text-sm">{booking.courseId}</td>
                <td className="border border-slate-200 px-3 py-2 text-sm">NT$ {booking.amount}</td>
                <td className="border border-slate-200 px-3 py-2 text-sm">
                  <span className="rounded-full border border-slate-200 px-2 py-1 text-xs">{booking.status}</span>
                </td>
                <td className="border border-slate-200 px-3 py-2 text-sm">
                  <select
                    defaultValue={booking.status}
                    className="w-full rounded border border-slate-300 px-2 py-1"
                  >
                    {BOOKING_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
