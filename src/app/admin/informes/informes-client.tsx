"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Mail, RefreshCw } from "lucide-react";
import { sendReportNow, syncSheetsNow } from "./actions";
import { initialActionState, type ActionState } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function Status({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <p className="mt-3 flex items-start gap-1.5 text-sm text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        {state.error}
      </p>
    );
  }
  if (state.ok) {
    return (
      <p className="mt-3 flex items-start gap-1.5 text-sm text-success">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        {state.message}
      </p>
    );
  }
  return null;
}

export function InformesActions() {
  const [emailState, emailAction, emailPending] = useActionState(
    sendReportNow,
    initialActionState,
  );
  const [sheetState, sheetAction, sheetPending] = useActionState(
    syncSheetsNow,
    initialActionState,
  );

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-brand" /> Enviar por correo
          </CardTitle>
          <CardDescription>
            Envía el informe del mes actual al administrador y a cada distribuidor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={emailAction}>
            <Button type="submit" variant="brand" disabled={emailPending}>
              {emailPending ? "Enviando…" : "Enviar informe ahora"}
            </Button>
          </form>
          <Status state={emailState} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-brand" /> Google Sheets
          </CardTitle>
          <CardDescription>
            Actualiza el respaldo externo con precios, inventario y ventas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={sheetAction}>
            <Button type="submit" variant="outline" disabled={sheetPending}>
              {sheetPending ? "Sincronizando…" : "Sincronizar ahora"}
            </Button>
          </form>
          <Status state={sheetState} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-brand" /> Descargar Excel
          </CardTitle>
          <CardDescription>
            Libro .xlsx con precios, inventario, ventas e informe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href="/api/export"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-card px-4 text-sm font-medium transition hover:bg-muted"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Descargar .xlsx
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
