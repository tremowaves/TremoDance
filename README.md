# Dancing Girl - Beat Reactive 3D Application

Ứng dụng 3D tương tác với âm nhạc, sử dụng Three.js để hiển thị nhân vật 3D phản ứng với beat của âm nhạc.

## Cấu Trúc Project

```
dancing-girl/
├── index.html          # File HTML chính
├── style.css           # CSS styling
├── main.js             # JavaScript logic chính
├── models/
│   └── dancing_girl.glb    # Model 3D nhân vật
├── audio/
│   └── sample_music.mp3    # File âm nhạc mẫu
└── libs/
    ├── three.min.js        # Three.js library (placeholder)
    ├── GLTFLoader.js       # GLTF Loader (placeholder)
    └── beat-detector.js    # Beat detection library (placeholder)
```

## Tính Năng

- **3D Character Rendering**: Hiển thị nhân vật 3D với animation
- **Audio Analysis**: Phân tích âm nhạc real-time
- **Beat Detection**: Phát hiện beat và BPM
- **Reactive Animations**: Animation thay đổi theo cường độ âm nhạc
- **Dynamic Lighting**: Ánh sáng thay đổi theo beat
- **Camera Movement**: Camera di chuyển tạo cảm giác động

## Cách Sử Dụng

1. **Chạy Server Local**:
   ```bash
   # Sử dụng Python
   python -m http.server 8000
   
   # Hoặc Node.js
   npx http-server
   ```

2. **Mở Trình Duyệt**:
   - Truy cập `http://localhost:8000`
   - Click vào màn hình để kích hoạt audio context

3. **Tải File Âm Nhạc**:
   - Click "Choose File" để chọn file âm nhạc
   - Hệ thống sẽ tự động phân tích BPM
   - Click "Play" để bắt đầu

4. **Xem Kết Quả**:
   - Nhân vật sẽ nhảy theo beat
   - Ánh sáng thay đổi theo cường độ âm nhạc
   - Camera di chuyển tạo hiệu ứng động

## Animation Mapping

- **Idle_Dance**: Khi âm nhạc yếu
- **Samba_Dancing**: Khi âm nhạc trung bình
- **Jazz_Dance**: Khi có snare hits
- **Hip_Hop_Dancing**: Khi có bass mạnh

## Yêu Cầu Kỹ Thuật

- Trình duyệt hỗ trợ WebGL
- Hỗ trợ Web Audio API
- File âm nhạc định dạng: MP3, WAV, OGG

## Troubleshooting

- **Audio không hoạt động**: Click vào màn hình để kích hoạt audio context
- **Model không hiển thị**: Kiểm tra file `dancing_girl.glb` trong thư mục `models/`
- **Animation không chạy**: Kiểm tra tên animation trong file GLB

## Development

Để phát triển thêm tính năng:

1. **Thêm Animation**: Cập nhật tên animation trong `main.js`
2. **Thay đổi Lighting**: Chỉnh sửa `setupLighting()` function
3. **Tùy chỉnh Beat Detection**: Điều chỉnh threshold trong `analyzeAudio()` 