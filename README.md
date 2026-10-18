# TalentHub — Human Resources Management Platform

TalentHub is a web-based Human Resources Management Platform developed as part of my final-year engineering internship at **ST2i International**.

The platform centralizes HR processes, improves request tracking, and streamlines collaboration between employees, HR managers, team leaders, supervisors, and interns.

## Key Features

- **User Management:** Manage user accounts and access.
- **Profile & Permission Management:** Configure user profiles and fine-grained permissions.
- **Client & Team Management:** Manage clients, teams, and team assignments.
- **Project & Activity Management:** Organize projects, activities, and responsibilities.
- **Timesheet Management:** Track and manage working hours.
- **Requests & Complaints Management:** Submit, process, and track requests and complaints.
- **Internship Management:** Manage interns, supervisors, internships, and evaluations.
- **Referential Management:** Maintain centralized reference data.
- **Authentication & SSO:** Secure authentication and single sign-on using Keycloak.
- **Automated Testing:** Test backend business logic using JUnit and Mockito.
- **CI/CD Pipeline:** Automate builds, testing, and code quality analysis using Jenkins, Maven, and SonarQube.
- **Containerization & Deployment:** Containerize application services with Docker and deploy the application using Kubernetes on Microsoft Azure Kubernetes Service (AKS).

## Architecture

TalentHub follows a microservices architecture designed to separate business responsibilities and improve maintainability.

- **Frontend:** Angular
- **Backend:** Java, Spring Boot, REST APIs
- **Microservices:** Application Service, Nomenclature Service
- **API Gateway:** Centralized API access
- **Service Discovery:** Netflix Eureka
- **Database:** PostgreSQL
- **Authentication and Identity Management:** Keycloak, OAuth 2.0, OpenID Connect
- **Caching:** Redis
- **DevOps:** Docker, Jenkins, SonarQube
- **Cloud & Orchestration:** Microsoft Azure, Azure Kubernetes Service (AKS) — deployment configuration and exploration

## Security

Security is a core component of TalentHub.

- Centralized authentication and single sign-on with Keycloak.
- JWT-based authentication for API requests.
- Fine-grained, database-driven permissions.
- Redis caching to optimize permission checks.
- Backend authorization checks to prevent unauthorized access.

## DevOps and Quality

- **CI/CD:** Automated pipeline with Jenkins and GitHub.
- **Build & Packaging:** Maven 3.9 and JDK 21.
- **Automated Testing:** JUnit test execution and reporting.
- **Code Coverage:** JaCoCo.
- **Code Quality:** SonarQube analysis and Quality Gate.
- **Containerization:** Docker image build and push to Azure Container Registry (ACR).
- **Deployment:** Automated rollout on Azure Kubernetes Service (AKS).
- **Notifications:** Email alerts for pipeline success or failure.

## Project Context

**Organization:** ST2i International  
**Project:** TalentHub — HR Management Platform  
**Context:** Final-year engineering internship  
**Field:** Full-Stack Development, Microservices, DevOps & Cloud

## Technologies

`Angular` `TypeScript` `Java` `Spring Boot` `Microservices` `REST API` `PostgreSQL` `Keycloak` `Redis` `Docker` `Kubernetes` `Jenkins` `Maven` `JUnit` `JaCoCo` `SonarQube` `Microsoft Azure` `Azure Kubernetes Service (AKS)` `Azure Container Registry (ACR)`

## Getting Started

### Prerequisites

Make sure you have the following tools installed:

- Git
- Java JDK 21
- Maven 3.9+
- Node.js and npm
- Angular CLI
- Docker
- Access to the required PostgreSQL, Redis, and Keycloak configurations

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/DahmaniInes/TalentHub.git
cd TalentHub
```

**2. Configure the environment**

Configure the database connection, authentication settings, service URLs, and required environment variables for the frontend and backend services.

**3. Start the backend services**

Navigate to each Spring Boot microservice directory, configure its dependencies, and start it using Maven.

```bash
mvn spring-boot:run
```

**4. Start the Angular frontend**

Navigate to the frontend directory and install the dependencies:

```bash
npm install
ng serve
```

**5. Access the application**

Open `http://localhost:4200` in your browser, provided that the frontend is configured to use the correct backend endpoints.

> **Note:** PostgreSQL, Redis, Keycloak, service discovery, and the API Gateway must be configured and running for the application to work correctly.

## Author

**Ines Dahmani** — Software Engineer

- Portfolio: https://inesdahmani.netlify.app
- GitHub: https://github.com/DahmaniInes
- LinkedIn: https://www.linkedin.com/in/ines-dahmani20

---

*TalentHub was developed as part of my engineering internship at ST2i International.*
