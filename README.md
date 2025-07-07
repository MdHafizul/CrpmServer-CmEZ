# DebtSentry

DebtSentry is a full-stack system for managing and analyzing disconnected accounts or debts data. It provides dashboards, file uploads, data processing, and reporting for operational and analytical needs.

---

## Features

- Upload and process Excel files containing disconnected account data
- Categorize and visualize data by time intervals
- Interactive dashboards and charts
- Generate detailed Excel and Parquet reports
- Responsive, user-friendly Next.js frontend
- RESTful API backend with Node.js and Express

---

## Technologies Used

- **Frontend:** Next.js, React, Tailwind CSS, Chart.js
- **Backend:** Node.js, Express.js, Multer, Winston
- **Database:** MySQL (optional)
- **Other:** Docker, ExcelJS, Parquet, html-to-image

---

## Project Structure

```
DebtSentry/
├── server-side/          # Backend code (Express API)
│   ├── controllers/      # API controllers
│   ├── middleware/       # Middleware functions
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── utils/            # Utility functions
│   └── index.js          # Entry point for the backend
├── client-side/          # Frontend code
│   └── status21-app/     # Next.js application
│       ├── src/          # Source code
│       ├── public/       # Static assets
│       └── pages/        # Application pages
└── docker-compose.yml    # Docker Compose configuration
```

---

## Prerequisites

- Node.js (v20 or higher)
- Docker (optional, for containerized deployment)
- MySQL database (if required for backend)

---

## Setup Instructions

### Backend (Server-Side)

1. Navigate to the `server-side` directory:
   ```bash
   cd server-side
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in `server-side` and configure:
   ```env
   PORT=3000
   NODE_ENV=development
   ALLOWED_MIME_TYPES=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel
   ```

4. Start the backend server:
   ```bash
   npm run dev
   ```

### Frontend (Client-Side)

1. Navigate to the `client-side/status21-app` directory:
   ```bash
   cd client-side/status21-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the frontend development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## Docker Deployment

1. Build and run the application using Docker Compose:
   ```bash
   docker-compose up --build
   ```

2. Access the application:
   - Backend: [http://localhost:3000](http://localhost:3000)
   - Frontend: [http://localhost:80](http://localhost:80)

---

## License

This project is licensed under the MIT License. See the LICENSE file for details.