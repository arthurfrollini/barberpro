import { PageHeader } from '@/shared/ui/page-header';

/** Stands in for a screen that a later change builds. */
export function PlaceholderPage({ title }: { title: string }) {
  return <PageHeader title={title} description="Esta tela chega na próxima versão." />;
}
