# How Executive Brain Works

## Overview

Executive Brain is a fully automated system that connects a web UI to Claude Code for ADHD-friendly task management with TickTick integration. Commands are processed automatically without manual intervention.

## System Components

### 1. Bridge Server (`src/server.js`)
- **Port**: 3001
- **Responsibilities**:
  - Serves the web UI (static files)
  - HTTP API for commands
  - WebSocket server for real-time updates
  - Watches `.command-responses.json` for changes
  - Broadcasts responses to connected clients

### 2. Auto-Processor (`src/processor.js`)
- **Responsibilities**:
  - Watches `.command-queue.json` for new commands
  - Automatically processes commands using TickTick API
  - Formats ADHD-friendly responses
  - Writes responses to `.command-responses.json`
  - No manual intervention required

### 3. Visual Schedule (`schedule.html`)
- **Responsibilities**:
  - Displays current priority task prominently
  - Shows day organized by energy zones
  - Provides quick actions (Done, Stuck, Skip, Break)
  - Syncs with TickTick engaged tasks
  - Supports Ideal Day template customization

### 4. Data Files (`data/`)
- **memories.json** - Strategies, preferences, task history
- **schedule.json** - Schedule configuration
- **projects/** - Project markdown files

## Data Flow

```
                                    ┌─────────────────────┐
                                    │  data/memories.json │
                                    │     (persistent)    │
                                    └──────────┬──────────┘
                                             │
┌──────────┐    HTTP POST     ┌──────────────┴──────────────┐
│  WebUI   │─────────────────▶│      Bridge Server          │
│ Browser  │                  │      (src/server.js)        │
│          │◀─────────────────│                             │
│          │    WebSocket     │  ┌────────────────────────┐ │
└──────────┘                  │  │ 1. Add to queue        │ │
                              │  │ 2. Return commandId    │ │
                              │  │ 3. Watch for response  │ │
                              │  │ 4. Broadcast via WS    │ │
                              │  └────────────────────────┘ │
                              └──────────────┬──────────────┘
                                             │
                                             ▼
                              ┌──────────────────────────────┐
                              │    .command-queue.json       │
                              │    {commands: [{id, cmd}]}   │
                              └──────────────┬───────────────┘
                                             │
                    chokidar watches         │
                              ┌──────────────┴───────────────┐
                              │      Auto-Processor          │
                              │    (src/processor.js)        │
                              │                              │
                              │  1. Detect new command       │
                              │  2. Call TickTick API        │
                              │  3. Format ADHD response     │
                              │  4. Write response file      │
                              └──────────────┬───────────────┘
                                             │
                                             ▼
                              ┌──────────────────────────────┐
                              │  .command-responses.json     │
                              │  {cmdId: {response, ts}}     │
                              └──────────────┬───────────────┘
                                             │
                    chokidar watches         │
                                             ▼
                              ┌──────────────────────────────┐
                              │      Bridge Server           │
                              │                              │
                              │  1. Detect new response      │
                              │  2. Broadcast via WebSocket  │
                              └──────────────┬───────────────┘
                                             │
                              WebSocket push │
                                             ▼
                              ┌──────────────────────────────┐
                              │         WebUI                │
                              │                              │
                              │  1. Receive WS message       │
                              │  2. Match to pending cmd     │
                              │  3. Display response         │
                              │  4. Remove loading state     │
                              └──────────────────────────────┘
```

## File Formats

### .command-queue.json
```json
{
  "commands": [
    {
      "id": "cmd_1733423400000_abc123",
      "command": "/now",
      "sessionId": "session_xxx",
      "timestamp": 1733423400000,
      "fullCommand": "/now",
      "context": {}
    }
  ]
}
```

### .command-responses.json
```json
{
  "cmd_1733423400000_abc123": {
    "response": {
      "message": "🎯 **What You Should Be Doing**\n\n...",
      "waitingFor": false,
      "status": "success"
    },
    "timestamp": 1733423401000
  }
}
```

### memories.json
```json
{
  "taskPatterns": {
    "commonBlockers": [],
    "energyPatterns": [],
    "procrastinationTriggers": []
  },
  "strategies": [
    {
      "id": "2-minute-version",
      "name": "2-Minute Version",
      "description": "Do just 2 minutes of the task to build momentum.",
      "applicableTo": ["too_big", "scary", "boring"],
      "score": 5,
      "outcomes": [
        {
          "date": "2025-12-05",
          "result": "success",
          "taskContext": "Policy bot documentation",
          "notes": "Got into flow after 2 mins"
        }
      ],
      "tweaks": ["Works better with a physical timer"]
    }
  ],
  "preferences": {
    "peakFocusTime": "9am-12pm",
    "taskSizePreference": "15-30 minutes"
  },
  "eveningReviews": [...]
}
```

## Auto-Processor Workflow

The auto-processor handles commands automatically:

```javascript
// src/processor.js - simplified

// 1. Watch for new commands
chokidar.watch('.command-queue.json').on('change', async () => {
    const queue = JSON.parse(fs.readFileSync('.command-queue.json', 'utf8'));
    const cmd = queue.commands[queue.commands.length - 1];

    // 2. Process based on command type
    let response;
    if (cmd.command === '/now') {
        // Fetch via bridge API proxy
        const data = await fetch('http://localhost:3001/api/ticktick/ticktick_get_engaged_tasks', {
            method: 'POST'
        });
        response = formatNowResponse(data.result);
    }

    // 3. Write response
    const responses = JSON.parse(fs.readFileSync('.command-responses.json', 'utf8') || '{}');
    responses[cmd.id] = {
        response: { message: response, waitingFor: false, status: 'success' },
        timestamp: Date.now()
    };
    fs.writeFileSync('.command-responses.json', JSON.stringify(responses, null, 2));

    // 4. Clear queue
    fs.writeFileSync('.command-queue.json', JSON.stringify({ commands: [] }, null, 2));
});

// Bridge server detects change → broadcasts via WebSocket → UI updates
```

## WebSocket Protocol

### Server → Client Messages

**Connection established:**
```json
{"type": "connected", "timestamp": 1733423400000}
```

**Response ready:**
```json
{
  "type": "response",
  "commandId": "cmd_xxx",
  "response": {
    "message": "...",
    "waitingFor": false
  },
  "timestamp": 1733423401000
}
```

### Client Behavior
1. Connect to `ws://localhost:3001`
2. Track pending commands by ID
3. When `type: "response"` received, match to pending command
4. Display message and remove loading state

## API Endpoints

### Bridge Server (3001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/command` | Submit a command |
| GET | `/api/health` | Health check |
| GET | `/api/focus/:sessionId` | Get focus session |
| POST | `/api/respond` | Submit response (for Claude) |
| WS | `/` | WebSocket for real-time updates |

### Schedule Page

The schedule page (`/schedule.html`) fetches data directly from the bridge server:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ticktick/ticktick_get_engaged_tasks` | Get high-priority, due today, overdue tasks |

## Memory System

The memory system (stored in `data/memories.json`) helps the processor remember context and learn from outcomes.

### Memory Categories
- **preferences** - User preferences (peak focus time, task size)
- **taskPatterns** - Learned patterns (blockers, energy patterns, triggers)
- **strategies** - Strategy tracking with scoring (see below)
- **eveningReviews** - Historical review data

## Strategy Tracking System

Strategies are tracked with a scoring system to learn what works over time:

### Scoring
- **Success**: +3 points (strategy worked, task got done)
- **Partial**: +1 point (helped but didn't fully work)
- **Failure**: -1 point (didn't help)

### Strategy Properties
| Property | Description |
|----------|-------------|
| `id` | Unique identifier (kebab-case) |
| `name` | Human-readable name |
| `description` | What to do and why |
| `applicableTo` | Array of avoidance types it helps with |
| `score` | Sum of outcome points |
| `outcomes` | Array of recorded results |
| `tweaks` | Modifications that improve effectiveness |

### Avoidance Types
- `too_big` - Task feels overwhelming
- `unclear` - Don't know what to do
- `boring` - Task is tedious
- `scary` - Fear of failure
- `blocked` - Waiting on something
- `distracted` - Can't focus
- `low_energy` - Too tired
- `overwhelmed` - Too many things

When suggesting strategies, filter by avoidance type and sort by score (highest first).

## Debugging

### Check all services
```bash
# Bridge server
curl http://localhost:3001/api/health

# Auto-processor
pgrep -f "node src/processor.js" && echo "Running" || echo "Not running"
```

### View logs
```bash
tail -f server.log      # Bridge server
tail -f processor.log   # Auto-processor
```

### Check pending commands
```bash
cat .command-queue.json
```

### Check responses
```bash
cat .command-responses.json
```

## Common Issues

### "Response not showing in WebUI"
1. Check WebSocket connection in browser console
2. Verify auto-processor is running: `pgrep -f "node src/processor.js"`
3. Check processor.log for errors
4. Check bridge server logs for broadcast messages

### "Commands not processing"
1. Ensure auto-processor is running: `pgrep -f "node src/processor.js"`
2. Check if queue file has commands: `cat .command-queue.json`
3. Restart with: `./scripts/stop.sh && ./scripts/start.sh`

### "Schedule not loading tasks"
1. Check bridge server is running: `curl http://localhost:3001/api/health`
2. Verify TickTick API is accessible via bridge
3. Check browser console for fetch errors
