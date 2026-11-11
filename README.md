##### CareerCraft AI

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

The main goal of CareerCraft AI is to simplify and improve the job application process by helping users create professional, personalized, and ATS-friendly resumes using artificial intelligence.

Many job seekers struggle to write effective resumes, highlight their skills, describe their work experience, and customize their applications for different job opportunities. CareerCraft AI aims to solve these challenges by providing an intelligent platform that makes resume creation easier, faster, and more effective.

Users can create a personal profile containing their education, work experience, technical skills, projects, and certifications. Instead of entering the same information repeatedly, they can save their information once and reuse it to generate multiple tailored resumes for different job opportunities.

By analyzing job descriptions, the AI system helps users identify important requirements, match relevant skills, improve resume content, and generate customized cover letters.

### Key Objectives

- **Simplify Resume Creation:** Help users build professional resumes without requiring advanced writing or design skills.
- **AI-Powered Customization:** Generate job-specific resumes based on users' profiles and job descriptions.
- **ATS Optimization:** Analyze resumes against job descriptions and provide suggestions to improve keyword matching and readability.
- **Cover Letter Generation:** Create personalized cover letters for different companies and job positions.
- **Career Development:** Help users identify missing skills and discover areas where they can improve.
- **Centralized Profile Management:** Allow users to save and manage their personal information, education, experience, projects, and skills in one place.
- **Job Application Tracking:** Help users organize and monitor their job applications and application progress.
- **Easy Document Export:** Allow users to download their completed resumes in PDF and DOCX formats.

### Vision

Our vision is to make professional career-building tools accessible to everyone, especially students, fresh graduates, and job seekers who want to improve their career opportunities.

CareerCraft AI aims to become an intelligent career assistant that supports users throughout their job search journey, from creating their first resume to preparing for interviews and finding better career opportunities.

## Status

🚧 Currently under development.

## Author

Surafel Melliyon
