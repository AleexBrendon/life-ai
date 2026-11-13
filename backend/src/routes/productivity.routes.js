const router = require('express').Router();
const { z } = require('zod');
const db = require('../database/prisma');
const { globalSearch } = require('../services/globalSearch.service');
const { createChangeHistory } = require('../services/changeHistory.service');
const { createRescheduleService } = require('../services/reschedule.service');
const history = createChangeHistory(db), schedule = createRescheduleService(db);
router.use(require('../middlewares/auth.middleware'));
const id = value => z.coerce.number().int().positive().max(2147483647).parse(value);
const route = fn => async (req,res) => {
  try { res.json({success:true,data:await fn(req)}); }
  catch(error) {
    const status=error.name==='ZodError'?400:['P2034','P2002'].includes(error.code)?409:error.status||500;
    if(status===500)console.error('Falha nos recursos de produtividade:',error.code||error.name);
    res.status(status).json({success:false,message:error.name==='ZodError'?'Revise os campos e filtros informados.':error.status?error.message:status===409?'Os dados mudaram. Atualize a prévia e tente novamente.':'Não foi possível concluir esta operação.'});
  }
};
router.get('/search',route(req=>globalSearch(db,req.user.id,req.query)));
router.get('/history',route(req=>history.list(req.user.id,req.query)));
router.get('/history/:id',route(req=>history.detail(req.user.id,id(req.params.id))));
router.post('/history/:id/undo',route(req=>{z.object({}).strict().parse(req.body);return history.undo(req.user.id,id(req.params.id));}));
router.post('/reschedule/preview',route(req=>schedule.preview(req.user.id,req.body)));
router.post('/reschedule/:id/apply',route(req=>{const input=z.object({allowConflicts:z.boolean().default(false)}).strict().parse(req.body);return schedule.apply(req.user.id,z.string().uuid().parse(req.params.id),input.allowConflicts);}));
module.exports=router;
