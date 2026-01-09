from fastapi import FastAPI, HTTPException, Body, Depends
from fastapi.middleware.cors import CORSMiddleware
import requests
import pandas as pd
from pathlib import Path
from pydantic import BaseModel, EmailStr
from typing import Optional, Literal, List, Dict
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
import io
import base64
from datetime import datetime, timedelta
import numpy as np
from concurrent.futures import ThreadPoolExecutor, as_completed

# Import authentication module
from auth import (
    UserRegister, UserLogin, Token, UserProfile,
    create_access_token, get_current_user, get_current_user_optional,
    verify_password, get_user_by_email, create_user,
    get_user_favorites, add_favorite_city, remove_favorite_city
)

# ---------------- APP CONFIGURATION ----------------
app = FastAPI(title="Air Quality Intelligence API")

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],          # Allows all methods
    allow_headers=["*"],          # Allows all headers
)

# ---------------- CONSTANTS ----------------
# Note: In production, use environment variables for tokens
WAQI_TOKEN = "9fe0a55684bf08d8c8131b1cba6233542f86f55d"

# Open-Meteo Air Quality API base URL (no key for non-commercial) [web:449][web:538]
OPEN_METEO_AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"

# Basic per-request set of hourly variables we want (max useful set) [web:449][web:485]
OPEN_METEO_HOURLY_VARS = (
    "pm10,pm2_5,dust,"
    "carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,"
    "us_aqi,european_aqi"
)

# Path configuration
BASE_DIR = Path(__file__).parent
CSV_PATH = BASE_DIR / "Dataset" / "aqi_timeseries.csv"

# ---------------- LOAD DATA ----------------
# Ensure the Dataset folder and csv exist relative to this script
if not CSV_PATH.exists():
    print(f"⚠ WARNING: CSV NOT FOUND at {CSV_PATH}. Analytics endpoints will fail.")
    df = pd.DataFrame(columns=["city", "aqi", "date"])  # Empty fallback
else:
    try:
        df = pd.read_csv(CSV_PATH, encoding="utf-8-sig")


        # Clean column names
        df.columns = [c.strip().lower().replace("\ufeff", "") for c in df.columns]

        # Standard column names
        CITY_COL = "city"
        AQI_COL = "aqi"
        DATE_COL = "date"

        # Convert date column
        df[DATE_COL] = pd.to_datetime(df[DATE_COL], dayfirst=True, errors="coerce")
        df = df.dropna(subset=[DATE_COL])

        print("✅ Data loaded successfully.")
    except Exception as e:
        print(f"❌ Error loading CSV: {e}")
        df = pd.DataFrame(columns=["city", "aqi", "date"])

# ---------------- INDIAN CITIES (FOR SATELLITE MAP) ----------------
# Same list as frontend (lat/lng) so /satellite/map can return all cities

INDIAN_CITIES = [
    {"name": "Delhi", "lat": 28.6139, "lng": 77.2090},
    {"name": "Mumbai", "lat": 19.0760, "lng": 72.8777},
    {"name": "Bangalore", "lat": 12.9716, "lng": 77.5946},
    {"name": "Chennai", "lat": 13.0827, "lng": 80.2707},
    {"name": "Kolkata", "lat": 22.5726, "lng": 88.3639},
    {"name": "Hyderabad", "lat": 17.3850, "lng": 78.4867},
    {"name": "Pune", "lat": 18.5204, "lng": 73.8567},
    {"name": "Ahmedabad", "lat": 23.0225, "lng": 72.5714},
    {"name": "Jaipur", "lat": 26.9124, "lng": 75.7873},
    {"name": "Lucknow", "lat": 26.8467, "lng": 80.9462},
    {"name": "Kanpur", "lat": 26.4499, "lng": 80.3319},
    {"name": "Nagpur", "lat": 21.1458, "lng": 79.0882},
    {"name": "Indore", "lat": 22.7196, "lng": 75.8577},
    {"name": "Bhopal", "lat": 23.2599, "lng": 77.4126},
    {"name": "Patna", "lat": 25.5941, "lng": 85.1376},
    {"name": "Ranchi", "lat": 23.3441, "lng": 85.3096},
    {"name": "Gurugram", "lat": 28.4595, "lng": 77.0266},
    {"name": "Noida", "lat": 28.5355, "lng": 77.3910},
    {"name": "Faridabad", "lat": 28.4089, "lng": 77.3178},
    {"name": "Ghaziabad", "lat": 28.6692, "lng": 77.4538},
    {"name": "Meerut", "lat": 28.9845, "lng": 77.7064},
    {"name": "Agra", "lat": 27.1767, "lng": 78.0081},
    {"name": "Varanasi", "lat": 25.3176, "lng": 82.9739},
    {"name": "Prayagraj", "lat": 25.4358, "lng": 81.8463},
    {"name": "Amritsar", "lat": 31.6340, "lng": 74.8723},
    {"name": "Ludhiana", "lat": 30.9010, "lng": 75.8573},
    {"name": "Jalandhar", "lat": 31.3260, "lng": 75.5762},
    {"name": "Chandigarh", "lat": 30.7333, "lng": 76.7794},
    {"name": "Dehradun", "lat": 30.3165, "lng": 78.0322},
    {"name": "Roorkee", "lat": 29.8543, "lng": 77.8880},
    {"name": "Shimla", "lat": 31.1048, "lng": 77.1734},
    {"name": "Srinagar", "lat": 34.0837, "lng": 74.7973},
    {"name": "Jammu", "lat": 32.7266, "lng": 74.8570},
    {"name": "Udaipur", "lat": 24.5854, "lng": 73.7125},
    {"name": "Jodhpur", "lat": 26.2389, "lng": 73.0243},
    {"name": "Kota", "lat": 25.2138, "lng": 75.8648},
    {"name": "Rajkot", "lat": 22.3039, "lng": 70.8022},
    {"name": "Vadodara", "lat": 22.3072, "lng": 73.1812},
    {"name": "Surat", "lat": 21.1702, "lng": 72.8311},
    {"name": "Vapi", "lat": 20.3717, "lng": 72.9049},
    {"name": "Nashik", "lat": 19.9975, "lng": 73.7898},
    {"name": "Aurangabad", "lat": 19.8762, "lng": 75.3433},
    {"name": "Solapur", "lat": 17.6599, "lng": 75.9064},
    {"name": "Kolhapur", "lat": 16.7050, "lng": 74.2433},
    {"name": "Coimbatore", "lat": 11.0168, "lng": 76.9558},
    {"name": "Madurai", "lat": 9.9252, "lng": 78.1198},
    {"name": "Tiruchirappalli", "lat": 10.7905, "lng": 78.7047},
    {"name": "Salem", "lat": 11.6643, "lng": 78.1460},
    {"name": "Vellore", "lat": 12.9165, "lng": 79.1325},
    {"name": "Erode", "lat": 11.3410, "lng": 77.7172},
    {"name": "Visakhapatnam", "lat": 17.6868, "lng": 83.2185},
    {"name": "Vijayawada", "lat": 16.5062, "lng": 80.6480},
    {"name": "Guntur", "lat": 16.3067, "lng": 80.4365},
    {"name": "Rajahmundry", "lat": 17.0005, "lng": 81.8040},
    {"name": "Tirupati", "lat": 13.6288, "lng": 79.4192},
    {"name": "Bhubaneswar", "lat": 20.2961, "lng": 85.8245},
    {"name": "Cuttack", "lat": 20.4625, "lng": 85.8828},
    {"name": "Rourkela", "lat": 22.2604, "lng": 84.8536},
    {"name": "Durgapur", "lat": 23.5204, "lng": 87.3119},
    {"name": "Asansol", "lat": 23.6739, "lng": 86.9524},
    {"name": "Siliguri", "lat": 26.7271, "lng": 88.3953},
    {"name": "Guwahati", "lat": 26.1445, "lng": 91.7362},
    {"name": "Shillong", "lat": 25.5788, "lng": 91.8933},
]

# ---------------- HELPER FUNCTIONS ----------------

def fetch_aqi_waqi(city: str) -> dict:
    """
    Helper function to fetch AQI data from WAQI API.
    Returns dict with 'aqi', 'category', 'city' keys.
    Raises exception if request fails.
    """
    url = f"https://api.waqi.info/feed/{city}/"
    res = requests.get(url, params={"token": WAQI_TOKEN}, timeout=10)
    data = res.json()
    
    if data.get("status") != "ok":
        raise HTTPException(status_code=404, detail="City not found")
    
    aqi_value = data["data"].get("aqi", "-")
    
    # Determine category
    if aqi_value == "-" or not isinstance(aqi_value, (int, float)):
        category = "Unknown"
    elif aqi_value <= 50:
        category = "Good"
    elif aqi_value <= 100:
        category = "Moderate"
    elif aqi_value <= 150:
        category = "Unhealthy for Sensitive Groups"
    elif aqi_value <= 200:
        category = "Unhealthy"
    elif aqi_value <= 300:
        category = "Very Unhealthy"
    else:
        category = "Hazardous"
    
    return {
        "aqi": aqi_value,
        "category": category,
        "city": data["data"].get("city", {}).get("name", city),
        "time": data["data"].get("time", {}).get("s", "N/A")
    }

# ---------------- ORIGINAL ROUTES ----------------


@app.get("/")
def root():
    return {"status": "API running successfully", "version": "1.0.0"}


# -------- CITIES LIST --------
@app.get("/cities")
def get_cities():
    if df.empty:
        return []
    return sorted(df["city"].dropna().unique().tolist())


@app.get("/cities/all")
def get_all_cities():
    """Return all unique cities from the CSV (no external calls)."""
    if df.empty:
        return {"cities": [], "count": 0}
    cities = sorted(df["city"].dropna().unique().tolist())

    # Attempt to map coordinates from INDIAN_CITIES if possible
    coords_map = {c["name"].lower(): (c["lat"], c["lng"]) for c in INDIAN_CITIES}
    result = []
    for name in cities:
        coord = coords_map.get(name.lower())
        item = {"name": name}
        if coord:
            item.update({"lat": coord[0], "lng": coord[1]})
        result.append(item)
    return {"cities": result, "count": len(result)}


@app.get("/cities/available")
def get_available_cities():
    """
    Return all cities from CSV, attempting a best-effort WAQI lookup for AQI values and coordinates if available.
    This will include cities even if WAQI or satellite data is unavailable; aqi will be null in that case.
    Uses concurrent requests to speed up WAQI lookups but does not fail the whole call if external requests fail.
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed
    import logging

    if df.empty:
        return {"cities": [], "count": 0}

    # Use only the predefined INDIAN_CITIES for map and ranking (ensures coords are available)
    csv_cities = [c["name"] for c in INDIAN_CITIES]

    # Map coords from INDIAN_CITIES (ensures coords for those known cities)
    coords_map = {c["name"].lower(): (c["lat"], c["lng"]) for c in INDIAN_CITIES}

    def fetch_city_info(name: str):
        info: Dict = {"name": name, "lat": None, "lng": None, "aqi": None}
        try:
            coord = coords_map.get(name.lower())
            if coord:
                info["lat"], info["lng"] = coord

            # Try to fetch WAQI AQI for the city with a small timeout
            url = f"https://api.waqi.info/feed/{name}/"
            try:
                res = requests.get(url, params={"token": WAQI_TOKEN}, timeout=3)
                data = res.json()
                if data.get("status") == "ok":
                    aqi_value = data.get("data", {}).get("aqi")
                    if aqi_value not in ["-", None, ""]:
                        try:
                            info["aqi"] = float(aqi_value)
                        except (ValueError, TypeError):
                            info["aqi"] = None
            except requests.RequestException:
                # Non-fatal: leave aqi as None when WAQI lookup fails
                pass
        except Exception as e:
            logging.debug(f"Error preparing city {name}: {e}")
        return info

    results = []
    with ThreadPoolExecutor(max_workers=15) as executor:
        futures = [executor.submit(fetch_city_info, name) for name in csv_cities]
        for future in as_completed(futures):
            res = future.result()
            if res:
                results.append(res)

    # Keep only cities for which WAQI lookup returned a numeric AQI (exclude None)
    results = [r for r in results if r.get("aqi") is not None]

    # Sort by AQI descending
    results.sort(key=lambda x: x["aqi"], reverse=True)

    return {"cities": results, "count": len(results)}


# -------- LIVE AQI (GROUND) --------
@app.get("/live/aqi")
def get_live_aqi(city: str):
    """
    Fetches real-time AQI from WAQI API (ground data).
    """
    if not city:
        raise HTTPException(status_code=400, detail="City name is required")

    url = f"https://api.waqi.info/feed/{city}/"
    try:
        res = requests.get(url, params={"token": WAQI_TOKEN}, timeout=10)
        data = res.json()
    except requests.RequestException:
        raise HTTPException(status_code=503, detail="External API unavailable")

    if data.get("status") != "ok":
        raise HTTPException(status_code=404, detail="City not found or data unavailable")

    d = data["data"]

    # By default use the city feed values
    result_city = {
        "city": d.get("city", {}).get("name", city),
        "aqi": d.get("aqi", "-"),
        "dominant_pollutant": d.get("dominentpol", "N/A"),
        "components": d.get("iaqi", {}),
        "time": d.get("time", {}).get("s", "N/A"),
    }

    # Try to fetch the highest-AQI station feed for the city and prefer its timestamp/components
    try:
        search_url = "https://api.waqi.info/search/"
        search_res = requests.get(search_url, params={"token": WAQI_TOKEN, "keyword": city}, timeout=8)
        search_data = search_res.json()
        stations = search_data.get("data", []) if isinstance(search_data, dict) else []
        # pick station with highest numeric aqi
        max_station = None
        for s in stations:
            aqi_raw = s.get("aqi", "-")
            try:
                aqi_val = float(aqi_raw) if aqi_raw != "-" else -1
            except (ValueError, TypeError):
                continue
            if aqi_val < 0:
                continue
            if not max_station or aqi_val > max_station.get("_aqi_val", -1):
                s["_aqi_val"] = aqi_val
                max_station = s

        if max_station and max_station.get("uid"):
            uid = max_station.get("uid")
            feed_url = f"https://api.waqi.info/feed/@{uid}/"
            try:
                feed_res = requests.get(feed_url, params={"token": WAQI_TOKEN}, timeout=3)
                feed_data = feed_res.json()
                if feed_data.get("status") == "ok" and feed_data.get("data"):
                    fd = feed_data.get("data")
                    # Prefer station feed values (components/time/aqi)
                    result_city["aqi"] = fd.get("aqi", result_city["aqi"])
                    result_city["components"] = fd.get("iaqi", result_city["components"])
                    # feed time format may vary, try common keys
                    result_city["time"] = fd.get("time", {}).get("s") or fd.get("time", {}).get("stime") or result_city["time"]
                    # use station's city name if available
                    result_city["city"] = fd.get("city", {}).get("name", result_city["city"])
            except requests.RequestException:
                pass
    except requests.RequestException:
        pass

    return result_city


@app.get("/live/aqi/stations")
def get_city_stations(city: str):
    """
    Fetches all monitoring stations in a city with their AQI data.
    Searches for all stations containing the city name.
    """
    if not city:
        raise HTTPException(status_code=400, detail="City name is required")

    # For major cities, search multiple keywords to get comprehensive results
    search_keywords = [city]
    city_lower = city.lower()
    
    # Add additional search terms for major cities to get more stations
    if city_lower == "mumbai":
        search_keywords.extend(["Bombay", "Navi Mumbai", "Thane"])
    elif city_lower == "delhi":
        search_keywords.extend(["New Delhi", "NCR"])
    elif city_lower == "bangalore" or city_lower == "bengaluru":
        search_keywords.extend(["Bangalore", "Bengaluru"])
    
    all_stations_raw = []
    
    # Search with each keyword
    for keyword in search_keywords:
        search_url = f"https://api.waqi.info/search/"
        try:
            search_res = requests.get(search_url, params={"token": WAQI_TOKEN, "keyword": keyword}, timeout=10)
            search_data = search_res.json()
            print(f"Search for '{keyword}' returned {len(search_data.get('data', []))} results")
        except requests.RequestException:
            continue

        if search_data.get("status") == "ok":
            all_stations_raw.extend(search_data.get("data", []))
    
    print(f"Total raw stations before filtering: {len(all_stations_raw)}")
    
    if not all_stations_raw:
        raise HTTPException(status_code=503, detail="External API unavailable")
    if not all_stations_raw:
        raise HTTPException(status_code=503, detail="External API unavailable")
    
    # Filter stations that belong to the city (broader match for Mumbai)
    city_lower = city.lower()
    city_stations = []
    seen_uids = set()  # Deduplicate by UID
    
    # For Mumbai, accept stations with "mumbai", "bombay", or common Mumbai areas
    valid_indicators = [city_lower]
    if city_lower == "mumbai":
        valid_indicators.extend(["mumbai", "bombay", "navi mumbai", "thane"])
    
    for station in all_stations_raw:
        station_name = station.get("station", {}).get("name", "")
        station_name_lower = station_name.lower()
        uid = station.get("uid")
        
        # Skip duplicates
        if uid and uid in seen_uids:
            continue
        
        # Check if station matches any of the valid indicators
        is_match = any(indicator in station_name_lower for indicator in valid_indicators)
        
        if is_match:
            aqi_raw = station.get("aqi", "-")
            
            # Convert AQI to number (API returns it as string)
            try:
                aqi_value = float(aqi_raw) if aqi_raw != "-" else -1
            except (ValueError, TypeError):
                continue
            
            # Skip stations with invalid AQI data
            if aqi_value < 0:
                continue
            
            # Determine category and description
            if aqi_value <= 50:
                category = "Good"
                description = "Air quality is satisfactory, and air pollution poses little or no risk."
                label = "GOOD"
            elif aqi_value <= 100:
                category = "Moderate"
                description = "Air quality is acceptable. However, there may be a risk for some people."
                label = "MODERATE"
            elif aqi_value <= 150:
                category = "Unhealthy for Sensitive Groups"
                description = "Members of sensitive groups may experience health effects."
                label = "UNHEALTHY FOR SENSITIVE"
            elif aqi_value <= 200:
                category = "Unhealthy"
                description = "Everyone may begin to experience health effects. Sensitive groups at greater risk."
                label = "UNHEALTHY"
            elif aqi_value <= 300:
                category = "Very Unhealthy"
                description = "Health alert: everyone may experience more serious health effects."
                label = "VERY UNHEALTHY"
            else:
                category = "Hazardous"
                description = "Health warning of emergency conditions. The entire population is likely to be affected."
                label = "HAZARDOUS"
            
            # Store station with empty components initially (will populate for top stations later)
            city_stations.append({
                "station_name": station_name,
                "aqi": int(aqi_value),
                "category": category,
                "label": label,
                "description": description,
                "uid": station.get("uid"),
                "time": station.get("time", {}).get("stime", "N/A"),
                "components": {},
                "coordinates": {
                    "lat": station.get("station", {}).get("geo", [None, None])[0],
                    "lng": station.get("station", {}).get("geo", [None, None])[1]
                }
            })
            
            if uid:
                seen_uids.add(uid)
    
    # If we have coordinates for the city, filter stations by proximity
    city_info = _find_city_coords(city)
    if city_info:
        # Haversine distance (km)
        from math import radians, sin, cos, atan2, sqrt

        def haversine_km(lat1, lon1, lat2, lon2):
            R = 6371.0
            dlat = radians(lat2 - lat1)
            dlon = radians(lon2 - lon1)
            a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
            c = 2 * atan2(sqrt(a), sqrt(1 - a))
            return R * c

        # Default radius in km (tunable). Use smaller radius to avoid foreign matches.
        CITY_RADIUS_KM = 80
        filtered = []
        for s in city_stations:
            lat = s.get("coordinates", {}).get("lat")
            lng = s.get("coordinates", {}).get("lng")
            # skip stations without coordinates
            if lat is None or lng is None:
                continue
            try:
                dist = haversine_km(city_info["lat"], city_info["lng"], float(lat), float(lng))
            except Exception:
                continue
            if dist <= CITY_RADIUS_KM:
                filtered.append(s)

        city_stations = filtered

    if not city_stations:
        raise HTTPException(status_code=404, detail=f"No stations found for {city}")

    # Sort by AQI (highest first for default display)
    city_stations.sort(key=lambda x: x["aqi"], reverse=True)

    # Fetch full details only for top 10 stations concurrently (dramatic speed improvement)
    top_stations = city_stations[:10]
    
    def fetch_station_components(station):
        uid = station.get("uid")
        if not uid:
            return station
        try:
            feed_url = f"https://api.waqi.info/feed/@{uid}/"
            feed_res = requests.get(feed_url, params={"token": WAQI_TOKEN}, timeout=3)
            if feed_res.status_code == 200:
                feed_data = feed_res.json()
                if feed_data.get("status") == "ok" and feed_data.get("data"):
                    iaqi = feed_data["data"].get("iaqi", {})
                    components = {}
                    if "pm25" in iaqi:
                        components["pm25"] = iaqi["pm25"].get("v") if isinstance(iaqi["pm25"], dict) else iaqi["pm25"]
                    if "pm10" in iaqi:
                        components["pm10"] = iaqi["pm10"].get("v") if isinstance(iaqi["pm10"], dict) else iaqi["pm10"]
                    if "no2" in iaqi:
                        components["no2"] = iaqi["no2"].get("v") if isinstance(iaqi["no2"], dict) else iaqi["no2"]
                    if "o3" in iaqi:
                        components["o3"] = iaqi["o3"].get("v") if isinstance(iaqi["o3"], dict) else iaqi["o3"]
                    if "so2" in iaqi:
                        components["so2"] = iaqi["so2"].get("v") if isinstance(iaqi["so2"], dict) else iaqi["so2"]
                    if "co" in iaqi:
                        components["co"] = iaqi["co"].get("v") if isinstance(iaqi["co"], dict) else iaqi["co"]
                    station["components"] = components
        except requests.RequestException:
            pass
        return station

    # Use ThreadPoolExecutor for concurrent requests (max 5 parallel)
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(fetch_station_components, s): s for s in top_stations}
        for future in as_completed(futures):
            pass  # Results are updated in-place

    return {
        "city": city,
        "station_count": len(city_stations),
        "stations": city_stations
    }


# -------- ANALYTICS (HISTORICAL, GROUND) --------
@app.get("/analytics")
def get_analytics(city: str):
    """
    Returns all available AQI data for a specific city from the CSV (ground).
    Shows full historical series available in the CSV for that city.
    """
    if df.empty:
        raise HTTPException(status_code=500, detail="Historical data not loaded")

    sub = df[df["city"] == city].sort_values("date")

    if sub.empty:
        raise HTTPException(status_code=404, detail=f"No historical data found for {city}")

    return {
        "dates": sub["date"].astype(str).tolist(),
        "aqi": sub["aqi"].tolist(),
    }


# -------- COMPARE CITIES (GROUND) --------
@app.get("/compare")
def compare_cities(city1: str, city2: str):
    """
    Returns historical data for two cities for comparison (ground).
    """
    if df.empty:
        raise HTTPException(status_code=500, detail="Historical data not loaded")

    d1 = df[df["city"] == city1].sort_values("date").tail(365)
    d2 = df[df["city"] == city2].sort_values("date").tail(365)

    if d1.empty:
        raise HTTPException(status_code=404, detail=f"No data for {city1}")
    if d2.empty:
        raise HTTPException(status_code=404, detail=f"No data for {city2}")

    return {
        "city1": {
            "name": city1,
            "dates": d1["date"].astype(str).tolist(),
            "aqi": d1["aqi"].tolist(),
        },
        "city2": {
            "name": city2,
            "dates": d2["date"].astype(str).tolist(),
            "aqi": d2["aqi"].tolist(),
        },
    }


# -------- PREDICT AQI (ML Placeholder) --------
@app.get("/predict")
def predict_aqi(
    pm25: float,
    pm10: float,
    no2: float,
    so2: float,
    co: float,
    o3: float,
):
    """
    Predicts AQI based on input pollutants.
    Currently uses a weighted formula as a placeholder for the XGBoost model.
    """
    predicted_aqi = round(
        (pm25 * 0.4)
        + (pm10 * 0.2)
        + (no2 * 0.15)
        + (so2 * 0.1)
        + (co * 0.1)
        + (o3 * 0.05),
        2,
    )

    return {
        "predicted_aqi": int(predicted_aqi),
        "note": "Prediction based on weighted pollutant analysis (XGBoost integration pending)",
    }


# ---------------- SATELLITE / MODEL (OPEN-METEO) HELPERS ----------------


def _fetch_open_meteo_for_coords(lat: float, lng: float) -> Dict:
    """
    Call Open-Meteo Air Quality API for given coordinates and return the latest hour
    of all requested variables as a dict.
    [web:449][web:485][web:538]
    """
    params = {
        "latitude": lat,
        "longitude": lng,
        "hourly": OPEN_METEO_HOURLY_VARS,
        "timezone": "auto",
        # You can add past_days / forecast_days later if needed
    }

    try:
        resp = requests.get(OPEN_METEO_AIR_URL, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Satellite API unavailable: {e}")

    hourly = data.get("hourly") or {}
    times = hourly.get("time") or []
    if not times:
        raise HTTPException(status_code=404, detail="No satellite data available")

    # Use the last time index as "latest"
    idx = len(times) - 1

    def get_series_value(key: str):
        arr = hourly.get(key)
        if not arr or len(arr) <= idx:
            return None
        val = arr[idx]
        # Log what we're getting
        print(f"  {key}: {val}")
        return val

    latest_time = times[idx]
    print(f"Fetching Open-Meteo data for coords ({lat}, {lng})")
    print(f"  Latest time: {latest_time}")
    print(f"  Total time points: {len(times)}")

    # Attempt to fetch current weather (temperature and wind) from Open-Meteo forecast
    weather = {}
    try:
        weather_resp = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lng,
                "current_weather": True,
            },
            timeout=5,
        )
        weather_resp.raise_for_status()
        weather_data = weather_resp.json()
        cw = weather_data.get("current_weather", {})
        weather = {
            "temperature": cw.get("temperature"),
            "wind_speed": cw.get("windspeed"),
            "wind_dir": cw.get("winddirection"),
        }
    except requests.RequestException:
        # Non-fatal: if weather fetch fails, continue without weather
        weather = {}

    return {
        "time": latest_time,
        "pm10": get_series_value("pm10"),
        "pm2_5": get_series_value("pm2_5"),
        "dust": get_series_value("dust"),
        "carbon_monoxide": get_series_value("carbon_monoxide"),
        "nitrogen_dioxide": get_series_value("nitrogen_dioxide"),
        "sulphur_dioxide": get_series_value("sulphur_dioxide"),
        "ozone": get_series_value("ozone"),
        "us_aqi": get_series_value("us_aqi"),
        "european_aqi": get_series_value("european_aqi"),
        **weather,
    }


def _find_city_coords(city: str) -> Optional[Dict]:
    """
    Find coordinates for a city name from INDIAN_CITIES list.
    Simple case-insensitive match.
    """
    name_lower = city.strip().lower()
    for c in INDIAN_CITIES:
        if c["name"].lower() == name_lower:
            return c
    return None


# ---------------- SATELLITE / MODEL ENDPOINTS ----------------


@app.get("/satellite/live")
def satellite_live(city: str):
    """
    Satellite/model-based aerosol & pollutant data for a specific city,
    using Open-Meteo (dust, PM, gases, US/EU AQI). [web:449][web:485]
    """
    if not city:
        raise HTTPException(status_code=400, detail="City name is required")

    city_info = _find_city_coords(city)
    if not city_info:
        raise HTTPException(status_code=404, detail=f"City '{city}' not in satellite city list")

    result = _fetch_open_meteo_for_coords(city_info["lat"], city_info["lng"])

    return {
        "city": city_info["name"],
        "lat": city_info["lat"],
        "lng": city_info["lng"],
        **result,
    }


@app.get("/satellite/map")
def satellite_map():
    """
    Satellite/model-based data for all configured Indian cities,
    for use on the satellite/AOD map. [web:449][web:485]
    """
    output = []
    for c in INDIAN_CITIES:
        try:
            r = _fetch_open_meteo_for_coords(c["lat"], c["lng"])
            item = {
                "city": c["name"],
                "lat": c["lat"],
                "lng": c["lng"],
                **r,
            }
            output.append(item)
        except HTTPException:
            # Skip city if satellite data unavailable; do not crash entire map
            continue

    if not output:
        raise HTTPException(status_code=404, detail="No satellite data for any city")

    return output


# ---------------- NEW MODELS & STORAGE ----------------


class AlertRule(BaseModel):
    city: str
    threshold: float
    start: str              # "HH:MM"
    end: str                # "HH:MM"
    channel: Literal["browser", "email", "whatsapp", "telegram"]
    contact: Optional[str] = None


class ShareRequest(BaseModel):
    section: Literal["live", "ranking", "analytics", "compare", "predict"]
    payload: Dict           # Arbitrary dict from frontend
    channel: Literal["email", "whatsapp"]
    email: Optional[EmailStr] = None
    phone: Optional[str] = None


# Simple in-memory storage for alerts
ALERT_RULES: List[AlertRule] = []


# ---------------- NEW HELPERS (PDF + SENDING) ----------------


def build_pdf_from_section(section: str, payload: Dict) -> bytes:
    """
    Very simple PDF generator using ReportLab.
    Takes a section name and payload dict and returns PDF bytes.
    """
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    y = height - 50
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, y, f"AQI Report - {section.capitalize()}")
    y -= 40
    c.setFont("Helvetica", 11)

    def line(text: str):
        nonlocal y
        c.drawString(50, y, (text or "")[:120])
        y -= 18
        if y < 80:
            c.showPage()
            y = height - 50
            c.setFont("Helvetica", 11)

    # Very basic text layout per section; you can extend this later
    if section == "live":
        line(f"City: {payload.get('city')}")
        line(f"AQI: {payload.get('aqi')}")
        line(f"Category: {payload.get('category')}")
        line(f"Time: {payload.get('time')}")
        line(f"Dominant pollutant: {payload.get('dominant_pollutant')}")
    elif section == "ranking":
        line("City ranking (lower AQI = cleaner):")
        items = payload.get("items", [])
        for item in items[:50]:
            line(
                f"#{item.get('rank')} {item.get('city')} - "
                f"AQI {item.get('aqi')} ({item.get('category')})"
            )
    elif section == "analytics":
        line(f"City: {payload.get('city')}")
        line(f"Max AQI: {payload.get('max_aqi')}")
        line(f"Min AQI: {payload.get('min_aqi')}")
        line(f"Average AQI: {payload.get('avg_aqi')}")
        line(f"Peak date: {payload.get('max_date')}")
    elif section == "compare":
        c1 = payload.get("city1", {})
        c2 = payload.get("city2", {})
        line(f"{c1.get('name')} vs {c2.get('name')}")
        for key in ("avg", "max", "min"):
            v1 = c1.get(key)
            v2 = c2.get(key)
            line(
                f"{key.capitalize()} AQI - {c1.get('name')}: {v1}, "
                f"{c2.get('name')}: {v2}"
            )
    elif section == "predict":
        line(f"Predicted AQI: {payload.get('predicted_aqi')}")
        line(f"Category: {payload.get('category')}")
        line(f"Note: {payload.get('note')}")

    c.showPage()
    c.save()
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


def send_via_email(email: str, pdf_bytes: bytes, subject: str = "AQI Report"):
    """
    Placeholder for real email sending.
    Integrate with SMTP or email API here later. [web:537][web:539]
    """
    # TODO: implement real email sending (e.g., smtp, AWS SES, SendGrid)
    return


def send_via_whatsapp(phone: str, pdf_bytes: bytes):
    """
    Placeholder for real WhatsApp sending.
    Integrate with WhatsApp Cloud API / Vonage / Twilio later.
    """
    # TODO: implement WA API call here
    return


# ---------------- NEW ENDPOINTS (ALERTS & SHARE) ----------------


@app.post("/alerts")
def create_alert(rule: AlertRule):
    """
    Store an alert rule (server-side).
    Frontend can also keep localStorage rules for browser-only alerts.
    """
    ALERT_RULES.append(rule)
    return {"status": "ok", "count": len(ALERT_RULES)}


@app.get("/alerts")
def list_alerts():
    """
    Simple endpoint to inspect stored alerts (for debugging/demo).
    """
    return ALERT_RULES


@app.post("/share")
def share_report(req: ShareRequest = Body(...)):
    """
    Generate a PDF for a given section + payload and send via email/WhatsApp.
    Currently:
      - validates input
      - builds PDF
      - returns base64 of PDF for frontend testing
    You can later enable real email/WhatsApp sending in send_via_email/send_via_whatsapp.
    """
    if req.channel == "email" and not req.email:
        raise HTTPException(status_code=400, detail="Email is required for email channel")
    if req.channel == "whatsapp" and not req.phone:
        raise HTTPException(status_code=400, detail="Phone is required for WhatsApp channel")

    try:
        pdf_bytes = build_pdf_from_section(req.section, req.payload)

        # Call real senders here later if needed
        if req.channel == "email" and req.email:
            send_via_email(req.email, pdf_bytes)
        elif req.channel == "whatsapp" and req.phone:
            send_via_whatsapp(req.phone, pdf_bytes)

        pdf_b64 = base64.b64encode(pdf_bytes).decode("utf-8")
        return {
            "status": "ok",
            "channel": req.channel,
            "email": req.email,
            "phone": req.phone,
            "pdf_base64": pdf_b64,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")


# ==================== USER AUTHENTICATION ENDPOINTS ====================
@app.post("/api/auth/register", response_model=Token)
async def register(user_data: UserRegister):
    """Register a new user"""
    # Check if user already exists
    existing_user = get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Create user
    user_id = create_user(user_data.email, user_data.name, user_data.password)
    
    # Create access token
    access_token = create_access_token(data={"sub": user_data.email})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": user_data.email,
            "name": user_data.name
        }
    }


@app.post("/api/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    """Login user and return JWT token"""
    user = get_user_by_email(credentials.email)
    
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password"
        )
    
    access_token = create_access_token(data={"sub": user["email"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"]
        }
    }


@app.get("/api/auth/me", response_model=UserProfile)
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    favorites = get_user_favorites(current_user["id"])
    
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "name": current_user["name"],
        "created_at": current_user["created_at"],
        "favorite_cities": [f["city"] for f in favorites]
    }


@app.post("/api/favorites/{city_name}")
async def add_favorite(city_name: str, current_user: dict = Depends(get_current_user)):
    """Add city to user's favorites"""
    success = add_favorite_city(current_user["id"], city_name)
    if not success:
        raise HTTPException(status_code=400, detail="City already in favorites")
    
    return {"status": "success", "message": f"{city_name} added to favorites"}


@app.delete("/api/favorites/{city_name}")
async def remove_favorite(city_name: str, current_user: dict = Depends(get_current_user)):
    """Remove city from user's favorites"""
    remove_favorite_city(current_user["id"], city_name)
    return {"status": "success", "message": f"{city_name} removed from favorites"}


@app.get("/api/favorites")
async def get_favorites(current_user: dict = Depends(get_current_user)):
    """Get user's favorite cities with current AQI"""
    favorites = get_user_favorites(current_user["id"])
    
    # Fetch current AQI for each favorite city
    result = []
    for fav in favorites:
        try:
            city_data = fetch_aqi_waqi(fav["city"])
            result.append({
                "city": fav["city"],
                "aqi": city_data.get("aqi"),
                "added_at": fav["added_at"]
            })
        except:
            result.append({
                "city": fav["city"],
                "aqi": None,
                "added_at": fav["added_at"]
            })
    
    return {"favorites": result}


# ==================== HISTORICAL ANALYSIS ENDPOINTS ====================
@app.get("/api/historical/yearly-comparison/{city}")
async def get_yearly_comparison(city: str):
    """Get year-over-year AQI comparison for a city"""
    if df.empty:
        raise HTTPException(status_code=503, detail="Historical data not available")
    
    city_data = df[df['city'].str.lower() == city.lower()].copy()
    if city_data.empty:
        raise HTTPException(status_code=404, detail=f"No historical data for {city}")
    
    city_data['year'] = city_data['date'].dt.year
    city_data['month'] = city_data['date'].dt.month
    
    yearly_avg = city_data.groupby('year')['aqi'].mean().round(2).to_dict()
    monthly_comparison = city_data.groupby(['year', 'month'])['aqi'].mean().round(2).reset_index()
    
    return {
        "city": city,
        "yearly_averages": yearly_avg,
        "monthly_data": monthly_comparison.to_dict('records')
    }


@app.get("/api/historical/seasonal-trends/{city}")
async def get_seasonal_trends(city: str):
    """Get seasonal AQI trends for a city"""
    if df.empty:
        raise HTTPException(status_code=503, detail="Historical data not available")
    
    city_data = df[df['city'].str.lower() == city.lower()].copy()
    if city_data.empty:
        raise HTTPException(status_code=404, detail=f"No historical data for {city}")
    
    # Define seasons
    def get_season(month):
        if month in [12, 1, 2]: return "Winter"
        elif month in [3, 4, 5]: return "Spring"
        elif month in [6, 7, 8]: return "Summer"
        else: return "Autumn"
    
    city_data['season'] = city_data['date'].dt.month.apply(get_season)
    seasonal_avg = city_data.groupby('season')['aqi'].agg(['mean', 'min', 'max']).round(2).to_dict('index')
    
    return {
        "city": city,
        "seasonal_trends": seasonal_avg
    }


@app.get("/api/historical/best-worst-times/{city}")
async def get_best_worst_times(city: str):
    """Get best and worst times of year for air quality"""
    if df.empty:
        raise HTTPException(status_code=503, detail="Historical data not available")
    
    city_data = df[df['city'].str.lower() == city.lower()].copy()
    if city_data.empty:
        raise HTTPException(status_code=404, detail=f"No historical data for {city}")
    
    city_data['month'] = city_data['date'].dt.month
    city_data['month_name'] = city_data['date'].dt.strftime('%B')
    
    monthly_avg = city_data.groupby(['month', 'month_name'])['aqi'].mean().reset_index()
    monthly_avg = monthly_avg.sort_values('aqi')
    
    best_months = monthly_avg.head(3)[['month_name', 'aqi']].to_dict('records')
    worst_months = monthly_avg.tail(3)[['month_name', 'aqi']].to_dict('records')
    
    return {
        "city": city,
        "best_months": best_months,
        "worst_months": worst_months,
        "monthly_averages": monthly_avg[['month_name', 'aqi']].to_dict('records')
    }


# ==================== LOCATION-BASED SERVICES ====================
@app.get("/api/location/nearby-stations")
async def get_nearby_stations(lat: float, lng: float, radius_km: int = 20):
    """Find nearby air quality monitoring stations using WAQI's geo-location search"""
    try:
        # Use WAQI's map bounds API to find stations within radius
        # Calculate bounding box
        lat_offset = radius_km / 111.0  # 1 degree ≈ 111 km
        lng_offset = radius_km / (111.0 * abs(float(lat)) / 90.0) if lat != 0 else radius_km / 111.0
        
        latlng = f"{lat-lat_offset},{lng-lng_offset},{lat+lat_offset},{lng+lng_offset}"
        url = f"https://api.waqi.info/map/bounds/?latlng={latlng}&token={WAQI_TOKEN}"
        
        response = requests.get(url, timeout=10)
        data = response.json()
        
        if data.get("status") != "ok":
            return {"nearby_stations": []}
        
        stations = data.get("data", [])
        nearby = []
        
        for station in stations:
            try:
                s_lat = station.get("lat")
                s_lng = station.get("lon")
                
                if s_lat is None or s_lng is None:
                    continue
                    
                # Calculate distance using Haversine formula
                from math import radians, sin, cos, sqrt, atan2
                
                lat1, lon1 = radians(lat), radians(lng)
                lat2, lon2 = radians(s_lat), radians(s_lng)
                
                dlat = lat2 - lat1
                dlon = lon2 - lon1
                
                a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
                c = 2 * atan2(sqrt(a), sqrt(1-a))
                distance = 6371 * c  # Earth radius in km
                
                if distance <= radius_km:
                    aqi_val = station.get("aqi")
                    if aqi_val and aqi_val != "-":
                        try:
                            aqi_num = float(aqi_val)
                            nearby.append({
                                "station_name": station.get("station", {}).get("name", "Unknown Station"),
                                "distance_km": round(distance, 2),
                                "lat": s_lat,
                                "lng": s_lng,
                                "aqi": aqi_num,
                                "uid": station.get("uid")
                            })
                        except (ValueError, TypeError):
                            pass
            except Exception as e:
                continue
        
        # Sort by distance
        nearby.sort(key=lambda x: x['distance_km'])
        
        return {"nearby_stations": nearby}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching nearby stations: {str(e)}")


@app.get("/api/location/safe-zones")
async def get_safe_zones(threshold: int = 100):
    """Get list of cities with AQI below threshold (safe zones)"""
    safe_cities = []
    
    for city in INDIAN_CITIES[:20]:  # Check top 20 cities
        try:
            aqi_data = fetch_aqi_waqi(city['name'])
            aqi_value = aqi_data.get('aqi')
            
            if aqi_value and aqi_value < threshold:
                safe_cities.append({
                    "city": city['name'],
                    "aqi": aqi_value,
                    "lat": city['lat'],
                    "lng": city['lng']
                })
        except:
            pass
    
    safe_cities.sort(key=lambda x: x['aqi'])
    return {"safe_zones": safe_cities}


# ==================== MULTI-CITY COMPARISON ====================
@app.post("/api/compare/multi-city")
async def compare_multi_cities(cities: List[str]):
    """Compare AQI data for multiple cities (up to 5)"""
    if len(cities) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 cities allowed")
    
    comparison_data = []
    for city in cities:
        try:
            aqi_data = fetch_aqi_waqi(city)
            comparison_data.append({
                "city": city,
                "aqi": aqi_data.get('aqi'),
                "pm25": aqi_data.get('pm25'),
                "pm10": aqi_data.get('pm10'),
                "category": aqi_data.get('category'),
                "pollutants": aqi_data.get('pollutants', {})
            })
        except Exception as e:
            comparison_data.append({
                "city": city,
                "error": str(e)
            })
    
    return {"comparison": comparison_data}


@app.get("/api/compare/migration-advisor")
async def migration_advisor(current_city: str, max_results: int = 10):
    """Suggest best cities to migrate to based on air quality"""
    # Get current city AQI
    try:
        current_aqi = fetch_aqi_waqi(current_city).get('aqi')
    except:
        current_aqi = 999
    
    # Analyze all cities
    recommendations = []
    for city in INDIAN_CITIES:
        if city['name'].lower() == current_city.lower():
            continue
        
        try:
            city_data = fetch_aqi_waqi(city['name'])
            aqi_value = city_data.get('aqi')
            
            if aqi_value and aqi_value < current_aqi:
                improvement = current_aqi - aqi_value
                recommendations.append({
                    "city": city['name'],
                    "aqi": aqi_value,
                    "improvement": round(improvement, 1),
                    "improvement_percent": round((improvement / current_aqi) * 100, 1)
                })
        except:
            pass
    
    recommendations.sort(key=lambda x: x['aqi'])
    return {
        "current_city": current_city,
        "current_aqi": current_aqi,
        "recommendations": recommendations[:max_results]
    }


# ==================== CHATBOT ASSISTANT ====================
@app.post("/api/chatbot/query")
async def chatbot_query(query: str = Body(..., embed=True), user: dict = Depends(get_current_user_optional)):
    """Process natural language queries about air quality"""
    query_lower = query.lower()
    
    # Safety check
    if "safe" in query_lower or "jog" in query_lower or "exercise" in query_lower:
        # Extract city if mentioned
        city = None
        for c in INDIAN_CITIES:
            if c['name'].lower() in query_lower:
                city = c['name']
                break
        
        if not city and user:
            # Use user's first favorite city if available
            favorites = get_user_favorites(user["id"])
            if favorites:
                city = favorites[0]["city"]
        
        if city:
            try:
                aqi_data = fetch_aqi_waqi(city)
                aqi_value = aqi_data.get('aqi')
                
                if aqi_value <= 50:
                    response = f"✅ Yes! The air quality in {city} is GOOD (AQI: {aqi_value}). Perfect for outdoor activities like jogging and exercise!"
                elif aqi_value <= 100:
                    response = f"⚠️ The air quality in {city} is MODERATE (AQI: {aqi_value}). Light outdoor activities are okay, but sensitive individuals should limit prolonged exertion."
                elif aqi_value <= 150:
                    response = f"⚠️ Not recommended. {city} has UNHEALTHY air for sensitive groups (AQI: {aqi_value}). Consider indoor exercise instead."
                else:
                    response = f"❌ NO! {city} has UNHEALTHY air (AQI: {aqi_value}). Avoid outdoor exercise. Stay indoors and use air purifiers if possible."
                
                return {"response": response, "city": city, "aqi": aqi_value}
            except:
                pass
    
    # AQI level query
    if "aqi" in query_lower or "air quality" in query_lower:
        city = None
        for c in INDIAN_CITIES:
            if c['name'].lower() in query_lower:
                city = c['name']
                break
        
        if city:
            try:
                aqi_data = fetch_aqi_waqi(city)
                aqi_value = aqi_data.get('aqi')
                category = aqi_data.get('category')
                
                response = f"The current AQI in {city} is {aqi_value} ({category}). "
                
                if aqi_value <= 50:
                    response += "Air quality is excellent! Great time to be outdoors."
                elif aqi_value <= 100:
                    response += "Air quality is acceptable for most people."
                elif aqi_value <= 150:
                    response += "Sensitive groups should limit outdoor exposure."
                else:
                    response += "Everyone should avoid prolonged outdoor exposure."
                
                return {"response": response, "city": city, "aqi": aqi_value}
            except:
                pass
    
    # Comparison query
    if "better" in query_lower or "worse" in query_lower or "compare" in query_lower:
        cities_found = [c['name'] for c in INDIAN_CITIES if c['name'].lower() in query_lower]
        
        if len(cities_found) >= 2:
            try:
                city1_data = fetch_aqi_waqi(cities_found[0])
                city2_data = fetch_aqi_waqi(cities_found[1])
                
                aqi1 = city1_data.get('aqi')
                aqi2 = city2_data.get('aqi')
                
                if aqi1 < aqi2:
                    response = f"{cities_found[0]} has better air quality (AQI: {aqi1}) compared to {cities_found[1]} (AQI: {aqi2}). Difference: {aqi2 - aqi1} points."
                else:
                    response = f"{cities_found[1]} has better air quality (AQI: {aqi2}) compared to {cities_found[0]} (AQI: {aqi1}). Difference: {aqi1 - aqi2} points."
                
                return {"response": response, "cities": cities_found, "aqi_values": [aqi1, aqi2]}
            except:
                pass
    
    # Default response
    return {
        "response": "I can help you with:\n• Current AQI levels (e.g., 'What's the AQI in Delhi?')\n• Safety advice (e.g., 'Is it safe to jog in Mumbai?')\n• City comparisons (e.g., 'Which is better, Delhi or Bangalore?')\n\nWhat would you like to know?",
        "suggestions": [
            "What's the air quality in Delhi?",
            "Is it safe to exercise in Mumbai?",
            "Compare Delhi and Bangalore air quality"
        ]
    }


# ---------------- RUN (DEV ONLY) ----------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
