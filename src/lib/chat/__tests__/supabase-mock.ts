// Mock en memoria mínimo del query builder de Supabase para las pruebas de
// este módulo — no hay framework de pruebas previo en el repo que reutilizar
// (ver CLAUDE.md), así que se define aquí. Solo implementa lo que las
// funciones probadas realmente usan: filtros encadenables + los métodos
// terminales (`maybeSingle`/`single`/`returns`/awaitable directo).
type Row = Record<string, unknown>;

function applyFilter(rows: Row[], column: string, op: string, value: unknown): Row[] {
  return rows.filter((row) => {
    const cell = row[column];
    switch (op) {
      case "eq":
        return cell === value;
      case "neq":
        return cell !== value;
      case "gte":
        return (cell as string | number) >= (value as string | number);
      case "lte":
        return (cell as string | number) <= (value as string | number);
      case "gt":
        return (cell as string | number) > (value as string | number);
      case "lt":
        return (cell as string | number) < (value as string | number);
      case "is":
        return cell === value;
      case "in":
        return (value as unknown[]).includes(cell);
      default:
        return true;
    }
  });
}

function makeBuilder(initialRows: Row[]) {
  let rows = [...initialRows];
  const builder: Record<string, unknown> = {};

  const chain = (op: string) => (column: string, value: unknown) => {
    rows = applyFilter(rows, column, op, value);
    return builder;
  };

  builder.select = () => builder;
  builder.eq = chain("eq");
  builder.neq = chain("neq");
  builder.gte = chain("gte");
  builder.lte = chain("lte");
  builder.gt = chain("gt");
  builder.lt = chain("lt");
  builder.is = chain("is");
  builder.in = chain("in");
  builder.order = () => builder;
  builder.limit = (n: number) => {
    rows = rows.slice(0, n);
    return builder;
  };
  builder.maybeSingle = async () => ({ data: rows[0] ?? null, error: null });
  builder.single = async () => ({ data: rows[0] ?? null, error: rows[0] ? null : { message: "not found" } });
  builder.returns = async () => ({ data: rows, error: null });
  // Awaitable directo (`await query`), sin llamar `.returns()`/`.maybeSingle()` antes.
  builder.then = (resolve: (value: { data: Row[]; error: null }) => unknown) =>
    Promise.resolve({ data: rows, error: null }).then(resolve);

  return builder;
}

export type FakeTables = Record<string, Row[]>;

/** Cliente Supabase falso: `.from(table)` filtra sobre un array en memoria, sin red. */
export function makeFakeSupabase(tables: FakeTables) {
  const inserted: Record<string, Row[]> = {};
  const upserted: Record<string, Row[]> = {};
  const updated: Record<string, Row[]> = {};

  return {
    from(table: string) {
      const builder = makeBuilder(tables[table] ?? []) as Record<string, unknown>;
      builder.insert = (row: Row | Row[]) => {
        const rowsToInsert = Array.isArray(row) ? row : [row];
        inserted[table] = [...(inserted[table] ?? []), ...rowsToInsert];
        return makeBuilder(rowsToInsert);
      };
      builder.upsert = (row: Row | Row[]) => {
        const rowsToUpsert = Array.isArray(row) ? row : [row];
        upserted[table] = [...(upserted[table] ?? []), ...rowsToUpsert];
        return makeBuilder(rowsToUpsert);
      };
      builder.update = (row: Row) => {
        updated[table] = [...(updated[table] ?? []), row];
        return makeBuilder([row]);
      };
      builder.delete = () => makeBuilder([]);
      return builder;
    },
    _inserted: inserted,
    _upserted: upserted,
    _updated: updated,
  };
}
