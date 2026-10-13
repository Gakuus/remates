import type { InquiryRepository } from "@/application/ports/inquiry-repository";
import type { InquiryProps, InquiryStatus } from "@/domain/entities/inquiry";
import { getPool } from "@/infrastructure/postgres/client";

interface InquiryRow {
  id: string;
  property_id: string | null;
  auction_id: string | null;
  machinery_id: string | null;
  name: string;
  phone: string | null;
  email: string;
  message: string;
  status: InquiryStatus;
  source: "web" | "whatsapp";
  created_at: string;
}

function toProps(row: InquiryRow): InquiryProps {
  return {
    id: row.id,
    subject: {
      type: row.property_id ? "property" : row.auction_id ? "auction" : "machinery",
      id: row.property_id ?? row.auction_id ?? row.machinery_id,
    },
    name: row.name,
    phone: row.phone,
    email: row.email,
    message: row.message,
    status: row.status,
    source: row.source,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Persiste consultas de contacto en Postgres (PLAN §2, §8).
 * El sujeto polimórfico mapea a una de las tres columnas FK.
 */
export class PostgresInquiryRepository implements InquiryRepository {
  async save(inquiry: InquiryProps): Promise<void> {
    await getPool().query(
      `insert into inquiries
         (id, property_id, auction_id, machinery_id, name, phone, email, message, status, source, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        inquiry.id,
        inquiry.subject.type === "property" ? inquiry.subject.id : null,
        inquiry.subject.type === "auction" ? inquiry.subject.id : null,
        inquiry.subject.type === "machinery" ? inquiry.subject.id : null,
        inquiry.name,
        inquiry.phone ?? null,
        inquiry.email,
        inquiry.message,
        inquiry.status,
        inquiry.source,
        inquiry.createdAt,
      ],
    );
  }

  async listInquiries(): Promise<InquiryProps[]> {
    const { rows } = await getPool().query<InquiryRow>(
      `select id, property_id, auction_id, machinery_id, name, phone, email, message,
              status, source, created_at
         from inquiries
        order by created_at desc`,
    );
    return rows.map(toProps);
  }

  async updateInquiryStatus(id: string, status: InquiryStatus): Promise<boolean> {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(id)) return false;
    const { rowCount } = await getPool().query(`update inquiries set status = $2 where id = $1`, [
      id,
      status,
    ]);
    return (rowCount ?? 0) > 0;
  }
}
