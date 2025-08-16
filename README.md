# Budget Planner

A **Budget Planner** web app built with React on the frontend and an ASP.NET Core Web API backend to manage expenses and budget limits.

---

## Features

- **Expense Management**  
  - Add, edit, and delete expenses  
  - Track description, amount, date, category  
  - Support for recurring expenses (weekly, biweekly, monthly)  

- **Filtering & Search**  
  - Filter by date ranges (last 7 days, last 30 days, this month, custom)  
  - Filter by category or recurring vs one-time  
  - Search by description or category text  

- **Budget Tracking**  
  - Set and manage category-based budget limits  
  - Define monthly limits with recurrence intervals  
  - Track amount spent, usage percentage, and alerts for overspending  

- **Visualization**  
  - Interactive line chart of monthly spending (last 12 months)  
  - Category summaries showing spending vs limits  

---

## Technologies

- **Frontend:** React + Vite  
- **Visualization:** Recharts  
- **HTTP Client:** Axios  
- **Backend:** ASP.NET Core Web API (configurable with `VITE_API_BASE_URL`)  

---

## Getting Started

### Prerequisites

- Node.js (v14+ recommended)  
- .NET 6.0+ (for backend API)  

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/budget-planner.git
   cd budget-planner

2. Install dependencies:
    ```npm install```

3. Create .env file or edit in root of frontend and set API base URL:
    ```VITE_API_BASE_URL=http://localhost:5000```

4. Run the frontend:
    ```npm run dev```

5. Start the backend:
    ```bash
    cd backend
    dotnet run

## Collaborators
- Oliver Triana
