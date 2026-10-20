# LAB 3 - Thanh toán học phí

Hai service Express độc lập, lưu dữ liệu trong bộ nhớ. Cần Node.js 18 trở lên.

## Cài đặt và chạy

Mở hai terminal tại thư mục `lab3-payment`:

```bash
cd fee-service
npm install
npm start
```

```bash
cd bank-service
npm install
npm start
```

Fee Service chạy cổng 4001; Bank Service chạy cổng 4002. Cả hai đọc `.env` riêng. Thay đổi cấu hình ngân hàng cần khởi động lại Bank Service.

## API

- `GET /students/:id/fees`: công nợ ban đầu của sinh viên 1 là 50.000.000đ, sinh viên 2 là 0đ, sinh viên 3 là 3.200.000đ.
- `POST /students/:id/payments` với JSON `{"amount":100000}`: tạo thanh toán và trả `201/PAID`, hoặc lỗi có `error`, `paymentId`, `status`.
- `POST /charges` ở Bank Service cần `Idempotency-Key` và JSON `{"reference":"P1","amount":100000}`. Giới hạn ngân hàng là 20.000.000đ.
- `GET /stats` ở Bank Service trả số kết nối TCP mới, requests, charges duy nhất và số lần trừ trùng.

Fee Service sử dụng HTTP keep-alive với tối đa 10 socket, timeout ngân hàng mặc định 4 giây, và tối đa 5 lần retry (6 lần gửi tính cả lần đầu) cho lỗi 500 hoặc kết nối bị reset. Mỗi lần thử giữ nguyên `Idempotency-Key`. Timeout/đứt kết nối không xác định được kết quả trả `504/PENDING`; khoản tiền này được giữ chỗ để tránh nhận thêm thanh toán vượt công nợ khi chưa rõ kết quả. Từ chối rõ ràng giữ HTTP status ngân hàng; không kết nối được trả `503/FAILED`.

## Biến môi trường

`fee-service/.env`:

- `BANK_URL` (mặc định `http://localhost:4002`)
- `PORT` (mặc định `4001`)
- `BANK_TIMEOUT_MS` (mặc định `4000`)
- `BANK_MAX_RETRIES` (mặc định `5`)

`bank-service/.env`:

- `PORT` (mặc định `4002`)
- `DELAY_MS` (mặc định `0`)
- `FAIL_RATE` (mặc định `0`, từ 0 đến 1)
- `DROP_RATE` (mặc định `0`, từ 0 đến 1)

## Kiểm thử

Chạy các lệnh từ thư mục `lab3-payment` khi hai service đang hoạt động:

```bash
node scripts/load-test.js
node scripts/scenario-test.js drop
node scripts/scenario-test.js fail
node scripts/scenario-test.js limit
```

Load test gửi 200 thanh toán, đồng thời tối đa 10 yêu cầu, mỗi giao dịch 1.000đ; in thời gian, số kết nối trước/sau và kết quả. Script tình huống in số PAID, PENDING, công nợ giảm, charges và duplicates.

Các bài cần khởi động lại ngân hàng với cấu hình riêng:

1. **Ngân hàng tắt:** dừng Bank Service rồi chạy `node scripts/scenario-test.js offline`. Khởi động Bank Service lại và thử thanh toán; Fee Service không cần khởi động lại.
2. **Chậm:** đặt `DELAY_MS=5000`, khởi động lại Bank Service, chạy `node scripts/scenario-test.js slow`. GET fees vẫn có thể được gọi song song.
3. **Kết nối:** chạy `node scripts/load-test.js`, chờ 6 giây, rồi chạy lại để xác nhận kết nối mới hoạt động.
4. **Rớt kết nối:** đặt `DROP_RATE=0.3`, khởi động lại Bank Service, chạy `node scripts/scenario-test.js drop`. Sau đó thử `FAIL_RATE=0.3` với `node scripts/scenario-test.js fail`. Đặt lại `DROP_RATE=0` và `FAIL_RATE=0` sau kiểm thử.

Service và script dùng dữ liệu trong bộ nhớ; khởi động lại service sẽ đặt lại công nợ, payment ID, charges và thống kê.