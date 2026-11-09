# CareerCraft AI

CareerCraft AI is an AI-powered resume builder that helps users create professional, job-specific resumes and cover letters using artificial intelligence.

## Features

- User registration and login
- Manage personal profile information
- Create and edit resumes
- AI-powered resume generation
- Generate customized cover letters
- Analyze job descriptions
- ATS resume analysis
- Multiple resume templates
- Export resumes as PDF and DOCX
- Track job applications

## Tech Stack

**Frontend**
- React
- Tailwind CSS
- Vite

**Backend**
- Node.js
- Express.js
- PostgreSQL
- Prisma ORM
- JWT Authentication

**AI Integration**
- Groq API

## Project Structure

```text
careercraft-ai/
├── client/          # Frontend application
├── server/          # Backend API
│   ├── prisma/      # Database schema and migrations
│   ├── src/         # Backend source code
│   └── .env         # Environment variables
└── README.md
```

## Installation

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd careercraft-ai
```

### 2. Install backend dependencies

```bash
cd server
npm install
```

### 3. Configure environment variables

Create a `.env` file inside the server folder.

```env
PORT=5000
DATABASE_URL="your_neon_database_url"
JWT_SECRET="your_jwt_secret"
GROQ_API_KEY="your_groq_api_key"
```

### 4. Set up the database

```bash
npx prisma generate
npx prisma migrate dev
```

### 5. Start the backend

```bash
npm run dev
```

### 6. Start the frontend

Open another terminal:

```bash
cd client
npm install
npm run dev
```

## Project Goal

To make professional resume creation easier, faster, and more accessible through AI-powered tools.

## Status

🚧 Currently under development.

## Author

Surafel Melliyon
