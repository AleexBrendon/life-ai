const router = require('express').Router();
const { z } = require('zod');
const prisma = require('../database/prisma');
const { getDashboard } = require('../services/dashboard.service');
const { activitySchema, setActivityStatus } = require('../services/activityStatus.service');
router.use(require('../middlewares/auth.middleware'));
router.get('/', async (req,res) => {
 const parsed=z.string().date().safeParse(req.query.date);
 if(!parsed.success)return res.status(400).json({success:false,message:'Informe uma data válida.'});
 try{const day=await getDashboard({userId:req.user.id,date:parsed.data});res.json({success:true,data:day.activities})}
 catch{res.status(500).json({success:false,message:'Não foi possível carregar o progresso do dia.'})}
});
router.put('/', async (req,res) => {
 const parsed=activitySchema.safeParse(req.body);
 if(!parsed.success)return res.status(400).json({success:false,message:'Revise a data, a atividade e o status informado.'});
 try{const data=await prisma.$transaction(db=>setActivityStatus({db,userId:req.user.id,input:parsed.data}),{isolationLevel:'Serializable'});res.json({success:true,data})}
 catch(error){const status=error.code==='P2034'?409:error.status||500;res.status(status).json({success:false,message:error.status?error.message:status===409?'A atividade mudou. Atualize e tente novamente.':'Não foi possível atualizar a atividade.'})}
});
module.exports=router;
