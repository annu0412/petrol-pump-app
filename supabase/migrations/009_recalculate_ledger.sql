-- Add total_digital to master_entries to decouple the RPC from specific payment method columns
ALTER TABLE public.master_entries ADD COLUMN IF NOT EXISTS total_digital NUMERIC(10,2) DEFAULT 0;

-- Backfill existing data
UPDATE public.master_entries
SET total_digital = COALESCE(phonepe, 0) + COALESCE(sbi, 0) + COALESCE(icici, 0) + COALESCE(paytm, 0) + COALESCE(dt_plus, 0) + COALESCE(neft, 0)
WHERE total_digital = 0;

-- Drop the function if it exists to allow easy re-creation
DROP FUNCTION IF EXISTS recalculate_ledger(UUID, DATE);

CREATE OR REPLACE FUNCTION recalculate_ledger(p_org_id UUID, p_start_date DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_curr_date DATE;
    v_prev_date DATE;
    v_machines RECORD;
    v_master_entry RECORD;
    v_prev_reading_close NUMERIC;
    v_prev_cash NUMERIC;

    v_total_sale NUMERIC;
    v_total_digital NUMERIC;
    v_total_expense NUMERIC;
    v_total_credit_sales NUMERIC;
    v_total_credit_payments NUMERIC;

    v_summary RECORD;
    v_cash_generated NUMERIC;
    v_cash_in_hand NUMERIC;
BEGIN
    -- Verify user belongs to org
    IF NOT EXISTS (SELECT 1 FROM org_members WHERE org_id = p_org_id AND user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Iterate chronologically through all dates starting from p_start_date where there are daily_summaries
    FOR v_curr_date IN
        SELECT date FROM daily_summaries
        WHERE org_id = p_org_id AND date >= p_start_date
        ORDER BY date ASC
    LOOP
        -- Find the previous date that has a summary for cascading
        SELECT MAX(date) INTO v_prev_date FROM daily_summaries
        WHERE org_id = p_org_id AND date < v_curr_date;

        -- 1. Cascade machine readings
        FOR v_machines IN SELECT id, fuel_type FROM machines WHERE org_id = p_org_id LOOP
            -- Get the opening reading which should be the closing of the previous date
            IF v_prev_date IS NOT NULL THEN
                SELECT reading_close INTO v_prev_reading_close
                FROM master_entries
                WHERE org_id = p_org_id AND date = v_prev_date AND machine_id = v_machines.id
                LIMIT 1;
            ELSE
                v_prev_reading_close := NULL;
            END IF;

            -- If we found a previous closing reading, update the current opening reading
            IF v_prev_reading_close IS NOT NULL THEN
                UPDATE master_entries
                SET reading_open = v_prev_reading_close,
                    sale_liters = GREATEST(0, reading_close - v_prev_reading_close),
                    sale_inr = CEIL(GREATEST(0, reading_close - v_prev_reading_close) * fuel_rate)
                WHERE org_id = p_org_id AND date = v_curr_date AND machine_id = v_machines.id;
            END IF;
        END LOOP;

        -- 2. Recalculate daily totals using the generic total_digital column
        SELECT
            COALESCE(SUM(sale_inr), 0),
            COALESCE(SUM(total_digital), 0)
        INTO v_total_sale, v_total_digital
        FROM master_entries
        WHERE org_id = p_org_id AND date = v_curr_date;

        SELECT COALESCE(SUM(amount), 0) INTO v_total_expense
        FROM expenses
        WHERE org_id = p_org_id AND date = v_curr_date;

        SELECT
            COALESCE(SUM(CASE WHEN entry_type = 'sale' THEN amount ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN entry_type = 'payment' THEN amount ELSE 0 END), 0)
        INTO v_total_credit_sales, v_total_credit_payments
        FROM credit_entries
        WHERE org_id = p_org_id AND date = v_curr_date;

        -- 3. Get previous cash in hand
        IF v_prev_date IS NOT NULL THEN
            SELECT cash_in_hand INTO v_prev_cash
            FROM daily_summaries
            WHERE org_id = p_org_id AND date = v_prev_date;
        ELSE
            -- If no previous date, preserve the current prev_cash_in_hand if any
            SELECT prev_cash_in_hand INTO v_prev_cash
            FROM daily_summaries
            WHERE org_id = p_org_id AND date = v_curr_date;
        END IF;

        v_prev_cash := COALESCE(v_prev_cash, 0);

        -- 4. Get the current summary's extra cash and bank deposit
        SELECT * INTO v_summary
        FROM daily_summaries
        WHERE org_id = p_org_id AND date = v_curr_date;

        -- Calculate final cash in hand
        v_cash_generated := v_total_sale - v_total_digital - v_total_expense - v_total_credit_sales + v_total_credit_payments + COALESCE(v_summary.cash_received, 0);
        v_cash_in_hand := v_prev_cash + v_cash_generated - COALESCE(v_summary.bank_deposit, 0);

        -- 5. Update daily summary
        UPDATE daily_summaries
        SET
            total_sale_inr = v_total_sale,
            total_digital = v_total_digital,
            total_expense = v_total_expense,
            total_credit = v_total_credit_sales,
            prev_cash_in_hand = v_prev_cash,
            cash_in_hand = v_cash_in_hand
        WHERE org_id = p_org_id AND date = v_curr_date;

    END LOOP;
END;
$$;
