import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays } from '@/shared/lib/time';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

export function DayToolbar({
  date,
  today,
  onChange,
}: {
  date: string;
  today: string;
  onChange: (date: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        aria-label="Dia anterior"
        onClick={() => onChange(addDays(date, -1))}
      >
        <ChevronLeft />
      </Button>
      <Button variant="outline" onClick={() => onChange(today)} disabled={date === today}>
        Hoje
      </Button>
      <Button
        variant="outline"
        size="icon"
        aria-label="Próximo dia"
        onClick={() => onChange(addDays(date, 1))}
      >
        <ChevronRight />
      </Button>
      <Input
        type="date"
        aria-label="Escolher dia"
        className="w-auto"
        value={date}
        onChange={(event) => event.target.value && onChange(event.target.value)}
      />
    </div>
  );
}
