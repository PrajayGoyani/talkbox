# Talkbox | Connect. Chat. Collaborate.

Talkbox is a real-time messaging platform designed for speed, security, scalability and a unified user experience. Built with a modern tech stack and focusing on performance and reliability, it offers instant synchronization across all your devices.

## 🚀 Features

- **Real-time Messaging**: Instant message delivery using Socket.io (under 200ms latency).
- **Secure & Private**: Robust authentication and data privacy by design.
- **Unified Dashboard**: Manage settings, profiles, and conversations from one sleek interface.
- **Cross-platform Sync**: Seamless experience across mobile and desktop browsers.
- **Modern Aesthetics**: Premium UI with glassmorphism, dynamic transitions, and light/dark modes.

## 🛠 Tech Stack

### Frontend

- **Svelte 5**: Utilizing the latest runes for reactive state management.
- **TailwindCSS 4**: Modern styling with a utility-first approach.
- **Vite & Bun**: Lightning-fast build and development environment.

### Backend

- **Node.js (Express)**: Robust server-side framework.
- **TypeScript**: Strict type safety across the entire API.
- **MongoDB & Mongoose**: Scalable NoSQL database with flexible modeling.
- **Socket.io**: Powering real-time communication.

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
