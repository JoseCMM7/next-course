import bcrypt from 'bcrypt';
import postgres from 'postgres';
import {
  invoices,
  customers,
  revenue,
  users,
} from '../lib/placeholder-data';

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error(
    'No existe POSTGRES_URL. Revisa que tengas un archivo .env en la raíz del proyecto.',
  );
}

const sql = postgres(connectionString, {
  ssl: 'require',
  prepare: false,
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

async function seedUsers() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );
  `;

  const insertedUsers = [];

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);

    insertedUsers.push(await sql`
      INSERT INTO users (id, name, email, password)
      VALUES (
        ${user.id},
        ${user.name},
        ${user.email},
        ${hashedPassword}
      )
      ON CONFLICT (id) DO NOTHING;
    `);
  }

  return insertedUsers;
}

async function seedCustomers() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  await sql`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      image_url VARCHAR(255) NOT NULL
    );
  `;

  const insertedCustomers = [];

  for (const customer of customers) {
    insertedCustomers.push(await sql`
      INSERT INTO customers (id, name, email, image_url)
      VALUES (
        ${customer.id},
        ${customer.name},
        ${customer.email},
        ${customer.image_url}
      )
      ON CONFLICT (id) DO NOTHING;
    `);
  }

  return insertedCustomers;
}

async function seedInvoices() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  await sql`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      customer_id UUID NOT NULL,
      amount INT NOT NULL,
      status VARCHAR(255) NOT NULL,
      date DATE NOT NULL
    );
  `;

  const insertedInvoices = [];

  for (const invoice of invoices) {
    insertedInvoices.push(await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      SELECT
        ${invoice.customer_id},
        ${invoice.amount},
        ${invoice.status},
        ${invoice.date}
      WHERE NOT EXISTS (
        SELECT 1
        FROM invoices
        WHERE customer_id = ${invoice.customer_id}
          AND amount = ${invoice.amount}
          AND status = ${invoice.status}
          AND date = ${invoice.date}
      );
    `);
  }

  return insertedInvoices;
}

async function seedRevenue() {
  await sql`
    CREATE TABLE IF NOT EXISTS revenue (
      month VARCHAR(4) NOT NULL UNIQUE,
      revenue INT NOT NULL
    );
  `;

  const insertedRevenue = [];

  for (const item of revenue) {
    insertedRevenue.push(await sql`
      INSERT INTO revenue (month, revenue)
      VALUES (${item.month}, ${item.revenue})
      ON CONFLICT (month) DO NOTHING;
    `);
  }

  return insertedRevenue;
}

export async function GET() {
  try {
    console.log(
      'POSTGRES_URL encontrada:',
      Boolean(process.env.POSTGRES_URL),
    );

    console.time('[seed] seedUsers');
    console.log('[seed] Iniciando seedUsers');
    await seedUsers();
    console.timeEnd('[seed] seedUsers');

    console.time('[seed] seedCustomers');
    console.log('[seed] Iniciando seedCustomers');
    await seedCustomers();
    console.timeEnd('[seed] seedCustomers');

    console.time('[seed] seedInvoices');
    console.log('[seed] Iniciando seedInvoices');
    await seedInvoices();
    console.timeEnd('[seed] seedInvoices');

    console.time('[seed] seedRevenue');
    console.log('[seed] Iniciando seedRevenue');
    await seedRevenue();
    console.timeEnd('[seed] seedRevenue');

    return Response.json({
      message: 'Database seeded successfully',
    });
  } catch (error) {
    console.error('ERROR AL CREAR LA BASE DE DATOS:', error);

    return Response.json(
      {
        message: 'Database seeding failed',
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      },
    );
  }
}
