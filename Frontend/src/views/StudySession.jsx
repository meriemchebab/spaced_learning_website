import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Flashcard from '../components/complex/Flashcard';
import Button from '../components/ui/Button';
import './StudySession.css';

export const StudySession = ({
  selectedTopicId = null,
  onSessionDone,
  addToast
}) => {
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isEarlyReview, setIsEarlyReview] = useState(false);
  const [topics, setTopics] = useState([]);

  useEffect(() => {
    const loadTopics = async () => {
      try {
        const allTopics = await api.fetchTopics();
        setTopics(allTopics);
      } catch (err) {
        console.error("Failed to load topics for study session:", err);
      }
    };

    loadTopics();
  }, []);

  const resolveTopicName = (topicId) => {
    const topic = topics.find((item) => item.id === topicId);
    return topic ? topic.name : 'No topic';
  };

  const loadStudyPlan = async (topicId) => {
    try {
      setLoading(true);
      const plan = await api.fetchDailyStudyPlan(topicId);
      setQueue(plan);
      setCurrentIndex(0);
      setIsEarlyReview(false);
    } catch (err) {
      console.error("Failed to load study plan:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudyPlan(selectedTopicId);
  }, [selectedTopicId]);

  const handleFeedback = async (cardId, rating) => {
    try {
      const response = await api.submitCardReview(cardId, rating);
      if (addToast) {
        addToast(response.message || 'Review submitted');
      }

      setQueue((prevQueue) => {
        const nextQueue = prevQueue.filter((card) => card.id !== cardId);
        if (nextQueue.length === 0 && onSessionDone) {
          onSessionDone();
        }
        return nextQueue;
      });
      setCurrentIndex(0);
      
      if (queue.length <= 1 && onSessionDone) {
        if (onSessionDone) onSessionDone();
      }
    } catch (err) {
      console.error("Error submitting review:", err);
    }
  };

  const handleSkip = () => {
    setCurrentIndex(prev => prev + 1);
  };

  const handleReviewEarly = async () => {
    try {
      setLoading(true);
      const allCards = await api.fetchCards(
        selectedTopicId ? { topicId: Number(selectedTopicId) } : {}
      );
      
      // Sort by lowest retention estimate first
      const getRetEst = (c) => {
        if (!c.lastReview) return 100;
        const days = (Date.now() - c.lastReview) / 86400000;
        const stab = c.interval * 1.4;
        return Math.round(Math.max(0, Math.min(100, Math.exp(-days / stab) * 100)));
      };
      
      const sorted = [...allCards].sort((a, b) => getRetEst(a) - getRetEst(b));
      
      // Map to session format
      const formatted = sorted.map(c => ({
        id: c.id,
        question: c.question,
        hint: c.hint,
        topicId: c.topicId,
        topicName: resolveTopicName(c.topicId),
        ctype: c.ctype,
        method: c.method,
        hasFile: c.hasFile,
        fileName: c.fileName,
        retention: getRetEst(c)
      }));

      setQueue(formatted);
      setCurrentIndex(0);
      setIsEarlyReview(true);
    } catch (err) {
      console.error("Failed to load cards for early review:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-state">Loading review session...</div>;
  }

  const isSessionFinished = queue.length === 0 || currentIndex >= queue.length;

  return (
    <div className="study-session-view">
      {isSessionFinished ? (
        <div className="card empty-session-card">
          <div className="e-icon">✨</div>
          <div className="e-title">Nothing due right now</div>
          <div className="e-sub">
            {isEarlyReview 
              ? 'Finished early review! Keep up the good work.'
              : 'All caught up — great work. Check back later or review early.'}
          </div>
          <div className="early-review-action">
            <Button variant="ghost" onClick={handleReviewEarly}>
              Review early (all cards)
            </Button>
          </div>
        </div>
      ) : (
          <Flashcard
            card={queue[currentIndex]}
            topicName={queue[currentIndex].topicName}
            progressText={`Card ${currentIndex + 1} of ${queue.length}`}
            onFeedback={handleFeedback}
            onSkip={handleSkip}
            showSkip={true}
        />
      )}
    </div>
  );
};

export default StudySession;
