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

export const LearningCurveChart = () => {
  const [period, setPeriod] = useState('30d');

  // Dummy / Scaffolded data generator for learning progress velocity
  const getDataForPeriod = (selectedPeriod) => {
    let daysCount = 30;
    if (selectedPeriod === '7d') daysCount = 7;
    if (selectedPeriod === '90d') daysCount = 90;

    const labels = [];
    const masteredData = [];
    const learningData = [];

    let currentMastered = 12;
    let currentLearning = 5;

    for (let i = daysCount; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(`${d.getMonth() + 1}/${d.getDate()}`);

      currentMastered += Math.floor(Math.random() * 3);
      currentLearning += Math.floor(Math.random() * 2);

      masteredData.push(currentMastered);
      learningData.push(currentLearning);
    }

    return { labels, masteredData, learningData };
  };

  const { labels, masteredData, learningData } = getDataForPeriod(period);

  const totalMastered = masteredData[masteredData.length - 1] || 0;
  const totalLearning = learningData[learningData.length - 1] || 0;
  const totalVelocity = Math.round((totalMastered / (labels.length || 1)) * 10) / 10;

  const data = {
    labels,
    datasets: [
      {
        label: 'Mastered Cards',
        data: masteredData,
        borderColor: '#1D9E75',
        backgroundColor: 'rgba(29, 158, 117, 0.1)',
        fill: true,
        borderWidth: 2,
        tension: 0.35,
        pointRadius: labels.length > 30 ? 0 : 3,
        pointHoverRadius: 5
      },
      {
        label: 'Cards In Progress',
        data: learningData,
        borderColor: '#378ADD',
        backgroundColor: 'rgba(55, 138, 221, 0.05)',
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
          color: '#A09990',
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
          color: '#A09990',
          stepSize: 5
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        }
      },
      x: {
        ticks: {
          color: '#A09990',
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
          <span className="lc-metric-label">Total Mastered</span>
          <span className="lc-metric-val" style={{ color: 'var(--green)' }}>{totalMastered}</span>
          <span className="lc-metric-sub">retention &gt; 85%</span>
        </div>
        <div className="lc-metric-tile">
          <span className="lc-metric-label">In Progress</span>
          <span className="lc-metric-val" style={{ color: 'var(--blue)' }}>{totalLearning}</span>
          <span className="lc-metric-sub">active recall interval</span>
        </div>
        <div className="lc-metric-tile">
          <span className="lc-metric-label">Study Velocity</span>
          <span className="lc-metric-val" style={{ color: 'var(--purple)' }}>{totalVelocity}/d</span>
          <span className="lc-metric-sub">new concepts/day</span>
        </div>
      </div>

      <div className="lc-chart-container">
        <Line data={data} options={options} />
      </div>
    </div>
  );
};

export default LearningCurveChart;
