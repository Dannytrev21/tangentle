-- Executive Brain Launcher
-- Double-click to start the service and open the Web UI

on run
    set projectPath to "/Users/dannytrevino/development/executive-brain"
    set launcherPath to projectPath & "/macos/brain-launcher.sh"

    -- Start the services using the launcher script
    try
        do shell script "'" & launcherPath & "' start > /dev/null 2>&1 &"
    on error errMsg
        display dialog "Failed to start Executive Brain: " & errMsg buttons {"OK"} default button "OK" with icon stop
        return
    end try

    -- Wait a moment for server to start
    delay 3

    -- Check if server is running
    try
        do shell script "curl -s http://localhost:3001/api/health"
        -- Server is running, open the Web UI
        open location "http://localhost:3001"
        display notification "Executive Brain is running!" with title "🧠 Executive Brain" subtitle "http://localhost:3001"
    on error
        display notification "Starting up... try again in a moment" with title "🧠 Executive Brain" subtitle "Server initializing"
        delay 2
        open location "http://localhost:3001"
    end try
end run
