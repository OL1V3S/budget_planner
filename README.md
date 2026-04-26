# Budget Planner

A full-stack budget planner web application that allows users to track expenses, set monthly budget limits, and visualize spending by category.

**Live Demo:** https://oli-budget-planner.vercel.app/
*(Create an account to explore full functionality)*

---

## Features

### Authentication

* User registration & login (JWT-based)
* Email confirmation
* Password reset functionality

### Expense Management

* Add, edit, and delete expenses
* Track:
  * Description
  * Amount
  * Date
  * Category
* User-specific data isolation

### Budget Limits

* Set monthly budget limits by category
* Edit and delete limits
* Real-time usage tracking
* Visual alerts when nearing/exceeding limits

### Filtering & Search

* Filter by:
  * Date ranges
  * Categories
* Search by description or category

### Data Visualization

* Bar chart comparing:
  * Spending vs Budget Limits
* Category-based summaries

---

## Tech Stack

### Frontend

* React (Vite)
* Axios
* Chart.js (via react-chartjs-2)

### Backend

* ASP.NET Core Web API
* Entity Framework Core
* ASP.NET Identity (authentication)

### Database

* PostgreSQL (Neon)

### Deployment

* Frontend: Vercel
* Backend: Render

---

## Getting Started (Local Development)

### Prerequisites

* Node.js
* .NET 6+
* PostgreSQL (or SQL Server for local dev)

---

### 1. Clone the repo

```bash
git clone https://github.com/OL1V3S/budget_planner.git
cd budget_planner
```

---

### 2. Frontend setup

```bash
cd frontend
npm install
```

Create `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:5298
```

Run:

```bash
npm run dev
```

---

### 3. Backend setup

```bash
cd backend
dotnet restore
dotnet run
```

---

## Implementation Details

* **JWT Authentication** for secure API access
* **Entity Framework Core + PostgreSQL** for data storage
* **CORS configuration** for frontend/backend communication

---

## Author

**Oliver Triana**

---

## License

This project is for educational and portfolio purposes.
