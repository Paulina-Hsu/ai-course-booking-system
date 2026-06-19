import Link from "next/link";

interface SearchParams {
  name?: string;
  phone?: string;
  course?: string;
  email?: string;
  isMember?: string;
  price?: string;
  bookingId?: string;
}

export default function BookingSuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <section className="card max-w-2xl">
      <h1 className="text-2xl font-bold text-green-700">報名成功</h1>
      <p className="mt-2 text-sm text-slate-600">報名資料已送出，狀態預設為「待確認」。</p>

      <div className="mt-4 space-y-2 text-sm">
        <p>訂單編號：{searchParams.bookingId ?? "-"}</p>
        <p>姓名：{searchParams.name ?? "-"}</p>
        <p>手機：{searchParams.phone ?? "-"}</p>
        <p>Email：{searchParams.email ?? "-"}</p>
        <p>課程：{searchParams.course ?? "-"}</p>
        <p>會員：{searchParams.isMember ?? "-"}</p>
        <p>金額：{searchParams.price ? `NT$ ${searchParams.price}` : "-"}</p>
      </div>

      <Link
        href="/courses"
        className="mt-5 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm text-white"
      >
        回到課程列表
      </Link>
    </section>
  );
}
