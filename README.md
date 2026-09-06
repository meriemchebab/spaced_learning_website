# Spaced Repetition Platform

A flashcard-based learning app powered by the [FSRS algorithm](https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler) ,it predicts the optimal time to review the matrial and schedules the card dates for optimal retantion based on how did the user rate the giving card.

The app uses both the FSRS scheduler and its deep learning optimizer to adapt to each user's memory patterns.

## Tech Stack

- **Frontend:** React 19, Vite 8, Chart.js
- **Backend:** Django 6.0, Django REST Framework
- **Algorithm:** py-fsrs (FSRS v5)
- **Auth:** JWT (SimpleJWT)
- **Database:** SQLite
- **Testing:** Vitest, Django TestCase


---



## Core Algorithm — FSRS (Free Spaced Repetition Scheduler)

The FSRS algorithm is a **machine-learning-based memory model** that replaces traditional SM-2 style heuristics with a mathematically rigorous approach:

| Concept | Description |
|---|---|
| **Stability (S)** | The number of days after which retrievability drops to 90%. Trained via gradient descent. |
| **Difficulty (D)** | A per-card difficulty score (1–4) that influences how quickly stability grows. |
| **Retrievability (R)** | The probability of successful recall at time *t*: `R(t, S) = (1 + 0.9803 × t/S)^(-0.1542)` |
| **State Machine** | Cards transition through `Learning → Review → Relearning` based on ratings and lapse detection. |
| **21 Parameters** | Model weights optimized on large-scale review datasets using stochastic gradient descent. |
| **Target Retention** | Configurable per-user (default 90%). The scheduler solves for the interval where R = target. |


---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/cards/` | List cards (with filters: topic, type, date, exam, difficulty) or create a new card |
| `GET/PUT/DELETE` | `/api/cards/<id>` | Retrieve, update, or delete a specific card |
| `POST` | `/api/cards/<id>/ratings/<rating>/<duration_ms>/` | Submit a review — triggers FSRS recalculation and logs the review |
| `GET` | `/api/cards/today/` | Get all cards due for review today |
| `GET/POST` | `/api/topics/` | List or create topic decks |
| `GET` | `/api/exams/` | List exams with associated topics |
| `GET` | `/api/analytics/` | Computed analytics: retention rate, cards studied, upcoming workload |
| `POST` | `/api/token` | Obtain JWT access + refresh token pair |
| `POST` | `/api/token/refresh` | Refresh an expired access token |

---

## Project Structure

```text
spaced_learning_website/
├── Backend/
│   ├── config/              # Django settings, URL routing, WSGI/ASGI
│   ├── card/
│   │   ├── models.py        # Data models: Card, Topic, ReviewLog, Exam, Scheduler_settings
│   │   ├── views.py         # API views: CRUD, FSRS review flow, analytics engine
│   │   ├── serializers.py   # DRF serializers for JSON serialization
│   │   └── tests.py         # Backend test suite
│   └── manage.py
│
├── Frontend/
│   ├── src/
│   │   ├── App.jsx          # Main app with routing and state management
│   │   ├── components/      # Reusable UI components
│   │   ├── views/           # Page-level views (Dashboard, Study, Analytics)
│   │   ├── services/        # API client layer
│   │   └── styles/          # CSS modules and design tokens
│   ├── package.json
│   └── vite.config.js
│
├── assets/                  # Project screenshots and documentation media
└── test/                    # Project-level test configurations
```
### Prerequisites

  

- Python 3.12+

- Node.js 20+

- npm 10+

  

### Backend Setup

  

```bash

cd Backend

python -m venv .venv

.venv\Scripts\activate        # Windows

source .venv/bin/activate     # macOS/Linux

pip install -r requirements.txt

python manage.py migrate

python manage.py runserver

```

  

### Frontend Setup

  

```bash

cd Frontend

npm install

npm run dev

```

  

---

## License

[MIT](LICENSE)
