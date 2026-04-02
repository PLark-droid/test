import SwiftUI

struct PointerView: View {
    @ObservedObject var settings: PointerSettings

    var body: some View {
        ZStack {
            // 外側の半透明リング
            Circle()
                .stroke(settings.selectedColor.color.opacity(0.5), lineWidth: 3)
                .frame(width: settings.pointerSize, height: settings.pointerSize)

            // 内側の塗りつぶし
            Circle()
                .fill(settings.selectedColor.color.opacity(0.35))
                .frame(width: settings.pointerSize, height: settings.pointerSize)

            // 中心点
            Circle()
                .fill(settings.selectedColor.color)
                .frame(width: settings.pointerSize * 0.25, height: settings.pointerSize * 0.25)
        }
    }
}
