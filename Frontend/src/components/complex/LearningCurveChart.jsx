import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import './LearningCurveChart.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const getThemeColor = (varName) => {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
};

export const LearningCurveChart = ({ curve = [] }) => {
  const [period, setPeriod] = useState('30d');

  const getDataForPeriod = (selectedPeriod) => {
    let daysCount = 30;
    if (selectedPeriod === '7d') daysCount = 7;
    if (selectedPeriod === '90d') daysCount = 90;

    const points = curve.slice(-daysCount);
    return {
      labels: points.map(point => {
        const date = new Date(`${point.date}T00:00:00`);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      reviewedData: points.map(point => point.reviewed_cards || 0),
      learningData: points.map(point => point.in_progress || 0),
      reviewCount: points.reduce((total, point) => total + (point.reviews || 0), 0)
    };
  };

  const { labels, reviewedData, learningData, reviewCount } = getDataForPeriod(period);

  const totalReviewed = reviewedData[reviewedData.length - 1] || 0;
  const totalLearning = learningData[learningData.length - 1] || 0;
  const totalVelocity = Math.round((reviewCount / (labels.length || 1)) * 10) / 10;

  const data = {
    labels,
    datasets: [
      {
        label: 'Cards Reviewed',
        data: reviewedData,
        borderColor: getThemeColor('--green'),
        backgroundColor: `${getThemeColor('--green')}1A`,
        fill: true,
        borderWidth: 2,
        tension: 0.35,
        pointRadius: labels.length > 30 ? 0 : 3,
        pointHoverRadius: 5
      },
      {
        label: 'Cards In Progress',
        data: learningData,
        borderColor: getThemeColor('--blue'),
        backgroundColor: `${getThemeColor('--blue')}0D`,
        fill: true,
        borderWidth: 2,
        tension: 0.35,
        borderDash: [4, 4],
        pointRadius: 0
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          color: getThemeColor('--text3'),
          boxWidth: 12,
          font: { size: 11 }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.parsed.y} cards`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: getThemeColor('--text3'),
          stepSize: 5
        },
        grid: {
          color: `${getThemeColor('--border')}`
        }
      },
      x: {
        ticks: {
          color: getThemeColor('--text3'),
          maxTicksLimit: 8
        },
        grid: {
          display: false
        }
      }
    }
  };

  return (
    <div className="card learning-curve-card">
      <div className="lc-header">
        <div>
          <div className="card-title">Learning & Cumulative Growth Curve</div>
          <div className="curve-subtitle">
            Tracks total mastered cards and learning velocity over time
          </div>
        </div>

        <div className="lc-time-pills">
          <button
            className={`lc-pill ${period === '7d' ? 'active' : ''}`}
            onClick={() => setPeriod('7d')}
          >
            7d
          </button>
          <button
            className={`lc-pill ${period === '30d' ? 'active' : ''}`}
            onClick={() => setPeriod('30d')}
          >
            30d
          </button>
          <button
            className={`lc-pill ${period === '90d' ? 'active' : ''}`}
            onClick={() => setPeriod('90d')}
          >
            90d
          </button>
        </div>
      </div>

      <div className="lc-metrics-grid">
        <div className="lc-metric-tile">
          <span className="lc-metric-label">Cards Reviewed</span>
          <span className="lc-metric-val" style={{ color: 'var(--green)' }}>{totalReviewed}</span>
          <span className="lc-metric-sub">unique cards reviewed</span>
        </div>
        <div className="lc-metric-tile">
          <span className="lc-metric-label">In Progress</span>
          <span className="lc-metric-val" style={{ color: 'var(--blue)' }}>{totalLearning}</span>
          <span className="lc-metric-sub">active recall interval</span>
        </div>
        <div className="lc-metric-tile">
          <span className="lc-metric-label">Study Velocity</span>
          <span className="lc-metric-val" style={{ color: 'var(--purple)' }}>{totalVelocity}/d</span>
          <span className="lc-metric-sub">reviews per day</span>
        </div>
      </div>

      <div className="lc-chart-container">
        <Line data={data} options={options} />
      </div>
    </div>
  );
};

export default LearningCurveChart;
