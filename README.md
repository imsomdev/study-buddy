# Study Buddy 📚

Study Buddy is a full-stack application designed to help users study more effectively using AI-generated MCQs and flashcards from their uploaded documents.

## 🚀 Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: Next.js (TypeScript)
- **Database**: PostgreSQL
- **ORM**: Alembic & SQLAlchemy
- **AI Service**: Cerebras LLM
- **Proxy**: Nginx
- **Deployment**: Docker & Docker Compose

---

## 💻 Local Development

1. **Clone the repository**:

   ```bash
   git clone https://github.com/YOUR_USERNAME/study-buddy.git
   cd study-buddy
   ```

2. **Environment Variables**:
   Copy `.env.example` to `.env` and fill in your keys:

   ```bash
   cp .env.example .env
   ```

3. **Run with Docker**:
   ```bash
   docker compose up -d --build
   ```
   The app will be available at `http://localhost:8080`.

---

## 🌐 Production Deployment

### 1. Reverse Proxy Setup

The Docker setup is configured to run on **port 8080**. Your host-level reverse proxy (e.g., Nginx on the OS) should be configured as follows:

```nginx
server {
    server_name studybuddy.somdevxdev.space;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl; # Managed by Certbot/Let's Encrypt at host level
    # SSL certificate paths here...
}
```

### 2. CI/CD Pipeline

Automated deployment is handled via **GitHub Actions** (`.github/workflows/deploy.yml`).

**Required GitHub Secrets:**

- `SERVER_IP`: Public IP of your server.
- `SERVER_USER`: SSH username (e.g., `root`).
- `SSH_PRIVATE_KEY`: Your private SSH key.

### 3. Database Migrations

Migrations are **automatic**. The `entrypoint.sh` script runs `alembic upgrade head` every time the backend container starts.

### 4. Direct Server Setup

If setting up manually on a new server:

1. `git clone ...`
2. Create `.env` file with production values:
   - `NEXT_PUBLIC_API_BASE_URL=https://studybuddy.somdevxdev.space/api/v1`
3. `docker compose up -d --build`

---

## 📝 Maintenance

- **View Logs**: `docker compose logs -f backend`
- **Rebuild specific service**: `docker compose up -d --build frontend`
- **Database Access**: Available via PgAdmin at `http://localhost:5050` (local only).
