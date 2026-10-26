const {generateAIResponse,DEFAULT_MODEL}=require('./aiProvider.service');
function freeModel(){const configured=process.env.OPENROUTER_SETUP_MODEL||process.env.OPENROUTER_MODEL;return configured?.endsWith(':free')?configured:DEFAULT_MODEL}
async function explain(messages){
 if(!process.env.OPENROUTER_API_KEY)return null;
 const compact=messages.map((message,index)=>index===0?{...message,content:message.content+' Responda ao pedido específico em até oito frases. Cite os nomes dos compromissos ou despesas relevantes, os impedimentos e por que a alternativa atende ao pedido. Evite respostas genéricas e não afirme que o resultado é exato quando faltam dados. Sem Markdown, títulos, números, valores monetários ou horários: os cálculos e horários são exibidos pelo servidor. Explique as diferenças entre as alternativas; se os dados não mudaram, diga isso.'}:message);
 try{
  const result=await generateAIResponse({messages:compact,model:freeModel()===process.env.OPENROUTER_MODEL?undefined:freeModel(),maxOutputTokens:650,timeoutMs:12000,maxModels:2});
  const content=result.content.replace(/^#{1,6}\s*/gm,'').replace(/\*\*/g,'').trim();
  // The model explains; numerical claims always come from the validated server data.
  return content&&!/\d/.test(content)?content.slice(0,1500):null;
 }catch{return null}
}
module.exports={explain,freeModel};
