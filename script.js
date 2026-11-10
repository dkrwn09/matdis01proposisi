'use strict';
/* ==========================================================
   PROPOSISI – Digital Learning Platform (Vanilla JavaScript)
   Bagian: 1 Penyimpanan · 2 Mesin logika · 3 Halaman · 4 Navigasi · 5 Interaksi
   ========================================================== */
const $ = s => document.querySelector(s);

/* ---------- 1. Penyimpanan (localStorage) ---------- */
const LS = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v === null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* abaikan */ } }
};
let done = LS.get('pl_done', []), marks = LS.get('pl_marks', []), last = LS.get('pl_last', null);

/* ---------- 2. Mesin logika (parser aman, tanpa eval) ---------- */
// Prioritas: ~ > ∧ > ∨ > → > ↔
const norm = s => s.replace(/<->/g, '↔').replace(/->/g, '→').replace(/&|\^/g, '∧').replace(/\|/g, '∨').replace(/!/g, '~').replace(/\s+/g, '');
function parse(src) {
  const t = [...norm(src)]; let i = 0;
  if (!t.length) throw new Error('Ekspresi masih kosong.');
  for (const c of t) if (!'pqr~∧∨→↔()'.includes(c)) throw new Error(`Karakter "${c}" tidak didukung. Gunakan p, q, r, ~, ∧, ∨, →, ↔ dan tanda kurung.`);
  const iff = () => { let l = imp(); while (t[i] === '↔') { i++; l = { o: '↔', a: l, b: imp() }; } return l; };
  const imp = () => { const l = or(); if (t[i] === '→') { i++; return { o: '→', a: l, b: imp() }; } return l; };
  const or = () => { let l = and(); while (t[i] === '∨') { i++; l = { o: '∨', a: l, b: and() }; } return l; };
  const and = () => { let l = un(); while (t[i] === '∧') { i++; l = { o: '∧', a: l, b: un() }; } return l; };
  const un = () => {
    if (t[i] === '~') { i++; return { o: '~', a: un() }; }
    if (t[i] === '(') { i++; const e = iff(); if (t[i] !== ')') throw new Error('Tanda kurung belum lengkap.'); i++; return e; }
    if (t[i] && 'pqr'.includes(t[i])) return { v: t[i++] };
    throw new Error('Ekspresi tidak valid: operand (p, q, r) tidak ditemukan pada posisi operator.');
  };
  const e = iff();
  if (i < t.length) throw new Error('Ekspresi tidak valid: urutan operator/operan atau tanda kurung salah.');
  return e;
}
const str = (n, root) => {
  if (n.v) return n.v;
  if (n.o === '~') return '~' + str(n.a);
  const s = str(n.a) + n.o + str(n.b);
  return root ? s : '(' + s + ')';
};
const ev = (n, e) => n.v ? e[n.v] : n.o === '~' ? !ev(n.a, e) : n.o === '∧' ? ev(n.a, e) && ev(n.b, e) : n.o === '∨' ? ev(n.a, e) || ev(n.b, e) : n.o === '→' ? !ev(n.a, e) || ev(n.b, e) : ev(n.a, e) === ev(n.b, e);
const varsOf = s => [...new Set(norm(s).match(/[pqr]/g) || [])].sort();
const rowsOf = vs => Array.from({ length: 2 ** vs.length }, (_, r) => Object.fromEntries(vs.map((v, j) => [v, !((r >> (vs.length - 1 - j)) & 1)]))); // baris pertama: semua B
function steps(n, env) { // langkah perhitungan bertahap (postorder)
  const out = [];
  (function w(x) { if (x.v) return; if (x.a) w(x.a); if (x.b) w(x.b); const l = str(x, true); if (!out.some(o => o[0] === l)) out.push([l, ev(x, env)]); })(n);
  return out;
}
const B = v => v ? 'B' : 'S';
const cell = v => `<td class="${v ? 'b' : 's'}">${B(v)}</td>`;
function tt(vs, exprs, hl) { // tabel kebenaran otomatis
  const ps = exprs.map(parse);
  return `<div class="tw"><table class="tt"><tr>${vs.map(v => `<th>${v}</th>`).join('')}${exprs.map(e => `<th>${e}</th>`).join('')}</tr>` +
    rowsOf(vs).map(env => `<tr${hl && vs.every(v => env[v] === hl[v]) ? ' class="hl"' : ''}>${vs.map(v => cell(env[v])).join('')}${ps.map(p => cell(ev(p, env))).join('')}</tr>`).join('') + '</table></div>';
}
const cols = (a, vs) => rowsOf(vs).map(e => ev(parse(a), e));
const same = (a, b, vs) => cols(a, vs).every((x, i) => x === cols(b, vs)[i]);
const kind = (s, vs) => { const c = cols(s, vs); return c.every(x => x) ? 'Tautologi' : c.every(x => !x) ? 'Kontradiksi' : 'Kontingensi'; };
const badge = (ok, y, n) => `<span class="badge ${ok ? 'b' : 's'}">${ok ? y : n}</span>`;
const dl = o => '<dl class="kv">' + Object.entries(o).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('') + '</dl>';

/* ---------- 3. Isi halaman ---------- */
const OPS = [
  { n: 'Negasi', s: '~p', v: ['p'], e: ['~p'], read: '“bukan p” atau “tidak benar bahwa p”',
    def: 'Negasi adalah operasi pada satu proposisi yang membalik nilai kebenarannya. Negasi dari p ditulis ~p.',
    rule: 'Jika p benar maka ~p salah; jika p salah maka ~p benar.',
    ex: 'p: “Paris berada di Perancis” (B). ~p: “Paris tidak berada di Perancis” (S).',
    calc: 'p = B maka ~p = ~B = S', st: ['Tentukan nilai p, yaitu B.', 'Balik nilainya: B menjadi S.', 'Jadi ~p = S.'] },
  { n: 'Konjungsi', s: 'p ∧ q', v: ['p', 'q'], e: ['p∧q'], read: '“p dan q”',
    def: 'Konjungsi menghubungkan dua proposisi dengan kata “dan”. Hasilnya benar hanya jika kedua proposisi benar.',
    rule: 'p ∧ q benar jika p benar dan q benar. Selain itu salah.',
    ex: 'p: “Fifi mahasiswa yang pandai”, q: “Fifi belajar tiap malam”. p ∧ q: “Fifi pandai dan Fifi belajar tiap malam”.',
    calc: 'p = B, q = S maka p ∧ q = B ∧ S = S', st: ['Tentukan p = B dan q = S.', 'Konjungsi butuh keduanya B.', 'Karena q = S, hasilnya S.'] },
  { n: 'Disjungsi', s: 'p ∨ q', v: ['p', 'q'], e: ['p∨q'], read: '“p atau q”',
    def: 'Disjungsi menghubungkan dua proposisi dengan kata “atau” (makna inklusif). Hasilnya salah hanya jika kedua proposisi salah.',
    rule: 'p ∨ q salah jika p salah dan q salah. Selain itu benar.',
    ex: 'p: “Hari ini hujan”, q: “Hari ini dingin”. p ∨ q: “Hari ini hujan atau dingin”.',
    calc: 'p = S, q = B maka p ∨ q = S ∨ B = B', st: ['Tentukan p = S dan q = B.', 'Disjungsi cukup satu bernilai B.', 'Karena q = B, hasilnya B.'] },
  { n: 'Implikasi', s: 'p → q', v: ['p', 'q'], e: ['p→q'], read: '“jika p maka q”',
    def: 'Implikasi (kondisional) berbentuk “jika p maka q”. p disebut hipotesis (antenseden) dan q disebut konklusi (konsekuen).',
    rule: 'p → q salah hanya jika p benar dan q salah. Selain itu benar.',
    ex: '“Jika Amir mempunyai mobil maka ia orang kaya.”',
    calc: 'p = B, q = S maka p → q = B → S = S', st: ['Tentukan p = B dan q = S.', 'Satu-satunya kasus salah: antenseden B, konsekuen S.', 'Kasus ini terpenuhi, jadi hasilnya S.'] },
  { n: 'Biimplikasi', s: 'p ↔ q', v: ['p', 'q'], e: ['p↔q', '(p→q)∧(q→p)'], read: '“p jika dan hanya jika q”',
    def: 'Biimplikasi (bikondisional) berbentuk “p jika dan hanya jika q”, setara dengan (p → q) ∧ (q → p).',
    rule: 'p ↔ q benar jika p dan q bernilai sama (keduanya B atau keduanya S). Jika berbeda, salah.',
    ex: '“Udara di luar panas jika dan hanya jika Anda membeli es krim.”',
    calc: 'p = S, q = S maka p ↔ q = S ↔ S = B', st: ['Tentukan p = S dan q = S.', 'Bandingkan: nilainya sama.', 'Jadi hasilnya B.'] }
];

const MACAM = [
  ['Proposisi Hipotesis – Kondisional (p → q)', { Definisi: 'Pernyataan yang terdiri dari dua bagian yang saling bergantung; ditandai “jika … maka …”.', Simbol: '<code>p → q</code>', 'Cara membaca': '“jika p maka q” (q belum tentu p)', Penjelasan: 'p adalah antenseden, q adalah konsekuen. Bernilai salah jika antenseden benar dan konsekuen salah.', 'Contoh kalimat': 'Jika hujan turun maka jalanan basah.', 'Sehari-hari': 'Jika nilai ujian ≥ 80 maka mahasiswa lulus mata kuliah.' }],
  ['Proposisi Hipotesis – Bikondisional (p ↔ q)', { Definisi: 'Hipotesis dua arah yang ditandai “jika dan hanya jika”.', Simbol: '<code>p ↔ q</code>', 'Cara membaca': '“p jika dan hanya jika q”', Penjelasan: 'Benar jika antenseden dan konsekuen sama-sama benar atau sama-sama salah.', 'Contoh kalimat': 'Segitiga sama sisi jika dan hanya jika ketiga sudutnya sama besar.', 'Sehari-hari': 'Pintu terbuka jika dan hanya jika kartu akses valid.' }],
  ['Proposisi Disjungtif (p ∨ q)', { Definisi: 'Proposisi majemuk yang ditandai kata “atau”, digunakan dalam makna inklusif.', Simbol: '<code>p ∨ q</code>', 'Cara membaca': '“proposisi p atau q”', Penjelasan: 'Benar jika salah satu atau keduanya benar; salah jika keduanya salah.', 'Contoh kalimat': 'Gajah lebih besar daripada tikus atau 2 + 2 = 5 (benar).', 'Sehari-hari': 'Login berhasil dengan kata sandi atau sidik jari.' }],
  ['Proposisi Konjungtif (p ∧ q)', { Definisi: 'Proposisi majemuk yang menghubungkan dua predikat dengan subjek yang sama, ditandai kata “dan”.', Simbol: '<code>p ∧ q</code>', 'Cara membaca': '“proposisi p dan q”', Penjelasan: 'Benar hanya jika p dan q keduanya benar.', 'Contoh kalimat': 'Fifi adalah mahasiswa yang pandai dan Fifi belajar tiap malam.', 'Sehari-hari': 'Boleh masuk ujian jika membawa KTM dan kartu ujian.' }]
];

const SOAL = [ // Contoh soal dari Latihan 1 & 2 pada modul
  { t: 'Menentukan proposisi atau bukan (Latihan 2 no. 1)', q: 'Tentukan apakah proposisi: (a) 13 adalah bilangan ganjil; (e) Ada monyet di bulan; (i) Jam berapa kereta api Argo Bromo tiba di Gambir?; (j) Isilah gelas tersebut dengan air!; (k) x + 3 = 8.', dik: 'Lima kalimat (a), (e), (i), (j), (k).', dit: 'Mana yang proposisi dan bukan?', st: ['Proposisi harus berupa pernyataan yang pasti bernilai B atau S.', '(a) pernyataan, bernilai B → proposisi.', '(e) pernyataan, bernilai S → proposisi.', '(i) pertanyaan → bukan proposisi.', '(j) perintah → bukan proposisi.', '(k) kalimat terbuka (nilai x belum diketahui, sehingga tidak dapat ditentukan B/S) → bukan proposisi.'], ans: '(a) dan (e) proposisi; (i), (j), (k) bukan proposisi.', kes: 'Hanya pernyataan dengan nilai kebenaran pasti yang menjadi proposisi.' },
  { t: 'Menentukan simbol proposisi (Latihan 1 no. 1)', q: 'Pascal menemukan mesin hitung dan tidak benar bahwa komputer digital elektronik pertama dirakit pada abad ke-20 atau π dihitung hingga 1.000.000 angka desimal pada tahun 1954.', dik: 'p: Pascal menemukan mesin hitung; q: komputer digital elektronik pertama dirakit pada abad ke-20; r: π dihitung hingga 1.000.000 angka desimal pada 1954.', dit: 'Simbol proposisi.', st: ['Pisahkan kalimat menjadi p, q, r.', 'Bagian pertama: “p dan tidak q” ditulis p ∧ ~q.', 'Bagian kedua: r, dihubungkan dengan “atau”.', 'Gabungkan sesuai kunci jawaban modul: (p ∧ ~q) ∨ r.'], ans: '(p ∧ ~q) ∨ r', kes: 'Kalimat majemuk dipecah menjadi proposisi dasar lalu dihubungkan operator.' },
  { t: 'Menentukan nilai kebenaran (Latihan 1 no. 1)', q: 'Tentukan nilai kebenaran (p ∧ ~q) ∨ r jika p = B, q = B, r = S.', dik: 'p = B, q = B, r = S.', dit: 'Nilai (p ∧ ~q) ∨ r.', st: ['Substitusi: (B ∧ ~B) ∨ S.', '~B = S, sehingga (B ∧ S) ∨ S.', 'B ∧ S = S, sehingga S ∨ S.', 'S ∨ S = S.'], ans: 'Salah (S)', kes: 'Ekspresi bernilai salah.' },
  { t: 'Membuat tabel kebenaran (Latihan 1 no. 3)', q: 'Buatlah tabel kebenaran ~(p ∧ ~q).', dik: 'Ekspresi ~(p ∧ ~q), variabel p dan q.', dit: 'Tabel kebenaran.', st: ['Dua variabel → 4 baris.', 'Hitung ~q, lalu p ∧ ~q, lalu negasinya.'], ans: 'Lihat tabel: kolom terakhir B, S, B, B.', kes: 'Kolom akhir sama dengan tabel p → q, sehingga ~(p ∧ ~q) ≡ p → q.', tb: [['p', 'q'], ['~q', 'p∧~q', '~(p∧~q)']] },
  { t: 'Mengubah simbol menjadi kalimat (Latihan 1 no. 4)', q: 'p: Hari ini hari Senin; q: hujan turun; r: hari ini panas. Tuliskan kalimat dari ~p ∧ (q ∨ r) dan ~(p ∨ q) ∧ r.', dik: 'p, q, r seperti di atas.', dit: 'Kalimat verbal.', st: ['~p = “hari ini bukan hari Senin”; q ∨ r = “hujan turun atau hari ini panas”.', '~(p ∨ q) = “tidak benar bahwa hari ini Senin atau hujan turun”.'], ans: '1) Hari ini bukan hari Senin dan (hujan turun atau hari ini panas). 2) Tidak benar bahwa hari ini hari Senin atau hujan turun, dan hari ini panas.', kes: 'Setiap simbol diterjemahkan sesuai operatornya.' },
  { t: 'Menyelesaikan operasi logika (Latihan 1 no. 5)', q: 'Jika p = B, q = S, r = B tentukan: (a) (p ∧ q) → r; (b) (p ∨ q) → ~r; (c) p ∧ (q → r); (d) p → (q → r).', dik: 'p = B, q = S, r = B.', dit: 'Nilai keempat ekspresi.', st: ['(a) (B ∧ S) → B = S → B = B.', '(b) (B ∨ S) → ~B = B → S = S.', '(c) q → r = S → B = B; B ∧ B = B.', '(d) q → r = B; B → B = B.'], ans: '(a) B, (b) S, (c) B, (d) B', kes: 'Selesaikan dari kurung terdalam.' },
  { t: 'Membuktikan tautologi (Latihan 2 no. 4)', q: 'Buktikan dengan tabel kebenaran bahwa p ∨ ~(p ∧ q) adalah tautologi.', dik: 'Ekspresi p ∨ ~(p ∧ q).', dit: 'Apakah kolom terakhir semua B?', st: ['Buat kolom p ∧ q, ~(p ∧ q), lalu p ∨ ~(p ∧ q).', 'Periksa kolom terakhir.'], ans: 'Semua nilai B.', kes: 'Kolom terakhir hanya memuat B, jadi tautologi.', tb: [['p', 'q'], ['p∧q', '~(p∧q)', 'p∨~(p∧q)']] },
  { t: 'Membuktikan kontradiksi (Latihan 1 no. 8)', q: 'Buktikan (p ∨ q) ∧ ~(p ∨ q) adalah kontradiksi.', dik: 'Ekspresi (p ∨ q) ∧ ~(p ∨ q).', dit: 'Apakah kolom terakhir semua S?', st: ['Misal A = p ∨ q. Ekspresi menjadi A ∧ ~A.', 'A dan ~A selalu berbeda nilai, jadi konjungsinya selalu S.', 'Verifikasi dengan tabel.'], ans: 'Semua nilai S.', kes: 'Kolom terakhir hanya memuat S, jadi kontradiksi.', tb: [['p', 'q'], ['p∨q', '~(p∨q)', '(p∨q)∧~(p∨q)']] },
  { t: 'Membuktikan ekivalensi logis', q: 'Buktikan ~(p ∧ q) ≡ ~p ∨ ~q.', dik: 'Dua ekspresi: ~(p ∧ q) dan ~p ∨ ~q.', dit: 'Apakah nilai keduanya sama di setiap baris?', st: ['Hitung ~(p ∧ q): S, B, B, B.', 'Hitung ~p ∨ ~q: S, B, B, B.', 'Bandingkan kedua kolom.'], ans: 'Kolom sama persis.', kes: 'Terbukti ~(p ∧ q) ≡ ~p ∨ ~q (Hukum De Morgan).', tb: [['p', 'q'], ['~(p∧q)', '~p∨~q']] },
  { t: 'Konvers, invers, kontraposisi (Latihan 2 no. 5)', q: '“Jika Amir mempunyai mobil, maka ia orang kaya.”', dik: 'p: Amir mempunyai mobil; q: Amir orang kaya.', dit: 'Konvers, invers, kontraposisi.', st: ['Konvers (q → p): tukar posisi.', 'Invers (~p → ~q): negasikan keduanya.', 'Kontraposisi (~q → ~p): tukar dan negasikan.'], ans: 'Konvers: Jika Amir orang kaya maka ia mempunyai mobil. Invers: Jika Amir tidak mempunyai mobil maka ia bukan orang kaya. Kontraposisi: Jika Amir bukan orang kaya maka ia tidak mempunyai mobil.', kes: 'Hanya kontraposisi yang ekivalen dengan pernyataan awal.' },
  { t: 'Biimplikasi bernilai salah (Latihan 1 no. 6)', q: 'Tuliskan dengan simbol dan buktikan “jika 1 > 2, maka 3 < 6” adalah p ↔ q = salah.', dik: 'p: 1 > 2 (S); q: 3 < 6 (B).', dit: 'Nilai p ↔ q.', st: ['p = S karena 1 tidak lebih besar dari 2.', 'q = B karena 3 < 6.', 'S ↔ B: nilai berbeda, sehingga hasilnya S.'], ans: 'p ↔ q = S', kes: 'Biimplikasi bernilai salah karena kedua nilai berbeda.' }
];

const MCQ = [
  ['Proposisi adalah…', ['Kalimat yang selalu benar', 'Pernyataan yang bernilai benar atau salah', 'Kalimat perintah', 'Kalimat tanya'], 1, 'Proposisi adalah pernyataan yang bernilai benar atau salah.'],
  ['Manakah yang bukan proposisi?', ['13 adalah bilangan ganjil', '1 + 1 = 2', 'Isilah gelas dengan air!', 'Hari ini hari Rabu'], 2, 'Perintah tidak bernilai benar/salah.'],
  ['Jika p = B maka ~p bernilai…', ['B', 'S', '1', 'Tidak dapat ditentukan'], 1, 'Negasi membalik nilai.'],
  ['p ∧ q bernilai B jika…', ['p B, q S', 'p dan q keduanya B', 'p dan q keduanya S', 'Salah satu B'], 1, 'Konjungsi benar hanya jika keduanya benar.'],
  ['p ∨ q bernilai S jika…', ['p B, q S', 'p S, q B', 'p dan q keduanya S', 'p dan q keduanya B'], 2, 'Disjungsi salah hanya jika keduanya salah.'],
  ['p → q bernilai S jika…', ['p S, q B', 'p S, q S', 'p B, q S', 'p B, q B'], 2, 'Implikasi salah jika antenseden B dan konsekuen S.'],
  ['p ↔ q bernilai B jika…', ['Nilai p dan q berbeda', 'Nilai p dan q sama', 'Hanya p B', 'Hanya q B'], 1, 'Biimplikasi benar jika nilainya sama.'],
  ['p ∨ ~p disebut…', ['Kontradiksi', 'Tautologi', 'Kontingensi', 'Ekivalensi'], 1, 'Selalu B, jadi tautologi.'],
  ['Kontraposisi dari p → q adalah…', ['q → p', '~p → ~q', '~q → ~p', '~(p → q)'], 2, 'Kontraposisi: ~q → ~p.'],
  ['~(p ∧ q) ekivalen dengan…', ['~p ∧ ~q', '~p ∨ ~q', 'p ∨ q', 'p → q'], 1, 'Hukum De Morgan.']
];
const FILL = [
  ['Nilai p → q jika p = B dan q = S adalah… (B/S)', ['s'], 'Implikasi salah jika antenseden B dan konsekuen S.'],
  ['Hasil ~(~q) adalah… (tulis simbol)', ['q'], 'Negasi ganda mengembalikan nilai semula.'],
  ['Kontraposisi dari p → q (tulis dengan simbol)', ['~q→~p'], 'Tukar dan negasikan: ~q → ~p.'],
  ['Nilai p ↔ q jika p = S dan q = S adalah… (B/S)', ['b'], 'Nilai sama, biimplikasi benar.'],
  ['Berapa baris tabel kebenaran untuk 3 variabel?', ['8'], '2³ = 8 baris.']
];
const nf = s => norm(String(s).toLowerCase()).replace(/benar|true/g, 'b').replace(/salah|false/g, 's');

const lawBlock = (title, pairs, ex) => `<div class="card"><h3>${title}</h3>${pairs.map(([l, r]) => { const vs = varsOf(l + r); return `<p><code>${l.replace(/([∧∨])/g, ' $1 ')} = ${r.replace(/([∧∨])/g, ' $1 ')}</code> ${badge(same(l, r, vs), 'terbukti ekivalen', 'tidak ekivalen')}</p>${tt(vs, [l, r])}`; }).join('')}<p><b>Contoh:</b> ${ex}</p></div>`;

const PAGES = [
  { id: 'dashboard', ic: '🏠', t: 'Dashboard' },
  { id: 'pengertian', ic: '📘', t: 'Pengertian Proposisi', r: () => `<h2>Pengertian Proposisi</h2><p class="lead">Dasar semua logika: pernyataan yang dapat dinilai benar atau salah.</p>
<div class="card"><h3>Definisi</h3><p><b>Pernyataan</b> adalah kalimat deklaratif yang menyatakan suatu fakta. <b>Proposisi</b> adalah pernyataan yang bernilai <b>benar</b> atau <b>salah</b>, tetapi tidak keduanya sekaligus.</p>
${dl({ 'Nilai benar': 'True = 1 (B)', 'Nilai salah': 'False = 0 (S)', Lambang: 'Proposisi dilambangkan huruf kecil <code>p, q, r, …</code>' })}</div>
<div class="card"><h3>Contoh proposisi</h3><ol><li><b>“Gajah lebih besar daripada tikus.”</b> Pernyataan dan proposisi, nilainya <span class="badge b">Benar</span> karena memang gajah lebih besar.</li><li><b>“1 + 1 = 2.”</b> Proposisi <span class="badge b">Benar</span> karena hasil penjumlahan yang tepat adalah 2.</li><li><b>“2 + 2 = 5.”</b> Proposisi <span class="badge s">Salah</span> karena 2 + 2 = 4. Tetap proposisi, sebab nilainya pasti (salah).</li></ol>
<p>Contoh lain dari modul: “520 &lt; 111” adalah proposisi salah; “Sekarang tahun 2003 dan 99 &lt; 5” juga salah karena 99 &lt; 5 salah.</p></div>
<div class="card"><h3>Bukan proposisi</h3><ul><li><b>Pertanyaan:</b> “Jam berapa kereta Argo Bromo tiba di Gambir?”</li><li><b>Perintah/permintaan:</b> “Tolong untuk tidak tidur selama kuliah.” Bukan pernyataan, jadi bukan proposisi.</li><li><b>Kalimat terbuka:</b> “x + 3 = 8” atau “x &gt; 3”. Nilainya bergantung pada x sehingga belum dapat ditentukan B/S.</li></ul></div>
<div class="two"><div class="card yes"><h3>✅ Proposisi</h3><p>Pernyataan dengan nilai kebenaran pasti. Contoh: 13 adalah bilangan ganjil; Hari ini adalah hari Rabu.</p></div><div class="card nope"><h3>❌ Bukan proposisi</h3><p>Pertanyaan, perintah, dan kalimat terbuka. Contoh: Isilah gelas itu dengan air!; x + 3 = 8.</p></div></div>` },
  { id: 'macam', ic: '🧩', t: 'Macam-Macam Proposisi', r: () => `<h2>Macam-Macam Proposisi</h2><p class="lead">Hipotesis (kondisional dan bikondisional), disjungtif, dan konjungtif.</p>${MACAM.map(([h, o]) => `<div class="card"><h3>${h}</h3>${dl(o)}</div>`).join('')}` },
  { id: 'operasi', ic: '⚙️', t: 'Operasi Logika', r: () => `<h2>Operasi Logika</h2><p class="lead">Lima operasi dasar beserta aturan nilai kebenarannya.</p>${OPS.map(o => `<div class="card"><h3>${o.n} <span class="tag">${o.s}</span></h3>${dl({ Definisi: o.def, 'Simbol': `<code>${o.s}</code>`, 'Cara membaca': o.read, 'Aturan nilai': o.rule, 'Contoh kalimat': o.ex, 'Contoh hitung': `<code>${o.calc}</code>` })}${tt(o.v, o.e)}<b>Langkah demi langkah:</b><ol>${o.st.map(s => `<li>${s}</li>`).join('')}</ol></div>`).join('')}` },
  { id: 'tabel', ic: '📊', t: 'Tabel Kebenaran', r: () => `<h2>Tabel Kebenaran</h2><p class="lead">Keterangan: <span class="badge b">B = Benar</span> <span class="badge s">S = Salah</span></p>
${[['Negasi', ['p'], ['~p'], ['Baris 1: p B maka ~p S.', 'Baris 2: p S maka ~p B.']], ['Konjungsi', ['p', 'q'], ['p∧q'], ['B,B → B (keduanya benar).', 'B,S → S.', 'S,B → S.', 'S,S → S.']], ['Disjungsi', ['p', 'q'], ['p∨q'], ['B,B → B.', 'B,S → B (salah satu benar).', 'S,B → B.', 'S,S → S (keduanya salah).']], ['Implikasi', ['p', 'q'], ['p→q'], ['B,B → B.', 'B,S → S (satu-satunya salah).', 'S,B → B.', 'S,S → B (antenseden salah, implikasi tetap benar).']], ['Biimplikasi', ['p', 'q'], ['p↔q'], ['B,B → B (sama).', 'B,S → S (beda).', 'S,B → S (beda).', 'S,S → B (sama).']]].map(([n, v, e, k]) => `<div class="card"><h3>${n}</h3>${tt(v, e)}<ul>${k.map(x => `<li>${x}</li>`).join('')}</ul></div>`).join('')}` },
  { id: 'percobaan', ic: '🧪', t: 'Percobaan', r: () => `<h2>Percobaan Interaktif</h2><p class="lead">Atur nilai p, q, r, pilih atau susun ekspresi, lalu hitung.</p>
<div class="card"><h3>A. Nilai variabel</h3><div class="ctl">${['p', 'q', 'r'].map(v => `<label>${v} <select id="v_${v}"><option value="1">Benar (True)</option><option value="0">Salah (False)</option></select></label>`).join('')}</div></div>
<div class="card"><h3>B. Pilih operasi</h3><select id="preset"><option value="~p">1. Negasi (~p)</option><option value="p∧q">2. Konjungsi (p ∧ q)</option><option value="p∨q">3. Disjungsi (p ∨ q)</option><option value="p→q">4. Implikasi (p → q)</option><option value="p↔q">5. Biimplikasi (p ↔ q)</option><option value="(p∧q)→r">6. (p ∧ q) → r</option><option value="(p∨q)∧~r">7. (p ∨ q) ∧ ~r</option><option value="~(p∧q)">8. ~(p ∧ q)</option><option value="">Susun sendiri…</option></select></div>
<div class="card"><h3>C. Buat proposisi sendiri</h3><div class="toks" id="toks">${['p', 'q', 'r', '~', '∧', '∨', '→', '↔', '(', ')'].map(t => `<button data-t="${t}">${t}</button>`).join('')}<button data-t="⌫">⌫</button></div><input type="text" id="expr" value="~p" aria-label="Ekspresi logika" style="width:100%;margin-top:8px"><p class="lead" style="margin:6px 0 0">Operator didukung: ~ ∧ ∨ → ↔ (juga boleh ketik !, &amp;, |, -&gt;, &lt;-&gt;). Variabel: p, q, r.</p></div>
<div class="row"><button class="btn" id="calc">Hitung Hasil</button><button class="btn ghost" id="reset">Reset</button><button class="btn ghost" id="rand">Acak Nilai</button></div><div id="out" class="card" style="margin-top:18px">Tekan <b>Hitung Hasil</b> untuk melihat proses perhitungan.</div>`,
    init() {
      const $v = v => $('#v_' + v), env = () => ({ p: $v('p').value === '1', q: $v('q').value === '1', r: $v('r').value === '1' });
      const calc = () => {
        const out = $('#out'), src = $('#expr').value;
        try {
          const n = parse(src), e = env(), vs = varsOf(src), st = steps(n, e), res = ev(n, e);
          out.innerHTML = `<h3>Hasil Percobaan</h3><p><b>Nilai variabel:</b> ${['p', 'q', 'r'].map(v => `${v} = ${B(e[v])}`).join(', ')}</p><p><b>Ekspresi:</b> <code>${str(n, true)}</code></p><b>Proses bertahap:</b><ol class="steps">${st.map(([l, v]) => `<li><code>${l}</code> = ${B(v)}</li>`).join('')}</ol><p><b>Hasil akhir:</b> ${badge(res, 'B (Benar)', 'S (Salah)')}</p><p><b>Kesimpulan:</b> Ekspresi <code>${str(n, true)}</code> bernilai <b>${res ? 'Benar' : 'Salah'}</b> pada nilai tersebut. Jenis ekspresi: <b>${vs.length ? kind(src, vs) : '-'}</b>.</p><h3>Tabel kebenaran otomatis (${vs.length} variabel → ${2 ** vs.length} baris)</h3>${tt(vs, [str(n, true)], e)}`;
        } catch (er) { out.innerHTML = `<p class="err">⚠️ ${er.message}</p>`; }
      };
      $('#calc').onclick = calc;
      $('#preset').onchange = e => { if (e.target.value) { $('#expr').value = e.target.value; calc(); } };
      $('#toks').onclick = e => { const t = e.target.dataset.t; if (!t) return; const x = $('#expr'); x.value = t === '⌫' ? x.value.slice(0, -1) : x.value + t; $('#preset').value = ''; };
      $('#reset').onclick = () => { ['p', 'q', 'r'].forEach(v => $v(v).value = '1'); $('#preset').value = '~p'; $('#expr').value = '~p'; $('#out').innerHTML = 'Nilai dikembalikan. Tekan <b>Hitung Hasil</b>.'; };
      $('#rand').onclick = () => { ['p', 'q', 'r'].forEach(v => $v(v).value = Math.random() < .5 ? '1' : '0'); calc(); };
    } },
  { id: 'tautologi', ic: '♾️', t: 'Tautologi dan Kontradiksi', r: () => `<h2>Tautologi dan Kontradiksi</h2>
<div class="two"><div class="card yes"><h3>Tautologi</h3><p>Proposisi majemuk yang seluruh nilai pada kolom terakhir tabel kebenarannya <b>benar</b>.</p></div><div class="card nope"><h3>Kontradiksi</h3><p>Proposisi majemuk yang seluruh nilai pada kolom terakhir tabel kebenarannya <b>salah</b>.</p></div></div>
<div class="card"><h3>Perbedaan</h3><p>Tautologi selalu benar apa pun nilai variabelnya; kontradiksi selalu salah; jika campuran, disebut kontingensi.</p></div>
<div class="card"><h3>Contoh tautologi: p ∨ ~p</h3>${tt(['p'], ['~p', 'p∨~p'])}<ol><li>Jika p = B maka ~p = S, sehingga B ∨ S = B.</li><li>Jika p = S maka ~p = B, sehingga S ∨ B = B.</li></ol><p>Kolom terakhir hanya B → <b>tautologi</b>.</p></div>
<div class="card"><h3>Contoh kontradiksi: p ∧ ~p</h3>${tt(['p'], ['~p', 'p∧~p'])}<ol><li>p = B: B ∧ S = S.</li><li>p = S: S ∧ B = S.</li></ol><p>Kolom terakhir hanya S → <b>kontradiksi</b>.</p></div>` },
  { id: 'hukum', ic: '📐', t: 'Hukum Aljabar Proposisi', r: () => `<h2>Hukum Aljabar Proposisi</h2><p class="lead">Setiap hukum diverifikasi otomatis dengan tabel kebenaran.</p>${lawBlock('A. Hukum Idempoten', [['p∨p', 'p'], ['p∧p', 'p']], '“Hujan atau hujan” sama dengan “hujan”.')}${lawBlock('B. Hukum Asosiatif', [['(p∨q)∨r', 'p∨(q∨r)'], ['(p∧q)∧r', 'p∧(q∧r)']], 'Pengelompokan tiga syarat dengan “dan” tidak mengubah hasil.')}${lawBlock('C. Hukum Komutatif', [['p∨q', 'q∨p'], ['p∧q', 'q∧p']], '“Pandai dan rajin” sama dengan “rajin dan pandai”.')}${lawBlock('D. Hukum Distributif', [['p∨(q∧r)', '(p∨q)∧(p∨r)'], ['p∧(q∨r)', '(p∧q)∨(p∧r)']], 'Operator luar “membagi” ke dalam kurung.')}` },
  { id: 'ekivalensi', ic: '🟰', t: 'Ekivalensi Logis', r: () => `<h2>Ekivalensi Logis</h2><div class="card"><p>Dua proposisi P(p,q) dan Q(p,q) dikatakan <b>ekivalen secara logika</b>, ditulis <code>P(p,q) ≡ Q(p,q)</code>, jika keduanya memiliki nilai kebenaran yang sama pada setiap baris tabel kebenaran.</p><p><b>Syarat:</b> kolom hasil kedua proposisi identik.</p></div>
<div class="card"><h3>Contoh: ~(p ∧ q) ≡ ~p ∨ ~q</h3>${tt(['p', 'q'], ['p∧q', '~(p∧q)', '~p', '~q', '~p∨~q'])}<p>Kolom <code>~(p ∧ q)</code> dan <code>~p ∨ ~q</code> sama: ${badge(same('~(p∧q)', '~p∨~q', ['p', 'q']), 'Ekivalen ✓', 'Tidak ekivalen')}</p></div>` },
  { id: 'konvers', ic: '🔁', t: 'Konvers, Invers, dan Kontraposisi', r: () => `<h2>Konvers, Invers, dan Kontraposisi</h2><p class="lead">Bentuk awal: <code>p → q</code></p>
<div class="card">${dl({ Konvers: '<code>q → p</code>. Posisi p dan q ditukar.', Invers: '<code>~p → ~q</code>. Kedua variabel dinegasikan.', Kontraposisi: '<code>~q → ~p</code>. Ditukar dan dinegasikan.' })}<p><b>Contoh:</b> “Jika hujan turun maka jalanan basah.” Konvers: jika jalanan basah maka hujan turun. Invers: jika hujan tidak turun maka jalanan tidak basah. Kontraposisi: jika jalanan tidak basah maka hujan tidak turun.</p></div>
<div class="card"><h3>Tabel perbandingan</h3>${tt(['p', 'q'], ['~p', '~q', 'q→p', '~p→~q', '~q→~p', 'p→q'])}<p>Kolom <code>~q → ~p</code> sama dengan <code>p → q</code> ${badge(same('~q→~p', 'p→q', ['p', 'q']), 'ekivalen ✓', 'tidak ekivalen')}. Jadi <b>implikasi ekivalen dengan kontraposisinya</b>: <code>p → q ≡ ~q → ~p</code>. Konvers dan invers saling ekivalen, tetapi tidak ekivalen dengan implikasi.</p></div>` },
  { id: 'contoh', ic: '📝', t: 'Contoh Soal', r: () => `<h2>Contoh Soal</h2><p class="lead">${SOAL.length} soal dari latihan modul, lengkap dengan pembahasan.</p>${SOAL.map((s, i) => `<div class="card"><h3>Soal ${i + 1}. ${s.t}</h3><p><b>Soal:</b> ${s.q}</p><button class="btn" data-sol="${i}">Lihat Pembahasan</button><div class="sol" id="sol${i}" hidden>${dl({ Diketahui: s.dik, Ditanyakan: s.dit })}<b>Langkah penyelesaian:</b><ol>${s.st.map(x => `<li>${x}</li>`).join('')}</ol>${s.tb ? tt(s.tb[0], s.tb[1]) : ''}<p><b>Jawaban akhir:</b> ${s.ans}</p><p><b>Kesimpulan:</b> ${s.kes}</p></div></div>`).join('')}` },
  { id: 'latihan', ic: '🎯', t: 'Latihan Soal', r: () => `<h2>Latihan Soal</h2><div class="card"><h3>A. Pilihan Ganda</h3>${MCQ.map((m, i) => `<div data-q="${i}"><p><b>${i + 1}.</b> ${m[0]}</p>${m[1].map((o, j) => `<label class="opt"><input type="radio" name="m${i}" value="${j}"> ${o}</label>`).join('')}<div class="fb" hidden></div></div>`).join('')}</div>
<div class="card"><h3>B. Isian</h3>${FILL.map((f, i) => `<div data-f="${i}"><p><b>${i + 1}.</b> ${f[0]}</p><input type="text" id="f${i}" placeholder="Jawaban Anda"><div class="fb" hidden></div></div>`).join('')}</div>
<div class="row"><button class="btn" id="check">Periksa Jawaban</button><button class="btn ghost" id="again">Ulangi Latihan</button></div><div id="score" class="card" style="margin-top:18px" hidden></div>`,
    init() {
      $('#again').onclick = () => go('latihan');
      $('#check').onclick = () => {
        let ok = 0;
        MCQ.forEach((m, i) => {
          const box = document.querySelector(`[data-q="${i}"]`), sel = box.querySelector('input:checked'), good = sel && +sel.value === m[2];
          if (good) ok++;
          box.querySelectorAll('.opt').forEach((l, j) => { l.classList.toggle('ok', j === m[2]); l.classList.toggle('bad', !!sel && +sel.value === j && j !== m[2]); });
          const fb = box.querySelector('.fb'); fb.hidden = false; fb.innerHTML = `${good ? '✅ Benar.' : '❌ Salah. Jawaban: <b>' + m[1][m[2]] + '</b>.'} ${m[3]}`;
        });
        FILL.forEach((f, i) => {
          const good = f[1].includes(nf($('#f' + i).value)); if (good) ok++;
          const fb = document.querySelector(`[data-f="${i}"] .fb`); fb.hidden = false; fb.innerHTML = `${good ? '✅ Benar.' : '❌ Salah. Jawaban benar: <b>' + f[1][0].replace(/^b$/, 'B').replace(/^s$/, 'S') + '</b>.'} ${f[2]}`;
        });
        const n = MCQ.length + FILL.length, pct = Math.round(ok / n * 100), sc = $('#score');
        sc.hidden = false; sc.innerHTML = `<h3>Hasil Latihan</h3>${dl({ 'Jumlah soal': n, 'Jawaban benar': ok, 'Jawaban salah': n - ok, 'Nilai akhir': pct + ' / 100', Persentase: pct + '%' })}<div class="bar"><i style="width:${pct}%"></i></div>`;
        sc.scrollIntoView({ behavior: 'smooth' });
      };
    } }
];

/* ---------- 4. Navigasi, progres, tema, pencarian ---------- */
const mats = PAGES.filter(p => p.id !== 'dashboard');
const page = id => PAGES.find(p => p.id === id);
const save = () => { LS.set('pl_done', done); LS.set('pl_marks', marks); LS.set('pl_last', last); };

function dashboard() {
  const pct = Math.round(done.length / mats.length * 100), lp = last && page(last);
  return `<div class="hero"><h2>Selamat Datang di Digital Learning Proposisi</h2><p>Pelajari logika proposisi pada mata kuliah Matematika Diskrit: dari pengertian, operasi logika, tabel kebenaran, hingga ekivalensi, lengkap dengan simulasi dan latihan.</p><button class="btn" data-go="${lp ? lp.id : 'pengertian'}">${lp ? 'Lanjutkan Belajar' : 'Mulai Belajar'}</button></div>
<div class="grid"><div class="card stat"><b>${mats.length}</b>Materi pembelajaran</div><div class="card stat"><b>${done.length}/${mats.length}</b>Materi selesai<div class="bar"><i style="width:${pct}%"></i></div><small>Progres ${pct}%</small></div><div class="card stat"><b>${lp ? lp.ic : '—'}</b>Materi terakhir: ${lp ? `<a href="#" data-go="${lp.id}">${lp.t}</a>` : 'belum ada'}</div></div>
<div class="grid" style="margin-top:16px"><div class="card"><h3>🧪 Percobaan</h3><p>Simulasi operasi logika dan ekspresi buatan sendiri.</p><button class="btn" data-go="percobaan">Buka Percobaan</button></div><div class="card"><h3>🎯 Latihan Soal</h3><p>10 pilihan ganda dan 5 isian dengan penilaian otomatis.</p><button class="btn" data-go="latihan">Mulai Latihan</button></div></div>
${marks.length ? `<div class="card" style="margin-top:16px"><h3>⭐ Materi Favorit</h3>${marks.map(m => `<div class="list"><a data-go="${m}">${page(m).ic} ${page(m).t}</a></div>`).join('')}</div>` : ''}
<div class="card" style="margin-top:16px"><h3>Daftar Materi Pembelajaran</h3><div class="list">${mats.map(p => `<a data-go="${p.id}"><span>${p.ic} ${p.t}</span><span>${done.includes(p.id) ? '✅' : '›'}</span></a>`).join('')}</div></div>`;
}

function go(id) {
  const p = page(id) || PAGES[0], i = PAGES.indexOf(p), main = $('#main');
  $('#pageTitle').textContent = p.t;
  main.style.animation = 'none'; void main.offsetWidth; main.style.animation = '';
  if (p.id === 'dashboard') main.innerHTML = dashboard();
  else {
    last = p.id; save();
    const pv = PAGES[i - 1], nx = PAGES[i + 1];
    main.innerHTML = p.r() + `<div class="row" style="margin-top:8px"><button class="btn" data-act="done">${done.includes(p.id) ? '✅ Selesai (klik untuk batal)' : 'Tandai Selesai'}</button><button class="btn ghost" data-act="mark">${marks.includes(p.id) ? '⭐ Favorit' : '☆ Simpan ke Favorit'}</button></div><div class="pager">${pv ? `<button class="btn ghost" data-go="${pv.id}">‹ ${pv.t}</button>` : '<span></span>'}${nx ? `<button class="btn" data-go="${nx.id}">${nx.t} ›</button>` : ''}</div>`;
    if (p.init) p.init();
  }
  $('#nav').innerHTML = PAGES.map(x => `<a data-go="${x.id}" class="${x.id === p.id ? 'on' : ''}">${x.ic} ${x.t}<span class="chk">${done.includes(x.id) ? '✔' : ''}</span></a>`).join('');
  $('#side').classList.remove('open'); $('#scrim').classList.remove('show');
  $('#results').hidden = true; window.scrollTo(0, 0);
  location.hash = p.id;
}

document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); return go(g.dataset.go); }
  const a = e.target.closest('[data-act]');
  if (a) { const id = last; const t = a.dataset.act === 'done' ? done : marks; t.includes(id) ? t.splice(t.indexOf(id), 1) : t.push(id); save(); return go(id); }
  const s = e.target.closest('[data-sol]');
  if (s) { const box = $('#sol' + s.dataset.sol); box.hidden = !box.hidden; s.textContent = box.hidden ? 'Lihat Pembahasan' : 'Tutup Pembahasan'; }
});

// Tema gelap/terang
const setTheme = t => { document.documentElement.dataset.theme = t; $('#themeBtn').textContent = t === 'dark' ? '☀️' : '🌙'; LS.set('pl_theme', t); };
$('#themeBtn').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
$('#homeBtn').onclick = () => go('dashboard');
$('#menuBtn').onclick = () => { $('#side').classList.add('open'); $('#scrim').classList.add('show'); };
$('#scrim').onclick = () => { $('#side').classList.remove('open'); $('#scrim').classList.remove('show'); };

// Pencarian materi (mencari di judul dan isi teks halaman)
let idx = null;
$('#search').addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase(), box = $('#results');
  if (!q) { box.hidden = true; return; }
  if (!idx) idx = mats.map(p => { const d = document.createElement('div'); d.innerHTML = p.r(); return [p, (p.t + ' ' + d.textContent).toLowerCase()]; });
  const hit = idx.filter(([, tx]) => tx.includes(q)).map(([p]) => p);
  box.hidden = false;
  box.innerHTML = hit.length ? hit.map(p => `<a data-go="${p.id}">${p.ic} ${p.t}</a>`).join('') : '<a>Materi tidak ditemukan</a>';
});

/* ---------- 5. Mulai ---------- */
setTheme(LS.get('pl_theme', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
go(location.hash.slice(1) || 'dashboard');
