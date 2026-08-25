# Spaced Learning Platform

> A modern spaced repetition platform powered by the **FSRS : <a href="https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler">Free Spaced Repetition Scheduler algorithm</a>** algorithm. Built to optimize active recall, track reviews, and provide actionable learning analytics.

![Status: Work in Progress](https://img.shields.io/badge/Status-Work_in_Progress-orange)

## Features

- **Optimized Retention:** Integrates the FSRS algorithm (enhanced by deep learning concepts) to accurately track memory states and calculate optimal review intervals.
- **Robust API:** A comprehensive Django REST backend managing flashcards, topics, study sessions, and user analytics.
- **Interactive Study UI:** A fast, responsive frontend built with React and Vite, featuring study dashboards and visual learning charts.
- **Secure Authentication:** JWT-based authentication with properly configured CORS for seamless local development and secure client-server communication.

## Tech Stack

**Backend**
- Python, Django, Django REST Framework
- SimpleJWT (Authentication)
- FSRS (Spaced Repetition Algorithm)
- SQLite (Local Database)

**Frontend**
- React, Vite
- Chart.js (Data Visualization)

## Project Structure

```text
.
├── Backend/      # Django API, business logic, and memory scheduling
├── Frontend/     # React SPA, UI components, and state management
└── test/         # Project-level testing assets and configurations

