# Shadow Stream

A dark, anime-inspired movie/series streaming app starter.

## Architecture

- `backend/` = Node.js + Express API
- `frontend/` = responsive web UI prototype
- PostgreSQL-ready data layer
- TMDB-ready metadata adapter
- Socket.IO-ready watch-party/social layer
- No download system
- No media scraping
- Media URLs are placeholders for authorized/licensed streams

## Run

### Backend
```bash
cd backend
yarn install
yarn start
```

Copy `.env.example` to `.env` and configure values.

### Frontend
Serve `frontend/` with any static server. For example:
```bash
cd frontend
python -m http.server 5500
```

Then open `http://localhost:5500`.

The frontend expects the API at:
`http://localhost:3000/api`

For Render, the backend start command is:
```bash
yarn start
```

## Important

TMDB is used only for metadata in this architecture. Replace the media provider with a source you are authorized to stream.
