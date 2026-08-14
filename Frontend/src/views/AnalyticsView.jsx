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
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const data = await api.fetchDashboardStats();
        setHistory(data.history || []);
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

  // 1. Reviews this week calculations
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekCounts = Array(7).fill(0);
  const now = Date.now();

  history.forEach(h => {
    const diff = Math.floor((now - h.ts) / 86400000);
    if (diff < 7) {
      weekCounts[6 - diff]++;
    }
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
        data: weekCounts,
        backgroundColor: '#EEEDFE',
        borderColor: '#5B4FD4',
        borderWidth: 1.5,
        borderRadius: 6
      }
    ]
  };

  // 2. Card type distribution calculations
  const ctypeCount = { exercise: 0, concept: 0, mistake: 0, question: 0, note: 0 };
  history.forEach(h => {
    if (ctypeCount[h.ctype] !== undefined) {
      ctypeCount[h.ctype]++;
    }
  });

  const cardTypesData = {
    labels: ['Exercise', 'Concept', 'Mistake', 'Question', 'Note'],
    datasets: [
      {
        data: Object.values(ctypeCount),
        backgroundColor: ['#FEF2E0', '#EEEDFE', '#FDECEA', '#E7F2FB', '#E6F4EE'],
        borderColor: ['#B5600A', '#5B4FD4', '#BE3A2A', '#1A68A8', '#2C7A50'],
        borderWidth: 2
      }
    ]
  };

  // 3. Ratings over time calculations
  const ratingCount = { hard: 0, good: 0, easy: 0 };
  history.forEach(h => {
    if (ratingCount[h.rating] !== undefined) {
      ratingCount[h.rating]++;
    }
  });

  const ratingCountsData = {
    labels: ['Hard', 'Good', 'Easy'],
    datasets: [
      {
        data: Object.values(ratingCount),
        backgroundColor: ['#FDECEA', '#FEF2E0', '#E6F4EE'],
        borderColor: ['#BE3A2A', '#B5600A', '#2C7A50'],
        borderWidth: 1.5,
        borderRadius: 6
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: '#A09990',
          stepSize: 1
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.04)'
        }
      },
      x: {
        ticks: {
          color: '#A09990'
        },
        grid: {
          display: false
        }
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
          font: {
            size: 11
          },
          padding: 10
        }
      }
    },
    cutout: '58%'
  };

  return (
    <div className="page-analytics">
      <div className="analytics-grid-top">
        {/* Reviews this week */}
        <div className="card analytics-card">
          <div className="card-title">Reviews this week</div>
          <div className="analytics-chart-wrap">
            <Bar data={reviewsThisWeekData} options={chartOptions} />
          </div>
        </div>

        {/* Card type distribution */}
        <div className="card analytics-card">
          <div className="card-title">Card type distribution</div>
          <div className="analytics-chart-wrap">
            <Doughnut data={cardTypesData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* Ratings over time */}
      <div className="card analytics-card full-width-card">
        <div className="card-title">Ratings over time</div>
        <div className="analytics-chart-wrap short-wrap">
          <Bar data={ratingCountsData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
