-- Impede mais de uma sessão em andamento para o mesmo colaborador.
CREATE UNIQUE INDEX "ActivitySession_one_active_per_employee_idx"
ON "ActivitySession" ("tenantId", "employeeId")
WHERE "status" IN ('RUNNING', 'PAUSED');
