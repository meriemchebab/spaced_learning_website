import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import TopicChip from '../ui/TopicChip';
import './Flashcard.css';

const CTYPE_HINTS = {
  exercise: "Work through this exercise step by step from memory. Check your working after.",
  concept:  "Close your notes. Explain this concept out loud or write it down in your own words.",
  mistake:  "This is something you got wrong before. Try again — what's the correct approach?",
  question: "Answer this question fully. Be specific — don't just recall vaguely.",
  note:     "Read through this note carefully. Connect it to what you already know."
};

const ctypeColors = {
  exercise: 'var(--amber)',
  concept: 'var(--purple)',
  mistake: 'var(--red)',
  question: 'var(--blue)',
  note: 'var(--green)'
};

export const Flashcard = ({
  card,
  onFeedback,
  onSkip,
  progressText,
  topicName = 'No topic',
  showSkip = true
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  // Reset flip state when card changes
  useEffect(() => {
    setIsFlipped(false);
  }, [card?.id]);

  if (!card) return null;

  const retColor = card.retention > 65 ? 'var(--green)' : card.retention > 35 ? 'var(--amber)' : 'var(--red)';

  return (
    <div className="flashcard-container">
      <div className={`flashcard ${isFlipped ? 'flipped' : ''}`}>
        
        {/* FRONT SIDE */}
        <div className="flashcard-front">
          <div className="flashcard-header">
            {progressText ? <Badge variant="gray">{progressText}</Badge> : <span />}
            <Badge variant="purple">{topicName}</Badge>
          </div>
          
          <div className="flashcard-body">
            <div className="sc-type-bar" style={{ background: ctypeColors[card.ctype] }} />
            <div className="sc-meta-row">
              <TopicChip type={card.ctype} />
              <Badge variant="blue" style={{ fontFamily: 'DM Mono' }}>{card.method}</Badge>
              <span className="sc-ret" style={{ color: retColor, marginLeft: 'auto', fontSize: '11px', fontFamily: 'DM Mono' }}>
                est. {card.retention}% recall
              </span>
            </div>
            
            <div className="session-q">{card.question}</div>
            
            <div className="session-hint-container">
              <div className="session-hint-title">Approach Hint</div>
              <div className="session-hint">{CTYPE_HINTS[card.ctype]}</div>
            </div>
          </div>
          
          <div className="flashcard-footer">
            {showSkip && (
              <Button variant="ghost" size="sm" onClick={onSkip}>
                Skip
              </Button>
            )}
            <Button variant="primary" size="md" onClick={() => setIsFlipped(true)}>
              Reveal / Flip Card
            </Button>
          </div>
        </div>

        {/* BACK SIDE */}
        <div className="flashcard-back">
          <div className="flashcard-header">
            {progressText ? <Badge variant="gray">{progressText}</Badge> : <span />}
            <Badge variant="purple">{topicName}</Badge>
          </div>
          
          <div className="flashcard-body">
            <div className="sc-type-bar" style={{ background: ctypeColors[card.ctype] }} />
            <div className="sc-meta-row">
              <TopicChip type={card.ctype} />
              <Badge variant="blue" style={{ fontFamily: 'DM Mono' }}>{card.method}</Badge>
            </div>
            
            <div className="session-q">{card.question}</div>
            
            {card.hint && (
              <div className="answer-section">
                <div className="answer-label">Detailed Solution Context</div>
                <div className="answer-content">{card.hint}</div>
              </div>
            )}

            {card.hasFile && (
              <div className="has-file-badge">
                <span>📎</span>
                <span>{card.fileName || 'Attached Reference Document'}</span>
              </div>
            )}
          </div>
          
          <div className="flashcard-footer-feedback">
            <div className="feedback-label">How did it go?</div>
            <div className="fb-row">
              <button className="fb-btn fb-again" onClick={() => onFeedback(card.id, 1)}>
                <div>Again</div>
                <div className="fb-sub">forgot it</div>
              </button>
              <button className="fb-btn fb-hard" onClick={() => onFeedback(card.id, 2)}>
                <div>Hard</div>
                <div className="fb-sub">reset interval</div>
              </button>
              <button className="fb-btn fb-good" onClick={() => onFeedback(card.id, 3)}>
                <div>Good</div>
                <div className="fb-sub">some effort</div>
              </button>
              <button className="fb-btn fb-easy" onClick={() => onFeedback(card.id, 4)}>
                <div>Easy</div>
                <div className="fb-sub">boost interval</div>
              </button>
            </div>
            <div style={{ marginTop: '10px', textAlign: 'center' }}>
              <Button variant="ghost" size="sm" onClick={() => setIsFlipped(false)}>
                ← Show Question
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Flashcard;
