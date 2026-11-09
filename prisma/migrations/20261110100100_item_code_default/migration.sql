-- Items created without a code (an older app version, or any other insert) still get an unguessable one.
ALTER TABLE "Item" ALTER COLUMN "code" SET DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
