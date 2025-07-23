# 🎯 Chatterbox Express API

A production-ready Express.js API for the Chatterbox iOS app with PostgreSQL database and automatic migrations.

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm
- PostgreSQL database (managed instance recommended)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
# Required environment variables:
export RESEND_API_KEY="re_your_actual_key_here"
export JWT_SECRET="your_secure_jwt_secret"
export CHATTERBOX_POSTGRES_URL="postgresql://user:password@host:port/database"

# Optional:
export PORT=3000
export NODE_ENV=development
export CORS_ORIGIN="*"
```

3. Start the server:

```bash
npm start
```

The server will run on `http://localhost:3000` and automatically apply any pending database migrations.

### Development Mode

For development with auto-restart:

```bash
npm run dev
```

## 📋 API Endpoints

### Base URL: `http://localhost:3000/api/v1`

| Method | Endpoint                   | Description                                      | Auth Required |
| ------ | -------------------------- | ------------------------------------------------ | ------------- |
| GET    | `/health`                  | Health check endpoint                            | No            |
| POST   | `/auth/request-login`      | Request login code via email                     | No            |
| POST   | `/auth/verify-login`       | Verify login code and get JWT token              | No            |
| GET    | `/auth/verify`             | Verify JWT token                                 | Yes           |
| POST   | `/auth/logout`             | Logout user                                      | Yes           |
| GET    | `/prompts?language=en\|fr` | Fetch conversation prompts for specific language | Yes           |
| GET    | `/prompts/stats`           | Get prompt statistics                            | Yes           |
| POST   | `/prompts/validate`        | Validate prompt set structure                    | Yes           |

### Authentication Flow

1. **Request login code:**

```bash
curl -X POST http://localhost:3000/api/v1/auth/request-login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

2. **Verify code and get token:**

```bash
curl -X POST http://localhost:3000/api/v1/auth/verify-login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "code": "123456"}'
```

3. **Use token for protected endpoints:**

```bash
curl "http://localhost:3000/api/v1/prompts?language=en" \
  -H "Authorization: Bearer your_jwt_token_here"
```

### Example Response (Prompts)

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

3. **Implement authentication** in your iOS app to handle JWT tokens

4. **Run your iOS app** - it will now connect to your local Express API!

## 🗄️ Database Structure

Using **PostgreSQL** with automatic migrations:

### Tables

#### `prompts` table

```sql
create table prompts (
  promptid serial primary key,
  type text not null check(type in ('main', 'followup')),
  created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp
);
```

#### `translations` table

```sql
create table translations (
  translationid serial primary key,
  promptid integer not null,
  language_code text not null check(language_code in ('en', 'fr')),
  text text not null,
  created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp,
  foreign key(promptid) references prompts(promptid),
  unique(promptid, language_code)
);
```

#### `accounts` table

```sql
create table accounts (
  accountid serial primary key,
  email text not null unique,
  created_at timestamp default current_timestamp,
  last_login_at timestamp,
  is_active boolean default true
);
```

#### `login_attempts` table

```sql
create table login_attempts (
  attemptid serial primary key,
  email text not null,
  code text not null,
  created_at timestamp default current_timestamp,
  is_used boolean default false
);
```

### Migration System

- **Automatic migrations** run on app startup
- **Migration files** in `migrations/` folder (numbered SQL files)
- **Forward-only** migrations (no rollbacks)
- **Transaction safety** - each migration is atomic

To add a new migration, create a numbered SQL file:

```
migrations/
├── 001_initial_tables.sql      ✅ Already applied
├── 002_your_new_feature.sql    📝 Your new migration
└── 003_another_change.sql      📝 Future migration
```

## 📁 Project Structure

```
chatterbox-express/
├── src/
│   ├── app.js                   # Express app setup
│   ├── server.js                # Server entry point
│   ├── config/
│   │   ├── database.js          # PostgreSQL connection
│   │   └── environment.js       # Environment variables
│   ├── services/
│   │   ├── databaseService.js   # Database connection management
│   │   ├── migrationService.js  # Migration runner
│   │   ├── authService.js       # Authentication logic
│   │   ├── promptService.js     # Prompt operations
│   │   └── emailService.js      # Email sending
│   ├── routes/
│   │   ├── index.js             # Route aggregation
│   │   ├── auth.js              # Authentication routes
│   │   └── prompts.js           # Prompt routes
│   ├── controllers/
│   │   ├── authController.js    # Auth request handlers
│   │   └── promptController.js  # Prompt request handlers
│   ├── middlewares/
│   │   ├── auth.js              # JWT verification
│   │   ├── errorHandler.js      # Error handling
│   │   ├── rateLimit.js         # Rate limiting
│   │   └── validation.js        # Input validation
│   └── utils/
│       ├── logger.js            # Logging utility
│       └── validators.js        # Validation helpers
├── migrations/
│   └── 001_initial_tables.sql   # Database migrations
├── package.json                 # Dependencies
├── Dockerfile                   # Docker container
├── docker-compose.yml           # Docker compose setup
└── README.md                    # This file
```

## 🔧 Troubleshooting

### Port Already in Use

If port 3000 is busy, set a different port:

```bash
PORT=3001 npm start
```

### Database Connection Issues

1. Check your `CHATTERBOX_POSTGRES_URL` is correct
2. Verify your PostgreSQL database is accessible
3. Check server logs for connection errors
4. Test database connection manually

### Migration Issues

- Migrations run automatically on startup
- If a migration fails, the app won't start
- Fix the SQL in the migration file and restart
- Check logs for detailed error messages

### API Not Responding

1. Check server is running: `curl http://localhost:3000/health`
2. Check server logs in terminal
3. Verify JWT token is valid for protected endpoints
4. Check environment variables are set

## 🐳 Docker Deployment

### Environment Setup

1. **Set up your environment variables:**

```bash
# Create .env file or set in your deployment platform
RESEND_API_KEY=re_your_actual_key_here
JWT_SECRET=your_secure_jwt_secret_here
CHATTERBOX_POSTGRES_URL=postgresql://user:password@host:port/database
```

2. **Build and start with Docker Compose:**

```bash
docker-compose up -d
```

3. **Check logs:**

```bash
docker-compose logs -f api
```

### Manual Docker Commands

```bash
# Build image
docker build -t chatterbox-api .

# Run container
docker run -d \
  -p 3000:3000 \
  -e RESEND_API_KEY=your_key \
  -e JWT_SECRET=your_secret \
  -e CHATTERBOX_POSTGRES_URL=your_db_url \
  chatterbox-api

# Check logs
docker logs container_name
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
```

## 🚀 Production Notes

For production deployment:

1. ✅ **JWT Authentication** - Already implemented
2. ✅ **Input validation** - Already implemented
3. ✅ **Error handling** - Already implemented
4. ✅ **Rate limiting** - Already implemented
5. ✅ **PostgreSQL ready** - Using managed database
6. ✅ **Auto migrations** - Database schema managed automatically
7. 🔧 **SSL/HTTPS** - Configure in your deployment platform
8. 🔧 **Environment variables** - Set in your deployment platform

## 📦 Dependencies

- **express**: Web framework
- **cors**: Cross-origin resource sharing
- **pg**: PostgreSQL client
- **jsonwebtoken**: JWT token handling
- **resend**: Email service
- **nodemon**: Development auto-restart (dev only)

---

**Production-ready with PostgreSQL and auto-migrations! 🎉**
