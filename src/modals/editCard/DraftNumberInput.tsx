import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react';

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

  const saveDraft = () => {
    if (draft !== null && draft !== savedValue && (draft !== '' || commitEmpty)) onCommit(draft);
  };

  // Some touch browsers close a popup without blurring the focused field first.
  const saveDraftRef = useRef(saveDraft);
  useEffect(() => {
    saveDraftRef.current = saveDraft;
  });
  useEffect(() => () => saveDraftRef.current(), []);

  return (
    <input
      {...inputProps}
      type="number"
      value={draft ?? savedValue}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        saveDraft();
        setDraft(null);
      }}
    />
  );
}
