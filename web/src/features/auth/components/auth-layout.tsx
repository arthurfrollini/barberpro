import type { ReactNode } from 'react';

/**
 * The one place the full logo appears: the shop sign on the left, the form on the right.
 * On phones the sign shrinks to a band above the form.
 */
export function AuthLayout({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid min-h-svh md:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
      <aside className="flex items-center justify-center bg-sidebar px-6 py-8 md:py-0">
        <img src="/logo.svg" alt="BarberPro" className="w-56 max-w-full md:w-[26rem]" />
      </aside>
      <main className="flex w-full max-w-md flex-col justify-center justify-self-center px-6 py-10 md:px-12">
        <h1 className="mb-8 text-3xl font-semibold">{title}</h1>
        {children}
        <p className="mt-8 text-sm text-muted-foreground">{footer}</p>
      </main>
    </div>
  );
}
