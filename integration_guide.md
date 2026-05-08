# Hướng dẫn triển khai Pub/Sub cho Fanpage Manager và AutoReels

Để hệ thống này hoạt động, chúng ta cần thực hiện các thay đổi sau ở mỗi dự án.

## 1. Tại Fanpage AI Manager (Người gửi yêu cầu)

Dịch vụ này đóng vai trò là **Publisher** (Người phát sự kiện).

### Các bước thực hiện:
1. **Cài đặt axios**: `npm install axios`
2. **Copy Client**: Copy file `EventBusClient` (từ `event-bus-service/src/client.ts`) vào thư mục `src/lib/` hoặc `src/services/`.
3. **Sử dụng trong Video Service**:
   Khi người dùng nhấn "Tạo Video" hoặc khi đến lịch tự động, thay vì gọi API trực tiếp tới AutoReels, hãy gửi sự kiện qua Event Bus.

```typescript
// Ví dụ trong videoController.ts
import { EventBusClient } from './lib/EventBusClient';

const eb = new EventBusClient(process.env.EVENT_BUS_URL);

async function handleCreateVideo(req, res) {
  const reelData = {
    reelId: "uuid-123",
    title: "Video mới",
    script: "...",
    // ... metadata khác
  };

  // 1. Lưu vào Database cục bộ với trạng thái 'PENDING'
  await db.videoTask.create({ data: { ...reelData, status: 'PENDING' } });

  // 2. Phát sự kiện lên Event Bus
  await eb.publish('REEL_REQUESTED', reelData);

  res.json({ message: "Đã đưa vào hàng chờ xử lý" });
}
```

---

## 2. Tại AutoReels (Người xử lý video)

Dịch vụ này đóng vai trò là **Subscriber/Worker** (Người tiêu thụ sự kiện) và cũng là **Publisher** để báo cáo trạng thái.

### Các bước thực hiện:
1. **Cài đặt dependencies**: `npm install ioredis axios`
2. **Triển khai Worker**: Tạo một file mới (ví dụ `src/worker.ts`) để lắng nghe Redis Stream.
3. **Cấu trúc Worker**:

```typescript
import Redis from 'ioredis';
import { EventBusClient } from './client';

const redis = new Redis(process.env.REDIS_URL);
const eb = new EventBusClient(process.env.EVENT_BUS_URL);

async function startWorker() {
  console.log("🚀 AutoReels Worker đang lắng nghe...");

  while (true) {
    // Đọc sự kiện mới từ stream 'reels_stream'
    // Sử dụng XREAD để lấy dữ liệu mới nhất
    const results = await redis.xread('BLOCK', 0, 'STREAMS', 'reels_stream', '$');
    
    if (results) {
      const [stream, messages] = results[0];
      for (const [id, [_, data]] of messages) {
        const eventData = JSON.parse(data as string);
        
        if (eventData.event === 'REEL_REQUESTED') {
          await processVideo(eventData.payload);
        }
      }
    }
  }
}

async function processVideo(payload: any) {
  const { reelId } = payload;

  // 1. Báo cáo bắt đầu xử lý
  await eb.publish('REEL_PROCESSING', { reelId, status: 'started' });

  try {
    // 2. Chạy logic render video hiện tại của bạn
    const result = await renderVideoLogic(payload);

    // 3. Báo cáo hoàn tất
    await eb.publish('REEL_COMPLETED', { 
      reelId, 
      videoUrl: result.url,
      thumbnailUrl: result.thumb
    });
  } catch (error) {
    // 4. Báo cáo lỗi nếu có
    await eb.publish('REEL_FAILED', { reelId, error: error.message });
  }
}

startWorker();
```

---

## 3. Cấu hình Môi trường (.env)

Đảm bảo cả hai dự án đều có biến môi trường trỏ về Event Bus:

**Fanpage Manager:**
```env
EVENT_BUS_URL=http://localhost:4000
```

**AutoReels:**
```env
EVENT_BUS_URL=http://localhost:4000
REDIS_URL=redis://localhost:6379
```

---

## Lợi ích sau khi triển khai:
- **Tách biệt hoàn toàn**: Fanpage Manager không cần biết AutoReels đang chạy ở đâu hay có bị sập hay không.
- **Tính hàng chờ**: Nếu AutoReels đang bận, các yêu cầu sẽ nằm trong Redis Stream và được xử lý tuần tự ngay khi có tài nguyên.
- **Real-time Monitoring**: Bạn có thể mở Dashboard của Event Bus để xem mọi thứ đang diễn ra như thế nào.
