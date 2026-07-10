#!/usr/bin/env bash
# Double-click to launch Haven PM in Terminal
PROJECT_DIR="/Users/justin/Projects/haven-pm"

osascript -e "tell application \"Terminal\"
  activate
  do script \"cd '${PROJECT_DIR}' && chmod +x start.sh && ./start.sh; echo ''; echo 'Press Enter to close...'; read\"
end tell"
