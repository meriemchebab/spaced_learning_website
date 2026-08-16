import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import TopicChip from '../components/ui/TopicChip';
import Flashcard from '../components/complex/Flashcard';
import './Dashboard.css';

const TAG_COLORS = {
  math: '#7F77DD',
  programming: '#378ADD',
  science: '#1D9E75',
  language: '#BA7517',
  other: '#888780'
};

export const Dashboard = ({ onReviewSubmitted }) => {
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
  }, []);

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
    dueCards = [],
    upcomingCards = []
  } = stats || {};

  const retColor = r => r > 65 ? 'var(--green)' : r > 35 ? 'var(--amber)' : 'var(--red)';
  
  // Detect if cards are from multiple topics for the interleaving banner
  const uniqueTopics = new Set(dueCards.map(c => c.topicId));
  const showInterleaveBanner = uniqueTopics.size > 1 && dueCards.length > 1;

  return (
    <div className="page-dashboard">
      {/* Stats Row */}
      <div className="stats-row">
        <StatCard label="Due today" value={dueCount} subtext="cards to review" />
        <StatCard label="Session done" value={doneToday} subtext="this session" />
        <StatCard label="Cards total" value={totalCards} subtext="in library" />
        <StatCard label="Avg retention" value={avgRetention} subtext="estimated" />
      </div>

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Due list */}
        <div className="card list-card">
          <div className="card-head">
            <div className="card-title">Due now</div>
            <Badge variant="purple">{dueCards.length}</Badge>
          </div>

          {showInterleaveBanner && (
            <div className="interleave-banner">
              ⚡ Interleaved session — cards from multiple topics mixed for better retention
            </div>
          )}

          <div className="review-list">
            {dueCards.length === 0 ? (
              <div className="empty">
                <div className="e-icon">☕</div>
                <div className="e-title">{totalCards === 0 ? 'Add your first card to start' : 'All caught up!'}</div>
                <div className="e-sub">
                  {totalCards === 0 
                    ? 'Use the "+ Card" button to capture exercises and concepts' 
                    : 'Nothing due right now. Enjoy your break!'}
                </div>
              </div>
            ) : (
              dueCards.map(card => (
                <div 
                  key={card.id} 
                  className="review-item" 
                  onClick={() => setActiveReviewCard(card)}
                >
                  <div 
                    className="r-dot" 
                    style={{ background: TAG_COLORS[card.topicTag] || '#888' }} 
                  />
                  <div className="r-main">
                    <div className="r-name">{card.question}</div>
                    <div className="r-meta">
                      {card.topicName} · <TopicChip type={card.ctype} />
                    </div>
                  </div>
                  <span className="r-ret" style={{ color: retColor(card.retention) }}>
                    {card.retention}%
                  </span>
                  <Badge variant="blue" style={{ marginLeft: '10px' }}>{card.method}</Badge>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming list */}
        <div className="card list-card">
          <div className="card-head">
            <div className="card-title">Upcoming reviews</div>
          </div>
          
          <div className="upcoming-list">
            {upcomingCards.length === 0 ? (
              <div className="empty-sub">No upcoming reviews scheduled</div>
            ) : (
              upcomingCards.map(card => (
                <div key={card.id} className="upcoming-item">
                  <div className="upcoming-time">+{card.daysUntil}d</div>
                  <div className="upcoming-q">{card.question}</div>
                  <TopicChip type={card.ctype} />
                </div>
              ))
            )}
          </div>
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
              <Flashcard 
                card={activeReviewCard} 
                topicName={activeReviewCard.topicName}
                onFeedback={handleReviewFeedback}
                showSkip={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
