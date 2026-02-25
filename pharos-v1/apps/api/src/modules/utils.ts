import { ForbiddenException } from "@nestjs/common";

export function assertTenantOwned<T>(record: T | null, message = "Record not found for tenant"): T {
  if (!record) throw new ForbiddenException(message);
  return record;
}

export function yyyyMmDd(input: Date): string {
  return input.toISOString().slice(0, 10);
}
