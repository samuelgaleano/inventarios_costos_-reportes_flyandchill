import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatCurrency, formatPercent } from "@/lib/format";
import { AddAccess, AddDistributor, AddInvestor } from "./configuracion-forms";
import { AccessActions, DistributorActions } from "./row-actions";

export const metadata: Metadata = { title: "Configuración" };

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const [{ data: distributors }, { data: profiles }, { data: investors }] =
    await Promise.all([
      supabase.from("distributors").select("*").order("name"),
      supabase.from("profiles").select("*").eq("role", "distribuidor").order("full_name"),
      supabase.from("investors").select("*").order("name"),
    ]);

  const dists = distributors ?? [];
  const distMap = new Map(dists.map((d) => [d.id, d.name]));
  const distOptions = dists
    .filter((d) => d.active)
    .map((d) => ({ id: d.id, name: d.name }));

  return (
    <>
      <PageHeader
        title="Configuración"
        description="Distribuidores, accesos e inversionistas."
      />

      <div className="space-y-6">
        {/* Distribuidores */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Distribuidores</CardTitle>
            <AddDistributor />
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <THead>
                <TR>
                  <TH>Nombre</TH>
                  <TH>Correo</TH>
                  <TH>Teléfono</TH>
                  <TH>Estado</TH>
                  <TH className="text-right">Acción</TH>
                </TR>
              </THead>
              <TBody>
                {dists.map((d) => (
                  <TR key={d.id}>
                    <TD className="font-medium">{d.name}</TD>
                    <TD className="text-muted-foreground">{d.contact_email ?? "—"}</TD>
                    <TD className="text-muted-foreground">{d.contact_phone ?? "—"}</TD>
                    <TD>
                      <Badge tone={d.active ? "success" : "neutral"}>
                        {d.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TD>
                    <TD className="text-right">
                      <DistributorActions id={d.id} active={d.active} name={d.name} />
                    </TD>
                  </TR>
                ))}
                {dists.length === 0 && (
                  <TR>
                    <TD className="py-8 text-center text-muted-foreground" colSpan={5}>
                      Aún no hay distribuidores.
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>

        {/* Accesos de distribuidor */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Accesos de distribuidor</CardTitle>
            <AddAccess distributors={distOptions} />
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <THead>
                <TR>
                  <TH>Nombre</TH>
                  <TH>Distribuidor</TH>
                  <TH>Estado</TH>
                  <TH className="text-right">Acción</TH>
                </TR>
              </THead>
              <TBody>
                {(profiles ?? []).map((p) => (
                  <TR key={p.id}>
                    <TD className="font-medium">{p.full_name || "—"}</TD>
                    <TD className="text-muted-foreground">
                      {p.distributor_id ? distMap.get(p.distributor_id) ?? "—" : "—"}
                    </TD>
                    <TD>
                      <Badge tone={p.active ? "success" : "neutral"}>
                        {p.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TD>
                    <TD className="text-right">
                      <AccessActions id={p.id} active={p.active} name={p.full_name} />
                    </TD>
                  </TR>
                ))}
                {(profiles ?? []).length === 0 && (
                  <TR>
                    <TD className="py-8 text-center text-muted-foreground" colSpan={4}>
                      No hay accesos de distribuidor. Crea uno con el botón “Crear acceso”.
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>

        {/* Inversionistas */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Inversionistas</CardTitle>
            <AddInvestor />
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <THead>
                <TR>
                  <TH>Nombre</TH>
                  <TH>Correo</TH>
                  <TH className="text-right">Capital</TH>
                  <TH className="text-right">Participación</TH>
                </TR>
              </THead>
              <TBody>
                {(investors ?? []).map((i) => (
                  <TR key={i.id}>
                    <TD className="font-medium">{i.name}</TD>
                    <TD className="text-muted-foreground">{i.contact_email ?? "—"}</TD>
                    <TD className="text-right tabular-nums">{formatCurrency(i.capital_aportado)}</TD>
                    <TD className="text-right tabular-nums">{formatPercent(i.participacion_pct)}</TD>
                  </TR>
                ))}
                {(investors ?? []).length === 0 && (
                  <TR>
                    <TD className="py-8 text-center text-muted-foreground" colSpan={4}>
                      Aún no hay inversionistas.
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
