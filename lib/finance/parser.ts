import Papa from "papaparse";
import { Transaction, ParsedCSV } from "./types";

interface RawRow {
  [key: string]: string;
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, "_");
}

function parseAmount(raw: string): number | null {
  // Remove currency symbols, commas, surrounding whitespace
  const cleaned = raw.replace(/[$,\s]/g, "").trim();
  const value = parseFloat(cleaned);
  return isNaN(value) ? null : value;
}

function parseDate(raw: string): Date | null {
  const cleaned = raw.trim();
  if (!cleaned) return null;

  // Try ISO 8601 first (YYYY-MM-DD)
  const iso = new Date(cleaned);
  if (!isNaN(iso.getTime())) return iso;

  // Try MM/DD/YYYY
  const parts = cleaned.split("/");
  if (parts.length === 3) {
    const [month, day, year] = parts.map(Number);
    const d = new Date(year, month - 1, day);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

export interface ParseError {
  message: string;
}

export type ParseResult =
  | { ok: true; data: ParsedCSV }
  | { ok: false; error: ParseError };

export function parseCSV(csvText: string): ParseResult {
  const result = Papa.parse<RawRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (result.errors.length > 0 && result.data.length === 0) {
    return { ok: false, error: { message: "Could not parse the CSV file. Check that it's a valid CSV." } };
  }

  const rawHeaders = result.meta.fields ?? [];
  const normalizedHeaders = rawHeaders.map(normalizeHeader);

  // Find required columns
  const dateIdx = normalizedHeaders.findIndex((h) =>
    ["date", "transaction_date", "trans_date"].includes(h)
  );
  const descIdx = normalizedHeaders.findIndex((h) =>
    ["description", "memo", "details", "payee", "name"].includes(h)
  );
  const amountIdx = normalizedHeaders.findIndex((h) =>
    ["amount", "transaction_amount", "debit/credit", "value"].includes(h)
  );

  if (dateIdx === -1) {
    return { ok: false, error: { message: 'Required column "date" not found. Expected headers: date, description, amount.' } };
  }
  if (descIdx === -1) {
    return { ok: false, error: { message: 'Required column "description" not found. Expected headers: date, description, amount.' } };
  }
  if (amountIdx === -1) {
    return { ok: false, error: { message: 'Required column "amount" not found. Expected headers: date, description, amount.' } };
  }

  const dateKey = rawHeaders[dateIdx];
  const descKey = rawHeaders[descIdx];
  const amountKey = rawHeaders[amountIdx];

  // Check for optional balance column
  const balanceIdx = normalizedHeaders.findIndex((h) =>
    ["balance", "running_balance", "available_balance"].includes(h)
  );
  const balanceKey = balanceIdx !== -1 ? rawHeaders[balanceIdx] : null;

  const transactions: Transaction[] = [];
  let latestDate: Date | null = null;
  let latestBalance: number | null = null;

  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i];
    const rawDate = row[dateKey] ?? "";
    const rawAmount = row[amountKey] ?? "";
    const description = (row[descKey] ?? "").trim();

    const date = parseDate(rawDate);
    const amount = parseAmount(rawAmount);

    if (!date || amount === null) {
      // Skip unparseable rows silently — they're likely header repetitions or totals rows
      continue;
    }

    transactions.push({ date, description, amount });

    if (balanceKey) {
      const rawBalance = row[balanceKey] ?? "";
      const balance = parseAmount(rawBalance);
      if (balance !== null && (latestDate === null || date > latestDate)) {
        latestDate = date;
        latestBalance = balance;
      }
    }
  }

  if (transactions.length === 0) {
    return { ok: false, error: { message: "No valid transactions found in the CSV. Check that the date and amount columns contain valid values." } };
  }

  const hasBalanceColumn = balanceKey !== null && latestBalance !== null;

  return {
    ok: true,
    data: {
      transactions,
      hasBalanceColumn,
      startingBalance: hasBalanceColumn ? latestBalance : null,
      needsBalanceInput: !hasBalanceColumn,
    },
  };
}
