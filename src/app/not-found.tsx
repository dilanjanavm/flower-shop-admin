import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <p className="font-semibold tracking-tight text-6xl text-brand">404</p>
        <p className="mt-2 font-semibold tracking-tight text-lg">This screen doesn&apos;t exist</p>
        <Link href="/" className="mt-6 inline-block rounded-full bg-invert px-5 py-2.5 text-sm text-invert-fg">Back to dashboard</Link>
      </div>
    </div>
  );
}
