import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import LearningCurveChart from '../components/complex/LearningCurveChart';
import ForgettingCurveChart from '../components/complex/ForgettingCurveChart';
import './AnalyticsView.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export const AnalyticsView = () => {
  const [analytics, setAnalytics] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const data = await api.fetchAnalytics();
        const safeData = data && typeof data === 'object' ? data : {};
        setAnalytics(safeData);
        setHistory(Array.isArray(safeData.history) ? safeData.history : []);
      } catch (err) {
        console.error("Failed to load analytics data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, []);

  if (loading) {
    return <div className="loading-state">Loading learning analytics...</div>;
  }

  const analyticsData = analytics || {};

  // 1. Reviews this week, calculated from persisted review logs.
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekCounts = Array(7).fill(0);
  const now = Date.now();

  history.forEach(h => {
    const diff = Math.floor((now - h.ts) / 86400000);
    if (diff >= 0 && diff < 7) weekCounts[6 - diff]++;
  });

  const weekLabels = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    weekLabels.push(weekdays[(d.getDay() + 6) % 7]);
  }

  const reviewsThisWeekData = {
    labels: weekLabels,
    datasets: [
      {
        label: 'Reviews Completed',
        data: weekCounts,
        backgroundColor: 'rgba(91, 79, 212, 0.45)',
        borderColor: '#5B4FD4',
        borderWidth: 1.5,
        borderRadius: 6
      }
    ]
  };

  // 2. Card type distribution from the user's cards.
  const ctypeCount = {
    exercise: 0,
    concept: 0,
    mistake: 0,
    question: 0,
    note: 0,
    ...(analyticsData.card_type_counts || {})
  };

  const cardTypesData = {
    labels: ['Exercise', 'Concept', 'Mistake', 'Question', 'Note'],
    datasets: [
      {
        data: Object.values(ctypeCount),
        backgroundColor: ['rgba(230, 160, 40, 0.3)', 'rgba(91, 79, 212, 0.3)', 'rgba(222, 53, 11, 0.3)', 'rgba(55, 138, 221, 0.3)', 'rgba(29, 158, 117, 0.3)'],
        borderColor: ['var(--amber)', 'var(--purple)', 'var(--red)', 'var(--blue)', 'var(--green)'],
        borderWidth: 1.5
      }
    ]
  };

  // 3. Rating breakdown from persisted review logs.
  const ratingCount = {
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
    ...(analyticsData.rating_counts || {})
  };

  const ratingCountsData = {
    labels: ['Again (Forgot)', 'Hard', 'Good', 'Easy'],
    datasets: [
      {
        data: Object.values(ratingCount),
        backgroundColor: ['rgba(222, 53, 11, 0.3)', 'rgba(230, 160, 40, 0.3)', 'rgba(55, 138, 221, 0.3)', 'rgba(29, 158, 117, 0.3)'],
        borderColor: ['var(--red)', 'var(--amber)', 'var(--blue)', 'var(--green)'],
        borderWidth: 1.5,
        borderRadius: 6
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: '#A09990', stepSize: 2 },
        grid: { color: 'rgba(255, 255, 255, 0.05)' }
      },
      x: {
        ticks: { color: '#A09990' },
        grid: { display: false }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: '#A09990',
          font: { size: 11 },
          padding: 10
        }
      }
    },
    cutout: '62%'
  };

  return (
    <div className="page-analytics" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Learning & Cumulative Velocity Section */}
      <LearningCurveChart
        curve={Array.isArray(analyticsData.learning_curve) ? analyticsData.learning_curve : []}
      />

      <div className="analytics-grid-top">
        {/* Reviews this week */}
        <div className="card analytics-card">
          <div className="card-title">Reviews Velocity (Past 7 Days)</div>
          <div className="analytics-chart-wrap">
            <Bar data={reviewsThisWeekData} options={chartOptions} />
          </div>
        </div>

        {/* Card type distribution */}
        <div className="card analytics-card">
          <div className="card-title">Card Type Distribution</div>
          <div className="analytics-chart-wrap">
            <Doughnut data={cardTypesData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* Forgetting Curve Simulator */}
      <ForgettingCurveChart
        initialStability={analyticsData.average_stability}
        initialDifficulty={analyticsData.average_difficulty}
      />

      {/* Ratings accuracy breakdown */}
      <div className="card analytics-card full-width-card">
        <div className="card-title">Recall Quality & Rating Breakdown</div>
        <div className="analytics-chart-wrap short-wrap">
          <Bar data={ratingCountsData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
