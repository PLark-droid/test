import SwiftUI

struct PointerOverlayView: View {
    @ObservedObject var settings: PointerSettings
    @Environment(\.dismiss) private var dismiss

    @State private var touchLocation: CGPoint? = nil
    @State private var isTouching = false
    @State private var ripples: [RippleInfo] = []

    // 軌跡トラッキング
    @State private var currentTrailPoints: [CGPoint] = []
    @State private var completedTrails: [GestureTrail] = []
    @State private var dragStartTime: Date? = nil
    @State private var dragStartLocation: CGPoint? = nil

    // ガイド表示
    @State private var showGuide = true

    var body: some View {
        ZStack {
            // 全画面タッチエリア（透明）
            Color.clear
                .contentShape(Rectangle())
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .onChanged { value in
                            touchLocation = value.location
                            isTouching = true

                            // ガイド非表示
                            if showGuide {
                                withAnimation { showGuide = false }
                            }

                            // 軌跡記録開始
                            if dragStartTime == nil {
                                dragStartTime = Date()
                                dragStartLocation = value.startLocation
                            }
                            currentTrailPoints.append(value.location)
                        }
                        .onEnded { value in
                            let endLocation = value.location

                            // ジェスチャー判定
                            let gestureType = detectGesture(
                                start: value.startLocation,
                                end: endLocation,
                                duration: Date().timeIntervalSince(dragStartTime ?? Date()),
                                pointCount: currentTrailPoints.count
                            )

                            // 軌跡を保存（タップ以外）
                            if gestureType != .tap && currentTrailPoints.count >= 2 {
                                let trail = GestureTrail(
                                    points: simplifyPoints(currentTrailPoints),
                                    gestureType: gestureType,
                                    startTime: dragStartTime ?? Date()
                                )
                                completedTrails.append(trail)

                                // 古い軌跡を自動削除
                                DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
                                    completedTrails.removeAll { $0.id == trail.id }
                                }
                            }

                            // リップルエフェクト（タップ時）
                            if settings.showRipple && gestureType == .tap {
                                addRipple(at: endLocation)
                            }

                            // リセット
                            currentTrailPoints = []
                            dragStartTime = nil
                            dragStartLocation = nil

                            // ポインターをフェードアウト
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
                                withAnimation(.easeOut(duration: 0.3)) {
                                    isTouching = false
                                }
                            }
                        }
                )

            // 完了した軌跡の描画
            ForEach(completedTrails) { trail in
                TrailPathView(
                    trail: trail,
                    color: settings.selectedColor.color,
                    lineWidth: settings.trailWidth
                )
            }

            // ドラッグ中の軌跡（リアルタイム）
            if isTouching && currentTrailPoints.count >= 2 {
                TrailShape(points: currentTrailPoints)
                    .stroke(
                        settings.selectedColor.color.opacity(0.6),
                        style: StrokeStyle(
                            lineWidth: settings.trailWidth,
                            lineCap: .round,
                            lineJoin: .round
                        )
                    )

                // ドット（軌跡上に点を表示）
                ForEach(Array(stride(from: 0, to: currentTrailPoints.count, by: max(1, currentTrailPoints.count / 8))), id: \.self) { i in
                    Circle()
                        .fill(settings.selectedColor.color.opacity(0.3))
                        .frame(width: 8, height: 8)
                        .position(currentTrailPoints[i])
                }
            }

            // リップルエフェクト
            ForEach(ripples) { ripple in
                RippleView(color: settings.selectedColor.color, size: settings.pointerSize)
                    .position(ripple.location)
            }

            // ポインター
            if isTouching, let location = touchLocation {
                PointerView(settings: settings)
                    .position(location)
                    .animation(.interactiveSpring(response: 0.05), value: location.x)
                    .animation(.interactiveSpring(response: 0.05), value: location.y)
            }

            // 操作ガイド
            VStack {
                HStack {
                    Button(action: { dismiss() }) {
                        HStack(spacing: 4) {
                            Image(systemName: "chevron.left")
                            Text("設定に戻る")
                        }
                        .font(.caption)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(.ultraThinMaterial)
                        .cornerRadius(20)
                    }
                    Spacer()
                }
                .padding(.horizontal)
                .padding(.top, 60)

                if showGuide {
                    Spacer()
                    VStack(spacing: 12) {
                        Image(systemName: "hand.draw")
                            .font(.system(size: 48))
                            .foregroundColor(.secondary)
                        Text("画面をタッチ・スワイプしてください")
                            .font(.callout)
                            .foregroundColor(.secondary)
                        Text("ジェスチャーが自動で検出・表示されます")
                            .font(.caption)
                            .foregroundColor(.secondary.opacity(0.7))
                    }
                    .padding()
                    .background(.ultraThinMaterial)
                    .cornerRadius(16)
                    Spacer()
                }

                Spacer()
            }
        }
        .navigationBarHidden(true)
        .ignoresSafeArea()
    }

    // MARK: - ジェスチャー検出

    private func detectGesture(start: CGPoint, end: CGPoint, duration: TimeInterval, pointCount: Int) -> GestureType {
        let dx = end.x - start.x
        let dy = end.y - start.y
        let distance = sqrt(dx * dx + dy * dy)

        // タップ判定: 移動距離が小さく短時間
        if distance < 15 && duration < 0.3 {
            return .tap
        }

        // 長押し判定: 移動距離が小さく長時間
        if distance < 15 && duration >= 0.5 {
            return .longPress
        }

        // スワイプ判定: 移動距離が大きく短〜中時間
        if distance >= 50 {
            let angle = atan2(dy, dx)
            // 水平方向のスワイプ
            if abs(angle) < .pi / 4 {
                return .swipeRight
            } else if abs(angle) > 3 * .pi / 4 {
                return .swipeLeft
            } else if angle < 0 {
                return .swipeUp
            } else {
                return .swipeDown
            }
        }

        return .drag
    }

    // MARK: - 軌跡の簡略化（ポイント数を減らす）

    private func simplifyPoints(_ points: [CGPoint]) -> [CGPoint] {
        guard points.count > 20 else { return points }
        let step = max(1, points.count / 20)
        var simplified: [CGPoint] = []
        for i in stride(from: 0, to: points.count, by: step) {
            simplified.append(points[i])
        }
        if let last = points.last, simplified.last != last {
            simplified.append(last)
        }
        return simplified
    }

    // MARK: - リップル

    private func addRipple(at location: CGPoint) {
        let ripple = RippleInfo(location: location)
        ripples.append(ripple)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
            ripples.removeAll { $0.id == ripple.id }
        }
    }
}

// MARK: - リップル

struct RippleInfo: Identifiable {
    let id = UUID()
    let location: CGPoint
}

struct RippleView: View {
    let color: Color
    let size: CGFloat

    @State private var scale: CGFloat = 1.0
    @State private var opacity: Double = 0.6

    var body: some View {
        Circle()
            .stroke(color.opacity(opacity), lineWidth: 2)
            .frame(width: size * scale, height: size * scale)
            .onAppear {
                withAnimation(.easeOut(duration: 0.5)) {
                    scale = 3.0
                    opacity = 0.0
                }
            }
    }
}
