const {generateAIResponse}=require('./aiProvider.service');
function freeModel(){const configured=process.env.OPENROUTER_SETUP_MODEL||process.env.OPENROUTER_MODEL;return configured?.endsWith(':free')?configured:'minimax/minimax-m3.1-flash:free'}
async function explain(messages){
 if(!process.env.OPENROUTER_API_KEY)return null;
 const compact=messages.map((message,index)=>index===0?{...message,content:message.content+' Responda em no máximo quatro frases curtas, sem Markdown, títulos, números, valores monetários ou horários. Os números e horários são exibidos nos cards calculados pelo servidor: não repita nem recalcule. Explique apenas os critérios e os próximos passos.'}:message);
 try{
  const result=await generateAIResponse({messages:compact,model:freeModel()===process.env.OPENROUTER_MODEL?undefined:freeModel(),maxOutputTokens:650,timeoutMs:12000,maxModels:2});
  const content=result.content.replace(/^#{1,6}\s*/gm,'').replace(/\*\*/g,'').trim();
  // The model explains; numerical claims always come from the validated server data.
  return content&&!/\d/.test(content)?content.slice(0,1500):null;
 }catch{return null}
}
module.exports={explain,freeModel};
