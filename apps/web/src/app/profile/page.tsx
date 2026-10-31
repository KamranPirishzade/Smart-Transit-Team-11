'use client';

import Link from 'next/link';

const rewards = [
  { title: 'Jet', detail: '10 dəq', icon: '🛴', coins: 200 },
  { title: 'Apar', detail: '10 dəq', icon: '🚲', coins: 200 },
  { title: 'Jet', detail: '30 dəq', icon: '🛴', coins: 600 },
];

export default function ProfilePage() {
  return (
    <main className="app-shell mx-auto max-w-lg px-4 pb-28 pt-7">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-[28px] font-extrabold">Profil</h1>
        <span className="grid h-8 w-8 place-items-center rounded-full border border-slate-400 text-sm text-slate-500">i</span>
      </header>
      <section className="mb-7 flex items-center justify-between">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-brand font-bold text-white">S</span><span className="font-semibold">Sərnişin <span className="font-normal text-slate-400">· Toxum</span></span></div>
        <span className="text-3xl">🌱</span>
      </section>
      <div className="mb-7 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 text-xl">◉</span><span className="text-2xl font-extrabold">96 coin</span><span className="text-sm text-slate-500">≈ 0,5 kq CO₂</span></div>
      <h2 className="mb-3 text-lg font-bold">Mükafatlar</h2>
      <div className="mb-8 flex gap-3 overflow-x-auto pb-2">
        {rewards.map((reward, index) => <div key={`${reward.title}-${index}`} className="min-w-32 rounded-[20px] bg-white p-3 text-center shadow-sm"><div className="flex justify-between text-xs text-slate-500"><span>{reward.title}</span><span>🔒</span></div><div className="my-3 text-4xl">{reward.icon}</div><div className="font-semibold">{reward.detail}</div><div className="mt-1 text-xs text-emerald-600">◉ {reward.coins}</div></div>)}
      </div>
      <div className="mb-7 flex items-center justify-between rounded-[20px] border border-emerald-300 bg-white p-4"><div><div className="font-bold">Coin-ləriniz</div><div className="text-xs text-slate-500">≈ 0,5 kq CO₂ qənaət</div></div><div className="flex items-center gap-3 text-lg font-bold text-emerald-600">96 coin <span className="text-xl text-slate-500">›</span></div></div>
      <h2 className="mb-3 text-lg font-bold">Coin qazanın:</h2>
      <div className="space-y-3">
        {['QR biletlə avtobusa minin', 'Biletdən sonra 30 dəq ərzində hub-da skuter və ya velosiped götürün', 'İctimai nəqliyyatdan istifadəni paylaşın'].map((text, index) => <article key={text} className="flex items-center justify-between rounded-[20px] bg-white p-4 shadow-sm"><div><div className="mb-2 flex gap-2 text-xs"><span className="rounded-full bg-[#a96b25] px-2 py-1 text-white">◷ Limitsiz</span><span className="rounded-full bg-emerald-600 px-2 py-1 text-white">◉ +{48 + index * 2}</span></div><div className="text-sm font-medium">{text}</div></div><span className="text-2xl">{['🎫', '⏱️', '🚀'][index]}</span></article>)}
      </div>
      <nav className="bottom-nav fixed bottom-0 left-0 right-0 z-20 mx-auto flex max-w-lg justify-around rounded-t-[26px] bg-white/95 px-3 pt-2 shadow-[0_-8px_24px_rgba(18,55,96,0.08)]"><Link href="/" className="flex flex-col items-center gap-1 px-5 py-2 text-[11px] text-slate-500"><span className="text-lg">⌁</span>Nəqliyyat</Link><span className="flex flex-col items-center gap-1 rounded-2xl bg-[#eaf1ff] px-5 py-2 text-[11px] font-bold text-brand"><span className="text-lg">♙</span>Profil</span></nav>
    </main>
  );
}
