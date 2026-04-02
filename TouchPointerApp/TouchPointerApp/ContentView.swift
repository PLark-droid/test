import SwiftUI

struct ContentView: View {
    @StateObject private var settings = PointerSettings()

    var body: some View {
        NavigationView {
            VStack(spacing: 30) {
                Text("Touch Pointer")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("画面収録時にタッチ位置を\nお客様に分かりやすく表示します")
                    .font(.body)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)

                // プレビューエリア
                PreviewArea(settings: settings)
                    .frame(height: 200)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .padding(.horizontal)

                // 設定
                VStack(spacing: 16) {
                    // ポインターサイズ
                    HStack {
                        Text("サイズ")
                            .frame(width: 80, alignment: .leading)
                        Slider(value: $settings.pointerSize, in: 20...80, step: 5)
                        Text("\(Int(settings.pointerSize))")
                            .frame(width: 30)
                    }

                    // ポインター色
                    HStack {
                        Text("カラー")
                            .frame(width: 80, alignment: .leading)
                        ForEach(PointerColor.allCases, id: \.self) { color in
                            Circle()
                                .fill(color.color)
                                .frame(width: 36, height: 36)
                                .overlay(
                                    Circle()
                                        .stroke(Color.primary, lineWidth: settings.selectedColor == color ? 3 : 0)
                                )
                                .onTapGesture {
                                    settings.selectedColor = color
                                }
                        }
                        Spacer()
                    }

                    // 軌跡の太さ
                    HStack {
                        Text("軌跡の太さ")
                            .frame(width: 80, alignment: .leading)
                        Slider(value: $settings.trailWidth, in: 2...10, step: 1)
                        Text("\(Int(settings.trailWidth))")
                            .frame(width: 30)
                    }

                    // リップルエフェクト
                    Toggle("タップ時のリップルエフェクト", isOn: $settings.showRipple)

                    // ジェスチャーラベル
                    Toggle("ジェスチャー名を表示", isOn: $settings.showGestureLabel)
                }
                .padding(.horizontal, 24)

                Spacer()

                // 開始ボタン
                NavigationLink(destination: PointerOverlayView(settings: settings)) {
                    Text("ポインター表示を開始")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .cornerRadius(14)
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 20)
            }
            .navigationBarHidden(true)
        }
    }
}

// MARK: - プレビューエリア

struct PreviewArea: View {
    @ObservedObject var settings: PointerSettings
    @State private var previewLocation: CGPoint = CGPoint(x: 150, y: 100)
    @State private var isTouching = false
    @State private var showRippleAnimation = false

    var body: some View {
        ZStack {
            // 背景
            LinearGradient(
                colors: [Color.gray.opacity(0.1), Color.gray.opacity(0.2)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            Text("ここをタッチしてプレビュー")
                .font(.caption)
                .foregroundColor(.secondary)

            // リップル
            if settings.showRipple && showRippleAnimation {
                Circle()
                    .stroke(settings.selectedColor.color.opacity(0.4), lineWidth: 2)
                    .frame(width: settings.pointerSize * 2.5, height: settings.pointerSize * 2.5)
                    .position(previewLocation)
                    .transition(.scale.combined(with: .opacity))
            }

            // ポインター
            if isTouching {
                PointerView(settings: settings)
                    .position(previewLocation)
            }
        }
        .gesture(
            DragGesture(minimumDistance: 0)
                .onChanged { value in
                    previewLocation = value.location
                    isTouching = true
                }
                .onEnded { _ in
                    if settings.showRipple {
                        withAnimation(.easeOut(duration: 0.4)) {
                            showRippleAnimation = true
                        }
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                            showRippleAnimation = false
                        }
                    }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                        isTouching = false
                    }
                }
        )
    }
}

#Preview {
    ContentView()
}
