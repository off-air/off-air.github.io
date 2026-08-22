import { env } from 'cloudflare:workers';
import { schemaStatements } from '../db/schema';

type RuntimeEnv = { DB: D1Database; PROFILE_IMAGES: R2Bucket; YEOJEONHI_ADMIN_TOKEN?: string };
const runtime = env as unknown as RuntimeEnv;
let ready: Promise<void> | null = null;

export function db(){ return runtime.DB; }
export function profileImages(){ return runtime.PROFILE_IMAGES; }
export function ensureDatabase(){
  if(!ready) ready=(async()=>{await db().batch(schemaStatements.map(sql=>db().prepare(sql)));await ensureRecordColumns();await seed();})();
  return ready;
}
async function ensureRecordColumns(){
  const {results}=await db().prepare('PRAGMA table_info(records)').all<{name:string}>();
  const columns=new Set(results.map(column=>column.name));
  if(!columns.has('affiliation'))await db().prepare("ALTER TABLE records ADD COLUMN affiliation TEXT NOT NULL DEFAULT ''").run();
  if(!columns.has('avatar_key'))await db().prepare('ALTER TABLE records ADD COLUMN avatar_key TEXT').run();
  if(!columns.has('activity_status'))await db().prepare("ALTER TABLE records ADD COLUMN activity_status TEXT NOT NULL DEFAULT '소식이 끊긴 버튜버'").run();
}
async function seed(){
  const row=await db().prepare('SELECT COUNT(*) AS count FROM records').first<{count:number}>();
  if((row?.count||0)>0)return;
  const samples=[
    [1,'유노하라 모리','@morino_yuno','森','#879487','2020. 05. 12','2023. 08. 17','개인','숲의 밤을 닮은 목소리로, 늦은 시간의 이야기를 건넸습니다.','잔잔한 게임과 심야 잡담을 중심으로 활동했습니다. 별일 없던 하루도 특별한 기록으로 남기는 따뜻한 방송을 이어갔습니다.','["잡담","게임","심야방송"]',248],
    [2,'아마세 루카','@amase_luca','流','#718096','2019. 02. 24','2022. 11. 03','소속','노래와 그림, 조용한 잡담 방송의 순간들이 남아 있습니다.','직접 그린 그림과 어쿠스틱 노래를 함께 나누던 크리에이터입니다. 계절마다 작은 온라인 전시를 열었습니다.','["노래","그림","잡담"]',391],
    [3,'호시노 네네','@nene_starlit','星','#9290a1','2021. 07. 07','2024. 01. 21','개인','별을 읽고 게임을 하며, 새벽의 시간을 함께 보냈습니다.','천문 이야기를 곁들인 게임 방송으로 알려졌습니다. 매주 일요일에는 시청자와 한 주의 밤하늘을 돌아보았습니다.','["게임","천문","라디오"]',174],
    [4,'사사키 유라','@yura_sasaki','結','#9c8f83','2018. 10. 09','2021. 06. 14','소속','작은 노래와 다정한 인사로 수많은 저녁을 이어주었습니다.','짧은 노래 방송과 사연 라디오를 진행했습니다. 방송을 끝낼 때마다 오늘도 잘 머물렀어요라는 인사를 남겼습니다.','["노래","라디오","사연"]',526],
    [5,'미즈키 아오','@ao_mizuki','水','#7f9296','2022. 03. 30','2024. 09. 02','개인','느린 게임과 긴 이야기를 좋아했던 푸른 목소리의 기록입니다.','인디 게임을 천천히 플레이하며 장면과 음악을 오래 이야기했습니다. 방송 후 남긴 짧은 감상문도 함께 기억됩니다.','["인디게임","리뷰","잡담"]',119],
    [6,'코하루 린','@koharu_rin','春','#a09187','2020. 04. 18','2023. 03. 28','소속','봄처럼 가벼운 웃음으로 평범한 하루를 환하게 만들었습니다.','리듬 게임과 밝은 아침 방송을 중심으로 활동했습니다. 팬들이 보낸 하루의 작은 목표를 함께 응원했습니다.','["리듬게임","아침방송","잡담"]',307],
    [7,'츠키시로 레이','@rei_tsukishiro','月','#858b99','2019. 12. 01','2022. 08. 19','개인','낮은 목소리로 읽어주던 이야기와 달빛 같은 음악이 남았습니다.','고전 문학 낭독과 피아노 연주를 결합한 방송을 선보였습니다. 월말마다 한 편의 긴 이야기를 완독했습니다.','["낭독","피아노","문학"]',462],
    [8,'나나세 토와','@towa_nanase','永','#8c968a','2021. 09. 17','2024. 05. 11','개인','여행하지 않는 여행 방송, 지도 위의 수많은 밤을 기억합니다.','온라인 지도와 시청자의 사연으로 세계를 걷는 독특한 방송을 만들었습니다. 매 방송마다 한 장의 엽서를 남겼습니다.','["여행","지도","사연"]',201],
  ];
  await db().batch(samples.map(s=>db().prepare('INSERT INTO records (id,name,handle,initial,color,debut,last_activity,category,note,bio,tags,base_memories) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(...s)));
}
export function isAdmin(request:Request){const configured=runtime.YEOJEONHI_ADMIN_TOKEN;return Boolean(configured&&request.headers.get('authorization')===`Bearer ${configured}`)}
export async function allowRequest(request:Request,action:string,limit:number,windowSeconds:number){
  await ensureDatabase();
  const identity=request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]||'local';
  const bytes=new TextEncoder().encode(`${action}:${identity}`);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  const clientHash=Array.from(new Uint8Array(digest)).map(v=>v.toString(16).padStart(2,'0')).join('');
  const windowStart=Math.floor(Date.now()/1000/windowSeconds)*windowSeconds;
  await db().prepare('DELETE FROM rate_limits WHERE window_start < ?').bind(Math.floor(Date.now()/1000)-604800).run();
  await db().prepare(`INSERT INTO rate_limits (action,client_hash,window_start,request_count) VALUES (?,?,?,1) ON CONFLICT(action,client_hash,window_start) DO UPDATE SET request_count=request_count+1`).bind(action,clientHash,windowStart).run();
  const row=await db().prepare('SELECT request_count FROM rate_limits WHERE action=? AND client_hash=? AND window_start=?').bind(action,clientHash,windowStart).first<{request_count:number}>();
  return (row?.request_count||0)<=limit;
}
