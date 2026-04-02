import SwiftUI
import PhotosUI

struct ContentView: View {
    @StateObject private var settings = PointerSettings()
    @State private var showImagePicker = false
    @State private var screenshots: [UIImage] = []
    @State private var navigateToDemo = false

    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                Text("Touch Pointer")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("アプリのスクショを読み込んで\nタッチ操作をお客様に見せられます")
                    .font(.body)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)

                // スクショ一覧
                if !screenshots.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(Array(screenshots.enumerated()), id: \.offset) { index, image in
                                ZStack(alignment: .topTrailing) {
                                    Image(uiImage: image)
                                        .resizable()
                                        .aspectRatio(contentMode: .fit)
                                        .frame(height: 180)
                                        .cornerRadius(12)
                                        .shadow(radius: 3)

                                    // 削除ボタン
                                    Button {
                                        screenshots.remove(at: index)
                                    } label: {
                                        Image(systemName: "xmark.circle.fill")
                                            .font(.title3)
                                            .foregroundColor(.white)
                                            .shadow(radius: 2)
                                    }
                                    .padding(6)
                                }
                            }
                        }
                        .padding(.horizontal)
                    }
                    .frame(height: 200)

                    Text("\(screenshots.count)枚のスクショを読み込み済み")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                // スクショ追加ボタン
                Button {
                    showImagePicker = true
                } label: {
                    HStack {
                        Image(systemName: "photo.on.rectangle.angled")
                        Text(screenshots.isEmpty ? "Larkのスクショを選択" : "スクショを追加")
                    }
                    .font(.headline)
                    .foregroundColor(.blue)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(14)
                }
                .padding(.horizontal, 24)

                // 設定
                VStack(spacing: 14) {
                    HStack {
                        Text("ポインターサイズ")
                            .font(.subheadline)
                            .frame(width: 110, alignment: .leading)
                        Slider(value: $settings.pointerSize, in: 20...80, step: 5)
                        Text("\(Int(settings.pointerSize))")
                            .frame(width: 30)
                    }

                    HStack {
                        Text("カラー")
                            .font(.subheadline)
                            .frame(width: 110, alignment: .leading)
                        ForEach(PointerColor.allCases, id: \.self) { color in
                            Circle()
                                .fill(color.color)
                                .frame(width: 32, height: 32)
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

                    HStack {
                        Text("軌跡の太さ")
                            .font(.subheadline)
                            .frame(width: 110, alignment: .leading)
                        Slider(value: $settings.trailWidth, in: 2...10, step: 1)
                        Text("\(Int(settings.trailWidth))")
                            .frame(width: 30)
                    }

                    Toggle("リップルエフェクト", isOn: $settings.showRipple)
                        .font(.subheadline)
                    Toggle("ジェスチャー名を表示", isOn: $settings.showGestureLabel)
                        .font(.subheadline)
                }
                .padding(.horizontal, 24)

                Spacer()

                // デモ開始ボタン
                NavigationLink(
                    destination: DemoView(settings: settings, screenshots: screenshots),
                    isActive: $navigateToDemo
                ) {
                    EmptyView()
                }

                Button {
                    navigateToDemo = true
                } label: {
                    Text(screenshots.isEmpty ? "スクショなしで開始" : "デモを開始（\(screenshots.count)枚）")
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
            .sheet(isPresented: $showImagePicker) {
                ImagePicker(images: $screenshots)
            }
        }
        .navigationViewStyle(.stack)
    }
}

// MARK: - 写真ピッカー（複数選択対応）

struct ImagePicker: UIViewControllerRepresentable {
    @Binding var images: [UIImage]
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> PHPickerViewController {
        var config = PHPickerConfiguration()
        config.selectionLimit = 20
        config.filter = .images
        let picker = PHPickerViewController(configuration: config)
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: PHPickerViewController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, PHPickerViewControllerDelegate {
        let parent: ImagePicker

        init(_ parent: ImagePicker) {
            self.parent = parent
        }

        func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
            parent.dismiss()
            for result in results {
                result.itemProvider.loadObject(ofClass: UIImage.self) { object, _ in
                    if let image = object as? UIImage {
                        DispatchQueue.main.async {
                            self.parent.images.append(image)
                        }
                    }
                }
            }
        }
    }
}

#Preview {
    ContentView()
}
