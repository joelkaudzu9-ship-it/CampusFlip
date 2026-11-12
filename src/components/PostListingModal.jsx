import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  ChevronDown,
  ImagePlus,
  MapPin,
  Tag,
  FileText,
  ArrowRight,
  LoaderCircle,
  CheckCircle2,
  Clock3,
  Smartphone,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePaymentStatus } from '../lib/usePaymentStatus';
import ListingImageUploader from './ListingImageUploader';

const TYPES = [
  { value: 'sale', label: 'For sale', description: 'I want to sell an item' },
  { value: 'wanted', label: 'Wanted', description: 'I am looking for something' },
  { value: 'free', label: 'Free', description: 'I am giving something away' },
  { value: 'lost_found', label: 'Lost & Found', description: 'I lost or found something' },
];

const OPERATORS = [
  { value: 'airtel', label: 'Airtel Money' },
  { value: 'tnm', label: 'TNM Mpamba' },
];

export default function PostListingModal({
  open,
  onClose,
  session,
  onCreated,
}) {
  const [categories, setCategories] = useState([]);
  const [spots, setSpots] = useState([]);

  const [kind, setKind] = useState('sale');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [meetingSpotId, setMeetingSpotId] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [createdListing, setCreatedListing] = useState(null);
  const [photosUploaded, setPhotosUploaded] = useState(false);

  // Payment state
  const [operator, setOperator] = useState('airtel');
  const [phone, setPhone] = useState('');
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [chargeId, setChargeId] = useState('');
  const [paymentStartedAt, setPaymentStartedAt] = useState(null);
  const [paidWithCredit, setPaidWithCredit] = useState(false);

  // Idempotency Key
  const listingPaymentKey = useRef(null);

  // Fallback poll timer — cleared when the modal closes or component unmounts
  const fallbackTimerRef = useRef(null);

  useEffect(() => {
    if (!open || !supabase) return;

    let alive = true;

    async function loadOptions() {
      const [categoryResult, spotResult] = await Promise.all([
        supabase
          .from('categories')
          .select('id,name')
          .order('name'),

        supabase
          .from('meeting_spots')
          .select('id,name')
          .eq('is_active', true)
          .order('name'),
      ]);

      if (!alive) return;

      if (!categoryResult.error) {
        setCategories(categoryResult.data || []);
        setCategoryId(current =>
          current || categoryResult.data?.[0]?.id || ''
        );
      }

      if (!spotResult.error) {
        setSpots(spotResult.data || []);
        setMeetingSpotId(current =>
          current || spotResult.data?.[0]?.id || ''
        );
      }

      if (categoryResult.error) {
        setError(categoryResult.error.message);
      } else if (spotResult.error) {
        setError(spotResult.error.message);
      }

      // Load the seller's saved contact number.
      if (session?.user?.id) {
        const { data } = await supabase
          .from('seller_contacts')
          .select('whatsapp_number')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (alive && data?.whatsapp_number) {
          setPhone(data.whatsapp_number);
        }
      }
    }

    loadOptions();

    return () => {
      alive = false;
    };
  }, [open, session?.user?.id]);

  useEffect(() => {
    if (!open) {
      setError('');
      setBusy(false);
      setPaymentError('');
      setPaymentBusy(false);
      setPaymentStartedAt(null);
    }
  }, [open]);

  // Clean up the fallback poll timer on unmount
  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, []);

  // ── Primary payment status subscription ──────────────────────────────────
  usePaymentStatus({
    chargeId,
    onStatus: status => {
      if (status === 'successful') {
        setPaymentStatus('successful');
        setPaymentError('');
        setChargeId('');
        setPaymentBusy(false);

        const activeListing = createdListing
          ? { ...createdListing, status: 'active' }
          : null;

        if (activeListing) {
          setCreatedListing(activeListing);
          onCreated?.(activeListing);
        }
      } else if (status === 'failed') {
        setPaymentStatus('failed');
        setChargeId('');
        setPaymentBusy(false);
        setPaymentError(
          'Payment was unsuccessful. You can start another attempt.'
        );
      } else if (status === 'timeout') {
        setPaymentError(
          'Payment is taking longer than expected. Check your phone, then tap "Check payment status" again.'
        );
      }
    }
  });

  function clearFallbackTimer() {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }

  function finish() {
    clearFallbackTimer();

    setCreatedListing(null);
    setPhotosUploaded(false);
    setError('');

    setTitle('');
    setDescription('');
    setPrice('');
    setKind('sale');

    setChargeId('');
    setPaymentStartedAt(null);
    setPaymentStatus('idle');
    setPaymentError('');
    setPaymentBusy(false);
    setPaidWithCredit(false);

    listingPaymentKey.current = null;

    onClose?.();
  }

  async function submit(event) {
    event.preventDefault();
    setError('');

    if (!session?.user?.id) {
      setError('Please sign in before posting.');
      return;
    }

    if (
      !title.trim() ||
      !description.trim() ||
      !categoryId ||
      !meetingSpotId
    ) {
      setError('Please complete all required fields.');
      return;
    }

    const numericPrice = kind === 'sale' ? Number(price) : null;

    if (
      kind === 'sale' &&
      (!Number.isFinite(numericPrice) || numericPrice <= 0)
    ) {
      setError('Enter a valid price greater than MK 0.');
      return;
    }

    setBusy(true);

    const status = kind === 'sale'
      ? 'pending_payment'
      : 'active';

    const { data, error: insertError } = await supabase
      .from('listings')
      .insert({
        seller_id: session.user.id,
        category_id: categoryId,
        meeting_spot_id: meetingSpotId,
        title: title.trim(),
        description: description.trim(),
        price: numericPrice,
        kind,
        status,
      })
      .select('id,status,kind,title')
      .single();

    setBusy(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setCreatedListing(data);
    setPaymentStatus('idle');
    setChargeId('');
    setPaymentStartedAt(null);
    setPaymentError('');
    setPaidWithCredit(false);

    listingPaymentKey.current = null;

    onCreated?.(data);
  }

  async function manuallyCheckPayment() {
    if (!chargeId || paymentBusy) return;
    setPaymentBusy(true);
    setPaymentError('');

    try {
      const { data, error: queryError } = await supabase
        .from('payments')
        .select('status')
        .eq('charge_id', chargeId)
        .maybeSingle();

      if (queryError) throw queryError;

      if (data?.status === 'successful') {
        setPaymentStatus('successful');
        setChargeId('');
        const activeListing = createdListing
          ? { ...createdListing, status: 'active' }
          : null;
        if (activeListing) {
          setCreatedListing(activeListing);
          onCreated?.(activeListing);
        }
      } else if (data?.status === 'failed') {
        setPaymentStatus('failed');
        setChargeId('');
        setPaymentError('Payment was unsuccessful. You can start another attempt.');
      } else {
        setPaymentError(
          'Payment is not confirmed yet. Check your phone and try again shortly.'
        );
      }
    } catch (err) {
      console.error('Manual payment check failed:', err);
      setPaymentError('Could not check payment right now. Please try again.');
    } finally {
      setPaymentBusy(false);
    }
  }

  function cancelPayment() {
    clearFallbackTimer();
    setPaymentStatus('idle');
    setChargeId('');
    setPaymentError('');
    setPaymentBusy(false);
    setPaymentStartedAt(null);
    setPaidWithCredit(false);
    listingPaymentKey.current = null;
  }

  async function startPayment() {
    setPaymentError('');
    setPaidWithCredit(false);
    clearFallbackTimer();
    setChargeId('');

    if (!createdListing?.id || !session?.user?.id) {
      setPaymentError('Your listing information is missing.');
      return;
    }

    if (!phone.trim()) {
      setPaymentError('Enter your mobile-money phone number.');
      return;
    }

    setPaymentBusy(true);

    try {
      if (!listingPaymentKey.current) {
        listingPaymentKey.current = crypto.randomUUID();
      }

      const { data, error: invokeError } = await supabase.functions.invoke(
        'campusflip-payment',
        {
          body: {
            listingId: createdListing.id,
            paymentType: 'listing',
            operator,
            phone: phone.trim(),
            idempotencyKey: listingPaymentKey.current,
          },
        }
      );

      if (invokeError) {
        const message = invokeError.message?.toLowerCase().includes('session')
          ? 'Your session expired. Please sign out and back in, then retry.'
          : invokeError.message || 'Could not contact the payment service.';
        throw new Error(message);
      }

      if (!data?.success || !data?.charge_id) {
        throw new Error(
          data?.error || 'PayChangu could not start your payment.'
        );
      }

      // Credit path: payment already finalized, no need to poll.
      if (data.paid_with_credit) {
        setPaidWithCredit(true);
        setPaymentStatus('successful');
        setChargeId('');
        setPaymentBusy(false);
        const activeListing = { ...createdListing, status: 'active' };
        setCreatedListing(activeListing);
        onCreated?.(activeListing);
        return;
      }

      setChargeId(data.charge_id);
      setPaymentStartedAt(Date.now());
      setPaymentStatus('pending');

      // ── Fallback poll — catches Realtime lag / disconnects ────────────
      const capturedChargeId = data.charge_id;
      fallbackTimerRef.current = window.setTimeout(async () => {
        fallbackTimerRef.current = null;
        try {
          const { data: row } = await supabase
            .from('payments')
            .select('status')
            .eq('charge_id', capturedChargeId)
            .maybeSingle();

          if (row?.status === 'successful') {
            setPaymentStatus('successful');
            setPaymentError('');
            setChargeId('');
            setPaymentBusy(false);

            const activeListing = createdListing
              ? { ...createdListing, status: 'active' }
              : null;
            if (activeListing) {
              setCreatedListing(activeListing);
              onCreated?.(activeListing);
            }
          } else if (row?.status === 'failed') {
            setPaymentStatus('failed');
            setChargeId('');
            setPaymentBusy(false);
            setPaymentError(
              'Payment was unsuccessful. You can start another attempt.'
            );
          }
        } catch (pollErr) {
          console.warn('Fallback poll failed (non-fatal):', pollErr);
        }
      }, 2000);
    } catch (err) {
      console.error('CampusFlip payment initiation error:', err);
      setPaymentError(
        err.message || 'Payment could not be initiated. Please try again.'
      );
    } finally {
      setPaymentBusy(false);
    }
  }

  function handleRetryPayment() {
    listingPaymentKey.current = null;
    clearFallbackTimer();
    setChargeId('');
    setPaymentStatus('idle');
    startPayment();
  }

  const isLive = createdListing?.status === 'active';
  const isPaid = paymentStatus === 'successful' || isLive;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="cf-post-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={event => {
            if (event.target === event.currentTarget) onClose?.();
          }}
        >
          <motion.section
            className="cf-post-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cf-post-title"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            <div className="cf-post-heading">
              <div>
                <span className="cf-eyebrow">
                  YOUR CAMPUS MARKETPLACE
                </span>

                <h2 id="cf-post-title">
                  {createdListing
                    ? isPaid
                      ? 'You are all set!'
                      : 'Almost there!'
                    : 'Create a post'}
                </h2>

                <p>
                  {createdListing
                    ? 'Your post has been saved successfully.'
                    : 'Give your item a good introduction.'}
                </p>
              </div>

              <button
                type="button"
                className="cf-icon-close"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>

            {createdListing ? (
              <div className="cf-upload-step">

                {/* Listing status */}
                <div style={{
                  textAlign: 'center',
                  padding: '12px 0 20px',
                }}>
                  {isPaid ? (
                    <CheckCircle2
                      size={46}
                      color="#15803D"
                      style={{ marginBottom: 12 }}
                    />
                  ) : (
                    <Clock3
                      size={46}
                      color="#D97706"
                      style={{ marginBottom: 12 }}
                    />
                  )}

                  <h3 style={{ margin: '0 0 8px' }}>
                    {isPaid
                      ? 'Your listing is live!'
                      : 'Your listing is awaiting payment'}
                  </h3>

                  <p style={{ margin: 0 }}>
                    <strong>{createdListing.title}</strong>
                  </p>

                  <p style={{ marginTop: 8 }}>
                    {isPaid
                      ? paidWithCredit
                        ? 'Activated with your referral credit. No payment was needed.'
                        : 'Students can now discover your post on CampusFlip.'
                      : 'Complete the payment below to publish your sale listing.'}
                  </p>
                </div>

                {/* Payment section for sale listings */}
                {createdListing.kind === 'sale' && !isPaid && (
                  <div style={{
                    border: '1px solid #E5EAF2',
                    borderRadius: 16,
                    padding: 18,
                    marginBottom: 22,
                    background: '#F8FBFF',
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                      marginBottom: 16,
                    }}>
                      <div>
                        <span style={{
                          fontSize: 12,
                          color: '#4B5563',
                          fontWeight: 700,
                        }}>
                          STANDARD LISTING FEE
                        </span>
                        <h2 style={{
                          margin: '4px 0 0',
                          color: '#101C3A',
                          fontSize: 27,
                        }}>
                          MK 200
                        </h2>
                        <small style={{ color: '#4B5563' }}>
                          Active for 14 days · Free with referral credits
                        </small>
                      </div>

                      <div style={{
                        width: 46,
                        height: 46,
                        borderRadius: 13,
                        background: '#E8F0FF',
                        color: '#2563EB',
                        display: 'grid',
                        placeItems: 'center',
                      }}>
                        <Smartphone size={23} />
                      </div>
                    </div>

                    {paymentStatus === 'pending' ? (
                      <div style={{
                        background: '#fff',
                        border: '1px solid #E5EAF2',
                        borderRadius: 12,
                        padding: 16,
                        textAlign: 'center',
                      }}>
                        <LoaderCircle
                          size={30}
                          color="#2563EB"
                          className="cf-spin"
                        />

                        <h4 style={{
                          margin: '10px 0 6px',
                          color: '#101C3A',
                        }}>
                          Checking payment status
                        </h4>

                        <p style={{
                          fontSize: 13,
                          color: '#4B5563',
                          lineHeight: 1.6,
                        }}>
                          Check your phone for the PayChangu prompt and
                          enter your mobile-money PIN to authorise payment.
                        </p>

                        <p style={{
                          fontSize: 12,
                          color: '#94A3B8',
                          marginTop: 12,
                          overflowWrap: 'anywhere',
                        }}>
                          Reference: {chargeId}
                        </p>

                        <button
                          type="button"
                          className="cf-post-submit"
                          onClick={manuallyCheckPayment}
                          disabled={paymentBusy}
                          style={{ marginTop: 12 }}
                        >
                          {paymentBusy ? (
                            <>
                              <LoaderCircle size={17} className="cf-spin" />
                              Checking...
                            </>
                          ) : (
                            <>
                              <RefreshCw size={17} />
                              Check payment status
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={cancelPayment}
                          disabled={paymentBusy}
                          style={{
                            display: 'block',
                            width: '100%',
                            marginTop: 10,
                            padding: 10,
                            border: 0,
                            background: 'transparent',
                            color: '#94A3B8',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: paymentBusy ? 'not-allowed' : 'pointer',
                          }}
                        >
                          Cancel and start a new payment
                        </button>

                        {paymentError && (
                          <p className="cf-post-error" role="alert">
                            {paymentError}
                          </p>
                        )}
                      </div>
                    ) : paymentStatus === 'failed' ? (
                      <div style={{
                        background: '#fff',
                        border: '1px solid #F0D9A5',
                        borderRadius: 12,
                        padding: 16,
                        textAlign: 'center',
                      }}>
                        <Clock3
                          size={30}
                          color="#D28A00"
                        />

                        <h4 style={{
                          margin: '10px 0 6px',
                          color: '#101C3A',
                        }}>
                          Payment not successful
                        </h4>

                        <p style={{
                          fontSize: 13,
                          color: '#4B5563',
                          margin: 0,
                          lineHeight: 1.6,
                        }}>
                          {paymentError}
                        </p>

                        <button
                          type="button"
                          className="cf-post-submit"
                          onClick={handleRetryPayment}
                          disabled={paymentBusy || !phone.trim()}
                          style={{ marginTop: 14 }}
                        >
                          {paymentBusy ? 'Connecting...' : 'Try payment again'}
                        </button>
                      </div>
                    ) : (
                      <>
                        <label className="cf-field">
                          <span>Mobile-money provider</span>

                          <div className="cf-select-wrap">
                            <select
                              value={operator}
                              onChange={e => setOperator(e.target.value)}
                              disabled={paymentBusy}
                            >
                              {OPERATORS.map(item => (
                                <option
                                  value={item.value}
                                  key={item.value}
                                >
                                  {item.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={16} />
                          </div>
                        </label>

                        <label className="cf-field">
                          <span>
                            <Smartphone size={15} />
                            Mobile-money phone number
                          </span>

                          <input
                            type="tel"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            placeholder="e.g. 0991234567"
                            disabled={paymentBusy}
                          />
                        </label>

                        {paymentError && (
                          <p
                            className="cf-post-error"
                            role="alert"
                          >
                            {paymentError}
                          </p>
                        )}

                        <button
                          type="button"
                          className="cf-post-submit"
                          onClick={handleRetryPayment}
                          disabled={paymentBusy || !phone.trim()}
                        >
                          {paymentBusy ? (
                            <>
                              <LoaderCircle
                                className="cf-spin"
                                size={17}
                              />
                              Connecting to PayChangu...
                            </>
                          ) : (
                            <>
                              Pay MK 200
                              <ArrowRight size={17} />
                            </>
                          )}
                        </button>
                      </>
                    )}

                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      marginTop: 13,
                      color: '#4B5563',
                      fontSize: 12,
                      lineHeight: 1.5,
                    }}>
                      <ShieldCheck
                        size={16}
                        color="#15803D"
                        style={{ flexShrink: 0 }}
                      />
                      <span>
                        Your PIN is entered privately on your phone.
                        CampusFlip never asks for or stores your mobile-money
                        PIN. Your listing goes live only after payment
                        verification.
                      </span>
                    </div>
                  </div>
                )}

                {/* Photos */}
                <div style={{ marginBottom: 18 }}>
                  <h4 style={{ marginBottom: 6 }}>
                    Add photos{' '}
                    <span style={{ fontWeight: 400 }}>
                      (optional)
                    </span>
                  </h4>

                  <p style={{
                    fontSize: 13,
                    color: '#4B5563',
                  }}>
                    Photos help buyers understand what you are offering.
                    You can skip this step and add them later.
                  </p>

                  <ListingImageUploader
                    listingId={createdListing.id}
                    onUploaded={() => setPhotosUploaded(true)}
                  />
                </div>

                {photosUploaded && (
                  <p style={{
                    color: '#15803D',
                    fontSize: 13,
                    textAlign: 'center',
                  }}>
                    <CheckCircle2
                      size={15}
                      style={{
                        verticalAlign: 'middle',
                        marginRight: 5,
                      }}
                    />
                    Photos uploaded successfully.
                  </p>
                )}

                {isPaid ? (
                  <button
                    type="button"
                    className="cf-post-submit"
                    onClick={finish}
                  >
                    Done <ArrowRight size={17} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={finish}
                    style={{
                      display: 'block',
                      width: '100%',
                      marginTop: 12,
                      padding: 12,
                      border: 'none',
                      background: 'transparent',
                      color: '#4B5563',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Finish later
                  </button>
                )}
              </div>
            ) : (
              <form className="cf-post-form" onSubmit={submit}>
                <div className="cf-post-types" aria-label="Post type">
                  {TYPES.map(type => (
                    <button
                      type="button"
                      key={type.value}
                      className={kind === type.value ? 'selected' : ''}
                      onClick={() => setKind(type.value)}
                    >
                      <b>{type.label}</b>
                      <small>{type.description}</small>
                    </button>
                  ))}
                </div>

                <label className="cf-field">
                  <span><Tag size={15} /> Listing title</span>
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    maxLength={90}
                    placeholder="e.g. HP laptop, barely used"
                    required
                  />
                </label>

                <label className="cf-field">
                  <span><FileText size={15} /> Description</span>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    maxLength={1500}
                    rows={4}
                    placeholder="Describe the condition, details, or what you are looking for..."
                    required
                  />
                </label>

                <div className="cf-post-two-col">
                  <label className="cf-field">
                    <span>Category</span>
                    <div className="cf-select-wrap">
                      <select
                        value={categoryId}
                        onChange={e => setCategoryId(e.target.value)}
                        required
                      >
                        <option value="">Choose category</option>
                        {categories.map(category => (
                          <option value={category.id} key={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} />
                    </div>
                  </label>

                  {kind === 'sale' && (
                    <label className="cf-field">
                      <span>Price (MWK)</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                        placeholder="e.g. 45000"
                        required
                      />
                    </label>
                  )}
                </div>

                <label className="cf-field">
                  <span><MapPin size={15} /> Safe meeting spot</span>
                  <div className="cf-select-wrap">
                    <select
                      value={meetingSpotId}
                      onChange={e => setMeetingSpotId(e.target.value)}
                      required
                    >
                      <option value="">Choose a campus meeting spot</option>
                      {spots.map(spot => (
                        <option value={spot.id} key={spot.id}>
                          {spot.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} />
                  </div>

                  {spots.length === 0 && (
                    <small className="cf-field-hint">
                      No active meeting spots are configured yet.
                    </small>
                  )}
                </label>

                <div className="cf-upload-placeholder">
                  <ImagePlus size={19} />
                  <div>
                    <b>Photos are optional</b>
                    <small>
                      You can add photos after creating your post,
                      or skip them completely.
                    </small>
                  </div>
                </div>

                {error && (
                  <p className="cf-post-error" role="alert">
                    {error}
                  </p>
                )}

                <button
                  className="cf-post-submit"
                  type="submit"
                  disabled={busy || !categories.length || !spots.length}
                >
                  {busy ? (
                    <>
                      <LoaderCircle className="cf-spin" size={17} />
                      Creating post...
                    </>
                  ) : (
                    <>
                      Create post <ArrowRight size={17} />
                    </>
                  )}
                </button>

                {kind === 'sale' ? (
                  <p className="cf-post-note">
                    Sale posts require a one-time MK200 publication
                    payment (free if you have referral credits). Your
                    listing will remain pending until payment is confirmed.
                  </p>
                ) : (
                  <p className="cf-post-note">
                    Wanted, Free, and Lost & Found posts are published
                    without a listing fee.
                  </p>
                )}
              </form>
            )}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}