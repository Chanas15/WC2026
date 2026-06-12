// api/matches.js — Đọc dữ liệu từ football-data.org (real-time, tự động)
// Không cần Notion nữa!

const STAGE_VI = {
  GROUP_STAGE:   'Vòng bảng',
  LAST_32:       'Vòng 32 đội',
  LAST_16:       'Vòng 16 đội',
  QUARTER_FINALS:'Tứ kết',
  SEMI_FINALS:   'Bán kết',
  THIRD_PLACE:   'Tranh hạng Ba',
  FINAL:         'Chung kết',
};

const STATUS_VI = {
  SCHEDULED: 'Chưa đấu',
  TIMED:     'Chưa đấu',
  IN_PLAY:   'Đang diễn ra',
  PAUSED:    'Đang diễn ra',
  FINISHED:  'Đã kết thúc',
  POSTPONED: 'Hoãn',
  CANCELLED: 'Huỷ',
};

// Chuyển UTC sang giờ VN (GMT+7)
function toVNTime(utcStr) {
  const d = new Date(utcStr);
  const vn = new Date(d.getTime() + 7 * 3600 * 1000);
  const dd = String(vn.getUTCDate()).padStart(2, '0');
  const mm = String(vn.getUTCMonth() + 1).padStart(2, '0');
  const hh = String(vn.getUTCHours()).padStart(2, '0');
  const min = String(vn.getUTCMinutes()).padStart(2, '0');
  return { ngay: `${dd}/${mm}`, gio: `${hh}:${min}` };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  const TOKEN = process.env.FOOTBALL_DATA_TOKEN;
  if (!TOKEN) {
    return res.status(500).json({ error: 'Thiếu FOOTBALL_DATA_TOKEN trong environment variables' });
  }

  const headers = { 'X-Auth-Token': TOKEN };

  try {
    // Gọi song song 2 API: danh sách trận + bảng xếp hạng
    const [matchesRes, standingsRes] = await Promise.all([
      fetch('https://api.football-data.org/v4/competitions/WC/matches?season=2026', { headers }),
      fetch('https://api.football-data.org/v4/competitions/WC/standings?season=2026', { headers }),
    ]);

    if (!matchesRes.ok) {
      const err = await matchesRes.json();
      console.error('football-data matches error:', err);
      return res.status(500).json({ error: 'Không lấy được danh sách trận' });
    }

    const matchData = await matchesRes.json();
    const standingsData = standingsRes.ok ? await standingsRes.json() : null;

    // ===== XỬ LÝ TRẬN ĐẤU =====
    let matchIndex = 1;
    const matches = matchData.matches.map(m => {
      const { ngay, gio } = toVNTime(m.utcDate);
      const stage = m.stage || '';
      const group = m.group ? m.group.replace('GROUP_', '') : 'KO';
      const score = m.score?.fullTime;
      const hasScore = score && score.home !== null && score.away !== null;
      const tyso = hasScore ? `${score.home} - ${score.away}` : '';

      // Xác định đội thắng
      let doithang = '';
      if (hasScore) {
        if (score.home > score.away) doithang = m.homeTeam?.name || '';
        else if (score.away > score.home) doithang = m.awayTeam?.name || '';
        else doithang = 'Hòa';
      }

      return {
        id: String(m.id),
        tran: `T${matchIndex++}`,
        vong: STAGE_VI[stage] || stage,
        bang: group,
        ngay,
        gio,
        doi1: m.homeTeam?.name || '?',
        doi2: m.awayTeam?.name || '?',
        co1: m.homeTeam?.crest || '',
        co2: m.awayTeam?.crest || '',
        tyso,
        doithang,
        trangthai: STATUS_VI[m.status] || 'Chưa đấu',
      };
    });

    // ===== TÍNH BẢNG XẾP HẠNG TỪ KẾT QUẢ TRẬN =====
    const groupMap = {};
    matches.filter(m => m.vong === 'Vòng bảng').forEach(m => {
      const g = m.bang;
      if (!groupMap[g]) groupMap[g] = {};
      [m.doi1, m.doi2].forEach(t => {
        if (t && !groupMap[g][t])
          groupMap[g][t] = { P:0, W:0, D:0, L:0, GF:0, GA:0, Pts:0 };
      });
      const s = m.tyso.match(/(\d+)\s*-\s*(\d+)/);
      if (s) {
        const g1 = +s[1], g2 = +s[2];
        const t1 = groupMap[g][m.doi1], t2 = groupMap[g][m.doi2];
        if (t1 && t2) {
          t1.P++; t2.P++;
          t1.GF += g1; t1.GA += g2; t2.GF += g2; t2.GA += g1;
          if (g1 > g2) { t1.W++; t1.Pts += 3; t2.L++; }
          else if (g1 < g2) { t2.W++; t2.Pts += 3; t1.L++; }
          else { t1.D++; t2.D++; t1.Pts++; t2.Pts++; }
        }
      }
    });

    let pos = 0;
    const standings = Object.entries(groupMap).flatMap(([bang, teams]) => {
      return Object.entries(teams)
        .map(([ten, s]) => ({ bang, ten, st:s.P, thang:s.W, hoa:s.D, thua:s.L, hs:s.GF-s.GA, diem:s.Pts }))
        .sort((a, b) => b.diem - a.diem || b.hs - a.hs || 0)
        .map((t, i) => ({ ...t, vi_tri: i + 1 }));
    });

    return res.status(200).json({ matches, standings });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Lỗi server' });
  }
}
