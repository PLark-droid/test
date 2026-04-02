import SwiftUI

// MARK: - ジェスチャー種別

enum GestureType: String {
    case tap = "タップ"
    case swipeLeft = "← スワイプ"
    case swipeRight = "スワイプ →"
    case swipeUp = "↑ スワイプ"
    case swipeDown = "↓ スワイプ"
    case longPress = "長押し"
    case drag = "ドラッグ"

    var icon: String {
        switch self {
        case .tap: return "hand.tap"
        case .swipeLeft: return "arrow.left"
        case .swipeRight: return "arrow.right"
        case .swipeUp: return "arrow.up"
        case .swipeDown: return "arrow.down"
        case .longPress: return "hand.tap.fill"
        case .drag: return "arrow.up.and.down.and.arrow.left.and.right"
        }
    }
}

// MARK: - 軌跡データ

struct TrailPoint: Identifiable {
    let id = UUID()
    let position: CGPoint
    let timestamp: Date
}

struct GestureTrail: Identifiable {
    let id = UUID()
    let points: [CGPoint]
    let gestureType: GestureType
    let startTime: Date
    var opacity: Double = 1.0
}

// MARK: - 軌跡描画ビュー

struct TrailPathView: View {
    let trail: GestureTrail
    let color: Color
    let lineWidth: CGFloat

    @State private var drawProgress: CGFloat = 0
    @State private var fadeOut: Double = 1.0

    var body: some View {
        ZStack {
            // 軌跡のライン
            if trail.points.count >= 2 {
                TrailShape(points: trail.points)
                    .trim(from: 0, to: drawProgress)
                    .stroke(
                        LinearGradient(
                            colors: [color.opacity(0.2), color.opacity(0.8)],
                            startPoint: .leading,
                            endPoint: .trailing
                        ),
                        style: StrokeStyle(lineWidth: lineWidth, lineCap: .round, lineJoin: .round)
                    )
                    .opacity(fadeOut)
            }

            // スワイプ方向の矢印アニメーション
            if trail.gestureType != .tap && trail.gestureType != .longPress,
               let start = trail.points.first,
               let end = trail.points.last {
                ArrowAnimationView(
                    start: start,
                    end: end,
                    color: color,
                    gestureType: trail.gestureType
                )
                .opacity(fadeOut)
            }

            // ジェスチャーラベル
            if let midPoint = trailMidPoint {
                GestureLabel(gestureType: trail.gestureType)
                    .position(x: midPoint.x, y: midPoint.y - 30)
                    .opacity(fadeOut)
            }
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.3)) {
                drawProgress = 1.0
            }
            // 2秒後にフェードアウト
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                withAnimation(.easeOut(duration: 0.5)) {
                    fadeOut = 0.0
                }
            }
        }
    }

    private var trailMidPoint: CGPoint? {
        guard !trail.points.isEmpty else { return nil }
        let midIndex = trail.points.count / 2
        return trail.points[midIndex]
    }
}

// MARK: - 軌跡のShapeパス

struct TrailShape: Shape {
    let points: [CGPoint]

    func path(in rect: CGRect) -> Path {
        var path = Path()
        guard let first = points.first else { return path }

        path.move(to: first)

        if points.count == 2 {
            path.addLine(to: points[1])
        } else {
            // スムーズなカーブで描画
            for i in 1..<points.count {
                let current = points[i]
                let previous = points[i - 1]
                let midPoint = CGPoint(
                    x: (previous.x + current.x) / 2,
                    y: (previous.y + current.y) / 2
                )
                path.addQuadCurve(to: midPoint, control: previous)
            }
            if let last = points.last {
                path.addLine(to: last)
            }
        }

        return path
    }
}

// MARK: - 矢印アニメーション

struct ArrowAnimationView: View {
    let start: CGPoint
    let end: CGPoint
    let color: Color
    let gestureType: GestureType

    @State private var arrowOffset: CGFloat = 0
    @State private var arrowOpacity: Double = 0

    var body: some View {
        // 終点に矢印を表示
        Image(systemName: gestureType.icon)
            .font(.system(size: 28, weight: .bold))
            .foregroundColor(color)
            .shadow(color: .black.opacity(0.3), radius: 2, x: 0, y: 1)
            .position(arrowPosition)
            .opacity(arrowOpacity)
            .onAppear {
                withAnimation(.easeOut(duration: 0.4)) {
                    arrowOpacity = 1.0
                    arrowOffset = 1.0
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                    withAnimation(.easeOut(duration: 0.5)) {
                        arrowOpacity = 0
                    }
                }
            }
    }

    private var arrowPosition: CGPoint {
        CGPoint(
            x: end.x + (end.x - start.x) * 0.1,
            y: end.y + (end.y - start.y) * 0.1
        )
    }
}

// MARK: - ジェスチャーラベル

struct GestureLabel: View {
    let gestureType: GestureType

    @State private var show = false

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: gestureType.icon)
                .font(.caption2)
            Text(gestureType.rawValue)
                .font(.caption)
                .fontWeight(.semibold)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(.ultraThinMaterial)
        .cornerRadius(12)
        .scaleEffect(show ? 1.0 : 0.5)
        .opacity(show ? 1.0 : 0.0)
        .onAppear {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                show = true
            }
        }
    }
}
