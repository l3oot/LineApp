-- Plan tiers + user subscription (run once on existing DB)
-- Requires: pgcrypto extension, users table

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.plan
(
    plan_id    UUID           NOT NULL DEFAULT gen_random_uuid(),
    name       VARCHAR(100)   NOT NULL,
    max_cycles INT            NOT NULL DEFAULT 3,
    price      NUMERIC(10, 2) NOT NULL DEFAULT 0,
    is_active  BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT plan_pkey PRIMARY KEY (plan_id),
    CONSTRAINT plan_name_unique UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS public.user_plan
(
    user_plan_id UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL,
    plan_id      UUID        NOT NULL,
    started_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at   TIMESTAMP,
    status       VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_plan_pkey PRIMARY KEY (user_plan_id),
    CONSTRAINT user_plan_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (user_id) ON DELETE CASCADE,
    CONSTRAINT user_plan_plan_id_fkey FOREIGN KEY (plan_id)
        REFERENCES public.plan (plan_id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS user_plan_one_active_per_user
    ON public.user_plan (user_id)
    WHERE status = 'active';

-- Seed tiers (skip if already present)
INSERT INTO public.plan (name, max_cycles, price, is_active)
SELECT 'free', 3, 0.00, TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.plan WHERE name = 'free');

INSERT INTO public.plan (name, max_cycles, price, is_active)
SELECT 'plus', 10, 30.00, TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.plan WHERE name = 'plus');

INSERT INTO public.plan (name, max_cycles, price, is_active)
SELECT 'pro', -1, 99.00, TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.plan WHERE name = 'pro');

-- Backfill: assign free plan to existing users without an active plan
INSERT INTO public.user_plan (user_id, plan_id, expires_at, status)
SELECT u.user_id, p.plan_id, NULL, 'active'
FROM public.users u
CROSS JOIN public.plan p
WHERE p.name = 'free'
  AND NOT EXISTS (
      SELECT 1
      FROM public.user_plan up
      WHERE up.user_id = u.user_id
        AND up.status = 'active'
  );
