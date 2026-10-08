(function (root) {
  'use strict';
  const CATEGORIES = ['공모전', '대회', '과제', '팀플', '기타'];
  const COLORS = { 공모전:'#577BD2', 대회:'#BE891E', 과제:'#9477C4', 팀플:'#008E9C', 기타:'#647A88' };
  const DEMO_DATE = '2026-10-08';
  const pad = n => String(n).padStart(2,'0');
  const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && dateKey(new Date(value+'T12:00:00')) === value;
  const id = () => root.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  function seed() {
    const activities = [
      { id:'hack', name:'교내 해커톤 대회', category:'대회', status:'active', place:'학생회관 2층', memo:'학교생활을 더 편리하게 만드는 서비스를 함께 만듭니다.' },
      { id:'database', name:'데이터베이스 과제', category:'과제', status:'active', place:'온라인 제출', memo:'주제 선정부터 ERD와 최종 보고서까지, 제출 일정을 나눠 관리합니다.' },
      { id:'team', name:'스마트앱 팀플', category:'팀플', status:'active', place:'공학관 301호', memo:'일정모아의 화면 구성과 기능 구현 일정을 정리합니다.' },
      { id:'campus', name:'캠퍼스 앱 공모전', category:'공모전', status:'active', place:'공학관 301호', memo:'대학생의 일상을 바꾸는 앱 아이디어를 모집합니다. 기획서와 시연 영상을 함께 제출하세요.' },
      { id:'school', name:'NEW 대학생 기업경영 체험스쿨', category:'기타', status:'active', place:'교내 취업지원센터', memo:'관심 있는 분야의 기업경영을 경험하는 프로그램입니다.' },
    ].map(a=>({...a, sources:[{ id:`source-${a.id}`, name:`[예제] ${a.name} 안내`, kind:'text', text:`${a.name}\n${a.memo}`, createdAt:DEMO_DATE }]}));
    const specs = [
      ['hack','접수 마감','2026-10-11','15:00'],['hack','해커톤 시작','2026-10-18','09:00'],
      ['database','주제 제출','2026-10-09','15:00'],['database','ERD 제출','2026-10-13','23:59'],['database','최종 보고서','2026-10-22','23:59'],
      ['team','팀 회의','2026-10-08','15:00'],['team','화면 설계 공유','2026-10-11','16:00'],['team','기능 구현 점검','2026-10-15','15:00'],['team','중간 발표','2026-10-22','13:00'],['team','최종 제출','2026-10-29','23:59'],
      ['campus','접수 마감','2026-10-10','15:00'],['campus','서류 발표','2026-10-15','15:00'],['campus','발표 심사','2026-10-20','15:00'],
      ['school','모집기간','2026-09-14','00:00','2026-10-15'],['school','합격자 발표','2026-10-16','15:00'],['school','프로그램 시작','2026-10-25','10:00'],
    ];
    const events = specs.map(([activityId,title,date,time,endDate], i)=>({ id:`event-${i+1}`, activityId, title,date,time,endDate:endDate||'', category:activities.find(a=>a.id===activityId).category, place:activities.find(a=>a.id===activityId).place, memo:'웹 데모용 예제 일정입니다. 자유롭게 수정해 보세요.', link:'', done:false, reminder:true }));
    activities.forEach(a=>{ a.sources[0].text += '\n'+events.filter(e=>e.activityId===a.id).map(e=>`${e.title}: ${e.date} ${e.time}`).join('\n')+`\n장소: ${a.place}`; });
    return { version:1, activities, events };
  }
  function monthDays(year, month) {
    const first = new Date(year,month,1,12), count = new Date(year,month+1,0).getDate();
    return Array.from({length:Math.ceil((first.getDay()+count)/7)*7},(_,i)=>dateKey(new Date(year,month,1-first.getDay()+i,12)));
  }
  const visibleEvents = data => data.events.filter(e=>!e.activityId || data.activities.find(a=>a.id===e.activityId)?.status === 'active');
  const eventsOn = (data,day) => visibleEvents(data).filter(e=>e.date<=day && (e.endDate||e.date)>=day).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
  function dday(date, today=DEMO_DATE) {
    const diff = Math.round((Date.parse(date+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000);
    return diff === 0 ? '오늘' : diff > 0 ? `D-${diff}` : `D+${-diff}`;
  }
  function setActivityStatus(data, activityId, status) {
    if (!['active','paused','completed'].includes(status)) throw new Error('올바른 활동 상태를 선택해 주세요.');
    return {...data, activities:data.activities.map(a=>a.id===activityId?{...a,status}:a)};
  }
  function validateEvent(e) {
    if (!e.title?.trim()) throw new Error('일정 제목을 입력해 주세요.');
    if (!validDate(e.date)) throw new Error('올바른 시작 날짜를 입력해 주세요.');
    if (e.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(e.time)) throw new Error('올바른 시간을 입력해 주세요.');
    if (e.endDate && (!validDate(e.endDate) || e.endDate<e.date)) throw new Error('종료 날짜는 시작 날짜 이후로 지정해 주세요.');
    if (e.link && !/^https?:\/\//i.test(e.link)) throw new Error('바로가기는 https:// 또는 http://로 시작해야 합니다.');
  }
  function saveEvent(data, event) {
    validateEvent(event);
    if (event.activityId && !data.activities.some(a=>a.id===event.activityId)) throw new Error('활동을 다시 선택해 주세요.');
    const next = {...event, title:event.title.trim(), id:event.id || id()};
    return {...data, events:data.events.some(e=>e.id===next.id)?data.events.map(e=>e.id===next.id?next:e):[...data.events,next]};
  }
  function parseText(text, year=2026) {
    const lines = text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    const events = [];
    const pattern = /(?:(20\d{2})\s*[.\-/년]\s*)?(\d{1,2})\s*[.\-/월]\s*(\d{1,2})(?:일)?/;
    for (const line of lines) {
      const m = line.match(pattern); if (!m) continue;
      const date = `${m[1]||year}-${pad(m[2])}-${pad(m[3])}`;
      if (!validDate(date)) continue;
      const time = line.slice(m.index+m[0].length).match(/(?:오전|오후)?\s*(\d{1,2})\s*[:시]\s*(\d{2})?/);
      let hour = time ? Number(time[1]) : 0;
      if (time?.[0].includes('오후') && hour<12) hour+=12;
      if (time?.[0].includes('오전') && hour===12) hour=0;
      events.push({title:line.slice(0,m.index).replace(/[\s:：·\-]+$/,'') || lines[0] || '새 일정', date,time:time && hour<24?`${pad(hour)}:${time[2]||'00'}`:'', endDate:''});
    }
    return {title:lines[0]||'', events, place:lines.find(l=>/^장소\s*[:：]/.test(l))?.replace(/^장소\s*[:：]\s*/,'')||'', link:text.match(/https?:\/\/[^\s<>"']+/)?.[0]||''};
  }
  function restore(raw) {
    try {
      const value=JSON.parse(raw);
      if (value?.version!==1 || !Array.isArray(value.activities) || !Array.isArray(value.events)) return seed();
      if (!value.activities.every(a=>a && typeof a.id==='string' && typeof a.name==='string' && CATEGORIES.includes(a.category) && ['active','paused','completed'].includes(a.status) && Array.isArray(a.sources))) return seed();
      for (const e of value.events) { if (!e || typeof e.id!=='string') return seed(); validateEvent(e); }
      return value;
    } catch { return seed(); }
  }
  function calendarFile(e,now=new Date()) {
    validateEvent(e);
    const esc=s=>String(s||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
    const start=e.date.replaceAll('-','')+(e.time?'T'+e.time.replace(':','')+'00':'');
    let end='';
    if(e.endDate||!e.time){const d=new Date((e.endDate||e.date)+'T12:00:00');d.setDate(d.getDate()+1);end=`\r\nDTEND${e.time?'':';VALUE=DATE'}:${dateKey(d).replaceAll('-','')}${e.time?'T000000':''}`;}
    return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//ScheduleHub//Web Demo//KO\r\nBEGIN:VEVENT\r\nUID:${e.id}@schedulehub.local\r\nDTSTAMP:${now.toISOString().replace(/[-:]/g,'').replace(/\.\d+Z/,'Z')}\r\nDTSTART${e.time?'':';VALUE=DATE'}:${start}${end}\r\nSUMMARY:${esc(e.title)}\r\nLOCATION:${esc(e.place)}\r\nDESCRIPTION:${esc(e.memo)}\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
  }
  const api={CATEGORIES,COLORS,DEMO_DATE,pad,dateKey,validDate,id,seed,monthDays,visibleEvents,eventsOn,dday,setActivityStatus,validateEvent,saveEvent,parseText,restore,calendarFile};
  if (typeof module!=='undefined' && module.exports) module.exports=api;
  root.ScheduleDomain=api;
})(globalThis);
