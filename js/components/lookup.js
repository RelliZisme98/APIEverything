/* ── Public Lookups Component ── */

const POSTAL_CODES = {
  "han": { name: "Hà Nội", code: "10000" },
  "sgn": { name: "TP. Hồ Chí Minh", code: "70000" },
  "dad": { name: "Đà Nẵng", code: "50000" },
  "hph": { name: "Hải Phòng", code: "18000" },
  "vca": { name: "Cần Thơ", code: "90000" },
  "bdg": { name: "Bình Dương", code: "75000" },
  "dnh": { name: "Đồng Nai", code: "76000" },
  "qnh": { name: "Quảng Ninh", code: "20000" },
  "kha": { name: "Khánh Hòa (Nha Trang)", code: "65000" },
  "ldg": { name: "Lâm Đồng (Đà Lạt)", code: "66000" },
  "vtg": { name: "Bà Rịa - Vũng Tàu", code: "78000" },
  "lan": { name: "Long An", code: "82000" },
  "tgg": { name: "Tiền Giang", code: "84000" },
  "bte": { name: "Bến Tre", code: "86000" },
  "tvh": { name: "Trà Vinh", code: "87000" },
  "vlg": { name: "Vĩnh Long", code: "89000" },
  "dth": { name: "Đồng Tháp", code: "81000" },
  "agg": { name: "An Giang", code: "88000" },
  "kgg": { name: "Kiên Giang", code: "92000" },
  "cmu": { name: "Cà Mau", code: "97000" },
  "tnh": { name: "Tây Ninh", code: "73000" },
  "bpc": { name: "Bình Phước", code: "77000" },
  "nth": { name: "Ninh Thuận", code: "59000" },
  "bth": { name: "Bình Thuận", code: "80000" },
  "dlk": { name: "Đắk Lắk", code: "63000" },
  "dno": { name: "Đắk Nông", code: "64000" },
  "gla": { name: "Gia Lai", code: "60000" },
  "ktu": { name: "Kon Tum", code: "61000" },
  "pye": { name: "Phú Yên", code: "62000" },
  "bdh": { name: "Bình Định", code: "55000" },
  "qng": { name: "Quảng Ngãi", code: "57000" },
  "qna": { name: "Quảng Nam", code: "56000" },
  "tth": { name: "Thừa Thiên Huế", code: "53000" },
  "qtr": { name: "Quảng Trị", code: "52000" },
  "qbi": { name: "Quảng Bình", code: "51000" },
  "hti": { name: "Hà Tĩnh", code: "48000" },
  "nan": { name: "Nghệ An", code: "46000" },
  "tho": { name: "Thanh Hóa", code: "44000" },
  "nbi": { name: "Ninh Bình", code: "43000" },
  "ndi": { name: "Nam Định", code: "42000" },
  "hna": { name: "Hà Nam", code: "41000" },
  "tbi": { name: "Thái Bình", code: "40000" },
  "hdu": { name: "Hải Dương", code: "17000" },
  "hye": { name: "Hưng Yên", code: "16000" },
  "bni": { name: "Bắc Ninh", code: "22000" },
  "bgi": { name: "Bắc Giang", code: "23000" },
  "lso": { name: "Lạng Sơn", code: "24000" },
  "cba": { name: "Cao Bằng", code: "27000" },
  "hgi": { name: "Hà Giang", code: "31000" },
  "tqu": { name: "Tuyên Quang", code: "30000" },
  "tng": { name: "Thái Nguyên", code: "25000" },
  "pth": { name: "Phú Thọ", code: "29000" },
  "vph": { name: "Vĩnh Phúc", code: "26000" },
  "yba": { name: "Yên Bái", code: "32000" },
  "lca": { name: "Lào Cai", code: "33000" },
  "dbi": { name: "Điện Biên", code: "38000" },
  "lch": { name: "Lai Châu", code: "39000" },
  "sla": { name: "Sơn La", code: "36000" },
  "hbi": { name: "Hòa Bình", code: "35000" },
  "bli": { name: "Bạc Liêu", code: "96000" },
  "str": { name: "Sóc Trăng", code: "95000" },
  "hgg": { name: "Hậu Giang", code: "91000" },
  "bka": { name: "Bắc Kạn", code: "26000" }
};

const LICENSE_PLATES = [
  { code: "29, 30, 31, 32, 33, 40", province: "Hà Nội", status: "Hoạt động", note: "Mã 33 trước đây thuộc tỉnh Hà Tây (sáp nhập vào Hà Nội năm 2008)." },
  { code: "41, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59", province: "TP. Hồ Chí Minh", status: "Hoạt động", note: "" },
  { code: "15, 16", province: "Hải Phòng", status: "Hoạt động", note: "" },
  { code: "43", province: "Đà Nẵng", status: "Hoạt động", note: "" },
  { code: "65", province: "Cần Thơ", status: "Hoạt động", note: "" },
  { code: "33", province: "Hà Tây (Cũ)", status: "Sáp nhập", note: "Đã sáp nhập vào Hà Nội từ 2008. Hiện tại mã 33 vẫn tiếp tục được cấp cho một số quận huyện tại Hà Nội." },
  { code: "67", province: "An Giang", status: "Hoạt động", note: "" },
  { code: "72", province: "Bà Rịa - Vũng Tàu", status: "Hoạt động", note: "" },
  { code: "94", province: "Bạc Liêu", status: "Hoạt động", note: "Tách ra từ tỉnh Minh Hải cũ." },
  { code: "98", province: "Bắc Giang", status: "Hoạt động", note: "Tách ra từ tỉnh Hà Bắc cũ." },
  { code: "97", province: "Bắc Kạn", status: "Hoạt động", note: "" },
  { code: "99", province: "Bắc Ninh", status: "Hoạt động", note: "Tách ra từ tỉnh Hà Bắc cũ." },
  { code: "71", province: "Bến Tre", status: "Hoạt động", note: "" },
  { code: "61", province: "Bình Dương", status: "Hoạt động", note: "Tách ra từ tỉnh Sông Bé cũ." },
  { code: "77", province: "Bình Định", status: "Hoạt động", note: "" },
  { code: "93", province: "Bình Phước", status: "Hoạt động", note: "Tách ra từ tỉnh Sông Bé cũ." },
  { code: "86", province: "Bình Thuận", status: "Hoạt động", note: "" },
  { code: "69", province: "Cà Mau", status: "Hoạt động", note: "Tách ra từ tỉnh Minh Hải cũ." },
  { code: "11", province: "Cao Bằng", status: "Hoạt động", note: "" },
  { code: "47", province: "Đắk Lắk", status: "Hoạt động", note: "" },
  { code: "48", province: "Đắk Nông", status: "Hoạt động", note: "" },
  { code: "27", province: "Điện Biên", status: "Hoạt động", note: "" },
  { code: "39, 60", province: "Đồng Nai", status: "Hoạt động", note: "" },
  { code: "66", province: "Đồng Tháp", status: "Hoạt động", note: "" },
  { code: "81", province: "Gia Lai", status: "Hoạt động", note: "" },
  { code: "23", province: "Hà Giang", status: "Hoạt động", note: "" },
  { code: "90", province: "Hà Nam", status: "Hoạt động", note: "Tách ra từ tỉnh Nam Hà cũ." },
  { code: "38", province: "Hà Tĩnh", status: "Hoạt động", note: "Tách ra từ tỉnh Nghệ Tĩnh cũ." },
  { code: "34", province: "Hải Dương", status: "Hoạt động", note: "Tách ra từ tỉnh Hải Hưng cũ." },
  { code: "95", province: "Hậu Giang", status: "Hoạt động", note: "Tách ra từ tỉnh Cần Thơ cũ." },
  { code: "28", province: "Hòa Bình", status: "Hoạt động", note: "" },
  { code: "89", province: "Hưng Yên", status: "Hoạt động", note: "Tách ra từ tỉnh Hải Hưng cũ." },
  { code: "79", province: "Khánh Hòa", status: "Hoạt động", note: "" },
  { code: "68", province: "Kiên Giang", status: "Hoạt động", note: "" },
  { code: "82", province: "Kon Tum", status: "Hoạt động", note: "" },
  { code: "25", province: "Lai Châu", status: "Hoạt động", note: "" },
  { code: "12", province: "Lạng Sơn", status: "Hoạt động", note: "" },
  { code: "24", province: "Lào Cai", status: "Hoạt động", note: "" },
  { code: "49", province: "Lâm Đồng", status: "Hoạt động", note: "" },
  { code: "62", province: "Long An", status: "Hoạt động", note: "" },
  { code: "18", province: "Nam Định", status: "Hoạt động", note: "Tách ra từ tỉnh Nam Hà cũ." },
  { code: "37", province: "Nghệ An", status: "Hoạt động", note: "Tách ra từ tỉnh Nghệ Tĩnh cũ." },
  { code: "35", province: "Ninh Bình", status: "Hoạt động", note: "" },
  { code: "85", province: "Ninh Thuận", status: "Hoạt động", note: "" },
  { code: "19", province: "Phú Thọ", status: "Hoạt động", note: "" },
  { code: "78", province: "Phú Yên", status: "Hoạt động", note: "" },
  { code: "73", province: "Quảng Bình", status: "Hoạt động", note: "Tách ra từ tỉnh Bình Trị Thiên cũ." },
  { code: "92", province: "Quảng Nam", status: "Hoạt động", note: "" },
  { code: "76", province: "Quảng Ngãi", status: "Hoạt động", note: "" },
  { code: "14", province: "Quảng Ninh", status: "Hoạt động", note: "" },
  { code: "74", province: "Quảng Trị", status: "Hoạt động", note: "Tách ra từ tỉnh Bình Trị Thiên cũ." },
  { code: "83", province: "Sóc Trăng", status: "Hoạt động", note: "" },
  { code: "26", province: "Sơn La", status: "Hoạt động", note: "" },
  { code: "70", province: "Tây Ninh", status: "Hoạt động", note: "" },
  { code: "17", province: "Thái Bình", status: "Hoạt động", note: "" },
  { code: "20", province: "Thái Nguyên", status: "Hoạt động", note: "" },
  { code: "36", province: "Thanh Hóa", status: "Hoạt động", note: "" },
  { code: "75", province: "Thừa Thiên Huế", status: "Hoạt động", note: "Tách ra từ tỉnh Bình Trị Thiên cũ." },
  { code: "63", province: "Tiền Giang", status: "Hoạt động", note: "" },
  { code: "84", province: "Trà Vinh", status: "Hoạt động", note: "" },
  { code: "22", province: "Tuyên Quang", status: "Hoạt động", note: "" },
  { code: "64", province: "Vĩnh Long", status: "Hoạt động", note: "" },
  { code: "88", province: "Vĩnh Phúc", status: "Hoạt động", note: "" },
  { code: "21", province: "Yên Bái", status: "Hoạt động", note: "" }
];

const NEW_PROVINCES_2025 = [
  { id: 1, name: "An Giang", merged: "Kiên Giang + An Giang", capital: "Kiên Giang", codes: "68, 67", area: "9.888,9", population: "3.679.200", note: "Hợp nhất toàn bộ địa giới hành chính của tỉnh Kiên Giang và tỉnh An Giang." },
  { id: 2, name: "Bắc Ninh", merged: "Bắc Giang + Bắc Ninh", capital: "Bắc Giang", codes: "98, 99", area: "4.718,6", population: "3.509.100", note: "Hợp nhất toàn bộ địa giới hành chính của tỉnh Bắc Giang và tỉnh Bắc Ninh." },
  { id: 3, name: "Cà Mau", merged: "Bạc Liêu + Cà Mau", capital: "Cà Mau", codes: "94, 69", area: "7.942,4", population: "2.140.600", note: "Hợp nhất toàn bộ địa giới hành chính của tỉnh Bạc Liêu và tỉnh Cà Mau." },
  { id: 4, name: "Cao Bằng", merged: "Giữ nguyên", capital: "Cao Bằng", codes: "11", area: "6.700,39", population: "543.050", note: "Giữ nguyên địa giới hành chính tỉnh Cao Bằng." },
  { id: 5, name: "Đắk Lắk", merged: "Phú Yên + Đắk Lắk", capital: "Đắk Lắk", codes: "78, 47", area: "18.096,4", population: "2.831.300", note: "Hợp nhất toàn bộ địa giới hành chính của tỉnh Phú Yên và tỉnh Đắk Lắk." },
  { id: 6, name: "Điện Biên", merged: "Giữ nguyên", capital: "Điện Biên", codes: "27", area: "9.539,93", population: "633.980", note: "Giữ nguyên địa giới hành chính tỉnh Điện Biên." },
  { id: 7, name: "Đồng Nai", merged: "Bình Phước + Đồng Nai", capital: "Đồng Nai", codes: "93, 39, 60", area: "12.737,2", population: "4.427.700", note: "Hợp nhất toàn bộ địa giới hành chính của tỉnh Bình Phước và tỉnh Đồng Nai." },
  { id: 8, name: "Đồng Tháp", merged: "Tiền Giang + Đồng Tháp", capital: "Tiền Giang", codes: "63, 66", area: "5.938,7", population: "3.397.200", note: "Hợp nhất toàn bộ địa giới hành chính của tỉnh Tiền Giang và tỉnh Đồng Tháp." },
  { id: 9, name: "Gia Lai", merged: "Gia Lai + Bình Định", capital: "Bình Định", codes: "81, 77", area: "21.576,5", population: "3.153.300", note: "Hợp nhất toàn bộ địa giới hành chính của tỉnh Gia Lai và tỉnh Bình Định." },
  { id: 10, name: "Hà Tĩnh", merged: "Giữ nguyên", capital: "Hà Tĩnh", codes: "38", area: "5.994,45", population: "1.317.200", note: "Giữ nguyên địa giới hành chính tỉnh Hà Tĩnh." },
  { id: 11, name: "Hưng Yên", merged: "Thái Bình + Hưng Yên", capital: "Hưng Yên", codes: "17, 89", area: "2.514,8", population: "3.208.400", note: "Hợp nhất toàn bộ địa giới hành chính của tỉnh Thái Bình và tỉnh Hưng Yên." },
  { id: 12, name: "Khánh Hoà", merged: "Khánh Hòa + Ninh Thuận", capital: "Khánh Hòa", codes: "79, 85", area: "8.555,9", population: "1.882.000", note: "Hợp nhất toàn bộ địa giới hành chính của tỉnh Khánh Hòa và tỉnh Ninh Thuận." },
  { id: 13, name: "Lai Châu", merged: "Giữ nguyên", capital: "Lai Châu", codes: "25", area: "9.068,73", population: "482.100", note: "Giữ nguyên địa giới hành chính tỉnh Lai Châu." },
  { id: 14, name: "Lâm Đồng", merged: "Đắk Nông + Lâm Đồng + Bình Thuận", capital: "Lâm Đồng", codes: "48, 49, 86", area: "24.233,1", population: "3.324.400", note: "Hợp nhất toàn bộ địa giới hành chính của 3 tỉnh Đắk Nông, Lâm Đồng và Bình Thuận." },
  { id: 15, name: "Lạng Sơn", merged: "Giữ nguyên", capital: "Lạng Sơn", codes: "12", area: "8.310,18", population: "802.090", note: "Giữ nguyên địa giới hành chính tỉnh Lạng Sơn." },
  { id: 16, name: "Lào Cai", merged: "Lào Cai + Yên Bái", capital: "Yên Bái", codes: "24, 21", area: "13.257,0", population: "1.656.500", note: "Hợp nhất toàn bộ địa giới hành chính của tỉnh Lào Cai và tỉnh Yên Bái." },
  { id: 17, name: "Nghệ An", merged: "Giữ nguyên", capital: "Nghệ An", codes: "37", area: "16.486,49", population: "3.416.900", note: "Giữ nguyên địa giới hành chính tỉnh Nghệ An." },
  { id: 18, name: "Ninh Bình", merged: "Hà Nam + Ninh Bình + Nam Định", capital: "Ninh Bình", codes: "90, 35, 18", area: "3.942,6", population: "3.818.700", note: "Hợp nhất toàn bộ địa giới hành chính của 3 tỉnh Hà Nam, Ninh Bình và Nam Định." },
  { id: 19, name: "Phú Thọ", merged: "Hòa Bình + Vĩnh Phúc + Phú Thọ", capital: "Phú Thọ", codes: "28, 88, 19", area: "9.361,4", population: "3.663.600", note: "Hợp nhất toàn bộ địa giới hành chính của 3 tỉnh Hòa Bình, Vĩnh Phúc và Phú Thọ." },
  { id: 20, name: "Quảng Ngãi", merged: "Quảng Ngãi + Kon Tum", capital: "Quảng Ngãi", codes: "76, 82", area: "14.832,6", population: "1.861.700", note: "Hợp nhất toàn bộ địa giới hành chính của tỉnh Quảng Ngãi và tỉnh Kon Tum." },
  { id: 21, name: "Quảng Ninh", merged: "Giữ nguyên", capital: "Quảng Ninh", codes: "14", area: "6.207,93", population: "1.362.880", note: "Giữ nguyên địa giới hành chính tỉnh Quảng Ninh." },
  { id: 22, name: "Quảng Trị", merged: "Quảng Bình + Quảng Trị", capital: "Quảng Bình", codes: "73, 74", area: "12.700,0", population: "1.584.000", note: "Hợp nhất toàn bộ địa giới hành chính của tỉnh Quảng Bình và tỉnh Quảng Trị." },
  { id: 23, name: "Sơn La", merged: "Giữ nguyên", capital: "Sơn La", codes: "26", area: "14.109,83", population: "1.300.130", note: "Giữ nguyên địa giới hành chính tỉnh Sơn La." },
  { id: 24, name: "Tây Ninh", merged: "Long An + Tây Ninh", capital: "Tây Ninh", codes: "62, 70", area: "8.536,5", population: "2.959.000", note: "Hợp nhất toàn bộ địa giới hành chính của tỉnh Long An và tỉnh Tây Ninh." },
  { id: 25, name: "Thái Nguyên", merged: "Bắc Kạn + Thái Nguyên", capital: "Thái Nguyên", codes: "97, 20", area: "8.375,3", population: "1.694.500", note: "Hợp nhất toàn bộ địa giới hành chính của tỉnh Bắc Kạn và tỉnh Thái Nguyên." },
  { id: 26, name: "Thanh Hóa", merged: "Giữ nguyên", capital: "Thanh Hóa", codes: "36", area: "11.114,71", population: "3.722.060", note: "Giữ nguyên địa giới hành chính tỉnh Thanh Hóa." },
  { id: 27, name: "TP. Cần Thơ", merged: "Sóc Trăng + Hậu Giang + TP. Cần Thơ", capital: "Cần Thơ", codes: "83, 95, 65", area: "6.360,8", population: "3.207.000", note: "Hợp nhất tỉnh Sóc Trăng, tỉnh Hậu Giang và TP. Cần Thơ thành TP. Cần Thơ mới trực thuộc Trung ương." },
  { id: 28, name: "TP. Đà Nẵng", merged: "Quảng Nam + TP. Đà Nẵng", capital: "Đà Nẵng", codes: "92, 43", area: "11.859,6", population: "2.819.900", note: "Hợp nhất toàn bộ địa giới hành chính của tỉnh Quảng Nam và TP. Đà Nẵng thành thành phố trực thuộc Trung ương mới." },
  { id: 29, name: "TP. Hà Nội", merged: "Giữ nguyên", capital: "Hà Nội", codes: "29, 30, 31, 32, 33, 40", area: "3.359,84", population: "8.435.650", note: "Giữ nguyên địa giới hành chính thành phố Hà Nội." },
  { id: 30, name: "TP. Hải Phòng", merged: "Hải Dương + TP. Hải Phòng", capital: "Hải Phòng", codes: "34, 15, 16", area: "3.194,7", population: "4.102.700", note: "Hợp nhất toàn bộ địa giới hành chính của tỉnh Hải Dương và TP. Hải Phòng thành thành phố trực thuộc Trung ương mới." },
  { id: 31, name: "TP. Hồ Chí Minh", merged: "Bình Dương + TPHCM + Bà Rịa - Vũng Tàu", capital: "Hồ Chí Minh", codes: "61, 41, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 72", area: "6.772,6", population: "13.608.800", note: "Hợp nhất tỉnh Bình Dương, TP. Hồ Chí Minh và tỉnh Bà Rịa - Vũng Tàu thành thành phố trực thuộc Trung ương mới." },
  { id: 32, name: "TP. Huế", merged: "Giữ nguyên", capital: "Huế", codes: "75", area: "4.947,11", population: "1.160.220", note: "Nâng cấp toàn bộ địa giới hành chính của tỉnh Thừa Thiên Huế thành thành phố Huế trực thuộc Trung ương." },
  { id: 33, name: "Tuyên Quang", merged: "Hà Giang + Tuyên Quang", capital: "Tuyên Quang", codes: "23, 22", area: "13.795,6", population: "1.731.600", note: "Hợp nhất toàn bộ địa giới hành chính của tỉnh Hà Giang và tỉnh Tuyên Quang." },
  { id: 34, name: "Vĩnh Long", merged: "Bến Tre + Vĩnh Long + Trà Vinh", capital: "Vĩnh Long", codes: "71, 64, 84", area: "6.296,2", population: "3.367.400", note: "Hợp nhất toàn bộ địa giới hành chính của 3 tỉnh Bến Tre, Vĩnh Long và Trà Vinh." }
];

let currentPlatesMode = 'new'; // 'new' for 34 provinces, 'old' for 63 provinces

export function renderLookup() {
  const container = document.getElementById('lookupContent');
  if (!container) return;

  container.innerHTML = `
    <div class="lk-wrap">
      <!-- Tabs -->
      <div class="lk-tabs">
        <button class="lk-tab-btn active" data-pane="spam">Kiểm tra Spam</button>
        <button class="lk-tab-btn" data-pane="tax">Mã số thuế</button>
        <button class="lk-tab-btn" data-pane="postal">Mã bưu chính</button>
        <button class="lk-tab-btn" data-pane="plates">Biển số xe</button>
        <button class="lk-tab-btn" data-pane="gps">Tọa độ GPS</button>
        <button class="lk-tab-btn" data-pane="gov">Dịch vụ công</button>
        <button class="lk-tab-btn" data-pane="power">Lịch Cúp Điện</button>
        <button class="lk-tab-btn" data-pane="traffic">Phạt Nguội</button>
      </div>

      <!-- PANE 1: SPAM CHECK -->
      <div class="lk-pane active" id="pane-spam">
        <div class="travel-title-sub">Kiểm tra độ an toàn của Số điện thoại &amp; Email</div>
        <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">
          Phát hiện số điện thoại quảng cáo rác, lừa đảo, nhà mạng hoặc email bị lộ trong các vụ rò rỉ dữ liệu lớn.
        </div>
        <div class="lk-search-box">
          <input type="text" id="spamInput" class="field-input" placeholder="Nhập SĐT (09x...) hoặc Email của bạn..." />
          <button id="btnCheckSpam" class="btn-primary">Kiểm tra</button>
        </div>
        <div id="spamResult"></div>
      </div>

      <!-- PANE 2: TAX ID -->
      <div class="lk-pane" id="pane-tax">
        <div class="travel-title-sub">Tra cứu Mã số thuế doanh nghiệp &amp; cá nhân</div>
        <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">
          Tra cứu nhanh thông tin bằng Mã số thuế, Số CCCD/CMND (đối với cá nhân) hoặc Tên doanh nghiệp/Từ khóa.
        </div>
        <div class="lk-search-box">
          <input type="text" id="taxInput" class="field-input" placeholder="Nhập mã số thuế, CCCD, CMND hoặc tên doanh nghiệp..." />
          <button id="btnCheckTax" class="btn-primary">Tra cứu</button>
        </div>
        <div id="taxLookupResult"></div>
      </div>

      <!-- PANE 3: POSTAL CODE -->
      <div class="lk-pane" id="pane-postal">
        <div class="travel-title-sub">Tra cứu Mã bưu chính 63 Tỉnh thành Việt Nam</div>
        <div class="postal-select-wrap">
          <label for="postalSelect">Chọn Tỉnh / Thành phố</label>
          <select id="postalSelect" class="field-input">
            <option value="" disabled selected>-- Chọn Tỉnh/Thành --</option>
            ${Object.entries(POSTAL_CODES).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}
          </select>
        </div>
        <div id="postalResult"></div>
      </div>

      <!-- PANE 4: LICENSE PLATES -->
      <div class="lk-pane" id="pane-plates">
        <div class="travel-title-sub">Tra cứu Biển số xe &amp; Sáp nhập ĐVHC cấp tỉnh (2025)</div>
        <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">
          Nghị quyết 60-NQ/TW năm 2025 của Ban Chấp hành Trung ương Đảng thống nhất phương án sáp nhập 63 tỉnh thành còn 34 ĐVHC cấp tỉnh mới.
        </div>
        <div style="display: flex; gap: 8px; margin-bottom: 15px;">
          <button id="btnPlatesNew" class="lk-gov-tab active" style="border-radius: 8px;">Bản đồ 34 Tỉnh Mới (2025)</button>
          <button id="btnPlatesOld" class="lk-gov-tab" style="border-radius: 8px;">63 Tỉnh Thành Cũ</button>
        </div>
        <div class="lk-search-box">
          <input type="text" id="platesInput" class="field-input" placeholder="Nhập tên tỉnh thành mới, cũ, hoặc số biển số (ví dụ: Lâm Đồng, Đắk Nông hoặc 48)..." />
          <button id="btnSearchPlates" class="btn-primary">Tìm kiếm</button>
        </div>
        <div id="platesResult" style="margin-top: 15px;">
          <!-- Rendered via JS -->
        </div>
      </div>

      <!-- PANE 5: GPS GEOLOCATION -->
      <div class="lk-pane" id="pane-gps">
        <div class="travel-title-sub">Định Vị &amp; Xác Định Tọa Độ GPS</div>
        <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 15px;">
          Xác định chính xác Vĩ độ (Latitude), Kinh độ (Longitude) của vị trí hiện tại và tra cứu địa chỉ thực tế từ bản đồ.
        </div>

        <div style="display:flex; flex-direction:column; gap:15px; align-items:center; padding:20px; background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.05); border-radius:12px;">
          <button id="btnGetGps" class="btn-primary" style="padding:12px 24px; font-weight:600; font-size:14px; background:linear-gradient(135deg, var(--accent-blue), var(--accent-purple)); border:none; display:flex; align-items:center; gap:8px;">
            <i class="fas fa-crosshairs"></i> Lấy Vị Trí Hiện Tại
          </button>
          
          <div id="gpsLoading" style="display:none; color:var(--text-muted); font-size:13px;">
            <i class="fas fa-spinner fa-spin"></i> Đang kết nối tín hiệu GPS từ thiết bị...
          </div>

          <div id="gpsResult" style="width:100%; display:none;">
            <!-- Coordinates Grid -->
            <div class="gps-grid" style="margin-bottom:15px; width: 100%;">
              <div class="gps-card">
                <div style="font-size:12px; color:var(--text-muted); margin-bottom:5px;">Vĩ độ (Latitude)</div>
                <div id="gps-lat-val" style="font-size:20px; font-weight:700; color:var(--accent-blue);">--</div>
              </div>
              <div class="gps-card">
                <div style="font-size:12px; color:var(--text-muted); margin-bottom:5px;">Kinh độ (Longitude)</div>
                <div id="gps-lon-val" style="font-size:20px; font-weight:700; color:var(--accent-purple);">--</div>
              </div>
            </div>

            <!-- Additional info -->
            <div class="lk-result-box" style="margin-bottom:15px;">
              <table class="lk-details-table">
                <tr><td>Độ chính xác (Accuracy)</td><td id="gps-acc-val">--</td></tr>
                <tr><td>Thời gian định vị</td><td id="gps-time-val">--</td></tr>
                <tr><td>Địa chỉ thực tế (Ước tính)</td><td id="gps-address-val" style="font-weight:600; color:var(--text-primary);">Đang tải địa chỉ...</td></tr>
              </table>
            </div>

            <!-- Map Actions -->
            <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap; width:100%;">
              <a id="btnGmapsLink" href="#" target="_blank" class="btn-primary" style="text-decoration:none; background:#4285F4; border:none; display:flex; align-items:center; gap:8px;">
                <i class="fab fa-google"></i> Xem trên Google Maps
              </a>
              <a id="btnOsmLink" href="#" target="_blank" class="btn-primary" style="text-decoration:none; background:#7EBC12; border:none; display:flex; align-items:center; gap:8px;">
                <i class="fas fa-map-marked-alt"></i> Xem trên OpenStreetMap
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- PANE 6: GOV SERVICES -->
      <div class="lk-pane" id="pane-gov">
        <div class="travel-title-sub">Tra Cứu Dịch Vụ Công Trực Tuyến</div>

        <!-- Gov sub-tabs -->
        <div class="lk-gov-tabs">
          <button class="lk-gov-tab active" data-gov="gplx">GPLX</button>
          <button class="lk-gov-tab" data-gov="bhxh">BHXH / BHYT</button>
          <button class="lk-gov-tab" data-gov="tax">Thuế TNCN</button>
          <button class="lk-gov-tab" data-gov="cccd">CCCD / Cư trú</button>
        </div>

        <!-- GPLX -->
        <div class="lk-gov-pane active" id="gov-gplx">
          <div class="lk-gov-info-bar" style="border-color:rgba(96,165,250,0.3);background:rgba(96,165,250,0.06);">
            <span></span>
            <div>
              <div style="font-weight:700;color:var(--accent-blue);">Kiểm tra Giấy Phép Lái Xe</div>
              <div style="font-size:11px;color:var(--text-muted);">Tra cứu hạng lái xe, ngày cấp, ngày hết hạn và vi phạm GPLX qua Cổng thông tin chính thức.</div>
            </div>
          </div>
          <div class="lk-search-box" style="margin-top:12px;">
            <input type="text" id="gplxInput" class="field-input" placeholder="Nhập số CCCD/CMND hoặc số GPLX..." maxlength="20"/>
            <button id="btnCheckGPLX" class="btn-primary">Tra cứu</button>
          </div>
          <div id="gplxResult" style="margin-top:10px;"></div>
          <div class="lk-gov-direct" style="margin-top:14px;">
            <span style="font-size:11px;color:var(--text-muted);">Hoặc tra cứu trực tiếp tại cổng chính thức:</span>
            <a href="https://gplx.gov.vn/" target="_blank" rel="noopener" class="lot-link" style="font-size:11px;padding:4px 12px;">gplx.gov.vn ↗</a>
          </div>
        </div>

        <!-- BHXH -->
        <div class="lk-gov-pane" id="gov-bhxh">
          <div class="lk-gov-info-bar" style="border-color:rgba(52,211,153,0.3);background:rgba(52,211,153,0.06);">
            <span></span>
            <div>
              <div style="font-weight:700;color:var(--accent-green);">Bảo Hiểm Xã Hội & Y Tế</div>
              <div style="font-size:11px;color:var(--text-muted);">Tra cứu quá trình đóng BHXH, thẻ BHYT và mức hưởng.</div>
            </div>
          </div>
          <div class="lk-search-box" style="margin-top:12px;">
            <input type="text" id="bhxhInput" class="field-input" placeholder="Nhập số CCCD/CMND hoặc mã số BHXH..." maxlength="16"/>
            <button id="btnCheckBHXH" class="btn-primary">Tra cứu</button>
          </div>
          <div id="bhxhResult" style="margin-top:10px;"></div>
          <div class="lk-gov-links-grid" style="margin-top:14px;">
            <a href="https://baohiemxahoi.gov.vn/tracuu/Pages/tra-cuu-thong-tin-dong-bao-hiem.aspx" target="_blank" rel="noopener" class="lk-gov-link-card" style="border-color:rgba(52,211,153,0.3);background:rgba(52,211,153,0.06);">
              <span></span><div><div style="font-weight:700;font-size:12px;">Quá trình đóng BHXH</div><div style="font-size:10px;color:var(--text-muted);">baohiemxahoi.gov.vn</div></div>
            </a>
            <a href="https://baohiemxahoi.gov.vn/tracuu/Pages/tra-cuu-thong-tin-the-bhyt.aspx" target="_blank" rel="noopener" class="lk-gov-link-card" style="border-color:rgba(52,211,153,0.3);background:rgba(52,211,153,0.06);">
              <span></span><div><div style="font-weight:700;font-size:12px;">Thẻ BHYT</div><div style="font-size:10px;color:var(--text-muted);">Hạn sử dụng, nơi đăng ký KCB</div></div>
            </a>
            <a href="https://ssid.baohiemxahoi.gov.vn/" target="_blank" rel="noopener" class="lk-gov-link-card" style="border-color:rgba(52,211,153,0.3);background:rgba(52,211,153,0.06);">
              <span></span><div><div style="font-weight:700;font-size:12px;">VssID – App BHXH</div><div style="font-size:10px;color:var(--text-muted);">Ứng dụng BHXH Việt Nam</div></div>
            </a>
          </div>
        </div>

        <!-- Thuế TNCN -->
        <div class="lk-gov-pane" id="gov-tax">
          <div class="lk-gov-info-bar" style="border-color:rgba(251,191,36,0.3);background:rgba(251,191,36,0.06);">
            <span></span>
            <div>
              <div style="font-weight:700;color:var(--accent-yellow);">Thuế Thu Nhập Cá Nhân</div>
              <div style="font-size:11px;color:var(--text-muted);">Tra cứu MST cá nhân, khai báo thuế và hoàn thuế TNCN.</div>
            </div>
          </div>
          <div class="lk-search-box" style="margin-top:12px;">
            <input type="text" id="taxPersonInput" class="field-input" placeholder="Nhập số CCCD/CMND để tra MST cá nhân..." maxlength="16"/>
            <button id="btnCheckTaxPerson" class="btn-primary">Tra cứu MST</button>
          </div>
          <div id="taxPersonResult" style="margin-top:10px;"></div>
          <div class="lk-gov-links-grid" style="margin-top:14px;">
            <a href="https://canhan.gdt.gov.vn/" target="_blank" rel="noopener" class="lk-gov-link-card" style="border-color:rgba(251,191,36,0.3);background:rgba(251,191,36,0.06);">
              <span></span><div><div style="font-weight:700;font-size:12px;">Khai Báo Thuế TNCN</div><div style="font-size:10px;color:var(--text-muted);">canhan.gdt.gov.vn</div></div>
            </a>
            <a href="https://tracuunnt.gdt.gov.vn/tcnnt/mstcn.jsp" target="_blank" rel="noopener" class="lk-gov-link-card" style="border-color:rgba(251,191,36,0.3);background:rgba(251,191,36,0.06);">
              <span></span><div><div style="font-weight:700;font-size:12px;">Tra Cứu MST Cá Nhân</div><div style="font-size:10px;color:var(--text-muted);">Tổng Cục Thuế</div></div>
            </a>
            <a href="https://thuedientu.gdt.gov.vn/" target="_blank" rel="noopener" class="lk-gov-link-card" style="border-color:rgba(251,191,36,0.3);background:rgba(251,191,36,0.06);">
              <span></span><div><div style="font-weight:700;font-size:12px;">Hoàn Thuế Online</div><div style="font-size:10px;color:var(--text-muted);">thuedientu.gdt.gov.vn</div></div>
            </a>
          </div>
        </div>

        <!-- CCCD / Cư trú -->
        <div class="lk-gov-pane" id="gov-cccd">
          <div class="lk-gov-info-bar" style="border-color:rgba(167,139,250,0.3);background:rgba(167,139,250,0.06);">
            <span></span>
            <div>
              <div style="font-weight:700;color:var(--accent-purple);">CCCD & Đăng Ký Cư Trú</div>
              <div style="font-size:11px;color:var(--text-muted);">Tra cứu thông tin CCCD, tạm trú/tạm vắng và thủ tục hộ chiếu.</div>
            </div>
          </div>
          <div class="lk-gov-links-grid" style="margin-top:12px;">
            <a href="https://dichvucong.bocongan.gov.vn/dctt/index.html#/home" target="_blank" rel="noopener" class="lk-gov-link-card" style="border-color:rgba(167,139,250,0.3);background:rgba(167,139,250,0.06);">
              <span></span><div><div style="font-weight:700;font-size:12px;">Cổng DVC Bộ Công An</div><div style="font-size:10px;color:var(--text-muted);">Đăng ký CCCD, hộ chiếu</div></div>
            </a>
            <a href="https://dichvucong.bocongan.gov.vn/dctt/index.html#/dich-vu-cong/tam-tru" target="_blank" rel="noopener" class="lk-gov-link-card" style="border-color:rgba(167,139,250,0.3);background:rgba(167,139,250,0.06);">
              <span></span><div><div style="font-weight:700;font-size:12px;">Đăng Ký Tạm Trú</div><div style="font-size:10px;color:var(--text-muted);">Online – không cần đến phường</div></div>
            </a>
            <a href="https://tracuudancu.bocongan.gov.vn/" target="_blank" rel="noopener" class="lk-gov-link-card" style="border-color:rgba(167,139,250,0.3);background:rgba(167,139,250,0.06);">
              <span></span><div><div style="font-weight:700;font-size:12px;">Tra Cứu Dân Cư</div><div style="font-size:10px;color:var(--text-muted);">tracuudancu.bocongan.gov.vn</div></div>
            </a>
            <a href="https://www.vneid.vn/" target="_blank" rel="noopener" class="lk-gov-link-card" style="border-color:rgba(167,139,250,0.3);background:rgba(167,139,250,0.06);">
              <span></span><div><div style="font-weight:700;font-size:12px;">VNeID – Ứng dụng</div><div style="font-size:10px;color:var(--text-muted);">Định danh điện tử quốc gia</div></div>
            </a>
          </div>
          <div style="margin-top:14px;padding:12px;background:rgba(167,139,250,0.06);border:1px solid rgba(167,139,250,0.2);border-radius:10px;font-size:11px;color:var(--text-muted);line-height:1.6;">
            <strong style="color:var(--text-secondary);">Lưu ý:</strong> Tra cứu CCCD yêu cầu đăng nhập tài khoản VNeID hoặc VnConnect. Tính năng tra cứu trực tiếp không khả dụng do chính sách bảo mật dữ liệu cá nhân của Bộ Công An.
          </div>
        </div>
      </div>

      <!-- PANE 7: POWER OUTAGES -->
      <div class="lk-pane" id="pane-power">
        <div class="travel-title-sub">Tra Cứu Lịch Cúp Điện Toàn Quốc</div>
        <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">
          Bản đồ lịch ngừng giảm cung cấp điện chi tiết các khu vực của EVN trên toàn quốc.
        </div>
        <div style="position: relative; width: 100%; height: 750px; overflow: hidden; border-radius: 8px; background: #121214; border: 1px solid var(--border);">
          <div id="po-iframe-loader" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #121214; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10; color: #a0a0ab; font-size: 14px;">
            <div style="width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.08); border-top-color: #60a5fa; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 12px;"></div>
            <span>Đang kết nối tới máy chủ bản đồ toàn quốc...</span>
          </div>
          <iframe id="po-iframe" src="https://lichcupdien.app" style="width: 100%; height: 100%; border: none; opacity: 0; transition: opacity 0.3s;" sandbox="allow-scripts allow-forms allow-same-origin allow-popups" allowfullscreen></iframe>
        </div>
      </div>

      <!-- PANE 8: TRAFFIC FINES -->
      <div class="lk-pane" id="pane-traffic">
        <div class="travel-title-sub">Tra Cứu Phạt Nguội Giao Thông</div>
        <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">
          Tra cứu trực tiếp vi phạm phạt nguội giao thông của xe ô tô, xe máy qua nguồn dữ liệu PhatNguoi.vn.
        </div>
        <div style="position: relative; width: 100%; height: 750px; overflow: hidden; border-radius: 8px; background: #121214; border: 1px solid var(--border);">
          <iframe src="https://phatnguoi.vn" style="width: 100%; height: 100%; border: none;" sandbox="allow-scripts allow-forms allow-same-origin allow-popups" allowfullscreen></iframe>
        </div>
      </div>

    </div>
  `;

  // Tabs toggle logic
  const tabs = container.querySelectorAll('.lk-tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      container.querySelectorAll('.lk-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const paneId = `pane-${tab.dataset.pane}`;
      document.getElementById(paneId).classList.add('active');
    });
  });

  // Gov sub-tabs
  container.querySelectorAll('.lk-gov-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.lk-gov-tab').forEach(t => t.classList.remove('active'));
      container.querySelectorAll('.lk-gov-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`gov-${tab.dataset.gov}`)?.classList.add('active');
    });
  });

  // Bind lookup actions
  document.getElementById('btnCheckSpam').addEventListener('click', handleSpamCheck);
  document.getElementById('btnCheckTax').addEventListener('click', handleTaxCheck);
  document.getElementById('postalSelect').addEventListener('change', handlePostalChange);

  // License Plates init and search
  renderAllPlates();
  document.getElementById('btnSearchPlates')?.addEventListener('click', () => {
    const q = document.getElementById('platesInput').value;
    renderAllPlates(q);
  });
  document.getElementById('platesInput')?.addEventListener('input', (e) => {
    renderAllPlates(e.target.value);
  });

  // License Plates Toggle
  const btnNew = document.getElementById('btnPlatesNew');
  const btnOld = document.getElementById('btnPlatesOld');

  btnNew?.addEventListener('click', () => {
    btnNew.classList.add('active');
    btnOld?.classList.remove('active');
    currentPlatesMode = 'new';
    renderAllPlates(document.getElementById('platesInput').value);
  });

  btnOld?.addEventListener('click', () => {
    btnOld.classList.add('active');
    btnNew?.classList.remove('active');
    currentPlatesMode = 'old';
    renderAllPlates(document.getElementById('platesInput').value);
  });

  // GPS init
  document.getElementById('btnGetGps')?.addEventListener('click', handleGetGps);

  // GPLX lookup
  document.getElementById('btnCheckGPLX')?.addEventListener('click', () => {
    const q = document.getElementById('gplxInput').value.trim();
    const el = document.getElementById('gplxResult');
    if (!q) { el.innerHTML = `<div class="lk-result-box" style="color:#f87171;">⚠️ Vui lòng nhập số CCCD hoặc số GPLX.</div>`; return; }
    el.innerHTML = `<div class="lk-result-box" style="padding:14px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:8px;">Tra cứu GPLX: <span style="color:var(--accent-blue);">${q}</span></div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Cổng GPLX chính thức yêu cầu xác thực OTP qua điện thoại. Vui lòng truy cập trực tiếp:</div>
      <a href="https://gplx.gov.vn/tracuu?cccd=${encodeURIComponent(q)}" target="_blank" rel="noopener" class="btn-primary" style="display:inline-block;text-decoration:none;padding:8px 18px;border-radius:8px;">
        Tra cứu tại gplx.gov.vn ↗
      </a>
    </div>`;
  });

  // BHXH lookup
  document.getElementById('btnCheckBHXH')?.addEventListener('click', () => {
    const q = document.getElementById('bhxhInput').value.trim();
    const el = document.getElementById('bhxhResult');
    if (!q) { el.innerHTML = `<div class="lk-result-box" style="color:#f87171;">⚠️ Vui lòng nhập số CCCD hoặc mã BHXH.</div>`; return; }
    el.innerHTML = `<div class="lk-result-box" style="padding:14px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:8px;">Tra cứu BHXH: <span style="color:var(--accent-green);">${q}</span></div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Tra cứu BHXH yêu cầu xác thực OTP. Nhấn nút để truy cập cổng BHXH chính thức:</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <a href="https://baohiemxahoi.gov.vn/tracuu/Pages/tra-cuu-thong-tin-dong-bao-hiem.aspx" target="_blank" rel="noopener" class="btn-primary" style="display:inline-block;text-decoration:none;padding:6px 14px;border-radius:8px;font-size:12px;">
          Quá trình đóng BHXH ↗
        </a>
        <a href="https://baohiemxahoi.gov.vn/tracuu/Pages/tra-cuu-thong-tin-the-bhyt.aspx" target="_blank" rel="noopener" class="btn-primary" style="display:inline-block;text-decoration:none;padding:6px 14px;border-radius:8px;font-size:12px;">
          Thẻ BHYT ↗
        </a>
      </div>
    </div>`;
  });

  // Tax person lookup → forward to GDT
  document.getElementById('btnCheckTaxPerson')?.addEventListener('click', () => {
    const q = document.getElementById('taxPersonInput').value.trim();
    const el = document.getElementById('taxPersonResult');
    if (!q) { el.innerHTML = `<div class="lk-result-box" style="color:#f87171;">⚠️ Vui lòng nhập số CCCD/CMND.</div>`; return; }
    el.innerHTML = `<div class="lk-result-box" style="padding:14px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:8px;">Tra MST cá nhân: <span style="color:var(--accent-yellow);">${q}</span></div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Hệ thống GDT yêu cầu đăng nhập. Nhấn nút để truy cập trực tiếp trang tra cứu MST:</div>
      <a href="https://tracuunnt.gdt.gov.vn/tcnnt/mstcn.jsp" target="_blank" rel="noopener" class="btn-primary" style="display:inline-block;text-decoration:none;padding:8px 18px;border-radius:8px;">
        Tra cứu MST tại GDT ↗
      </a>
    </div>`;
  });

  // Allow enter key
  document.getElementById('spamInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSpamCheck();
  });
  document.getElementById('taxInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleTaxCheck();
  });
  document.getElementById('platesInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const q = document.getElementById('platesInput').value;
      renderAllPlates(q);
    }
  });
  document.getElementById('gplxInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('btnCheckGPLX').click();
  });

  // Bind loader for power outages iframe
  const iframe = document.getElementById('po-iframe');
  const loader = document.getElementById('po-iframe-loader');
  if (iframe && loader) {
    iframe.addEventListener('load', () => {
      loader.style.display = 'none';
      iframe.style.opacity = '1';
    });
  }
}

function handleSpamCheck() {
  const input = document.getElementById('spamInput').value.trim();
  const resDiv = document.getElementById('spamResult');
  if (!resDiv) return;

  if (!input) {
    resDiv.innerHTML = `<div class="lk-result-box" style="color:#f87171;">⚠️ Vui lòng nhập số điện thoại hoặc email.</div>`;
    return;
  }

  if (input.includes('@')) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(input)) {
      resDiv.innerHTML = `<div class="lk-result-box" style="color:#f87171;">⚠️ Định dạng email không hợp lệ (Ví dụ: ten@domain.com).</div>`;
      return;
    }
  } else {
    let phoneClean = input.replace(/[^0-9]/g, '');
    if (phoneClean.startsWith('84') && phoneClean.length > 10) {
      phoneClean = '0' + phoneClean.substring(2);
    }

    let hasCarrier = false;
    if (phoneClean.startsWith('02')) {
      if (phoneClean.length !== 11) {
        resDiv.innerHTML = `<div class="lk-result-box" style="color:#f87171;">⚠️ Số điện thoại cố định (bàn) phải có đúng 11 chữ số.</div>`;
        return;
      }
      hasCarrier = true;
    } else if (phoneClean.startsWith('1800') || phoneClean.startsWith('1900')) {
      if (phoneClean.length !== 8 && phoneClean.length !== 10) {
        resDiv.innerHTML = `<div class="lk-result-box" style="color:#f87171;">⚠️ Số hotline (1800/1900) phải có 8 hoặc 10 chữ số.</div>`;
        return;
      }
      hasCarrier = true;
    } else if (/^0[35789]/.test(phoneClean)) {
      if (phoneClean.length !== 10) {
        resDiv.innerHTML = `<div class="lk-result-box" style="color:#f87171;">⚠️ Số điện thoại di động Việt Nam phải có đúng 10 chữ số.</div>`;
        return;
      }

      const prefix2 = phoneClean.substring(1, 3);
      const prefix3 = phoneClean.substring(1, 4);

      const viettel = ['86', '96', '97', '98', '32', '33', '34', '35', '36', '37', '38', '39'];
      const mobi = ['89', '90', '93', '70', '79', '77', '76', '78'];
      const vina = ['88', '91', '94', '81', '82', '83', '84', '85'];
      const vnm = ['92', '52', '56', '58'];
      const gmobile = ['99', '59'];
      const mvno = ['87', '55'];

      hasCarrier = viettel.includes(prefix2) ||
        mobi.includes(prefix2) ||
        vina.includes(prefix2) ||
        vnm.includes(prefix2) ||
        gmobile.includes(prefix2) ||
        mvno.includes(prefix2) ||
        mvno.includes(prefix3);
    }

    if (!hasCarrier) {
      resDiv.innerHTML = `<div class="lk-result-box" style="color:#f87171;">⚠️ Số điện thoại không đúng định dạng di động (10 số), cố định (11 số) hoặc hotline Việt Nam.</div>`;
      return;
    }
  }

  resDiv.innerHTML = `<span class="status-dot dot-yellow"></span> Đang truy vấn cơ sở dữ liệu bảo mật...`;

  try {
    fetch(`/api/spam-check?q=${encodeURIComponent(input)}`)
      .then(response => {
        if (!response.ok) {
          return response.json().then(errData => {
            resDiv.innerHTML = `<div class="lk-result-box" style="color:#f87171;">⚠️ Lỗi: ${errData.error || 'Yêu cầu không hợp lệ.'}</div>`;
          });
        }
        return response.json().then(data => {
          if (data.type === 'email') {
            if (data.safe) {
              resDiv.innerHTML = `
                <div class="lk-result-box">
                  <span class="lk-status-tag lk-status--safe">AN TOÀN</span>
                  <div style="font-weight:700;">Không tìm thấy dữ liệu rò rỉ!</div>
                  <div style="color: var(--text-muted); margin-top: 4px;">Địa chỉ email của bạn hiện không nằm trong cơ sở dữ liệu các vụ xâm nhập bảo mật được công bố công khai.</div>
                </div>
              `;
            } else {
              resDiv.innerHTML = `
                <div class="lk-result-box">
                  <span class="lk-status-tag lk-status--danger">⚠️ CẢNH BÁO RÒ RỈ</span>
                  <div style="font-weight: 700; font-size:14px; margin-bottom: 6px;">Email này đã bị phát hiện trong ${data.count} vụ lộ lọt dữ liệu công cộng!</div>
                  <div style="color: var(--text-muted); line-height: 1.4;">
                    - Nguồn rò rỉ tiêu biểu: <strong>${data.breaches.join(', ')}</strong><br/>
                    - Lời khuyên: Hãy thay đổi mật khẩu tài khoản liên kết với email này ngay lập tức để bảo vệ tài sản số.
                  </div>
                </div>
              `;
            }
          } else if (data.type === 'phone') {
            if (data.safe) {
              resDiv.innerHTML = `
                <div class="lk-result-box">
                  <span class="lk-status-tag lk-status--safe">AN TOÀN</span>
                  <table class="lk-details-table">
                    <tr><td>Nhà mạng</td><td>${data.carrier}</td></tr>
                    <tr><td>Đánh giá</td><td style="color:#34d399;">Số thuê bao sạch</td></tr>
                    <tr><td>Số lượt báo cáo</td><td>0 báo cáo rác</td></tr>
                    <tr><td>Chi tiết</td><td>${data.details}</td></tr>
                  </table>
                </div>
              `;
            } else {
              resDiv.innerHTML = `
                <div class="lk-result-box">
                  <span class="lk-status-tag lk-status--danger">BÁO CÁO SPAM</span>
                  <table class="lk-details-table">
                    <tr><td>Nhà mạng</td><td>${data.carrier}</td></tr>
                    <tr><td>Đánh giá</td><td style="color:#f87171;">Số điện thoại quảng cáo / cuộc gọi rác</td></tr>
                    <tr><td>Số lượt báo cáo</td><td>${data.spamReports} lượt báo cáo từ cộng đồng</td></tr>
                    <tr><td>Đặc điểm cuộc gọi</td><td>${data.details}</td></tr>
                  </table>
                </div>
              `;
            }
          }
        });
      })
      .catch(err => {
        resDiv.innerHTML = `<div class="lk-result-box" style="color:#f87171;">⚠️ Lỗi kết nối dịch vụ kiểm tra bảo mật: ${err.message}</div>`;
      });
  } catch (err) {
    resDiv.innerHTML = `<div class="lk-result-box" style="color:#f87171;">⚠️ Lỗi kết nối: ${err.message}</div>`;
  }
}

async function handleTaxCheck() {
  const input = document.getElementById('taxInput').value.trim();
  const resDiv = document.getElementById('taxLookupResult');
  if (!resDiv) return;

  if (!input) {
    resDiv.innerHTML = `<div class="lk-result-box" style="color:#f87171;">⚠️ Vui lòng nhập mã số thuế, số CCCD/CMND hoặc tên doanh nghiệp cần tra cứu.</div>`;
    return;
  }

  const isNumericMST = /^[0-9]+[0-9-]*$/.test(input);
  if (isNumericMST) {
    const cleanMST = input.replace(/[^0-9]/g, '');
    if (cleanMST.length !== 9 && cleanMST.length !== 10 && cleanMST.length !== 12 && cleanMST.length !== 13) {
      resDiv.innerHTML = `<div class="lk-result-box" style="color:#f87171;">⚠️ Mã số thuế / CCCD / CMND hợp lệ phải có 9, 10, 12 hoặc 13 chữ số.</div>`;
      return;
    }
  } else {
    if (input.length < 2) {
      resDiv.innerHTML = `<div class="lk-result-box" style="color:#f87171;">⚠️ Vui lòng nhập từ khóa tra cứu có độ dài từ 2 ký tự trở lên.</div>`;
      return;
    }
  }

  resDiv.innerHTML = `<span class="status-dot dot-yellow"></span> Đang truy vấn Cổng thông tin Doanh nghiệp...`;

  try {
    const response = await fetch(`/api/tax-lookup?q=${encodeURIComponent(input)}`);
    if (!response.ok) {
      const errData = await response.json();
      resDiv.innerHTML = `
        <div class="lk-result-box" style="color:#f87171;">
          <div>⚠️ Lỗi: ${errData.error || 'Không tìm thấy thông tin doanh nghiệp khớp với mã số thuế hoặc từ khóa này.'}</div>
          <div style="margin-top: 12px; font-size: 12px; color: var(--text-secondary); border-top: 1px solid rgba(255,255,255,0.06); padding-top: 8px; line-height: 1.4;">
            💡 <strong>Mẹo tra cứu cá nhân:</strong> Một số mã số thuế cá nhân mới hoặc bảo mật cao không thể tra cứu tự động. Bạn có thể truy cập trực tiếp trang chính thức của Tổng cục Thuế:
            <div style="margin-top: 6px; display: flex; gap: 8px; flex-wrap: wrap;">
              <a href="https://canhan.gdt.gov.vn" target="_blank" class="lot-link" style="padding: 4px 12px; font-size:11px; display: inline-block;">canhan.gdt.gov.vn ↗</a>
              <a href="https://masothue.com/Search/?q=${encodeURIComponent(input)}&type=auto" target="_blank" class="lot-link" style="padding: 4px 12px; font-size:11px; display: inline-block; background: rgba(245,158,11,0.15); color: #fbbf24; border-color: rgba(245,158,11,0.3);">Xem trên MaSoThue.com ↗</a>
            </div>
            hoặc tra cứu trên ứng dụng di động <strong>eTax Mobile</strong> của Ngành Thuế.
          </div>
        </div>`;
      return;
    }

    const data = await response.json();
    if (!data.results || data.results.length === 0) {
      resDiv.innerHTML = `
        <div class="lk-result-box" style="color:#fbbf24;">
          <div>⚠️ Không tìm thấy thông tin khớp với từ khóa của bạn.</div>
          <div style="margin-top: 12px; font-size: 12px; color: var(--text-secondary); border-top: 1px solid rgba(255,255,255,0.06); padding-top: 8px; line-height: 1.4;">
            💡 <strong>Mẹo tra cứu cá nhân:</strong> Một số mã số thuế cá nhân mới hoặc bảo mật cao không thể tra cứu tự động. Bạn có thể truy cập trực tiếp trang chính thức của Tổng cục Thuế:
            <div style="margin-top: 6px; display: flex; gap: 8px; flex-wrap: wrap;">
              <a href="https://canhan.gdt.gov.vn" target="_blank" class="lot-link" style="padding: 4px 12px; font-size:11px; display: inline-block;">canhan.gdt.gov.vn ↗</a>
              <a href="https://masothue.com/Search/?q=${encodeURIComponent(input)}&type=auto" target="_blank" class="lot-link" style="padding: 4px 12px; font-size:11px; display: inline-block; background: rgba(245,158,11,0.15); color: #fbbf24; border-color: rgba(245,158,11,0.3);">Xem trên MaSoThue.com ↗</a>
            </div>
            hoặc tra cứu trên ứng dụng di động <strong>eTax Mobile</strong> của Ngành Thuế.
          </div>
        </div>`;
      return;
    }

    let html = `<div style="display:flex; flex-direction:column; gap:12px; max-height:450px; overflow-y:auto; padding-right:4px;">`;
    data.results.forEach(company => {
      const mstHTML = company.mstImg
        ? `<img src="${company.mstImg}" style="max-height: 18px; vertical-align: middle;" alt="MST" />`
        : company.mst;

      const detailLink = company.url
        ? `<div style="margin-top: 10px; text-align: right;">
            <a href="${company.url}" target="_blank" class="lot-link" style="padding: 4px 12px; font-size:11px;">
              Xem chi tiết đối tác 
            </a>
           </div>`
        : `<div style="margin-top: 10px; text-align: right;">
            <a href="https://masothue.com/Search/?q=${encodeURIComponent(company.mst || company.name)}" target="_blank" class="lot-link" style="padding: 4px 12px; font-size:11px;">
              Xem đầy đủ trên MaSoThue.com 
            </a>
           </div>`;

      html += `
        <div class="lk-result-box" style="margin-bottom:0;">
          <span class="lk-status-tag lk-status--safe" style="background:rgba(96,165,250,0.15);color:var(--accent-blue);">${company.status || 'ĐANG HOẠT ĐỘNG'}</span>
          <table class="lk-details-table">
            <tr><td>Tên doanh nghiệp / Cá nhân</td><td style="font-weight:700; color:var(--text-primary);">${company.name}</td></tr>
            <tr><td>Mã Số Thuế</td><td>${mstHTML}</td></tr>
            <tr><td>Đại diện / Chủ hộ</td><td>${company.representative}</td></tr>
            <tr><td>Địa chỉ đăng ký</td><td>${company.address}</td></tr>
          </table>
          ${detailLink}
        </div>
      `;
    });
    html += `</div>`;
    resDiv.innerHTML = html;

  } catch (err) {
    resDiv.innerHTML = `<div class="lk-result-box" style="color:#f87171;">⚠️ Lỗi kết nối Cổng thông tin Doanh nghiệp: ${err.message}</div>`;
  }
}

function handlePostalChange() {
  const val = document.getElementById('postalSelect').value;
  const resDiv = document.getElementById('postalResult');
  if (!val || !resDiv) return;

  const data = POSTAL_CODES[val];
  resDiv.innerHTML = `
    <div class="postal-result-card">
      <div>
        <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">${data.name}</div>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Mã bưu chính của Tỉnh / Thành phố</div>
      </div>
      <div class="postal-code-val">${data.code}</div>
    </div>
  `;
}

// ─── LICENSE PLATES SEARCH ────────────────────────────────────────────────────
function renderAllPlates(filter = '') {
  const resultDiv = document.getElementById('platesResult');
  if (!resultDiv) return;

  const query = filter.toLowerCase().trim();

  if (currentPlatesMode === 'new') {
    const filtered = NEW_PROVINCES_2025.filter(item => {
      return item.name.toLowerCase().includes(query) ||
        item.merged.toLowerCase().includes(query) ||
        item.capital.toLowerCase().includes(query) ||
        item.codes.toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
      resultDiv.innerHTML = `<div class="lk-result-box" style="color:#fbbf24;">⚠️ Không tìm thấy đơn vị hành chính mới nào khớp với "${filter}".</div>`;
      return;
    }

    let html = `<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:12px; max-height:500px; overflow-y:auto; padding-right:5px;">`;
    filtered.forEach(item => {
      const isMerged = item.merged !== 'Giữ nguyên';
      const tagClass = isMerged ? 'lk-status--danger' : 'lk-status--safe';
      const tagText = isMerged ? 'Sáp nhập / Hợp nhất' : 'Giữ nguyên';

      html += `
        <div class="lk-result-box" style="margin:0; padding:12px 16px; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.01);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; width:100%;">
            <span style="font-weight:700; font-size:15px; color:var(--accent-blue); flex:1;">${item.id}. ${item.name}</span>
            <span class="lk-status-tag ${tagClass}" style="font-size:10px; padding:2px 6px; margin-left:10px; margin-bottom:0;">${tagText}</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:4px; font-size:12px; margin-bottom:6px;">
            <div><span style="color:var(--text-muted);">Các đơn vị:</span> <span style="font-weight:600; color:var(--text-primary);">${item.merged}</span></div>
            <div><span style="color:var(--text-muted);">Trung tâm hành chính:</span> <span style="font-weight:600; color:var(--accent-green);">${item.capital}</span></div>
            <div style="display:flex; justify-content:space-between; gap:10px; margin-top:2px; margin-bottom:2px;">
              <div><span style="color:var(--text-muted);">Diện tích:</span> <span style="font-weight:600; color:var(--text-primary);">${item.area} km²</span></div>
              <div><span style="color:var(--text-muted);">Dân số:</span> <span style="font-weight:600; color:var(--text-primary);">${item.population} người</span></div>
            </div>
            <div style="margin-top:4px;"><span style="color:var(--text-muted);">Mã biển số xe gộp:</span> <span style="font-size:14px; font-weight:800; color:var(--accent-yellow);">${item.codes}</span></div>
          </div>
          ${item.note ? `
          <div style="font-size:11px; color:var(--text-muted); border-top: 1px solid rgba(255,255,255,0.05); padding-top:6px; margin-top:6px; line-height:1.4;">
            <i>${item.note}</i>
          </div>
          ` : ''}
        </div>
      `;
    });
    html += `</div>`;
    resultDiv.innerHTML = html;
  } else {
    const filtered = LICENSE_PLATES.filter(item => {
      return item.province.toLowerCase().includes(query) || item.code.toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
      resultDiv.innerHTML = `<div class="lk-result-box" style="color:#fbbf24;">⚠️ Không tìm thấy tỉnh thành hoặc biển số xe cũ nào khớp với "${filter}".</div>`;
      return;
    }

    let html = `<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:12px; max-height:500px; overflow-y:auto; padding-right:5px;">`;
    filtered.forEach(item => {
      const isMerged = item.status === 'Sáp nhập';
      const tagClass = isMerged ? 'lk-status--danger' : 'lk-status--safe';
      const tagText = isMerged ? 'Đã sáp nhập trước đó' : 'Hoạt động cũ';

      html += `
        <div class="lk-result-box" style="margin:0; padding:12px 16px; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.01);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; width:100%;">
            <span style="font-weight:700; font-size:14px; color:var(--text-primary); flex:1;">${item.province}</span>
            <span class="lk-status-tag ${tagClass}" style="font-size:10px; padding:2px 6px; margin-left:10px; margin-bottom:0;">${tagText}</span>
          </div>
          <div style="display:flex; align-items:center; margin-bottom:6px;">
            <span style="font-size:11px; color:var(--text-muted); width:70px; flex-shrink:0;">Mã số xe:</span>
            <span style="font-size:14px; font-weight:800; color:var(--accent-blue);">${item.code}</span>
          </div>
          ${item.note ? `
          <div style="font-size:11px; color:var(--text-muted); border-top: 1px solid rgba(255,255,255,0.05); padding-top:6px; margin-top:6px; line-height:1.4;">
            <i>${item.note}</i>
          </div>
          ` : ''}
        </div>
      `;
    });
    html += `</div>`;
    resultDiv.innerHTML = html;
  }
}

// ─── GPS GEOLOCATION ──────────────────────────────────────────────────────────
function handleGetGps() {
  const loading = document.getElementById('gpsLoading');
  const result = document.getElementById('gpsResult');
  const latVal = document.getElementById('gps-lat-val');
  const lonVal = document.getElementById('gps-lon-val');
  const accVal = document.getElementById('gps-acc-val');
  const timeVal = document.getElementById('gps-time-val');
  const addressVal = document.getElementById('gps-address-val');
  const gmapsLink = document.getElementById('btnGmapsLink');
  const osmLink = document.getElementById('btnOsmLink');

  if (!navigator.geolocation) {
    alert('Trình duyệt của bạn không hỗ trợ định vị GPS.');
    return;
  }

  if (loading) loading.style.display = 'block';
  if (result) result.style.display = 'none';

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const accuracy = position.coords.accuracy;
      const timestamp = new Date(position.timestamp).toLocaleString('vi-VN');

      if (latVal) latVal.innerText = lat.toFixed(6);
      if (lonVal) lonVal.innerText = lon.toFixed(6);
      if (accVal) accVal.innerText = `± ${Math.round(accuracy)} mét`;
      if (timeVal) timeVal.innerText = timestamp;
      if (addressVal) addressVal.innerText = 'Đang giải mã địa chỉ từ bản đồ...';

      if (gmapsLink) gmapsLink.href = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
      if (osmLink) osmLink.href = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;

      if (loading) loading.style.display = 'none';
      if (result) result.style.display = 'block';

      // Reverse geocoding using Nominatim (OpenStreetMap)
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`, {
          headers: {
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
          }
        });
        if (res.ok) {
          const geoData = await res.json();
          if (addressVal) addressVal.innerText = geoData.display_name || 'Không tìm thấy địa chỉ cụ thể';
        } else {
          if (addressVal) addressVal.innerText = 'Không thể kết nối dịch vụ giải mã địa chỉ';
        }
      } catch (err) {
        if (addressVal) addressVal.innerText = 'Không thể tải địa chỉ (Lỗi kết nối)';
      }
    },
    (error) => {
      if (loading) loading.style.display = 'none';
      let msg = 'Không thể truy cập GPS.';
      if (error.code === error.PERMISSION_DENIED) {
        msg = 'Quyền truy cập vị trí bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.';
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        msg = 'Thông tin vị trí không khả dụng.';
      } else if (error.code === error.TIMEOUT) {
        msg = 'Hết thời gian yêu cầu định vị.';
      }
      alert(msg);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}
