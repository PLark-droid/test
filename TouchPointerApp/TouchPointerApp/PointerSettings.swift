import SwiftUI

enum PointerColor: String, CaseIterable {
    case red, blue, green, yellow, white

    var color: Color {
        switch self {
        case .red: return .red
        case .blue: return .blue
        case .green: return .green
        case .yellow: return .yellow
        case .white: return .white
        }
    }
}

class PointerSettings: ObservableObject {
    @Published var pointerSize: CGFloat = 40
    @Published var selectedColor: PointerColor = .red
    @Published var showRipple: Bool = true
    @Published var trailWidth: CGFloat = 4
    @Published var showGestureLabel: Bool = true
}
