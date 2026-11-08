import { useState, type InputHTMLAttributes } from 'react';

type DraftNumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange' | 'onBlur'
> & {
  value: number | string | null | undefined;
  onCommit: (value: string) => void;
  /** Without this, leaving the field empty keeps the saved value. */
  commitEmpty?: boolean;
};

/** Number field that holds what is typed and only saves on blur, so clamping can't rewrite it. */
export default function DraftNumberInput({
  value,
  onCommit,
  commitEmpty = false,
  ...inputProps
}: DraftNumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const savedValue = String(value ?? '');

  const commit = () => {
    if (draft === null) return;
    if (draft !== savedValue && (draft !== '' || commitEmpty)) onCommit(draft);
    setDraft(null);
  };

  return (
    <input
      {...inputProps}
      type="number"
      value={draft ?? savedValue}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
    />
  );
}
