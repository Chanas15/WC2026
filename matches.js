// api/matches.js — Đọc dữ liệu trận đấu từ Notion
// Token ẩn trong Environment Variables, bạn bè chỉ xem được kết quả

export default async function handler(req, res) {
  // Cho phép website gọi API này
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Cache 60 giây — giảm số lần gọi Notion
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  try {
    let allMatches = [];
    let hasMore = true;
    let startCursor = undefined;

    // Notion trả tối đa 100 dòng/lần — lặp đến khi hết
    while (hasMore) {
      const response = await fetch(
        `https://api.notion.com/v1/databases/${process.env.WC_DATABASE_ID}/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28'
          },
          body: JSON.stringify({
            page_size: 100,
            ...(startCursor && { start_cursor: startCursor })
          })
        }
      );

      if (!response.ok) {
        const err = await response.json();
        console.error('Notion error:', err);
        return res.status(500).json({ error: 'Không đọc được dữ liệu từ Notion' });
      }

      const data = await response.json();

      // Chuyển đổi dữ liệu Notion sang dạng đơn giản
      const matches = data.results.map(page => {
        const p = page.properties;
        return {
          id: page.id,
          tran: getText(p['Trận']?.title),
          vong: p['Vòng đấu']?.select?.name || '',
          bang: p['Bảng']?.select?.name || '',
          ngay: getText(p['Ngày (VN)']?.rich_text),
          gio: getText(p['Giờ (VN)']?.rich_text),
          doi1: getText(p['Đội 1']?.rich_text),
          doi2: getText(p['Đội 2']?.rich_text),
          tyso: getText(p['Tỷ số']?.rich_text),
          doithang: getText(p['Đội thắng']?.rich_text),
          trangthai: p['Trạng thái']?.select?.name || 'Chưa đấu'
        };
      });

      allMatches = allMatches.concat(matches);
      hasMore = data.has_more;
      startCursor = data.next_cursor;
    }

    return res.status(200).json({ matches: allMatches });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Lỗi server' });
  }
}

// Hàm lấy text từ Notion rich_text hoặc title
function getText(arr) {
  if (!arr || !arr.length) return '';
  return arr.map(t => t.plain_text).join('');
}
