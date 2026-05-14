-- Drop old function
DROP FUNCTION IF EXISTS recalculate_ledger(UUID, DATE);

-- Re-create recalculate_ledger without auth.uid() check so triggers can fire it as postgres
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
            IF v_prev_date IS NOT NULL THEN
                SELECT reading_close INTO v_prev_reading_close
                FROM master_entries
                WHERE org_id = p_org_id AND date = v_prev_date AND machine_id = v_machines.id
                LIMIT 1;
            ELSE
                v_prev_reading_close := NULL;
            END IF;

            IF v_prev_reading_close IS NOT NULL THEN
                UPDATE master_entries
                SET reading_open = v_prev_reading_close,
                    sale_liters = GREATEST(0, reading_close - v_prev_reading_close),
                    sale_inr = CEIL(GREATEST(0, reading_close - v_prev_reading_close) * fuel_rate)
                WHERE org_id = p_org_id AND date = v_curr_date AND machine_id = v_machines.id;
            END IF;
        END LOOP;

        -- 2. Recalculate daily totals
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


-- TRIGGER FUNCTIONS --

CREATE OR REPLACE FUNCTION trigger_recalculate_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_affected_date DATE;
    v_org_id UUID;
BEGIN

    -- Prevent infinite recursion
    IF pg_trigger_depth() > 1 THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN

        v_affected_date := OLD.date;
        v_org_id := OLD.org_id;
    ELSE
        v_affected_date := NEW.date;
        v_org_id := NEW.org_id;
    END IF;

    -- When a daily summary is explicitly mutated, we don't want to infinite loop,
    -- but this trigger is only placed on child ledger tables.
    PERFORM recalculate_ledger(v_org_id, v_affected_date);

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_recalculate_ledger_summary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only trigger recalculation if cash_received or bank_deposit changed manually
    IF TG_OP = 'UPDATE' AND (OLD.cash_received IS DISTINCT FROM NEW.cash_received OR OLD.bank_deposit IS DISTINCT FROM NEW.bank_deposit) THEN
        PERFORM recalculate_ledger(NEW.org_id, NEW.date);
    END IF;
    RETURN NEW;
END;
$$;

-- Create Triggers
DROP TRIGGER IF EXISTS ledger_cascade_master ON master_entries;
CREATE TRIGGER ledger_cascade_master
AFTER INSERT OR UPDATE OR DELETE ON master_entries
FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_ledger();

DROP TRIGGER IF EXISTS ledger_cascade_expense ON expenses;
CREATE TRIGGER ledger_cascade_expense
AFTER INSERT OR UPDATE OR DELETE ON expenses
FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_ledger();

DROP TRIGGER IF EXISTS ledger_cascade_credit ON credit_entries;
CREATE TRIGGER ledger_cascade_credit
AFTER INSERT OR UPDATE OR DELETE ON credit_entries
FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_ledger();

DROP TRIGGER IF EXISTS ledger_cascade_summary ON daily_summaries;
CREATE TRIGGER ledger_cascade_summary
AFTER UPDATE OF cash_received, bank_deposit ON daily_summaries
FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_ledger_summary();



-- Revoke access from API users so they cannot call it directly
REVOKE EXECUTE ON FUNCTION recalculate_ledger(UUID, DATE) FROM public;
REVOKE EXECUTE ON FUNCTION recalculate_ledger(UUID, DATE) FROM anon;
REVOKE EXECUTE ON FUNCTION recalculate_ledger(UUID, DATE) FROM authenticated;
