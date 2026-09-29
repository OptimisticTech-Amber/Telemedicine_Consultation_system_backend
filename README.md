# 🩺 Amrutam — Telemedicine System

A production-oriented **telemedicine backend API** built with **Node.js, TypeScript, Express, PostgreSQL, and Prisma**.

The system provides secure authentication, role-based access control, doctor discovery, availability management, consultation booking, prescriptions, payments, audit logging, API documentation, and automated testing.

The application is designed as a **modular monolith**, making it easier to develop, test, maintain, and scale while keeping business logic separated into independent modules.

---

## 🚀 Features

### 🔐 Authentication & Authorization

* User registration and login
* JWT-based authentication
* Access token and refresh token flow
* Session/refresh-token management
* Secure logout
* Role-based access control
* Supported roles:

  * `PATIENT`
  * `DOCTOR`
  * `ADMIN`

### 👨‍⚕️ Doctor Management

* Doctor profile management
* Doctor search
* Doctor details
* Doctor availability
* Availability slot management
* Search and filtering support

### 📅 Consultation Booking

* Book doctor consultations
* View consultation details
* Consultation lifecycle management
* Cancel consultations
* Doctor/patient authorization checks
* Transaction-safe booking
* Database locking to prevent double booking
* Idempotent booking behavior

### 💊 Prescriptions

* Create prescriptions for consultations
* View consultation prescriptions
* Doctor authorization
* Patient access to prescription information

### 💳 Payments

* Razorpay payment integration
* Create payment orders
* Checkout signature verification
* Webhook signature verification
* Payment event tracking
* Refund support
* Payment state management

### 🛡️ Security

* JWT authentication
* Role-based authorization
* Request validation
* Centralized error handling
* Rate limiting
* Payment signature verification
* Webhook HMAC verification
* Audit logging
* Secure database access through Prisma

### 📊 Observability

The project includes production-oriented observability support:

* Structured logging with Pino
* Prometheus metrics
* OpenTelemetry instrumentation
* Jaeger tracing

### 📚 API Documentation

The REST API is documented using **OpenAPI/Swagger**.

Once the application is running, API documentation is available at:

```text
/api/docs
```

---

## 🏗️ Architecture

The project follows a **modular monolith architecture**.

```text
                    ┌──────────────────────┐
                    │       Client         │
                    │ Web / Mobile / API   │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │     Express API      │
                    │ Middleware / Routes  │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
        ┌──────────┐     ┌───────────┐    ┌───────────┐
        │   Auth   │     │  Doctors  │    │Consultation│
        │  Module  │     │  Module   │    │   Module  │
        └──────────┘     └───────────┘    └─────┬─────┘
                                                 │
                         ┌───────────────────────┼───────────────┐
                         │                       │               │
                         ▼                       ▼               ▼
                  ┌────────────┐         ┌────────────┐   ┌──────────┐
                  │Prescriptions│        │  Payments  │   │  Audit   │
                  │   Module    │        │   Module   │   │  Module  │
                  └────────────┘         └──────┬─────┘   └──────────┘
                                                │
                                                ▼
                                         ┌────────────┐
                                         │  Razorpay  │
                                         └────────────┘

                               │
                               ▼
                       ┌────────────────┐
                       │   PostgreSQL   │
                       │    + Prisma    │
                       └────────────────┘
```

---

## 🛠️ Tech Stack

| Technology         | Purpose                           |
| ------------------ | --------------------------------- |
| **Node.js**        | JavaScript runtime                |
| **TypeScript**     | Type-safe application development |
| **Express.js**     | REST API framework                |
| **PostgreSQL**     | Relational database               |
| **Prisma ORM**     | Database access and migrations    |
| **JWT**            | Authentication                    |
| **Razorpay**       | Payment processing                |
| **Docker**         | Containerization                  |
| **Docker Compose** | Local infrastructure              |
| **OpenAPI**        | API documentation                 |
| **Jest**           | Testing                           |
| **Supertest**      | HTTP/API testing                  |
| **Pino**           | Structured logging                |
| **Prometheus**     | Metrics                           |
| **OpenTelemetry**  | Distributed tracing               |
| **Jaeger**         | Trace visualization               |

---

## 📁 Project Structure

```text
telemedicine_system/
│
├── src/
│   ├── config/
│   │
│   ├── common/
│   │   ├── errors/
│   │   ├── middleware/
│   │   ├── logger/
│   │   ├── types/
│   │   └── utils/
│   │
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── doctors/
│   │   ├── consultations/
│   │   ├── prescriptions/
│   │   ├── payments/
│   │   └── audit/
│   │
│   ├── app.ts
│   └── server.ts
│
├── prisma/
│   └── schema.prisma
│
├── tests/
│
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

# 🗄️ Database Design

The application uses **PostgreSQL** with **Prisma ORM**.

Core entities include:

```text
User
 │
 ├── Profile
 │
 └── Doctor
       │
       └── AvailabilitySlot
                │
                ▼
          Consultation
             │    │
             │    └── Prescription
             │
             └── Payment

User
 │
 └── AuditLog
```

### Main Models

* `User`
* `Profile`
* `Doctor`
* `AvailabilitySlot`
* `Consultation`
* `Prescription`
* `Payment`
* `AuditLog`
* Refresh/session related records
* Payment event records
* Refund records

The database uses appropriate indexes and unique constraints to support data integrity and efficient queries.

---

# 🔑 Authentication Flow

The authentication system uses JWT-based authentication with refresh sessions.

```text
Client
  │
  │ Register / Login
  ▼
Auth API
  │
  ▼
Validate Credentials
  │
  ▼
Generate Access Token
  │
  └──────────────► Generate Refresh Token
                         │
                         ▼
                     Session Store
```

For protected requests:

```text
Client
  │
  │ Authorization: Bearer <token>
  ▼
Auth Middleware
  │
  ├── Validate JWT
  │
  ├── Identify User
  │
  └── Check Role
          │
          ▼
      Controller
```

---

# 📅 Consultation Booking

One of the important parts of the system is preventing two patients from booking the same doctor availability slot.

The booking process uses database transactions and locking.

```text
Patient
   │
   ▼
Select Doctor
   │
   ▼
Select Availability Slot
   │
   ▼
Booking API
   │
   ▼
Database Transaction
   │
   ├── Lock Slot
   │
   ├── Verify Availability
   │
   ├── Create Consultation
   │
   └── Mark Slot as Booked
   │
   ▼
Commit Transaction
```

This protects the system from race conditions and double booking when multiple requests attempt to reserve the same slot.

---

# 💳 Payment Flow

Razorpay is used for payment processing.

```text
Patient
   │
   ▼
Create Consultation
   │
   ▼
Create Razorpay Order
   │
   ▼
Razorpay Checkout
   │
   ▼
Payment
   │
   ▼
Signature Verification
   │
   ▼
Payment Status Updated
```

Webhook requests are verified using an HMAC signature before processing payment events.

Payment records and provider event information are stored in the database to maintain a reliable payment history.

---

# 🔌 API Endpoints

## Authentication

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
```

## Users

```http
GET /api/users/me
```

## Doctors

```http
GET /api/doctors
GET /api/doctors/:id
GET /api/doctors/:id/availability
```

## Consultations

```http
POST /api/consultations
GET /api/consultations
GET /api/consultations/:id
PATCH /api/consultations/:id/status
POST /api/consultations/:id/cancel
GET /api/consultations/:id/prescription
```

## Prescriptions

Prescription functionality is exposed through the consultation/prescription modules with role-based authorization.

## Payments

```http
POST /api/payments/order
POST /api/payments/verify
POST /api/payments/webhook
POST /api/payments/:id/refund
```

> Exact routes may vary slightly with the current implementation.

---

# ⚙️ Getting Started

## Prerequisites

Make sure you have the following installed:

* Node.js
* npm
* PostgreSQL
* Docker
* Docker Compose
* Git

---

## 1. Clone the Repository

```bash
git clone <your-repository-url>

cd telemedicine_system
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Configure Environment Variables

Create a `.env` file:

```bash
cp .env.example .env
```

Example configuration:

```env
NODE_ENV=development

PORT=3000

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/telemedicine"

JWT_ACCESS_SECRET="your-access-secret"
JWT_REFRESH_SECRET="your-refresh-secret"

RAZORPAY_KEY_ID="your-razorpay-key"
RAZORPAY_KEY_SECRET="your-razorpay-secret"
RAZORPAY_WEBHOOK_SECRET="your-webhook-secret"
```

Never commit real credentials or secrets to Git.

---

🐳 Running with Docker

Start the application and PostgreSQL using Docker Compose:

docker compose up --build

To run in detached mode:

docker compose up -d --build

Stop the containers:

docker compose down
🗃️ Database Setup

Generate Prisma Client:

npx prisma generate

Run migrations:

npx prisma migrate dev

For production:

npx prisma migrate deploy

Open Prisma Studio:

npx prisma studio
▶️ Running the Application
Development
npm run dev
Production Build
npm run build
Start Production Server
npm start

The API will normally be available at:

http://localhost:3000
📖 API Documentation

Open the Swagger/OpenAPI documentation:

http://localhost:3000/api/docs

The documentation can be used to:

Explore endpoints
View request/response schemas
Understand authentication requirements
Test API endpoints
🧪 Testing

The project uses Jest and Supertest for automated testing.

Run the test suite:

npm test

Run tests in watch mode:

npm run test:watch

Run coverage:

npm run test:coverage

Testing covers important application behavior including:

Authentication
Authorization
Doctor management
Availability
Consultation booking
Consultation lifecycle
Prescription access
Payment-related logic
Validation
Error handling
🔒 Security Considerations

The application follows several security practices:

Authentication

JWT tokens are validated through authentication middleware.

Authorization

Protected resources use role-based authorization:

PATIENT
DOCTOR
ADMIN
Input Validation

API inputs are validated before reaching business logic.

Rate Limiting

Rate limiting is applied to protect APIs from excessive requests.

Payment Security

Razorpay signatures and webhook HMAC signatures are verified before processing payment events.

Audit Logging

Important actions are recorded using audit logs to provide traceability.

Database Safety

Prisma and PostgreSQL transactions are used for operations that require consistency, particularly consultation booking.

📈 Scalability

The application is designed with a target of approximately:

100,000 daily consultations

with performance goals around:

Read latency:  < 200 ms p95
Write latency: < 500 ms p95
Availability:   99.95%

The modular architecture allows individual domains to evolve independently while maintaining a single deployable backend.

Database indexes, transactions, efficient queries, connection management, and observability are important parts of the scalability strategy.

🔍 Observability

The backend supports production-oriented monitoring through:

Pino

Structured application logs.

Prometheus

Application and HTTP metrics.

OpenTelemetry

Instrumentation and distributed tracing.

Jaeger

Visualization and investigation of traces.

Example observability flow:

Application
    │
    ├── Logs ───────────► Pino
    │
    ├── Metrics ────────► Prometheus
    │
    └── Traces ─────────► OpenTelemetry
                              │
                              ▼
                           Jaeger
🧩 Design Principles

The project follows several backend engineering principles:

Modular architecture
Separation of concerns
Type safety
Centralized error handling
Role-based authorization
Transactional database operations
Input validation
Secure authentication
API documentation
Automated testing
Structured logging
Observability
Database integrity
🎯 Key Engineering Challenges
Preventing Double Booking

Multiple users can attempt to book the same availability slot at nearly the same time.

The solution uses transactional database operations and locking to ensure that a slot cannot be successfully booked twice.

Payment Verification

Payment status cannot be trusted solely from client-side information.

The backend verifies Razorpay signatures and webhook signatures before accepting payment-related events.

Authentication & Sessions

The system separates short-lived access authentication from refresh/session management to provide a more secure authentication flow.

Role-Based Access

Patients, doctors, and administrators have different permissions. Authorization is enforced at the API/business-logic level rather than relying only on frontend restrictions.

📌 Future Improvements

Potential areas for future development include:

Video consultation integration
Advanced doctor search and filtering
Appointment reminders
Medical document management
Prescription PDF generation
Advanced analytics dashboards
Horizontal API scaling
More comprehensive integration and end-to-end testing
👨‍💻 Development

This project follows a modular development approach where each major business domain is isolated into its own module.

Example:

modules/
├── auth/
├── users/
├── doctors/
├── consultations/
├── prescriptions/
├── payments/
└── audit/

Each module can contain its own:

controller
service
repository
routes
validation
types

This keeps business logic organized and makes the codebase easier to maintain as the application grows.

📄 License

This project is developed as a software engineering/telemedicine system project.
