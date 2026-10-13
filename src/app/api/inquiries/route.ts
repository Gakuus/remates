import { createInquiryController } from "@/adapters/http/inquiry-controller";
import { container } from "@/platform/container";
import { createInMemoryRateLimiter } from "@/infrastructure/rate-limit";
import { clientIpFromRequest } from "@/infrastructure/net/client-ip";
import type { InquirySubject } from "@/domain/entities/inquiry";

/**
 * POST /api/inquiries — consulta de contacto (PLAN §8.7, §16).
 * Escritura desde el servidor (pool Postgres); el cliente jamás toca la
 * base de datos para esto (PLAN §15).
 */
const RATE = { limit: 3, windowMs: 10 * 60 * 1000 };

async function subjectExists(subject: InquirySubject): Promise<boolean> {
  if (subject.id === null) return true;
  try {
    if (subject.type === "property") {
      return (await container.repos.property.findById(subject.id)) !== null;
    }
    if (subject.type === "auction") {
      return (await container.repos.auction.findById(subject.id)) !== null;
    }
    return (await container.repos.machinery.findById(subject.id)) !== null;
  } catch {
    return false;
  }
}

const controller = createInquiryController({
  submit: container.useCases.submitInquiry,
  limiter: createInMemoryRateLimiter(RATE),
  newId: container.system.ids.newId,
  subjectExists,
});

export async function POST(request: Request): Promise<Response> {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const result = await controller({
    body,
    ip: clientIpFromRequest(request) ?? crypto.randomUUID(),
  });

  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (result.status === 429 && result.body.ok === false && result.body.retryAfterSeconds) {
    headers["Retry-After"] = String(result.body.retryAfterSeconds);
  }

  return Response.json(result.body, { status: result.status, headers });
}
