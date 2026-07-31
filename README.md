## AmbulanceChaser

Live Demo
Link to your deployed GitHub Pages site.

## Problem
Emergency response teams and families often need a simple way to understand where an ambulance is going after picking someone up from a location. This can reduce confusion and help people prepare for arrival at the right hospital.

## Value
This project creates a clear, simple view of ambulance dispatch activity by showing the pickup location, the assigned ambulance company, and the most likely hospital destination. It also provides estimated pickup and hospital arrival times so users can better understand response expectations.

## Project Plan
The goal was to build a lightweight web app that lets a user share their location, log an ambulance pickup, and view the ambulance route to the nearest suitable hospital. The app was planned as a front-end experience using HTML, CSS, and JavaScript with map-based routing and ETA estimates.

## Features
Completed features:
- Use your current location to mark a pickup point
- Log an ambulance pickup with a company and ambulance ID
- Display a route to the closest hospital on the selected company’s route
- Show estimated pickup and hospital arrival times

Features to build next:
- Real-time ambulance tracking updates
- A backend/database for storing pickups and routes
- Turn-by-turn directions and traffic-aware routing


## Technologies Used
- HTML
- CSS
- JavaScript
- Leaflet.js
- OpenStreetMap tiles
- OpenStreetMap Routing API

## AI Tools Used
- GitHub Copilot


## Running the Project
Open the project folder in a browser or serve it locally with a simple static server.

Example:
```bash
cd /workspaces/AmbulanceChaser
python3 -m http.server 8000
```

Then open http://127.0.0.1:8000/ in your browser.