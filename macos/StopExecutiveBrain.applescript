-- Executive Brain Stopper
-- Double-click to stop the service

on run
    set projectPath to "/Users/dannytrevino/development/executive-brain"
    set launcherPath to projectPath & "/macos/brain-launcher.sh"

    try
        do shell script "'" & launcherPath & "' stop"
        display notification "Executive Brain stopped" with title "🧠 Executive Brain" subtitle "All services stopped"
    on error errMsg
        display notification "Stop may have failed: " & errMsg with title "🧠 Executive Brain"
    end try
end run
