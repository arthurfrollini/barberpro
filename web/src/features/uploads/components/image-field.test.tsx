import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { signIn } from '@/test/render';
import { server } from '@/test/server';
import { ImageField, type ImageValue } from './image-field';

function Harness({
  initial,
  onChange,
}: {
  initial: string | null;
  onChange: (v: ImageValue) => void;
}) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <ImageField
      label="Foto"
      url={value}
      onChange={(next) => {
        setValue(next.url);
        onChange(next);
      }}
    />
  );
}

const png = () =>
  new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'me.png', { type: 'image/png' });

describe('ImageField', () => {
  it('uploads the picked image and reports its id', async () => {
    signIn();
    server.use(
      http.post('*/uploads', () =>
        HttpResponse.json({ id: 'f1', url: 'http://api/files/f1' }, { status: 201 }),
      ),
    );
    const onChange = vi.fn();
    render(<Harness initial={null} onChange={onChange} />);
    await userEvent.upload(screen.getByLabelText('Foto'), png());

    expect(await screen.findByRole('img', { name: 'Foto' })).toHaveAttribute(
      'src',
      'http://api/files/f1',
    );
    expect(onChange).toHaveBeenCalledWith({ fileId: 'f1', url: 'http://api/files/f1' });
  });

  it('refuses a file that is not an image before uploading', async () => {
    const onChange = vi.fn();
    render(<Harness initial={null} onChange={onChange} />);
    // user-event filters by `accept`; a drop or an old browser can still hand over anything
    fireEvent.change(screen.getByLabelText('Foto'), {
      target: { files: [new File(['GIF89a'], 'a.gif', { type: 'image/gif' })] },
    });
    expect(await screen.findByText('Use uma imagem JPEG, PNG ou WebP.')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows the API's refusal in Portuguese", async () => {
    signIn();
    server.use(
      http.post('*/uploads', () =>
        HttpResponse.json({ code: 'UNSUPPORTED_FILE_TYPE', message: 'nope' }, { status: 415 }),
      ),
    );
    render(<Harness initial={null} onChange={vi.fn()} />);
    await userEvent.upload(screen.getByLabelText('Foto'), png());
    expect(await screen.findByText('Use uma imagem JPEG, PNG ou WebP.')).toBeInTheDocument();
  });

  it('removes the image', async () => {
    const onChange = vi.fn();
    render(<Harness initial="http://api/files/old" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remover' }));
    expect(onChange).toHaveBeenCalledWith({ fileId: null, url: null });
    expect(screen.queryByRole('img', { name: 'Foto' })).not.toBeInTheDocument();
  });
});
