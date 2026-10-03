import CoreGraphics
import Foundation

func point(_ x: String, _ y: String) -> CGPoint {
    CGPoint(x: Double(x) ?? 0, y: Double(y) ?? 0)
}

let source = CGEventSource(stateID: .hidSystemState)

func post(_ type: CGEventType, _ cursor: CGPoint) {
    if let event = CGEvent(mouseEventSource: source, mouseType: type, mouseCursorPosition: cursor, mouseButton: .left) {
        event.post(tap: .cghidEventTap)
    }
}

let args = CommandLine.arguments
guard args.count >= 2 else {
    fputs("usage: modbitx-mouse move x y | drag x y x2 y2\n", stderr)
    exit(2)
}

switch args[1] {
case "move":
    guard args.count == 4 else { exit(2) }
    post(.mouseMoved, point(args[2], args[3]))
case "drag":
    guard args.count == 6 else { exit(2) }
    let start = point(args[2], args[3])
    let end = point(args[4], args[5])
    post(.leftMouseDown, start)
    for step in 1...8 {
        let t = CGFloat(step) / 8
        post(.leftMouseDragged, CGPoint(x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t))
        Thread.sleep(forTimeInterval: 0.016)
    }
    post(.leftMouseUp, end)
default:
    fputs("unknown command\n", stderr)
    exit(2)
}
