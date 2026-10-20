const express = require("express");

const {
    create,
    getAll,
    getById,
    update,
    markAsRead,
    markAllAsRead,
    remove,
} = require("../controllers/notification.controller");

const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();
router.post('/:id/drink', authMiddleware, async (req,res)=>{
    const id=Number(req.params.id);
    if(!Number.isSafeInteger(id)||id<=0)return res.status(400).json({success:false,message:'Notificação inválida.'});
    const prisma=require('../database/prisma');
    try {
        const data=await prisma.$transaction(async tx=>{
            const notice=await tx.notification.findFirst({where:{id,userId:req.user.id,type:'HYDRATION'}});
            if(!notice)throw Object.assign(new Error('Lembrete de água não encontrado.'),{status:404});
            if(notice.hydrationConfirmedAt)return {recorded:false,amountMl:250};
            const now=new Date();
            const claimed=await tx.notification.updateMany({where:{id,userId:req.user.id,hydrationConfirmedAt:null},data:{hydrationConfirmedAt:now,isRead:true,readAt:now}});
            if(!claimed.count)return {recorded:false,amountMl:250};
            const profile=await tx.profile.findUnique({where:{userId:req.user.id},select:{timezone:true,notifyActions:true}});
            const {localClock}=require('../services/personalPlanning.service');
            let date;try{date=localClock(now,profile?.timezone).date}catch{date=localClock(now).date}
            await tx.waterIntake.create({data:{userId:req.user.id,amountMl:250,date:new Date(`${date}T00:00:00Z`)}});
            if(profile?.notifyActions!==false)await tx.notification.create({data:{userId:req.user.id,type:'ACTIVITY',priority:'LOW',entityType:'agua',title:'Água · Consumo registrado',message:'Você registrou 250 ml de água pela notificação.'}});
            return {recorded:true,amountMl:250};
        });
        res.json({success:true,data});
    }catch(error){res.status(error.status||500).json({success:false,message:error.status?error.message:'Não foi possível registrar a água. Tente novamente.'})}
});

router.post("/", authMiddleware, create);

router.get("/", authMiddleware, getAll);

router.get("/:id", authMiddleware, getById);

router.patch("/read-all", authMiddleware, markAllAsRead);

router.patch("/:id/read", authMiddleware, markAsRead);

router.put("/:id", authMiddleware, async (req,res,next)=>{
  const id=Number(req.params.id);
  if(!Number.isSafeInteger(id)||id<=0)return res.status(400).json({success:false,message:'Notificação inválida.'});
  try {
    const notification=await require('../database/prisma').notification.findFirst({where:{id,userId:req.user.id}});
    if(!notification)return res.status(404).json({success:false,message:'Notificação não encontrada.'});
    if(!['REMINDER','UNEXPECTED_EVENT'].includes(notification.type))return res.status(403).json({success:false,message:'Avisos automáticos não podem ser editados. Abra a atividade correspondente.'});
    next();
  }catch{res.status(500).json({success:false,message:'Não foi possível verificar a notificação.'})}
}, update);

router.delete("/:id", authMiddleware, remove);

module.exports = router;
