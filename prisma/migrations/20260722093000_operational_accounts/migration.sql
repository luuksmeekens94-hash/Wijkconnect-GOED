-- Provision three functional pilot accounts without publishing employee
-- identities in source control. Only bcrypt hashes are stored here; plaintext
-- credentials are shared separately with the project administrator.
INSERT INTO "wijkconnect"."User" (
  "id", "email", "passwordHash", "name", "organization", "role", "isActive", "createdAt", "updatedAt"
)
VALUES
  (
    'wijkconnect_role_praktijkmanager',
    'praktijkmanager@wijkconnect.nl',
    '$2b$12$WXwEEuAWfeMYJKD.SgDb9ut4fq/SH1V/VTPoh0HKAD6l2zE/WUv5q',
    'Praktijkmanager De Schakel',
    'Huisartsenpraktijk De Schakel',
    'DATA_MANAGER',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'wijkconnect_role_fysiotherapeut',
    'fysiotherapeut@wijkconnect.nl',
    '$2b$12$gK9mwo3zTrnkcPSmpigIX.qF0xxokUKIzyQekLG6h4cgejzIPaA.a',
    'Fysiotherapeut beweegspreekuur',
    'Beweegspreekuur De Schakel',
    'PHYSIOTHERAPIST',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'wijkconnect_role_sociaal_spreekuur',
    'sociaalspreekuur@wijkconnect.nl',
    '$2b$12$TzH9sXEiU97oyepaNeQ40uTgKThoWlRYhXuc9pl6TeUr0XkqPr9/y',
    'Professional sociaal spreekuur',
    'Sociaal spreekuur De Schakel',
    'SOCIAAL',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("email") DO UPDATE
SET
  "passwordHash" = EXCLUDED."passwordHash",
  "name" = EXCLUDED."name",
  "organization" = EXCLUDED."organization",
  "role" = EXCLUDED."role",
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP;

-- The existing full administrator and password are deliberately preserved.
UPDATE "wijkconnect"."User"
SET "role" = 'ADMIN', "isActive" = true, "updatedAt" = CURRENT_TIMESTAMP
WHERE "email" = 'admin@wijkconnect.nl';
