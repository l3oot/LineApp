-- Coin v1: daily RECORD earn (run once on existing DB)
-- Requires: pgcrypto extension, users table

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.coin_rule
(
    coin_rule_id UUID         NOT NULL DEFAULT gen_random_uuid(),
    code         VARCHAR(50)  NOT NULL,
    name         VARCHAR(100) NOT NULL,
    description  TEXT,
    coin_amount  INT          NOT NULL,
    daily_limit  INT,
    total_limit  INT,
    active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT coin_rule_pkey PRIMARY KEY (coin_rule_id),
    CONSTRAINT coin_rule_code_unique UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS public.coin_wallet
(
    coin_wallet_id UUID      NOT NULL DEFAULT gen_random_uuid(),
    user_id        UUID      NOT NULL,
    balance        INT       NOT NULL DEFAULT 0,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT coin_wallet_pkey PRIMARY KEY (coin_wallet_id),
    CONSTRAINT coin_wallet_user_id_unique UNIQUE (user_id),
    CONSTRAINT coin_wallet_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.coin_transaction
(
    coin_tx_id     UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id        UUID         NOT NULL,
    coin_rule_id   UUID,
    amount         INT          NOT NULL,
    type           VARCHAR(32)  NOT NULL,
    reference_type VARCHAR(50),
    reference_id   VARCHAR(100),
    description    TEXT,
    earn_date      DATE,
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expired_at     TIMESTAMP,
    CONSTRAINT coin_transaction_pkey PRIMARY KEY (coin_tx_id),
    CONSTRAINT coin_transaction_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (user_id) ON DELETE CASCADE,
    CONSTRAINT coin_transaction_rule_id_fkey FOREIGN KEY (coin_rule_id)
        REFERENCES public.coin_rule (coin_rule_id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS coin_transaction_user_rule_earn_date_uidx
    ON public.coin_transaction (user_id, coin_rule_id, earn_date);

INSERT INTO public.coin_rule (code, name, description, coin_amount, daily_limit, active)
SELECT 'RECORD',
       'บันทึกรายการ',
       'บันทึกรายรับหรือรายจ่ายอย่างน้อย 1 รายการต่อวัน ได้ 1 Coin',
       1,
       1,
       TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.coin_rule WHERE code = 'RECORD');
