import { BOOKINGS, COURSES, SESSIONS } from "@/data/courses";

export default function AdminDashboardPage() {
  const pendingCount = BOOKINGS.filter((booking) => booking.status === "pending").length;
  const confirmedCount = BOOKINGS.filter((booking) => booking.status === "confirmed").length;
  const paidCount = BOOKINGS.filter((booking) => booking.status === "paid").length;

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <div className="card">
          <p className="text-sm text-slate-500">課程總數</p>
          <p className="text-2xl font-bold">{COURSES.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">期別總數</p>
          <p className="text-2xl font-bold">{SESSIONS.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">待確認報名</p>
          <p className="text-2xl font-bold">{pendingCount}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">已付款</p>
          <p className="text-2xl font-bold">{paidCount}</p>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold">即時重點</h2>
        <p className="text-sm text-slate-600">待確認：{pendingCount}</p>
        <p className="text-sm text-slate-600">已確認：{confirmedCount}</p>
        <p className="text-sm text-slate-600">候補：{BOOKINGS.filter((booking) => booking.status === "waitlist").length}</p>
      </div>
    </section>
  );
}
