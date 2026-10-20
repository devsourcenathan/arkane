import { TextField, TextAreaField } from "./forms";

export interface TransField {
  key: string;
  label: string;
  multiline?: boolean;
}

/**
 * Section de traduction anglaise d'un contenu. `value` est le sac { champ: valeur }
 * pour l'anglais ; les champs laissés vides retombent sur le texte français.
 */
export function TranslationFields({
  fields,
  value,
  onChange,
}: {
  fields: TransField[];
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
  const set = (key: string, v: string) => onChange({ ...value, [key]: v });

  return (
    <section className="rounded-lg border border-border bg-surface/30 p-5">
      <h3 className="font-display text-sm font-bold tracking-wide">🌐 English version</h3>
      <p className="mb-4 mt-1 text-xs text-fg-subtle">
        Traduction anglaise. Laissez un champ vide pour réutiliser le texte français.
      </p>
      <div className="space-y-4">
        {fields.map((f) =>
          f.multiline ? (
            <TextAreaField key={f.key} label={f.label} value={value[f.key] ?? ""} onChange={(v) => set(f.key, v)} rows={4} />
          ) : (
            <TextField key={f.key} label={f.label} value={value[f.key] ?? ""} onChange={(v) => set(f.key, v)} />
          ),
        )}
      </div>
    </section>
  );
}
