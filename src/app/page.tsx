export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Digital Bullet Journal</h1>
      <p className="mt-4 text-lg text-gray-600">
        Organize your tasks, events, and notes with customizable layouts.
      </p>
      <a
        href="/demo"
        className="mt-8 px-6 py-3 bg-gradient-to-r from-[#4EDBA1] via-[#F5C872] to-[#F5A6C8] text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all"
      >
        Open Journal →
      </a>
    </main>
  );
}
