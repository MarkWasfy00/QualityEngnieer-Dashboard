"use client";
import { useActionState } from "react";
import Link from "next/link";
import { Save } from "lucide-react";

export type Field = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "textarea" | "checkbox";
  options?: readonly (string | { value: string | number; label: string })[];
  required?: boolean;
  step?: string;
  placeholder?: string;
  full?: boolean;
  ltr?: boolean;
  suggestions?: string[]; // autocomplete from existing values
};
export type FormState = { errors?: Record<string, string[] | undefined>; message?: string } | undefined;

export default function RecordForm({ fields, action, defaults = {}, cancelHref, deleteAction }: {
  fields: Field[];
  action: (s: FormState, f: FormData) => Promise<FormState>;
  defaults?: Record<string, string | number | boolean | null | undefined>;
  cancelHref: string;
  deleteAction?: () => Promise<void>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <div className="card max-w-4xl p-6">
      <form action={formAction} className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {fields.map((f) => {
          const err = state?.errors?.[f.name]?.[0];
          const dv = defaults[f.name];
          const common = { name: f.name, id: f.name, required: f.required, placeholder: f.placeholder, className: "input", dir: f.ltr ? "ltr" : undefined };
          return (
            <div key={f.name} className={f.full || f.type === "textarea" ? "md:col-span-2" : ""}>
              {f.type === "checkbox" ? (
                <label className="mt-7 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" name={f.name} defaultChecked={!!dv} className="h-4 w-4 accent-blue-600" /> {f.label}
                </label>
              ) : (
                <>
                  <label htmlFor={f.name} className="mb-1.5 block text-sm font-medium text-slate-700">
                    {f.label}{f.required && <span className="text-red-500"> *</span>}
                  </label>
                  {f.type === "select" ? (
                    <select {...common} defaultValue={dv == null ? "" : String(dv)}>
                      {!f.required && <option value="">—</option>}
                      {f.options?.map((o) => typeof o === "string"
                        ? <option key={o} value={o}>{o}</option>
                        : <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea {...common} rows={3} defaultValue={dv == null ? "" : String(dv)} />
                  ) : (
                    <>
                      <input {...common} type={f.type ?? "text"} step={f.step} defaultValue={dv == null ? "" : String(dv)}
                        list={f.suggestions?.length ? `${f.name}-list` : undefined} autoComplete="off" />
                      {f.suggestions?.length ? (
                        <datalist id={`${f.name}-list`}>{f.suggestions.map((x) => <option key={x} value={x} />)}</datalist>
                      ) : null}
                    </>
                  )}
                </>
              )}
              {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
            </div>
          );
        })}
        {state?.message && <p className="md:col-span-2 text-sm text-red-600">{state.message}</p>}
        <div className="md:col-span-2 flex items-center gap-3 border-t border-slate-100 pt-5">
          <button type="submit" disabled={pending} className="btn-primary"><Save size={16} /> {pending ? "جاري الحفظ…" : "حفظ"}</button>
          <Link href={cancelHref} className="btn-ghost">إلغاء</Link>
          {deleteAction && (
            <button formAction={deleteAction} formNoValidate className="btn-danger ms-auto"
              onClick={(e) => { if (!confirm("متأكد إنك عايز تمسح السجل ده نهائياً؟")) e.preventDefault(); }}>
              مسح
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
