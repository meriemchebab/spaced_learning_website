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
  Filler,
  Legend
} from 'chart.js';
import './ForgettingCurveChart.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

// Decoupled presentation helper (FSRS visual math representation)
function calculateForgettingProbability(day, stability, difficulty) {
  const d = difficulty / 10;
  return Math.exp(-day / (stability * (1.5 - d * 0.8)));
}

export const ForgettingCurveChart = ({ initialStability, initialDifficulty }) => {
  const [stability, setStability] = useState(() => (
    Number.isFinite(initialStability) ? Math.max(1, Math.min(60, Math.round(initialStability))) : 14
  ));
  const [difficulty, setDifficulty] = useState(() => (
    Number.isFinite(initialDifficulty) ? Math.max(1, Math.min(10, Math.round(initialDifficulty))) : 5
  ));

  const days = Array.from({ length: 60 }, (_, i) => i);
  const probabilities = days.map(d => 
    Math.round(calculateForgettingProbability(d, stability, difficulty) * 100)
  );

  // Find day where retention falls below 85%
  const thresholdDay = days.find(d => probabilities[d] < 85) || 14;
  const optimalReviewDay = Math.round(stability * 0.63 * (1.2 - difficulty * 0.08));

  // Chart data setup
  const data = {
    labels: days,
    datasets: [
      {
        label: 'Retention Probability',
        data: probabilities,
        borderColor: '#5B4FD4',
        backgroundColor: 'rgba(91, 79, 212, 0.07)',
        fill: true,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.4,
      },
      {
        label: 'Optimal Review Point',
        data: days.map(d => d === thresholdDay ? probabilities[d] : null),
        borderColor: '#BE3A2A',
        pointStyle: 'circle',
        pointRadius: 6,
        pointBackgroundColor: '#BE3A2A',
        showLine: false,
      },
      {
        label: '85% Target Threshold',
        data: days.map(() => 85),
        borderColor: 'rgba(190, 58, 42, 0.3)',
        borderWidth: 1,
        borderDash: [4, 4],
        pointRadius: 0,
        fill: false,
      }
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.parsed.y}% recall`
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: {
          color: '#A09990',
          callback: (value) => value + '%'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.04)'
        }
      },
      x: {
        ticks: {
          color: '#A09990',
          callback: (value) => value % 10 === 0 ? value + 'd' : ''
        },
        grid: {
          display: false
        }
      }
    }
  };

  return (
    <div className="card curve-card">
      <div className="card-title curve-title">Forgetting Curve Simulator</div>
      <div className="curve-subtitle">
        Based on the Ebbinghaus model with stability factors. Drag sliders to see how memory decays differently.
      </div>
      
      <div className="fc-params">
        <div className="fc-param">
          <label>Stability (days)</label>
          <input 
            type="range" 
            min="1" 
            max="60" 
            value={stability} 
            onChange={(e) => setStability(parseInt(e.target.value))} 
            className="fc-slider"
          />
          <span className="fc-val">{stability}</span>
        </div>
        
        <div className="fc-param">
          <label>Difficulty</label>
          <input 
            type="range" 
            min="1" 
            max="10" 
            value={difficulty} 
            onChange={(e) => setDifficulty(parseInt(e.target.value))} 
            className="fc-slider"
          />
          <span className="fc-val">{difficulty}</span>
        </div>

        <div className="fc-param optimal-review-container">
          <span>Optimal review at</span>
          <span className="fc-val optimal-val">~{optimalReviewDay}d</span>
        </div>
      </div>

      <div className="curve-wrap">
        <Line data={data} options={options} />
      </div>
    </div>
  );
};

export default ForgettingCurveChart;
