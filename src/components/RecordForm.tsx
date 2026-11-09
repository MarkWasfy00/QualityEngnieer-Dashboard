"use client";
import { useActionState } from "react";
import Link from "next/link";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

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
    <Card className="max-w-4xl">
      <CardContent>
        <form action={formAction} className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {fields.map((f) => {
            const err = state?.errors?.[f.name]?.[0];
            const dv = defaults[f.name];
            const value = dv == null ? "" : String(dv);
            const common = { name: f.name, id: f.name, required: f.required, dir: f.ltr ? "ltr" : undefined, "aria-invalid": err ? true : undefined };
            return (
              <div key={f.name} className={f.full || f.type === "textarea" ? "md:col-span-2" : ""}>
                {f.type === "checkbox" ? (
                  <div className="mt-7 flex items-center gap-2">
                    <Checkbox id={f.name} name={f.name} defaultChecked={!!dv} />
                    <Label htmlFor={f.name}>{f.label}</Label>
                  </div>
                ) : (
                  <>
                    <Label htmlFor={f.name} className="mb-1.5">
                      {f.label}{f.required && <span className="text-destructive">*</span>}
                    </Label>
                    {f.type === "select" ? (
                      <NativeSelect {...common} className="w-full" defaultValue={value}>
                        {!f.required && <NativeSelectOption value="">—</NativeSelectOption>}
                        {f.options?.map((o) => typeof o === "string"
                          ? <NativeSelectOption key={o} value={o}>{o}</NativeSelectOption>
                          : <NativeSelectOption key={o.value} value={o.value}>{o.label}</NativeSelectOption>)}
                      </NativeSelect>
                    ) : f.type === "textarea" ? (
                      <Textarea {...common} placeholder={f.placeholder} rows={3} defaultValue={value} />
                    ) : (
                      <>
                        <Input {...common} placeholder={f.placeholder} type={f.type ?? "text"} step={f.step} defaultValue={value}
                          list={f.suggestions?.length ? `${f.name}-list` : undefined} autoComplete="off" />
                        {f.suggestions?.length ? (
                          <datalist id={`${f.name}-list`}>{f.suggestions.map((x) => <option key={x} value={x} />)}</datalist>
                        ) : null}
                      </>
                    )}
                  </>
                )}
                {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
              </div>
            );
          })}
          {state?.message && <p className="text-sm text-destructive md:col-span-2">{state.message}</p>}
          <div className="flex items-center gap-3 border-t pt-5 md:col-span-2">
            <Button type="submit" disabled={pending}><Save /> {pending ? "جاري الحفظ…" : "حفظ"}</Button>
            <Button asChild variant="outline"><Link href={cancelHref}>إلغاء</Link></Button>
            {deleteAction && (
              <Button variant="destructive" formAction={deleteAction} formNoValidate className="ms-auto"
                onClick={(e) => { if (!confirm("متأكد إنك عايز تمسح السجل ده نهائياً؟")) e.preventDefault(); }}>
                مسح
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
