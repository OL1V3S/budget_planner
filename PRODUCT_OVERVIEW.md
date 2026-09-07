# Ordo Product Overview

Ordo is a personal finance web app for understanding activity in one tracked
checking account. It brings recorded spending and cash in, monthly category
budgets, and recurring expense and paycheck patterns into one place. It is for
someone who wants to organize their transactions and review what tends to recur,
while keeping control over what those patterns mean.

## How Ordo approaches money

Recorded activity, confirmed expectations, and projections have different roles.
A saved transaction records an observation. A recurring pattern is evidence to
review. Confirming a commitment or paycheck creates an expectation; it does not
prove that a future payment will happen.

This emphasis on review carries through statement import and recurring-pattern
suggestions. You choose which imported rows to save and which patterns to accept,
dismiss, or revisit. Ordo keeps the supporting evidence visible rather than
silently treating every detected pattern as a financial fact.

## What you can do today

- **Home / Overview:** See the current month's recorded spending, how many
  categories have spending, and how many category limits are at or above 90%
  used. Follow links into activity, planning, and insights.
- **Activity / Transactions:** Add, edit, and delete expenses. Search descriptions
  and categories, filter by category or date range, and review the underlying
  records behind spending summaries.
- **Budgets:** Set monthly spending limits for default or custom categories,
  adjust or remove them, and compare recorded spending with each limit and its
  percentage used.
- **Commitments:** Review recurring-expense suggestions and their transaction
  evidence. Confirm or dismiss suggestions, revisit dismissed ones, edit saved
  expectations, and manage active, paused, or ended commitments. Change reviews
  surface supported amount or timing changes and payments not seen recently;
  accepting a change remains your decision.
- **Paychecks:** Review possible recurring deposit patterns or create an expected
  paycheck profile manually. Profiles support several pay schedules, fixed
  amounts or accepted ranges, and active, paused, or ended status. Active profiles
  can show the next expected payment window. These are expectations, not
  guaranteed deposits or employer-verified earnings.
- **Insights / Analytics:** Compare recorded cash in with spending for a selected
  month and see the difference as net recorded cash flow. Explore a six-month
  trend and ranked spending categories, with budget usage, month-over-month
  category changes, and largest expenses available under More spending detail.
  Cash in is split into amounts linked to confirmed
  paychecks and all other recorded inflows.
- **Statement import:** Upload a supported, text-extractable Sunflower Bank PDF,
  review parsed rows, edit eligible expense rows, inspect possible-duplicate
  warnings, and confirm the rows to save. Selected debits become expenses.
  Credits are optional and must be explicitly selected; they become inflow
  records without automatically being classified as income or paychecks.
  Scanned PDFs are not supported.
- **Settings and account access:** View your signed-in email and choose a System,
  Light, or Dark theme saved on your device. Account access includes registration,
  sign-in and sign-out, email confirmation and resend, and password recovery by
  email. Settings currently provides email display and appearance controls,
  rather than a full account-management area.

Navigation uses Home, Activity, and Insights consistently across screen sizes.
On smaller screens, Plan groups Budgets, Commitments, and Paychecks, while More
contains secondary destinations. The underlying financial workflows are the same.

## What the figures mean

Ordo summarizes the records you have saved; those records may not cover all
activity in the account. Cash in includes more than earned income: other inflows
can include refunds, transfers, reimbursements, or paychecks that have not been
linked to a confirmed profile. Recorded spending represents outgoing money,
including purchases and bills as well as transfers, debt payments, or investment
funding recorded as expenses.

Net recorded cash flow is cash in minus recorded spending and can be negative.
It is **not an account balance, a savings figure, or an available/Safe-to-Spend
amount**. Budgets, commitment expectations, and paycheck projections do not add
money to historical totals. Ordo does not reconcile accounts or provide a
complete forecast of future finances. The
[financial-domain invariants](docs/financial-domain-invariants.md) define these
boundaries in more detail.

## Current shape and maturity

Ordo is an evolving product focused on recorded activity and explicit review.
It currently models one checking account, with manual expense entry and supported
statement import rather than a live bank connection. Investing is an unavailable
placeholder, not a portfolio or investment-analysis feature.

The app has a React/Vite browser frontend hosted on Vercel, an ASP.NET Core
backend hosted on Render, and a PostgreSQL database hosted on Neon. See
[ARCHITECTURE.md](ARCHITECTURE.md) for system details and
[ROADMAP.md](ROADMAP.md) for engineering sequencing; planned work there is separate
from the capabilities described here.
