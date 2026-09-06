import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import TopicChip from '../components/ui/TopicChip';
import Button from '../components/ui/Button';
import Flashcard from '../components/complex/Flashcard';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import './Dashboard.css';

const TAG_COLORS = {
  math: 'var(--purple)',
  programming: 'var(--blue)',
  science: 'var(--teal)',
  language: 'var(--amber)',
  other: 'var(--text3)'
};

export const Dashboard = ({ onReviewSubmitted, dataVersion, onStartTopicSession, onNavigate }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeReviewCard, setActiveReviewCard] = useState(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await api.fetchDashboardStats();
      setStats(data);
    } catch (err) {
      console.error("Failed to load dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [dataVersion]);

  const handleReviewFeedback = async (cardId, rating) => {
    try {
      await api.submitCardReview(cardId, rating);
      setActiveReviewCard(null);
      setStats((prevStats) => {
        if (!prevStats) return prevStats;

        const nextDueCards = (prevStats.dueCards || []).filter((card) => card.id !== cardId);
        const nextUpcomingCards = (prevStats.upcomingCards || []).filter((card) => card.id !== cardId);

        return {
          ...prevStats,
          dueCount: Math.max(0, (prevStats.dueCount || 0) - 1),
          dueCards: nextDueCards,
          upcomingCards: nextUpcomingCards
        };
      });

      if (onReviewSubmitted) onReviewSubmitted();
    } catch (err) {
      console.error("Error submitting review:", err);
    }
  };

  if (loading && !stats) {
    return <div className="loading-state">Loading learning metrics...</div>;
  }

  const {
    dueCount = 0,
    doneToday = 0,
    totalCards = 0,
    avgRetention = '—',
    upcomingCards = [],
    topics = []
  } = stats || {};

  const retColor = r => r > 65 ? 'var(--green)' : r > 35 ? 'var(--amber)' : 'var(--red)';

  return (
    <div className="page-dashboard">
      {/* Stats Row */}
      <div className="stats-row">
        <StatCard label="Due today" value={dueCount} subtext="cards to review" />
        <StatCard label="Session done" value={doneToday} subtext="this session" />
        <StatCard label="Cards total" value={totalCards} subtext="in library" />
        <StatCard label="Avg retention" value={avgRetention} subtext="estimated" />
      </div>

      {/* Main Decks Grid */}
      <div className="card list-card decks-section-card">
        <div className="card-head">
          <div>
            <div className="card-title" style={{ fontSize: '16px', fontWeight: 600 }}>Your Topic Decks</div>
            <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px' }}>
              Select a deck to start a focused study session
            </div>
          </div>
          {onNavigate && (
            <Button variant="ghost" size="sm" onClick={() => onNavigate('topics')}>
              Manage topics →
            </Button>
          )}
        </div>

        <div className="decks-grid">
          {topics.length === 0 ? (
            <div className="empty" style={{ gridColumn: '1 / -1', padding: '40px 20px' }}>
              <div className="e-icon">—</div>
              <div className="e-title">No topic decks created yet</div>
              <div className="e-sub">Use the "+ Topic" button in the header to create your first deck.</div>
            </div>
          ) : (
            topics.map(t => {
              const deckRet = t.avgRetention ?? 100;
              const rColor = retColor(deckRet);
              return (
                <div key={t.id} className="deck-card">
                  <div className="deck-card-head">
                    <Badge variant="purple">{t.tag || 'topic'}</Badge>
                    {t.dueCount > 0 && <Badge variant="red">{t.dueCount} due</Badge>}
                  </div>

                  <h3 className="deck-title">{t.name === 'no_topic' ? 'No topic' : t.name}</h3>
                  {t.notes && <p className="deck-notes">{t.notes}</p>}

                  <div className="deck-metrics-row">
                    <div className="deck-metric">
                      <span className="dm-label">Cards</span>
                      <span className="dm-val">{t.cardCount}</span>
                    </div>
                    <div className="deck-metric">
                      <span className="dm-label">Est. Retention</span>
                      <span className="dm-val" style={{ color: rColor }}>{deckRet}%</span>
                    </div>
                  </div>

                  <div className="deck-action-row">
                    <Button 
                      variant={t.dueCount > 0 ? "primary" : "secondary"} 
                      size="sm" 
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => onStartTopicSession && onStartTopicSession(t.id)}
                    >
                      {t.dueCount > 0 ? `Study Deck (${t.dueCount} due)` : 'Review Deck'}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Upcoming reviews summary */}
      <div className="card list-card">
        <div className="card-head">
          <div className="card-title">Upcoming schedule preview</div>
          <Badge variant="blue">{(upcomingCards || []).length} scheduled</Badge>
        </div>
        
        <div className="upcoming-list">
          {(!upcomingCards || upcomingCards.length === 0) ? (
            <div className="empty-sub">No upcoming reviews scheduled</div>
          ) : (
            upcomingCards.map(card => (
              <div 
                key={card?.id || Math.random()} 
                className="upcoming-item"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  if (card) {
                    setActiveReviewCard(card);
                  }
                }}
              >
                <div className="upcoming-time">+{card?.daysUntil || 0}d</div>
                <div className="upcoming-q">{card?.question || 'Untitled Card'}</div>
                <TopicChip type={card?.ctype || 'question'} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Review Modal */}
      {activeReviewCard && (
        <div className="overlay open" onClick={() => setActiveReviewCard(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="m-head">
              <div className="m-title">Quick Review</div>
              <button className="close-btn" onClick={() => setActiveReviewCard(null)}>×</button>
            </div>
            <div className="m-body">
              <ErrorBoundary fallbackTitle="Could not display review card">
                {!activeReviewCard || typeof activeReviewCard !== 'object' ? (
                  <div className="empty-sub" style={{ padding: '20px', textAlign: 'center' }}>
                    Card data is unavailable or undefined.
                  </div>
                ) : (
                  <Flashcard 
                    card={activeReviewCard} 
                    topicName={activeReviewCard.topicName}
                    onFeedback={handleReviewFeedback}
                    showSkip={false}
                  />
                )}
              </ErrorBoundary>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
