/* 스마트공장 KPI 대시보드 — 시뮬레이션 데이터 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);

  const machines = [
    { id: 'CNC-01', name: 'CNC 가공기 1호', state: 'run', temp: 62, vib: 1.2 },
    { id: 'CNC-02', name: 'CNC 가공기 2호', state: 'run', temp: 58, vib: 0.9 },
    { id: 'RBT-01', name: '로봇팔 A', state: 'run', temp: 45, vib: 0.4 },
    { id: 'INJ-01', name: '사출기 1호', state: 'warn', temp: 88, vib: 2.8 },
    { id: 'CVY-01', name: '컨베이어', state: 'run', temp: 41, vib: 0.3 },
    { id: 'VIS-01', name: '비전 검사기', state: 'run', temp: 39, vib: 0.1 },
  ];
  const stateLabel = { run: '가동', warn: '점검필요', down: '정지' };

  // 최근 60분 생산량 (분당)
  const history = Array.from({ length: 60 }, () => 38 + Math.round(Math.random() * 8));
  const alarms = [];

  function pushAlarm(msg, level) {
    const d = new Date();
    const t = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
    alarms.unshift({ t, msg, level });
    if (alarms.length > 30) alarms.pop();
    const ul = $('alarms');
    ul.innerHTML = alarms.map((a) =>
      `<li><span class="t">${a.t}</span><span class="${a.level}">${a.msg}</span></li>`).join('');
  }

  function tick() {
    // 시뮬레이션: 드리프트 + 노이즈
    const base = 40 + Math.sin(Date.now() / 60000) * 3;
    history.push(Math.max(20, Math.round(base + (Math.random() - 0.5) * 6)));
    if (history.length > 60) history.shift();

    machines.forEach((m) => {
      m.temp = Math.max(30, Math.min(110, m.temp + (Math.random() - 0.5) * 2));
      m.vib = Math.max(0.1, m.vib + (Math.random() - 0.5) * 0.2);
      // 상태 전이
      const r = Math.random();
      if (m.state === 'run' && m.temp > 95 && r < 0.15) {
        m.state = 'warn'; pushAlarm(`${m.id} 온도 상승 (${m.temp.toFixed(1)}°C) — 점검 권장`, 'warn');
      } else if (m.state === 'warn' && m.temp > 105 && r < 0.1) {
        m.state = 'down'; pushAlarm(`${m.id} 과열로 자동 정지`, 'bad');
      } else if (m.state === 'warn' && m.temp < 80 && r < 0.1) {
        m.state = 'run'; pushAlarm(`${m.id} 정상 복귀`, '');
      } else if (m.state === 'down' && r < 0.06) {
        m.state = 'run'; m.temp = 70; pushAlarm(`${m.id} 재가동`, '');
      }
      if (m.state === 'down') { m.temp = Math.max(35, m.temp - 1); m.vib = 0.1; }
    });

    // KPI 계산
    const running = machines.filter((m) => m.state === 'run').length;
    const avail = (running / machines.length) * 100;
    const perf = 88 + Math.random() * 8;
    const defect = 0.4 + Math.random() * 1.6;
    const qual = 100 - defect;
    const tput = history[history.length - 1];
    const oee = (avail / 100) * (perf / 100) * (qual / 100) * 100;

    $('oeeVal').textContent = oee.toFixed(1);
    $('oeeArc').style.strokeDashoffset = 327 * (1 - oee / 100);
    $('oeeArc').style.stroke = oee >= 75 ? '#00d4aa' : oee >= 60 ? '#d29922' : '#f85149';

    setKpi('Avail', avail, 100);
    setKpi('Perf', perf, 100);
    setKpi('Qual', qual, 100);
    $('kTput').textContent = tput + '개';
    $('bTput').style.width = Math.min(100, (tput / 55) * 100) + '%';

    drawChart();
    drawMachines();

    const d = new Date();
    $('clock').textContent = d.toLocaleString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function setKpi(key, v, max) {
    $('k' + key).textContent = v.toFixed(1) + '%';
    $('b' + key).style.width = (v / max) * 100 + '%';
  }

  function drawChart() {
    const cv = $('chartTput'), ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    const max = 60;
    // 그리드
    ctx.strokeStyle = '#1c2330'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (H / 4) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    // 영역 + 선
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(47,129,247,0.45)');
    grad.addColorStop(1, 'rgba(47,129,247,0.03)');
    ctx.beginPath();
    history.forEach((v, i) => {
      const x = (i / (history.length - 1)) * W;
      const y = H - (v / max) * (H - 10) - 5;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.strokeStyle = '#2f81f7'; ctx.lineWidth = 2; ctx.stroke();
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();
  }

  function drawMachines() {
    $('machines').innerHTML = machines.map((m) => `
      <div class="machine">
        <div class="m-head"><span class="m-name">${m.name}</span><span class="dot ${m.state}"></span></div>
        <div class="m-info">${m.id} · ${stateLabel[m.state]}<br />
        🌡 ${m.temp.toFixed(1)}°C · 〰 ${m.vib.toFixed(1)} mm/s</div>
      </div>`).join('');
  }

  pushAlarm('시스템 시작 — 라인 A 모니터링 중', '');
  tick();
  setInterval(tick, 2000);
})();
