import SwiftUI

struct DemoView: View {
    @ObservedObject var settings: PointerSettings
    let screenshots: [UIImage]

    @Environment(\.dismiss) private var dismiss
    @State private var currentPage: Int = 0

    // タッチ状態
    @State private var touchLocation: CGPoint? = nil
    @State private var isTouching = false
    @State private var ripples: [RippleInfo] = []

    // 軌跡
    @State private var currentTrailPoints: [CGPoint] = []
    @State private var completedTrails: [GestureTrail] = []
    @State private var dragStartTime: Date? = nil

    // UI
    @State private var showControls = true

    var body: some View {
        ZStack {
            // 背景を黒に
            Color.black.ignoresSafeArea()

            // スクリーンショット or 空白画面
            if !screenshots.isEmpty {
                Image(uiImage: screenshots[currentPage])
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .ignoresSafeArea()
            }

            // タッチ検出レイヤー（全画面）
            Color.clear
                .contentShape(Rectangle())
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .onChanged { value in
                            touchLocation = value.location
                            isTouching = true
                            showControls = false

                            if dragStartTime == nil {
                                dragStartTime = Date()
                            }
                            currentTrailPoints.append(value.location)
                        }
                        .onEnded { value in
                            let gestureType = detectGesture(
                                start: value.startLocation,
                                end: value.location,
                                duration: Date().timeIntervalSince(dragStartTime ?? Date()),
                                pointCount: currentTrailPoints.count
                            )

                            // スワイプでページ切り替え
                            if !screenshots.isEmpty {
                                if gestureType == .swipeLeft && currentPage < screenshots.count - 1 {
                                    withAnimation { currentPage += 1 }
                                } else if gestureType == .swipeRight && currentPage > 0 {
                                    withAnimation { currentPage -= 1 }
                                }
                            }

                            // 軌跡保存
                            if gestureType != .tap && currentTrailPoints.count >= 2 {
                                let trail = GestureTrail(
                                    points: simplifyPoints(currentTrailPoints),
                                    gestureType: gestureType,
                                    startTime: dragStartTime ?? Date()
                                )
                                completedTrails.append(trail)
                                DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
                                    completedTrails.removeAll { $0.id == trail.id }
                                }
                            }

                            // リップル
                            if settings.showRipple && gestureType == .tap {
                                addRipple(at: value.location)
                            }

                            // リセット
                            currentTrailPoints = []
                            dragStartTime = nil

                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
                                withAnimation(.easeOut(duration: 0.3)) {
                                    isTouching = false
                                }
                            }
                        }
                )

            // 軌跡描画
            ForEach(completedTrails) { trail in
                TrailPathView(
                    trail: trail,
                    color: settings.selectedColor.color,
                    lineWidth: settings.trailWidth
                )
            }

            // リアルタイム軌跡
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
            }

            // リップル
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

            // コントロールバー
            VStack {
                if showControls {
                    HStack {
                        Button {
                            dismiss()
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: "chevron.left")
                                Text("戻る")
                            }
                            .font(.caption)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(.ultraThinMaterial)
                            .cornerRadius(20)
                        }

                        Spacer()

                        if !screenshots.isEmpty {
                            Text("\(currentPage + 1) / \(screenshots.count)")
                                .font(.caption)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(.ultraThinMaterial)
                                .cornerRadius(20)
                        }

                        Spacer()

                        // 画面収録の説明
                        Button {
                            // コントロール非表示
                            showControls = false
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: "record.circle")
                                Text("非表示")
                            }
                            .font(.caption)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(.ultraThinMaterial)
                            .cornerRadius(20)
                        }
                    }
                    .padding(.horizontal)
                    .padding(.top, 60)
                }

                Spacer()

                // ページ切り替えボタン（複数枚の場合）
                if showControls && screenshots.count > 1 {
                    HStack(spacing: 20) {
                        Button {
                            if currentPage > 0 {
                                withAnimation { currentPage -= 1 }
                            }
                        } label: {
                            Image(systemName: "chevron.left.circle.fill")
                                .font(.title)
                                .foregroundColor(.white)
                                .shadow(radius: 3)
                        }
                        .opacity(currentPage > 0 ? 1 : 0.3)

                        // ページドット
                        HStack(spacing: 6) {
                            ForEach(0..<screenshots.count, id: \.self) { i in
                                Circle()
                                    .fill(i == currentPage ? Color.white : Color.white.opacity(0.4))
                                    .frame(width: 8, height: 8)
                            }
                        }

                        Button {
                            if currentPage < screenshots.count - 1 {
                                withAnimation { currentPage += 1 }
                            }
                        } label: {
                            Image(systemName: "chevron.right.circle.fill")
                                .font(.title)
                                .foregroundColor(.white)
                                .shadow(radius: 3)
                        }
                        .opacity(currentPage < screenshots.count - 1 ? 1 : 0.3)
                    }
                    .padding(.bottom, 40)
                }
            }
        }
        .navigationBarHidden(true)
        .ignoresSafeArea()
        .statusBarHidden(true)
        .onTapGesture(count: 3) {
            // トリプルタップでコントロール表示/非表示
            showControls.toggle()
        }
    }

    // MARK: - ジェスチャー検出

    private func detectGesture(start: CGPoint, end: CGPoint, duration: TimeInterval, pointCount: Int) -> GestureType {
        let dx = end.x - start.x
        let dy = end.y - start.y
        let distance = sqrt(dx * dx + dy * dy)

        if distance < 15 && duration < 0.3 {
            return .tap
        }
        if distance < 15 && duration >= 0.5 {
            return .longPress
        }
        if distance >= 50 {
            let angle = atan2(dy, dx)
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

    private func addRipple(at location: CGPoint) {
        let ripple = RippleInfo(location: location)
        ripples.append(ripple)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
            ripples.removeAll { $0.id == ripple.id }
        }
    }
}
