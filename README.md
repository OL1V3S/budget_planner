# Budget Planner

A full-stack personal finance application for tracking expenses, setting monthly category budgets, and visualizing spending.

**Live Demo:** https://oli-budget-planner.vercel.app/

> Create an account to explore the authenticated features.

## Features

### Authentication & Account Recovery

- User registration and JWT-based login with ASP.NET Identity
- Email confirmation and password reset flows
- Gmail API email delivery using OAuth credentials
- Resend-confirmation recovery for unconfirmed accounts
- Per-recipient and global rate limiting on confirmation resends
- Neutral resend responses to avoid exposing account state

### Expense Management

- Add, edit, and delete expenses
- Track description, amount, date, and category
- User-specific data isolation
- Search and filter expenses by date range and category

### Budget Management

- Set monthly spending limits by category
- Edit and delete budget limits
- Track spending against configured limits
- Visual indicators when spending approaches or exceeds a budget

### Data Visualization

- Spending summaries by category
- Charts comparing spending with budget limits
- Interactive frontend visualizations built with Chart.js/Recharts

## Tech Stack

### Frontend

- React 19 + Vite
- JavaScript
- React Router
- Axios
- Chart.js / react-chartjs-2
- Recharts

### Backend

- ASP.NET Core 9 Web API
- C#
- Entity Framework Core
- ASP.NET Identity
- JWT Bearer authentication
- Gmail API + MimeKit

### Database

- PostgreSQL in production with Neon
- SQL Server provider available for local development

### Testing

- xUnit
- `WebApplicationFactory<Program>` integration testing
- EF Core InMemory for isolated test data
- Authentication, email-delivery, configuration, validation, rate-limit, and concurrency coverage

### Deployment

- Frontend: Vercel
- Backend: Render
- Database: Neon PostgreSQL
- Backend containerized with Docker

## Project Structure

```text
budget_planner/
├── frontend/        # React/Vite client
├── backend/         # ASP.NET Core Web API
└── backend.Tests/   # xUnit integration and service tests
```

## Local Development

### Prerequisites

- Node.js
- .NET 9 SDK
- PostgreSQL or SQL Server
- Gmail API OAuth credentials if testing email delivery

### 1. Clone the repository

```bash
git clone https://github.com/OL1V3S/budget_planner.git
cd budget_planner
```

### 2. Configure the backend

The backend expects the following configuration values:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "YOUR_CONNECTION_STRING"
  },
  "Jwt": {
    "Key": "YOUR_JWT_SIGNING_KEY"
  },
  "EmailSettings": {
    "FromName": "Budget Planner",
    "FromEmail": "YOUR_GMAIL_ADDRESS"
  },
  "GoogleEmail": {
    "ClientId": "YOUR_GOOGLE_CLIENT_ID",
    "ClientSecret": "YOUR_GOOGLE_CLIENT_SECRET",
    "RefreshToken": "YOUR_GOOGLE_REFRESH_TOKEN"
  },
  "Frontend": {
    "BaseUrl": "http://localhost:5173"
  }
}
```

Do not commit real credentials. Use local configuration or environment variables for secrets.

Start the backend:

```bash
cd backend
dotnet restore
dotnet run
```

The default HTTP development URL is:

```text
http://localhost:5298
```

### 3. Configure and run the frontend

In a separate terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:5298
```

Then run:

```bash
npm run dev
```

### 4. Run verification

Backend tests:

```bash
dotnet test backend.Tests/backend.Tests.csproj
```

Frontend lint and production build:

```bash
cd frontend
npm run lint
npm run build
```

## Engineering Highlights

- Full-stack React + ASP.NET Core architecture with a relational database
- Authentication built on ASP.NET Identity and JWTs
- Account-confirmation recovery designed around both reliability and account-enumeration resistance
- Gmail API integration with validated configuration and explicit delivery-failure handling
- Automated integration coverage for authentication and failure scenarios, including rate limiting and concurrent requests
- Separate frontend, backend, and database deployments across Vercel, Render, and Neon

## Author

**Oliver Triana**

[LinkedIn](https://www.linkedin.com/in/oliver-triana/) · [GitHub](https://github.com/OL1V3S)

## License

This project is for educational and portfolio purposes.
