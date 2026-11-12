import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, ArrowLeft, Clock3, TrendingUp, MapPin,
  ShoppingBasket, Heart, ShieldCheck, ShoppingBag, Sparkles,
} from 'lucide-react';
import {
  getRecentSearches,
  addRecentSearch,
  clearRecentSearches,
} from '../lib/recentSearches';

const spring = { type: 'spring', stiffness: 300, damping: 28 };
const money = n => `MK ${Number(n || 0).toLocaleString('en-US')}`;

const CATEGORY_SHORTCUTS = ['Books', 'Electronics', 'Clothes', 'Food'];

export default function SearchPage({
  items,
  saved,
  onSave,
  onOpenListing,
  onBack,
}) {
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState([]);
  const [submitted, setSubmitted] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    setRecent(getRecentSearches());
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  const trimmedQuery = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!trimmedQuery) return [];
    return items.filter(item => {
      const haystack = `${item.title} ${item.category} ${item.location} ${item.sellerName} ${item.businessName}`.toLowerCase();
      return haystack.includes(trimmedQuery);
    });
  }, [items, trimmedQuery]);

  const suggestions = useMemo(() => {
    if (!trimmedQuery || trimmedQuery.length < 2) return [];
    const seen = new Set();
    const list = [];
    for (const item of items) {
      const title = item.title.toLowerCase();
      if (!title.includes(trimmedQuery)) continue;
      if (title === trimmedQuery) continue;
      if (seen.has(title)) continue;
      seen.add(title);
      list.push(item.title);
      if (list.length >= 5) break;
    }
    return list;
  }, [items, trimmedQuery]);

  // Trending: top 6 most-viewed listings' shortest distinctive keyword
  const trending = useMemo(() => {
    const sorted = [...items].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));
    const seen = new Set();
    const list = [];
    for (const item of sorted) {
      // Pull the shortest word (2+ chars, not a number)
      const words = item.title
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length >= 3 && !/^\d+$/.test(w));
      for (const w of words) {
        if (seen.has(w)) continue;
        seen.add(w);
        list.push(w);
        break;
      }
      if (list.length >= 6) break;
    }
    return list;
  }, [items]);

  function commit(value) {
    const v = String(value || '').trim();
    if (!v || v.length < 2) return;
    addRecentSearch(v);
    setRecent(getRecentSearches());
    setSubmitted(v);
  }

  function handleSubmit(e) {
    e.preventDefault();
    commit(query);
  }

  function handleRecentTap(term) {
    setQuery(term);
    commit(term);
    inputRef.current?.focus();
  }

  function handleClearRecent() {
    clearRecentSearches();
    setRecent([]);
  }

  function handleCategoryTap(cat) {
    setQuery(cat);
    commit(cat);
    inputRef.current?.focus();
  }

  const showRecent = !query.trim() && recent.length > 0;
  const showSuggestions = trimmedQuery.length >= 2 && suggestions.length > 0 && results.length === 0;
  const showResults = trimmedQuery.length >= 2;
  const showEmpty = !query.trim() && recent.length === 0;

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={spring}
      style={{
        minHeight: '100vh',
        background: '#F5F8FF',
        paddingBottom: 40,
      }}
    >
      {/* Sticky header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 16px',
          background: 'rgba(245,248,255,0.94)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid #E5EAF2',
        }}
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          aria-label="Back"
          style={{
            width: 40,
            height: 40,
            flexShrink: 0,
            border: '1px solid #E5EAF2',
            borderRadius: 12,
            background: '#fff',
            color: '#101C3A',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={19} />
        </motion.button>

        <form
          onSubmit={handleSubmit}
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 12px 0 14px',
            height: 48,
            background: '#fff',
            border: '1px solid #E5EAF2',
            borderRadius: 14,
          }}
        >
          <Search size={17} color="#94A3B8" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search on CampusFlip"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            style={{
              flex: 1,
              minWidth: 0,
              background: 'transparent',
              border: 0,
              outline: 'none',
              fontSize: 15,
              color: '#101C3A',
            }}
          />
          <AnimatePresence>
            {query && (
              <motion.button
                type="button"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={spring}
                onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                aria-label="Clear search"
                style={{
                  flexShrink: 0,
                  width: 24,
                  height: 24,
                  border: 0,
                  borderRadius: '50%',
                  background: '#E5EAF2',
                  color: '#4B5563',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={14} />
              </motion.button>
            )}
          </AnimatePresence>
        </form>
      </div>

      <div style={{ padding: '20px 16px' }}>

        {/* Empty state — trending + categories */}
        {showEmpty && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
          >
            {trending.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 1,
                  color: '#94A3B8',
                  marginBottom: 12,
                  padding: '0 4px',
                }}>
                  <TrendingUp size={13} />
                  Trending on CampusFlip
                </div>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                }}>
                  {trending.map((term, i) => (
                    <motion.button
                      key={term}
                      type="button"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ ...spring, delay: i * 0.04 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleRecentTap(term)}
                      style={{
                        padding: '10px 16px',
                        border: '1px solid #E5EAF2',
                        borderRadius: 20,
                        background: '#fff',
                        color: '#101C3A',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 2px 8px rgba(16,28,58,.04)',
                      }}
                    >
                      <Sparkles size={12} color="#F5A623" />
                      {term}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 1,
                color: '#94A3B8',
                marginBottom: 12,
                padding: '0 4px',
              }}>
                <ShoppingBasket size={13} />
                Browse by category
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {CATEGORY_SHORTCUTS.map((cat, i) => (
                  <motion.button
                    key={cat}
                    type="button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring, delay: 0.1 + i * 0.05 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleCategoryTap(cat)}
                    style={{
                      padding: '16px 14px',
                      borderRadius: 14,
                      border: '1px solid #E5EAF2',
                      background: 'linear-gradient(135deg, #fff 0%, #F5F8FF 100%)',
                      color: '#101C3A',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    {cat}
                    <ArrowRight size={14} color="#2563EB" />
                  </motion.button>
                ))}
              </div>
            </div>

            <div style={{
              marginTop: 30,
              padding: 16,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #EFF5FF 0%, #DCE7FF 100%)',
              border: '1px solid #BFDBFE',
              textAlign: 'center',
            }}>
              <div style={{
                width: 40, height: 40,
                borderRadius: 12,
                background: '#2563EB',
                color: '#fff',
                display: 'grid', placeItems: 'center',
                margin: '0 auto 12px',
              }}>
                <Search size={20} />
              </div>
              <b style={{ display: 'block', fontSize: 14, color: '#101C3A', marginBottom: 4 }}>
                Search for anything
              </b>
              <p style={{ margin: 0, fontSize: 12, color: '#4B5563', lineHeight: 1.6 }}>
                Try the name of a textbook, a calculator, or a piece of clothing you need this semester.
              </p>
            </div>
          </motion.div>
        )}

        {/* Recent searches */}
        {showRecent && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
              padding: '0 4px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 1,
                color: '#94A3B8',
              }}>
                <Clock3 size={13} />
                Recent searches
              </div>
              <button
                type="button"
                onClick={handleClearRecent}
                style={{
                  border: 0,
                  background: 'transparent',
                  color: '#2563EB',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '4px 8px',
                }}
              >
                Clear
              </button>
            </div>
            <div style={{
              background: '#fff',
              borderRadius: 16,
              border: '1px solid #E5EAF2',
              overflow: 'hidden',
            }}>
              {recent.map((term, i) => (
                <motion.button
                  key={term}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...spring, delay: i * 0.04 }}
                  onClick={() => handleRecentTap(term)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    border: 0,
                    borderBottom: i === recent.length - 1 ? 0 : '1px solid #F1F5F9',
                    background: 'transparent',
                    color: '#101C3A',
                    textAlign: 'left',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Clock3 size={15} color="#94A3B8" />
                  <span style={{ flex: 1 }}>{term}</span>
                  {i === 0 && (
                    <span style={{
                      fontSize: 9,
                      fontWeight: 800,
                      color: '#2563EB',
                      background: '#E5EDFB',
                      padding: '2px 6px',
                      borderRadius: 6,
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                    }}>
                      Recent
                    </span>
                  )}
                  <Search size={14} color="#94A3B8" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Suggestions while typing */}
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
            style={{ marginBottom: 20 }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1,
              color: '#94A3B8',
              textTransform: 'uppercase',
              marginBottom: 12,
              padding: '0 4px',
            }}>
              <TrendingUp size={13} />
              Suggested
            </div>
            <div style={{
              background: '#fff',
              borderRadius: 16,
              border: '1px solid #E5EAF2',
              overflow: 'hidden',
            }}>
              {suggestions.map((title, i) => (
                <motion.button
                  key={title}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...spring, delay: i * 0.04 }}
                  onClick={() => handleRecentTap(title)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    border: 0,
                    borderBottom: i === suggestions.length - 1 ? 0 : '1px solid #F1F5F9',
                    background: 'transparent',
                    color: '#101C3A',
                    textAlign: 'left',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Search size={15} color="#2563EB" />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {title}
                  </span>
                  <ArrowUpRight size={14} color="#94A3B8" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Results */}
        {showResults && (
          <>
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              padding: '0 4px 14px',
            }}>
              <h2 style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 800,
                color: '#101C3A',
                letterSpacing: -0.3,
              }}>
                {results.length === 0
                  ? 'No results'
                  : `${results.length} ${results.length === 1 ? 'result' : 'results'}`}
              </h2>
              {submitted && (
                <span style={{ fontSize: 12, color: '#94A3B8' }}>
                  for "{submitted}"
                </span>
              )}
            </div>

            {results.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={spring}
              >
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 200,
                  textAlign: 'center',
                  background: '#fff',
                  borderRadius: 20,
                  border: '1px dashed #E5EAF2',
                  padding: 30,
                  marginBottom: 20,
                }}>
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: 18,
                    background: 'rgba(37,99,235,.08)',
                    color: '#2563EB',
                    display: 'grid',
                    placeItems: 'center',
                    marginBottom: 14,
                  }}>
                    <Search size={24} />
                  </div>
                  <b style={{ fontSize: 16, color: '#101C3A', marginBottom: 6 }}>
                    Nothing matches "{query}"
                  </b>
                  <p style={{ fontSize: 13, color: '#94A3B8', margin: 0, maxWidth: 260, lineHeight: 1.6 }}>
                    Try a shorter word, or check your spelling.
                  </p>
                </div>

                {trending.length > 0 && (
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: 1,
                      color: '#94A3B8',
                      marginBottom: 12,
                      padding: '0 4px',
                    }}>
                      <Sparkles size={13} />
                      Try one of these
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {trending.slice(0, 4).map(term => (
                        <motion.button
                          key={term}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleRecentTap(term)}
                          style={{
                            padding: '8px 14px',
                            border: '1px solid #E5EAF2',
                            borderRadius: 20,
                            background: '#fff',
                            color: '#101C3A',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {term}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.03 } },
                }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 12,
                }}
              >
                {results.map(item => (
                  <motion.article
                    key={item.id}
                    variants={{
                      hidden: { opacity: 0, y: 12, scale: 0.97 },
                      show: { opacity: 1, y: 0, scale: 1, transition: spring },
                    }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onOpenListing(item)}
                    style={{
                      background: '#fff',
                      borderRadius: 16,
                      border: '1px solid #E5EAF2',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ position: 'relative', aspectRatio: '1 / 1', background: '#EEF3FC' }}>
                      {item.image ? (
                        <img src={item.image} alt={item.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#9AACC8' }}>
                          <ShoppingBag size={28} />
                        </div>
                      )}
                      {item.badge && (
                        <span style={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          padding: '3px 8px',
                          background: '#F5A623',
                          color: '#101C3A',
                          fontSize: 9,
                          fontWeight: 800,
                          borderRadius: 6,
                        }}>
                          {item.badge}
                        </span>
                      )}
                      <motion.button
                        whileTap={{ scale: 0.8 }}
                        onClick={e => { e.stopPropagation(); onSave(item.id); }}
                        aria-label={saved.includes(item.id) ? 'Remove from saved' : 'Save'}
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          width: 30,
                          height: 30,
                          display: 'grid',
                          placeItems: 'center',
                          border: 0,
                          borderRadius: 9,
                          background: saved.includes(item.id) ? '#2563EB' : 'rgba(255,255,255,.9)',
                          color: saved.includes(item.id) ? '#fff' : '#101C3A',
                          cursor: 'pointer',
                        }}
                      >
                        <Heart size={14} fill={saved.includes(item.id) ? 'currentColor' : 'none'} />
                      </motion.button>
                    </div>
                    <div style={{ padding: 10 }}>
                      <h3 style={{
                        margin: 0,
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#101C3A',
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        minHeight: 34,
                      }}>
                        {item.title}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 10, color: '#94A3B8' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {item.businessName || item.sellerName}
                        </span>
                        {item.isVerified && <ShieldCheck size={10} color="#2563EB" />}
                      </div>
                      {item.kind === 'sale' && <b style={{ display: 'block', marginTop: 6, color: '#2563EB', fontSize: 14 }}>{money(item.price)}</b>}
                      {item.kind === 'wanted' && <b style={{ display: 'block', marginTop: 6, color: '#2563EB', fontSize: 14 }}>Wanted</b>}
                      {item.kind === 'free' && <b style={{ display: 'block', marginTop: 6, color: '#15803D', fontSize: 14 }}>Free</b>}
                      {item.kind === 'lost_found' && <b style={{ display: 'block', marginTop: 6, color: '#2563EB', fontSize: 14 }}>Lost & Found</b>}
                      <p style={{ display: 'flex', alignItems: 'center', gap: 3, margin: '4px 0 0', fontSize: 10, color: '#94A3B8' }}>
                        <MapPin size={9} /> {item.location}
                      </p>
                    </div>
                  </motion.article>
                ))}
              </motion.div>
            )}
          </>
        )}
      </div>
    </motion.main>
  );
}

function ArrowUpRight({ size = 14, color = '#94A3B8' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}