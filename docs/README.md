# Executive Brain - ADHD Task Management Assistant

A warm, modern web interface that connects to your TickTick account through Claude Code + MCP for intelligent, ADHD-friendly task management.

## Features

- **Real-time TickTick Integration** - Direct connection via MCP
- **Automatic Processing** - Commands processed without manual intervention
- **WebSocket Updates** - Instant responses in the UI
- **Focus Coaching** - "What should I be doing?" with avoidance strategies
- **Strategy Learning** - Learns which ADHD strategies work best for you
- **Missed Task Review** - Reviews incomplete tasks before showing schedule
- **ADHD-Optimized Flows**:
  - Morning planning with priority setting
  - Evening review with reflection
  - Brain dump mode for capturing everything
  - "I'm stuck" mode for getting unstuck
  - Agile/Kanban task formatting for work

## Project Structure

```
executive-brain/
├── src/                      # Backend source code
│   ├── server.js             # Express + WebSocket server
│   └── processor.js          # Auto command processor
├── public/                   # Frontend assets
│   ├── index.html            # Main UI
│   ├── schedule.html         # Schedule view with review
│   ├── projects.html         # Project management
│   ├── guide.html            # User guide
│   └── styles.css            # Stylesheets
├── data/                     # Persistent data
│   ├── memories.json         # Strategies, preferences, history
│   ├── schedule.json         # Schedule data
│   └── projects/             # Project markdown files
├── docs/                     # Documentation
│   ├── README.md             # This file
│   └── HOW-IT-WORKS.md       # Technical docs
├── scripts/                  # Shell scripts
│   ├── start.sh              # Start all services
│   └── stop.sh               # Stop all services
├── legacy/                   # Archived old code
├── .claude/                  # Claude Code commands
├── CLAUDE.md                 # Instructions for Claude
└── package.json
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Everything

```bash
# Option A: Start all services (recommended)
./scripts/start.sh

# Option B: Use npm scripts
npm run start      # Just server
npm run processor  # Just processor
npm run all        # Both (same as start.sh)
```

### 3. Open the Web UI

```
http://localhost:3001
```

### 4. Stopping the App

```bash
./scripts/stop.sh
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     WebUI (Browser)                          │
│                           │                                  │
│              ┌────────────┴────────────┐                    │
│              │   WebSocket Connection  │                    │
│              │   (Real-time updates)   │                    │
│              └────────────┬────────────┘                    │
└───────────────────────────┼─────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│         Bridge Server (src/server.js - port 3001)           │
│  ┌──────────────────┬─────┴─────┬──────────────────┐        │
│  │   Express API    │ WebSocket │   File Watcher   │        │
│  │   + TickTick API │  Server   │   (responses)    │        │
│  └──────────────────┴───────────┴──────────────────┘        │
│              │                           ▲                   │
│              ▼                           │                   │
│  .command-queue.json          .command-responses.json       │
└──────────────┬───────────────────────────┴──────────────────┘
               │                           ▲
               ▼                           │
┌──────────────────────────────────────────┴──────────────────┐
│         Auto Processor (src/processor.js)                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  1. Watches .command-queue.json                     │    │
│  │  2. Processes commands via bridge TickTick API      │    │
│  │  3. Handles review flow state machine               │    │
│  │  4. Writes to .command-responses.json               │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Commands

| Command | Description |
|---------|-------------|
| `/now` | What should I be doing? (focus coaching) |
| `/add` | Add a task with intelligent capture and breakdown |
| `/checkin` | Check in on current progress |
| `/optimize` | Optimize and reschedule tasks |
| `/morning` | Interactive morning planning |
| `/evening` | Evening review with reflection |
| `/intake` | Brain dump mode |
| `/stuck` | Get help when overwhelmed |
| Natural language | Just describe what you need |

## Key Files

| File | Purpose |
|------|---------|
| `src/server.js` | Express + WebSocket server, TickTick API client |
| `src/processor.js` | Watches queue, processes commands, review system |
| `scripts/start.sh` | Starts all services |
| `scripts/stop.sh` | Stops all services |
| `.command-queue.json` | Pending commands from WebUI |
| `.command-responses.json` | Responses for WebUI |
| `data/memories.json` | Strategies, preferences, task history |
| `CLAUDE.md` | Instructions for Claude |

## How It Works

1. **User sends command** in WebUI (e.g., `/now`)
2. **Bridge server** adds to `.command-queue.json`, returns immediately
3. **Auto processor** detects change, processes command
4. **Processor calls** TickTick API endpoints on bridge server
5. **Processor writes response** to `.command-responses.json`
6. **Bridge detects change**, broadcasts via WebSocket
7. **WebUI receives** and displays response instantly

## Memory System

The app remembers context in `data/memories.json`:
- **preferences** - Task size, peak focus time, work style
- **strategies** - ADHD coping strategies with scores
- **taskHistory** - Per-task record of strategies tried
- **reviewSessions** - Past review session outcomes

## Strategy Tracking

Strategies are scored based on outcomes:
- **Success**: +3 points | **Partial**: +1 point | **Failure**: -1 point

When you're avoiding a task, strategies are suggested based on:
1. What type of avoidance you're experiencing (too big, boring, scary, etc.)
2. Which strategies have worked best for you (sorted by score)
3. What hasn't worked for this specific task (deprioritized)

Over time, the system learns which strategies work best for YOUR brain.

## Development

```bash
# Run server with auto-reload
npm run dev

# Check service status
curl http://localhost:3001/api/health

# View logs
tail -f server.log processor.log

# Stop everything
./scripts/stop.sh
```

## Troubleshooting

**WebUI not receiving responses:**
1. Check WebSocket connection (browser console)
2. Verify bridge server is running: `curl http://localhost:3001/api/health`
3. Check processor is running: `ps aux | grep processor`

**Commands not processing:**
1. Make sure auto-processor is running
2. Check processor logs: `tail -f processor.log`
3. Restart: `./scripts/stop.sh && ./scripts/start.sh`
