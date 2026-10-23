const {proposeSetup,applySetup,requestSchema}=require('../services/aiSetup.service');
const preview=async(req,res)=>{
 try {
  // Routine descriptions are read and scheduled by the server; only unrecognized text goes to the model.
  const request=requestSchema.parse(req.body);
  const handled=await require('../services/assistant.service').respond(req.user.id,request);
  if(handled)return res.json({success:true,data:handled});
  const data=await proposeSetup(req.user.id,req.body);return res.json({success:true,data})}
 catch(error){console.warn('ai_setup_preview_failed',JSON.stringify({name:error.name,status:error.status||null,code:error.code||null}));const validation=error.name==='ZodError';const message=validation?'Revise a descrição e os dados propostos. Informe dias e horários completos.':error.status===429?'A IA atingiu um limite temporário. Tente novamente em instantes.':(error.status||error.code==='AI_PROVIDER_FAILURE')?'Não foi possível consultar o provedor da IA. Tente novamente.':error.message;
 return res.status(validation?400:error.status===429?429:(error.status||error.code==='AI_PROVIDER_FAILURE')?503:422).json({success:false,message,code:validation?'INVALID_SETUP_INPUT':error.code==='AI_PROVIDER_FAILURE'?'AI_PROVIDER_FAILURE':'AI_SETUP_PREVIEW_FAILED'})}
};
const apply=async(req,res)=>{
 const id=Number(req.params.id);if(!Number.isInteger(id)||id<=0)return res.status(400).json({success:false,message:'Proposta inválida.'});
 try{return res.json({success:true,data:await applySetup(req.user.id,id)})}catch(error){return res.status(409).json({success:false,message:error.code?'Não foi possível aplicar a proposta. Nenhum cadastro foi criado.':error.message})}
};
module.exports={preview,apply};



