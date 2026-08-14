# Spaced Learning Website

A work-in-progress spaced repetition platform for students, built to support active recall, review tracking, and learning analytics.

## What it includes

- Django backend for flashcards, topics, reviews, and analytics
- React + Vite frontend for the study experience and dashboard UI
- JWT-based auth and CORS setup for local frontend-backend development

## Tech Stack

- Backend: Django, Django REST Framework, SimpleJWT
- Frontend: React, Vite, Chart.js
- Database: SQLite for local development

## Project Structure

- `Backend/` Django API and app logic
- `Frontend/` React app and UI components
- `test/` project-level test assets

## Local Setup

Backend:

```bash
cd Backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Frontend:

```bash
cd Frontend
npm install
npm run dev
```

## Notes

- This project is still being actively built.
- Some features and pages may be incomplete or under refinement.
