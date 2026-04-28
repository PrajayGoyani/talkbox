# Talkbox | Connect. Chat. Collaborate.

Talkbox is a real-time messaging platform providing message synchronization across devices. It uses a TypeScript-based stack with a focus on low-latency communication.

## 🚀 Features

- **Real-time Messaging**: Message delivery via Socket.io with latency under 200ms.
- **Security**: Authentication and data privacy controls.
- **Unified Dashboard**: Interface for managing settings, profiles, and conversations.
- **Cross-platform**: Support for mobile and desktop browsers.
- **Interface**: UI featuring glassmorphism effects, transitions, and light/dark modes.

## 🛠 Tech Stack

### Frontend

- **Svelte 5**: Framework for reactive state and UI management using Runes.
- **TailwindCSS 4**: Utility-first styling library.
- **Vite Plus (vp)**: Unified toolchain for development, testing, and formatting.
- **TypeScript**: Static typing for client-side logic.

### Backend

- **Bun**: JavaScript and TypeScript runtime environment.
- **Express 5**: Web server framework for the API.
- **MongoDB & Mongoose 9**: Document database and object modeling.
- **Socket.io & Redis**: Real-time messaging with distributed state management.
- **Sentry**: Error monitoring and performance tracking.
- **TypeScript**: Static typing for server-side logic.

## 🏁 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/) (v10+)
- [Bun](https://bun.sh/) (latest)
- [MongoDB](https://www.mongodb.com/) (local or cloud instance)

### Installation

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd user-chat
   ```

2. **Install all dependencies**:
   The root directory contains a `Makefile` to handle both environments simultaneously.

   ```bash
   make install
   ```

3. **Configure Environment Variables**:
   Copy the example environment files and update them with your credentials.
   ```bash
   cp backend/.env.example backend/.env
   # Frontend uses sensitive defaults, but check if .env is needed
   ```

### Running the Project

Talkbox uses **PM2** via the `Makefile` to manage the development process efficiently.

**Development Mode**:

```bash
make dev
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend: [http://localhost:3000](http://localhost:3000)

**Production Mode**:

```bash
make up
```

**Stop Services**:

```bash
make down
```

## 📋 Available Commands

Use `make help` to see all available shortcuts:

| Command        | Action                                         |
| -------------- | ---------------------------------------------- |
| `make install` | Install all dependencies                       |
| `make dev`     | Start development servers (frontend + backend) |
| `make up`      | Build and start in production mode             |
| `make down`    | Stop all running services                      |
| `make status`  | View service health and status                 |
| `make logs`    | View real-time application logs                |

---

_Built with passion for the modern web._
