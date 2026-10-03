import CoreGraphics
import Foundation

// Prints one JSON line describing whether the human is mid-typing and whether
// Secure Input (a password field) holds the keyboard. Both queries read system
// state without Input Monitoring: the login-session dictionary exposes the
// Secure Input pid, and combined-session event ages are queryable by any app.

func secureInputActive() -> Bool {
    guard let dict = CGSessionCopyCurrentDictionary() as NSDictionary? else { return false }
    if let pid = dict["kCGSSessionSecureInputPID"] as? NSNumber {
        return pid.intValue != 0
    }
    if let pid = dict["kCGSSessionSecureInputPID"] as? Int {
        return pid != 0
    }
    return false
}

let args = CommandLine.arguments
guard args.count >= 2, args[1] == "check" else {
    fputs("usage: modbitx-guard check\n", stderr)
    exit(2)
}

let sinceKey = CGEventSource.secondsSinceLastEventType(.combinedSessionState, eventType: .keyDown)
let sinceMouse = CGEventSource.secondsSinceLastEventType(.combinedSessionState, eventType: .mouseMoved)
let secure = secureInputActive()
let key = String(format: "%.1f", sinceKey)
let mouse = String(format: "%.1f", sinceMouse)
print("{\"secureInput\":\(secure ? "true" : "false"),\"sinceKey\":\(key),\"sinceMouse\":\(mouse)}")
