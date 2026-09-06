import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import AppLayout from './components/layouts/AppLayout';
import Dashboard from './views/Dashboard';
import StudySession from './views/StudySession';
import CalendarGrid from './components/complex/CalendarGrid';
import TopicsLibrary from './views/TopicsLibrary';
import CardsLibrary from './views/CardsLibrary';
import AnalyticsView from './views/AnalyticsView';
import ForgettingCurveChart from './components/complex/ForgettingCurveChart';
import LoginPage from './views/LoginPage';
import Button from './components/ui/Button';
import ErrorBoundary from './components/ui/ErrorBoundary';
import './styles/global.css';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => api.isAuthenticated());
  const [currentUser, setCurrentUser] = useState(() => api.getCurrentUser());
  const [activePage, setActivePage] = useState('dashboard');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [dataVersion, setDataVersion] = useState(0);
  
  // App-wide data
  const [topics, setTopics] = useState([]);
  const [exams, setExams] = useState([]);
  const [cards, setCards] = useState([]);
  const [history, setHistory] = useState([]);
  const [streak, setStreak] = useState(3);
  const [doneToday, setDoneToday] = useState(0);

  // Modals visibility state
  const [isAddTopicOpen, setIsAddTopicOpen] = useState(false);
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [activeQuickReview, setActiveQuickReview] = useState(null);
  const [isLoadingQuickReview, setIsLoadingQuickReview] = useState(false);
  const [quickReviewError, setQuickReviewError] = useState(null);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setCurrentUser(api.getCurrentUser());
    setActivePage('dashboard');
    loadData();
  };

  const handleLogout = async () => {
    await api.logout();
    setIsAuthenticated(false);
    setCurrentUser('Guest');
    setActivePage('login');
  };

  const handleOpenCardInspector = async (cardOrId) => {
    if (!cardOrId) return;
    setQuickReviewError(null);

    if (typeof cardOrId === 'object' && cardOrId !== null) {
      setActiveQuickReview(cardOrId);
      return;
    }

    try {
      setIsLoadingQuickReview(true);
      setActiveQuickReview({});
      const fetchedCards = await api.fetchCards({ cardId: cardOrId });
      if (fetchedCards && fetchedCards.length > 0) {
        setActiveQuickReview(fetchedCards[0]);
      } else {
        setQuickReviewError('Card not found or details unavailable.');
      }
    } catch (err) {
      console.error("Failed to inspect card:", err);
      setQuickReviewError('Failed to load card details.');
    } finally {
      setIsLoadingQuickReview(false);
    }
  };

  // Toast state
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  let toastTimer = null;

  const addToast = (message) => {
    setToastMessage(message);
    setShowToast(true);
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      setShowToast(false);
    }, 2400);
  };

  // Add Topic form state
  const [topicName, setTopicName] = useState('');
  const [topicTag, setTopicTag] = useState('math');
  const [topicNotes, setTopicNotes] = useState('');

  // Add Card form state
  const [cardTopicId, setCardTopicId] = useState('');
  const [cardCtype, setCardCtype] = useState('exercise'); // exercise, concept, mistake, question, note
  const [cardQuestion, setCardQuestion] = useState('');
  const [cardHint, setCardHint] = useState('');
  const [cardMethod, setCardMethod] = useState('RECALL'); // RECALL, TEST, READ, WATCH
  const [cardAttachedFile, setCardAttachedFile] = useState(null);

  const loadData = async () => {
    try {
      const [allTopics, allExams, allCards] = await Promise.all([
        api.fetchTopics(),
        api.fetchExams(),
        api.fetchCards()
      ]);
      const stats = await api.fetchDashboardStats();
      
      setTopics(allTopics);
      setExams(allExams);
      setCards(allCards);
      setHistory(stats.history || []);
      setStreak(stats.streak || 3);
      setDoneToday(stats.doneToday || 0);
    } catch (err) {
      console.error("Failed to load application data:", err);
    }
  };

  useEffect(() => {
    loadData();
    return () => {
      if (toastTimer) clearTimeout(toastTimer);
    };
  }, []);

  const handleAddTopic = async (e) => {
    e.preventDefault();
    if (!topicName.trim()) {
      addToast('Enter a topic name');
      return;
    }
    try {
      const newTopic = await api.addTopic(topicName.trim(), topicTag, topicNotes.trim());
      addToast(`"${newTopic.name}" added`);
      setIsAddTopicOpen(false);
      
      // Reset form
      setTopicName('');
      setTopicTag('math');
      setTopicNotes('');
      
      loadData();
      setDataVersion(prev => prev + 1);
    } catch (err) {
      console.error("Failed to add topic:", err);
      addToast(err.message || 'Could not add topic');
    }
  };

  const handleAddCard = async (e) => {
    e.preventDefault();
    if (!cardQuestion.trim()) {
      addToast('Enter a question or description');
      return;
    }
    try {
      await api.addCard({
        question: cardQuestion.trim(),
        hint: cardHint.trim(),
        topicId: cardTopicId ? Number(cardTopicId) : null,
        ctype: cardCtype,
        method: cardMethod,
        fileName: cardAttachedFile ? cardAttachedFile.name : null
      });
      addToast('Card captured');
      setIsAddCardOpen(false);

      // Reset form
      setCardQuestion('');
      setCardHint('');
      setCardTopicId('');
      setCardCtype('');
      setCardMethod('RECALL');
      setCardAttachedFile(null);

      loadData();
      setDataVersion(prev => prev + 1);
      
      // Refresh current page if dashboard or cards
      if (activePage === 'dashboard' || activePage === 'cards') {
        setActivePage(activePage);
      }
    } catch (err) {
      console.error("Failed to add card:", err);
      addToast(err.message || 'Could not add card');
    }
  };

  const handleSelectTopicFromSidebar = (topicId) => {
    setSelectedTopicId(topicId);
    setActivePage('cards');
  };

  // Resolve headers dynamically
  const getPageTitle = () => {
    const titles = {
      dashboard: 'Dashboard',
      session: 'Study session',
      calendar: 'Calendar',
      topics: 'Topics',
      cards: 'Cards',
      analytics: 'Analytics',
      forgetting: 'Forgetting curve'
    };
    return titles[activePage] || 'Recall Studio';
  };

  // Render active view
  const renderView = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <ErrorBoundary fallbackTitle="Dashboard error">
            <Dashboard 
              onReviewSubmitted={loadData} 
              dataVersion={dataVersion} 
              onStartTopicSession={(topicId) => {
                setSelectedTopicId(topicId);
                setActivePage('session');
              }}
              onNavigate={(page) => {
                setActivePage(page);
              }}
            />
          </ErrorBoundary>
        );
      case 'session':
        return (
          <ErrorBoundary fallbackTitle="Session error">
            <StudySession 
              selectedTopicId={selectedTopicId} 
              onSessionDone={loadData}
              addToast={addToast}
            />
          </ErrorBoundary>
        );
      case 'calendar':
        return (
          <ErrorBoundary fallbackTitle="Calendar error">
            <CalendarGrid 
              cards={cards} 
              topics={topics} 
              exams={exams} 
              history={history} 
              onReviewCard={handleOpenCardInspector}
            />
          </ErrorBoundary>
        );
      case 'topics':
        return (
          <ErrorBoundary fallbackTitle="Topics library error">
            <TopicsLibrary 
              onSelectTopic={(topicId) => {
                setSelectedTopicId(topicId);
                setActivePage('cards');
              }} 
            />
          </ErrorBoundary>
        );
      case 'cards':
        return (
          <ErrorBoundary fallbackTitle="Cards library error">
            <CardsLibrary 
              initialTopicId={selectedTopicId} 
              dataVersion={dataVersion}
              onReviewCard={handleOpenCardInspector}
            />
          </ErrorBoundary>
        );
      case 'analytics':
        return (
          <ErrorBoundary fallbackTitle="Analytics error">
            <AnalyticsView />
          </ErrorBoundary>
        );
      case 'forgetting':
        return (
          <div className="forgetting-curve-view">
            <ForgettingCurveChart />
            
            {/* Retention List */}
            <div className="card retention-list-card">
              <div className="card-title">Your cards — retention estimates</div>
              <div className="ret-list">
                {cards.length === 0 ? (
                  <div className="empty-sub">No cards captured yet</div>
                ) : (
                  [...cards]
                    .sort((a, b) => {
                      const getRet = (c) => {
                        if (!c.lastReview) return 100;
                        const days = (Date.now() - c.lastReview) / 86400000;
                        const stab = c.interval * 1.4;
                        return Math.round(Math.max(0, Math.min(100, Math.exp(-days / stab) * 100)));
                      };
                      return getRet(a) - getRet(b);
                    })
                    .map(c => {
                      const getRet = (card) => {
                        if (!card.lastReview) return 100;
                        const days = (Date.now() - card.lastReview) / 86400000;
                        const stab = card.interval * 1.4;
                        return Math.round(Math.max(0, Math.min(100, Math.exp(-days / stab) * 100)));
                      };
                      const ret = getRet(c);
                      const t = topics.find(topic => topic.id === c.topicId);
                      const retColor = ret > 65 ? 'var(--green)' : ret > 35 ? 'var(--amber)' : 'var(--red)';
                      return (
                        <div key={c.id} className="ret-list-item">
                          <div className="ret-list-item-q-container">
                            <div className="ret-list-item-q">{c.question}</div>
                            <div className="ret-list-item-meta">
                              {t?.name || 'No topic'} · interval {c.interval}d
                            </div>
                          </div>
                          
                          <div className="ret-list-item-bar-container">
                            <div className="ret-list-item-bar-bg">
                              <div 
                                className="ret-list-item-bar-fill" 
                                style={{ width: `${ret}%`, background: retColor }}
                              />
                            </div>
                          </div>
                          
                          <span className="ret-list-item-percent" style={{ color: retColor }}>
                            {ret}%
                          </span>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        );
      default:
        return <Dashboard onReviewSubmitted={loadData} />;
    }
  };

  if (!isAuthenticated || activePage === 'login') {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <AppLayout
      activePage={activePage}
      onNavigate={(page) => {
        setActivePage(page);
        setSelectedTopicId(''); // Clear topic filters on page navigation
      }}
      streak={streak}
      topics={topics}
      onSelectTopic={handleSelectTopicFromSidebar}
      onAddTopicClick={() => setIsAddTopicOpen(true)}
      onAddCardClick={() => setIsAddCardOpen(true)}
      pageTitle={getPageTitle()}
      currentUser={currentUser}
      onLogout={handleLogout}
    >
      {renderView()}

      {/* ADD TOPIC MODAL */}
      {isAddTopicOpen && (
        <div className="overlay open" onClick={() => setIsAddTopicOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="m-head">
              <div className="m-title">Add topic</div>
              <button className="close-btn" onClick={() => setIsAddTopicOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAddTopic} className="m-body">
              <div className="field">
                <label>Name</label>
                <input 
                  type="text" 
                  value={topicName} 
                  onChange={(e) => setTopicName(e.target.value)} 
                  placeholder="e.g. Linear Algebra, Spanish B2…"
                  required
                />
              </div>
              <div className="field">
                <label>Subject</label>
                <select value={topicTag} onChange={(e) => setTopicTag(e.target.value)}>
                  <option value="math">Math</option>
                  <option value="programming">Programming</option>
                  <option value="science">Science</option>
                  <option value="language">Language</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="field">
                <label>Notes</label>
                <textarea 
                  value={topicNotes} 
                  onChange={(e) => setTopicNotes(e.target.value)} 
                  rows="2" 
                  placeholder="What's this topic?"
                />
              </div>
              <Button type="submit" variant="primary" style={{ width: '100%', justifyContent: 'center', padding: '11px' }}>
                Add topic
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* ADD CARD MODAL */}
      {isAddCardOpen && (
      <div className="overlay open" onClick={() => setIsAddCardOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="m-head">
              <div className="m-title">Capture a card</div>
              <button className="close-btn" onClick={() => setIsAddCardOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAddCard} className="m-body">
              <div className="field">
                <label>Topic</label>
                <select value={cardTopicId} onChange={(e) => setCardTopicId(e.target.value)}>
                  <option value="">No topic</option>
                  {topics.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="field">
                <label>Card type</label>
                <div className="type-sel">
                  {['exercise', 'concept', 'mistake', 'question', 'note'].map(type => (
                    <button
                      key={type}
                      type="button"
                      className={`t-btn ${cardCtype === type ? `s-${type}` : ''}`}
                      onClick={() => setCardCtype(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="field">
                <label>What to remember / question</label>
                <textarea 
                  value={cardQuestion} 
                  onChange={(e) => setCardQuestion(e.target.value)} 
                  rows="3" 
                  placeholder="Describe the concept, exercise, or what you struggled with…"
                  required
                />
              </div>
              
              <div className="field">
                <label>Context / hint (optional)</label>
                <textarea 
                  value={cardHint} 
                  onChange={(e) => setCardHint(e.target.value)} 
                  rows="2" 
                  placeholder="Formula, explanation, or why this matters…"
                />
              </div>
              
              <div className="field">
                <label>Attach file (optional)</label>
                <div 
                  className={`file-upload-area ${cardAttachedFile ? 'has-file' : ''}`}
                  onClick={() => document.getElementById('app-file-inp').click()}
                >
                  <div style={{ fontSize: '20px', marginBottom: '4px', opacity: 0.4 }}><svg viewBox="0 0 16 16" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 14l6-6c1.5-1.5 1.5-4 0-5.5s-4-1.5-5.5 0l-5 5c-1 1-1 2.5 0 3.5s2.5 1 3.5 0l5-5c.5-.5.5-1 0-1.5s-1-.5-1.5 0L5 9"/></svg></div>
                  <div className="file-label">
                    {cardAttachedFile ? cardAttachedFile.name : 'Click to attach a file, exam paper, or photo'}
                  </div>
                </div>
                <input 
                  type="file" 
                  id="app-file-inp" 
                  style={{ display: 'none' }} 
                  accept="image/*,.pdf" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setCardAttachedFile(e.target.files[0]);
                    }
                  }}
                />
              </div>
              
              <div className="field">
                <label>Review method</label>
                <select value={cardMethod} onChange={(e) => setCardMethod(e.target.value)}>
                  <option value="RECALL">RECALL — retrieve from memory</option>
                  <option value="TEST">TEST — solve / prove it</option>
                  <option value="READ">READ — re-read and understand</option>
                  <option value="WATCH">WATCH — find and watch a resource</option>
                </select>
              </div>
              
              <Button type="submit" variant="primary" style={{ width: '100%', justifyContent: 'center', padding: '11px' }}>
                Capture card
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* QUICK REVIEW MODAL FROM CARDS VIEW */}
      {activeQuickReview && (
        <div className="overlay open" onClick={() => {
          setActiveQuickReview(null);
          setQuickReviewError(null);
        }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="m-head">
              <div className="m-title">Card Inspector</div>
              <button className="close-btn" onClick={() => {
                setActiveQuickReview(null);
                setQuickReviewError(null);
              }}>×</button>
            </div>
            <div className="m-body">
              <ErrorBoundary fallbackTitle="Could not display card details">
                {isLoadingQuickReview ? (
                  <div className="loading-state">Loading card details...</div>
                ) : quickReviewError ? (
                  <div className="empty-sub" style={{ padding: '20px', textAlign: 'center', color: 'var(--red)' }}>
                    {quickReviewError}
                  </div>
                ) : !activeQuickReview || typeof activeQuickReview !== 'object' ? (
                  <div className="empty-sub" style={{ padding: '20px', textAlign: 'center' }}>
                    Card data is unavailable or undefined.
                  </div>
                ) : (
                  <Flashcard
                    card={activeQuickReview}
                    topicName={activeQuickReview.topicName}
                    onFeedback={async (cardId, rating) => {
                      if (!cardId) return;
                      try {
                        await api.submitCardReview(cardId, rating);
                        setActiveQuickReview(null);
                        loadData();
                        setDataVersion(prev => prev + 1);
                      } catch (err) {
                        console.error("Failed to submit quick review:", err);
                        addToast(err.message || 'Could not submit review');
                      }
                    }}
                    showSkip={false}
                  />
                )}
              </ErrorBoundary>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      <div className={`toast ${showToast ? 'show' : ''}`}>
        {toastMessage}
      </div>
    </AppLayout>
  );
}

export default App;
