# Long Dashboards

Long Dashboards là một web app quản lý cá nhân được xây dựng bằng Next.js và Supabase. Ứng dụng tập trung vào các nhu cầu hằng ngày như task, goal, note, schedule, category và tag, với mục tiêu giữ giao diện gọn, rõ và dễ dùng trên cả desktop lẫn mobile.

## Tính năng chính

- Dashboard tổng quan với task quá hạn, task hôm nay và lịch trong ngày.
- Quản lý tasks, goals, notes, schedules, categories và tags qua các route riêng.
- Xác thực người dùng bằng Supabase Auth thông qua `AuthProvider`.
- UI đang được xây theo hướng tối giản, hiện đại và ưu tiên tốc độ đọc.

## Công nghệ sử dụng

- Next.js App Router
- React 19
- JavaScript, không dùng TypeScript
- Tailwind CSS
- Supabase
- shadcn/ui
- lucide-react

## Cấu trúc chính

- `src/app/page.js`: Dashboard
- `src/app/login/page.js`: Đăng nhập
- `src/app/tasks/page.js`: Tasks
- `src/app/goals/page.js`: Goals
- `src/app/notes/page.js`: Notes
- `src/app/schedules/page.js`: Schedules
- `src/app/categories/page.js`: Categories
- `src/app/tags/page.js`: Tags
- `src/app/layout.js`: Root layout, bọc `AuthProvider`
- `src/components/layout-wrapper.js`: Wrapper layout dùng chung
- `src/lib/supabase.js`: Khởi tạo Supabase client
- `src/lib/auth-context.js`: Auth context

## Yêu cầu môi trường

Node.js 18+ và một dự án Supabase đã cấu hình sẵn.

Biến môi trường thường dùng:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Cài đặt và chạy local

```bash
npm install
npm run dev
```

Sau khi chạy, mở `http://localhost:3000`.

## Scripts

```bash
npm run dev
npm run build
npm run start
```

## Ghi chú phát triển

- App dùng `src/` làm gốc cho mã nguồn.
- Logic gọi Supabase đang nằm trực tiếp trong các page component.
- Khi chỉnh UI, nên giữ nguyên route, schema và luồng auth hiện có.

## Hướng phát triển tiếp theo

- Thêm layout điều hướng chung cho desktop và mobile.
- Chuẩn hóa empty state, loading state và progress UI.
- Cải thiện responsive để dùng tốt trên điện thoại.
