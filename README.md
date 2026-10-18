# TalentHub — Human Resources Management Platform

TalentHub is a web-based Human Resources Management Platform developed as part of my final-year engineering internship at **ST2i International**.

The platform centralizes HR processes, improves request tracking, and streamlines collaboration between employees, HR managers, team leaders, supervisors, and interns.

## Key Features

- **Internship Management:** Track interns, internships, supervisors, and evaluations.
- **HR Requests:** Submit and track employee requests, including leave, remote work, business trips, and training.
- **Complaints Management:** Centralize complaints and improve traceability.
- **Project Management:** Organize projects and assign responsibilities.
- **Referential Management:** Manage shared reference data.
- **Role-Based Access Control:** Enforce granular permissions according to user roles.
- **Authentication and SSO:** Secure authentication through Keycloak.
- **CI/CD:** Automate build and code-quality analysis using Jenkins and SonarQube.

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

The CI/CD workflow is designed to automate key stages of the development lifecycle:

- Source code checkout from Git.
- Automated build using Maven.
- Code quality analysis with SonarQube.
- Test execution and coverage reporting.
- Containerization with Docker.

## Project Context

**Organization:** ST2i International  
**Project:** TalentHub — HR Management Platform  
**Context:** Final-year engineering internship  
**Field:** Full-Stack Development, Microservices, DevOps & Cloud

## Technologies

`Angular` `TypeScript` `Java` `Spring Boot` `PostgreSQL` `Keycloak` `Redis` `REST API` `Docker` `Jenkins` `SonarQube` `Azure`

## Getting Started

To run TalentHub locally, you need to configure the frontend, backend microservices, database, authentication server, and supporting infrastructure.

1. Clone the repository.
2. Configure the required environment variables and service URLs.
3. Start PostgreSQL, Redis, Keycloak, and the required backend services.
4. Start the Angular frontend.
5. Access the application using the configured local URL.

*Detailed installation commands and environment configuration should be added according to the repository's current setup.*

## Author

**Ines Dahmani** — Software Engineer

- Portfolio: https://inesdahmani.netlify.app
- GitHub: https://github.com/DahmaniInes
- LinkedIn: https://www.linkedin.com/in/ines-dahmani20

---

*TalentHub was developed as part of my engineering internship at ST2i International.*
