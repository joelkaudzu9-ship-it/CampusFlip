import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { ShieldCheck, Calendar } from "lucide-react";

const PRICE = 1000;

export default function ShopPlanUpgrade({
  initialPhone = "",
  onPlanActivated,
  onToast,
  isVerified = false,
  planExpiresAt = null,
}) {
  const [operator, setOperator] = useState("airtel");
  const [phone, setPhone] = useState(initialPhone);
  const [loading, setLoading] = useState(false);
  const [chargeId, setChargeId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const paymentInProgress = useRef(false);
  const activationCallback = useRef(onPlanActivated);
  const toastCallback = useRef(onToast);
  const notified = useRef(false);
  const idempotencyKey = useRef(null);

  useEffect(() => {
    activationCallback.current = onPlanActivated;
    toastCallback.current = onToast;
  }, [onPlanActivated, onToast]);

  useEffect(() => {
    if (initialPhone) setPhone(initialPhone);
  }, [initialPhone]);

  useEffect(() => {
    if (!chargeId || !userId || status !== "waiting") return;

    let active = true;

    const checkPayment = async () => {
      const { data, error: paymentError } = await supabase
        .from("payments")
        .select("status, payment_type, paid_at")
        .eq("charge_id", chargeId)
        .eq("user_id", userId)
        .maybeSingle();

      if (!active) return;

      if (paymentError) {
        console.error("Payment status check failed:", paymentError);
        return;
      }

      if (!data) return;

      if (data.status === "successful" && data.payment_type === "shop_plan") {
        active = false;
        setStatus("success");

        if (!notified.current) {
          notified.current = true;
          toastCallback.current?.("Shop plan activated successfully!");
          activationCallback.current?.();
        }
      } else if (data.status === "failed") {
        active = false;
        setStatus("failed");
        setError("Payment was not completed. Please try again.");
      }
    };

    checkPayment();
    const interval = setInterval(checkPayment, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [chargeId, userId, status]);

  async function handlePayment(event) {
    event.preventDefault();

    if (paymentInProgress.current) return;

    paymentInProgress.current = true;
    setLoading(true);
    setError("");

    try {
      if (!phone.trim()) throw new Error("Please enter your mobile money number.");

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error("Please sign in again to continue.");

      if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();

      const { data, error: functionError } = await supabase.functions.invoke("campusflip-payment", {
        body: {
          paymentType: "shop_plan",
          operator,
          phone: phone.trim(),
          idempotencyKey: idempotencyKey.current,
        },
      });

      if (functionError) {
        let message = functionError.message;
        try {
          const details = await functionError.context?.json();
          if (details?.error) message = details.error;
        } catch { /* Keep original error */ }
        throw new Error(message || "Could not start payment.");
      }

      if (!data?.success || !data?.charge_id) {
        throw new Error(data?.error || "Could not initiate payment.");
      }

      notified.current = false;
      setUserId(session.user.id);
      setChargeId(data.charge_id);
      setStatus("waiting");
    } catch (err) {
      console.error("Shop Plan payment error:", err);
      setError(err.message || "Something went wrong.");
    } finally {
      paymentInProgress.current = false;
      setLoading(false);
    }
  }

  function resetPayment() {
    if (paymentInProgress.current) return;
    setChargeId(null);
    setUserId(null);
    setStatus("idle");
    setError("");
    notified.current = false;
    idempotencyKey.current = null;
  }

  function handleTryAgain() {
    idempotencyKey.current = null;
    resetPayment();
  }

  const expiryDate = planExpiresAt
    ? new Date(planExpiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <section className="cf-shop-plan-card" style={{
      background: isVerified ? 'linear-gradient(145deg, #13794E, #15803D)' : '#101C3A',
      transition: 'background 0.5s ease'
    }}>
      <div className="cf-shop-plan-heading">
        <div>
          <span className="cf-shop-plan-eyebrow" style={{ color: isVerified ? '#7AF0B6' : '#64B5F6' }}>
            {isVerified ? 'ACTIVE SUBSCRIPTION' : 'CAMPUSFLIP VERIFIED'}
          </span>
          <h3>{isVerified ? 'Verified Shop' : 'Upgrade to Verified Shop'}</h3>
          <p>
            {isVerified
              ? 'Your shop is trusted and prioritized across the marketplace.'
              : 'Give your shop a verified badge and unlock the benefits of a trusted CampusFlip seller.'}
          </p>
        </div>

        {!isVerified && (
          <div className="cf-shop-plan-price">
            <strong>MK {PRICE.toLocaleString("en-US")}</strong>
            <span>/ month</span>
          </div>
        )}
      </div>

      {isVerified ? (
        <div style={{ marginTop: 24, padding: '18px', background: 'rgba(255,255,255,0.1)', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 14, border: '1px solid rgba(255,255,255,0.2)' }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'grid', placeItems: 'center', color: '#7AF0B6' }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <p style={{ margin: 0, color: 'white', fontWeight: 700, fontSize: 15 }}>Plan is active</p>
            {expiryDate && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
                <Calendar size={14} /> Renews on {expiryDate}
              </span>
            )}
          </div>
        </div>
      ) : (
        <>
          <ul className="cf-shop-plan-benefits">
            <li>✓ Verified shop badge</li>
            <li>✓ Unlimited free postings</li>
            <li>✓ Priority listing placement</li>
          </ul>

          {status === "success" ? (
            <div className="cf-shop-plan-success">
              <div className="cf-shop-plan-success-icon">✓</div>
              <h4>Your shop is now verified!</h4>
              <p>Your payment has been confirmed and your verified status is active.</p>
              <button type="button" onClick={resetPayment}>Done</button>
            </div>
          ) : status === "waiting" ? (
            <div className="cf-shop-plan-waiting">
              <div className="cf-shop-plan-spinner" />
              <h4>Waiting for confirmation...</h4>
              <p>Check your phone and approve the MK1,000 payment using your mobile money PIN.</p>
              <small>Your shop will be verified automatically after PayChangu confirms payment.</small>
            </div>
          ) : (
            <form onSubmit={handlePayment}>
              <label htmlFor="cf-shop-operator">Mobile money provider</label>
              <select id="cf-shop-operator" value={operator} onChange={(event) => setOperator(event.target.value)} disabled={loading}>
                <option value="airtel">Airtel Money</option>
                <option value="tnm">TNM Mpamba</option>
              </select>

              <label htmlFor="cf-shop-phone">Mobile money number</label>
              <input id="cf-shop-phone" type="tel" placeholder="0991234567" value={phone} onChange={(event) => setPhone(event.target.value)} disabled={loading} required />

              {error && <div className="cf-shop-plan-error" role="alert">{error}</div>}

              {status === "failed" && (
                <button type="button" className="cf-shop-plan-secondary" onClick={handleTryAgain}>Try again</button>
              )}

              <button type="submit" disabled={loading} className="cf-shop-plan-submit">
                {loading ? "Starting payment..." : "Pay MK1,000 and Get Verified"}
              </button>

              <small>Your PIN is entered securely on your phone. CampusFlip never asks for your mobile money PIN.</small>
            </form>
          )}
        </>
      )}
    </section>
  );
}