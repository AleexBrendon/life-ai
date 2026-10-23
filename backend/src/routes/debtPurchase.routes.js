const express=require('express'),{z}=require('zod'),service=require('../services/debtPurchase.service');
const router=express.Router();router.use(require('../middlewares/auth.middleware'));
const route=fn=>async(req,res)=>{try{await fn(req,res)}catch(e){const status=e.name==='ZodError'?400:e.status||500;res.status(status).json({success:false,message:e.name==='ZodError'?e.issues.map(i=>i.message).join(' '):e.status?e.message:'Não foi possível calcular o planejamento.'})}};
router.get('/',route(async(req,res)=>res.json({success:true,data:await service.overview(req.user.id)})));
router.post('/',route(async(req,res)=>res.status(201).json({success:true,data:await service.preview(req.user.id,req.body)})));
router.post('/:id/choose',route(async(req,res)=>{const id=z.coerce.number().int().positive().parse(req.params.id),{optionId}=z.object({optionId:z.enum(['priority','breathing'])}).parse(req.body);res.json({success:true,data:await service.choose(req.user.id,id,optionId)})}));
module.exports=router;
