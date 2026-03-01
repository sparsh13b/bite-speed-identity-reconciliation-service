# Bitespeed Identity Reconciliation Service

A backend web service that identifies and links customer contacts across multiple purchases made with different email/phone combinations.

## Live Endpoint

> **Base URL:** `https://bite-speed-identity-reconciliation.onrender.com`
>
> **POST** `https://bite-speed-identity-reconciliation.onrender.com/identify`



## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **ORM:** Prisma
- **Database:** PostgreSQL

## API Usage

### `POST https://bite-speed-identity-reconciliation.onrender.com/identify`

**Request Body (JSON):**
```json
{
  "email": "example@email.com",
  "phoneNumber": "1234567890"
}
```

At least one of `email` or `phoneNumber` must be provided.

**Response:**
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["example@email.com"],
    "phoneNumbers": ["1234567890"],
    "secondaryContactIds": [2, 3]
  }
}
```

## Local Setup

1. Clone the repo
```bash
git clone https://github.com/your-username/bite-speed.git
cd bite-speed
```

2. Install dependencies
```bash
npm install
```

3. Set up environment for local dev
```bash
# create a .env file with:
DATABASE_URL="file:./dev.db"
PORT=3000
```

4. Run database migration
```bash
npx prisma migrate dev
```

5. Start the dev server
```bash
npm run dev
```

Server will run on `http://localhost:3000`

## Deployment (Render)

1. Push code to GitHub
2. Create a PostgreSQL database on Render (free tier)
3. Create a Web Service on Render, connect your GitHub repo
4. Set environment variables on Render:
   - `DATABASE_URL` = your Render PostgreSQL connection string
   - `PORT` = `3000`
5. Set build command: `npm install && npm run build`
6. Set start command: `npm start`
