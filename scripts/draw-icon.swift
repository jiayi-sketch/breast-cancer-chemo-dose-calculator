// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
import AppKit

let output = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
for size in [16, 32, 128, 256, 512] {
    for scale in [1, 2] {
        let pixels = size * scale
        let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: pixels, pixelsHigh: pixels,
                                      bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                                      colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
        NSGraphicsContext.saveGraphicsState()
        NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
        let factor = CGFloat(pixels) / 1024
        let transform = AffineTransform(scale: factor)
        (transform as NSAffineTransform).concat()
        NSColor(red: 0.13, green: 0.36, blue: 0.46, alpha: 1).setFill()
        NSBezierPath(roundedRect: NSRect(x: 70, y: 70, width: 884, height: 884), xRadius: 194, yRadius: 194).fill()
        let root = NSBezierPath()
        root.move(to: NSPoint(x: 235, y: 474))
        root.line(to: NSPoint(x: 330, y: 474))
        root.line(to: NSPoint(x: 405, y: 295))
        root.line(to: NSPoint(x: 535, y: 722))
        root.line(to: NSPoint(x: 798, y: 722))
        root.lineWidth = 54; root.lineJoinStyle = .round; root.lineCapStyle = .round
        NSColor.white.setStroke(); root.stroke()
        NSColor(red: 0.69, green: 0.86, blue: 0.89, alpha: 1).setFill()
        for y in [410, 525] {
            NSBezierPath(roundedRect: NSRect(x: 584, y: y, width: 211, height: 39), xRadius: 19, yRadius: 19).fill()
        }
        NSGraphicsContext.restoreGraphicsState()
        let suffix = scale == 2 ? "@2x" : ""
        let url = output.appendingPathComponent("icon_\(size)x\(size)\(suffix).png")
        try bitmap.representation(using: .png, properties: [:])!.write(to: url)
    }
}
