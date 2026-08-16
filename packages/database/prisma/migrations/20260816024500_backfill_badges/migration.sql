-- Give legacy employees without a badge a unique code while preserving existing codes.
WITH bounds AS (
    SELECT COALESCE(
        MAX(
            CASE
                WHEN "badgeCode" ~ '^CR-[0-9]{8}$' THEN substring("badgeCode" FROM 4)::bigint
                ELSE 0
            END
        ),
        0
    ) AS max_badge
    FROM "Employee"
), missing AS (
    SELECT
        employee."id",
        'CR-' || lpad((bounds.max_badge + row_number() OVER (ORDER BY employee."id"))::text, 8, '0') AS badge_code
    FROM "Employee" employee
    CROSS JOIN bounds
    WHERE employee."badgeCode" IS NULL
)
UPDATE "Employee" employee
SET "badgeCode" = missing.badge_code
FROM missing
WHERE employee."id" = missing."id";
