export function countdown(startsAt, now=Date.now()){
 const milliseconds=new Date(startsAt).getTime()-now;
 if(!Number.isFinite(milliseconds)||milliseconds<=0||milliseconds>300000)return null;
 const seconds=Math.ceil(milliseconds/1000);
 return {seconds,text:`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`,progress:Math.min(100,seconds/300*100)};
}
