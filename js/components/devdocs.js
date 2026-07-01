/**
 * components/devdocs.js
 * DevDocs Offline Viewer Component
 * - Cung cấp kho tài liệu lập trình offline với các thư mục theo ảnh mẫu.
 * - Cho phép lọc tìm kiếm nhanh chóng các chủ đề.
 * - Giao diện 2 cột: Cột trái cây thư mục collapsible, cột phải tài liệu hiển thị dạng tab.
 */

// ── CƠ SỞ DỮ LIỆU TÀI LIỆU OFFLINE ────────────────────────────────────
const DEVDOCS_DATABASE = [
  {
    folder: 'Dev',
    icon: 'fas fa-laptop-code',
    topics: [
      {
        id: 'git-cheatsheet',
        title: 'Git Cheatsheet (Lệnh Cơ Bản)',
        doc: `
          <h3>Hệ thống lệnh Git cơ bản thường dùng</h3>
          <p>Git là hệ thống quản lý phiên bản phân tán giúp theo dõi lịch sử mã nguồn.</p>
          <ul class="devdocs-list">
            <li><strong>git init:</strong> Khởi tạo một Git repository mới tại thư mục hiện tại.</li>
            <li><strong>git clone &lt;url&gt;:</strong> Tải dự án từ server từ xa về máy cục bộ.</li>
            <li><strong>git add &lt;file&gt;:</strong> Đưa tệp vào khu vực staging để chuẩn bị commit.</li>
            <li><strong>git commit -m "mess":</strong> Lưu lại ảnh chụp trạng thái code kèm thông điệp giải thích.</li>
            <li><strong>git status:</strong> Xem danh sách các file thay đổi chưa lưu.</li>
          </ul>
        `,
        code: `// Quy trình Git hàng ngày
git status
git add .
git commit -m "feat: thêm tính năng mới"
git push origin main`,
        notes: 'Luôn tạo nhánh mới trước khi thực hiện viết code tính năng mới.'
      },
      {
        id: 'clean-code',
        title: 'Clean Code Principles (Nguyên tắc Sạch)',
        doc: `
          <h3>Quy tắc viết code sạch dễ bảo trì</h3>
          <p>Viết code sao cho người khác đọc vào hiểu ngay là mục tiêu cốt lõi của lập trình viên chuyên nghiệp.</p>
          <ul class="devdocs-list">
            <li><strong>Đặt tên có ý nghĩa:</strong> Tên biến, hàm phải phản ánh đúng chức năng, tránh đặt a, b, c vô nghĩa.</li>
            <li><strong>Hàm đơn nhiệm (Single Responsibility):</strong> Mỗi hàm chỉ nên làm một việc duy nhất và làm thật tốt.</li>
            <li><strong>Tránh lặp code (DRY - Don't Repeat Yourself):</strong> Trích xuất mã trùng lặp thành hàm dùng chung.</li>
            <li><strong>Chú thích rõ ràng:</strong> Chỉ chú thích tại sao làm vậy, không nên giải thích code đang làm gì (vì code tự giải nghĩa).</li>
          </ul>
        `,
        code: `// TỒI
function calculate(d) {
  return d * 1.1;
}

// TỐT
const VAT_RATE = 1.1;
function calculatePriceWithVat(basePrice) {
  return basePrice * VAT_RATE;
}`,
        notes: 'Code chạy được là tốt, nhưng code sạch và dễ đọc còn tốt hơn nhiều.'
      }
    ]
  },
  {
    folder: 'C#',
    icon: 'fab fa-microsoft',
    topics: [
      {
        id: 'csharp-linq',
        title: 'C# LINQ (Language Integrated Query)',
        doc: `
          <h3>Tất tần tật về LINQ trong C#</h3>
          <p>LINQ cho phép truy vấn dữ liệu trực tiếp trong C# từ mảng, List, XML hay Database.</p>
          <ul class="devdocs-list">
            <li><strong>Select:</strong> Chiếu hoặc chuyển đổi kiểu dữ liệu của các phần tử.</li>
            <li><strong>Where:</strong> Lọc các phần tử theo điều kiện chỉ định.</li>
            <li><strong>OrderBy:</strong> Sắp xếp tăng dần hoặc giảm dần (OrderByDescending).</li>
            <li><strong>FirstOrDefault:</strong> Lấy phần tử đầu tiên thỏa mãn hoặc trả về null mặc định.</li>
          </ul>
        `,
        code: `using System;
using System.Linq;
using System.Collections.Generic;

var numbers = new List<int> { 1, 2, 3, 4, 5, 6 };
var evenNumbers = numbers.Where(n => n % 2 == 0).ToList();

foreach (var num in evenNumbers) {
    Console.WriteLine(num); // 2, 4, 6
}`,
        notes: 'LINQ giúp code gọn hơn nhưng hãy cẩn thận hiệu năng khi truy vấn Database lớn.'
      },
      {
        id: 'csharp-async',
        title: 'Async / Await (Lập Trình Bất Đồng Bộ)',
        doc: `
          <h3>Xử lý đa luồng với Task Async/Await</h3>
          <p>Giúp giải phóng UI Thread hoặc cải thiện thông lượng server bằng cách giải phóng luồng khi đợi I/O.</p>
          <ul class="devdocs-list">
            <li><strong>async:</strong> Khai báo hàm có khả năng chạy bất đồng bộ.</li>
            <li><strong>await:</strong> Đợi tác vụ hoàn thành mà không khóa luồng hiện tại.</li>
            <li><strong>Task:</strong> Đại diện cho một tiến trình đang chạy ngầm trả về kết quả.</li>
          </ul>
        `,
        code: `public async Task<string> FetchDataAsync(string url) {
    using var client = new HttpClient();
    string result = await client.GetStringAsync(url);
    return result;
}`,
        notes: 'Tránh dùng .Result hoặc .Wait() trên Task vì có thể gây deadlock cục bộ.'
      }
    ]
  },
  {
    folder: 'Odoo',
    icon: 'fas fa-cubes',
    topics: [
      {
        id: 'odoo-models',
        title: 'Odoo Model Definition (Định nghĩa Model)',
        doc: `
          <h3>Cơ cấu định nghĩa bảng dữ liệu (Model) trong Odoo</h3>
          <p>Odoo sử dụng ORM để ánh xạ các Class Python thành các bảng tương ứng trong PostgreSQL.</p>
          <ul class="devdocs-list">
            <li><strong>_name:</strong> Tên định danh của model (tên bảng DB phân cách bằng dấu chấm).</li>
            <li><strong>_description:</strong> Mô tả ngắn gọn về model.</li>
            <li><strong>fields.Char / fields.Integer:</strong> Các kiểu trường dữ liệu thông dụng.</li>
            <li><strong>Many2one / One2many:</strong> Khai báo các quan hệ liên kết bảng.</li>
          </ul>
        `,
        code: `# -*- coding: utf-8 -*-
from odoo import models, fields, api

class SaleOrderExtension(models.Model):
    _name = 'sale.order'
    _inherit = 'sale.order'

    packing_time = fields.Float(string="Thời gian đóng gói")
    packing_user_id = fields.Many2one('res.users', string="Người đóng gói")`,
        notes: 'Khi thêm trường mới trong Odoo, hãy nhớ phân quyền access rights trong file security/ir.model.access.csv.'
      },
      {
        id: 'odoo-views',
        title: 'Odoo XML Views (Giao Diện XML)',
        doc: `
          <h3>Cách cấu trúc Form và Tree View bằng XML</h3>
          <p>Odoo dựng UI hoàn toàn bằng cách khai báo thẻ XML.</p>
          <ul class="devdocs-list">
            <li><strong>tree:</strong> Chế độ xem danh sách (dòng cột).</li>
            <li><strong>form:</strong> Chế độ xem chi tiết bản ghi.</li>
            <li><strong>xpath:</strong> Công cụ chèn thêm trường vào giao diện có sẵn qua cơ chế kế thừa view.</li>
          </ul>
        `,
        code: `<!-- Kế thừa chèn trường vào Form View có sẵn -->
<record id="view_order_form_inherit" model="ir.ui.view">
    <field name="name">sale.order.form.inherit</field>
    <field name="model">sale.order</field>
    <field name="inherit_id" ref="sale.view_order_form"/>
    <field name="arch" type="xml">
        <xpath expr="//field[@name='payment_term_id']" position="after">
            <field name="packing_time"/>
        </xpath>
    </field>
</record>`,
        notes: 'Khi sửa giao diện XML, bạn cần nâng cấp module (Upgrade) để thấy sự thay đổi.'
      }
    ]
  },
  {
    folder: 'Encrypt',
    icon: 'fas fa-user-shield',
    topics: [
      {
        id: 'encrypt-aes',
        title: 'AES (Symmetric Encryption)',
        doc: `
          <h3>Mã hóa đối xứng AES (Advanced Encryption Standard)</h3>
          <p>AES sử dụng cùng một khóa bí mật để thực hiện cả quá trình mã hóa lẫn giải mã dữ liệu.</p>
          <ul class="devdocs-list">
            <li><strong>Tính bảo mật cực cao:</strong> Đang là tiêu chuẩn quốc tế mã hóa dữ liệu chính phủ.</li>
            <li><strong>Độ dài khóa:</strong> Hỗ trợ khóa 128-bit, 192-bit hoặc 256-bit.</li>
            <li><strong>Tốc độ nhanh:</strong> Phù hợp mã hóa khối lượng dữ liệu lớn trực tuyến.</li>
          </ul>
        `,
        code: `// Ví dụ mã hóa AES bằng CryptoJS trong Javascript
const CryptoJS = require("crypto-js");

const secretKey = "MySecretKey123";
const message = "Dữ liệu tuyệt mật";

// Mã hóa
const encrypted = CryptoJS.AES.encrypt(message, secretKey).toString();

// Giải mã
const bytes = CryptoJS.AES.decrypt(encrypted, secretKey);
const decrypted = bytes.toString(CryptoJS.enc.Utf8);`,
        notes: 'Cần bảo mật và quản lý khóa AES cẩn thận vì nếu lộ khóa, kẻ tấn công sẽ đọc được toàn bộ dữ liệu.'
      },
      {
        id: 'encrypt-hashing',
        title: 'Hashing vs Encryption (Băm vs Mã hóa)',
        doc: `
          <h3>Sự khác biệt giữa Băm (Hash) và Mã hóa (Encrypt)</h3>
          <p>Rất nhiều lập trình viên nhầm lẫn giữa hai khái niệm an toàn thông tin cốt lõi này.</p>
          <ul class="devdocs-list">
            <li><strong>Mã hóa (Encryption):</strong> Là quy trình 2 chiều. Có thể mã hóa và dùng khóa giải mã về dữ liệu gốc.</li>
            <li><strong>Băm (Hashing):</strong> Là quy trình 1 chiều. Không thể dịch ngược từ mã băm về dữ liệu gốc (Ví dụ: lưu mật khẩu bằng bcrypt, SHA-256).</li>
            <li><strong>Tính duy nhất:</strong> Một dữ liệu đầu vào luôn cho ra một chuỗi băm có độ dài cố định.</li>
          </ul>
        `,
        code: `# Băm SHA-256 bằng thư viện hashlib của Python
import hashlib

password = "admin_password123".encode()
hashed = hashlib.sha256(password).hexdigest()
print(hashed) # In chuỗi băm hệ hexa độ dài 64 kí tự`,
        notes: 'Không bao giờ lưu mật khẩu ở dạng rõ (Plaintext) hoặc mã hóa giải mã được, hãy dùng mã băm (Hashing) kèm Salt.'
      }
    ]
  },
  {
    folder: 'Sort',
    icon: 'fas fa-sort-amount-down',
    topics: [
      {
        id: 'sort-quicksort',
        title: 'Quick Sort (Sắp xếp nhanh)',
        doc: `
          <h3>Thuật toán sắp xếp Quick Sort</h3>
          <p>Quick Sort hoạt động theo nguyên lý "Chia để trị" (Divide and Conquer).</p>
          <ul class="devdocs-list">
            <li><strong>Pivot:</strong> Chọn một phần tử làm chốt xoay.</li>
            <li><strong>Phân nhóm:</strong> Đưa các phần tử nhỏ hơn chốt về bên trái, lớn hơn về bên phải.</li>
            <li><strong>Độ phức tạp:</strong> Trung bình là O(N log N), trường hợp tệ nhất là O(N²).</li>
          </ul>
        `,
        code: `function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[arr.length - 1];
  const left = [];
  const right = [];
  
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] < pivot) left.push(arr[i]);
    else right.push(arr[i]);
  }
  return [...quickSort(left), pivot, ...quickSort(right)];
}`,
        notes: 'Quick Sort thường chạy nhanh hơn Merge Sort do tối ưu được bộ nhớ cache cache locality.'
      }
    ]
  },
  {
    folder: 'Java',
    icon: 'fab fa-java',
    topics: [
      {
        id: 'java-streams',
        title: 'Java Streams API (Java 8+)',
        doc: `
          <h3>Xử lý tập hợp tiện lợi với Stream</h3>
          <p>Cho phép xử lý danh sách theo phong cách Functional Programming tinh giản.</p>
          <ul class="devdocs-list">
            <li><strong>filter:</strong> Lọc các phần tử theo điều kiện logic (Predicate).</li>
            <li><strong>map:</strong> Ánh xạ đổi kiểu hoặc tính toán giá trị mới.</li>
            <li><strong>collect:</strong> Thu gom kết quả ra List, Set hoặc Map.</li>
          </ul>
        `,
        code: `import java.util.*;
import java.util.stream.*;

List<String> names = Arrays.asList("An", "Bình", "Cường", "Dũng");
List<String> filtered = names.stream()
    .filter(name -> name.startsWith("B"))
    .map(String::toUpperCase)
    .collect(Collectors.toList()); // [BÌNH]`,
        notes: 'Streams không thay đổi dữ liệu gốc mà chỉ sinh ra stream kết quả mới.'
      }
    ]
  },
  {
    folder: 'C++',
    icon: 'fas fa-terminal',
    topics: [
      {
        id: 'cpp-smartpointers',
        title: 'Smart Pointers (Con trỏ thông minh)',
        doc: `
          <h3>Quản lý bộ nhớ an toàn với Smart Pointers</h3>
          <p>Giúp giải phóng bộ nhớ heap tự động khi con trỏ ra khỏi phạm vi hoạt động, tránh lỗi memory leak.</p>
          <ul class="devdocs-list">
            <li><strong>std::unique_ptr:</strong> Con trỏ độc quyền sở hữu vùng nhớ, không thể sao chép.</li>
            <li><strong>std::shared_ptr:</strong> Con trỏ chia sẻ quyền sở hữu vùng nhớ qua cơ chế đếm tham chiếu (Reference counting).</li>
            <li><strong>std::weak_ptr:</strong> Trỏ đến bộ nhớ quản lý bởi shared_ptr nhưng không tăng bộ đếm để tránh vòng lặp tham chiếu chéo.</li>
          </ul>
        `,
        code: `#include <iostream>
#include <memory>

class Resource {
public:
    Resource() { std::cout << "Res created\\n"; }
    ~Resource() { std::cout << "Res destroyed\\n"; }
};

int main() {
    std::unique_ptr<Resource> ptr = std::make_unique<Resource>();
    return 0; // Tự động xóa bộ nhớ Resource
}`,
        notes: 'Ưu tiên sử dụng unique_ptr trừ phi bạn thực sự cần chia sẻ sở hữu vùng nhớ đa luồng.'
      }
    ]
  },
  {
    folder: 'English',
    icon: 'fas fa-language',
    topics: [
      {
        id: 'english-emails',
        title: 'Professional Email Writing (Viết Mail)',
        doc: `
          <h3>Mẫu câu viết Email công việc chuẩn quốc tế</h3>
          <p>Cách diễn đạt lịch sự thường dùng trong giao tiếp kỹ thuật.</p>
          <ul class="devdocs-list">
            <li><strong>Chào hỏi:</strong> Dear [Name], / Hi Team,</li>
            <li><strong>Đề xuất giúp đỡ:</strong> Please let me know if you need any further clarification.</li>
            <li><strong>Yêu cầu thông tin:</strong> Could you please provide us with more details about...?</li>
            <li><strong>Kết thư:</strong> Best regards, / Sincerely,</li>
          </ul>
        `,
        code: `Subject: Request for API Documentation - Rellia Project

Dear Support Team,

I hope this email finds you well. 
We are currently integrating your service into the Rellia Dashboard.
Could you please provide the updated API documentation?

Thank you for your assistance.

Best regards,
[Your Name]`,
        notes: 'Hạn chế viết câu quá dài. Diễn đạt ngắn gọn, xúc tích luôn mang lại sự chuyên nghiệp.'
      }
    ]
  },
  {
    folder: 'SQL',
    icon: 'fas fa-database',
    topics: [
      {
        id: 'sql-joins',
        title: 'SQL Joins (Liên kết bảng)',
        doc: `
          <h3>Các kiểu truy vấn liên kết bảng JOINS</h3>
          <p>Giúp truy xuất thông tin trải rộng trên nhiều bảng dữ liệu có quan hệ khoá.</p>
          <ul class="devdocs-list">
            <li><strong>INNER JOIN:</strong> Lấy các bản ghi trùng khớp giữa cả hai bảng.</li>
            <li><strong>LEFT JOIN:</strong> Lấy toàn bộ dòng bảng trái và những dòng khớp bảng phải.</li>
            <li><strong>RIGHT JOIN:</strong> Lấy toàn bộ dòng bảng phải và những dòng khớp bảng trái.</li>
            <li><strong>FULL JOIN:</strong> Trả về tất cả các hàng khi có sự trùng khớp ở một trong hai bảng.</li>
          </ul>
        `,
        code: `-- INNER JOIN lấy thông tin đơn hàng và khách hàng
SELECT o.order_id, c.customer_name, o.order_date
FROM orders o
INNER JOIN customers c ON o.customer_id = c.customer_id;`,
        notes: 'Hãy đảm bảo các trường dùng để liên kết khóa JOIN đã được đánh Index tốt.'
      }
    ]
  },
  {
    folder: 'UML',
    icon: 'fas fa-project-diagram',
    topics: [
      {
        id: 'uml-class',
        title: 'UML Class Diagram (Sơ đồ lớp)',
        doc: `
          <h3>Cách mô tả cấu trúc hệ thống bằng Sơ đồ lớp</h3>
          <p>Mô hình hóa các thực thể lớp, thuộc tính, phương thức và quan hệ giữa chúng.</p>
          <ul class="devdocs-list">
            <li><strong>Kí hiệu phạm vi truy cập:</strong> + (Public), - (Private), # (Protected).</li>
            <li><strong>Quan hệ Association:</strong> Đường liên kết thông thường nét liền.</li>
            <li><strong>Quan hệ Inheritance/Generalization:</strong> Mũi tên tam giác rỗng hướng về lớp cha.</li>
            <li><strong>Quan hệ Composition:</strong> Hình thoi đặc biểu thị quan hệ sở hữu trọn đời.</li>
          </ul>
        `,
        code: `+-----------------------+
|        Customer       |
+-----------------------+
| - id: int             |
| - name: string        |
+-----------------------+
| + placeOrder(): void  |
+-----------------------+
           ^ (Inheritance)
           |
+-----------------------+
|      VIPCustomer      |
+-----------------------+`,
        notes: 'Sơ đồ lớp giúp lập trình viên hình dung trước kiến trúc hệ thống trước khi bắt tay viết code.'
      }
    ]
  },
  {
    folder: 'Python',
    icon: 'fab fa-python',
    topics: [
      {
        id: 'python-decorators',
        title: 'Python Decorators (Bộ trang trí)',
        doc: `
          <h3>Decorators hoạt động như thế nào trong Python?</h3>
          <p>Decorator cho phép bạn can thiệp, mở rộng logic của một hàm khác mà không cần sửa đổi code gốc của hàm đó.</p>
          <ul class="devdocs-list">
            <li><strong>Wrapper:</strong> Hàm bọc trung gian xử lý logic trước và sau khi hàm chính chạy.</li>
            <li><strong>Cú pháp @:</strong> Sử dụng ký tự @ để gọi decorator lên đầu hàm cần bọc.</li>
            <li><strong>Ứng dụng:</strong> Dùng để ghi log, phân quyền, tính toán thời gian chạy hàm.</li>
          </ul>
        `,
        code: `def my_decorator(func):
    def wrapper():
        print("Trước khi chạy hàm...")
        func()
        print("Sau khi chạy hàm...")
    return wrapper

@my_decorator
def say_hello():
    print("Hello World!")

say_hello()`,
        notes: 'Khi viết decorator cho hàm có nhận tham số, hãy nhớ truyền các tham số *args và **kwargs vào wrapper.'
      }
    ]
  },
  {
    folder: 'Logistics',
    icon: 'fas fa-shipping-fast',
    topics: [
      {
        id: 'logistics-incoterms',
        title: 'Incoterms 2020 Cheat Sheet',
        doc: `
          <h3>Tóm tắt các điều khoản Incoterms 2020 thông dụng</h3>
          <p>Điều khoản thương mại quốc tế quy định trách nhiệm và chuyển giao rủi ro giữa bên bán và bên mua hàng.</p>
          <ul class="devdocs-list">
            <li><strong>EXW (Ex Works):</strong> Người bán giao hàng tại xưởng, người mua chịu toàn bộ chi phí và rủi ro vận chuyển.</li>
            <li><strong>FOB (Free On Board):</strong> Người bán chịu chi phí đưa hàng lên tàu tại cảng bốc, rủi ro chuyển giao khi hàng qua lan can tàu.</li>
            <li><strong>CIF (Cost, Insurance & Freight):</strong> Người bán chịu tiền cước vận chuyển và bảo hiểm hàng hải đến cảng đích.</li>
            <li><strong>DDP (Delivered Duty Paid):</strong> Người bán chịu toàn bộ chi phí (bao gồm thuế nhập khẩu) và giao hàng tận nơi cho người mua.</li>
          </ul>
        `,
        code: `[BÊN BÁN] ---> (FOB: Rủi ro chuyển tại lan can tàu) ---> [TÀU VẬN CHUYỂN] ---> [BÊN MUA]`,
        notes: 'Incoterms không quy định về chuyển giao quyền sở hữu tài sản mà chỉ quy định về chi phí và rủi ro vận hành.'
      }
    ]
  },
  {
    folder: 'Server',
    icon: 'fas fa-server',
    topics: [
      {
        id: 'server-nginx',
        title: 'Nginx Reverse Proxy Config',
        doc: `
          <h3>Cấu hình Nginx làm Proxy ngược</h3>
          <p>Nginx nhận yêu cầu HTTP/HTTPS của client và chuyển tiếp (forward) về các ứng dụng backend chạy ngầm ở port khác.</p>
          <ul class="devdocs-list">
            <li><strong>proxy_pass:</strong> Địa chỉ đích backend cần chuyển hướng yêu cầu tới.</li>
            <li><strong>proxy_set_header:</strong> Thiết lập thêm hoặc chỉnh sửa thông tin HTTP header gửi về backend.</li>
            <li><strong>server_name:</strong> Định nghĩa domain lắng nghe yêu cầu.</li>
          </ul>
        `,
        code: `server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}`,
        notes: 'Sau khi đổi cấu hình nginx, hãy chạy lệnh "nginx -t" để test syntax cấu hình trước khi restart.'
      }
    ]
  }
];

// Trạng thái cục bộ lưu trữ chủ đề đang được xem
let activeDocTopic = DEVDOCS_DATABASE[0].topics[0];
let activeDocTab = 'doc'; // doc, code, notes
let searchFilterQuery = '';

export function renderDevDocs(containerId = 'devdocsContent') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="devdocs-layout">
      <!-- Cột trái: Sidebar cây thư mục & Tìm kiếm -->
      <div class="devdocs-sidebar">
        <div>
          <input type="text" class="devdocs-search-input" id="devdocs-search-bar" placeholder="Tìm kiếm tài liệu nhanh..." value="${searchFilterQuery}">
        </div>
        
        <!-- Folder tree root -->
        <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin: 8px 0 4px; padding-left: 12px; letter-spacing: 0.05em;">Thư mục tài liệu</div>
        <div class="devdocs-tree" id="devdocs-tree-root"></div>
      </div>

      <!-- Cột phải: Khung hiển thị tài liệu -->
      <div class="devdocs-content-area" id="devdocs-view-content-pane"></div>
    </div>
  `;

  // Render tree structure
  buildTreeNodes();

  // Load active content
  loadActiveTopicContent();

  // Search input handler
  const searchInput = document.getElementById('devdocs-search-bar');
  searchInput.oninput = (e) => {
    searchFilterQuery = e.target.value.toLowerCase().trim();
    buildTreeNodes();
  };
}

function buildTreeNodes() {
  const root = document.getElementById('devdocs-tree-root');
  if (!root) return;

  root.innerHTML = '';

  DEVDOCS_DATABASE.forEach((cat, cIdx) => {
    // Filter topics if search query exists
    const matchingTopics = cat.topics.filter(t => 
      t.title.toLowerCase().includes(searchFilterQuery) || 
      t.doc.toLowerCase().includes(searchFilterQuery)
    );

    // If query is present and no topics match in this folder, hide the folder
    if (searchFilterQuery.length > 0 && matchingTopics.length === 0) {
      return;
    }

    const folderNode = document.createElement('div');
    folderNode.className = 'devdocs-tree-node';

    // Auto-expand folder if searching
    const isExpanded = searchFilterQuery.length > 0 ? true : false;

    folderNode.innerHTML = `
      <div class="devdocs-node-header" id="folder-header-${cIdx}">
        <i class="fas fa-chevron-right devdocs-node-chevron ${isExpanded ? 'expanded' : ''}" id="folder-chevron-${cIdx}"></i>
        <i class="${cat.icon} devdocs-node-icon"></i>
        <span>${cat.folder}</span>
      </div>
      <div class="devdocs-node-children ${isExpanded ? 'open' : ''}" id="folder-children-${cIdx}"></div>
    `;

    root.appendChild(folderNode);

    // Populate child documents
    const childrenContainer = document.getElementById(`folder-children-${cIdx}`);
    const topicsToRender = searchFilterQuery.length > 0 ? matchingTopics : cat.topics;

    topicsToRender.forEach(topic => {
      const docItem = document.createElement('div');
      docItem.className = `devdocs-node-header ${activeDocTopic.id === topic.id ? 'active' : ''}`;
      docItem.style.paddingLeft = '16px';
      docItem.innerHTML = `
        <i class="far fa-file-alt" style="font-size:12px;color:rgba(255,255,255,0.45);"></i>
        <span style="font-size:12.5px;font-weight:normal;">${topic.title}</span>
      `;
      docItem.onclick = (e) => {
        e.stopPropagation();
        selectTopic(topic);
      };
      childrenContainer.appendChild(docItem);
    });

    // Toggle folder click
    const header = document.getElementById(`folder-header-${cIdx}`);
    header.onclick = () => {
      const ch = document.getElementById(`folder-children-${cIdx}`);
      const chev = document.getElementById(`folder-chevron-${cIdx}`);
      const isOpen = ch.classList.contains('open');

      ch.classList.toggle('open', !isOpen);
      chev.classList.toggle('expanded', !isOpen);
    };
  });
}

function selectTopic(topic) {
  activeDocTopic = topic;
  
  // Highlight in sidebar
  const items = document.querySelectorAll('.devdocs-node-children .devdocs-node-header');
  items.forEach(el => el.classList.remove('active'));

  // Re-render sidebar tree to capture active state highlighting correctly
  buildTreeNodes();

  loadActiveTopicContent();
}

function loadActiveTopicContent() {
  const pane = document.getElementById('devdocs-view-content-pane');
  if (!pane) return;

  pane.innerHTML = `
    <div class="devdocs-content-header">
      <div class="devdocs-doc-title">${activeDocTopic.title}</div>
      <div class="devdocs-doc-subtitle">Tài liệu tham khảo offline nhanh cho các lập trình viên</div>
    </div>

    <!-- Sub-tabs -->
    <div class="devdocs-doc-tabs">
      <button class="devdocs-doc-tab-btn ${activeDocTab === 'doc' ? 'active' : ''}" id="doc-tab-btn-doc">
        <i class="fas fa-book-open"></i> Hướng Dẫn Chi Tiết
      </button>
      <button class="devdocs-doc-tab-btn ${activeDocTab === 'code' ? 'active' : ''}" id="doc-tab-btn-code">
        <i class="fas fa-code"></i> Code Mẫu
      </button>
      <button class="devdocs-doc-tab-btn ${activeDocTab === 'notes' ? 'active' : ''}" id="doc-tab-btn-notes">
        <i class="fas fa-sticky-note"></i> Ghi Chú / Lưu Ý
      </button>
    </div>

    <!-- Active Tab Screen Content -->
    <div id="devdocs-doc-tab-body-pane" style="animation: devdocsFadeIn 0.3s ease;"></div>
  `;

  // Attach tab events
  const btns = {
    doc: document.getElementById('doc-tab-btn-doc'),
    code: document.getElementById('doc-tab-btn-code'),
    notes: document.getElementById('doc-tab-btn-notes')
  };

  Object.keys(btns).forEach(tab => {
    if (btns[tab]) {
      btns[tab].onclick = () => {
        activeDocTab = tab;
        Object.keys(btns).forEach(t => btns[t].classList.toggle('active', t === tab));
        loadActiveSubTabContent();
      };
    }
  });

  // Load initial subtab content
  loadActiveSubTabContent();
}

function loadActiveSubTabContent() {
  const body = document.getElementById('devdocs-doc-tab-body-pane');
  if (!body) return;

  if (activeDocTab === 'doc') {
    body.innerHTML = `
      <div style="font-size: 14px; line-height: 1.7; color: var(--text-secondary);">
        ${activeDocTopic.doc}
      </div>
    `;
  } else if (activeDocTab === 'code') {
    // Escape HTML tags to prevent execution in code block
    const escapedCode = activeDocTopic.code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    body.innerHTML = `
      <div style="margin-bottom: 12px; font-size:13px; color:var(--text-muted);">Mã nguồn tham khảo:</div>
      <pre class="devdocs-code-block" data-lang="Code"><code>${escapedCode}</code></pre>
    `;
  } else if (activeDocTab === 'notes') {
    body.innerHTML = `
      <div style="background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: var(--radius-sm); padding: 20px; font-size: 13.5px; line-height: 1.6; color: var(--text-secondary);">
        <div style="font-weight:700; color:#ffd700; margin-bottom: 6px; display:flex; align-items:center; gap:8px;">
          <i class="fas fa-exclamation-triangle"></i> Lưu ý đặc biệt từ chuyên gia
        </div>
        ${activeDocTopic.notes}
      </div>
    `;
  }
}
