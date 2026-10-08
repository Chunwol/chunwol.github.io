(() => {
  'use strict';
  const D=window.ScheduleDomain, KEY='schedulehub-web-v1';
  const $=s=>document.querySelector(s);
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=name=>`<i class="icon" aria-hidden="true" style="--icon:url('assets/ic_${name}.svg')"></i>`;
  const button=(name,label,action,extra='')=>`<button class="icon-button" aria-label="${escape(label)}" title="${escape(label)}" data-action="${action}" ${extra}>${icon(name)}</button>`;
  const short=date=>date?`${Number(date.slice(5,7))}.${Number(date.slice(8,10))}`:'';
  const long=date=>date?`${Number(date.slice(5,7))}월 ${Number(date.slice(8,10))}일 ${['일','월','화','수','목','금','토'][new Date(date+'T12:00:00').getDay()]}요일`:'';
  const pretty=e=>`${short(e.date)}${e.time?' '+e.time:' · 종일'}${e.endDate?' ~ '+short(e.endDate):''}`;
  let data;
  try { data=D.restore(localStorage.getItem(KEY)); } catch { data=D.seed(); }
  const ui={selected:D.DEMO_DATE,year:2026,month:9,category:'전체',status:'active',detailTab:'일정',widget:'agenda',search:'',agendaFilter:'전체',draft:null,review:null,lastSaved:null};
  let lastRoute='', toastTimer, confirmAction=null, fileObjectUrl=null;
  const route=()=>decodeURIComponent(location.hash.slice(1))||'calendar';
  const activity=id=>data.activities.find(a=>a.id===id);
  const eventsFor=id=>data.events.filter(e=>e.activityId===id).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  const categoryOf=e=>activity(e.activityId)?.category||e.category||'기타';
  const color=e=>D.COLORS[categoryOf(e)]||D.COLORS.기타;
  const nextEvent=a=>eventsFor(a.id).find(e=>!e.done&&(e.endDate||e.date)>=D.DEMO_DATE)||eventsFor(a.id).at(-1);
  function commit(next) {
    try { localStorage.setItem(KEY,JSON.stringify(next)); data=next; return true; }
    catch { toast('저장 공간이 부족하거나 브라우저 저장이 차단됐어요. 첨부 사진 크기를 줄여 주세요.'); return false; }
  }
  function go(path) { if(route()===path) render(); else location.hash=path; }
  function toast(text) { clearTimeout(toastTimer); $('#toast').textContent=text; $('#toast').classList.add('visible'); toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3200); }
  function modal(title,body) { $('#dialog-body').innerHTML=`<button class="icon-button dialog-close" data-action="close-dialog" aria-label="닫기"><span style="transform:rotate(45deg);display:flex">${icon('add')}</span></button><h2 id="dialog-title">${escape(title)}</h2>${body}`; $('#dialog').showModal(); }
  function closeModal(){ $('#dialog').close(); confirmAction=null; }
  function confirm(title,copy,callback,label='확인') { confirmAction=callback; modal(title,`<p class="dialog-copy">${escape(copy)}</p><div class="dialog-buttons"><button class="secondary" data-action="close-dialog">취소</button><button class="primary" data-action="confirm">${escape(label)}</button></div>`); }
  function empty(title,text,action='',label='일정 추가') { return `<div class="empty">${icon('calendar_empty')}<h3>${escape(title)}</h3><p>${escape(text)}</p>${action?`<button class="text-button" data-action="${action}">${label}</button>`:''}</div>`; }
  function thumb(a) { const source=a?.sources?.find(s=>s.image); return `<span class="thumb" aria-hidden="true" style="--event-color:${D.COLORS[a?.category]||D.COLORS.기타}">${source?`<img src="${escape(source.image)}" alt="">`:`<span class="paper-thumb">${escape(a?.sources?.[0]?.text||a?.name||'일정 안내')}</span>`}</span>`; }
  function eventCard(e) { return `<button class="event-card ${e.done?'done':''}" data-action="event" data-id="${escape(e.id)}" style="--event-color:${color(e)}"><span class="event-bar"></span><span class="grow"><span class="event-title">${escape(e.title)}</span><span class="event-sub">${pretty(e)}</span><span class="event-sub truncate" style="display:block">${escape([activity(e.activityId)?.name,e.place].filter(Boolean).join(' · '))}</span></span><span class="badge ${D.dday(e.date)==='D-1'?'urgent':''}">${e.done?'완료':D.dday(e.date)}</span></button>`; }
  const sections=[['calendar','calendar_month','캘린더'],['activities','text','활동'],['agenda','schedule','일정'],['archive','poster','보관함']];
  function navigation(view) {
    $('#desktop-nav').innerHTML=sections.map(([path,i,label])=>`<button class="side-link ${view===path?'active':''}" data-action="navigate" data-route="${path}" ${view===path?'aria-current="page"':''}>${icon(i)}${label}</button>`).join('');
    $('#bottom-nav').innerHTML=sections.map(([path,i,label],n)=>`${n===2?`<button class="capture-button" data-action="intake" aria-label="자료에서 일정 등록">${icon('camera')}</button>`:''}<button class="nav-item ${view===path?'active':''}" data-action="navigate" data-route="${path}" ${view===path?'aria-current="page"':''}>${icon(i)}<span>${label}</span></button>`).join('');
  }
  function header(title,back='',actions='') { $('#app-header').innerHTML=`${back?button('back','뒤로','navigate',`data-route="${back}"`):''}<h1 class="${title==='일정모아'?'logo':''}">${escape(title)}</h1><div class="header-actions">${actions}</div>`; }
  function calendarGrid(year,month,interactive=true) {
    return `<div class="weekdays" aria-hidden="true">${'일월화수목금토'.split('').map(s=>`<span>${s}</span>`).join('')}</div><div class="calendar-grid" aria-label="${year}년 ${month+1}월 달력">${D.monthDays(year,month).map((date,i)=>{const ev=D.eventsOn(data,date), dots=[...new Set(ev.map(color))].slice(0,3);return `<button class="day ${date.slice(5,7)!==D.pad(month+1)?'outside':''} ${i%7===0?'sunday':i%7===6?'saturday':''} ${date===ui.selected?'selected':''} ${date===D.DEMO_DATE?'today':''}" data-action="day" data-date="${date}" aria-label="${date} 일정 ${ev.length}개" aria-pressed="${date===ui.selected}"><span class="number">${Number(date.slice(8,10))}</span><span class="dots">${dots.map(c=>`<span class="dot" style="--dot:${c}"></span>`).join('')}</span></button>`;}).join('')}</div>`;
  }
  function calendar() {
    header('일정모아','',button('search','일정 검색','navigate','data-route="search"')+button('add','일정 추가','intake')+button('settings','설정','navigate','data-route="settings"'));
    const ev=D.eventsOn(data,ui.selected);
    return `<div class="month-heading"><h2>${ui.year}년 ${ui.month+1}월</h2><button class="today" data-action="today">오늘</button>${button('chevron_left','이전 달','month','data-delta="-1"')}${button('chevron_right','다음 달','month','data-delta="1"')}</div>${calendarGrid(ui.year,ui.month)}<div class="calendar-end"></div><section class="day-section"><div class="section-title"><h2>${long(ui.selected)}</h2><small>${ev.length}개 일정</small></div>${ev.length?ev.map(eventCard).join(''):empty('아직 일정이 없어요','이날의 계획을 하나 추가해 볼까요?','new-event')}</section>`;
  }
  function activityRow(a,archived=false) { const next=nextEvent(a); return `<button class="activity-row" data-action="activity" data-id="${escape(a.id)}" style="--event-color:${D.COLORS[a.category]}">${thumb(a)}<span class="grow"><h3>${escape(a.name)}</h3><span class="event-sub">${archived?'활동 중단 · 원문과 일정은 보관 중':next?`${escape(next.title)} · ${pretty(next)}`:'등록된 일정 없음'}</span><span class="event-sub" style="display:block">${a.category} · 일정 ${eventsFor(a.id).length}개 · 자료 ${a.sources.length}개</span></span><span class="dday">${archived?'보관':a.status==='completed'?'완료':next?D.dday(next.date):''}</span></button>`; }
  function activities() {
    header('내 활동','',button('search','일정 검색','navigate','data-route="search"')+button('add','새 활동 등록','intake'));
    const list=data.activities.filter(a=>a.status===ui.status&&(ui.category==='전체'||a.category===ui.category));
    return `<div class="tabs" role="tablist" aria-label="활동 상태">${[['active','진행 중'],['completed','완료']].map(([v,t])=>`<button role="tab" aria-selected="${ui.status===v}" class="tab ${ui.status===v?'active':''}" data-action="status-filter" data-value="${v}">${t}</button>`).join('')}</div><div class="section"><div class="filters" aria-label="카테고리">${['전체',...D.CATEGORIES].map(c=>`<button class="filter ${ui.category===c?'active':''}" data-action="category" data-value="${c}" aria-pressed="${ui.category===c}">${c}</button>`).join('')}</div>${list.length?list.map(a=>activityRow(a)).join(''):empty('해당하는 활동이 없어요','새 활동을 만들거나 다른 분류를 선택해 주세요.','intake','활동 만들기')}</div>`;
  }
  function sourceRow(a,s) { return `<button class="source-row" data-action="source" data-id="${escape(s.id)}" data-activity="${escape(a.id)}">${thumb({...a,sources:[s]})}<span class="grow"><h3>${escape(s.name)}</h3><span class="muted tiny">${escape(s.createdAt||D.DEMO_DATE)} 저장</span></span>${icon('chevron_right')}</button>`; }
  function activityDetail(id) {
    const a=activity(id); if(!a)return missing();
    header('활동',a.status==='paused'?'archive':'activities',button('list','활동 관리','activity-menu',`data-id="${escape(id)}"`));
    const ev=eventsFor(id),next=nextEvent(a);
    let content='';
    if(ui.detailTab==='일정') content=`<div class="timeline">${ev.map(e=>`<button class="timeline-row" data-action="event" data-id="${escape(e.id)}" style="--event-color:${color(e)}"><span class="timeline-date">${short(e.date)}<br>${['일','월','화','수','목','금','토'][new Date(e.date+'T12:00:00').getDay()]}</span><span class="timeline-rail"><span class="${e.done?'checked':''}">${e.done?'✓':''}</span></span><span><h3>${escape(e.title)}</h3><p>${e.done?'완료':'예정'} · ${pretty(e)}</p><p>${escape(a.sources[0]?.name||'직접 입력한 일정')}</p></span>${icon('chevron_right')}</button>`).join('')}</div>${!ev.length?empty('첫 일정을 등록해 주세요','마감일, 발표일, 팀 회의를 따로 관리할 수 있어요.'):''}<button class="outline" data-action="new-event" data-activity="${escape(id)}">일정 직접 추가</button><div class="source-list"><h3>자료 ${a.sources.length}개</h3>${a.sources.map(s=>sourceRow(a,s)).join('')}</div>`;
    if(ui.detailTab==='정보')content=`<dl class="info-grid section-spaced" style="padding-left:0;padding-right:0"><dt>활동 이름</dt><dd>${escape(a.name)}</dd><dt>분류</dt><dd>${a.category}</dd><dt>진행 상태</dt><dd>${{active:'진행 중',paused:'중단 · 보관 중',completed:'완료'}[a.status]}</dd><dt>장소</dt><dd>${escape(a.place||'등록된 장소가 없어요')}</dd><dt>설명</dt><dd>${escape(a.memo||'등록된 설명이 없어요')}</dd></dl><button class="outline" data-action="edit-activity" data-id="${escape(id)}">활동 정보 수정</button>`;
    if(ui.detailTab==='자료')content=`<div class="source-list">${a.sources.length?a.sources.map(s=>sourceRow(a,s)).join(''):empty('아직 자료가 없어요','포스터나 안내문을 함께 보관해 보세요.')}</div><p class="note">원문과 일정은 연결해서 보관해요. 등록된 자료를 눌러 원래 내용을 확인할 수 있어요.</p>`;
    return `<div class="activity-hero"><div class="row">${thumb(a)}<div class="grow"><h2>${escape(a.name)}</h2><p class="category">${a.category} · ${{active:'진행 중',paused:'중단 · 보관 중',completed:'완료'}[a.status]}</p></div></div><div class="row spread next-event"><strong>${a.status==='paused'?'이 활동의 일정은 캘린더에서 숨겨져 있어요.':next?'다음 일정 '+escape(next.title):'일정을 추가해 보세요.'}</strong>${next&&a.status==='active'?`<span class="badge">${D.dday(next.date)}</span>`:''}</div></div><div class="tabs" role="tablist" aria-label="활동 상세">${['일정','정보','자료'].map(t=>`<button role="tab" aria-selected="${ui.detailTab===t}" class="tab ${ui.detailTab===t?'active':''}" data-action="detail-tab" data-value="${t}">${t}</button>`).join('')}</div><div class="section">${content}</div><div class="footer-action">${a.status==='paused'?`<button class="primary" data-action="resume" data-id="${escape(id)}">활동 다시 시작</button>`:`<button class="primary" data-action="intake" data-activity="${escape(id)}">자료·공지 추가</button>`}</div>`;
  }
  function detail(id) {
    const e=data.events.find(e=>e.id===id); if(!e)return missing();
    const a=activity(e.activityId);
    header('일정 상세',a?`activity/${a.id}`:'calendar',button('list','일정 관리','event-menu',`data-id="${escape(id)}"`));
    return `<div class="section-spaced"><div class="row spread"><span class="pill">${categoryOf(e)}</span><span class="badge">${D.dday(e.date)}</span></div><h2 class="detail-title">${escape(e.title)}</h2>${a?`<button class="text-button" style="padding-left:0" data-action="activity" data-id="${escape(a.id)}">${escape(a.name)} ${icon('chevron_right')}</button>`:''}<div class="detail-card"><div class="detail-line">${icon('schedule')}<span>${long(e.date)}${e.time?' '+e.time:' · 종일'}${e.endDate?'<br>~ '+long(e.endDate):''}</span></div><div class="detail-line">${icon('place')}<span>${escape(e.place||'장소를 등록하지 않았어요')}</span></div>${e.link?`<div class="detail-line">${icon('link')}<a href="${escape(e.link)}" target="_blank" rel="noopener">${escape(e.link)}</a></div>`:''}<div class="detail-line">${icon('text')}<span style="white-space:pre-wrap">${escape(e.memo||'메모를 추가해 보세요.')}</span></div></div><div class="detail-card"><div class="row spread"><span class="row" style="font-size:13px">${icon('check')}일정 완료</span><button class="switch" role="switch" aria-label="일정 완료" aria-checked="${!!e.done}" data-action="toggle-done" data-id="${escape(id)}"></button></div><hr class="divider" style="margin:18px 0"><div class="row spread"><span class="row" style="font-size:13px">${icon('bell')}알림 설정 <span class="muted tiny">데모</span></span><button class="switch" role="switch" aria-label="알림 설정" aria-checked="${!!e.reminder}" data-action="toggle-reminder" data-id="${escape(id)}"></button></div><p class="field-note">실제 알림은 전송하지 않고 설정만 저장해요.</p></div>${a?.sources.length?`<div class="source-list"><h3>연결된 원문</h3>${sourceRow(a,a.sources[0])}</div>`:''}</div><div class="footer-action"><div class="row"><button class="outline" data-action="export-event" data-id="${escape(id)}">캘린더 파일</button><button class="primary" data-action="edit-event" data-id="${escape(id)}">수정하기</button></div></div>`;
  }
  function editor(id) {
    const e=id==='new'?{title:'',date:ui.selected,time:'',endDate:'',activityId:ui.editActivity||'',category:'기타',place:'',memo:'',link:'',reminder:true}:data.events.find(e=>e.id===id);
    if(!e)return missing();
    header(id==='new'?'일정 등록':'일정 수정',e.activityId?`activity/${e.activityId}`:'calendar');
    return `<form id="event-form" class="form" data-id="${id}"><label>제목<input name="title" value="${escape(e.title)}" placeholder="어떤 일정인가요?" required maxlength="120"></label><div class="row"><label>시작 날짜<input name="date" type="date" value="${e.date}" required></label><label class="narrow">시간 <span class="muted tiny">선택</span><input name="time" type="time" value="${e.time||''}"></label></div><label>종료 날짜 <span class="muted tiny">여러 날 이어지는 일정만 입력</span><input name="endDate" type="date" value="${e.endDate||''}"></label><label>연결할 활동<select name="activityId"><option value="">활동 없이 일정만 등록</option>${data.activities.filter(a=>a.status!=='paused'||a.id===e.activityId).map(a=>`<option value="${escape(a.id)}" ${a.id===e.activityId?'selected':''}>${escape(a.name)}</option>`).join('')}</select></label><label>분류<select name="category">${D.CATEGORIES.map(c=>`<option ${c===categoryOf(e)?'selected':''}>${c}</option>`).join('')}</select></label><label>장소<input name="place" value="${escape(e.place)}" placeholder="예: 공학관 301호"></label><label>바로가기<input name="link" type="url" value="${escape(e.link)}" placeholder="https://"></label><label>메모<textarea name="memo" rows="3" placeholder="준비물이나 할 일을 남겨 두세요.">${escape(e.memo)}</textarea></label><p class="form-error" role="alert"></p><button class="primary" type="submit">${id==='new'?'내 캘린더에 추가':'변경사항 저장'}</button></form>`;
  }
  function startIntake(activityId='',sample=false) {
    if(fileObjectUrl){URL.revokeObjectURL(fileObjectUrl);fileObjectUrl=null;}
    ui.draft={text:'',name:'',category:'공모전',mode:activityId?'existing':'new',activityId,attachment:null};
    if(sample)Object.assign(ui.draft,{name:'대학생 아이디어 공모전',text:'대학생 아이디어 공모전\n접수 마감: 2026.10.24 18:00\n결과 발표: 2026.10.30 15:00\n장소: 학생회관 2층\n기획서와 시연 영상을 제출해 주세요.'});
    go('intake');
  }
  function readIntake() { const f=$('#intake-form'); if(!f)return; const v=Object.fromEntries(new FormData(f)); Object.assign(ui.draft,{text:v.text||'',name:v.name||'',category:v.category||'기타',mode:v.mode||'new',activityId:v.activityId||''}); }
  function intake() {
    ui.draft ||= {text:'',name:'',category:'기타',mode:'new',activityId:'',attachment:null};
    const d=ui.draft;
    header('자료 추가',d.activityId?`activity/${d.activityId}`:'calendar');
    return `<div class="input-options"><button class="input-option" data-action="camera">${icon('scan')}문서 촬영</button><button class="input-option" data-action="file" data-kind="image">${icon('image')}사진 선택</button><button class="input-option" data-action="focus-text">${icon('text')}텍스트</button><button class="input-option" data-action="file" data-kind="document">${icon('poster')}파일 첨부</button></div><form class="form" id="intake-form">${d.attachment?`<div class="attachment">${d.attachment.image?`<img src="${escape(d.attachment.image)}" alt="첨부한 사진">`:icon('poster')}<div class="grow"><strong class="tiny">${escape(d.attachment.name)}</strong><p class="field-note">${d.attachment.image?'사진을 원문 자료로 보관해요.':'파일명만 저장돼요. 문서 내용은 아래에 붙여 넣어 주세요.'}</p></div><button type="button" class="text-button" data-action="remove-attachment">제거</button></div>`:''}<label>일정이 적힌 안내문<textarea name="text" rows="6" placeholder="공지 내용을 붙여 넣으세요.&#10;예: 접수 마감: 2026.10.24 18:00">${escape(d.text)}</textarea></label><div class="note">웹에서는 텍스트의 날짜를 간단히 정리해요. 사진·PDF의 OCR 및 AI 분석은 연결하지 않았어요. 인식 결과는 직접 입력·수정할 수 있어요.</div><button type="button" class="text-button" data-action="sample" style="justify-self:start;padding-left:0">예제 안내문 채우기</button><h3>어디에 정리할까요?</h3><label class="radio-label"><input type="radio" name="mode" value="existing" ${d.mode==='existing'?'checked':''}>기존 활동에 추가</label><select name="activityId" aria-label="기존 활동 선택" ${d.mode!=='existing'?'hidden':''}><option value="">활동을 선택해 주세요</option>${data.activities.filter(a=>a.status==='active').map(a=>`<option value="${escape(a.id)}" ${a.id===d.activityId?'selected':''}>${escape(a.name)}</option>`).join('')}</select><label class="radio-label"><input type="radio" name="mode" value="new" ${d.mode==='new'?'checked':''}>새 활동 만들기</label><div class="stack" id="new-activity-fields" ${d.mode!=='new'?'hidden':''}><input name="name" aria-label="새 활동 이름" placeholder="활동 이름" value="${escape(d.name)}" maxlength="120"><div class="intake-category">${D.CATEGORIES.map(c=>`<label class="category-choice"><input type="radio" name="category" value="${c}" ${c===d.category?'checked':''}>${c}</label>`).join('')}</div></div><label class="radio-label"><input type="radio" name="mode" value="none" ${d.mode==='none'?'checked':''}>활동 없이 일정만 등록</label><p class="form-error" role="alert"></p><button type="button" class="outline" data-action="direct-input">일정 직접 입력</button><button class="primary" type="submit">일정 정리하기</button></form>`;
  }
  function review() {
    if(!ui.review)return missing('등록할 내용을 먼저 입력해 주세요.');
    header('내용 확인','intake');
    return `<div class="section-spaced"><div class="row" style="margin-bottom:14px;color:var(--brand)">${icon('check')}<h3>${ui.review.events.length}개의 일정 초안</h3></div><p class="note">텍스트 날짜 정리 결과예요. AI 인식 결과가 아니므로 날짜와 제목을 확인한 뒤 저장해 주세요.</p></div><form class="form" id="review-form" style="padding-top:0">${ui.draft.mode==='new'?`<label>새 활동 이름<input name="activityName" value="${escape(ui.draft.name||ui.review.title)}" required maxlength="120"></label>`:`<p class="muted tiny">${ui.draft.mode==='existing'?escape(activity(ui.draft.activityId)?.name):'활동 없이 일정만 등록'}</p>`}${ui.review.events.map((e,i)=>`<section class="review-item" data-index="${i}"><div class="review-heading">일정 ${i+1}<button type="button" class="text-button" data-action="remove-review" data-index="${i}" ${ui.review.events.length===1?'disabled':''}>삭제</button></div><label>일정 제목<input name="title-${i}" value="${escape(e.title)}" required maxlength="120"></label><div class="row"><label>날짜<input type="date" name="date-${i}" value="${e.date||''}" required></label><label class="narrow">시간<input type="time" name="time-${i}" value="${e.time||''}"></label></div><label>종료 날짜 <span class="muted tiny">선택</span><input type="date" name="endDate-${i}" value="${e.endDate||''}"></label></section>`).join('')}<button class="outline" type="button" data-action="add-review">${icon('add')} 일정 더 추가</button><label>장소<input name="place" value="${escape(ui.review.place)}"></label><label>바로가기<input name="link" type="url" value="${escape(ui.review.link)}" placeholder="https://"></label><label>메모<textarea name="memo" rows="3">${escape(ui.review.memo||'')}</textarea></label><p class="form-error" role="alert"></p><button type="submit" class="primary">${ui.review.events.length}개 일정 저장하기</button></form>`;
  }
  function readReview() { const form=$('#review-form');if(!form)return;const f=Object.fromEntries(new FormData(form));ui.review.events=ui.review.events.map((e,i)=>({...e,title:f[`title-${i}`],date:f[`date-${i}`],time:f[`time-${i}`],endDate:f[`endDate-${i}`]}));Object.assign(ui.review,{place:f.place,link:f.link,memo:f.memo});if(f.activityName)ui.draft.name=f.activityName; }
  function saved(){header('등록 완료');return `<div class="success"><div class="success-mark">${icon('check')}</div><h2>캘린더에 담았어요!</h2><p>${ui.lastSaved?.count||1}개의 일정을 저장했어요.<br>변경한 내용은 이 브라우저에 남아 있어요.</p><div class="stack"><button class="primary" data-action="view-saved">캘린더에서 보기</button>${ui.lastSaved?.activityId?`<button class="outline" data-action="activity" data-id="${escape(ui.lastSaved.activityId)}">활동 전체 일정 보기</button>`:''}</div></div>`;}
  function sourceDetail(aId,sId) {
    const a=activity(aId),s=a?.sources.find(s=>s.id===sId);if(!s)return missing();
    header('원문 자료',`activity/${aId}`);
    return `<div class="section-spaced"><span class="pill">${s.kind==='image'?'사진':s.kind==='file'?'첨부 파일':'텍스트 원문'}</span><h2 class="detail-title" style="font-size:21px">${escape(s.name)}</h2><p class="muted tiny">${escape(s.createdAt)} 저장</p>${s.image?`<img class="full-image" src="${escape(s.image)}" alt="${escape(s.name)}">`:''}<div class="detail-card source-text">${escape(s.text||'사진을 확인하거나 파일 원문을 별도로 열어 주세요. 웹 데모에는 문서 본문 인식이 연결되지 않았어요.')}</div>${s.kind==='file'?'<p class="field-note">PDF·문서의 원본 파일은 브라우저에 보관하지 않고 파일명과 입력한 텍스트만 저장해요.</p>':''}</div>`;
  }
  function agenda(search=false) {
    header(search?'일정 검색':'모든 일정',search?'calendar':'',search?'':button('search','일정 검색','navigate','data-route="search"'));
    return `${search?`<div class="search-wrap">${icon('search')}<input id="search-input" type="search" placeholder="일정, 활동, 장소를 검색해 보세요" aria-label="일정 검색어" value="${escape(ui.search)}"></div>`:`<div class="section"><div class="filters">${['전체','예정','완료'].map(c=>`<button class="filter ${ui.agendaFilter===c?'active':''}" data-action="agenda-filter" data-value="${c}">${c}</button>`).join('')}</div></div>`}<div id="agenda-results">${agendaResults(search)}</div>`;
  }
  function agendaResults(search) {
    const query=ui.search.toLowerCase().trim();
    let ev=D.visibleEvents(data).filter(e=>search?[e.title,e.place,e.memo,activity(e.activityId)?.name].join(' ').toLowerCase().includes(query):ui.agendaFilter==='전체'||(ui.agendaFilter==='완료'?e.done:!e.done));
    ev.sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
    if(!ev.length)return empty(search?'검색 결과가 없어요':'표시할 일정이 없어요',search?'다른 검색어로 찾아보세요.':'일정을 추가하거나 다른 필터를 선택해 보세요.');
    const groups=Object.groupBy?Object.groupBy(ev,e=>e.date):ev.reduce((o,e)=>((o[e.date]||=[]).push(e),o),{});
    return Object.entries(groups).map(([day,list])=>`<section class="agenda-group"><h3>${long(day)} · ${list.length}개</h3>${list.map(eventCard).join('')}</section>`).join('');
  }
  function archive(){header('보관함');const list=data.activities.filter(a=>a.status==='paused');return `<div class="section-spaced"><p class="note">잠시 멈춘 활동을 모아 두었어요. 원문과 일정은 그대로 남아 있고, 다시 시작하면 캘린더에도 나타나요.</p>${list.length?list.map(a=>activityRow(a,true)).join(''):empty('보관한 활동이 없어요','활동 관리에서 ‘활동 중단’을 선택하면 여기에 보관돼요.')}</div>`;}
  function widget(type='agenda') {
    const next=D.visibleEvents(data).filter(e=>!e.done&&e.date>=D.DEMO_DATE).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).slice(0,type==='compact'?1:3);
    return `<div class="widget ${type==='compact'?'compact':''}"><div class="widget-head">${type==='month'?'2026년 10월':'다가오는 일정'}<span>일정모아</span></div>${type==='month'?calendarGrid(2026,9,false):next.map(e=>`<button class="widget-event" data-action="event" data-id="${escape(e.id)}" style="--event-color:${color(e)}"><span class="event-bar"></span><span class="grow"><strong>${escape(e.title)}</strong><small>${pretty(e)}</small></span><span class="badge">${D.dday(e.date)}</span></button>`).join('')||'<p class="muted tiny">예정된 일정이 없어요.</p>'}</div>`;
  }
  function widgets(){header('위젯 미리보기','calendar');return `<div class="section-spaced"><p class="muted" style="font-size:13px;line-height:1.9">내 일정에 맞춰 바뀌는 세 가지 위젯.<br>웹에서는 모양과 연결 동작을 확인할 수 있어요.</p><div class="tabs" style="margin-left:0;margin-right:0">${[['month','월간'],['agenda','다가오는 일정'],['compact','한 줄']].map(([k,v])=>`<button class="tab ${ui.widget===k?'active':''}" data-action="widget-type" data-value="${k}">${v}</button>`).join('')}</div><div class="widget-preview">${widget(ui.widget)}</div><p class="note" style="margin-top:24px">위젯의 날짜·일정을 눌러 상세로 이동해 보세요. 휴대폰 홈 화면에 설치되는 실제 위젯은 아닙니다.</p></div>`;}
  function settings(){header('설정','calendar');return `<div class="section-spaced"><span class="pill">v70h · WEB DEMO</span><h2 style="margin:17px 0 12px">일정모아, 웹에서 먼저.</h2><p class="muted" style="font-size:13px;line-height:1.9;margin-bottom:20px">Android 데모 화면을 바탕으로 만든<br>HTML · CSS · JavaScript 인터랙티브 데모예요.</p><button class="setting-row" data-action="navigate" data-route="widgets">${icon('calendar_month')}<span class="grow">위젯 미리보기</span>${icon('chevron_right')}</button><button class="setting-row" data-action="export-data">${icon('share')}<span class="grow">내 데이터 내보내기<p>입력한 활동·일정을 JSON 파일로 저장</p></span>${icon('chevron_right')}</button><button class="setting-row" data-action="reset">${icon('today')}<span class="grow">예제 데이터로 초기화<p>직접 등록·수정한 내용은 삭제돼요</p></span>${icon('chevron_right')}</button><div class="detail-card"><h3 style="margin-bottom:14px">이 데모에서 가능한 것</h3><p class="source-text">캘린더 탐색 · 일정 추가·수정·삭제<br>활동별 여러 일정 · 중단·재시작·완료<br>텍스트 날짜 정리 · 사진 원문 보관<br>검색 · 캘린더 파일 내보내기 · 위젯 미리보기</p></div><p class="note warm" style="margin-top:18px">실제 OCR·LLM, 문서 본문 추출, QR 인식, 기기 알림은 연결하지 않았어요. 사진은 크기를 줄여 보관하며 PDF·문서는 파일명만 남겨요. 서버로 전송하지 않습니다.</p><p class="field-note" style="margin-top:17px">예제 날짜: 2026.10.08 · D-day도 같은 날 기준이에요.<br>브라우저 데이터 삭제 시 저장 내용도 사라집니다.</p></div>`;}
  function missing(text='해당 항목을 찾을 수 없어요.'){header('일정모아','calendar');return empty(text,'캘린더에서 다시 선택해 주세요.');}
  function render(){
    const path=route(),[view,id,sub]=path.split('/');
    const top=['calendar','activities','agenda','archive','search'].includes(view);
    $('#app-shell').classList.toggle('no-nav',!top); $('#screen').classList.toggle('detail-screen',!top);
    navigation(view==='activity'?'activities':view);
    let html;
    switch(view){case'calendar':html=calendar();break;case'activities':html=activities();break;case'activity':html=activityDetail(id);break;case'event':html=detail(id);break;case'edit':html=editor(id);break;case'intake':html=intake();break;case'review':html=review();break;case'saved':html=saved();break;case'source':html=sourceDetail(id,sub);break;case'agenda':html=agenda();break;case'search':html=agenda(true);break;case'archive':html=archive();break;case'widgets':html=widgets();break;case'settings':html=settings();break;default:html=missing();}
    $('#screen').innerHTML=html; $('#desktop-widget').innerHTML=widget('agenda');
    const ownSource=view==='event'&&data.events.find(e=>e.id===id)?.source;
    if(ownSource){const section=document.createElement('section');section.className='section';section.innerHTML=`<h3>연결된 원문</h3><button class="source-row" data-action="own-source" data-id="${escape(id)}">${icon('poster')}<span class="grow">${escape(ownSource.name)}</span>${icon('chevron_right')}</button>`;$('#screen .footer-action').before(section);}
    document.querySelectorAll('[data-icon]').forEach(el=>el.style.setProperty('--icon',`url('assets/ic_${el.dataset.icon}.svg')`));
    if(path!==lastRoute){window.scrollTo(0,0);lastRoute=path;const heading=$('#app-header h1');heading.tabIndex=-1;heading.focus({preventScroll:true});}
    document.title=`${$('#app-header h1').textContent} · 일정모아`;
  }
  function showActivityMenu(id){const a=activity(id);modal('활동 관리',`<div class="action-list"><button data-action="edit-activity" data-id="${escape(id)}">${icon('text')}활동 정보 수정</button>${a.status==='paused'?`<button data-action="resume" data-id="${escape(id)}">${icon('today')}활동 다시 시작</button>`:`<button data-action="pause" data-id="${escape(id)}">${icon('poster')}활동 중단·보관</button>`}<button data-action="complete-activity" data-id="${escape(id)}">${icon('check')}${a.status==='completed'?'진행 중으로 변경':'활동 완료'}</button></div>`);}
  function editActivity(id){const a=activity(id);closeModal();modal('활동 정보 수정',`<form id="activity-form" data-id="${escape(id)}" class="stack"><label>활동 이름<input name="name" value="${escape(a.name)}" required maxlength="120"></label><label>분류<select name="category">${D.CATEGORIES.map(c=>`<option ${a.category===c?'selected':''}>${c}</option>`).join('')}</select></label><label>장소<input name="place" value="${escape(a.place)}"></label><label>설명<textarea name="memo" rows="3">${escape(a.memo)}</textarea></label><p class="form-error" role="alert"></p><button class="primary" type="submit">저장하기</button></form>`);}
  function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
  function exportEvent(id){const e=data.events.find(e=>e.id===id);download('일정모아-'+e.title.replace(/[<>:"/\\|?*]/g,'_')+'.ics',D.calendarFile(e),'text/calendar;charset=utf-8');toast('캘린더 파일을 만들었어요. 다운로드를 확인해 주세요.');}
  document.addEventListener('click',async ev=>{
    const el=ev.target.closest('[data-action]');if(!el||el.disabled)return;
    const {action,id,value,activity:activityId}=el.dataset;
    switch(action){
      case'navigate':go(el.dataset.route);break;
      case'intake':startIntake(activityId||'');break;
      case'sample':startIntake('',true);break;
      case'activity':ui.detailTab='일정';go('activity/'+id);break;
      case'event':go('event/'+id);break;
      case'edit-event':closeModal();go('edit/'+id);break;
      case'new-event':ui.editActivity=activityId||'';go('edit/new');break;
      case'day':ui.selected=el.dataset.date;ui.year=Number(ui.selected.slice(0,4));ui.month=Number(ui.selected.slice(5,7))-1;go('calendar');break;
      case'month':{const m=new Date(ui.year,ui.month+Number(el.dataset.delta),1);ui.year=m.getFullYear();ui.month=m.getMonth();render();break;}
      case'today':ui.selected=D.DEMO_DATE;ui.year=2026;ui.month=9;render();break;
      case'category':ui.category=value;render();break;
      case'status-filter':ui.status=value;render();break;
      case'detail-tab':ui.detailTab=value;render();break;
      case'agenda-filter':ui.agendaFilter=value;render();break;
      case'widget-type':ui.widget=value;render();break;
      case'source':go(`source/${activityId}/${id}`);break;
      case'own-source':{const s=data.events.find(e=>e.id===id)?.source;if(s)modal(s.name,`${s.image?`<img class="full-image" src="${escape(s.image)}" alt="첨부 원문">`:''}<div class="source-text">${escape(s.text||'문서 본문은 인식하지 않고 파일명만 보관했어요.')}</div>`);break;}
      case'activity-menu':showActivityMenu(id);break;
      case'edit-activity':editActivity(id);break;
      case'pause':closeModal();confirm('활동을 중단할까요?','활동과 원문은 보관함에 남겨요. 연결된 일정은 캘린더에서 숨겨지며 언제든 다시 시작할 수 있어요.',()=>{if(commit(D.setActivityStatus(data,id,'paused'))){go('archive');toast('활동을 보관함으로 옮겼어요.');}},'중단하고 보관');break;
      case'resume':closeModal();if(commit(D.setActivityStatus(data,id,'active'))){go('activity/'+id);toast('활동을 다시 시작했어요.');}break;
      case'complete-activity':closeModal();if(commit(D.setActivityStatus(data,id,activity(id).status==='completed'?'active':'completed'))){render();toast('활동 상태를 변경했어요.');}break;
      case'event-menu':modal('일정 관리',`<div class="action-list"><button data-action="edit-event" data-id="${escape(id)}">${icon('text')}일정 수정</button><button data-action="export-event" data-id="${escape(id)}">${icon('calendar_add')}캘린더 파일 저장 (.ics)</button><button data-action="copy-event" data-id="${escape(id)}">${icon('share')}일정 내용 복사</button><button class="text-danger" data-action="delete-event" data-id="${escape(id)}">${icon('delete')}일정 삭제</button></div>`);break;
      case'toggle-done':case'toggle-reminder':{const e=data.events.find(e=>e.id===id),k=action==='toggle-done'?'done':'reminder';if(commit(D.saveEvent(data,{...e,[k]:!e[k]}))){render();if(k==='reminder')toast('설정만 저장했어요. 실제 알림은 전송하지 않아요.');}break;}
      case'delete-event':closeModal();confirm('이 일정을 삭제할까요?','연결된 활동과 원문은 삭제하지 않아요. 일정 삭제는 되돌릴 수 없습니다.',()=>{const e=data.events.find(e=>e.id===id);if(commit({...data,events:data.events.filter(e=>e.id!==id)})){go(e.activityId?'activity/'+e.activityId:'calendar');toast('일정을 삭제했어요.');}},'삭제');break;
      case'close-dialog':closeModal();break;
      case'confirm':{const fn=confirmAction;closeModal();fn?.();break;}
      case'export-event':exportEvent(id);break;
      case'copy-event':{const e=data.events.find(e=>e.id===id);try{await navigator.clipboard.writeText([e.title,pretty(e),e.place,e.memo].filter(Boolean).join('\n'));toast('일정 내용을 복사했어요.');}catch{toast('클립보드 권한을 허용해 주세요.');}break;}
      case'focus-text':$('#intake-form textarea')?.focus();break;
      case'camera':readIntake();$('#camera-input').click();break;
      case'file':readIntake();$('#attachment-input').accept=el.dataset.kind==='image'?'image/*':'.pdf,.txt,.doc,.docx,.hwp,.hwpx';$('#attachment-input').click();break;
      case'remove-attachment':readIntake();ui.draft.attachment=null;render();break;
      case'direct-input':readIntake();if(ui.draft.mode==='existing'&&!ui.draft.activityId){toast('기존 활동을 먼저 선택해 주세요.');break;}ui.review={title:ui.draft.name,events:[{title:'',date:ui.selected,time:'',endDate:''}],place:'',link:'',memo:ui.draft.text};go('review');break;
      case'add-review':readReview();ui.review.events.push({title:'',date:'',time:'',endDate:''});render();break;
      case'remove-review':readReview();ui.review.events.splice(Number(el.dataset.index),1);render();break;
      case'view-saved':ui.selected=ui.lastSaved?.date||D.DEMO_DATE;ui.year=Number(ui.selected.slice(0,4));ui.month=Number(ui.selected.slice(5,7))-1;go('calendar');break;
      case'export-data':download('일정모아-데이터.json',JSON.stringify(data,null,2),'application/json');toast('데이터 파일을 만들었어요.');break;
      case'reset':confirm('예제 데이터로 초기화할까요?','이 웹 데모에서 직접 등록한 활동·일정·사진이 삭제됩니다. 필요하면 먼저 데이터를 내보내 주세요.',()=>{if(commit(D.seed())){ui.category='전체';ui.status='active';ui.selected=D.DEMO_DATE;ui.year=2026;ui.month=9;go('calendar');toast('예제 데이터로 초기화했어요.');}},'초기화');break;
    }
  });
  document.addEventListener('input',e=>{if(e.target.id==='search-input'){ui.search=e.target.value;$('#agenda-results').innerHTML=agendaResults(true);}});
  document.addEventListener('change',e=>{if(e.target.name==='mode'){readIntake();$('#new-activity-fields').hidden=ui.draft.mode!=='new';$('#intake-form select[name=activityId]').hidden=ui.draft.mode!=='existing';}});
  document.addEventListener('submit',e=>{
    e.preventDefault();const f=e.target,values=Object.fromEntries(new FormData(f)),error=f.querySelector('.form-error');if(error)error.textContent='';
    try{
      if(f.id==='event-form'){
        const previous=data.events.find(e=>e.id===f.dataset.id)||{done:false,reminder:true};
        const event={...previous,...values,id:f.dataset.id==='new'?D.id():f.dataset.id};
        if(commit(D.saveEvent(data,event))){go('event/'+event.id);toast('일정을 저장했어요.');}
      } else if(f.id==='activity-form'){
        if(!values.name.trim())throw new Error('활동 이름을 입력해 주세요.');
        if(commit({...data,activities:data.activities.map(a=>a.id===f.dataset.id?{...a,...values,name:values.name.trim()}:a)})){closeModal();render();toast('활동 정보를 저장했어요.');}
      } else if(f.id==='intake-form'){
        readIntake();const d=ui.draft;
        if(d.mode==='existing'&&!d.activityId)throw new Error('추가할 활동을 선택해 주세요.');
        if(!d.text.trim()&&!d.attachment)throw new Error('안내문을 입력하거나 자료를 첨부해 주세요.');
        ui.review={...D.parseText(d.text,ui.year),memo:d.text};
        if(!ui.review.events.length){ui.review.events=[{title:d.name||'',date:'',time:'',endDate:''}];toast('찾은 날짜가 없어요. 제목과 날짜를 직접 입력해 주세요.');}
        go('review');
      } else if(f.id==='review-form'){
        readReview();const d=ui.draft,r=ui.review;
        let next={...data,activities:[...data.activities],events:[...data.events]},aId=d.mode==='existing'?d.activityId:d.mode==='new'?D.id():'';
        if(d.mode==='new'){
          if(!d.name.trim())throw new Error('새 활동 이름을 입력해 주세요.');
          next.activities.push({id:aId,name:d.name.trim(),category:d.category,status:'active',place:r.place,memo:r.memo,sources:[]});
        }
        const source={id:D.id(),name:d.attachment?.name||'[텍스트] '+(d.name||r.title||'일정 안내'),text:d.text,kind:d.attachment?.kind||'text',image:d.attachment?.image||'',createdAt:D.dateKey(new Date())};
        if(aId)next.activities=next.activities.map(a=>a.id===aId?{...a,sources:[...a.sources,source]}:a);
        for(const event of r.events)next=D.saveEvent(next,{...event,id:D.id(),activityId:aId,category:d.category,place:r.place,link:r.link,memo:r.memo,done:false,reminder:true,...(!aId?{source}: {})});
        if(commit(next)){ui.lastSaved={activityId:aId,count:r.events.length,date:r.events[0].date};ui.review=null;ui.draft=null;go('saved');}
      }
    }catch(err){if(error){error.textContent=err.message;error.scrollIntoView({block:'nearest'});}else toast(err.message);}
  });
  async function readFile(file){
    if(!file)return;if(file.size>25*1024*1024){toast('25MB 이하의 파일을 선택해 주세요.');return;}
    const draft=ui.draft;if(!draft)return;
    try{
      let image='';const isImage=file.type.startsWith('image/');
      if(isImage){
        const bitmap=await createImageBitmap(file);const ratio=Math.min(1,1000/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*ratio);canvas.height=Math.round(bitmap.height*ratio);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);image=canvas.toDataURL('image/jpeg',.76);bitmap.close();
      }
      if(/\.txt$/i.test(file.name))draft.text=await file.text();
      if(ui.draft!==draft)return;
      draft.attachment={name:file.name,kind:isImage?'image':'file',image};render();toast(isImage?'사진을 첨부했어요. 일정 정보는 직접 확인해 주세요.':'파일을 첨부했어요. 문서 내용은 텍스트로 입력해 주세요.');
    }catch{toast('이 파일은 미리보기를 만들 수 없어요. JPG·PNG 또는 텍스트 파일로 다시 선택해 주세요.');}
  }
  for(const selector of ['#attachment-input','#camera-input'])$(selector).addEventListener('change',async e=>{await readFile(e.target.files?.[0]);e.target.value='';});
  $('#dialog').addEventListener('click',e=>{if(e.target===$('#dialog'))closeModal();});
  window.addEventListener('hashchange',render);
  render();
})();
