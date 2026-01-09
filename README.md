# SkyLy - Modern Air Quality Monitoring Platform

A responsive, modern web application for monitoring air quality with real-time data, health insights, and predictive analytics.

## Features

- **Real-time AQI Monitoring**: Live air quality data from trusted sources
- **Modern UI/UX**: Clean, minimal design with dark/light mode support
- **Health Recommendations**: Personalized health advice based on AQI levels
- **Interactive Charts**: Trend visualization using Recharts
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **FastAPI Backend**: Scalable Python backend with comprehensive APIs

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Recharts** - Data visualization
- **Lucide React** - Modern icons
- **next-themes** - Theme switching

### Backend
- **FastAPI** - High-performance Python web framework
- **Uvicorn** - ASGI server
- **Pandas** - Data processing
- **WAQI API** - Air quality data source

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.8+
- npm or yarn

### Installation

1. **Clone and setup backend:**
   ```bash
   cd Backend
   pip install -r ../requirements.txt
   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Setup frontend:**
   ```bash
   cd frontend-new
   npm install
   npm run dev
   ```

3. **Open your browser:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

## Project Structure

```
frontend-new/
├── src/
│   ├── app/                 # Next.js app router pages
│   │   ├── layout.tsx      # Root layout with theme provider
│   │   ├── page.tsx        # Dashboard/home page
│   │   ├── search/         # City search page
│   │   ├── insights/       # Health insights page
│   │   └── about/          # About page
│   ├── components/         # Reusable React components
│   │   ├── ui/            # UI components (Button, Card, etc.)
│   │   ├── navigation.tsx # Sticky navigation bar
│   │   ├── hero-section.tsx
│   │   ├── pollutant-cards.tsx
│   │   ├── aqi-trend-chart.tsx
│   │   └── health-recommendations.tsx
│   ├── lib/               # Utilities
│   └── types/             # TypeScript type definitions
Backend/
├── main.py                # FastAPI application
├── auth.py               # Authentication module
└── Dataset/              # Air quality datasets
```

## Key Components

### Navigation
Sticky navigation bar with:
- Logo and branding
- Dashboard, City Search, Health Insights, About links
- Dark/Light mode toggle

### Hero Section
Displays current AQI with:
- AQI value and category badge
- Location and last updated time
- City selection dropdown

### Pollutant Cards
Visual breakdown of air pollutants:
- PM2.5, PM10, NO₂, SO₂, CO, O₃
- Color-coded status indicators
- Real-time values

### AQI Trend Chart
7-day trend visualization using Recharts with:
- Interactive tooltips
- Responsive design
- Clean data presentation

### Health Recommendations
Contextual health advice based on AQI levels:
- Actionable recommendations
- Risk category explanations
- Target audience guidance

## Design Principles

- **Minimal & Clean**: Soft neutral palette, ample white space
- **Scannable**: Information hierarchy optimized for quick comprehension
- **Accessible**: Proper contrast ratios, semantic HTML
- **Performant**: Optimized bundle size, efficient rendering
- **Responsive**: Mobile-first approach with progressive enhancement

## API Endpoints

### Core Endpoints
- `GET /live/aqi?city={city}` - Real-time AQI data
- `GET /cities` - Available cities list
- `GET /analytics` - Analytics data
- `GET /predict` - Prediction data

### Authentication (Future)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Current user info

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- WAQI (World Air Quality Index) for air quality data
- Open-Meteo for additional air quality APIs
- The open-source community for amazing tools and libraries
