# 🎯 Chatterbox Express API

A simple Express.js API for the Chatterbox iOS app with SQLite database and normalized schema.

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm

### Installation

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp .env.example .env
# Edit .env with your actual values
```

3. Start the server:

```bash
npm start
```

The server will run on `http://localhost:3000`

### Development Mode

For development with auto-restart:

```bash
npm run dev
```

## 📋 API Endpoint

### Base URL: `http://localhost:3000/api/v1`

| Method | Endpoint                   | Description                                         |
| ------ | -------------------------- | --------------------------------------------------- |
| GET    | `/prompts?language=en\|fr` | Fetch conversation prompts for specific language    |
| POST   | `/backup-db`               | Send database backup via email (password protected) |

### Example Request

#### Get English Prompts

```bash
curl "http://localhost:3000/api/v1/prompts?language=en"
```

#### Get French Prompts

```bash
curl "http://localhost:3000/api/v1/prompts?language=fr"
```

#### Send Database Backup

```bash
curl -X POST http://localhost:3000/api/v1/backup-db \
  -H "Content-Type: application/json" \
  -d '{"password": "your_password", "email": "your@email.com"}'
```

### Response Format

```json
[
  {
    "id": 1,
    "main_prompt": "Describe Something You Do That Can Help You Concentrate On Work/Study",
    "followups": [
      "What is it?",
      "When do you do it?",
      "How did you learn about it?",
      "How does it help you concentrate?"
    ]
  }
]
```

## 📱 Connecting iOS App

To connect your Swift app to this Express API:

1. **Update the base URL** in `chatterbox/chatterboxApp.swift`:

```swift
// Replace this line:
self.apiService = NetworkManager(baseURL: "https://your-api-domain.com/api/v1")

// With:
self.apiService = NetworkManager(baseURL: "http://localhost:3000/api/v1")
```

2. **Switch from Mock to Real API** in the same file:

```swift
// Change this:
#if DEBUG
self.apiService = MockAPIService()
#else
self.apiService = NetworkManager(baseURL: "http://localhost:3000/api/v1")
#endif

// To this (to force real API):
self.apiService = NetworkManager(baseURL: "http://localhost:3000/api/v1")
```

3. **Update your iOS models** to match the new response format with `followups` array

4. **Run your iOS app** - it will now connect to your local Express API!

## 🗄️ Database Structure

Using **SQLite** with normalized schema:

### Tables

#### `prompt` table

```sql
create table prompt (
  prompt_id integer primary key autoincrement,
  type text not null check(type in ('main', 'followup')),
  created_at datetime default current_timestamp,
  updated_at datetime default current_timestamp
);
```

#### `translation` table

```sql
create table translation (
  translation_id integer primary key autoincrement,
  prompt_id integer not null,
  language_code text not null check(language_code in ('en', 'fr')),
  text text not null,
  created_at datetime default current_timestamp,
  updated_at datetime default current_timestamp,
  foreign key(prompt_id) references prompt(prompt_id),
  unique(prompt_id, language_code)
);
```

### Data Organization

- **10 prompt sets** (main + 4 followups each)
- **2 languages** (English and French)
- **Normalized structure** for easy expansion
- **Automatic seeding** from JSON files

## 📁 Project Structure

```
chatterbox-express/
├── index.js                        # Main Express server
├── database.js                     # SQLite setup and seeding
├── en_chatterbox_cards.json        # English prompts data
├── fr_chatterbox_cards.json        # French prompts data
├── package.json                    # Dependencies
├── README.md                       # This file
├── .gitignore                      # Git ignore patterns
└── chatterbox.db                   # SQLite database (auto-created)
```

## 🔧 Troubleshooting

### Port Already in Use

If port 3000 is busy, set a different port:

```bash
PORT=3001 npm start
```

### Database Issues

- Database is auto-created on first run
- Delete `chatterbox.db` to reset and reseed data
- Check console logs for database errors

### API Not Responding

1. Check server is running: `curl http://localhost:3000/health`
2. Check server logs in terminal
3. Verify correct base URL in iOS app

## 🐳 Docker Deployment

### Quick Start with Docker Compose

1. **Ensure your `.env` file has the correct values:**

```bash
RESEND_API_KEY=re_your_actual_key_here
DB_SEND_PASSWORD=12345678
```

2. **Build and start services:**

```bash
docker-compose up -d
```

3. **Check logs:**

```bash
docker-compose logs -f
```

### Services Included

- **api**: Express API server on port 3000
- **backup-cron**: Automated backup emails at 12 AM & 12 PM Toronto time

### Manual Testing

```bash
# Test backup endpoint
curl -X POST http://localhost:3000/api/v1/backup-db \
  -H "Content-Type: application/json" \
  -d '{"password": "12345678", "email": "realbencyrus@gmail.com"}'

# Check cron logs
docker-compose logs backup-cron
```

### Deployment Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# View logs
docker-compose logs -f api
docker-compose logs -f backup-cron
```

## 🚀 Production Notes

For production deployment:

1. Add proper authentication
2. Add input validation and error handling
3. Set up environment variables for configuration
4. Deploy to a cloud service (Heroku, Railway, etc.)
5. Consider using PostgreSQL instead of SQLite

## 📦 Dependencies

- **express**: Web framework
- **cors**: Cross-origin resource sharing
- **sqlite3**: SQLite database driver
- **nodemon**: Development auto-restart (dev only)

---

**Clean, normalized, and ready to scale! 🎉**
