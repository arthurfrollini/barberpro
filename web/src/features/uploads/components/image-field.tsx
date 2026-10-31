import { ImageIcon, Loader2 } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { isApiError } from '@/shared/api';
import { messageFor } from '@/shared/lib/error-messages';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { uploadImage } from '../api/upload';
import { IMAGE_TYPES, checkImage } from '../lib/check-image';

export type ImageValue = { fileId: string | null; url: string | null };

/**
 * Pick, upload and preview one image. The upload happens on pick, so the form only carries
 * the returned file id; `{ fileId: null }` means "remove the image".
 */
export function ImageField({
  label,
  url,
  onChange,
  shape = 'circle',
}: {
  label: string;
  url: string | null;
  onChange: (value: ImageValue) => void;
  shape?: 'circle' | 'square';
}) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    const problem = checkImage(file);
    setError(problem);
    if (problem) return;
    setUploading(true);
    try {
      const uploaded = await uploadImage(file);
      onChange({ fileId: uploaded.id, url: uploaded.url });
    } catch (e) {
      setError(messageFor(isApiError(e) ? e.code : undefined));
    } finally {
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  };

  const frame = cn(
    'grid size-24 shrink-0 place-items-center overflow-hidden border bg-input',
    shape === 'circle' ? 'rounded-full' : 'rounded-lg',
  );

  return (
    <div className="flex items-center gap-5">
      <div className={frame}>
        {url ? (
          <img src={url} alt={label} className="size-full object-cover" />
        ) : (
          <ImageIcon aria-hidden className="size-8 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-col items-start gap-2">
        <input
          ref={input}
          id={inputId}
          type="file"
          accept={IMAGE_TYPES.join(',')}
          aria-label={label}
          className="sr-only"
          onChange={(event) => void pick(event.target.files?.[0])}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => input.current?.click()}
          >
            {uploading && <Loader2 className="animate-spin" />}
            {uploading ? 'Enviando…' : url ? 'Trocar imagem' : 'Escolher imagem'}
          </Button>
          {url && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploading}
              onClick={() => onChange({ fileId: null, url: null })}
            >
              Remover
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">JPEG, PNG ou WebP, até 2 MB.</p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
