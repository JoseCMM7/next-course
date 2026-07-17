import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, {
  ssl: 'require',
  prepare: false,
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

async function listInvoices() {
  const data = await sql`
    SELECT invoices.amount, customers.name
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE invoices.amount = 666;
  `;

  return data;
}

export async function GET() {
  try {
    return Response.json(await listInvoices());
  } catch (error) {
    console.error('Error al consultar las facturas:', error);

    return Response.json(
      {
        message: 'No se pudieron consultar las facturas',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
