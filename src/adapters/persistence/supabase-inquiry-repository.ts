import type { InquiryRepository } from "@/application/ports/inquiry-repository";
import type { InquiryProps, InquiryStatus } from "@/domain/entities/inquiry";
import { getSupabaseAdminClient } from "@/infrastructure/supabase/client";

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
 * Adaptador de persistencia de consultas (PLAN §2, §8).
 * Usa el cliente admin (service role): el público no debe listar inquiries.
 * El sujeto polimórfico mapea a una de las tres columnas FK.
 */
export class SupabaseInquiryRepository implements InquiryRepository {
  async save(inquiry: InquiryProps): Promise<void> {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("inquiries").insert({
      id: inquiry.id,
      property_id: inquiry.subject.type === "property" ? inquiry.subject.id : null,
      auction_id: inquiry.subject.type === "auction" ? inquiry.subject.id : null,
      machinery_id: inquiry.subject.type === "machinery" ? inquiry.subject.id : null,
      name: inquiry.name,
      phone: inquiry.phone,
      email: inquiry.email,
      message: inquiry.message,
      status: inquiry.status,
      source: inquiry.source,
      created_at: inquiry.createdAt.toISOString(),
    });

    if (error) throw new Error(`No se pudo registrar la consulta: ${error.message}`);
  }

  async listInquiries(): Promise<InquiryProps[]> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("inquiries")
      .select(
        "id, property_id, auction_id, machinery_id, name, phone, email, message, status, source, created_at",
      )
      .order("created_at", { ascending: false });

    if (error) throw new Error(`No se pudieron listar las consultas: ${error.message}`);
    return (data ?? []).map(toProps);
  }

  async updateInquiryStatus(id: string, status: InquiryStatus): Promise<boolean> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("inquiries")
      .update({ status })
      .eq("id", id)
      .select("id");

    if (error) throw new Error(`No se pudo actualizar la consulta: ${error.message}`);
    return (data?.length ?? 0) > 0;
  }
}
